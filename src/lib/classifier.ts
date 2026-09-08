import { modesFor, type PartFamily, type Severity } from "./iso";

// Everything the classifier sees. The pipeline derives these from the image
// (via sharp) plus the requested part family. A real ONNX model would take the
// pixels directly; the feature vector is what the stub reasons over and what a
// future model's preprocessing would also produce, so the interface holds.
export interface Features {
  partFamily: PartFamily;
  width: number;
  height: number;
  meanLuma: number; // 0–255
  contrast: number; // std-dev of luma, 0–~128
  edgeDensity: number; // 0–1, fraction of high-gradient pixels
}

export interface Classification {
  modeCode: string;
  modeLabel: string;
  severity: Severity;
  confidence: number; // 0–1
}

export interface Classifier {
  readonly id: string;
  classify(f: Features): Promise<Classification>;
}

// ponytail: placeholder classifier. Deterministic heuristic over the feature
// vector, NOT a trained model — it exists so the whole pipeline runs end to end
// before a real .onnx file lands. Swap in an OnnxClassifier implementing the
// same interface and point ingest at it; nothing else changes.
//
// The heuristic is monotonic in image texture: a clean part reads low-contrast,
// low-edge → an early, low-severity mode; heavy surface damage reads high-edge,
// high-contrast → a later, more severe mode. It is plausible, not correct.
export class StubClassifier implements Classifier {
  readonly id = "stub-heuristic-v1";

  async classify(f: Features): Promise<Classification> {
    const modes = modesFor(f.partFamily);
    // Texture score 0–1: how "damaged" the surface looks.
    const score = clamp01(f.edgeDensity * 0.6 + f.contrast / 128 * 0.4);
    const idx = Math.min(modes.length - 1, Math.floor(score * modes.length));
    const mode = modes[idx];
    // Severity climbs with score but never exceeds the mode's own ceiling.
    const raw = Math.round(score * 4);
    const severity = Math.min(mode.ceiling, raw) as Severity;
    // Confidence: how far the score sits from a mode boundary (decisiveness),
    // floored so it always reads as a real number, capped so a stub never
    // claims certainty.
    const cell = 1 / modes.length;
    const within = (score % cell) / cell; // 0..1 position inside the chosen cell
    const decisiveness = Math.abs(within - 0.5) * 2; // 0 at boundary, 1 at center
    const confidence = round2(0.5 + decisiveness * 0.35);
    return { modeCode: mode.code, modeLabel: mode.label, severity, confidence };
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
