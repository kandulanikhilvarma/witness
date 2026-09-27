import type { NextConfig } from "next";

// Baseline hardening on every response. The CSP here is the part that needs no
// per-request nonce: no framing (clickjacking), no plugins, no <base> hijack,
// forms post only to this origin. A full script-src policy would need nonces,
// which would force every page to render dynamically; not worth it for a site
// with no third-party scripts.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Native (sharp) and WASM (pglite) packages must load at runtime via Node's
  // resolver, not be traced into the server bundle by Turbopack.
  serverExternalPackages: ["sharp", "@electric-sql/pglite", "onnxruntime-node"],
  // A package-lock.json in a parent dir made Turbopack root outside the repo.
  turbopack: { root: import.meta.dirname },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
