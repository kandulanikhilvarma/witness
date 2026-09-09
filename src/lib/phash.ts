import sharp from "sharp";

// dHash: a 64-bit perceptual hash. Resize to 9x8 greyscale, then each bit is
// "is this pixel brighter than its right neighbour". Robust to resave, scale,
// and mild compression — which is exactly what a photo forwarded down an email
// thread or through WhatsApp has been through. Returned as 16 hex chars.
export async function dHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer, { failOn: "none" })
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const i = row * 9 + col;
      bits += data[i] > data[i + 1] ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

// Hamming distance between two 16-char hex hashes: how many of the 64 bits
// differ. 0 = identical, small = near-duplicate.
export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

// A match within this many bits is treated as the same part photographed again.
export const DUPE_THRESHOLD = 10;
