import Link from "next/link";
import { SEVERITY, BEARING_MODES, GEAR_MODES } from "@/lib/iso";

// Marketing regime: Foundry. Warm ground, oxide accent carries the brand. The
// console stays austere; this page is allowed to move.
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-ground text-paper">
      <div className="blueprint-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="scan-line pointer-events-none" aria-hidden />
      <div
        className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-oxide), transparent 70%)" }}
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <span className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-oxide" aria-hidden />
          Witness
        </span>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/taxonomy" className="rounded-full px-3 py-1.5 text-paper-2 transition-colors hover:text-paper">
            Taxonomy
          </Link>
          <Link href="/transparency" className="rounded-full px-3 py-1.5 text-paper-2 transition-colors hover:text-paper">
            Transparency
          </Link>
          <Link href="/model-card" className="rounded-full px-3 py-1.5 text-paper-2 transition-colors hover:text-paper">
            Model card
          </Link>
          <Link
            href="/console"
            className="ml-1 rounded-full border border-iron/50 px-4 py-1.5 text-paper-2 transition-colors hover:border-oxide hover:text-paper"
          >
            Open console →
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-8 pb-24">
        <section className="pt-20">
          <p className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">
            ISO 15243 · ISO 10825 · local-first
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.02] text-paper">
            Read the damage.
            <br />
            <span className="text-oxide">Name the cause.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-paper-2">
            A photograph of a returned gearbox part becomes a standards-linked
            failure record — the mode, the severity, and the batch that produced
            it. The model suggests; the inspector decides; every confirmation is
            training data.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/console"
              className="rounded-full bg-oxide px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-oxide-deep"
            >
              Open the console
            </Link>
            <Link
              href="/transparency"
              className="rounded-full border border-iron/40 px-6 py-3 text-base text-paper-2 transition-colors hover:border-brass hover:text-paper"
            >
              How it works
            </Link>
          </div>
        </section>

        <Pipeline />

        <section className="mt-20">
          <h2 className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">
            Severity ramp — ISA-101 discipline
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
            {SEVERITY.map((s) => (
              <div
                key={s.level}
                className="rounded-sm border border-iron/20 bg-ground-2/60 px-3 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-lg leading-none"
                    style={{ color: `var(--color-sev-${s.level})` }}
                    aria-hidden
                  >
                    {s.glyph}
                  </span>
                  <span className="font-mono text-xs text-paper-2">{s.level}</span>
                </div>
                <div className="mt-2 font-display text-sm text-paper">{s.label}</div>
                <div className="mt-0.5 text-2xs text-iron">{s.action}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          <Card
            kicker="Traceable"
            title="Every record cites a clause"
            body={`Bearings map to ISO 15243 damage classes, gears to ISO 10825 — ${BEARING_MODES.length + GEAR_MODES.length} modes carrying the standard's own numbering, so a finding traces back to the document.`}
          />
          <Card
            kicker="Private"
            title="Nothing leaves the bench"
            body="Postgres runs in-process via PGlite, persisted to the workstation. No server to provision, no photograph uploaded to a cloud the plant does not control."
          />
          <Card
            kicker="Self-improving"
            title="Human label is the signal"
            body="A real ONNX inference path is wired; labels are a placeholder until trained. Each confirmed record is a (model, human) pair — the export that unblocks a diagnostic model."
          />
        </section>

        <p className="mt-16 max-w-xl border-l-2 border-brass/40 pl-4 text-sm text-iron">
          This deployment seeds demo records so the console is populated on first
          open. A local install keeps its own data on disk.
        </p>
      </main>
    </div>
  );
}

// The ingest chain as a diagram — the same five stages pipeline.ts runs, with a
// pulse travelling the path so the page reads as a live system.
function Pipeline() {
  const stages = [
    { t: "Photo", s: "multipart" },
    { t: "EXIF + features", s: "exifr · sharp" },
    { t: "Classifier", s: "onnx / stub" },
    { t: "Record", s: "zod" },
    { t: "PGlite", s: "persisted" },
  ];
  return (
    <section className="mt-16 rounded-lg border border-iron/20 bg-ground-2/50 p-6">
      <svg viewBox="0 0 1000 120" className="w-full" role="img" aria-label="Ingest pipeline">
        <line
          x1="60" y1="60" x2="940" y2="60"
          stroke="var(--color-iron)" strokeWidth="1" opacity="0.3"
        />
        <line
          x1="60" y1="60" x2="940" y2="60"
          className="flow-path" stroke="var(--color-oxide)" strokeWidth="2"
        />
        {stages.map((st, i) => {
          const x = 60 + i * (880 / (stages.length - 1));
          return (
            <g key={st.t}>
              <circle
                cx={x} cy="60" r="7"
                className="flow-node"
                fill="var(--color-oxide)"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
              <circle cx={x} cy="60" r="13" fill="none" stroke="var(--color-iron)" strokeWidth="1" opacity="0.4" />
              <text x={x} y="30" textAnchor="middle" fontSize="15" fill="var(--color-paper)" fontFamily="var(--font-display)">
                {st.t}
              </text>
              <text x={x} y="98" textAnchor="middle" fontSize="11" fill="var(--color-iron)" fontFamily="var(--font-mono)">
                {st.s}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function Card({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-iron/20 bg-ground-2/50 p-5 transition-colors hover:border-brass/50">
      <div className="font-mono text-2xs uppercase tracking-[0.2em] text-brass">{kicker}</div>
      <h3 className="mt-2 font-display text-lg text-paper">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-paper-2">{body}</p>
    </div>
  );
}
