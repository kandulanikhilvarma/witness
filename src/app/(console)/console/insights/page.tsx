import Link from "next/link";
import { agreement } from "@/lib/gate";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import {
  ATTRIBUTIONS,
  SEVERITY,
  attributionFor,
  familyForStandard,
  modeLabel,
  modesFor,
  severity as sevMeta,
} from "@/lib/iso";
import {
  applyFilter,
  atypical,
  countBy,
  crossTab,
  repeatSignals,
  type Finding,
  type RepeatSignal,
} from "@/lib/buckets";
import { SeverityChip } from "@/components/severity-chip";

export const dynamic = "force-dynamic";

const SCAN = 2000;
const SEV_TEXT = ["text-sev-0-ink", "text-sev-1-ink", "text-sev-2-ink", "text-sev-3-ink", "text-sev-4-ink"];
const SEV_BG = ["bg-sev-0-bg", "bg-sev-1-bg", "bg-sev-2-bg", "bg-sev-3-bg", "bg-sev-4-bg"];

type BatchRef = { batch_code: string; supplier: string | null };
type Row = {
  iso_standard: string;
  iso_mode: string;
  severity: number;
  attribution: string | null;
  finding_batch?: { batches: BatchRef | BatchRef[] | null }[];
};

function parseList(v: string | undefined): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

