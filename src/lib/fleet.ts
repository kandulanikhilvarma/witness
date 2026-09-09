import "server-only";
import { supabaseServer } from "./supabase/server";
import { currentSession } from "./tenant";

// Fleet-level reads over findings and their production batches. A finding links
// to a batch through finding_batch; a bad supplier lot shows up as a cluster of
// severe findings against one batch. All RLS-scoped to the tenant.

export interface BatchStat {
  id: string;
  batch_code: string;
  plant: string | null;
  supplier: string | null;
  produced_at: string | null;
  unit_count: number | null;
  findings: number;
  worst: number;
}

export async function listBatchStats(): Promise<BatchStat[]> {
  const sb = await supabaseServer();
  const [{ data: batches }, { data: links }] = await Promise.all([
    sb
      .from("batches")
      .select("id, batch_code, plant, supplier, produced_at, unit_count")
      .order("produced_at", { ascending: false, nullsFirst: false }),
    sb.from("finding_batch").select("batch_id, findings(severity)"),
  ]);

  type FRow = { batch_id: string; findings: { severity: number } | { severity: number }[] | null };
  const agg = new Map<string, { n: number; worst: number }>();
  for (const l of (links ?? []) as unknown as FRow[]) {
    const sev = Array.isArray(l.findings) ? (l.findings[0]?.severity ?? 0) : (l.findings?.severity ?? 0);
    const cur = agg.get(l.batch_id) ?? { n: 0, worst: 0 };
    cur.n += 1;
    cur.worst = Math.max(cur.worst, sev);
    agg.set(l.batch_id, cur);
  }

  return ((batches ?? []) as Omit<BatchStat, "findings" | "worst">[]).map((b) => ({
    ...b,
    findings: agg.get(b.id)?.n ?? 0,
    worst: agg.get(b.id)?.worst ?? 0,
  }));
}

export async function createBatch(input: {
  batch_code: string;
  plant: string | null;
  supplier: string | null;
  produced_at: string | null;
  unit_count: number | null;
}): Promise<void> {
  const session = await currentSession();
  if (!session) return;
  const sb = await supabaseServer();
  await sb.from("batches").insert({ tenant_id: session.tenantId, ...input });
}

export interface FindingDetail {
  id: string;
  iso_standard: string;
  iso_mode: string;
  iso_submode: string | null;
  iso_clause: string | null;
  severity: number;
  attribution: string | null;
  confidence: number | null;
  anomaly_score: number | null;
  crop_uri: string | null;
  heatmap_uri: string | null;
  evidence_text: string | null;
  model_version: string | null;
  taxonomy_version: string | null;
  review_state: string;
  created_at: string;
  batches: { id: string; batch_code: string; supplier: string | null }[];
}

export async function findingDetail(id: string): Promise<FindingDetail | null> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("findings")
    .select(
      "id, iso_standard, iso_mode, iso_submode, iso_clause, severity, attribution, confidence, anomaly_score, crop_uri, heatmap_uri, evidence_text, model_version, taxonomy_version, review_state, created_at, finding_batch(batches(id, batch_code, supplier))",
    )
    .eq("id", id)
    .single();
  if (!data) return null;
  type B = { id: string; batch_code: string; supplier: string | null };
  const row = data as unknown as Record<string, unknown> & {
    finding_batch?: { batches: B | B[] | null }[];
  };
  const batches: B[] = (row.finding_batch ?? []).flatMap((fb) =>
    Array.isArray(fb.batches) ? fb.batches : fb.batches ? [fb.batches] : [],
  );
  return { ...(row as unknown as FindingDetail), batches };
}

export async function linkFindingToBatch(findingId: string, batchId: string): Promise<void> {
  const sb = await supabaseServer();
  await sb
    .from("finding_batch")
    .upsert(
      { finding_id: findingId, batch_id: batchId, link_source: "manual", link_confidence: 1 },
      { onConflict: "finding_id,batch_id" },
    );
}

export async function listBatchOptions(): Promise<{ id: string; batch_code: string }[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("batches").select("id, batch_code").order("batch_code");
  return (data ?? []) as { id: string; batch_code: string }[];
}
