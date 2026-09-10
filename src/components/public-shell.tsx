import Link from "next/link";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/taxonomy", label: "Taxonomy" },
  { href: "/transparency", label: "Transparency" },
  { href: "/model-card", label: "Model card" },
];

/**
 * The wordmark. A ring with a single marked rolling element — the part the
 * product looks at, reduced to the smallest drawing that still reads as a
 * bearing at 20 px.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="4.15" r="2.1" fill="var(--color-oxide)" />
      </svg>
      Witness
    </span>
  );
}

/**
 * Shared chrome for the public, unauthenticated pages. Warm paper ground, ink
 * text, one accent — the marketing regime, not the austere console.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-iron/15 bg-ground/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3.5 sm:px-8">
        <Link href="/" className="text-paper transition-colors hover:text-oxide">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-0.5 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-sm px-3 py-1.5 text-paper-2 transition-colors hover:bg-iron/10 hover:text-paper"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/console"
            className="ml-2 rounded-sm bg-oxide px-4 py-2 font-medium text-on-accent transition-colors hover:bg-oxide-deep"
          >
            Open console
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-iron/15 bg-ground-2">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark className="text-paper" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-paper-2">
            Defect intelligence for rotating equipment. The model suggests. The
            inspector decides. Every confirmation becomes training data.
          </p>
        </div>
        <div>
          <h2 className="font-mono text-2xs uppercase tracking-[0.2em] text-brass">Reference</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rule-link text-paper-2 transition-colors hover:text-paper">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-mono text-2xs uppercase tracking-[0.2em] text-brass">Standards</h2>
          <ul className="mt-3 space-y-2 text-sm text-paper-2">
            <li>
              <span className="tabular text-paper">ISO 15243</span> — rolling bearings
            </li>
            <li>
              <span className="tabular text-paper">ISO 10825</span> — gear teeth
            </li>
            <li>
              <span className="tabular text-paper">ISA-101</span> — console display
            </li>
            <li>
              <span className="tabular text-paper">WCAG 2.2 AA</span> — contrast and focus
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-iron/15">
        <p className="mx-auto w-full max-w-6xl px-6 py-4 text-2xs text-iron sm:px-8">
          Witness · records stay in the workspace that made them · built by
          Nikhilvarma Kandula
        </p>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-ground text-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-24 pt-10 sm:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
