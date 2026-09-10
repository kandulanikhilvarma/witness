// ISO failure-mode catalogs. Two standards, one per part family.
//
//   ISO 15243  — rolling bearings: classification of damage and failures.
//   ISO 10825(-1) — gears: wear and damage to gear teeth.
//
// Codes are the standard's own clause numbering where it exists, so a record
// traces back to the document. Labels are the plain-language mode names an
// inspector uses at the bench.

export type PartFamily = "bearing" | "gear";

export const STANDARD: Record<PartFamily, string> = {
  bearing: "ISO 15243",
  gear: "ISO 10825",
};

export interface FailureMode {
  code: string; // clause number within the standard
  label: string;
  /** Typical worst-case severity this mode reaches, 0–4. Guides, never sets. */
  ceiling: 0 | 1 | 2 | 3 | 4;
}

// ISO 15243 six primary damage classes.
export const BEARING_MODES: FailureMode[] = [
  { code: "5.1", label: "Fatigue (rolling contact)", ceiling: 3 },
  { code: "5.2", label: "Wear (abrasive / adhesive)", ceiling: 2 },
  { code: "5.3", label: "Corrosion (moisture / fretting)", ceiling: 3 },
  { code: "5.4", label: "Electrical erosion", ceiling: 3 },
  { code: "5.5", label: "Plastic deformation (indentation)", ceiling: 2 },
  { code: "5.6", label: "Fracture and cracking", ceiling: 4 },
];

// ISO 10825 gear-tooth damage classes.
export const GEAR_MODES: FailureMode[] = [
  { code: "wear", label: "Wear", ceiling: 2 },
  { code: "scuff", label: "Scuffing", ceiling: 3 },
  { code: "plastic", label: "Plastic deformation", ceiling: 2 },
  { code: "cfatigue", label: "Contact fatigue (pitting / spalling)", ceiling: 3 },
  { code: "crack", label: "Cracks", ceiling: 4 },
  { code: "fracture", label: "Tooth fracture", ceiling: 4 },
  { code: "corrosion", label: "Corrosion", ceiling: 3 },
];

export function modesFor(family: PartFamily): FailureMode[] {
  return family === "bearing" ? BEARING_MODES : GEAR_MODES;
}

export function familyForStandard(standard: string): PartFamily {
  return standard.includes("10825") ? "gear" : "bearing";
}

export function modeLabel(standard: string, code: string): string {
  return modesFor(familyForStandard(standard)).find((m) => m.code === code)?.label ?? code;
}

// The third axis. A damage mode says *what* the surface shows; attribution says
// *why* it got there. ISO 15243 keeps the two apart on purpose — the same pit
// can come from fatigue at end of life or from a contaminant dent that seeded
// it early, and the batch-level action differs. These are the originating
// mechanisms the standard discusses, collapsed to the categories a fleet acts
// on. Shared across both part families: a gear and a bearing starve for oil the
// same way.
export interface Attribution {
  code: string;
  label: string;
  blurb: string;
}

export const ATTRIBUTIONS: Attribution[] = [
  { code: "operating", label: "Operating duty", blurb: "Service fatigue at or near rated life: expected wear-out, not a fault." },
  { code: "lubrication", label: "Lubrication", blurb: "Starvation, the wrong grade, or a film that has broken down." },
  { code: "contamination", label: "Contamination", blurb: "Solid particles or moisture carried into the contact." },
  { code: "mounting", label: "Mounting / alignment", blurb: "Misalignment, bad fit, or damage taken during fitting." },
  { code: "overload", label: "Overload", blurb: "Load or preload past design: shock, overspeed, or static brinelling." },
  { code: "electrical", label: "Electrical", blurb: "Stray current passage across the contact." },
  { code: "corrosion", label: "Corrosion", blurb: "Corrosive environment, standing moisture, or fretting." },
  { code: "handling", label: "Handling", blurb: "Transport, storage, or install damage before the part ever ran." },
];

const ATTRIBUTION_BY_CODE: Record<string, Attribution> = Object.fromEntries(
  ATTRIBUTIONS.map((a) => [a.code, a]),
);

export function attributionFor(code: string | null | undefined): Attribution | null {
  return code ? ATTRIBUTION_BY_CODE[code] ?? null : null;
}

// Which causes plausibly produce each mode, per ISO 15243 / 10825 cause notes.
// Not a gate — an inspector can attribute anything — but a finding whose cause
// is off this list is worth a second look, and the insights view flags it.
export const MODE_ATTRIBUTIONS: Record<string, string[]> = {
  // bearing (ISO 15243 clause codes)
  "5.1": ["operating", "overload", "contamination", "mounting"],
  "5.2": ["lubrication", "contamination"],
  "5.3": ["corrosion", "handling", "lubrication"],
  "5.4": ["electrical"],
  "5.5": ["overload", "handling", "contamination"],
  "5.6": ["overload", "mounting", "handling"],
  // gear (ISO 10825 class keys)
  wear: ["lubrication", "contamination"],
  scuff: ["lubrication", "overload"],
  plastic: ["overload"],
  cfatigue: ["operating", "overload", "lubrication"],
  crack: ["overload", "mounting"],
  fracture: ["overload", "mounting"],
  corrosion: ["corrosion", "handling"],
};

export function isTypicalCause(modeCode: string, attribution: string | null | undefined): boolean {
  if (!attribution) return true; // no cause assigned yet — nothing to flag
  const list = MODE_ATTRIBUTIONS[modeCode];
  return !list || list.includes(attribution);
}

export const SEVERITY = [
  { level: 0, label: "Serviceable", glyph: "○", action: "Return to service" },
  { level: 1, label: "Monitor", glyph: "◔", action: "Re-inspect at next interval" },
  { level: 2, label: "Plan repair", glyph: "◑", action: "Schedule rework" },
  { level: 3, label: "Remove from service", glyph: "◕", action: "Pull the part" },
  { level: 4, label: "Safety-critical", glyph: "●", action: "Quarantine batch, escalate" },
] as const;

export type Severity = 0 | 1 | 2 | 3 | 4;

export function severity(level: number): (typeof SEVERITY)[number] {
  return SEVERITY[Math.max(0, Math.min(4, Math.round(level)))];
}
