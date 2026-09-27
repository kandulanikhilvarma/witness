"use client";

import Link from "next/link";
import { useEffect } from "react";

// Console error boundary. Renders inside the console rail, so the inspector
// keeps their navigation when one view fails (a Supabase hiccup, a paused
// project, a network drop).
export default function ConsoleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <div className="rounded-sm border border-sev-3/40 bg-sev-3-bg p-5" role="alert">
        <h1 className="text-lg text-sev-3-ink">This view could not load</h1>
        <p className="mt-2 text-sm text-c-text-2">
          The data behind it did not answer. Your records are unchanged. Try again, or pick another
          section from the rail.
          {error.digest && (
            <>
              {" "}
              Reference <span className="tabular text-c-text">{error.digest}</span>.
            </>
          )}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-sm bg-c-focus px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-oxide-deep"
          >
            Try again
          </button>
          <Link
            href="/console"
            className="rounded-sm border border-c-line bg-c-surface px-4 py-2 text-sm text-c-text hover:border-c-focus"
          >
            Records
          </Link>
        </div>
      </div>
    </div>
  );
}
