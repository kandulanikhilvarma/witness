import { PublicShell } from "@/components/public-shell";
import { BearingFigure, GearMeshFigure } from "@/components/mechanical";
import { TitleBlock } from "@/components/machinery";
import { JsonLd, breadcrumb, definedTermSet, graph, pageMeta, techArticle } from "@/lib/seo";
import {
  ATTRIBUTIONS,
  BEARING_MODES,
  GEAR_MODES,
  MODE_ATTRIBUTIONS,
  SEVERITY,
  attributionFor,
  severity,
  type FailureMode,
} from "@/lib/iso";

export const metadata = pageMeta({
  title: "Taxonomy",
  description:
    "The full ISO 15243 rolling-bearing and ISO 10825 gear-tooth failure-mode catalogue Witness classifies against, with the severity ramp and the cause attributions for each mode.",
  path: "/taxonomy",
  keywords: [
    "ISO 15243 damage classes",
    "ISO 10825 gear damage",
    "bearing failure modes",
    "gear tooth failure modes",
    "failure mode taxonomy",
    "root cause attribution",
  ],
});

// One sentence per mode, built from the same data the classifier uses, so the
// structured data cannot drift from the table on the page.
function termDescription(m: FailureMode): string {
  const causes = (MODE_ATTRIBUTIONS[m.code] ?? [])
    .map((c) => attributionFor(c)?.label ?? c)
    .join(", ");
  const ramp = severity(m.ceiling);
  return `${m.label}. Worst-case severity ${m.ceiling}, ${ramp.label.toLowerCase()}: ${ramp.action.toLowerCase()}. Plausible causes: ${causes}.`;
}

const JUMP = [
  { id: "bearings", label: "ISO 15243" },
  { id: "gears", label: "ISO 10825" },
  { id: "severity", label: "Severity ramp" },
  { id: "attribution", label: "Attribution" },
  { id: "causes", label: "Cause per mode" },
];

// Public reference for the two catalogs Witness reasons over. Everything here is
// the same data the classifier and the console use. One source, no drift.
export default function TaxonomyPage() {
  return (
    <PublicShell>
      <JsonLd
        data={graph([
          breadcrumb([{ name: "Taxonomy", path: "/taxonomy" }]),
          techArticle({
            headline: "ISO 15243 and ISO 10825 failure-mode taxonomy",
            description:
              "The controlled vocabulary Witness classifies against: six ISO 15243 bearing damage classes, seven ISO 10825 gear-tooth classes, a five-step severity ramp, and eight cause attributions.",
            path: "/taxonomy",
            section: "Reference",
          }),
          definedTermSet({
            id: "iso15243",
            name: "ISO 15243 rolling-bearing damage classes",
            description: "The six primary damage classes for rolling bearings.",
            path: "/taxonomy",
            terms: BEARING_MODES.map((m) => ({
              code: m.code,
              label: m.label,
              description: termDescription(m),
            })),
          }),
          definedTermSet({
            id: "iso10825",
            name: "ISO 10825 gear-tooth damage classes",
            description: "The wear and damage classes for gear teeth.",
            path: "/taxonomy",
            terms: GEAR_MODES.map((m) => ({
              code: m.code,
              label: m.label,
              description: termDescription(m),
            })),
          }),
          definedTermSet({
            id: "attribution",
            name: "Witness cause attributions",
            description:
              "The originating mechanisms a fleet acts on, kept separate from the damage mode.",
            path: "/taxonomy",
            terms: ATTRIBUTIONS.map((a) => ({
              code: a.code,
              label: a.label,
              description: a.blurb,
            })),
          }),
        ])}
      />
      <p className="font-mono text-2xs uppercase tracking-[0.3em] text-brass">Reference</p>
      <h1 className="mt-3 font-display text-4xl text-paper">Failure-mode taxonomy</h1>
      <p className="mt-4 max-w-2xl text-paper-2">
        Two standards, one per part family. Codes are the standard&apos;s own clause
        numbering where it exists, so every finding traces back to the document.
        Severity is a five-step operational ramp; attribution is the root cause,
        kept separate from the mode on purpose.
      </p>

      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
        {JUMP.map((j) => (
          <a
            key={j.id}
            href={`#${j.id}`}
            className="rounded-sm border border-iron/25 px-2.5 py-1 font-mono text-2xs uppercase tracking-wide text-paper-2 transition-colors hover:border-oxide hover:text-oxide"
          >
            {j.label}
          </a>
        ))}
      </nav>

      <ModeTable
        id="bearings"
        title="ISO 15243, rolling bearings"
        modes={BEARING_MODES}
        figure={<BearingFigure className="w-full" />}
      />
      <ModeTable
        id="gears"
        title="ISO 10825, gear teeth"
        modes={GEAR_MODES}
        figure={<GearMeshFigure className="w-full" />}
      />

      <section id="severity" className="mt-12 scroll-mt-24">
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

      <section id="attribution" className="mt-12 scroll-mt-24">
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

      <section id="causes" className="mt-12 scroll-mt-24">
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

      <div className="mt-14">
        <TitleBlock sheet="TAX-01" title="ISO failure-mode catalogue" rev="C" />
      </div>
    </PublicShell>
  );
}

function ModeTable({
  id,
  title,
  modes,
  figure,
}: {
  id: string;
  title: string;
  modes: FailureMode[];
  figure: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="font-display text-xl text-paper">{title}</h2>
      <figure className="mt-4 rounded-lg border border-iron/20 bg-ground-2/40 p-4">
        {figure}
        <figcaption className="mt-2 font-mono text-2xs uppercase tracking-[0.2em] text-iron">
          Where the catalogue below lands on the part
        </figcaption>
      </figure>
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
                <td className="px-3 py-2 text-paper-2">
                  <span className="font-mono text-paper">
                    {severity(m.ceiling).glyph} {m.ceiling}
                  </span>{" "}
                  {severity(m.ceiling).label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
