"use client";

import Link from "next/link";
import { useEffect } from "react";

// Public-page error boundary. Production hides the message (Next strips it);
// the digest ties what the reader sees to the server log line.
export default function PublicError({
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
    <div className="mx-auto flex min-h-full max-w-xl flex-1 flex-col justify-center px-6 py-24 text-paper">
      <p className="font-mono text-2xs uppercase tracking-[0.28em] text-brass">Fault</p>
      <h1 className="mt-3 font-display text-3xl">This page did not load</h1>
      <p className="mt-4 text-base leading-7 text-paper-2">
        Something failed on our side. Trying again usually clears it.
        {error.digest && (
          <>
            {" "}
            Reference <span className="tabular text-paper">{error.digest}</span>.
          </>
        )}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-sm bg-oxide px-5 py-2.5 font-medium text-on-accent transition-colors hover:bg-oxide-deep"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-sm border border-iron/30 px-5 py-2.5 text-paper transition-colors hover:border-oxide hover:text-oxide"
        >
          Back to the start
        </Link>
      </div>
    </div>
  );
}
