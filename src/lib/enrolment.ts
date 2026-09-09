import "server-only";
import { supabaseServer } from "./supabase/server";
import { currentSession } from "./tenant";
import type { PartFamily } from "./iso";

// Enrolment is how a tenant teaches Witness what "good" looks like for one part
// family: a set of known-good reference photos. Pass 1 (here) is the schema and
// the flow that collects the set — create a family, open an enrolment, add
// reference assets. Pass 2 (Python) trains a PatchCore coreset from the set and
// fills coreset_uri / trained_at / metrics, flipping status to `ready`.

export type EnrolStatus = "draft" | "training" | "ready" | "failed";

export interface Family {
  id: string;
  name: string;
  kind: PartFamily;
  sku_pattern: string | null;
}

export interface Enrolment {
  id: string;
  part_family_id: string;
  name: string | null;
  status: EnrolStatus;
  image_count: number;
  coreset_uri: string | null;
  trained_at: string | null;
  created_at: string;
}

export interface RefAsset {
  id: string;
  image_name: string | null;
  thumb: string | null;
  provenance_score: number;
  created_at: string;
}

// Reference set below this is too small to characterise "normal" — the UI warns
// and pass 2 will refuse to train. A soft floor, not a hard gate.
export const MIN_REFERENCE_IMAGES = 20;

export async function listFamilies(): Promise<Family[]> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("part_families")
    .select("id, name, kind, sku_pattern")
    .order("created_at", { ascending: true });
  return (data ?? []) as Family[];
}

export async function createFamily(
  name: string,
  kind: PartFamily,
  sku: string | null,
): Promise<string | null> {
  const session = await currentSession();
  if (!session) return null;
  const sb = await supabaseServer();
  const { data } = await sb
    .from("part_families")
    .insert({ tenant_id: session.tenantId, name, kind, sku_pattern: sku })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function listEnrolments(familyId: string): Promise<Enrolment[]> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("enrolments")
    .select("id, part_family_id, name, status, image_count, coreset_uri, trained_at, created_at")
    .eq("part_family_id", familyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Enrolment[];
}

export async function createEnrolment(familyId: string, name: string): Promise<string | null> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("enrolments")
    .insert({ part_family_id: familyId, name, status: "draft", image_count: 0 })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function enrolmentDetail(
  enrolId: string,
): Promise<{ enrolment: Enrolment; refs: RefAsset[] } | null> {
  const sb = await supabaseServer();
  const { data: e } = await sb
    .from("enrolments")
    .select("id, part_family_id, name, status, image_count, coreset_uri, trained_at, created_at")
    .eq("id", enrolId)
    .single();
  if (!e) return null;
  const { data: refs } = await sb
    .from("assets")
    .select("id, image_name, thumb, provenance_score, created_at")
    .eq("enrolment_id", enrolId)
    .order("created_at", { ascending: false });
  return { enrolment: e as Enrolment, refs: (refs ?? []) as RefAsset[] };
}

// image_count is a cached mirror of the real reference count. Recompute it from
// the assets rather than incrementing — no counter to drift out of sync.
export async function syncCount(enrolId: string): Promise<number> {
  const sb = await supabaseServer();
  const { count } = await sb
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("enrolment_id", enrolId);
  const n = count ?? 0;
  await sb.from("enrolments").update({ image_count: n }).eq("id", enrolId);
  return n;
}
