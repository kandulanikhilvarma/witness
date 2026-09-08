import Link from "next/link";

// Marketing regime: Foundry. Warm ground, oxide accent carries the brand.
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col bg-ground text-paper">
      <div className="blueprint-grid pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="font-display text-lg font-bold tracking-tight">Witness</span>
        <Link
          href="/console"
          className="rounded-full border border-iron/50 px-4 py-1.5 text-sm text-paper-2 hover:border-oxide hover:text-paper"
        >
          Open console
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-24">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-brass">
          ISO 15243 · ISO 10825
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl leading-[1.05] text-paper">
          Read the damage. Name the cause.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-paper-2">
          Defect intelligence for rotating equipment. A photograph of a returned
          gearbox part becomes a standards-linked failure record — the mode, the
          severity, and the batch that produced it.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/console"
            className="rounded-full bg-oxide px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-oxide-deep"
          >
            Open the console
          </Link>
        </div>
        <p className="mt-10 max-w-xl border-l-2 border-brass/40 pl-4 text-sm text-iron">
          Local-first. Records persist on the workstation; nothing is uploaded to
          a server.
        </p>
      </main>
    </div>
  );
}
