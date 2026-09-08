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

## Classifier — stub, not a model

`StubClassifier` (`stub-heuristic-v1`) is a deterministic heuristic over the
feature vector, **not trained**. It exists so the whole chain runs before a real
model lands. To swap in real inference: implement the `Classifier` interface
with `onnxruntime-node`, drop the `.onnx` file, point `pipeline.ts` at it —
nothing else changes. `onnxruntime-node` is installed but imported nowhere yet.

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

## Not yet built

- Real ONNX model + inference (classifier is still `stub-heuristic-v1`).
- Auth, multi-workstation sync, full marketing site.
