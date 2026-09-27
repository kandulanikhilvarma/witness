import type { Instrumentation } from "next";

// Every server error as one JSON line. Vercel's log view and any log drain can
// filter on `evt` and group by `digest`, the same reference the error pages
// show the reader, so a user's "Reference abc123" leads straight to its line.
// Headers are left out on purpose: they carry session cookies.
// ponytail: stdout JSON only. Point a Vercel log drain or Sentry at it when
// someone has to be paged.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const e = err instanceof Error ? err : null;
  console.error(
    JSON.stringify({
      evt: "server_error",
      at: new Date().toISOString(),
      digest: typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined,
      message: e?.message ?? String(err),
      stack: e?.stack?.split("\n").slice(0, 6).join("\n"),
      method: request.method,
      path: request.path.split("?")[0],
      route: context.routePath,
      kind: context.routeType,
    }),
  );
};
