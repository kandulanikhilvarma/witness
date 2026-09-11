import { PublicShell } from "@/components/public-shell";
import { WorkflowFigure } from "@/components/mechanical";
import { GaugeDial } from "@/components/machinery";
import { JsonLd, breadcrumb, faqPage, graph, pageMeta, techArticle } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Transparency",
  description:
    "How Witness classifies: a PatchCore-style memory bank for stage 1, a forced ISO choice for stage 2, a confidence gate at 0.7, and an inspector whose call overrides the model.",
  path: "/transparency",
  keywords: [
    "anomaly detection transparency",
    "PatchCore memory bank",
    "confidence gate",
    "human in the loop inspection",
    "AI model limitations",
  ],
});

// The answers are the page's own prose, trimmed to one paragraph each. An answer
// engine quoting this gets the same claim a reader gets.
const FAQ = [
  {
    q: "How does Witness classify a damaged part?",
    a: "In two stages. Stage 1 asks whether the part is abnormal, scoring it against a memory bank built from the tenant's own photographs of known-good parts. Stage 2 asks which ISO failure mode it is, and must return one code from the part family's catalogue: ISO 15243 for rolling bearings, ISO 10825 for gear teeth. A confidence gate at 0.7 auto-files the confident records and sends the rest to a human review queue.",
  },
  {
    q: "Is the Witness anomaly detector a deep learning model?",
    a: "No. It has PatchCore's shape, a memory bank of normal patch features scored by nearest-neighbour distance, but it uses cheap local patch statistics instead of a deep backbone, because a torch backbone does not fit a serverless function's size limit. It is honest to call it a classical-feature detector today.",
  },
  {
    q: "Can the model invent a failure mode that is not in the standard?",
    a: "No. Stage 2 is a forced choice against the part family's ISO catalogue, and a code that is not on the list is discarded. Without an API key the stage runs a deterministic heuristic; with an OpenRouter key it routes to a vision model. The confidence gate, not the source, decides where a finding lands.",
  },
  {
    q: "Who has the final say on a classification, the model or the inspector?",
    a: "The inspector. The model output is a suggestion that is kept immutable for provenance and as one half of a future training pair. The inspector's confirmation or correction is the authoritative classification, and it is what flows into the fleet analytics and the warranty reports.",
  },
  {
    q: "What data is Witness trained on?",
    a: "The tenant's own photographs of good parts, enrolled per part family. There is no synthetic defect data. The bundled dataset registry admits only licences that are clean for redistribution, and EfficientAD is excluded on MVTec patent grounds.",
  },
];

const COVERAGE = [
  { cap: "Intake: EXIF, provenance, perceptual-hash dedupe", status: "live" },
  { cap: "Stage-1 anomaly: PatchCore-style memory bank", status: "live" },
  { cap: "Stage-2 ISO forced-choice: keyless heuristic", status: "live" },
  { cap: "Stage-2 ISO forced-choice: VLM (OpenRouter)", status: "optional" },
  { cap: "Confidence gate + human review queue", status: "live" },
  { cap: "3-axis insights (mode × severity × cause)", status: "live" },
  { cap: "Batch / supplier linking", status: "live" },
  { cap: "Warranty report + JSON export", status: "live" },
  { cap: "Deep backbone (timm) anomaly features", status: "planned" },
  { cap: "EfficientAD anomaly detector", status: "excluded" },
];

const BADGE: Record<string, string> = {
  live: "border-sev-0/40 bg-sev-0-bg text-sev-0",
  optional: "border-brass/40 text-brass",
  planned: "border-iron/40 text-paper-2",
  excluded: "border-sev-3/40 bg-sev-3-bg text-sev-3",
};

