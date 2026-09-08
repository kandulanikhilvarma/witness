import Link from "next/link";
import { listRecords } from "@/lib/db";
import { RecordsTable } from "@/components/records-table";
import { IngestForm } from "@/components/ingest-form";
import { SEVERITY } from "@/lib/iso";

export const dynamic = "force-dynamic";

export default async function ConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; part?: string; sev?: string }>;
}) {
  const sp = await searchParams;
  const partFamily = sp.part === "bearing" || sp.part === "gear" ? sp.part : undefined;
  const sevNum = sp.sev ? Number(sp.sev) : NaN;
  const severityMin = Number.isInteger(sevNum) && sevNum >= 0 ? sevNum : undefined;
  const q = sp.q?.trim() || undefined;
  const filtered = Boolean(partFamily || severityMin !== undefined || q);

  const records = await listRecords({ partFamily, severityMin, q });

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl">Records</h1>
        <p className="mt-1 text-sm text-c-text-2">
          {records.length} {records.length === 1 ? "record" : "records"}
          {filtered ? " (filtered)" : ""}. Each traces to ISO 15243 (bearings) or
          ISO 10825 (gears).
        </p>
      </header>

      <IngestForm />

      <form
        method="get"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-sm border border-c-line bg-c-surface p-4"
      >
        <label className="flex flex-1 flex-col gap-1 text-2xs text-c-text-2">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="image, failure mode, or batch"
            className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-2xs text-c-text-2">
          Part
          <select
            name="part"
            defaultValue={partFamily ?? ""}
            className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
          >
            <option value="">Any</option>
            <option value="bearing">Bearing</option>
            <option value="gear">Gear</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-2xs text-c-text-2">
          Min severity
          <select
            name="sev"
            defaultValue={severityMin !== undefined ? String(severityMin) : ""}
            className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
          >
            <option value="">Any</option>
            {SEVERITY.map((s) => (
              <option key={s.level} value={s.level}>
                {s.level} · {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm border border-c-line bg-c-surface-2 px-4 py-2 text-sm text-c-text hover:border-c-focus"
        >
          Filter
        </button>
        {filtered && (
          <Link
            href="/console"
            className="px-2 py-2 text-2xs text-c-text-3 hover:text-c-text"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6">
        {records.length === 0 ? (
          <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
            {filtered
              ? "No records match these filters."
              : "No records yet. Upload a photograph of a returned part above."}
          </p>
        ) : (
          <RecordsTable records={records} />
        )}
      </div>

      <p className="mt-6 text-2xs text-c-text-3">
        Classifier: <span className="tabular">stub-heuristic-v1</span> — a
        placeholder. Failure modes and severity are not yet from a trained model.
      </p>
    </div>
  );
}
