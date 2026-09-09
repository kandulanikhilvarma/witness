import type { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { STANDARD, BEARING_MODES, GEAR_MODES, type PartFamily } from "./iso";

// Demo data for environments that start with an empty database — chiefly the
// Vercel preview, whose serverless filesystem is ephemeral so no records carry
// over. Seeding runs once per cold boot, only when `records` is empty, so a real
// local install that already has data is never touched.

type Seed = {
  part: PartFamily;
  mode: number; // index into the family's mode list
  severity: 0 | 1 | 2 | 3 | 4;
  confidence: number;
  batch: string;
  daysAgo: number;
  // A confirmed record carries the inspector's label; the pair (model, human)
  // is the training signal. Leave null for an unreviewed suggestion.
  review?: { mode: number; severity: 0 | 1 | 2 | 3 | 4 };
};

const BATCHES: { code: string; part: PartFamily; line: string; notes: string }[] = [
  { code: "GBX-2409-A", part: "bearing", line: "Line 2 · press-fit", notes: "Returned under warranty, 14k run hours." },
  { code: "GBX-2411-C", part: "gear", line: "Line 4 · hardened", notes: "Field returns, high-load helical set." },
  { code: "GBX-2502-B", part: "bearing", line: "Line 2 · press-fit", notes: "Incoming QC sample, pre-ship." },
];

const RECORDS: Seed[] = [
  { part: "bearing", mode: 0, severity: 3, confidence: 0.81, batch: "GBX-2409-A", daysAgo: 1, review: { mode: 0, severity: 4 } },
  { part: "bearing", mode: 2, severity: 2, confidence: 0.64, batch: "GBX-2409-A", daysAgo: 1 },
  { part: "bearing", mode: 5, severity: 4, confidence: 0.88, batch: "GBX-2409-A", daysAgo: 2, review: { mode: 5, severity: 4 } },
  { part: "gear", mode: 3, severity: 3, confidence: 0.72, batch: "GBX-2411-C", daysAgo: 2, review: { mode: 1, severity: 3 } },
  { part: "gear", mode: 4, severity: 4, confidence: 0.79, batch: "GBX-2411-C", daysAgo: 3 },
  { part: "gear", mode: 0, severity: 1, confidence: 0.55, batch: "GBX-2411-C", daysAgo: 4 },
  { part: "bearing", mode: 1, severity: 1, confidence: 0.6, batch: "GBX-2502-B", daysAgo: 5, review: { mode: 1, severity: 0 } },
  { part: "bearing", mode: 3, severity: 2, confidence: 0.69, batch: "GBX-2502-B", daysAgo: 6 },
  { part: "gear", mode: 6, severity: 3, confidence: 0.74, batch: "GBX-2411-C", daysAgo: 7 },
];

// Severity-keyed base hue, so a thumbnail reads at a glance the way the chip
// does — cool/green serviceable through hot/red safety-critical.
const SEV_RGB: Record<number, [number, number, number]> = {
  0: [52, 84, 60],
  1: [120, 96, 44],
  2: [150, 92, 30],
  3: [150, 58, 38],
  4: [110, 26, 24],
};

// A synthetic 240px "part photo": a lit gradient plus seeded grain and a wear
// band. Pure raster (no SVG/font), so it renders identically on any platform.
async function thumb(seed: Seed, key: number): Promise<string> {
  const W = 240;
  const H = 240;
  const [br, bg, bb] = SEV_RGB[seed.severity];
  const buf = Buffer.alloc(W * H * 3);
  let r = (key * 2654435761) >>> 0; // deterministic LCG per record
  const rand = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const bandY = 0.35 + rand() * 0.3; // the damage band's vertical position
  for (let y = 0; y < H; y++) {
    const vign = 1 - (Math.abs(y / H - 0.5) * 0.8 + 0.1); // top-lit cylinder look
    const band = Math.exp(-(((y / H - bandY) / 0.06) ** 2)); // a darker wear streak
    for (let x = 0; x < W; x++) {
      const grain = (rand() - 0.5) * 46;
      const shade = vign * (1 - band * 0.55);
      const i = (y * W + x) * 3;
      buf[i] = Math.max(0, Math.min(255, br * shade + grain));
      buf[i + 1] = Math.max(0, Math.min(255, bg * shade + grain));
      buf[i + 2] = Math.max(0, Math.min(255, bb * shade + grain));
    }
  }
  const out = await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 70 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

export async function seedIfEmpty(db: PGlite): Promise<void> {
  const { rows } = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM records`);
  if ((rows[0]?.n ?? 0) > 0) return;

  for (const b of BATCHES) {
    await db.query(
      `INSERT INTO batches (code, part_family, produced_on, line, notes, created_at)
       VALUES ($1,$2, now() - ($3 || ' days')::interval, $4,$5, now())
       ON CONFLICT (code) DO NOTHING`,
      [b.code, b.part, "30", b.line, b.notes],
    );
  }

  let key = 1;
  for (const s of RECORDS) {
    const modes = s.part === "bearing" ? BEARING_MODES : GEAR_MODES;
    const mode = modes[s.mode];
    const rev = s.review ? modes[s.review.mode] : null;
    const createdAt = new Date(Date.now() - s.daysAgo * 864e5).toISOString();
    await db.query(
      `INSERT INTO records
         (id, created_at, part_family, standard, mode_code, mode_label,
          severity, confidence, classifier, image_name, width, height, thumb, exif, batch_code,
          review_mode_code, review_mode_label, review_severity, reviewed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19)`,
      [
        randomUUID(),
        createdAt,
        s.part,
        STANDARD[s.part],
        mode.code,
        mode.label,
        s.severity,
        s.confidence,
        "stub-heuristic-v1",
        `${s.batch.toLowerCase()}-${String(key).padStart(2, "0")}.jpg`,
        1280,
        960,
        await thumb(s, key),
        JSON.stringify({ Make: "Nikon", Model: "D7500", FNumber: 8, ISO: 200 }),
        s.batch,
        rev ? rev.code : null,
        rev ? rev.label : null,
        s.review ? s.review.severity : null,
        s.review ? createdAt : null,
      ],
    );
    key++;
  }
}
