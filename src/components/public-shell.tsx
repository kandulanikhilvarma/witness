import Link from "next/link";

const NAV = [
  { href: "/taxonomy", label: "Taxonomy" },
  { href: "/transparency", label: "Transparency" },
  { href: "/model-card", label: "Model card" },
];

// Shared chrome for the public, unauthenticated pages. Foundry palette — the
// marketing regime, not the austere console.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-ground text-paper">
      <div className="blueprint-grid pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-8 py-5">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-oxide" aria-hidden />
          Witness
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-1.5 text-paper-2 transition-colors hover:text-paper"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/console"
            className="ml-1 rounded-full border border-iron/50 px-4 py-1.5 text-paper-2 transition-colors hover:border-oxide hover:text-paper"
          >
            Console →
          </Link>
        </nav>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-8 pb-24 pt-6">{children}</main>
      <footer className="relative z-10 border-t border-iron/20 px-8 py-6 text-2xs text-paper-2">
        Witness · defect intelligence for rotating equipment · ISO 15243 &amp; ISO 10825.
        The model suggests; the inspector decides.
      </footer>
    </div>
  );
}
