import sharp from "sharp";
import exifr from "exifr";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { STANDARD, type PartFamily } from "./iso";
import fs from "node:fs";
import { StubClassifier, type Classifier, type Features } from "./classifier";
import { OnnxClassifier } from "./onnx-classifier";
import { WitnessRecord } from "./schema";

// Prefer a real ONNX model when one is present; otherwise the stub. Override
// the path with WITNESS_ONNX_MODEL. Resolved once, lazily.
let cachedClassifier: Classifier | null = null;
function defaultClassifier(): Classifier {
  if (cachedClassifier) return cachedClassifier;
  // Statically scoped to ./data/models so the bundler doesn't trace the whole
  // project into the serverless function (see the build-time trace warning).
  const modelPath =
    process.env.WITNESS_ONNX_MODEL || path.join(process.cwd(), "data", "models", "model.onnx");
  cachedClassifier = fs.existsSync(/* turbopackIgnore: true */ modelPath)
    ? new OnnxClassifier(modelPath)
    : new StubClassifier();
  return cachedClassifier;
}

export interface AnalyzeOptions {
  imageName: string;
  partFamily: PartFamily;
  batchCode?: string | null;
  classifier?: Classifier;
}

// The whole chain for one photograph: EXIF out, luma features out, a failure
// mode named, a validated record in. No database here — the caller stores it.
export async function analyzeImage(
  buffer: Buffer,
  opts: AnalyzeOptions,
): Promise<WitnessRecord> {
  const classifier = opts.classifier ?? defaultClassifier();

  const [exif, features, thumb, dims] = await Promise.all([
    exifr.parse(buffer).then((e) => e ?? null).catch(() => null),
    extractFeatures(buffer, opts.partFamily),
    makeThumb(buffer),
    sharp(buffer, { failOn: "none" })
      .metadata()
      .then((m) => ({ width: m.width ?? 0, height: m.height ?? 0 })),
  ]);

  const c = await classifier.classify({ ...features, buffer });

  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    partFamily: opts.partFamily,
    standard: STANDARD[opts.partFamily],
    modeCode: c.modeCode,
    modeLabel: c.modeLabel,
    severity: c.severity,
    confidence: c.confidence,
    classifier: classifier.id,
    imageName: opts.imageName,
    width: dims.width,
    height: dims.height,
    thumb,
    exif: exif as Record<string, unknown> | null,
    batchCode: opts.batchCode ?? null,
    review: null,
  };

  return WitnessRecord.parse(record);
}

export async function extractFeatures(
  buffer: Buffer,
  partFamily: PartFamily,
): Promise<Features> {
  const { data, info } = await sharp(buffer, { failOn: "none" })
    .greyscale()
    .resize(64, 64, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const stride = info.channels;
  const w = info.width;
  const n = info.width * info.height;

  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i * stride];
  const mean = sum / n;

  let varSum = 0;
  for (let i = 0; i < n; i++) {
    const d = data[i * stride] - mean;
    varSum += d * d;
  }
  const contrast = Math.sqrt(varSum / n);

  // Horizontal neighbour gradient: fraction of pixels whose right neighbour
  // differs by more than the image's own contrast. A proxy for surface texture.
  let edges = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    if ((i + 1) % w === 0) continue; // last column has no right neighbour
    const a = data[i * stride];
    const b = data[(i + 1) * stride];
    if (Math.abs(a - b) > contrast) edges++;
    pairs++;
  }
  const edgeDensity = pairs > 0 ? edges / pairs : 0;

  return {
    partFamily,
    width: info.width,
    height: info.height,
    meanLuma: mean,
    contrast,
    edgeDensity,
  };
}

export async function makeThumb(buffer: Buffer): Promise<string> {
  const out = await sharp(buffer, { failOn: "none" })
    .resize(240, 240, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}
