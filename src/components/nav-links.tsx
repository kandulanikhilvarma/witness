"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV } from "@/components/nav";

/**
 * Public nav items. Client-side only so the current page can carry
 * aria-current and a visible active mark. Targets are >=44px tall.
 */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.map((n) => {
        const active = pathname === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[44px] items-center rounded-sm px-3 py-2 transition-colors ${
              active
                ? "bg-iron/10 text-paper"
                : "text-paper-2 hover:bg-iron/10 hover:text-paper"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Small-screen nav. A disclosure button that reveals the links and the console
 * action. Closes on selection and on Escape.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-paper hover:bg-iron/10"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {open && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full border-b border-iron/15 bg-ground/95 px-6 pb-4 pt-2 backdrop-blur"
        >
          <nav className="flex flex-col gap-0.5 text-sm">
            <NavLinks onNavigate={() => setOpen(false)} />
            <Link
              href="/console"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-[44px] items-center justify-center rounded-sm bg-oxide px-4 font-medium text-on-accent hover:bg-oxide-deep"
            >
              Open console
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
