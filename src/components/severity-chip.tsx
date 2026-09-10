import { severity as sevInfo } from "@/lib/iso";

// Severity never rides on hue alone. Each chip carries the hue, a fill glyph
// (○◔◑◕●, a filling disc readable as a pattern), and the numeral. Any one of
// the three survives if the others fail: deuteranopia, greyscale print, a
// blown-out console.
const STYLES: Record<number, { fg: string; bg: string; bd: string }> = {
  0: { fg: "text-sev-0", bg: "bg-sev-0-bg", bd: "border-sev-0/40" },
  1: { fg: "text-sev-1", bg: "bg-sev-1-bg", bd: "border-sev-1/40" },
  2: { fg: "text-sev-2", bg: "bg-sev-2-bg", bd: "border-sev-2/40" },
  3: { fg: "text-sev-3", bg: "bg-sev-3-bg", bd: "border-sev-3/40" },
  4: { fg: "text-sev-4", bg: "bg-sev-4-bg", bd: "border-sev-4/50" },
};

export function SeverityChip({ level }: { level: number }) {
  const s = sevInfo(level);
  const style = STYLES[s.level];
  return (
    <span
      title={s.action}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-2xs font-mono ${style.bd} ${style.bg} ${style.fg}`}
    >
      <span aria-hidden className="text-sm leading-none">
        {s.glyph}
      </span>
      <span className="tabular">
        {s.level} · {s.label}
      </span>
    </span>
  );
}
