import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { currentSession } from "@/lib/tenant";
import { scoreImage } from "@/lib/patchcore";

export const runtime = "nodejs";

// Score one subject image against an enrolment's trained coreset. Auth-gated;
// the coreset load is RLS-scoped, so a tenant can only score against its own
// reference sets. Stage-1 only — anomaly score + heatmap, no ISO call (phase 5).
export async function POST(request: Request) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 400 });
  }
  if (!(await currentSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { enrolId, image } = await request.json().catch(() => ({}) as Record<string, string>);
  if (!enrolId || !image) {
    return NextResponse.json({ error: "enrolId and image required." }, { status: 400 });
  }
  const result = await scoreImage(enrolId, image);
  if ("error" in result) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result, { status: 200 });
}
