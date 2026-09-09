import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import { modeLabel, attributionFor } from "@/lib/iso";

export const runtime = "nodejs";

// Machine-readable export of a tenant's findings. Auth-gated and RLS-scoped, so
// it only ever returns the caller's own workspace. A warranty system or BI tool
// pulls this; the crop data URIs are dropped to keep the payload lean.
export async function GET() {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const sb = await supabaseServer();
  const { data } = await sb
    .from("findings")
    .select(
      "id, iso_standard, iso_mode, severity, attribution, confidence, anomaly_score, model_version, taxonomy_version, review_state, created_at, finding_batch(batches(batch_code, supplier))",
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  type Row = {
    id: string;
    iso_standard: string;
    iso_mode: string;
    severity: number;
    attribution: string | null;
    confidence: number | null;
    anomaly_score: number | null;
    model_version: string | null;
    taxonomy_version: string | null;
    review_state: string;
    created_at: string;
    finding_batch?: { batches: { batch_code: string; supplier: string | null } | { batch_code: string; supplier: string | null }[] | null }[];
  };

  const findings = ((data ?? []) as unknown as Row[]).map((f) => {
    const batches = (f.finding_batch ?? []).flatMap((fb) =>
      Array.isArray(fb.batches) ? fb.batches : fb.batches ? [fb.batches] : [],
    );
    return {
      id: f.id,
      standard: f.iso_standard,
      mode_code: f.iso_mode,
      mode_label: modeLabel(f.iso_standard, f.iso_mode),
      severity: f.severity,
      attribution: f.attribution,
      attribution_label: attributionFor(f.attribution)?.label ?? null,
      confidence: f.confidence,
      anomaly_score: f.anomaly_score,
      model: f.model_version,
      taxonomy: f.taxonomy_version,
      review_state: f.review_state,
      created_at: f.created_at,
      batches: batches.map((b) => ({ code: b.batch_code, supplier: b.supplier })),
    };
  });

  return NextResponse.json(
    {
      workspace: session.tenantName,
      generated_at: new Date().toISOString(),
      count: findings.length,
      findings,
    },
    {
      headers: {
        "content-disposition": `attachment; filename="witness-findings-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    },
  );
}
