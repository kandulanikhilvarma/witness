// One-line outcome banner for server-action pages that redirect back with
// ?saved= or ?error=. Status for success (announced politely), alert for
// failure (announced at once).
export function Notice({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "err" ? "alert" : "status"}
      className={`mb-4 rounded-sm border px-4 py-2.5 text-sm ${
        tone === "err"
          ? "border-sev-3/40 bg-sev-3-bg text-sev-3-ink"
          : "border-sev-0/40 bg-sev-0-bg text-sev-0-ink"
      }`}
    >
      {children}
    </p>
  );
}
