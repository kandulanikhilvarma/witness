import type { Metadata } from "next";

// The sign-in page is disallowed in robots.txt; this is the second guard, for
// crawlers that reach it from a link rather than from the crawl frontier.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
