"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

interface Result {
  provenance: { score: number };
  duplicate: boolean;
  nearest: { distance: number; image_name: string | null } | null;
}

const MAX_BYTES = 10 * 1024 * 1024; // the bucket's own limit
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "image/tiff": "tiff",
};

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The original goes from the browser straight into the tenant's folder of the
// private bucket, so a full-size phone photo never meets Vercel's 4.5 MB
// function body cap; the ingest route then reads it back by path. Returns the
// object path, or null when storage is unavailable (for example before the
// bucket migration), in which case the caller falls back to a plain upload.
async function uploadOriginal(file: File, tenantId: string): Promise<string | null> {
  const ext = EXT[file.type];
  if (!ext) return null;
  const path = `${tenantId}/${await sha256Hex(file)}.${ext}`;
  const { error } = await supabaseBrowser()
    .storage.from("witness-originals")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (!error || /exists/i.test(error.message)) return path;
  console.warn("[intake] direct upload unavailable, falling back:", error.message);
  return null;
}

export function IntakeForm({ enrolmentId, tenantId }: { enrolmentId?: string; tenantId?: string } = {}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Read the form now: React clears currentTarget once the handler yields.
    const form = e.currentTarget;
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const fd = new FormData(form);
      const file = fd.get("file");
      if (!(file instanceof File) || file.size === 0) throw new Error("Choose a photo first.");
      if (file.size > MAX_BYTES) throw new Error("That photo is over 10 MB.");

      const path = tenantId ? await uploadOriginal(file, tenantId) : null;
      const res = path
        ? await fetch("/api/ingest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              path,
              filename: file.name,
              channel: fd.get("channel") ?? "portal",
              enrolment_id: fd.get("enrolment_id") ?? null,
            }),
          })
        : await fetch("/api/ingest", { method: "POST", body: fd });
      // Only the multipart fallback can hit Vercel's 4.5 MB request cap.
      if (res.status === 413) throw new Error("That photo is over the 4.5 MB upload limit. Export it at a smaller size and try again.");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Upload failed (${res.status}).`);
      setResult(body as Result);
      form.reset();
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
        {enrolmentId ? (
          <input type="hidden" name="enrolment_id" value={enrolmentId} />
        ) : (
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
        )}
        <label className="flex flex-col gap-1 text-2xs text-c-text-2">
          {enrolmentId ? "Reference photo" : "Photograph"}
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
          {busy ? "Reading…" : enrolmentId ? "Add reference" : "Ingest photo"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-2xs text-sev-3-ink" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-2 text-2xs text-c-text-2">
          Ingested · provenance {result.provenance.score}/100.{" "}
          {result.duplicate ? (
            <span className="text-sev-2-ink">
              Near-duplicate of {result.nearest?.image_name ?? "an existing photo"} (
              {result.nearest?.distance} bits apart).
            </span>
          ) : (
            <span className="text-sev-0-ink">No duplicate found.</span>
          )}
        </p>
      )}
    </div>
  );
}
