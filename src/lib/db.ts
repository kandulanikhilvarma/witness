import { PGlite } from "@electric-sql/pglite";
import { WitnessRecord } from "./schema";

// Local-first: Postgres runs in-process (PGlite), persisted to ./data/witness.
// No server, no cloud — the workstation owns its records. A future sync layer
// can push to a shared Postgres; nothing here assumes it.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS records (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL,
  part_family TEXT NOT NULL,
  standard    TEXT NOT NULL,
  mode_code   TEXT NOT NULL,
  mode_label  TEXT NOT NULL,
  severity    INT  NOT NULL,
  confidence  REAL NOT NULL,
  classifier  TEXT NOT NULL,
  image_name  TEXT NOT NULL,
  width       INT  NOT NULL,
  height      INT  NOT NULL,
  thumb       TEXT NOT NULL,
  exif        JSONB,
  batch_code  TEXT
);
CREATE INDEX IF NOT EXISTS records_created_at_idx ON records (created_at DESC);
CREATE INDEX IF NOT EXISTS records_batch_idx ON records (batch_code);

CREATE TABLE IF NOT EXISTS batches (
  code        TEXT PRIMARY KEY,
  part_family TEXT,
  produced_on DATE,
  line        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL
);
`;

// Any batch code a record already names must exist as a batch row so the
// batches view is complete after a schema upgrade.
const BACKFILL = `
INSERT INTO batches (code, part_family, created_at)
SELECT DISTINCT batch_code, part_family, now()
  FROM records WHERE batch_code IS NOT NULL
ON CONFLICT (code) DO NOTHING;
`;

// Additive columns for human review, applied on every boot.
const MIGRATE = `
ALTER TABLE records ADD COLUMN IF NOT EXISTS review_mode_code TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS review_mode_label TEXT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS review_severity INT;
ALTER TABLE records ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
`;

// One instance across dev HMR reloads — Next re-evaluates modules on change,
// and a second PGlite on the same dir would fight for the lock.
const g = globalThis as unknown as { __witnessDb?: Promise<PGlite> };

function getDb(): Promise<PGlite> {
  return (g.__witnessDb ??= (async () => {
    const db = new PGlite("./data/witness");
    await db.exec(SCHEMA);
    await db.exec(MIGRATE);
    await db.exec(BACKFILL);
    return db;
  })());
}

type Row = {
  id: string;
  created_at: string;
  part_family: string;
  standard: string;
  mode_code: string;
  mode_label: string;
  severity: number;
  confidence: number;
  classifier: string;
  image_name: string;
  width: number;
  height: number;
  thumb: string;
  exif: Record<string, unknown> | null;
  batch_code: string | null;
  review_mode_code: string | null;
  review_mode_label: string | null;
  review_severity: number | null;
  reviewed_at: string | null;
};

function toRecord(r: Row): WitnessRecord {
  return {
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    partFamily: r.part_family as WitnessRecord["partFamily"],
    standard: r.standard,
    modeCode: r.mode_code,
    modeLabel: r.mode_label,
    severity: r.severity,
    confidence: r.confidence,
    classifier: r.classifier,
    imageName: r.image_name,
    width: r.width,
    height: r.height,
    thumb: r.thumb,
    exif: r.exif,
    batchCode: r.batch_code,
    review:
      r.reviewed_at && r.review_mode_code
        ? {
            modeCode: r.review_mode_code,
            modeLabel: r.review_mode_label ?? r.review_mode_code,
            severity: r.review_severity ?? 0,
            reviewedAt: new Date(r.reviewed_at).toISOString(),
          }
        : null,
  };
}

export async function insertRecord(rec: WitnessRecord): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO records
       (id, created_at, part_family, standard, mode_code, mode_label,
        severity, confidence, classifier, image_name, width, height, thumb, exif, batch_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)`,
    [
      rec.id,
      rec.createdAt,
      rec.partFamily,
      rec.standard,
      rec.modeCode,
      rec.modeLabel,
      rec.severity,
      rec.confidence,
      rec.classifier,
      rec.imageName,
      rec.width,
      rec.height,
      rec.thumb,
      rec.exif ? JSON.stringify(rec.exif) : null,
      rec.batchCode,
    ],
  );
}

export interface RecordFilters {
  limit?: number;
  severityMin?: number;
  partFamily?: "bearing" | "gear";
  q?: string; // matches image name, failure mode, or batch code
}

export async function listRecords(f: RecordFilters = {}): Promise<WitnessRecord[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (typeof f.severityMin === "number") {
    params.push(f.severityMin);
    where.push(`COALESCE(review_severity, severity) >= $${params.length}`);
  }
  if (f.partFamily) {
    params.push(f.partFamily);
    where.push(`part_family = $${params.length}`);
  }
  if (f.q) {
    params.push(`%${f.q}%`);
    const p = `$${params.length}`;
    where.push(
      `(image_name ILIKE ${p} OR mode_label ILIKE ${p} OR review_mode_label ILIKE ${p} OR batch_code ILIKE ${p})`,
    );
  }
  params.push(f.limit ?? 100);
  const sql = `SELECT * FROM records ${
    where.length ? `WHERE ${where.join(" AND ")}` : ""
  } ORDER BY created_at DESC LIMIT $${params.length}`;
  const res = await db.query<Row>(sql, params);
  return res.rows.map(toRecord);
}

