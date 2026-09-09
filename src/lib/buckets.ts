// The 3-axis bucket engine. A fleet's findings live in a cube: ISO mode ×
// severity × attribution. An operator never wants the whole cube — they want a
// slice ("everything blamed on contamination at severity 3+") and the counts
// that fall in it. These are pure functions over a flat finding list; the
// insights page fetches the tenant's findings (RLS-scoped) and drives them.
import { isTypicalCause } from "./iso";

export interface Finding {
  mode: string; // iso_mode code
  standard: string; // iso_standard
  severity: number; // 0–4
  attribution: string | null;
}

export interface Filter {
  modes?: Set<string>;
  severities?: Set<number>;
  attributions?: Set<string>;
}

export function applyFilter(findings: Finding[], f: Filter): Finding[] {
  return findings.filter(
    (x) =>
      (!f.modes?.size || f.modes.has(x.mode)) &&
      (!f.severities?.size || f.severities.has(x.severity)) &&
      (!f.attributions?.size || f.attributions.has(x.attribution ?? "")),
  );
}

export type Axis = "mode" | "severity" | "attribution";

function axisKey(x: Finding, axis: Axis): string {
  if (axis === "mode") return x.mode;
  if (axis === "severity") return String(x.severity);
  return x.attribution ?? "";
}

// One axis collapsed to counts, e.g. how many findings per attribution.
export function countBy(findings: Finding[], axis: Axis): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of findings) {
    const k = axisKey(x, axis);
    if (k === "") continue; // unattributed — not a bucket of its own
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

// The mode × severity matrix under whatever attribution slice is active.
// cells are keyed `${mode}|${severity}`; modes preserves row order as given.
export interface CrossTab {
  modes: string[];
  cells: Map<string, number>;
  rowTotal: Map<string, number>;
  colTotal: Map<number, number>;
  total: number;
}

export function crossTab(findings: Finding[], modeOrder: string[]): CrossTab {
  const cells = new Map<string, number>();
  const rowTotal = new Map<string, number>();
  const colTotal = new Map<number, number>();
  const seen = new Set<string>();
  for (const x of findings) {
    const key = `${x.mode}|${x.severity}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
    rowTotal.set(x.mode, (rowTotal.get(x.mode) ?? 0) + 1);
    colTotal.set(x.severity, (colTotal.get(x.severity) ?? 0) + 1);
    seen.add(x.mode);
  }
  // rows in catalog order, then any modes not in the catalog (shouldn't happen).
  const modes = modeOrder.filter((m) => seen.has(m));
  for (const m of seen) if (!modes.includes(m)) modes.push(m);
  return { modes, cells, rowTotal, colTotal, total: findings.length };
}

// Findings whose cause is off the ISO plausibility list for their mode. These
// are the ones worth a human's eye — an attribution that doesn't match the
// damage pattern is either a mis-call or a genuinely unusual failure.
export function atypical(findings: Finding[]): Finding[] {
  return findings.filter((x) => !isTypicalCause(x.mode, x.attribution));
}
