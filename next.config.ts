import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native (sharp) and WASM (pglite) packages must load at runtime via Node's
  // resolver, not be traced into the server bundle by Turbopack.
  serverExternalPackages: ["sharp", "@electric-sql/pglite", "onnxruntime-node"],
  // A package-lock.json in a parent dir made Turbopack root outside the repo.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