export async function getRecord(id: string): Promise<WitnessRecord | null> {
  const db = await getDb();
  const res = await db.query<Row>(`SELECT * FROM records WHERE id = $1`, [id]);
  return res.rows[0] ? toRecord(res.rows[0]) : null;
}

// The inspector's correction. Model columns are left untouched — the pair
// (model suggestion, human label) is the training signal for a real model.
export async function setReview(
  id: string,
  modeCode: string,
  modeLabel: string,
  severity: number,
): Promise<WitnessRecord | null> {
  const db = await getDb();
  await db.query(
    `UPDATE records
        SET review_mode_code = $2, review_mode_label = $3,
            review_severity = $4, reviewed_at = now()
      WHERE id = $1`,
    [id, modeCode, modeLabel, severity],
  );
  return getRecord(id);
}

export interface BatchMeta {
  code: string;
  partFamily: string | null;
  producedOn: string | null; // YYYY-MM-DD
  line: string | null;
  notes: string | null;
}

export interface BatchRollup extends BatchMeta {
  parts: number;
  worstSeverity: number;
  lastSeen: string | null;
}

function isoDate(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
}

// A batch is now a row of its own — its metadata (produced-on, line, notes)
// outlives the records, and a batch can exist before any part is inspected.
export async function listBatches(): Promise<BatchRollup[]> {
  const db = await getDb();
  const res = await db.query<{
    code: string;
    part_family: string | null;
    produced_on: string | null;
    line: string | null;
    notes: string | null;
    parts: number;
    worst: number;
    last: string | null;
  }>(
    `SELECT b.code, b.part_family, b.produced_on, b.line, b.notes,
            COUNT(r.id)::int AS parts,
            COALESCE(MAX(r.severity), 0)::int AS worst,
            MAX(r.created_at) AS last
       FROM batches b LEFT JOIN records r ON r.batch_code = b.code
      GROUP BY b.code, b.part_family, b.produced_on, b.line, b.notes, b.created_at
      ORDER BY MAX(r.created_at) DESC NULLS LAST, b.created_at DESC`,
  );
  return res.rows.map((r) => ({
    code: r.code,
    partFamily: r.part_family,
    producedOn: isoDate(r.produced_on),
    line: r.line,
    notes: r.notes,
    parts: r.parts,
    worstSeverity: r.worst,
    lastSeen: r.last ? new Date(r.last).toISOString() : null,
  }));
}

export async function getBatch(code: string): Promise<BatchMeta | null> {
  const db = await getDb();
  const res = await db.query<{
    code: string;
    part_family: string | null;
    produced_on: string | null;
    line: string | null;
    notes: string | null;
  }>(`SELECT code, part_family, produced_on, line, notes FROM batches WHERE code = $1`, [
    code,
  ]);
  const r = res.rows[0];
  return r
    ? {
        code: r.code,
        partFamily: r.part_family,
        producedOn: isoDate(r.produced_on),
        line: r.line,
        notes: r.notes,
      }
    : null;
}

// Called on ingest — first record to name a batch creates its stub row.
export async function ensureBatch(code: string, partFamily: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO batches (code, part_family, created_at) VALUES ($1, $2, now())
     ON CONFLICT (code) DO NOTHING`,
    [code, partFamily],
  );
}

export async function upsertBatch(meta: BatchMeta): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO batches (code, part_family, produced_on, line, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (code) DO UPDATE SET
       part_family = COALESCE(EXCLUDED.part_family, batches.part_family),
       produced_on = EXCLUDED.produced_on,
       line        = EXCLUDED.line,
       notes       = EXCLUDED.notes`,
    [meta.code, meta.partFamily, meta.producedOn || null, meta.line, meta.notes],
  );
}

export async function recordsByBatch(code: string): Promise<WitnessRecord[]> {
  const db = await getDb();
  const res = await db.query<Row>(
    `SELECT * FROM records WHERE batch_code = $1 ORDER BY created_at DESC`,
    [code],
  );
  return res.rows.map(toRecord);
}

// Confirmed records only — the labelled set that trains a real model.
export async function listReviewed(): Promise<WitnessRecord[]> {
  const db = await getDb();
  const res = await db.query<Row>(
    `SELECT * FROM records WHERE reviewed_at IS NOT NULL ORDER BY reviewed_at DESC`,
  );
  return res.rows.map(toRecord);
}

export interface Stats {
  total: number;
  reviewed: number;
  unreviewed: number;
  atRisk: number; // effective severity >= 3
}

export async function stats(): Promise<Stats> {
  const db = await getDb();
  const res = await db.query<{ total: number; reviewed: number; at_risk: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(reviewed_at)::int AS reviewed,
            COUNT(*) FILTER (WHERE COALESCE(review_severity, severity) >= 3)::int AS at_risk
       FROM records`,
  );
  const r = res.rows[0] ?? { total: 0, reviewed: 0, at_risk: 0 };
  return {
    total: r.total,
    reviewed: r.reviewed,
    unreviewed: r.total - r.reviewed,
    atRisk: r.at_risk,
  };
}
