import { NextResponse } from "next/server";
import { z } from "zod";
import { listBatches, upsertBatch } from "@/lib/db";

export const runtime = "nodejs";

const BatchInput = z.object({
  code: z.string().trim().min(1),
  partFamily: z.enum(["bearing", "gear"]).nullable().default(null),
  producedOn: z.string().trim().nullable().default(null), // YYYY-MM-DD or ""
  line: z.string().trim().nullable().default(null),
  notes: z.string().trim().nullable().default(null),
});

export async function GET() {
  return NextResponse.json({ batches: await listBatches() });
}

export async function POST(request: Request) {
  const parsed = BatchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid batch." }, { status: 400 });
  }
  await upsertBatch({ ...parsed.data, producedOn: parsed.data.producedOn || null });
  return NextResponse.json({ ok: true }, { status: 200 });
}
