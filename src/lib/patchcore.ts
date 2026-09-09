import "server-only";
import { headers } from "next/headers";
import { supabaseServer } from "./supabase/server";

// Client for the Stage-1 anomaly function (api/patchcore.py). That function is
// pure compute — it holds no state and touches no database. This module is the
// bridge: it reads reference thumbnails and writes results under the tenant's
// RLS session, and hands the function only pixels.

export interface Coreset {
  size: number;
  grid: number;
  mean: number[];
  std: number[];
  bank: number[][];
  threshold: number;
}

export interface ScoreResult {
  score: number;
  normalized: number;
  anomalous: boolean;
  threshold: number;
  heatmap: number[][];
}

async function functionUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}/api/patchcore`;
}

// ponytail: the reference thumbs go to the function inline as one JSON body.
// Vercel caps a function body near 4.5MB, so this holds for tens of thumbnails,
// not thousands. At real fleet scale the set moves through object storage; the
// thumbnail path is what an enrolment actually needs today.
export async function trainEnrolment(
  enrolId: string,
): Promise<{ ok: true; nImages: number } | { ok: false; error: string }> {
  const sb = await supabaseServer();
  const { data: refs } = await sb
    .from("assets")
    .select("thumb")
    .eq("enrolment_id", enrolId)
    .not("thumb", "is", null);
  const images = (refs ?? []).map((r) => (r as { thumb: string }).thumb);
  if (images.length === 0) return { ok: false, error: "No reference images to train on." };

  await sb.from("enrolments").update({ status: "training" }).eq("id", enrolId);

  let body: {
    error?: string;
    size: number;
    grid: number;
    mean: number[];
    std: number[];
    bank: number[][];
    threshold: number;
    metrics: Record<string, number>;
  };
  try {
    const res = await fetch(await functionUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "train", images }),
    });
    body = await res.json();
    if (!res.ok || body.error) throw new Error(body.error ?? `train failed (${res.status})`);
  } catch (err) {
    await sb.from("enrolments").update({ status: "failed" }).eq("id", enrolId);
    return { ok: false, error: err instanceof Error ? err.message : "train failed" };
  }

  const coreset: Coreset = {
    size: body.size,
    grid: body.grid,
    mean: body.mean,
    std: body.std,
    bank: body.bank,
    threshold: body.threshold,
  };
  await sb
    .from("enrolments")
    .update({
      coreset,
      coreset_uri: "inline",
      metrics: body.metrics,
      trained_at: new Date().toISOString(),
      status: "ready",
      image_count: images.length,
    })
    .eq("id", enrolId);
  return { ok: true, nImages: images.length };
}

export async function loadCoreset(enrolId: string): Promise<Coreset | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("enrolments").select("coreset").eq("id", enrolId).single();
  return (data?.coreset as Coreset) ?? null;
}

export async function scoreImage(
  enrolId: string,
  imageDataUri: string,
): Promise<ScoreResult | { error: string }> {
  const coreset = await loadCoreset(enrolId);
  if (!coreset) return { error: "This set has no trained model. Train it first." };
  const res = await fetch(await functionUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "score", coreset, image: imageDataUri }),
  });
  const body = await res.json();
  if (!res.ok || body.error) return { error: body.error ?? `score failed (${res.status})` };
  return body as ScoreResult;
}
