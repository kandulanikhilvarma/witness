import Link from "next/link";
import { listRecords, stats } from "@/lib/db";
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

  const [records, st] = await Promise.all([
    listRecords({ partFamily, severityMin, q }),
    stats(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Records</h1>
          <p className="mt-1 text-sm text-c-text-2">
            {records.length} {records.length === 1 ? "record" : "records"}
            {filtered ? " (filtered)" : ""}. Each traces to ISO 15243 (bearings) or
            ISO 10825 (gears).
          </p>
        </div>
        {st.reviewed > 0 && (
          <a
            href="/api/export/labels"
            className="rounded-sm border border-c-line bg-c-surface-2 px-3 py-2 text-2xs text-c-text hover:border-c-focus"
          >
            Export labels ({st.reviewed})
          </a>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Records" value={st.total} />
        <Stat label="Confirmed" value={st.reviewed} />
        <Stat label="Unconfirmed" value={st.unreviewed} />
        <Stat label="Severity ≥ 3" value={st.atRisk} alert={st.atRisk > 0} />
      </div>

      <div className="mt-6">
        <IngestForm />
      </div>

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
          <Link href="/console" className="px-2 py-2 text-2xs text-c-text-3 hover:text-c-text">
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
        Classifier suggestions come from a placeholder model — confirm each record
        to set the authoritative classification.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="rounded-sm border border-c-line bg-c-surface px-4 py-3">
      <div className="text-2xs uppercase tracking-wide text-c-text-3">{label}</div>
      <div
        className={`mt-1 font-display text-2xl tabular ${alert ? "text-sev-3" : "text-c-text"}`}
      >
        {value}
      </div>
    </div>
  );
}
