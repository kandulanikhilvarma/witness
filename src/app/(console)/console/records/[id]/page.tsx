import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecord } from "@/lib/db";
import { effectiveMode, effectiveSeverity } from "@/lib/schema";
import { SeverityChip } from "@/components/severity-chip";
import { ReviewForm } from "@/components/review-form";
import { severity as sevInfo } from "@/lib/iso";

export const dynamic = "force-dynamic";

export default async function RecordDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rec = await getRecord(id);
  if (!rec) notFound();

  const eff = effectiveMode(rec);
  const effSev = effectiveSeverity(rec);
  const s = sevInfo(effSev);
  const exif = rec.exif
    ? Object.entries(rec.exif)
        .filter(([, v]) => v != null && typeof v !== "object")
        .slice(0, 30)
    : [];

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link href="/console" className="text-2xs text-c-text-3 hover:text-c-text">
        ← Records
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl capitalize">{rec.partFamily}</h1>
          <p className="mt-1 text-2xs text-c-text-3">{rec.imageName}</p>
        </div>
        <SeverityChip level={effSev} />
      </header>

      <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr]">
        <Image
          src={rec.thumb}
          alt={rec.imageName}
          width={280}
          height={280}
          unoptimized
          className="w-full rounded-sm border border-c-line object-cover"
        />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Standard">{rec.standard}</Field>
          <Field label="Classification">
            <span className="tabular text-c-text-3">{eff.code}</span> {eff.label}{" "}
            {rec.review ? (
              <span className="text-2xs text-sev-0">· confirmed</span>
            ) : (
              <span className="text-2xs text-c-text-3">· model, unconfirmed</span>
            )}
          </Field>
          <Field label="Severity">
            {effSev} · {s.label}
          </Field>
          <Field label="Recommended action">{s.action}</Field>
          <Field label="Batch">
            {rec.batchCode ? (
              <Link
                href={`/console/batches/${encodeURIComponent(rec.batchCode)}`}
                className="underline decoration-c-line underline-offset-2 hover:decoration-c-focus"
              >
                {rec.batchCode}
              </Link>
            ) : (
              "n/a"
            )}
          </Field>
          <Field label="Dimensions">
            <span className="tabular">
              {rec.width}×{rec.height}
            </span>
          </Field>
          <Field label="Inspected">
            <span className="tabular">{new Date(rec.createdAt).toLocaleString()}</span>
          </Field>
          {rec.review && (
            <Field label="Reviewed">
              <span className="tabular">
                {new Date(rec.review.reviewedAt).toLocaleString()}
              </span>
            </Field>
          )}
        </dl>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg">Review</h2>
        <p className="mt-1 text-sm text-c-text-2">
          Model suggested{" "}
          <span className="tabular text-c-text-3">{rec.modeCode}</span> {rec.modeLabel},
          severity {rec.severity}, confidence {Math.round(rec.confidence * 100)}% (
          <span className="tabular">{rec.classifier}</span>). Confirm or override,
          your call is authoritative and becomes a training label.
        </p>
        <div className="mt-3">
          <ReviewForm
            id={rec.id}
            partFamily={rec.partFamily}
            currentModeCode={eff.code}
            currentSeverity={effSev}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg">EXIF</h2>
        {exif.length === 0 ? (
          <p className="mt-2 text-sm text-c-text-3">No EXIF metadata in this image.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-sm border border-c-line">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {exif.map(([k, v]) => (
                  <tr key={k} className="border-t border-c-line first:border-t-0">
                    <td className="w-48 px-3 py-1.5 tabular text-c-text-3">{k}</td>
                    <td className="px-3 py-1.5">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-c-text-3">{label}</dt>
      <dd className="mt-0.5 text-c-text">{children}</dd>
    </div>
  );
}
