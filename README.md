# Witness

Defect intelligence for rotating equipment. A photograph of a returned gearbox
part becomes a standards-linked failure record — the failure mode, the severity,
and the batch that produced it. Local-first: records live on the workstation, no
cloud.

- **Bearings** classify against **ISO 15243** (rolling-bearing damage modes).
- **Gears** classify against **ISO 10825** (gear-tooth wear and damage).

## Honest status

The classifier is a **prototype, not diagnostic**. Two implementations sit
behind one interface:

- `stub-heuristic-v1` — a deterministic heuristic over image texture. No model.
- `onnx:<file>` — real `onnxruntime-node` inference with a generic ImageNet model
  (MobileNetV2-7). The inference is real; the ImageNet class is mapped to an ISO
  mode as a **placeholder**. Not a trained diagnostic model.

The model's output is only a suggestion. **The inspector confirms or overrides
the mode and severity, and that judgment wins.** Every confirmed record becomes a
`(model suggestion, human label)` pair — the training data that turns the
placeholder into a real model.

## Run

```bash
npm install
npm run dev            # webpack — reliable on Windows
# npm run dev:turbo    # Turbopack (dev PostCSS worker panics on some Windows setups)
npm run build && npm start
```

Open <http://localhost:3000> → **Open console**.

Optional — enable real ONNX inference (14 MB, git-ignored):

```bash
mkdir -p data/models && curl -sL -o data/models/model.onnx \
  https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-7.onnx
```

Without a model file the pipeline falls back to the stub. Override the path with
`WITNESS_ONNX_MODEL`.

## How it works

```
photo ──▶ EXIF (exifr) + normalize/features (sharp) ──▶ classifier ──▶ zod record
                                                                          │
                                                             PGlite (./data/witness)
                                                                          │
                                       console: list · filter · batches · detail · review
```

- `src/lib/pipeline.ts` — the ingest chain. `src/lib/classifier.ts` +
  `src/lib/onnx-classifier.ts` — the two classifiers. `src/lib/db.ts` — PGlite
  (server-side, persisted, migrated on boot). `src/lib/iso.ts` — the ISO mode
  catalogs and severity ramp.
- Routes: `POST/GET /api/records` (ingest/list), `POST /api/records/[id]/review`
  (human label), `POST/GET /api/batches` (provenance), `GET /api/export/labels`
  (training manifest).
- Console: records with filter/search, batches with rollups, record detail with
  the review form, overview stats.

## Verify

```bash
npm run build          # typecheck + bundle
npm start &            # production server on :3000
node scripts/smoke.mjs # ingest → review → export → pages, end to end
```

Set `EXPECT_ONNX=1` to assert the ONNX classifier is the one running.

## Next

Collect confirmed records → `GET /api/export/labels` → train a classifier on the
labels → export to ONNX → drop it in and delete the class-index mapping in
`onnx-classifier.ts`. The interface does not change.

Design system, verification results, and structure: `docs/witness-slice-report.md`.
