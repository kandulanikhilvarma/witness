"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { modesFor, SEVERITY, type PartFamily } from "@/lib/iso";

export function ReviewForm({
  id,
  partFamily,
  currentModeCode,
  currentSeverity,
}: {
  id: string;
  partFamily: PartFamily;
  currentModeCode: string;
  currentSeverity: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/records/${id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modeCode: String(fd.get("modeCode")),
          severity: Number(fd.get("severity")),
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status}).`);
      setOk(true);
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
        Failure mode
        <select
          name="modeCode"
          defaultValue={currentModeCode}
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
        >
          {modesFor(partFamily).map((m) => (
            <option key={m.code} value={m.code}>
              {m.code} · {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-2xs text-c-text-2">
        Severity
        <select
          name="severity"
          defaultValue={String(currentSeverity)}
          className="rounded-sm border border-c-line bg-c-surface-2 px-2 py-1.5 text-sm text-c-text"
        >
          {SEVERITY.map((s) => (
            <option key={s.level} value={s.level}>
              {s.level} · {s.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
      >
        {busy ? "Saving…" : "Confirm classification"}
      </button>
      {error && (
        <p className="w-full text-2xs text-sev-3" role="alert">
          {error}
        </p>
      )}
      {ok && !error && <p className="w-full text-2xs text-sev-0">Recorded.</p>}
    </form>
  );
}
