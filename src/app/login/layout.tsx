import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

// The sign-in page is disallowed in robots.txt; this is the second guard, for
// crawlers that reach it from a link rather than from the crawl frontier.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// Wrapped in the public shell so sign-in is never a dead end: the header,
// the nav and the way back stay on screen.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
