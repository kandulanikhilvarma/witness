import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import exifr from "exifr";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { currentSession } from "@/lib/tenant";
import { dHash, hamming, DUPE_THRESHOLD } from "@/lib/phash";
import { scoreProvenance } from "@/lib/provenance";
import { syncCount } from "@/lib/enrolment";
import { checkImage } from "@/lib/upload";

export const runtime = "nodejs"; // sharp is native

// Intake on Supabase: a photo becomes an asset row carrying its EXIF, a
// provenance score, and a perceptual hash checked against the tenant's other
// assets for a re-sent duplicate. The original bytes go to the private
// witness-originals bucket under <tenant>/<sha256>.<ext>, so the evidence a
// finding rests on can be produced later and proven unchanged by its hash.
const ORIGINALS = "witness-originals";
export async function POST(request: Request) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const sb = await supabaseServer();

  // Two ways in. The browser normally uploads the original straight to the
  // bucket (no 4.5 MB function body cap) and posts only its path as JSON; the
  // server then reads the bytes back under the tenant's RLS session. A plain
  // multipart upload is the fallback for when storage is unavailable.
  let buffer: Buffer;
  let filename: string;
  let mime: string;
  let channel: string;
  let enrolmentId: string | null;
  let storedPath: string | null = null;

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const path = typeof body?.path === "string" ? body.path : "";
    // Only this tenant's folder, only a content-addressed name.
    const parts = path.split("/");
    const m =
      parts.length === 2 && parts[0] === session.tenantId
        ? parts[1].match(/^([0-9a-f]{64})\.[a-z0-9]{3,4}$/)
        : null;
    if (!m) return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
    const { data: blob, error: dlErr } = await sb.storage.from(ORIGINALS).download(path);
    if (dlErr || !blob) return NextResponse.json({ error: "Uploaded original not found." }, { status: 404 });
    buffer = Buffer.from(await blob.arrayBuffer());
    if (createHash("sha256").update(buffer).digest("hex") !== m[1]) {
      return NextResponse.json({ error: "Original does not match its hash." }, { status: 422 });
    }
    filename = typeof body?.filename === "string" ? body.filename.slice(0, 200) : "upload";
    mime = blob.type || "image/jpeg";
    channel = typeof body?.channel === "string" ? body.channel : "portal";
    enrolmentId = typeof body?.enrolment_id === "string" && body.enrolment_id ? body.enrolment_id : null;
    storedPath = path;
  } else {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
    }
    buffer = Buffer.from(await file.arrayBuffer());
    filename = file.name || "upload";
    mime = file.type || "image/jpeg";
    channel = (form.get("channel") as string) || "portal";
    enrolmentId = (form.get("enrolment_id") as string) || null;
  }

  const bad = await checkImage(buffer);
  if (bad) return NextResponse.json({ error: bad }, { status: 422 });

  let exif: Record<string, unknown> | null = null;
  let phash: string;
  let thumb: string;
  let width = 0;
  let height = 0;
  let format = "jpeg";
  try {
    const [rawExif, hash, t, meta] = await Promise.all([
      exifr.parse(buffer).then((e) => e ?? null).catch(() => null),
      dHash(buffer),
      sharp(buffer, { failOn: "none" })
        .resize(240, 240, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer()
        .then((b) => `data:image/jpeg;base64,${b.toString("base64")}`),
      sharp(buffer, { failOn: "none" }).metadata(),
    ]);
    exif = cleanExif(rawExif);
    phash = hash;
    thumb = t;
    width = meta.width ?? 0;
    height = meta.height ?? 0;
    format = meta.format ?? "jpeg";
  } catch {
    return NextResponse.json({ error: "Could not read that image." }, { status: 422 });
  }

  // Keep the original. Content-addressed, so a re-upload of the same bytes is a
  // no-op. If storage is unavailable (bucket not yet migrated) intake still
  // succeeds and the asset records "inline", as before.
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  let objectPath = storedPath ?? `${session.tenantId}/${sha256}.${format === "jpeg" ? "jpg" : format}`;
  let stored = storedPath !== null;
  if (!stored) {
    const { error: upErr } = await sb.storage
      .from(ORIGINALS)
      .upload(objectPath, buffer, { contentType: mime, upsert: false });
    stored = !upErr || /exists/i.test(upErr.message);
    if (!stored) {
      console.error("[ingest] original not stored:", upErr?.message);
      objectPath = "";
    }
  }

  // Near-duplicate: compare against this tenant's existing hashes (RLS-scoped).
  const { data: prior } = await sb
    .from("assets")
    .select("id, image_name, phash")
    .not("phash", "is", null);
  let nearest: { id: string; image_name: string | null; distance: number } | null = null;
  for (const a of (prior ?? []) as { id: string; image_name: string | null; phash: string }[]) {
    const d = hamming(phash, a.phash);
    if (!nearest || d < nearest.distance) nearest = { id: a.id, image_name: a.image_name, distance: d };
  }
  const duplicate = Boolean(nearest && nearest.distance <= DUPE_THRESHOLD);

  const prov = scoreProvenance({ exif, duplicate, filename });

  const { data: asset, error } = await sb
    .from("assets")
    .insert({
      tenant_id: session.tenantId,
      storage_uri: stored ? `${ORIGINALS}/${objectPath}` : "inline",
      image_name: filename,
      mime,
      width,
      height,
      thumb,
      exif,
      phash,
      provenance_score: prov.score,
      provenance_reasons: prov.reasons,
      source_channel: channel,
      near_dupe_of: duplicate ? nearest!.id : null,
      dupe_distance: nearest ? nearest.distance : null,
      enrolment_id: enrolmentId,
    })
    .select("id")
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  // A reference upload changes its enrolment's count — keep the mirror honest.
  if (enrolmentId) await syncCount(enrolmentId);

  return NextResponse.json(
    { id: asset.id, provenance: prov, duplicate, nearest, enrolmentId, sha256, stored },
    { status: 201 },
  );
}

// exifr returns Dates, Buffers, and nested objects. Keep only scalar fields so
// the value round-trips cleanly through jsonb.
function cleanExif(exif: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!exif) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(exif)) {
    if (v == null) continue;
    if (v instanceof Date) out[k] = v.toISOString();
    else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}
