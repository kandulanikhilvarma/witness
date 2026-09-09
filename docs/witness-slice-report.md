# Witness — vertical slice report

Defect intelligence for rotating equipment. A photograph of a returned gearbox
part becomes an ISO 15243 (bearings) / ISO 10825 (gears) failure record — mode,
severity 0–4, and the batch that produced it.

Stack: Next.js 16.3.4 (App Router, Turbopack), React 19, Tailwind v4, all
local-first — PGlite runs in-process, persisted to `./data/witness`; nothing
leaves the workstation.

## What this slice delivers

| Area | Files |
|------|-------|
| ISO catalogs, severity, zod schema | `src/lib/iso.ts`, `src/lib/schema.ts` |
| Classifier (swappable stub) | `src/lib/classifier.ts` |
| Pipeline: EXIF + sharp + classify | `src/lib/pipeline.ts` |
| Local DB (PGlite) + queries | `src/lib/db.ts` |
| Ingest / list API | `src/app/api/records/route.ts` |
| Console shell, records, detail, batches | `src/app/(console)/…` |
| Shared table, severity chip, ingest form | `src/components/…` |
| Marketing landing | `src/app/page.tsx` |

Routes: `/` (static), `/api/records`, `/console`, `/console/batches`,
`/console/batches/[code]`, `/console/records/[id]` (all dynamic).

## The pipeline

1. `POST /api/records` (multipart: image + partFamily + optional batchCode).
2. `exifr` reads EXIF; `sharp` reads dimensions, builds a 240px thumbnail, and
   extracts luma features (mean, contrast, edge density).
3. The classifier names a failure mode + severity + confidence from the
   features.
4. `zod` validates the record; PGlite stores it.
5. Console pages read the DB at request time.

## Classifier — real inference, placeholder labels

Two implementations behind one `Classifier` interface (which now receives the
image `buffer`, not just derived features):

- `StubClassifier` (`stub-heuristic-v1`) — deterministic heuristic, no model.
- `OnnxClassifier` (`onnx:<file>`) — real `onnxruntime-node` inference with a
  generic ImageNet model (MobileNetV2-7, ONNX Model Zoo). ImageNet classes are
  **not** ISO failure modes, so the top-1 class index is mapped to a mode
  deterministically. **The inference is real; the label mapping is a
  placeholder — not diagnostic.**

`pipeline.ts` uses the ONNX model when a file exists at `./data/models/model.onnx`
(override with `WITNESS_ONNX_MODEL`), else falls back to the stub. The model is
git-ignored (14 MB); fetch it with:

```
mkdir -p data/models && curl -sL -o data/models/model.onnx \
  https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-7.onnx
```

To go diagnostic: train on failure-mode-labelled photos, export to ONNX, drop it
in, and delete the class-index mapping in `onnx-classifier.ts`.

## Verification

- `next build` — clean, TypeScript 0 errors, all 6 routes resolved.
- `scripts/smoke.mjs` against `next start` — POST 201, record read back, and
  `/console`, `/console/batches`, `/console/batches/[code]`,
  `/console/records/[id]` all return 200. **SMOKE PASS.**

### Dev-server note (Windows) — resolved

`next dev` on Turbopack reproducibly panics spawning the PostCSS/Tailwind worker
for `globals.css` — `0xc0000142` (STATUS_DLL_INIT_FAILED) — so page routes 500.
Fix: the `dev` script now runs `next dev --webpack`, which renders every page.
`dev:turbo` keeps the Turbopack path for when it's fixed; `build` and `start`
stay on Turbopack (unaffected).

## Delivered since the first slice

- Batch is a first-class entity (code, part family, produced-on, line, notes)
  with a create/edit form; ingest auto-creates the stub row, `/api/batches`
  upserts provenance.
- Record filtering/search — part family, minimum severity, free text over image
  name / failure mode / batch.
- Human review — the inspector confirms or overrides the failure mode + severity
  per record (`/api/records/[id]/review`, review form on detail). The review
  wins everywhere (tables, filters, detail); the model's output is kept as
  provenance. Each confirmed record is a `(model suggestion, human label)` pair —
  the training data that unblocks a real diagnostic model.

## Not yet built

- A trained, diagnostic model. The ONNX path is wired and runs, but with a
  generic ImageNet classifier — labels are placeholder-mapped, not real modes.
- Auth, multi-workstation sync, full marketing site.
