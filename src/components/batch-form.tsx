"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface BatchInitial {
  code: string;
  partFamily: string | null;
  producedOn: string | null;
  line: string | null;
  notes: string | null;
}

export function BatchForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: BatchInitial;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      code: String(fd.get("code") ?? ""),
      partFamily: (fd.get("partFamily") as string) || null,
      producedOn: (fd.get("producedOn") as string) || null,
      line: (fd.get("line") as string) || null,
      notes: (fd.get("notes") as string) || null,
    };
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status}).`);
      if (mode === "create") e.currentTarget.reset();
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
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
        Batch code
        <input
          name="code"
          required
          defaultValue={initial?.code ?? ""}
          readOnly={mode === "edit"}
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text read-only:text-c-text-3"
        />
      </label>
      <label className="flex flex-col gap-1 text-2xs text-c-text-2">
        Part family
        <select
          name="partFamily"
          defaultValue={initial?.partFamily ?? ""}
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
        >
          <option value="">—</option>
          <option value="bearing">Bearing</option>
          <option value="gear">Gear</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-2xs text-c-text-2">
        Produced on
        <input
          type="date"
          name="producedOn"
          defaultValue={initial?.producedOn ?? ""}
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-2xs text-c-text-2">
        Line
        <input
          name="line"
          defaultValue={initial?.line ?? ""}
          placeholder="optional"
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-2xs text-c-text-2">
        Notes
        <input
          name="notes"
          defaultValue={initial?.notes ?? ""}
          placeholder="optional"
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text placeholder:text-c-text-3"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : mode === "create" ? "Add batch" : "Save"}
      </button>
      {error && (
        <p className="w-full text-2xs text-sev-3" role="alert">
          {error}
        </p>
      )}
      {saved && !error && <p className="w-full text-2xs text-sev-0">Saved.</p>}
    </form>
  );
}
