"use client";

import { useFormStatus } from "react-dom";

// The primary action of a server-action form. Shows it is working while the
// action runs, so a slow save is never mistaken for a dead button.
export function SubmitButton({
  children,
  pending,
  size = "md",
}: {
  children: React.ReactNode;
  pending: string;
  size?: "sm" | "md";
}) {
  const status = useFormStatus();
  const pad = size === "sm" ? "px-3 py-1.5 text-2xs" : "px-4 py-2 text-sm";
  return (
    <button
      type="submit"
      disabled={status.pending}
      aria-busy={status.pending}
      className={`rounded-sm bg-c-focus ${pad} font-medium text-on-accent transition-colors hover:bg-oxide-deep disabled:opacity-60`}
    >
      {status.pending ? pending : children}
    </button>
  );
}