// Toggle one value in one comma-list param, preserving the others. Returns the
// query string for the resulting href — the whole filter lives in the URL, so
// the server re-slices on each click and there is no client state to keep.
function toggleHref(
  params: Record<string, string | undefined>,
  key: string,
  value: string,
): string {
  const cur = new Set(parseList(params[key]));
  if (cur.has(value)) cur.delete(value);
  else cur.add(value);
  const next = { ...params, [key]: [...cur].join(",") };
  const qs = Object.entries(next)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join("&");
  return qs ? `/console/insights?${qs}` : "/console/insights";
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; sev?: string; attr?: string }>;
}) {
  if (!supabaseConfigured) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8 text-c-text">
        <h1 className="font-display text-2xl">Insights</h1>
        <p className="mt-2 text-sm text-c-text-2">
          The bucket engine runs on the Supabase workspace. This deployment is on
          the local database.
        </p>
      </div>
    );
  }
  const session = await currentSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data }, pairs] = await Promise.all([
    sb
      .from("findings")
      .select("iso_standard, iso_mode, severity, attribution, finding_batch(batches(batch_code, supplier))")
      .limit(SCAN),
    // Separate query: model_* exist only once the 2026-09-27 migration has run,
    // and the cube must still render on a database that has not had it yet.
    sb
      .from("findings")
      .select("iso_standard, iso_mode, model_mode, review_state")
      .in("review_state", ["confirmed", "corrected"])
      .limit(SCAN),
  ]);
  const rows = (data ?? []) as Row[];
  const agree = pairs.error
    ? null
    : agreement((pairs.data ?? []) as { model_mode: string | null; iso_mode: string; review_state: string }[]);

  const all: Finding[] = rows.map((r) => ({
    mode: r.iso_mode,
    standard: r.iso_standard,
    severity: r.severity,
    attribution: r.attribution,
  }));

  const filter = {
    modes: new Set(parseList(sp.mode)),
    severities: new Set(parseList(sp.sev).map(Number)),
    attributions: new Set(parseList(sp.attr)),
  };
  const filtered = applyFilter(all, filter);
  const active = filter.modes.size || filter.severities.size || filter.attributions.size;

  // Mode rows in catalog order. The most common standard in the data decides
  // which catalog labels the rows; a mixed fleet still shows every mode present
  // (crossTab appends any mode not in the chosen catalog).
  const stdFreq = new Map<string, number>();
  for (const r of rows) stdFreq.set(r.iso_standard, (stdFreq.get(r.iso_standard) ?? 0) + 1);
  const topStandard = [...stdFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ISO 15243";
  const modeOrder = modesFor(familyForStandard(topStandard)).map((m) => m.code);
  const ct = crossTab(filtered, modeOrder);
  const attrCounts = countBy(filtered, "attribution");
  const flagged = atypical(filtered);

  const standardOf = (code: string) =>
    rows.find((r) => r.iso_mode === code)?.iso_standard ?? "ISO 15243";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Insights</h1>
          <p className="mt-1 text-sm text-c-text-2">
            Every finding sits in a cube: ISO mode, severity, and the cause it
            was attributed to. Slice it by clicking a cause or a severity; the
            matrix re-counts.
          </p>
        </div>
        {active ? (
          <Link
            href="/console/insights"
            className="rounded-sm border border-c-line bg-c-surface-2 px-3 py-2 text-2xs text-c-text hover:border-c-focus"
          >
            Clear filter
          </Link>
        ) : null}
      </header>

      {all.length === 0 ? (
        <p className="rounded-sm border border-dashed border-c-line bg-c-surface p-8 text-center text-sm text-c-text-3">
          No findings in this workspace yet. Buckets fill as the pipeline writes
          findings.
        </p>
      ) : (
        <>
          <RepeatPanel
            signals={repeatSignals(
              rows.map((r) => ({
                mode: r.iso_mode,
                standard: r.iso_standard,
                severity: r.severity,
                // Supabase types a nested to-one embed as an array without
                // generated types; normalise both shapes.
                batches: (r.finding_batch ?? [])
                  .flatMap((fb) => (Array.isArray(fb.batches) ? fb.batches : fb.batches ? [fb.batches] : []))
                  .map((b) => ({ code: b.batch_code, supplier: b.supplier })),
              })),
            )}
          />

          {/* Attribution axis — the filter chips. */}
          <section className="mb-6">
            <h2 className="mb-2 text-2xs uppercase tracking-wide text-c-text-3">
              Attribution · root cause
            </h2>
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTIONS.map((a) => {
                const n = attrCounts.get(a.code) ?? 0;
                const on = filter.attributions.has(a.code);
                return (
                  <Link
                    key={a.code}
                    href={toggleHref(sp, "attr", a.code)}
                    title={a.blurb}
                    className={`rounded-sm border px-2.5 py-1.5 text-2xs transition-colors ${
                      on
                        ? "border-c-focus bg-c-surface-2 text-c-text"
                        : "border-c-line bg-c-surface text-c-text-2 hover:border-c-focus"
                    } ${n === 0 ? "opacity-40" : ""}`}
                  >
                    {a.label} <span className="tabular text-c-text-3">{n}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Mode × severity matrix. */}
          <section className="overflow-x-auto rounded-sm border border-c-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-c-surface text-2xs uppercase tracking-wide text-c-text-3">
                  <th className="px-3 py-2 text-left font-medium">ISO mode</th>
                  {SEVERITY.map((s) => (
                    <th key={s.level} className="px-3 py-2 text-center font-medium">
                      <Link
                        href={toggleHref(sp, "sev", String(s.level))}
                        title={`${s.label}: ${s.action}`}
                        className={`inline-flex items-center gap-1 ${
                          filter.severities.has(s.level) ? "text-c-text" : "hover:text-c-text"
                        }`}
                      >
                        <span className={SEV_TEXT[s.level]}>{s.glyph}</span>
                        {s.level}
                      </Link>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium">Σ</th>
                </tr>
              </thead>
              <tbody>
                {ct.modes.map((code) => {
                  const std = standardOf(code);
                  return (
                    <tr key={code} className="border-t border-c-line">
                      <td className="px-3 py-2">
                        <Link
                          href={toggleHref(sp, "mode", code)}
                          className={`block ${
                            filter.modes.has(code) ? "text-c-text" : "text-c-text-2 hover:text-c-text"
                          }`}
                        >
                          <span className="tabular text-c-text-3">{code}</span>{" "}
                          {modeLabel(std, code)}
                        </Link>
                      </td>
                      {SEVERITY.map((s) => {
                        const n = ct.cells.get(`${code}|${s.level}`) ?? 0;
                        return (
                          <td
                            key={s.level}
                            className={`px-3 py-2 text-center tabular ${
                              n > 0 ? `${SEV_BG[s.level]} ${SEV_TEXT[s.level]}` : "text-c-text-3"
                            }`}
                          >
                            {n || "·"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center tabular text-c-text">
                        {ct.rowTotal.get(code) ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-c-line bg-c-surface text-2xs text-c-text-3">
                  <td className="px-3 py-2 uppercase tracking-wide">Σ</td>
                  {SEVERITY.map((s) => (
                    <td key={s.level} className="px-3 py-2 text-center tabular">
                      {ct.colTotal.get(s.level) ?? 0}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center tabular text-c-text">{ct.total}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Atypical cause flag — where attribution is off the ISO list for the mode. */}
          {flagged.length > 0 && (
            <section className="mt-6 rounded-sm border border-sev-2/40 bg-sev-2-bg p-4">
              <h2 className="text-2xs uppercase tracking-wide text-sev-2-ink">
                {flagged.length} atypical cause{flagged.length === 1 ? "" : "s"}
              </h2>
              <p className="mt-1 text-2xs text-c-text-2">
                The cause assigned here is not one ISO lists for that damage mode.
                Worth a second look: a mis-call, or a genuinely unusual failure.
              </p>
              <ul className="mt-2 space-y-1 text-2xs text-c-text-2">
                {flagged.slice(0, 8).map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={SEV_TEXT[f.severity]}>{sevMeta(f.severity).glyph}</span>
                    <span className="tabular text-c-text-3">{f.mode}</span>
                    {modeLabel(f.standard, f.mode)} ·{" "}
                    <span className="text-c-text">{attributionFor(f.attribution)?.label ?? f.attribution}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AgreementPanel agree={agree} standardOf={standardOf} />
          {rows.length === SCAN && (
            <p className="mt-4 text-2xs text-c-text-3">
              Counted over the latest {SCAN} findings. Export for the full workspace.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Model versus inspector, per proposed mode. The honest measure of the model:
// not what confidence it reports, but how often a person kept its call.
function AgreementPanel({
  agree,
  standardOf,
}: {
  agree: ReturnType<typeof agreement> | null;
  standardOf: (code: string) => string;
}) {
  return (
    <section className="mt-6 rounded-sm border border-c-line bg-c-surface p-4">
      <h2 className="text-2xs uppercase tracking-wide text-c-text-3">Model against inspector</h2>
      {!agree ? (
        <p className="mt-2 text-2xs text-c-text-2">
          Needs the model-suggestion columns. Apply{" "}
          <span className="tabular">supabase/migrations/20260927120000_model_suggestion_and_originals.sql</span>.
        </p>
      ) : agree.reviewed === 0 ? (
        <p className="mt-2 text-2xs text-c-text-2">
          No reviewed findings with a recorded model call yet. Confirm or correct a few in Review.
        </p>
      ) : (
        <>
          <p className="mt-1 text-2xs text-c-text-2">
            Inspectors kept the model&apos;s mode on{" "}
            <span className="tabular text-c-text">
              {agree.agreed}/{agree.reviewed}
            </span>{" "}
            reviewed findings ({Math.round((agree.agreed / agree.reviewed) * 100)}%). Tune the gate
            against this, not against the confidence the model reports.
          </p>
          <table className="mt-3 w-full text-2xs">
            <thead className="text-left uppercase tracking-wide text-c-text-3">
              <tr>
                <th className="py-1 font-medium">Proposed mode</th>
                <th className="py-1 text-right font-medium">Reviewed</th>
                <th className="py-1 text-right font-medium">Kept</th>
                <th className="w-1/3 py-1 pl-3 font-medium">Agreement</th>
              </tr>
            </thead>
            <tbody>
              {agree.byMode.map((m) => (
                <tr key={m.mode} className="border-t border-c-line">
                  <td className="py-1.5 text-c-text-2">
                    <span className="tabular text-c-text-3">{m.mode}</span> {modeLabel(standardOf(m.mode), m.mode)}
                  </td>
                  <td className="py-1.5 text-right tabular">{m.reviewed}</td>
                  <td className="py-1.5 text-right tabular">{m.agreed}</td>
                  <td className="py-1.5 pl-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-c-surface-2">
                        <div className="h-full bg-c-text-3" style={{ width: `${m.rate * 100}%` }} />
                      </div>
                      <span className="w-9 text-right tabular text-c-text-2">{Math.round(m.rate * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

// The alert a quality engineer actually wants: one damage mode repeating in
// one production batch. Three or more findings of a mode in a batch is a
// pattern worth a supplier conversation, not a coincidence to file away.
function RepeatPanel({ signals }: { signals: RepeatSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <section className="mb-6 rounded-sm border border-sev-3/40 bg-c-surface p-4" aria-labelledby="repeat-h">
      <h2 id="repeat-h" className="text-2xs uppercase tracking-wide text-sev-3-ink">
        ▲ {signals.length} repeat signal{signals.length === 1 ? "" : "s"}
      </h2>
      <p className="mt-1 text-2xs text-c-text-2">
        The same damage mode three or more times in one batch. Open the batch and check the supplier
        before more parts from it ship.
      </p>
      <ul className="mt-3 divide-y divide-c-line">
        {signals.slice(0, 8).map((s) => (
          <li key={`${s.batch}|${s.mode}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <Link
              href="/console/batches"
              className="tabular text-c-text underline decoration-c-line underline-offset-2 hover:decoration-c-focus"
            >
              {s.batch}
            </Link>
            {s.supplier && <span className="text-2xs text-c-text-3">{s.supplier}</span>}
            <span className="text-c-text-2">
              <span className="tabular text-c-text-3">{s.mode}</span> {modeLabel(s.standard, s.mode)}
            </span>
            <span className="tabular text-c-text">× {s.count}</span>
            <span className="ml-auto">
              <SeverityChip level={s.worst} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
