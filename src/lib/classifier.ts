import { modesFor, type PartFamily, type Severity } from "./iso";

// Derived image features. The pipeline computes these (via sharp) for every
// image; the stub reasons over them.
export interface Features {
  partFamily: PartFamily;
  width: number;
  height: number;
  meanLuma: number; // 0–255
  contrast: number; // std-dev of luma, 0–~128
  edgeDensity: number; // 0–1, fraction of high-gradient pixels
}

// A real model needs the pixels, not just derived features. ClassifierInput
// carries both: the stub reads the feature fields, an ONNX model reads `buffer`.
export interface ClassifierInput extends Features {
  buffer: Buffer;
}

export interface Classification {
  modeCode: string;
  modeLabel: string;
  severity: Severity;
  confidence: number; // 0–1
}

export interface Classifier {
  readonly id: string;
  classify(input: ClassifierInput): Promise<Classification>;
}

// ponytail: placeholder classifier. Deterministic heuristic over the feature
// vector, NOT a trained model — it exists so the whole pipeline runs end to end
// with no model file present. Swap in OnnxClassifier by dropping a .onnx in.
//
// The heuristic is monotonic in image texture: a clean part reads low-contrast,
// low-edge → an early, low-severity mode; heavy surface damage reads high-edge,
// high-contrast → a later, more severe mode. It is plausible, not correct.
export class StubClassifier implements Classifier {
  readonly id = "stub-heuristic-v1";

  async classify(f: ClassifierInput): Promise<Classification> {
    const modes = modesFor(f.partFamily);
    const score = clamp01((f.edgeDensity * 0.6) + (f.contrast / 128) * 0.4);
    const idx = Math.min(modes.length - 1, Math.floor(score * modes.length));
    const mode = modes[idx];
    const raw = Math.round(score * 4);
    const severity = Math.min(mode.ceiling, raw) as Severity;
    const cell = 1 / modes.length;
    const within = (score % cell) / cell;
    const decisiveness = Math.abs(within - 0.5) * 2;
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
