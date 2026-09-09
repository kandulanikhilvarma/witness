"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Result {
  provenance: { score: number };
  duplicate: boolean;
  nearest: { distance: number; image_name: string | null } | null;
}

export function IntakeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST", body: new FormData(e.currentTarget) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Upload failed (${res.status}).`);
      setResult(body as Result);
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3 rounded-sm border border-c-line bg-c-surface p-4"
      >
        <label className="flex flex-col gap-1 text-2xs text-c-text-2">
          Channel
          <select
            name="channel"
            defaultValue="portal"
            className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
          >
            <option value="portal">Portal upload</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-2xs text-c-text-2">
          Photograph
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="text-sm text-c-text-2 file:mr-3 file:rounded-sm file:border file:border-c-line file:bg-c-surface-2 file:px-3 file:py-1.5 file:text-c-text"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
        >
          {busy ? "Reading…" : "Ingest photo"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-2xs text-sev-3" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-2 text-2xs text-c-text-2">
          Ingested · provenance {result.provenance.score}/100.{" "}
          {result.duplicate ? (
            <span className="text-sev-2">
              Near-duplicate of {result.nearest?.image_name ?? "an existing photo"} (
              {result.nearest?.distance} bits apart).
            </span>
          ) : (
            <span className="text-sev-0">No duplicate found.</span>
          )}
        </p>
      )}
    </div>
  );
}
