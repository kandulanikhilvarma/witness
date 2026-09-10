import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PublicShell } from "@/components/public-shell";
import { WorkflowFigure } from "@/components/mechanical";
import { BEARING_MODES, GEAR_MODES, ATTRIBUTIONS, SEVERITY } from "@/lib/iso";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Witness is, who it is for, how the two-stage detector works, and what it deliberately does not do.",
};

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export default function AboutPage() {
  return (
    <PublicShell>
      <article className="space-y-14">
        <header>
          <p className="font-mono text-2xs uppercase tracking-[0.28em] text-brass">About</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05]">
            A bench instrument, not an oracle
          </h1>
          <p className="mt-5 text-lg leading-8 text-paper-2">
            Witness reads a photograph of a returned rotating part and writes a
            failure record against a published standard. It gives the inspector
            a starting position and a citation. It does not replace the
            inspector, and it does not pretend to be certain when it is not.
          </p>
        </header>

        <Block title="The problem it addresses">
          <p>
            A gearbox part comes back from the field with a complaint attached
            to it and very little else. Someone photographs it, someone writes a
            sentence in a spreadsheet, and the part goes in a bin. Six months
            later the same mode appears on a different batch, and nobody can
            prove it, because the first record said &ldquo;worn&rdquo; and the
            second said &ldquo;pitting&rdquo; and neither cited anything.
          </p>
          <p>
            The failure was never the hard part. The record was. Witness makes
            the record the product: a damage mode with a clause number, a
            severity with an action attached, a cause mechanism, and a link back
            to the batch that produced the part.
          </p>
        </Block>

        <Block title="Who it is for">
          <ul className="grid gap-3 sm:grid-cols-3">
            {AUDIENCE.map((a, i) => (
              <li
                key={a.who}
                className="reveal lift rounded-md border border-iron/20 bg-ground-2 p-5"
                style={stagger(i)}
              >
                <h3 className="font-display text-base">{a.who}</h3>
                <p className="mt-2 text-sm leading-6 text-paper-2">{a.need}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="How the detector is built">
          <p>
            Witness uses two stages, because the two questions are different and
            a single model answers them both badly.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Stage
              n="Stage 1"
              q="Is this part abnormal?"
              body="A PatchCore-style memory bank holds patch features from the workspace's own known-good photographs. A new part is scored against that bank. The output is an anomaly score and a heat map that shows where the score came from."
              why="This stage needs no labels. It only needs examples of normal, which every plant already has."
            />
            <Stage
              n="Stage 2"
              q="Which ISO mode is it?"
              body="The abnormal region is put to a forced choice against the standard's own list of modes. The model must pick from that list. It cannot invent a label, and it cannot answer 'defect'."
              why="A forced choice keeps the vocabulary closed, which is what makes the output auditable against the document."
            />
          </div>
          <p className="mt-5">
            A confidence gate sits after stage two. High confidence files the
            record. Low confidence queues it for a person. The gate is the only
            place in the system where the software decides whether a human is
            needed, and its threshold is visible rather than buried.
          </p>
          <div className="mt-6 rounded-md border border-iron/20 bg-ground-2 p-5 shadow-[var(--shadow-raise)]">
            <WorkflowFigure className="w-full" />
          </div>
        </Block>

        <Block title="What the vocabulary covers">
          <div className="grid gap-3 sm:grid-cols-4">
            <Figure value={`${BEARING_MODES.length}`} label="ISO 15243 bearing modes" />
            <Figure value={`${GEAR_MODES.length}`} label="ISO 10825 gear modes" />
            <Figure value={`${ATTRIBUTIONS.length}`} label="Cause mechanisms" />
            <Figure value={`${SEVERITY.length}`} label="Severity grades" />
          </div>
          <p className="mt-5">
            The modes carry the standard&rsquo;s own numbering. The cause
            mechanisms are a separate axis on purpose: the same pit can come from
            fatigue at end of life or from a contaminant dent that seeded it
            early, and the action a fleet takes is different in each case. The{" "}
            <Link href="/taxonomy" className="rule-link text-oxide">
              taxonomy page
            </Link>{" "}
            lists every code.
          </p>
        </Block>

        <Block title="Where the data lives">
          <p>
            Each workspace is a tenant. Postgres row-level security scopes every
            reference photograph, finding and batch to the tenant that created
            it, so one workspace cannot read another&rsquo;s rows. The anomaly
            model runs as a stateless function that receives feature vectors and
            returns a score. It holds no database credentials.
          </p>
          <p>
            Confirmed records export as JSON on demand, with the model&rsquo;s
            suggestion and the human decision side by side. That pairing is the
            asset. It belongs to the plant that produced it.
          </p>
        </Block>

        <Block title="What it does not do">
          <ul className="space-y-3">
            {LIMITS.map((l) => (
              <li key={l} className="flex gap-3 text-paper-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sev-3" />
                <span className="text-sm leading-6">{l}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 font-editorial text-base italic leading-7 text-paper-2">
            An inspection tool that hides its uncertainty is worse than no tool,
            because it moves the error somewhere nobody is looking. The{" "}
            <Link href="/model-card" className="rule-link text-oxide">
              model card
            </Link>{" "}
            states the current limits in full.
          </p>
        </Block>

        <Block title="How it continues">
          <ol className="space-y-4">
            {ROADMAP.map((r, i) => (
              <li key={r.t} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-iron/30 font-mono text-2xs tabular text-iron">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-base">{r.t}</h3>
                  <p className="mt-1 text-sm leading-6 text-paper-2">{r.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Block>

        <section className="rounded-md border border-iron/20 bg-ground-2 p-7">
          <h2 className="font-display text-2xl">See it run</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-paper-2">
            The console is open. Enrol a reference set, score a part, accept or
            correct the mode, and watch the finding appear against its batch.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/console"
              className="rounded-sm bg-oxide px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-oxide-deep"
            >
              Open the console
            </Link>
            <Link
              href="/transparency"
              className="rounded-sm border border-iron/30 px-5 py-2.5 text-sm text-paper transition-colors hover:border-oxide hover:text-oxide"
            >
              Read the transparency note
            </Link>
          </div>
        </section>
      </article>
    </PublicShell>
  );
}

/* -------------------------------------------------------------------------- */

const AUDIENCE = [
  {
    who: "The bench inspector",
    need: "Gets a starting position and a clause number instead of a blank field, and keeps the final call.",
  },
  {
    who: "The quality engineer",
    need: "Gets a defensible record that cites a standard, and a fleet view that separates a supplier problem from a duty problem.",
  },
  {
    who: "The warranty team",
    need: "Gets findings linked to batches and a printable report, so a repeated mode becomes a case rather than an anecdote.",
  },
];

const LIMITS = [
  "It does not measure. A photograph gives no hardness, no roughness and no dimension. Witness classifies appearance, and appearance alone cannot close every diagnosis.",
  "It does not judge remaining life. Severity maps to an action, not to a number of hours.",
  "It does not work outside its two part families. A part that is neither a rolling bearing nor a gear tooth is out of scope, and the system says so rather than guessing.",
  "It does not treat its own suggestion as a fact. An unconfirmed record stays marked as unconfirmed until a person confirms or corrects it.",
];

const ROADMAP = [
  {
    t: "Enrol the reference set",
    d: "Normal is defined per workspace. A plant that runs its gearboxes hot has a different normal from one that does not, and the memory bank must hold the right one.",
  },
  {
    t: "Accumulate confirmed records",
    d: "Each confirmation or correction is a labelled pair. The set grows with use rather than with a separate labelling project.",
  },
  {
    t: "Train on the plant's own labels",
    d: "Once the confirmed set is large enough, it trains a classifier that matches the parts this plant actually returns, not a public benchmark.",
  },
  {
    t: "Close the loop back to the batch",
    d: "Findings link to batches and suppliers. The fleet cube then shows which mode concentrates where, which is the point of the whole exercise.",
  },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-paper-2">{children}</div>
    </section>
  );
}

function Stage({ n, q, body, why }: { n: string; q: string; body: string; why: string }) {
  return (
    <div className="lift rounded-md border border-iron/20 bg-ground-2 p-6">
      <span className="font-mono text-2xs uppercase tracking-[0.2em] text-oxide">{n}</span>
      <h3 className="mt-2.5 font-display text-lg">{q}</h3>
      <p className="mt-3 text-sm leading-6 text-paper-2">{body}</p>
      <p className="mt-3 border-t border-iron/15 pt-3 text-sm leading-6 text-iron">{why}</p>
    </div>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-iron/20 bg-ground-2 px-4 py-4">
      <div className="font-display text-3xl tabular text-paper">{value}</div>
      <p className="mt-1 text-2xs leading-5 text-iron">{label}</p>
    </div>
  );
}
