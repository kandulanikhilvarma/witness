import "server-only";
import type { supabaseServer } from "./supabase/server";
import { STANDARD, modesFor, type PartFamily } from "./iso";
import { synthThumb } from "./seed";

// A first visit through "Enter the demo workspace" used to land on an empty
// console: anonymous sign-in mints a fresh tenant, and RLS (correctly) shows it
// nothing. This fills that tenant, once, with a small fleet that exercises every
// view: auto-filed and queued findings, confirmed and corrected reviews, two
// batches with suppliers, and a mode that repeats across one batch.
//
// Written through the user's own RLS session, so it can only ever touch the
// tenant it was called for. Corrections are written as the model's call first
// and then the inspector's, so the model_* trigger records the pair exactly as
// a real review would.

type Row = {
  family: PartFamily;
  mode: number; // index into the family's catalogue
  severity: number;
  confidence: number;
  state: "auto" | "queued" | "confirmed" | "corrected";
  correctTo?: { mode: number; severity: number };
  attribution?: string;
  batch: 0 | 1;
  daysAgo: number;
};

const ROWS: Row[] = [
  { family: "bearing", mode: 0, severity: 3, confidence: 0.86, state: "confirmed", attribution: "lubrication", batch: 0, daysAgo: 2 },
  { family: "bearing", mode: 0, severity: 3, confidence: 0.81, state: "auto", batch: 0, daysAgo: 3 },
  { family: "bearing", mode: 0, severity: 2, confidence: 0.64, state: "queued", batch: 0, daysAgo: 1 },
  { family: "bearing", mode: 2, severity: 2, confidence: 0.58, state: "corrected", correctTo: { mode: 1, severity: 2 }, attribution: "contamination", batch: 0, daysAgo: 6 },
  { family: "bearing", mode: 5, severity: 4, confidence: 0.52, state: "queued", batch: 0, daysAgo: 0 },
  { family: "bearing", mode: 3, severity: 2, confidence: 0.77, state: "confirmed", attribution: "electrical", batch: 0, daysAgo: 9 },
  { family: "gear", mode: 3, severity: 3, confidence: 0.74, state: "confirmed", attribution: "overload", batch: 1, daysAgo: 4 },
  { family: "gear", mode: 1, severity: 3, confidence: 0.61, state: "queued", batch: 1, daysAgo: 1 },
  { family: "gear", mode: 0, severity: 1, confidence: 0.9, state: "auto", batch: 1, daysAgo: 12 },
  { family: "gear", mode: 4, severity: 4, confidence: 0.66, state: "corrected", correctTo: { mode: 5, severity: 4 }, attribution: "overload", batch: 1, daysAgo: 5 },
];

type Db = Awaited<ReturnType<typeof supabaseServer>>;

export async function seedDemoWorkspace(sb: Db, tenantId: string): Promise<void> {
  const { data: fams, error: fe } = await sb
    .from("part_families")
    .insert([
      { tenant_id: tenantId, name: "Demo deep-groove bearings", kind: "bearing", sku_pattern: "62*" },
      { tenant_id: tenantId, name: "Demo helical gear sets", kind: "gear", sku_pattern: "HG-*" },
    ])
    .select("id, kind");
  if (fe || !fams) throw new Error(`families: ${fe?.message}`);
  const famId = (k: PartFamily) => (fams as { id: string; kind: string }[]).find((f) => f.kind === k)!.id;

  const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
  const { data: batches, error: be } = await sb
    .from("batches")
    .insert([
      { tenant_id: tenantId, batch_code: "DEMO-2409-A", plant: "Plant 2, press-fit line", supplier: "Supplier A", produced_at: day(60).slice(0, 10), unit_count: 400 },
      { tenant_id: tenantId, batch_code: "DEMO-2411-C", plant: "Plant 4, hardening", supplier: "Supplier C", produced_at: day(40).slice(0, 10), unit_count: 120 },
    ])
    .select("id");
  if (be || !batches) throw new Error(`batches: ${be?.message}`);

  for (const [i, r] of ROWS.entries()) {
    const modes = modesFor(r.family);
    const { data: f, error } = await sb
      .from("findings")
      .insert({
        tenant_id: tenantId,
        part_family_id: famId(r.family),
        iso_standard: STANDARD[r.family],
        iso_mode: modes[r.mode].code,
        severity: r.severity,
        confidence: r.confidence,
        anomaly_score: 1 + r.severity * 0.4,
        crop_uri: await synthThumb(r.severity, i + 101),
        evidence_text: "Demo finding. Synthetic image, seeded so a new workspace has something to explore.",
        model_version: "demo-seed",
        taxonomy_version: r.family === "bearing" ? "iso-15243:2017" : "iso-10825:2022",
        review_state: r.state === "auto" ? "auto" : "queued",
        created_at: day(r.daysAgo),
      })
      .select("id")
      .single();
    if (error || !f) throw new Error(`finding ${i}: ${error?.message}`);

    if (r.state === "confirmed" || r.state === "corrected") {
      const to = r.correctTo ?? { mode: r.mode, severity: r.severity };
      await sb
        .from("findings")
        .update({
          iso_mode: modes[to.mode].code,
          severity: to.severity,
          attribution: r.attribution ?? null,
          review_state: r.state,
        })
        .eq("id", f.id);
    }
    await sb.from("finding_batch").insert({
      finding_id: f.id,
      batch_id: (batches as { id: string }[])[r.batch].id,
      link_source: "manual",
      link_confidence: 1,
    });
  }
}
