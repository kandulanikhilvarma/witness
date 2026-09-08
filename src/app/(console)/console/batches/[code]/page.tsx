import Link from "next/link";
import { notFound } from "next/navigation";
import { getBatch, recordsByBatch } from "@/lib/db";
import { RecordsTable } from "@/components/records-table";
import { SeverityChip } from "@/components/severity-chip";
import { BatchForm } from "@/components/batch-form";

export const dynamic = "force-dynamic";

export default async function BatchView({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const batchCode = decodeURIComponent(code);
  const [meta, records] = await Promise.all([
    getBatch(batchCode),
    recordsByBatch(batchCode),
  ]);
  if (!meta && records.length === 0) notFound();

  const worst = records.reduce((m, r) => Math.max(m, r.severity), 0);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <Link href="/console/batches" className="text-2xs text-c-text-3 hover:text-c-text">
        ← Batches
      </Link>

      <header className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tabular">{batchCode}</h1>
          <p className="mt-1 text-sm text-c-text-2">
            {records.length} {records.length === 1 ? "part" : "parts"}
            {meta?.producedOn ? ` · produced ${meta.producedOn}` : ""}
            {meta?.line ? ` · line ${meta.line}` : ""}
          </p>
        </div>
        {records.length > 0 && (
          <div className="flex items-center gap-2 text-2xs text-c-text-3">
            Worst severity <SeverityChip level={worst} />
          </div>
        )}
      </header>

      {meta?.notes && (
        <p className="mt-3 border-l-2 border-c-line pl-3 text-sm text-c-text-2">
          {meta.notes}
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-2xs uppercase tracking-wide text-c-text-3">
          Batch provenance
        </h2>
        <BatchForm
          mode="edit"
          initial={{
            code: batchCode,
            partFamily: meta?.partFamily ?? null,
            producedOn: meta?.producedOn ?? null,
            line: meta?.line ?? null,
            notes: meta?.notes ?? null,
          }}
        />
      </section>

      <div className="mt-6">
        {records.length === 0 ? (
          <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
            No inspected parts in this batch yet.
          </p>
        ) : (
          <RecordsTable records={records} />
        )}
      </div>
    </div>
  );
}
