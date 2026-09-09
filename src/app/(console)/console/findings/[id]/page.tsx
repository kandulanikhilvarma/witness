import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseConfigured } from "@/lib/supabase/config";
import { currentSession } from "@/lib/tenant";
import {
  attributionFor,
  familyForStandard,
  isTypicalCause,
  modeLabel,
  severity as sevMeta,
} from "@/lib/iso";
import { findingDetail, linkFindingToBatch, listBatchOptions } from "@/lib/fleet";

export const dynamic = "force-dynamic";

const SEV_TEXT = ["text-sev-0", "text-sev-1", "text-sev-2", "text-sev-3", "text-sev-4"];

async function linkBatch(formData: FormData) {
  "use server";
  const findingId = String(formData.get("finding_id") ?? "");
  const batchId = String(formData.get("batch_id") ?? "");
  if (!findingId || !batchId) return;
  await linkFindingToBatch(findingId, batchId);
  revalidatePath(`/console/findings/${findingId}`);
}

export default async function FindingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured) redirect("/console");
  if (!(await currentSession())) redirect("/login");

  const { id } = await params;
  const [f, batchOptions] = await Promise.all([findingDetail(id), listBatchOptions()]);
  if (!f) notFound();

  const family = familyForStandard(f.iso_standard);
  const sm = sevMeta(f.severity);
  const typical = isTypicalCause(f.iso_mode, f.attribution);
  const attr = attributionFor(f.attribution);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link href="/console" className="text-2xs text-c-text-3 hover:text-c-text">
        ← Records
      </Link>
      <header className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">
            {f.iso_mode} · {modeLabel(f.iso_standard, f.iso_mode)}
          </h1>
          <p className="mt-1 text-sm text-c-text-2">
            {f.iso_standard} · {family} · {new Date(f.created_at).toLocaleString()}
          </p>
        </div>
        <span
          className={`rounded-sm border px-2 py-1 font-mono text-2xs uppercase tracking-wide ${SEV_TEXT[f.severity]}`}
        >
          {sm.glyph} sev {f.severity} · {sm.label}
        </span>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          {f.crop_uri ? (
            <Image
              src={f.crop_uri}
              alt="subject"
              width={220}
              height={220}
              unoptimized
              className="w-full rounded-sm border border-c-line object-cover"
            />
          ) : (
            <div className="aspect-square rounded-sm border border-dashed border-c-line" />
          )}
          <dl className="mt-3 space-y-1 text-2xs">
            <Row k="Anomaly" v={f.anomaly_score != null ? `${f.anomaly_score.toFixed(2)}×` : "—"} />
            <Row k="Confidence" v={f.confidence != null ? f.confidence.toFixed(2) : "—"} />
            <Row k="Review" v={f.review_state} />
            <Row k="Model" v={f.model_version ?? "—"} />
            <Row k="Taxonomy" v={f.taxonomy_version ?? "—"} />
          </dl>
        </div>

        <div className="space-y-5">
          <section>
            <h2 className="mb-1 text-2xs uppercase tracking-wide text-c-text-3">ISO trace</h2>
            <p className="text-sm text-c-text">
              {f.iso_standard} clause {f.iso_clause ?? f.iso_mode} —{" "}
              {modeLabel(f.iso_standard, f.iso_mode)}
              {f.iso_submode ? ` · ${f.iso_submode}` : ""}
            </p>
          </section>

          <section>
            <h2 className="mb-1 text-2xs uppercase tracking-wide text-c-text-3">Attribution</h2>
            {attr ? (
              <p className="text-sm text-c-text">
                {attr.label}
                {!typical && (
                  <span className="ml-2 rounded-sm border border-sev-2/40 bg-sev-2-bg px-1.5 py-0.5 text-2xs text-sev-2">
                    atypical for this mode
                  </span>
                )}
                <span className="mt-0.5 block text-2xs text-c-text-3">{attr.blurb}</span>
              </p>
            ) : (
              <p className="text-sm text-c-text-3">Unattributed — set in the review queue.</p>
            )}
          </section>

          {f.evidence_text && (
            <section>
              <h2 className="mb-1 text-2xs uppercase tracking-wide text-c-text-3">Evidence</h2>
              <p className="text-sm text-c-text-2">{f.evidence_text}</p>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-2xs uppercase tracking-wide text-c-text-3">Production batch</h2>
            {f.batches.length > 0 ? (
              <ul className="mb-2 space-y-1 text-sm">
                {f.batches.map((b) => (
                  <li key={b.id} className="text-c-text">
                    <span className="tabular">{b.batch_code}</span>
                    {b.supplier ? <span className="text-c-text-3"> · {b.supplier}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2 text-2xs text-c-text-3">Not linked to a batch yet.</p>
            )}
            {batchOptions.length > 0 && (
              <form action={linkBatch} className="flex gap-2">
                <input type="hidden" name="finding_id" value={f.id} />
                <select
                  name="batch_id"
                  className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-2xs text-c-text"
                >
                  {batchOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_code}
                    </option>
                  ))}
                </select>
                <button className="rounded-sm border border-c-line bg-c-surface-2 px-3 py-1.5 text-2xs text-c-text hover:border-c-focus">
                  Link batch
                </button>
              </form>
            )}
          </section>

          {f.attribution == null && (
            <p className="text-2xs text-c-text-3">
              <Link href="/console/review" className="text-c-focus hover:underline">
                Set the cause in review →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-c-text-3">{k}</dt>
      <dd className="tabular text-c-text-2">{v}</dd>
    </div>
  );
}
