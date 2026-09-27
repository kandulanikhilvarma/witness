"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IngestForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Read the form now: React clears currentTarget once the handler yields.
    const form = e.currentTarget;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        body: new FormData(form),
      });
      // ponytail: Vercel rejects request bodies over 4.5 MB before our route
      // runs, so a full-size phone original cannot pass through a function.
      // Upgrade path: a signed upload URL straight to the witness-originals
      // bucket, then POST only the object path here.
      if (res.status === 413) throw new Error("That photo is over the 4.5 MB upload limit. Export it at a smaller size and try again.");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Upload failed (${res.status}).`);
      }
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-sm border border-c-line bg-c-surface p-4"
    >
      <label className="flex flex-col gap-1 text-2xs text-c-text-2">
        Part family
        <select
          name="partFamily"
          defaultValue="bearing"
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
        >
          <option value="bearing">Bearing (ISO 15243)</option>
          <option value="gear">Gear (ISO 10825)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-2xs text-c-text-2">
        Batch code
        <input
          name="batchCode"
          placeholder="optional"
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3"
        />
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
        className="rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-oxide-deep disabled:opacity-50"
      >
        {busy ? "Analysing…" : "Analyse part"}
      </button>

      {error && (
        <p className="w-full text-2xs text-sev-3-ink" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
