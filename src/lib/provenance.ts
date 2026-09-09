// Provenance score, 0–100. Research finding: by the time a customer photo
// reaches you it has usually been through an app that strips EXIF (WhatsApp
// normal-send, Instagram, Facebook, X) — email and "send as document" keep it.
// So metadata is evidence of quality, never a gate. The score is shown with the
// record; a low score still counts, it just can't stand as sole warranty proof.

export interface ProvenanceReason {
  label: string;
  points: number;
  won: boolean;
}

export interface Provenance {
  score: number;
  reasons: ProvenanceReason[];
}

type Exif = Record<string, unknown> | null;

function has(exif: Exif, ...keys: string[]): boolean {
  if (!exif) return false;
  return keys.some((k) => exif[k] != null && exif[k] !== "");
}

export function scoreProvenance(opts: {
  exif: Exif;
  duplicate: boolean;
  filename: string;
}): Provenance {
  const { exif, duplicate, filename } = opts;
  const timestamp = has(exif, "DateTimeOriginal", "CreateDate", "DateTime");
  const gps = has(exif, "latitude", "longitude", "GPSLatitude");
  const device = has(exif, "Make", "Model");
  const lens = has(exif, "LensModel", "FocalLength", "FNumber", "ISO", "ExposureTime");
  const anyExif = Boolean(exif && Object.keys(exif).length > 0);
  // A default camera-app name (IMG_, DSC_, a date pattern) reads more like an
  // original capture than a generic "image.jpg" or "photo".
  const namedLikeCapture = /(^img[_-])|(^dsc[_-])|(\d{8})|(\d{4}-\d{2}-\d{2})/i.test(filename);

  const reasons: ProvenanceReason[] = [
    { label: "EXIF metadata present", points: 25, won: anyExif },
    { label: "Capture timestamp present", points: 20, won: timestamp },
    { label: "Camera make/model present", points: 20, won: device },
    { label: "Exposure/lens data present", points: 15, won: lens },
    { label: "GPS location present", points: 10, won: gps },
    { label: "Filename looks like an original capture", points: 10, won: namedLikeCapture },
    { label: "Not a re-sent duplicate", points: 0, won: !duplicate },
  ];

  let score = reasons.reduce((s, r) => s + (r.won ? r.points : 0), 0);
  // A duplicate of an existing photo can't add fresh evidence.
  if (duplicate) score = Math.min(score, 30);
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export function provenanceBand(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
