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
