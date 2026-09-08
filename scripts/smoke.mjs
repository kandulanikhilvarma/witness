// Smoke test the ingest slice against a running dev server:
//   node scripts/smoke.mjs   (expects `next dev` on :3000, override with BASE)
//
// Synthesizes a noise image (high texture → the stub should name a later,
// higher-severity mode), POSTs it, then reads the record back.
import sharp from "sharp";

const base = process.env.BASE || "http://localhost:3000";

async function waitUp() {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${base}/api/records`);
      if (r.ok) return;
    } catch {
      // server not accepting yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("dev server never became ready");
}

async function main() {
  await waitUp();

  const w = 400;
  const h = 400;
  const raw = Buffer.alloc(w * h * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(Math.random() * 256);
  const jpeg = await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg()
    .toBuffer();

  const fd = new FormData();
  fd.append("file", new Blob([jpeg], { type: "image/jpeg" }), "smoke-noise.jpg");
  fd.append("partFamily", "gear");
  fd.append("batchCode", "SMOKE-001");

  const post = await fetch(`${base}/api/records`, { method: "POST", body: fd });
  const posted = await post.json();
  if (post.status !== 201) {
    throw new Error(`POST failed ${post.status}: ${JSON.stringify(posted)}`);
  }
  const rec = posted.record;
  console.log("POST 201 →", {
    id: rec.id.slice(0, 8),
    classifier: rec.classifier,
    standard: rec.standard,
    mode: `${rec.modeCode} ${rec.modeLabel}`,
    severity: rec.severity,
    confidence: rec.confidence,
    dims: `${rec.width}x${rec.height}`,
    thumbBytes: rec.thumb.length,
    batch: rec.batchCode,
  });
  if (process.env.EXPECT_ONNX && !rec.classifier.startsWith("onnx")) {
    throw new Error(`expected onnx classifier, got ${rec.classifier}`);
  }

  const list = await (await fetch(`${base}/api/records`)).json();
  console.log("GET → records:", list.records.length);

  // New pages must render (dynamic server components reading the DB).
  const pages = [
    `/console`,
    `/console/batches`,
    `/console/batches/${encodeURIComponent(rec.batchCode)}`,
    `/console/records/${rec.id}`,
  ];
  for (const p of pages) {
    const r = await fetch(`${base}${p}`);
    if (!r.ok) throw new Error(`page ${p} → ${r.status}`);
    console.log(`page ${p} → ${r.status}`);
  }

  // Batch entity: upsert provenance, read it back.
  const bres = await fetch(`${base}/api/batches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: rec.batchCode,
      partFamily: "gear",
      producedOn: "2026-01-15",
      line: "L3",
      notes: "smoke",
    }),
  });
  if (!bres.ok) throw new Error(`batch upsert → ${bres.status}`);
  const { batches } = await (await fetch(`${base}/api/batches`)).json();
  const b = batches.find((x) => x.code === rec.batchCode);
  if (!b || b.producedOn !== "2026-01-15" || b.line !== "L3") {
    throw new Error(`batch meta not persisted: ${JSON.stringify(b)}`);
  }
  console.log("batch meta →", {
    code: b.code,
    producedOn: b.producedOn,
    line: b.line,
    parts: b.parts,
    worst: b.worstSeverity,
  });

  // Human review overrides the model and wins.
  const rev = await fetch(`${base}/api/records/${rec.id}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ modeCode: "crack", severity: 4 }),
  });
  if (!rev.ok) throw new Error(`review → ${rev.status}`);
  const after = (await (await fetch(`${base}/api/records`)).json()).records.find(
    (x) => x.id === rec.id,
  );
  if (!after.review || after.review.severity !== 4 || after.review.modeCode !== "crack") {
    throw new Error(`review not applied: ${JSON.stringify(after.review)}`);
  }
  console.log("review →", after.review);

  // Label export must include the confirmed record.
  const exp = await fetch(`${base}/api/export/labels`);
  if (!exp.ok) throw new Error(`export → ${exp.status}`);
  const manifest = await exp.json();
  if (!Array.isArray(manifest.records) || manifest.count < 1) {
    throw new Error(`empty manifest: ${JSON.stringify(manifest).slice(0, 120)}`);
  }
  console.log("export labels → count", manifest.count);

  // Filters must render.
  for (const qs of ["q=gear", "sev=1", "part=gear", "q=nonexistent-zzz"]) {
    const r = await fetch(`${base}/console?${qs}`);
    if (!r.ok) throw new Error(`/console?${qs} → ${r.status}`);
    console.log(`/console?${qs} → ${r.status}`);
  }

  console.log("SMOKE PASS");
}

main().catch((e) => {
  console.error("SMOKE FAIL:", e.message);
  process.exit(1);
});
