import { NextResponse } from "next/server";
import { z } from "zod";
import { getRecord, setReview } from "@/lib/db";
import { modesFor } from "@/lib/iso";
import { supabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const Body = z.object({
  modeCode: z.string(),
  severity: z.number().int().min(0).max(4),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // The PGlite demo routes carry no auth. On a Supabase deploy they must not
  // exist at all, or anyone could write to the in-process demo database.
  if (supabaseConfigured) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { id } = await params;
  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }
  const mode = modesFor(rec.partFamily).find((m) => m.code === parsed.data.modeCode);
  if (!mode) {
    return NextResponse.json({ error: "Unknown failure mode." }, { status: 400 });
  }

  const record = await setReview(id, mode.code, mode.label, parsed.data.severity);
  return NextResponse.json({ record });
}
