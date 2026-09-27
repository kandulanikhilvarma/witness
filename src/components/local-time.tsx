"use client";

import { useSyncExternalStore } from "react";

// Server components render in the server's timezone (UTC on Vercel), so a raw
// toLocaleString() there shows the wrong clock to everyone else. This renders
// the ISO timestamp on the server and the reader's local time after hydration.
const subscribe = () => () => {};

export function LocalTime({ iso, date = false }: { iso: string; date?: boolean }) {
  const local = useSyncExternalStore(
    subscribe,
    () => {
      const d = new Date(iso);
      return date ? d.toLocaleDateString() : d.toLocaleString();
    },
    () => null,
  );
  return (
    <time dateTime={iso} className="tabular">
      {local ?? iso.slice(0, date ? 10 : 16).replace("T", " ")}
    </time>
  );
}
