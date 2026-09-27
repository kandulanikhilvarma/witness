import { ATTRIBUTIONS, modesFor, type PartFamily } from "./iso";

// The decision rules around a classification, kept pure (no I/O, no server-only
// imports) so the landing page, the API routes and the unit tests all read the
// same numbers.

/** Stage-2 confidence at or above this files itself; below it queues for a person. */
export const CONFIDENCE_GATE = 0.7;

export const REVIEW_STATES = {
  auto: { label: "Auto-filed", human: false },
  queued: { label: "Awaiting review", human: false },
  confirmed: { label: "Confirmed", human: true },
  corrected: { label: "Corrected", human: true },
  unlocalized: { label: "Unlocalized", human: false },
} as const;

export function reviewStateLabel(state: string): string {
  return (REVIEW_STATES as Record<string, { label: string }>)[state]?.label ?? state;
}

export interface ForcedChoice {
  modeCode: string;
  modeLabel: string;
  severity: number;
  confidence: number;
  rationale: string;
}

/**
 * Turn a model's free-text reply into a choice from the family's own catalogue.
 * A reply that is not JSON, or names a code outside the catalogue, still yields
 * a record (so the finding is never stranded) but with confidence 0, which the
 * gate always routes to a person. The model never gets to auto-file a guess we
 * had to make for it.
 */
export function forceChoice(text: string, family: PartFamily): ForcedChoice {
  const modes = modesFor(family);
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    // fall through with an empty object: off-catalogue path below
  }
  const hit = modes.find((m) => m.code === String(parsed.mode_code));
  const mode = hit ?? modes[0];
  const severity = Math.min(mode.ceiling, Math.max(0, Math.round(Number(parsed.severity) || 0)));
  const confidence = hit ? Math.max(0, Math.min(1, Number(parsed.confidence) || 0)) : 0;
  const said = String(parsed.rationale ?? "").slice(0, 400);
  const rationale = hit
    ? said
    : `Model returned "${String(parsed.mode_code ?? "no code")}", which is not in ${family === "bearing" ? "ISO 15243" : "ISO 10825"}. Discarded; placeholder mode set with confidence 0 for a person to decide. ${said}`.trim();
  return { modeCode: mode.code, modeLabel: mode.label, severity, confidence, rationale };
}

export interface ReviewInput {
  mode: string;
  severity: number;
  attribution: string | null;
}

/** Validate an inspector's review against the finding's catalogue. Null = reject. */
export function validReview(
  raw: { mode: unknown; severity: unknown; attribution: unknown },
  family: PartFamily,
): ReviewInput | null {
  const mode = String(raw.mode ?? "");
  const severity = Number(raw.severity);
  const attribution = raw.attribution ? String(raw.attribution) : null;
  if (!modesFor(family).some((m) => m.code === mode)) return null;
  if (!Number.isInteger(severity) || severity < 0 || severity > 4) return null;
  if (attribution && !ATTRIBUTIONS.some((a) => a.code === attribution)) return null;
  return { mode, severity, attribution };
}

export interface AgreementRow {
  mode: string;
  reviewed: number;
  agreed: number;
  rate: number;
}

/**
 * How often inspectors kept the model's mode, per mode the model proposed.
 * This is the number the gate should be tuned against: a mode the model gets
 * right 95% of the time can auto-file lower; one it gets right 40% of the time
 * should never auto-file, whatever confidence it reports.
 */
export function agreement(
  rows: { model_mode: string | null; iso_mode: string; review_state: string }[],
): { byMode: AgreementRow[]; reviewed: number; agreed: number } {
  const acc = new Map<string, { reviewed: number; agreed: number }>();
  for (const r of rows) {
    if (!r.model_mode || !(REVIEW_STATES as Record<string, { human: boolean }>)[r.review_state]?.human) continue;
    const a = acc.get(r.model_mode) ?? { reviewed: 0, agreed: 0 };
    a.reviewed += 1;
    if (r.iso_mode === r.model_mode) a.agreed += 1;
    acc.set(r.model_mode, a);
  }
  const byMode = [...acc.entries()]
    .map(([mode, a]) => ({ mode, ...a, rate: a.agreed / a.reviewed }))
    .sort((x, y) => y.reviewed - x.reviewed);
  const reviewed = byMode.reduce((s, m) => s + m.reviewed, 0);
  const agreed = byMode.reduce((s, m) => s + m.agreed, 0);
  return { byMode, reviewed, agreed };
}
