import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export const metadata = { title: "Not found", robots: { index: false } };

export default function NotFound() {
  return (
    <PublicShell>
      <p className="font-mono text-2xs uppercase tracking-[0.28em] text-brass">404</p>
      <h1 className="mt-3 font-display text-4xl">No record at this address</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-paper-2">
        The page moved, or the link was mistyped. A finding that belongs to another workspace also
        answers here: row-level security does not confirm that it exists.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-sm bg-oxide px-5 py-2.5 font-medium text-on-accent transition-colors hover:bg-oxide-deep"
        >
          Back to the start
        </Link>
        <Link
          href="/console"
          className="rounded-sm border border-iron/30 px-5 py-2.5 text-paper transition-colors hover:border-oxide hover:text-oxide"
        >
          Open the console
        </Link>
      </div>
    </PublicShell>
  );
}
