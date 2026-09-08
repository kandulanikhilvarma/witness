import { NextResponse } from "next/server";
import { listReviewed } from "@/lib/db";

export const runtime = "nodejs";

// Training manifest: every confirmed record as a (model suggestion, human label)
// pair. This is the file you feed a training run to produce a real classifier.
export async function GET() {
  const recs = await listReviewed();
  const records = recs.map((r) => ({
    id: r.id,
    partFamily: r.partFamily,
    standard: r.standard,
    imageName: r.imageName,
    batchCode: r.batchCode,
    model: {
      modeCode: r.modeCode,
      severity: r.severity,
      confidence: r.confidence,
      classifier: r.classifier,
    },
    label: r.review, // { modeCode, modeLabel, severity, reviewedAt }
  }));

  return new NextResponse(JSON.stringify({ count: records.length, records }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="witness-labels.json"',
    },
  });
}
