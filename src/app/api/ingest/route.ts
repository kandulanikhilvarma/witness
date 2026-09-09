import { NextResponse } from "next/server";
import sharp from "sharp";
import exifr from "exifr";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { currentSession } from "@/lib/tenant";
import { dHash, hamming, DUPE_THRESHOLD } from "@/lib/phash";
import { scoreProvenance } from "@/lib/provenance";

export const runtime = "nodejs"; // sharp is native

// Phase 2 intake on Supabase: a photo becomes an asset row carrying its EXIF,
// a provenance score, and a perceptual hash checked against the tenant's other
// assets for a re-sent duplicate. No classification here — that is phase 4/5.
export async function POST(request: Request) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const channel = (form.get("channel") as string) || "portal";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  let exif: Record<string, unknown> | null = null;
  let phash: string;
  let thumb: string;
  let width = 0;
  let height = 0;
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
  } catch {
    return NextResponse.json({ error: "Could not read that image." }, { status: 422 });
  }

  const sb = await supabaseServer();

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

  const prov = scoreProvenance({ exif, duplicate, filename: file.name || "" });

  const { data: asset, error } = await sb
    .from("assets")
    .insert({
      tenant_id: session.tenantId,
      storage_uri: "inline", // original-file storage lands with the pipeline (phase 4)
      image_name: file.name || "upload",
      mime: file.type || "image/jpeg",
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
    })
    .select("id")
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  return NextResponse.json(
    { id: asset.id, provenance: prov, duplicate, nearest },
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
