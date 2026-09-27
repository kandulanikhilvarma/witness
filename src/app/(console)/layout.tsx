import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase/config";
import { ConsoleNav } from "@/components/console-nav";

// Console regime: ISA-101. Low-saturation ground, saturated colour reserved for
// abnormal state. Oxide (--color-c-focus) appears only on the focus ring and
// the single primary action, never as decoration.
//
// Below md the rail folds into a top bar with a horizontally scrolling nav, so
// a phone at the bench gets the full width for the records.
const NAV = supabaseConfigured
  ? [
      { href: "/console", label: "Records" },
      { href: "/console/intake", label: "Intake" },
      { href: "/console/enrol", label: "Enrol" },
      { href: "/console/review", label: "Review" },
      { href: "/console/cases", label: "Cases" },
      { href: "/console/insights", label: "Insights" },
      { href: "/console/batches", label: "Batches" },
    ]
  : [
      { href: "/console", label: "Records" },
      { href: "/console/batches", label: "Batches" },
    ];

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="console flex min-h-full flex-1 flex-col bg-c-ground text-c-text md:flex-row">
      <a
        href="#console-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-c-focus focus:px-4 focus:py-2 focus:text-sm focus:text-on-accent"
      >
        Skip to content
      </a>
      <aside className="flex shrink-0 flex-col border-b border-c-line bg-c-surface md:w-[var(--rail-w)] md:border-b-0 md:border-r">
        <div className="px-5 py-4 md:border-b md:border-c-line">
          <Link href="/" className="font-display text-lg tracking-tight">
            Witness
          </Link>
          <p className="mt-0.5 text-2xs text-c-text-3">Defect intelligence</p>
        </div>
        <ConsoleNav items={NAV} />
        <div className="mt-auto hidden border-t border-c-line px-5 py-3 text-2xs text-c-text-3 md:block">
          {supabaseConfigured
            ? "Workspace data is isolated by row-level security"
            : "Local demo · records stay in this process"}
        </div>
      </aside>
      <main id="console-main" className="min-w-0 flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
