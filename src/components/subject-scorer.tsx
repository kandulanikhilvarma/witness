"use client";

import { useState } from "react";

interface Result {
  score: number;
  normalized: number;
  anomalous: boolean;
  threshold: number;
  heatmap: number[][];
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

// Score a candidate part against the trained reference set. The heatmap is the
// per-patch nearest-neighbour distance — hot cells are where the subject looks
// least like anything the model saw as normal.
export function SubjectScorer({ enrolId }: { enrolId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const image = await readAsDataUrl(file);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enrolId, image }),
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

  const hot = result ? Math.max(...result.heatmap.flat()) || 1 : 1;

  return (
    <div className="rounded-sm border border-c-line bg-c-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm text-c-text">Score a subject</h3>
          <p className="text-2xs text-c-text-3">
            Test any photo against this reference set. Stage-1 anomaly only — the
            ISO call comes later.
          </p>
        </div>
        <label className="cursor-pointer rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-paper">
          {busy ? "Scoring…" : "Choose photo"}
          <input type="file" accept="image/*" onChange={onChange} disabled={busy} className="hidden" />
        </label>
      </div>

      {error && (
        <p className="mt-2 text-2xs text-sev-3" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div
              className={`font-display text-2xl tabular ${result.anomalous ? "text-sev-3" : "text-sev-0"}`}
            >
              {result.anomalous ? "Anomalous" : "Within normal"}
            </div>
            <p className="mt-1 text-2xs text-c-text-2">
              Distance <span className="tabular">{result.score.toFixed(2)}</span> ·{" "}
              <span className="tabular">{result.normalized.toFixed(2)}×</span> the flag
              threshold. Above 1.0× reads as anomalous.
            </p>
          </div>
          <div
            className="grid gap-px rounded-sm border border-c-line p-1"
            style={{ gridTemplateColumns: `repeat(${result.heatmap.length}, 12px)` }}
            aria-label="anomaly heatmap"
          >
            {result.heatmap.flat().map((v, i) => (
              <div
                key={i}
                title={v.toFixed(2)}
                className="h-3 w-3 rounded-[1px]"
                style={{ background: `color-mix(in oklab, var(--color-sev-4) ${Math.round((v / hot) * 100)}%, var(--color-c-surface-2))` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
