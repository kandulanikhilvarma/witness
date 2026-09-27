import { NextResponse } from "next/server";
import { listReviewed } from "@/lib/db";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import { modeLabel } from "@/lib/iso";

export const runtime = "nodejs";

const download = (body: unknown) =>
  new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="witness-labels.json"',
    },
  });

// Training manifest: every human-reviewed record as a (model suggestion, human
// label) pair. This is the file you feed a training run to produce a real
// classifier. Two backends, one shape.
export async function GET() {
  if (supabaseConfigured) return supabaseLabels();

  const recs = await listReviewed();
  const records = recs.map((r) => ({
    id: r.id,
    partFamily: r.partFamily,
    standard: r.standard,
    imageName: r.imageName,
    batchCode: r.batchCode,
    model: {
      modeCode: r.modeCode,
      severity: r.severity,
      confidence: r.confidence,
      classifier: r.classifier,
    },
    label: r.review, // { modeCode, modeLabel, severity, reviewedAt }
  }));
  return download({ count: records.length, records });
}

// Supabase path. The model's call lives in findings.model_*, pinned by a
// trigger so a correction cannot overwrite it. Rows reviewed before that
// trigger existed have no model call and are left out rather than guessed.
async function supabaseLabels() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("findings")
    .select(
      "id, iso_standard, iso_mode, severity, attribution, review_state, reviewed_at, model_mode, model_severity, model_confidence, model_version, crop_uri",
    )
    .in("review_state", ["confirmed", "corrected"])
    .not("model_mode", "is", null)
    .order("reviewed_at", { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    iso_standard: string;
    iso_mode: string;
    severity: number;
    attribution: string | null;
    review_state: string;
    reviewed_at: string | null;
    model_mode: string;
    model_severity: number | null;
    model_confidence: number | null;
    model_version: string | null;
    crop_uri: string | null;
  };
  const records = ((data ?? []) as Row[]).map((f) => ({
    id: f.id,
    standard: f.iso_standard,
    image: f.crop_uri,
    model: {
      modeCode: f.model_mode,
      severity: f.model_severity,
      confidence: f.model_confidence,
      classifier: f.model_version,
    },
    label: {
      modeCode: f.iso_mode,
      modeLabel: modeLabel(f.iso_standard, f.iso_mode),
      severity: f.severity,
      attribution: f.attribution,
      corrected: f.review_state === "corrected",
      reviewedAt: f.reviewed_at,
    },
  }));
  return download({ workspace: session.tenantName, count: records.length, records });
}
