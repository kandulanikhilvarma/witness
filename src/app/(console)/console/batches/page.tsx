import Link from "next/link";
import { listBatches } from "@/lib/db";
import { SeverityChip } from "@/components/severity-chip";
import { BatchForm } from "@/components/batch-form";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
  const batches = await listBatches();

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Batches</h1>
        <p className="mt-1 text-sm text-c-text-2">
          Production batches and their worst observed severity. Records tag a
          batch on ingest; add provenance below.
        </p>
      </header>

      <BatchForm mode="create" />

      {batches.length === 0 ? (
        <p className="mt-8 rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
          No batches yet.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-sm border border-c-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-c-surface text-left text-2xs uppercase tracking-wide text-c-text-3">
              <tr>
                <th className="px-3 py-2 font-medium">Batch</th>
                <th className="px-3 py-2 font-medium">Part</th>
                <th className="px-3 py-2 font-medium">Produced</th>
                <th className="px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 font-medium">Parts</th>
                <th className="px-3 py-2 font-medium">Worst severity</th>
                <th className="px-3 py-2 font-medium">Last inspected</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.code} className="border-t border-c-line">
                  <td className="px-3 py-2">
                    <Link
                      href={`/console/batches/${encodeURIComponent(b.code)}`}
                      className="tabular text-c-text underline decoration-c-line underline-offset-2 hover:decoration-c-focus"
                    >
                      {b.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2 capitalize text-c-text-2">
                    {b.partFamily ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular text-c-text-2">
                    {b.producedOn ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-c-text-2">{b.line ?? "—"}</td>
                  <td className="px-3 py-2 tabular text-c-text-2">{b.parts}</td>
                  <td className="px-3 py-2">
                    {b.parts > 0 ? <SeverityChip level={b.worstSeverity} /> : "—"}
                  </td>
                  <td className="px-3 py-2 tabular text-2xs text-c-text-3">
                    {b.lastSeen ? new Date(b.lastSeen).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
