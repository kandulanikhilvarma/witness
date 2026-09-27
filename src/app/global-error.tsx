"use client";

// Last-resort boundary: replaces the root layout, so it carries its own
// document and inline styles (globals.css and next/font do not reach it).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6f2ea",
          color: "#1d1b17",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>Witness · fault</title>
        <main style={{ maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 32, margin: 0 }}>
            Witness could not start this page
          </h1>
          <p style={{ color: "#544e45", lineHeight: 1.6 }}>
            Something failed before the page could draw.
            {error.digest ? ` Reference ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#0e6e78",
              color: "#fff",
              border: 0,
              borderRadius: 2,
              padding: "10px 20px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
