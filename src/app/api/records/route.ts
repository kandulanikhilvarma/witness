import { NextResponse } from "next/server";
import { analyzeImage } from "@/lib/pipeline";
import { insertRecord, listRecords, ensureBatch } from "@/lib/db";
import type { PartFamily } from "@/lib/iso";
import { supabaseConfigured } from "@/lib/supabase/config";
import { checkImage } from "@/lib/upload";

// sharp is native — this handler must run on Node, never the Edge runtime.
export const runtime = "nodejs";

export async function GET() {
  // The PGlite demo routes carry no auth. On a Supabase deploy they must not
  // exist at all, or anyone could write to the in-process demo database.
  if (supabaseConfigured) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const records = await listRecords();
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  // The PGlite demo routes carry no auth. On a Supabase deploy they must not
  // exist at all, or anyone could write to the in-process demo database.
  if (supabaseConfigured) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const form = await request.formData();
  const file = form.get("file");
  const partFamily = form.get("partFamily");
  const batchCode = form.get("batchCode");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
  }
  if (partFamily !== "bearing" && partFamily !== "gear") {
    return NextResponse.json(
      { error: "partFamily must be 'bearing' or 'gear'." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const bad = await checkImage(buffer);
  if (bad) return NextResponse.json({ error: bad }, { status: 422 });

  let record;
  try {
    record = await analyzeImage(buffer, {
      imageName: file.name || "upload",
      partFamily: partFamily as PartFamily,
      batchCode: typeof batchCode === "string" && batchCode ? batchCode : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  await insertRecord(record);
  if (record.batchCode) await ensureBatch(record.batchCode, record.partFamily);
  return NextResponse.json({ record }, { status: 201 });
}
