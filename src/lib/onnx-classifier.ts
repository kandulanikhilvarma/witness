import path from "node:path";
import sharp from "sharp";
import type * as Ort from "onnxruntime-node";
import { modesFor, type Severity } from "./iso";
import type { Classifier, ClassifierInput, Classification } from "./classifier";

// PROTOTYPE. Runs real inference through onnxruntime-node with a generic
// ImageNet classifier (ONNX Model Zoo). ImageNet classes are NOT ISO failure
// modes, so the top-1 class index is mapped to a mode deterministically — the
// inference is real, the label mapping is a placeholder. Replace with a model
// trained on failure-mode labels and drop the mapping; the interface holds.
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

export class OnnxClassifier implements Classifier {
  readonly id: string;
  private readonly size: number;
  private ort: typeof Ort | null = null;
  private session: Ort.InferenceSession | null = null;

  constructor(
    private readonly modelPath: string,
    opts: { size?: number } = {},
  ) {
    this.size = opts.size ?? 224;
    this.id = `onnx:${path.basename(modelPath)}`;
  }

  private async load(): Promise<{ ort: typeof Ort; session: Ort.InferenceSession }> {
    // Dynamic import so the native binding loads only when a model is used.
    this.ort ??= await import("onnxruntime-node");
    this.session ??= await this.ort.InferenceSession.create(this.modelPath);
    return { ort: this.ort, session: this.session };
  }

  async classify(input: ClassifierInput): Promise<Classification> {
    const { ort, session } = await this.load();
    const size = this.size;

    const { data } = await sharp(input.buffer, { failOn: "none" })
      .removeAlpha()
      .resize(size, size, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true }); // HWC, 3 channels

    const plane = size * size;
    const chw = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i++) {
      for (let c = 0; c < 3; c++) {
        const v = data[i * 3 + c] / 255;
        chw[c * plane + i] = (v - IMAGENET_MEAN[c]) / IMAGENET_STD[c];
      }
    }

    const feeds = {
      [session.inputNames[0]]: new ort.Tensor("float32", chw, [1, 3, size, size]),
    };
    const out = await session.run(feeds);
    const logits = out[session.outputNames[0]].data as Float32Array;

    const { index, prob } = softmaxTop(logits);
    const modes = modesFor(input.partFamily);
    const mode = modes[index % modes.length];
    const severity = Math.min(mode.ceiling, Math.round(prob * 4)) as Severity;
    return {
      modeCode: mode.code,
      modeLabel: mode.label,
      severity,
      confidence: Math.round(prob * 100) / 100,
    };
  }
}

function softmaxTop(logits: Float32Array): { index: number; prob: number } {
  let max = -Infinity;
  let index = 0;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) {
      max = logits[i];
      index = i;
    }
  }
  let sum = 0;
  for (let i = 0; i < logits.length; i++) sum += Math.exp(logits[i] - max);
  return { index, prob: 1 / sum }; // exp(max-max)/sum
}
