import Link from "next/link";
import type { CSSProperties } from "react";
import { SEVERITY, BEARING_MODES, GEAR_MODES, ATTRIBUTIONS } from "@/lib/iso";
import { SiteHeader, SiteFooter } from "@/components/public-shell";
import { BearingFigure, GearMeshFigure, WorkflowFigure } from "@/components/mechanical";
import { ExplodedBearing, SpecPlate, GaugeDial, TitleBlock } from "@/components/machinery";
import { ControlStrip } from "@/components/control-strip";

// Marketing regime: warm paper, ink, one gauge-teal accent. The console stays
// austere; this page is allowed to move.
//
// The page answers four questions in order, because that is the order a first
// visitor asks them: what is this for, how does it work, what does it know, and
// what do I get out of it.

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-ground text-paper">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Objectives />
        <Workflow />
        <Standards />
        <SeverityRamp />
        <Capabilities />
        <Close />
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-iron/15">
      <div className="blueprint-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="scan-line pointer-events-none" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
        <div className="reveal" style={stagger(0)}>
          <p className="font-mono text-2xs uppercase tracking-[0.28em] text-brass">
            ISO 15243 · ISO 10825 · multi-tenant · exportable
          </p>
          <h1 className="mt-5 max-w-2xl font-display text-4xl leading-[1.04] sm:text-5xl">
            Read the damage.
            <br />
            <span className="text-oxide">Name the cause.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-paper-2">
            A photograph of a returned gearbox part becomes a standards-linked
            failure record: the damage mode, the severity, the mechanism that
            caused it, and the batch it came from. The model suggests. The
            inspector decides. Every confirmation becomes training data.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/console"
              className="rounded-sm bg-oxide px-6 py-3 text-base font-medium text-on-accent transition-colors hover:bg-oxide-deep"
            >
              Open the console
            </Link>
            <Link
              href="/about"
              className="rounded-sm border border-iron/30 px-6 py-3 text-base text-paper transition-colors hover:border-oxide hover:text-oxide"
            >
              How it works
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-iron/15 pt-6">
            <Metric value={`${BEARING_MODES.length + GEAR_MODES.length}`} label="ISO failure modes" />
            <Metric value={`${ATTRIBUTIONS.length}`} label="Cause mechanisms" />
            <Metric value="5" label="Severity grades" />
          </dl>
        </div>

        <div className="reveal space-y-3" style={stagger(1)}>
          <div className="rounded-md border border-iron/20 bg-ground-2 p-4 shadow-[var(--shadow-raise)]">
            <BearingFigure className="w-full" />
          </div>
          <ControlStrip
            channels={[
              { key: "b", standard: "ISO 15243", readout: `${BEARING_MODES.length} MODES`, note: "Rolling-bearing damage classes" },
              { key: "g", standard: "ISO 10825", readout: `${GEAR_MODES.length} MODES`, note: "Gear-tooth wear and damage classes" },
              { key: "a", standard: "ISA-101", readout: "HMI", note: "High-performance display discipline" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-3xl tabular text-paper">{value}</dd>
      <p className="mt-1 text-2xs uppercase tracking-[0.14em] text-iron">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const OBJECTIVES = [
  {
    n: "01",
    title: "Make a failure traceable",
    body: "A returned part usually arrives with a photograph and nothing else. Witness turns that photograph into a record that cites a clause of a published standard, so the finding survives a warranty dispute.",
  },
  {
    n: "02",
    title: "Separate what from why",
    body: "The damage mode says what the surface shows. The attribution says why it got there. The same pit can mean end of life or a contaminant dent that seeded it early, and the batch-level action differs.",
  },
  {
    n: "03",
    title: "Turn inspection into data",
    body: "Every confirmed or corrected record is a (model, human) pair. The workspace accumulates a labelled set that belongs to the plant, and exports on demand as JSON.",
  },
];

function Objectives() {
  return (
    <Section
      kicker="Core objectives"
      title="Three things the system is built to do"
      lead="Witness is not a general defect detector. It is scoped to rotating equipment, to two published standards, and to the decision an inspector actually has to make."
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {OBJECTIVES.map((o, i) => (
          <li
            key={o.n}
            className="reveal lift rounded-md border border-iron/20 bg-ground-2 p-6"
            style={stagger(i)}
          >
            <span className="font-mono text-2xs tracking-[0.2em] text-oxide">{o.n}</span>
            <h3 className="mt-3 font-display text-xl">{o.title}</h3>
            <p className="mt-3 text-sm leading-6 text-paper-2">{o.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    n: "1",
    t: "Enrol",
    d: "Upload known-good reference photographs for each part family. This set defines what normal looks like for this workspace, not for the industry.",
  },
  {
    n: "2",
    t: "Intake",
    d: "The photograph is read for EXIF, scored for provenance, and hashed. A perceptual hash catches the same part submitted twice.",
  },
  {
    n: "3",
    t: "Detect",
    d: "Stage one asks one question: is this part abnormal against the reference set? A PatchCore-style memory bank answers it, and returns a heat map.",
  },
  {
    n: "4",
    t: "Classify",
    d: "Stage two asks a second question: which ISO mode is it? The choice is forced. The model must pick from the standard's own list, never invent a label.",
  },
  {
    n: "5",
    t: "Decide",
    d: "A confidence gate splits the traffic. High confidence files itself. Low confidence queues for an inspector, whose call is the authoritative one.",
  },
];

function Workflow() {
  return (
    <Section
      kicker="Workflow"
      title="Photograph in, reviewed finding out"
      lead="Each stage does one job and hands off. Nothing decides for itself past the confidence gate. That gate is the single place the system chooses whether a person is needed."
      tone="raised"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-md border border-iron/20 bg-ground-2 p-5 shadow-[var(--shadow-raise)]">
          <WorkflowFigure className="w-full" />
        </div>
        <div className="flex flex-col items-center justify-center rounded-md border border-iron/20 bg-ground-2 p-5 shadow-[var(--shadow-raise)]">
          <GaugeDial value={0.82} display="0.82" label="gate threshold" className="w-40" />
          <p className="mt-1 max-w-[13rem] text-center text-2xs leading-5 text-paper-2">
            Score above the threshold files itself. Below it queues for a person.
          </p>
        </div>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <li
            key={s.n}
            className="reveal lift rounded-md border border-iron/20 bg-ground-2 p-5"
            style={stagger(i)}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-oxide font-mono text-2xs text-on-accent">
                {s.n}
              </span>
              <h3 className="font-display text-lg">{s.t}</h3>
            </div>
            <p className="mt-2.5 text-sm leading-6 text-paper-2">{s.d}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 max-w-2xl border-l-2 border-brass/50 pl-4 font-editorial text-base italic leading-7 text-paper-2">
        The loop does not stop at the finding. A confirmed record links back to
        the batch that produced the part, so a repeated mode across one supplier
        becomes a fleet signal rather than a pile of separate complaints.
      </p>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

function Standards() {
  return (
    <Section
      kicker="What it knows"
      title="Two part families, two published standards"
      lead="Bearings and gears fail in different ways, and each has its own catalogue. Witness carries the standard's own numbering, so a finding traces back to the document rather than to a label somebody invented."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <figure className="reveal rounded-md border border-iron/20 bg-ground-2 p-5" style={stagger(0)}>
          <BearingFigure className="w-full" />
          <figcaption className="mt-3 border-t border-iron/15 pt-3">
            <h3 className="font-display text-lg">Rolling bearings · ISO 15243</h3>
            <p className="mt-1.5 text-sm leading-6 text-paper-2">
              Six primary damage classes, from rolling-contact fatigue to
              fracture and cracking. {BEARING_MODES.length} modes carry clause
              numbers such as{" "}
              <span className="tabular text-paper">5.1</span> and{" "}
              <span className="tabular text-paper">5.6</span>.
            </p>
          </figcaption>
        </figure>

        <figure className="reveal rounded-md border border-iron/20 bg-ground-2 p-5" style={stagger(1)}>
          <GearMeshFigure className="w-full" />
          <figcaption className="mt-3 border-t border-iron/15 pt-3">
            <h3 className="font-display text-lg">Gear teeth · ISO 10825</h3>
            <p className="mt-1.5 text-sm leading-6 text-paper-2">
              {GEAR_MODES.length} wear and damage classes covering the flank,
              the root and the mesh: wear, scuffing, contact fatigue, cracks
              and tooth fracture.
            </p>
          </figcaption>
        </figure>
      </div>

      <div className="mt-4 rounded-md border border-iron/20 bg-ground-2 p-6">
        <h3 className="font-display text-lg">The third axis: attribution</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-paper-2">
          A mode describes the surface. An attribution names the mechanism that
          put it there. Witness records both, because the fleet action depends on
          the second one.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {ATTRIBUTIONS.map((a) => (
            <li
              key={a.code}
              title={a.blurb}
              className="rounded-sm border border-iron/25 bg-ground px-3 py-1.5 text-sm text-paper-2 transition-colors hover:border-oxide hover:text-paper"
            >
              {a.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-iron/20 bg-ground-2">
        <div className="flex items-center justify-between border-b border-iron/15 px-5 py-3">
          <h3 className="font-display text-lg">Inside the part it reads</h3>
          <TitleBlock sheet="03" title="Bearing assembly" rev="B" scale="NTS" />
        </div>
        <div className="p-4">
          <ExplodedBearing className="w-full" />
        </div>
      </div>

      <div className="mt-4">
        <p className="font-mono text-2xs uppercase tracking-[0.28em] text-brass">Reference geometry</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <SpecPlate
            drawing="bolt"
            code="FIG. 4-A"
            title="Fastener"
            rows={[
              { k: "Thread", v: "M12 × 1.75" },
              { k: "Grade", v: "10.9" },
              { k: "Head", v: "hex, 19 A/F" },
              { k: "Torque", v: "86 N·m" },
            ]}
          />
          <SpecPlate
            drawing="shaft"
            code="FIG. 4-B"
            title="Shaft seat"
            rows={[
              { k: "Diameter", v: "Ø 20 h6" },
              { k: "Fit", v: "k5 interference" },
              { k: "Ra", v: "0.4 µm" },
              { k: "Runout", v: "0.010 mm" },
            ]}
          />
          <SpecPlate
            drawing="spring"
            code="FIG. 4-C"
            title="Preload spring"
            rows={[
              { k: "Free length", v: "84 mm" },
              { k: "Rate", v: "12 N/mm" },
              { k: "Wire", v: "Ø 2.5 mm" },
              { k: "Ends", v: "closed, ground" },
            ]}
          />
          <SpecPlate
            drawing="flange"
            code="FIG. 4-D"
            title="Housing flange"
            rows={[
              { k: "Bolt circle", v: "Ø 68 mm" },
              { k: "Holes", v: "6 × Ø 9" },
              { k: "Pilot", v: "Ø 36 H7" },
              { k: "Material", v: "EN-GJL-250" },
            ]}
          />
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

function SeverityRamp() {
  return (
    <Section
      kicker="Severity · ISA-101 discipline"
      title="Five grades, each tied to an action"
      lead="Severity never rides on colour alone. Every grade pairs a hue with a filling-disc glyph and a numeral, so the signal survives colour-vision deficiency, a greyscale print, and a washed-out bench display."
    >
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SEVERITY.map((s, i) => (
          <li
            key={s.level}
            className="reveal lift rounded-md border border-iron/20 bg-ground-2 px-4 py-4"
            style={{
              ...stagger(i),
              borderTop: `3px solid var(--color-sev-${s.level})`,
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-xl leading-none"
                style={{ color: `var(--color-sev-${s.level})` }}
                aria-hidden
              >
                {s.glyph}
              </span>
              <span className="font-mono text-xs tabular text-iron">{s.level}</span>
            </div>
            <h3 className="mt-2.5 font-display text-base">{s.label}</h3>
            <p className="mt-1 text-2xs leading-5 text-paper-2">{s.action}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

const CAPABILITIES = [
  {
    kicker: "Traceable",
    title: "Every record cites a clause",
    body: `Bearings map to ISO 15243 damage classes and gears to ISO 10825, ${BEARING_MODES.length + GEAR_MODES.length} modes carrying the standard's own numbering, so a finding traces back to the document.`,
  },
  {
    kicker: "Isolated",
    title: "One workspace cannot read another",
    body: "Postgres row-level security scopes every row to the signed-in tenant. Reference sets, findings and batches belong to the workspace that made them.",
  },
  {
    kicker: "Honest",
    title: "The gate is visible",
    body: "Confidence is shown, not hidden. A record that the model was unsure about is marked unconfirmed until a person confirms or corrects it.",
  },
  {
    kicker: "Provenanced",
    title: "Findings link to batches",
    body: "A part carries a batch code and a supplier. Link enough findings and a repeated mode stops being an anecdote and becomes a warranty case.",
  },
  {
    kicker: "Analytic",
    title: "The fleet cube",
    body: "Insights aggregates on three axes at once: ISO mode against severity against attribution, so a lubrication problem separates from a design problem.",
  },
  {
    kicker: "Portable",
    title: "The labels are yours",
    body: "Confirmed records export as JSON, with the model's suggestion and the human call side by side. That pairing is what trains the next model.",
  },
];

function Capabilities() {
  return (
    <Section
      kicker="Features"
      title="What you get once records start accumulating"
      lead="The first finding is useful. The hundredth is where the system earns its place: patterns across suppliers, batches and duty cycles become visible."
      tone="raised"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c, i) => (
          <article
            key={c.kicker}
            className="reveal lift rounded-md border border-iron/20 bg-ground-2 p-6"
            style={stagger(i)}
          >
            <div className="font-mono text-2xs uppercase tracking-[0.2em] text-brass">{c.kicker}</div>
            <h3 className="mt-2.5 font-display text-lg">{c.title}</h3>
            <p className="mt-2.5 text-sm leading-6 text-paper-2">{c.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

function Close() {
  return (
    <section className="border-t border-iron/15 bg-ground-2">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl">Start with one photograph</h2>
          <p className="mt-4 text-base leading-7 text-paper-2">
            Open the console and walk the loop end to end: enrol a reference set,
            score a part, accept or correct the ISO mode, then watch the finding
            appear in the fleet cube against its batch.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/console"
              className="rounded-sm bg-oxide px-6 py-3 font-medium text-on-accent transition-colors hover:bg-oxide-deep"
            >
              Open the console
            </Link>
            <Link
              href="/taxonomy"
              className="rounded-sm border border-iron/30 px-6 py-3 text-paper transition-colors hover:border-oxide hover:text-oxide"
            >
              Read the taxonomy
            </Link>
            <Link
              href="/model-card"
              className="rounded-sm border border-iron/30 px-6 py-3 text-paper transition-colors hover:border-oxide hover:text-oxide"
            >
              Read the model card
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Section({
  kicker,
  title,
  lead,
  children,
  tone = "plain",
}: {
  kicker: string;
  title: string;
  lead: string;
  children: React.ReactNode;
  tone?: "plain" | "raised";
}) {
  return (
    <section
      className={`border-b border-iron/15 ${tone === "raised" ? "bg-ground-2/60" : ""}`}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <header className="max-w-2xl">
          <p className="font-mono text-2xs uppercase tracking-[0.28em] text-brass">{kicker}</p>
          <h2 className="mt-3 font-display text-3xl">{title}</h2>
          <p className="mt-4 text-base leading-7 text-paper-2">{lead}</p>
        </header>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
