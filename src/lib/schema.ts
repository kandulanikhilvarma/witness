import { z } from "zod";

// The record a photograph becomes. One row per inspected part.
export const WitnessRecord = z.object({
  id: z.string(),
  createdAt: z.string(), // ISO 8601
  partFamily: z.enum(["bearing", "gear"]),
  standard: z.string(), // "ISO 15243" | "ISO 10825"
  modeCode: z.string(),
  modeLabel: z.string(),
  severity: z.number().int().min(0).max(4),
  confidence: z.number().min(0).max(1),
  classifier: z.string(), // which model named this — provenance
  imageName: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  thumb: z.string(), // data: URL, JPEG
  exif: z.record(z.string(), z.unknown()).nullable(),
  batchCode: z.string().nullable(),
});

export type WitnessRecord = z.infer<typeof WitnessRecord>;
