"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Console rail links. Client-side only so the current section carries
// aria-current and a visible mark. A section stays active on its detail pages
// (/console/batches/X keeps Batches lit); Records is exact-match because every
// other section sits under /console.
export function ConsoleNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Console"
      className="flex gap-0.5 overflow-x-auto px-3 pb-3 text-sm md:flex-col md:overflow-visible md:p-3"
    >
      {items.map((n) => {
        const active =
          n.href === "/console"
            ? pathname === "/console" || pathname.startsWith("/console/records") || pathname.startsWith("/console/findings")
            : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-sm px-3 py-2 transition-colors ${
              active
                ? "bg-c-surface-2 font-medium text-c-text shadow-[inset_0_0_0_1px_var(--color-c-line)]"
                : "text-c-text-2 hover:bg-c-surface-2 hover:text-c-text"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
