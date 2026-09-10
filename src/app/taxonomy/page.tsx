import { PublicShell } from "@/components/public-shell";
import {
  ATTRIBUTIONS,
  BEARING_MODES,
  GEAR_MODES,
  MODE_ATTRIBUTIONS,
  SEVERITY,
  attributionFor,
  type FailureMode,
} from "@/lib/iso";

export const metadata = {
  title: "Taxonomy",
  description: "The ISO 15243 and ISO 10825 failure-mode taxonomy Witness classifies against.",
};

// Public reference for the two catalogs Witness reasons over. Everything here is
// the same data the classifier and the console use. One source, no drift.
export default function TaxonomyPage() {
  return (
    <PublicShell>
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">Reference</p>
      <h1 className="mt-3 font-display text-4xl text-paper">Failure-mode taxonomy</h1>
      <p className="mt-4 max-w-2xl text-paper-2">
        Two standards, one per part family. Codes are the standard&apos;s own clause
        numbering where it exists, so every finding traces back to the document.
        Severity is a five-step operational ramp; attribution is the root cause,
        kept separate from the mode on purpose.
      </p>

      <ModeTable title="ISO 15243, rolling bearings" modes={BEARING_MODES} />
      <ModeTable title="ISO 10825, gear teeth" modes={GEAR_MODES} />

      <section className="mt-12">
        <h2 className="font-display text-xl text-paper">Severity ramp</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {SEVERITY.map((s) => (
            <div key={s.level} className="rounded-lg border border-iron/20 bg-ground-2/50 p-3">
              <div className="font-mono text-lg text-oxide">{s.glyph} {s.level}</div>
              <div className="mt-1 text-sm text-paper">{s.label}</div>
              <div className="mt-0.5 text-2xs text-paper-2">{s.action}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-paper">Attribution, the third axis</h2>
        <p className="mt-2 max-w-2xl text-sm text-paper-2">
          A mode says what the surface shows; attribution says why it got there.
          The same pit is a different problem if it came from contamination rather
          than end-of-life fatigue, and the batch-level action differs.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ATTRIBUTIONS.map((a) => (
            <div key={a.code} className="rounded-lg border border-iron/20 bg-ground-2/50 p-3">
              <div className="text-sm text-paper">{a.label}</div>
              <div className="mt-0.5 text-2xs text-paper-2">{a.blurb}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-paper">Plausible cause per mode</h2>
        <p className="mt-2 max-w-2xl text-sm text-paper-2">
          Which causes ISO ties to each damage class. Not a gate, an inspector can
          attribute anything, but a finding whose cause is off this list is flagged
          for a second look.
        </p>
        <div className="mt-4 space-y-2">
          {[...BEARING_MODES, ...GEAR_MODES].map((m) => (
            <div key={m.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-iron/15 py-2 text-sm">
              <span className="w-40 shrink-0 text-paper">
                <span className="font-mono text-2xs text-brass">{m.code}</span> {m.label}
              </span>
              <span className="text-paper-2">
                {(MODE_ATTRIBUTIONS[m.code] ?? []).map((c) => attributionFor(c)?.label ?? c).join(" · ")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}

function ModeTable({ title, modes }: { title: string; modes: FailureMode[] }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-xl text-paper">{title}</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-iron/20">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-ground-2/50 text-left text-2xs uppercase tracking-wide text-paper-2">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Failure mode</th>
              <th className="px-3 py-2 font-medium">Worst-case severity</th>
            </tr>
          </thead>
          <tbody>
            {modes.map((m) => (
              <tr key={m.code} className="border-t border-iron/15">
                <td className="px-3 py-2 font-mono text-brass">{m.code}</td>
                <td className="px-3 py-2 text-paper">{m.label}</td>
                <td className="px-3 py-2 text-paper-2">{m.ceiling}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
