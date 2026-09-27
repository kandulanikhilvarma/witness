import Image from "next/image";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SubmitButton } from "@/components/submit-button";
import { validReview } from "@/lib/gate";
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

const SEV_TEXT = ["text-sev-0-ink", "text-sev-1-ink", "text-sev-2-ink", "text-sev-3-ink", "text-sev-4-ink"];

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
//
// The model's own call is not lost when the inspector corrects it: a database
// trigger pins findings.model_* on every update (see supabase/migrations).
async function saveReview(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const session = await currentSession();
  if (!session) redirect("/login");

  // Read the stored finding rather than trusting hidden fields for the
  // original call and the part family.
  const sb = await supabaseServer();
  const { data: cur } = await sb
    .from("findings")
    .select("iso_standard, iso_mode, severity")
    .eq("id", id)
    .single<{ iso_standard: string; iso_mode: string; severity: number }>();
  if (!cur) redirect("/console/review?error=missing");

  const review = validReview(
    {
      mode: formData.get("mode"),
      severity: formData.get("severity"),
      attribution: formData.get("attribution"),
    },
    familyForStandard(cur.iso_standard),
  );
  if (!review) redirect("/console/review?error=invalid");

  const changed = review.mode !== cur.iso_mode || review.severity !== cur.severity;
  const { error } = await sb
    .from("findings")
    .update({
      iso_mode: review.mode,
      severity: review.severity,
      attribution: review.attribution,
      review_state: changed ? "corrected" : "confirmed",
      reviewed_by: session.userId,
    })
    .eq("id", id);
  if (error) redirect("/console/review?error=save");

  revalidatePath("/console/review");
  revalidatePath("/console/insights");
  revalidatePath("/console");
  redirect(`/console/review?saved=${changed ? "corrected" : "confirmed"}`);
}

const NOTICE: Record<string, { text: string; tone: "ok" | "err" }> = {
  confirmed: { text: "Confirmed. The finding left the queue.", tone: "ok" },
  corrected: { text: "Corrected. The model's original call is kept beside yours.", tone: "ok" },
  invalid: { text: "That review did not match the part family's catalogue. Nothing was saved.", tone: "err" },
  missing: { text: "That finding no longer exists.", tone: "err" },
  save: { text: "The review could not be saved. Try again.", tone: "err" },
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const notice = NOTICE[sp.saved ?? sp.error ?? ""];
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8 text-c-text">
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
    // Worst and least certain first: a person's time goes where the model is
    // both unsure and the stakes are high. Those are also the best labels.
    .order("severity", { ascending: false })
    .order("confidence", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(50);
  const queue = (data ?? []) as Queued[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Review queue</h1>
        <p className="mt-1 text-sm text-c-text-2">
          Stage-2 sent these here because its confidence fell below the gate. Your
          call is the authoritative one. Confirm the suggestion or correct it,
          set the cause, and it flows into the insights cube.
        </p>
      </header>

      {notice && (
        <p
          role={notice.tone === "err" ? "alert" : "status"}
          className={`mb-4 rounded-sm border px-4 py-2.5 text-sm ${
            notice.tone === "err"
              ? "border-sev-3/40 bg-sev-3-bg text-sev-3-ink"
              : "border-sev-0/40 bg-sev-0-bg text-sev-0-ink"
          }`}
        >
          {notice.text}
        </p>
      )}

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

        <SubmitButton pending="Saving…">Save review</SubmitButton>
      </div>
    </form>
  );
}
