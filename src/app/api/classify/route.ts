import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import { classifyCrop, CONFIDENCE_GATE, vlmConfigured } from "@/lib/stage2";
import { routeFinding } from "@/lib/gate";
import { makeThumb } from "@/lib/pipeline";
import { STANDARD, type PartFamily } from "@/lib/iso";
import { checkImage, decodeImagePayload } from "@/lib/upload";

// Each classify can call a paid vision model, and anyone can open a demo
// workspace, so a workspace gets a fixed number of classifications per UTC day.
const DAILY_LIMIT = Number(process.env.CLASSIFY_DAILY_LIMIT) || 100;

export const runtime = "nodejs";

// Stage-2 on demand: classify a subject against its part family's ISO modes,
// then let the confidence gate route it. High confidence auto-labels; anything
// below CONFIDENCE_GATE lands in the review queue for a human. Either way a
// findings row is written under the tenant's RLS session, which is what feeds
// the insights view. The ISO mode comes from here because a Stage-1 anomaly
// alone has no mode — findings.iso_mode is NOT NULL by design.
export async function POST(request: Request) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { enrolId, image, anomalyScore } = await request
    .json()
    .catch(() => ({}) as Record<string, unknown>);
  if (typeof enrolId !== "string" || typeof image !== "string") {
    return NextResponse.json({ error: "enrolId and image required." }, { status: 400 });
  }

  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const { count: usedToday } = await sb
    .from("findings")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00Z`);
  if ((usedToday ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit of ${DAILY_LIMIT} classifications reached for this workspace.` },
      { status: 429 },
    );
  }

  const { data: enrol } = await sb
    .from("enrolments")
    .select("part_family_id, part_families(kind)")
    .eq("id", enrolId)
    .single();
  const partFamilyId = (enrol as { part_family_id: string } | null)?.part_family_id;
  const kind = (enrol as { part_families: { kind: string } | null } | null)?.part_families?.kind;
  if (!partFamilyId || (kind !== "bearing" && kind !== "gear")) {
    return NextResponse.json({ error: "Enrolment or part family not found." }, { status: 404 });
  }
  const family = kind as PartFamily;

  const buffer = decodeImagePayload(image);
  if (!buffer) return NextResponse.json({ error: "The image is larger than 10 MB." }, { status: 413 });
  const bad = await checkImage(buffer);
  if (bad) return NextResponse.json({ error: bad }, { status: 422 });

  let result;
  let crop: string;
  try {
    [result, crop] = await Promise.all([classifyCrop(buffer, family), makeThumb(buffer)]);
  } catch {
    return NextResponse.json({ error: "Could not read that image." }, { status: 422 });
  }

  // The mode's review history can veto an auto-file. Reads model_* (the
  // 2026-09-27 migration); before that migration the query errors and the
  // plain confidence gate decides alone.
  let track: { reviewed: number; agreed: number } | null = null;
  if (result.confidence >= CONFIDENCE_GATE) {
    const { data: hist, error: histErr } = await sb
      .from("findings")
      .select("iso_mode")
      .eq("model_mode", result.modeCode)
      .in("review_state", ["confirmed", "corrected"])
      .limit(1000);
    if (!histErr && hist) {
      track = {
        reviewed: hist.length,
        agreed: hist.filter((h) => (h as { iso_mode: string }).iso_mode === result.modeCode).length,
      };
    }
  }
  const route = routeFinding(result.confidence, track);
  const reviewState = route.state;
  const anomaly =
    typeof anomalyScore === "number" && Number.isFinite(anomalyScore) ? anomalyScore : null;

  const { data: finding, error } = await sb
    .from("findings")
    .insert({
      tenant_id: session.tenantId,
      part_family_id: partFamilyId,
      iso_standard: STANDARD[family],
      iso_mode: result.modeCode,
      severity: result.severity,
      confidence: result.confidence,
      anomaly_score: anomaly,
      crop_uri: crop,
      evidence_text: result.rationale,
      model_version: result.source,
      taxonomy_version: family === "bearing" ? "iso-15243:2017" : "iso-10825:2022",
      review_state: reviewState,
    })
    .select("id")
    .single();

  if (error || !finding) {
    return NextResponse.json({ error: error?.message ?? "Insert failed." }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: finding.id,
      result,
      routed: reviewState,
      reason: route.reason,
      gate: CONFIDENCE_GATE,
      vlmConfigured: vlmConfigured(),
    },
    { status: 201 },
  );
}
