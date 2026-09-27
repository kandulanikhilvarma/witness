import sharp, { type Metadata } from "sharp";

// One gate for every image that enters the app. sharp will happily try to
// decode a 30,000 px panorama or a renamed PDF, so size, pixel count and
// format are checked from the header before any real work runs.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000; // a 48 MP phone sensor binned, with headroom
const FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif", "tiff"]);

/** Returns an error message for the user, or null when the image is acceptable. */
export async function checkImage(buffer: Buffer): Promise<string | null> {
  if (buffer.length === 0) return "The file is empty.";
  if (buffer.length > MAX_UPLOAD_BYTES) return "The image is larger than 10 MB.";
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { failOn: "none" }).metadata();
  } catch {
    return "That file is not a readable image.";
  }
  if (!meta.format || !FORMATS.has(meta.format)) return "Use a JPEG, PNG, WebP or HEIC photo.";
  if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_PIXELS) return "The image has too many pixels (over 40 MP).";
  return null;
}

/** Decode a data URI or bare base64 string, refusing anything over the byte cap. */
export function decodeImagePayload(image: string): Buffer | null {
  const base64 = image.includes(",") ? image.split(",", 2)[1] : image;
  // base64 is 4 chars per 3 bytes; reject before allocating the buffer.
  if (base64.length > Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 4) return null;
  return Buffer.from(base64, "base64");
}
