"use client";

import Link from "next/link";
import { useState } from "react";

interface Result {
  score: number;
  normalized: number;
  anomalous: boolean;
  threshold: number;
  heatmap: number[][];
}

interface Classification {
  id: string;
  routed: "auto" | "queued";
  reason?: string;
  result: {
    modeCode: string;
    modeLabel: string;
    severity: number;
    confidence: number;
    rationale: string;
    source: string;
  };
}

// A phone photo is 4 to 8 MB, and base64 grows it by a third, which is past
// Vercel's 4.5 MB request cap. Scoring works at 96 px and the vision model at
// 1024 px, so a 1600 px JPEG loses nothing either stage uses. Orientation is
// applied from EXIF by createImageBitmap.
async function toScoringDataUrl(file: File, edge = 1600): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, edge / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

// Score a candidate part against the trained reference set. The heatmap is the
// per-patch nearest-neighbour distance. Hot cells are where the subject looks
// least like anything the model saw as normal.
export function SubjectScorer({ enrolId }: { enrolId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [overlay, setOverlay] = useState(55);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // choosing the same file again still scores
    if (!file) return;
    setError(null);
    setResult(null);
    setClassification(null);
    setBusy(true);
    try {
      const dataUri = await toScoringDataUrl(file);
      setImage(dataUri);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enrolId, image: dataUri }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Score failed (${res.status}).`);
      setResult(body as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Score failed.");
    } finally {
      setBusy(false);
    }
  }

  async function classify() {
    if (!image || !result) return;
    setError(null);
    setClassifying(true);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enrolId, image, anomalyScore: result.normalized }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Classify failed (${res.status}).`);
      setClassification(body as Classification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classify failed.");
    } finally {
      setClassifying(false);
    }
  }

  const hot = result ? Math.max(...result.heatmap.flat()) || 1 : 1;

  return (
    <div className="rounded-sm border border-c-line bg-c-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm text-c-text">Score a subject</h3>
          <p className="text-2xs text-c-text-3">
            Test any photo against this reference set. Stage-1 anomaly only. The
            ISO call comes later.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="press cursor-pointer rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-on-accent transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-c-focus hover:bg-oxide-deep">
            {busy ? "Scoring…" : "Choose photo"}
            <input type="file" accept="image/*" onChange={onChange} disabled={busy} className="sr-only" />
          </label>
          {/* On a phone this opens the rear camera directly; on a desktop it
              behaves as a second file picker, so it is shown on small screens only. */}
          <label className="press cursor-pointer rounded-sm border border-c-line bg-c-surface-2 px-4 py-2 text-sm text-c-text focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-c-focus hover:border-c-focus sm:hidden">
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onChange}
              disabled={busy}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-2xs text-sev-3-ink" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_minmax(0,280px)]" aria-live="polite">
          <div>
            <div
              className={`font-display text-2xl tabular ${result.anomalous ? "text-sev-3-ink" : "text-sev-0-ink"}`}
            >
              {result.anomalous ? "Anomalous" : "Within normal"}
            </div>
            <p className="mt-1 text-2xs text-c-text-2">
              Distance <span className="tabular">{result.score.toFixed(2)}</span> ·{" "}
              <span className="tabular">{result.normalized.toFixed(2)}×</span> the flag
              threshold. Above 1.0× reads as anomalous.
            </p>
          </div>
          {/* The heatmap sits on the photo it was computed from. The scorer
              resizes the whole frame to a square grid, so each cell covers the
              same fraction of the photo in both axes. */}
          <figure className="m-0">
            <div className="relative overflow-hidden rounded-sm border border-c-line">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element -- a local data URI; next/image adds nothing here
                <img src={image} alt="Scored subject" className="block h-auto w-full" />
              )}
              <div
                className="heat-in absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${result.heatmap[0]?.length ?? 1}, 1fr)`,
                  opacity: overlay / 100,
                }}
                role="img"
                aria-label={`Anomaly heatmap. Hottest cell ${hot.toFixed(2)}.`}
              >
                {result.heatmap.flat().map((v, i) => (
                  <div
                    key={i}
                    title={v.toFixed(2)}
                    style={{
                      background: `color-mix(in oklab, var(--color-sev-4) ${Math.round((v / hot) * 100)}%, transparent)`,
                    }}
                  />
                ))}
              </div>
            </div>
            <label className="mt-2 flex items-center gap-2 text-2xs text-c-text-3">
              Heatmap
              <input
                type="range"
                min={0}
                max={100}
                value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
                className="flex-1 accent-[var(--color-c-focus)]"
              />
              <span className="w-8 text-right tabular">{overlay}%</span>
            </label>
          </figure>
        </div>
      )}

      {result && !classification && (
        <div className="mt-4 flex items-center gap-3 border-t border-c-line pt-4">
          <button
            type="button"
            onClick={classify}
            disabled={classifying}
            className="rounded-sm border border-c-line bg-c-surface-2 px-4 py-2 text-sm text-c-text hover:border-c-focus disabled:opacity-50"
          >
            {classifying ? "Classifying…" : "Classify to ISO mode"}
          </button>
          <span className="text-2xs text-c-text-3">
            Stage-2 forced-choice → the confidence gate files it or queues it for review.
          </span>
        </div>
      )}

      {classification && (
        <div className="mt-4 border-t border-c-line pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-c-text">
              <span className="tabular text-c-text-3">{classification.result.modeCode}</span>{" "}
              {classification.result.modeLabel}
            </span>
            <span
              className={`rounded-sm border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wide ${
                classification.routed === "auto"
                  ? "border-sev-0/40 bg-sev-0-bg text-sev-0-ink"
                  : "border-sev-1/40 bg-sev-1-bg text-sev-1-ink"
              }`}
            >
              {classification.routed === "auto" ? "auto-filed" : "queued for review"}
            </span>
          </div>
          <p className="mt-1 text-2xs text-c-text-2">
            severity {classification.result.severity} · confidence{" "}
            <span className="tabular">{classification.result.confidence.toFixed(2)}</span> ·{" "}
            {classification.result.source}
          </p>
          {classification.reason && (
            <p className="mt-1 text-2xs text-c-text-2">Routed because {classification.reason}.</p>
          )}
          <p className="mt-1 text-2xs text-c-text-3">{classification.result.rationale}</p>
          {classification.routed === "queued" && (
            <Link href="/console/review" className="mt-2 inline-block text-2xs text-c-focus hover:underline">
              Open review queue →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
