import Image from "next/image";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import {
  ATTRIBUTIONS,
  SEVERITY,
  familyForStandard,
  modesFor,
  severity as sevMeta,
} from "@/lib/iso";

export const dynamic = "force-dynamic";

const SEV_TEXT = ["text-sev-0", "text-sev-1", "text-sev-2", "text-sev-3", "text-sev-4"];

type Queued = {
  id: string;
  iso_standard: string;
  iso_mode: string;
  severity: number;
  confidence: number | null;
  anomaly_score: number | null;
  attribution: string | null;
  crop_uri: string | null;
  evidence_text: string | null;
  model_version: string | null;
  created_at: string;
};

// The inspector is the source of truth; Stage-2 only proposed. Saving with the
// suggestion untouched confirms it; changing the mode or severity corrects it.
// Either way the row leaves the queue and flows into the insights cube.
async function saveReview(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const sev = Number(formData.get("severity"));
  const attribution = String(formData.get("attribution") ?? "") || null;
  const origMode = String(formData.get("orig_mode") ?? "");
  const origSev = Number(formData.get("orig_sev"));
  if (!id || !mode) return;

  const session = await currentSession();
  if (!session) return;
  const changed = mode !== origMode || sev !== origSev;
  const sb = await supabaseServer();
  await sb
    .from("findings")
    .update({
      iso_mode: mode,
      severity: sev,
      attribution,
      review_state: changed ? "corrected" : "confirmed",
      reviewed_by: session.userId,
    })
    .eq("id", id);
  revalidatePath("/console/review");
  revalidatePath("/console/insights");
}

export default async function ReviewPage() {
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-8 text-c-text">
        <h1 className="font-display text-2xl">Review queue</h1>
        <p className="mt-2 text-sm text-c-text-2">
          The review queue runs on the Supabase workspace.
        </p>
      </div>
    );
  }
  const session = await currentSession();
  if (!session) redirect("/login");

  const sb = await supabaseServer();
  const { data } = await sb
    .from("findings")
    .select(
      "id, iso_standard, iso_mode, severity, confidence, anomaly_score, attribution, crop_uri, evidence_text, model_version, created_at",
    )
    .eq("review_state", "queued")
    .order("created_at", { ascending: false })
    .limit(50);
  const queue = (data ?? []) as Queued[];

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Review queue</h1>
        <p className="mt-1 text-sm text-c-text-2">
          Stage-2 sent these here because its confidence fell below the gate. Your
          call is the authoritative one. Confirm the suggestion or correct it,
          set the cause, and it flows into the insights cube.
        </p>
      </header>

      {queue.length === 0 ? (
        <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
          Nothing waiting. Low-confidence classifications land here for a human.
        </p>
      ) : (
        <div className="space-y-4">
          {queue.map((f) => (
            <ReviewCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ f }: { f: Queued }) {
  const family = familyForStandard(f.iso_standard);
  const modes = modesFor(family);
  const sm = sevMeta(f.severity);

  return (
    <form
      action={saveReview}
      className="grid gap-5 rounded-sm border border-c-line bg-c-surface p-4 md:grid-cols-[160px_1fr]"
    >
      <input type="hidden" name="id" value={f.id} />
      <input type="hidden" name="orig_mode" value={f.iso_mode} />
      <input type="hidden" name="orig_sev" value={f.severity} />

      <div>
        {f.crop_uri ? (
          <Image
            src={f.crop_uri}
            alt="subject"
            width={160}
            height={160}
            unoptimized
            className="w-full rounded-sm border border-c-line object-cover"
          />
        ) : (
          <div className="aspect-square rounded-sm border border-dashed border-c-line" />
        )}
        <div className="mt-2 text-2xs text-c-text-3">
          {f.anomaly_score != null && (
            <>anomaly {f.anomaly_score.toFixed(2)}× · </>
          )}
          conf {f.confidence?.toFixed(2) ?? "n/a"}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-2xs text-c-text-3">
          <span className={`tabular ${SEV_TEXT[f.severity]}`}>{sm.glyph}</span>
          {f.iso_standard} · suggested{" "}
          <span className="text-c-text-2">
            {f.iso_mode} · {modes.find((m) => m.code === f.iso_mode)?.label ?? f.iso_mode}
          </span>
        </div>
        {f.evidence_text && <p className="text-2xs text-c-text-3">{f.evidence_text}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            ISO mode
            <select
              name="mode"
              defaultValue={f.iso_mode}
              className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
            >
              {modes.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} · {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Severity
            <select
              name="severity"
              defaultValue={String(f.severity)}
              className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
            >
              {SEVERITY.map((s) => (
                <option key={s.level} value={s.level}>
                  {s.level} · {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-2xs text-c-text-2">
            Cause
            <select
              name="attribution"
              defaultValue={f.attribution ?? ""}
              className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
            >
              <option value="">Unattributed</option>
              {ATTRIBUTIONS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-paper">
          Save review
        </button>
      </div>
    </form>
  );
}
