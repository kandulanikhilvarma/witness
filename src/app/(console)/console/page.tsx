import Link from "next/link";
import { redirect } from "next/navigation";
import { listRecords, stats } from "@/lib/db";
import { RecordsTable } from "@/components/records-table";
import { IngestForm } from "@/components/ingest-form";
import { SignOut } from "@/components/sign-out";
import { SeverityChip } from "@/components/severity-chip";
import { SEVERITY } from "@/lib/iso";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; part?: string; sev?: string }>;
}) {
  // Supabase mode: real auth + per-tenant rows. PGlite mode (no env): the
  // original local demo console below.
  if (supabaseConfigured) return <SupabaseConsole />;

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

// Supabase-backed console. Auth-gated, tenant-scoped by RLS. Phase 1 target:
// sign in, land on your (empty) workspace. Ingest and the rest migrate off
// PGlite in later phases and are marked Fixture until they do.
type FindingRow = {
  id: string;
  iso_standard: string;
  iso_mode: string;
  iso_submode: string | null;
  severity: number;
  attribution: string | null;
  review_state: string;
  created_at: string;
};

async function SupabaseConsole() {
  const session = await currentSession();
  if (!session) redirect("/login");

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("findings")
    .select("id, iso_standard, iso_mode, iso_submode, severity, attribution, review_state, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const findings = (data ?? []) as FindingRow[];

  const total = findings.length;
  const reviewed = findings.filter((f) => f.review_state === "confirmed" || f.review_state === "corrected").length;
  const atRisk = findings.filter((f) => f.severity >= 3).length;

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{session.tenantName}</h1>
          <p className="mt-1 text-sm text-c-text-2">
            Findings for your workspace, each traced to ISO 15243 (bearings) or
            ISO 10825 (gears). Isolated by row-level security.
          </p>
        </div>
        <SignOut />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Findings" value={total} />
        <Stat label="Confirmed" value={reviewed} />
        <Stat label="Unconfirmed" value={total - reviewed} />
        <Stat label="Severity ≥ 3" value={atRisk} alert={atRisk > 0} />
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-sm border border-dashed border-c-line bg-c-surface px-4 py-3 text-2xs text-c-text-3">
        <span className="rounded-sm border border-c-line px-1.5 py-0.5 font-mono uppercase tracking-wide">Fixture</span>
        Intake and the anomaly pipeline migrate to Supabase in phases 2 and 4.
        This workspace reads live findings now.
      </div>

      {error && (
        <p className="mt-6 rounded-sm border border-sev-3/40 bg-sev-3-bg p-4 text-sm text-sev-3">
          Could not load findings: {error.message}. If this says the schema is
          not exposed, add <span className="tabular">witness</span> to the
          project&apos;s exposed schemas.
        </p>
      )}

      <div className="mt-6">
        {total === 0 ? (
          <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
            No findings yet. This workspace is empty — ingest arrives in phase 2.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-c-line">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-c-surface text-left text-2xs uppercase tracking-wide text-c-text-3">
                <tr>
                  <th className="px-3 py-2 font-medium">Standard</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Severity</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id} className="border-t border-c-line">
                    <td className="px-3 py-2 tabular text-c-text-2">{f.iso_standard}</td>
                    <td className="px-3 py-2">
                      {f.iso_mode}
                      {f.iso_submode ? ` · ${f.iso_submode}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      <SeverityChip level={f.severity} />
                    </td>
                    <td className="px-3 py-2 text-c-text-2">{f.review_state}</td>
                    <td className="px-3 py-2 tabular text-2xs text-c-text-3">
                      {new Date(f.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