export default function TransparencyPage() {
  return (
    <PublicShell>
      <JsonLd
        data={graph([
          breadcrumb([{ name: "Transparency", path: "/transparency" }]),
          techArticle({
            headline: "How Witness classifies, honestly",
            description:
              "The two-stage method, the confidence gate, the human authority rule, and the data Witness is not built on.",
            path: "/transparency",
            section: "Method",
          }),
          faqPage(FAQ),
        ])}
      />
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">Method</p>
      <h1 className="mt-3 font-display text-4xl text-paper">How it works, honestly</h1>
      <p className="mt-4 max-w-2xl text-paper-2">
        Two stages. Stage-1 asks &ldquo;is this part abnormal?&rdquo; against a set
        of the tenant&apos;s own known-good photos. Stage-2 asks &ldquo;which ISO
        failure mode is it?&rdquo; and forces a choice from the catalog for that
        part family. A confidence gate sends the uncertain ones to a human, whose
        call is authoritative.
      </p>

      <figure className="mt-8 rounded-lg border border-iron/20 bg-ground-2/40 p-4">
        <WorkflowFigure className="w-full" />
        <figcaption className="mt-2 font-mono text-2xs uppercase tracking-[0.2em] text-iron">
          The path a photograph takes, and the one gate that decides if a person is needed
        </figcaption>
      </figure>

      <Block title="Stage-1 is a memory bank, not a deep model">
        The anomaly detector is PatchCore&apos;s shape, a memory bank of normal
        patch features scored by nearest-neighbour distance, but with cheap
        local patch statistics instead of a deep backbone. A real timm backbone
        (torch) does not fit a serverless function&apos;s size limits, so it is
        honest to say this is a classical-feature detector today. It runs as a
        Python function that holds no state and touches no database.
      </Block>

      <Block title="Stage-2 forces a choice">
        Given an anomalous crop, Stage-2 must return one code from the part
        family&apos;s ISO catalog. A hallucinated code is discarded. Without an
        API key it uses a deterministic heuristic; with an OpenRouter key it routes
        to a vision model. Either way the confidence gate, not the source, decides
        whether a finding auto-files or waits for review.
      </Block>

      <section className="mt-10 grid items-center gap-6 rounded-lg border border-iron/20 bg-ground-2/40 p-5 sm:grid-cols-[180px_1fr]">
        <GaugeDial value={0.7} label="gate 0.70" display="0.70" className="w-full max-w-[180px]" />
        <div>
          <h2 className="font-display text-xl text-paper">The gate is one number, and it is published</h2>
          <p className="mt-2 text-sm leading-6 text-paper-2">
            A stage-2 confidence at or above 0.70 auto-files the record. Anything
            below it waits for an inspector. The threshold lives in one constant,
            <span className="font-mono text-paper"> CONFIDENCE_GATE</span> in{" "}
            <span className="font-mono text-paper">src/lib/stage2.ts</span>, so there
            is no second, quieter rule somewhere else in the pipeline.
          </p>
        </div>
      </section>

      <Block title="The inspector is the source of truth">
        Model output is a suggestion, kept immutable for provenance and as one half
        of a future training pair. The inspector&apos;s confirmation or correction
        is the authoritative classification, and it is what flows into the fleet
        analytics.
      </Block>

      <Block title="Data we are not built on">
        No synthetic defect data. Training reference sets are the tenant&apos;s own
        photographs of good parts, enrolled per part family. The bundled dataset
        registry excludes anything without a redistribution-clean licence, and
        EfficientAD is deliberately excluded on patent grounds. See the model
        card for specifics.
      </Block>

      <section className="mt-12">
        <h2 className="font-display text-xl text-paper">Capability coverage</h2>
        <p className="mt-2 text-sm text-paper-2">What is live, what is optional, what is not built.</p>
        <div className="mt-4 space-y-1.5">
          {COVERAGE.map((c) => (
            <div key={c.cap} className="flex items-center justify-between gap-3 border-b border-iron/15 py-2 text-sm">
              <span className="text-paper">{c.cap}</span>
              <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wide ${BADGE[c.status]}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mt-12 scroll-mt-24">
        <h2 className="font-display text-xl text-paper">Common questions</h2>
        <dl className="mt-4 divide-y divide-iron/15 border-t border-iron/15">
          {FAQ.map((item) => (
            <div key={item.q} className="py-4">
              <dt className="text-sm font-medium text-paper">{item.q}</dt>
              <dd className="mt-1.5 max-w-2xl text-sm leading-6 text-paper-2">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PublicShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-paper">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-paper-2">{children}</p>
    </section>
  );
}
