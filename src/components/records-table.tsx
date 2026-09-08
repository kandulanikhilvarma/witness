import Image from "next/image";
import Link from "next/link";
import {
  type WitnessRecord,
  effectiveMode,
  effectiveSeverity,
} from "@/lib/schema";
import { SeverityChip } from "@/components/severity-chip";

// Shared by the console index and each batch view. Shows the effective
// classification (inspector's review when present, else the model), and marks
// rows the model named but no one has confirmed.
export function RecordsTable({ records }: { records: WitnessRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-c-line">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-c-surface text-left text-2xs uppercase tracking-wide text-c-text-3">
          <tr>
            <th className="px-3 py-2 font-medium">Part</th>
            <th className="px-3 py-2 font-medium">Standard</th>
            <th className="px-3 py-2 font-medium">Failure mode</th>
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Conf.</th>
            <th className="px-3 py-2 font-medium">Batch</th>
            <th className="px-3 py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const mode = effectiveMode(r);
            return (
              <tr key={r.id} className="border-t border-c-line align-middle">
                <td className="px-3 py-2">
                  <Link
                    href={`/console/records/${r.id}`}
                    className="flex items-center gap-3 hover:text-c-text"
                  >
                    <Image
                      src={r.thumb}
                      alt={r.imageName}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded-sm border border-c-line object-cover"
                    />
                    <span>
                      <span className="block capitalize">{r.partFamily}</span>
                      <span className="block text-2xs text-c-text-3">{r.imageName}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 tabular text-c-text-2">{r.standard}</td>
                <td className="px-3 py-2">
                  <span className="tabular text-c-text-3">{mode.code}</span> {mode.label}
                  {!r.review && (
                    <span className="ml-1 text-2xs text-c-text-3">· unconfirmed</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <SeverityChip level={effectiveSeverity(r)} />
                </td>
                <td className="px-3 py-2 tabular text-c-text-2">
                  {r.review ? "—" : `${Math.round(r.confidence * 100)}%`}
                </td>
                <td className="px-3 py-2 tabular text-c-text-2">
                  {r.batchCode ? (
                    <Link
                      href={`/console/batches/${encodeURIComponent(r.batchCode)}`}
                      className="text-c-text underline decoration-c-line underline-offset-2 hover:decoration-c-focus"
                    >
                      {r.batchCode}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 tabular text-2xs text-c-text-3">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
