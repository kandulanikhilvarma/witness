import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase/config";

// Console regime: ISA-101. Low-saturation ground, saturated colour reserved for
// abnormal state. Oxide (--color-c-focus) appears only on the focus ring and
// the single primary action, never as decoration.
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full bg-c-ground text-c-text">
      <aside
        className="flex flex-col border-r border-c-line bg-c-surface"
        style={{ width: "var(--rail-w)" }}
      >
        <div className="border-b border-c-line px-5 py-4">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            Witness
          </Link>
          <p className="mt-0.5 text-2xs text-c-text-3">Defect intelligence</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 text-sm">
          <Link
            href="/console"
            className="rounded-sm px-3 py-2 text-c-text-2 hover:bg-c-surface-2 hover:text-c-text"
          >
            Records
          </Link>
          {supabaseConfigured && (
            <Link
              href="/console/intake"
              className="rounded-sm px-3 py-2 text-c-text-2 hover:bg-c-surface-2 hover:text-c-text"
            >
              Intake
            </Link>
          )}
          {supabaseConfigured && (
            <Link
              href="/console/insights"
              className="rounded-sm px-3 py-2 text-c-text-2 hover:bg-c-surface-2 hover:text-c-text"
            >
              Insights
            </Link>
          )}
          <Link
            href="/console/batches"
            className="rounded-sm px-3 py-2 text-c-text-2 hover:bg-c-surface-2 hover:text-c-text"
          >
            Batches
          </Link>
        </nav>
        <div className="mt-auto border-t border-c-line px-5 py-3 text-2xs text-c-text-3">
          Local-first · records never leave this workstation
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
