import { z } from "zod";

// The record a photograph becomes. Model output (modeCode/severity/confidence)
// is the classifier's suggestion and stays immutable — provenance, and half of
// a future training pair. `review` holds the inspector's correction, which wins.
export const WitnessRecord = z.object({
  id: z.string(),
  createdAt: z.string(), // ISO 8601
  partFamily: z.enum(["bearing", "gear"]),
  standard: z.string(),
  modeCode: z.string(),
  modeLabel: z.string(),
  severity: z.number().int().min(0).max(4),
  confidence: z.number().min(0).max(1),
  classifier: z.string(),
  imageName: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  thumb: z.string(),
  exif: z.record(z.string(), z.unknown()).nullable(),
  batchCode: z.string().nullable(),
  review: z
    .object({
      modeCode: z.string(),
      modeLabel: z.string(),
      severity: z.number().int().min(0).max(4),
      reviewedAt: z.string(),
    })
    .nullable(),
});

export type WitnessRecord = z.infer<typeof WitnessRecord>;

// The inspector is the source of truth; the model only suggests.
export function effectiveSeverity(r: WitnessRecord): number {
  return r.review ? r.review.severity : r.severity;
}
export function effectiveMode(r: WitnessRecord): { code: string; label: string } {
  return r.review
    ? { code: r.review.modeCode, label: r.review.modeLabel }
    : { code: r.modeCode, label: r.modeLabel };
}
