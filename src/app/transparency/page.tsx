import { PublicShell } from "@/components/public-shell";

export const metadata = {
  title: "Transparency",
  description: "How Witness classifies, what it does not do, and the data it is and is not built on.",
};

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
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">Method</p>
      <h1 className="mt-3 font-display text-4xl text-paper">How it works, honestly</h1>
      <p className="mt-4 max-w-2xl text-paper-2">
        Two stages. Stage-1 asks &ldquo;is this part abnormal?&rdquo; against a set
        of the tenant&apos;s own known-good photos. Stage-2 asks &ldquo;which ISO
        failure mode is it?&rdquo; and forces a choice from the catalog for that
        part family. A confidence gate sends the uncertain ones to a human, whose
        call is authoritative.
      </p>

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
