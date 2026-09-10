import { PublicShell } from "@/components/public-shell";

export const metadata = {
  title: "Model card",
  description: "Model card for the Witness two-stage defect classifier.",
};

export default function ModelCardPage() {
  return (
    <PublicShell>
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">Documentation</p>
      <h1 className="mt-3 font-display text-4xl text-paper">Model card</h1>
      <p className="mt-4 max-w-2xl text-paper-2">
        Witness classifies photographs of returned rotating-equipment parts into
        ISO failure modes. It is a two-stage system, and neither stage is a single
        trained checkpoint. This card documents both.
      </p>

      <Section title="Model details">
        <Field k="System" v="Witness two-stage defect classifier" />
        <Field k="Stage 1" v="PatchCore-style memory-bank anomaly detector over classical patch features (96px greyscale, 8×8 grid, 5-dim descriptors, greedy-coreset memory bank, max-patch nearest-neighbour distance). Runs as a stateless Python function." />
        <Field k="Stage 2" v="ISO forced-choice classifier. Default: deterministic feature heuristic. Optional: a vision-language model via OpenRouter (configurable), constrained to return a code from the part family's ISO catalog." />
        <Field k="Standards" v="ISO 15243 (rolling bearings), ISO 10825 (gear teeth)." />
        <Field k="Not used" v="EfficientAD (excluded on MVTec patent grounds); deep timm backbones (do not fit serverless size limits)." />
      </Section>

      <Section title="Intended use">
        <Field k="Primary" v="Triage and standards-linked documentation of returned-part damage, per tenant, behind human review." />
        <Field k="Users" v="Reliability and warranty inspectors who confirm or correct every auto-suggestion." />
        <Field k="Out of scope" v="Autonomous accept/reject of parts without inspector review; any safety-of-life decision made on the model output alone." />
      </Section>

      <Section title="Training data">
        <Field k="Reference sets" v="Each tenant enrolls its own photographs of known-good parts, per part family. Stage-1's memory bank is built only from that set, nothing else." />
        <Field k="Synthetic data" v="None. No synthetic defects are generated or used." />
        <Field k="Bundled datasets" v="The dataset registry admits only redistribution-clean licences; MVTec, Kolektor and similar are excluded or cite-only." />
      </Section>

      <Section title="Metrics">
        <Field k="Stage-1 threshold" v="Calibrated leave-one-image-out from the reference set's own scores, times a tunable margin. Reported per enrolment (bank size, reference-score spread)." />
        <Field k="Stage-2 confidence" v="Gated at 0.7: at or above auto-files, below routes to the review queue. The gate, not the model source, decides." />
        <Field k="Caveat" v="These are operational calibration figures, not benchmark accuracy on a held-out defect set. This is a per-tenant system without one." />
      </Section>

      <Section title="Ethical considerations & limitations">
        <Field k="Human authority" v="The inspector's determination overrides the model and is what downstream analytics and warranty reports use." />
        <Field k="Provenance" v="Model output is retained immutably alongside the human decision, so a disputed classification is auditable." />
        <Field k="Small reference sets" v="Below ~20 reference images the normal-set is unstable; results are marked indicative and the human review load rises." />
        <Field k="Distribution shift" v="Lighting or camera changes from the enrolled set inflate anomaly scores; retraining the reference set is the remedy." />
      </Section>
    </PublicShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-paper">{title}</h2>
      <dl className="mt-3 space-y-3">{children}</dl>
    </section>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid gap-1 border-b border-iron/15 pb-3 sm:grid-cols-[160px_1fr]">
      <dt className="text-2xs uppercase tracking-wide text-brass">{k}</dt>
      <dd className="text-sm leading-6 text-paper-2">{v}</dd>
    </div>
  );
}
