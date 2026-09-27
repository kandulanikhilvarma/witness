import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { currentSession } from "@/lib/tenant";
import { modeLabel, attributionFor } from "@/lib/iso";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";

const PAGE = 1000;

// Machine-readable export of a tenant's findings. Auth-gated and RLS-scoped, so
// it only ever returns the caller's own workspace. A warranty system or BI tool
// pulls this; the crop data URIs are dropped to keep the payload lean.
//
// Each row carries the model's original call (model_*) beside the current,
// human-owned one, so a corrected finding still shows what the model said.
// ?format=csv returns the same rows flattened for a spreadsheet. The whole
// workspace is paged through in blocks of PAGE, never silently truncated.
export async function GET(request: Request) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const csv = new URL(request.url).searchParams.get("format") === "csv";

  type Row = {
    id: string;
    iso_standard: string;
    iso_mode: string;
    severity: number;
    attribution: string | null;
    confidence: number | null;
    anomaly_score: number | null;
    model_version: string | null;
    model_mode: string | null;
    model_severity: number | null;
    model_confidence: number | null;
    taxonomy_version: string | null;
    review_state: string;
    reviewed_at: string | null;
    created_at: string;
    finding_batch?: { batches: { batch_code: string; supplier: string | null } | { batch_code: string; supplier: string | null }[] | null }[];
  };

  const sb = await supabaseServer();
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("findings")
      .select(
        "id, iso_standard, iso_mode, severity, attribution, confidence, anomaly_score, model_version, model_mode, model_severity, model_confidence, taxonomy_version, review_state, reviewed_at, created_at, finding_batch(batches(batch_code, supplier))",
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < PAGE) break;
  }

  const findings = rows.map((f) => {
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
      model: {
        mode_code: f.model_mode,
        severity: f.model_severity,
        confidence: f.model_confidence,
        version: f.model_version,
      },
      anomaly_score: f.anomaly_score,
      taxonomy: f.taxonomy_version,
      review_state: f.review_state,
      reviewed_at: f.reviewed_at,
      created_at: f.created_at,
      batches: batches.map((b) => ({ code: b.batch_code, supplier: b.supplier })),
    };
  });

  const stamp = new Date().toISOString().slice(0, 10);
  if (csv) {
    const body = toCsv(
      findings.map((f) => ({
        id: f.id,
        standard: f.standard,
        mode_code: f.mode_code,
        mode_label: f.mode_label,
        severity: f.severity,
        attribution: f.attribution_label ?? "",
        model_mode: f.model.mode_code ?? "",
        model_severity: f.model.severity ?? "",
        model_confidence: f.model.confidence ?? "",
        model_version: f.model.version ?? "",
        anomaly_score: f.anomaly_score ?? "",
        review_state: f.review_state,
        reviewed_at: f.reviewed_at ?? "",
        created_at: f.created_at,
        batches: f.batches.map((b) => b.code).join(" "),
      })),
    );
    return new NextResponse(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="witness-findings-${stamp}.csv"`,
      },
    });
  }

  return NextResponse.json(
    { workspace: session.tenantName, generated_at: new Date().toISOString(), count: findings.length, findings },
    { headers: { "content-disposition": `attachment; filename="witness-findings-${stamp}.json"` } },
  );
}
