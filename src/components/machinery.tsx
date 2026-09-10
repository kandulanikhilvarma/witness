import { bearing, polar, hexPath, boltCircle, springPath } from "@/lib/mech";
import { MechDefs } from "@/components/mechanical";

const STEEL_G = "url(#mech-steel)";
const BALL_G = "url(#mech-ball)";

// A catalogue of machinery drawings and hardware-styled panels, in the manner
// of an industrial parts catalogue: dense, dimensioned, part-numbered. Server
// rendered SVG, one accent colour, line weight carries the meaning. The live
// control panel is a separate client component (control-strip.tsx).

const LINE = "var(--color-iron)";
const INK = "var(--color-paper)";
const META = "var(--color-iron)";
const ACCENT = "var(--color-oxide)";
const STEEL_2 = "color-mix(in srgb, var(--color-iron) 20%, transparent)";

/* --------------------------------------------------------------------------
   Dimension line. Extension lines, arrowheads, and a value in the gap. The
   horizontal case only, which is all the drawings need.
   -------------------------------------------------------------------------- */

function Dim({ x0, x1, y, value, drop = 12 }: { x0: number; x1: number; y: number; value: string; drop?: number }) {
  const mid = (x0 + x1) / 2;
  return (
    <g stroke={META} strokeWidth="0.75" fill="none">
      <line x1={x0} y1={y - drop} x2={x0} y2={y + 4} />
      <line x1={x1} y1={y - drop} x2={x1} y2={y + 4} />
      <line x1={x0} y1={y} x2={x1} y2={y} />
      <path d={`M ${x0} ${y} l 6 -3 v 6 z`} fill={META} stroke="none" />
      <path d={`M ${x1} ${y} l -6 -3 v 6 z`} fill={META} stroke="none" />
      <text x={mid} y={y - 5} fontSize="10.5" fill={META} textAnchor="middle" fontFamily="var(--font-mono)" stroke="none">
        {value}
      </text>
    </g>
  );
}

/* --------------------------------------------------------------------------
   Exploded assembly of a deep-groove ball bearing. The four families of part
   spread along the shaft axis, numbered like a parts list. This is the drawing
   that says "we know what is inside the thing we classify".
   -------------------------------------------------------------------------- */

const PARTS = [
  { n: "1", label: "Outer race", note: "hardened ring" },
  { n: "2", label: "Cage", note: "ball spacing" },
  { n: "3", label: "Rolling element", note: "9 off" },
  { n: "4", label: "Inner race", note: "shaft fit" },
];

export function ExplodedBearing({ className = "" }: { className?: string }) {
  const cy = 150;
  const cols = [120, 250, 380, 510];
  const g = bearing({ cx: 0, cy, rOuter: 74, rBore: 26, balls: 9, phase: -90 });

  return (
    <svg
      viewBox="0 0 640 300"
      className={className}
      role="img"
      aria-label="Exploded assembly drawing of a deep-groove ball bearing, showing the outer race, the cage, the rolling elements and the inner race spread along the shaft axis, numbered one to four."
    >
      <MechDefs />
      {/* Assembly axis through every part. */}
      <line x1="60" y1={cy} x2="600" y2={cy} stroke={LINE} strokeWidth="1" strokeDasharray="14 4 3 4" opacity="0.5" />

      {/* 1 · Outer race */}
      <g>
        <circle cx={cols[0]} cy={cy} r="74" fill={STEEL_G} stroke={INK} strokeWidth="1.5" />
        <circle cx={cols[0]} cy={cy} r="60" fill="var(--color-ground-2)" stroke={LINE} strokeWidth="1.25" />
      </g>

      {/* 2 · Cage with windows */}
      <g>
        <circle cx={cols[1]} cy={cy} r="58" fill="none" stroke={LINE} strokeWidth="1.25" />
        <circle cx={cols[1]} cy={cy} r="44" fill="none" stroke={LINE} strokeWidth="1.25" />
        {boltCircle(cols[1], cy, 51, 9).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="6.5" fill="var(--color-ground-2)" stroke={LINE} strokeWidth="1" />
        ))}
      </g>

      {/* 3 · Rolling elements on their pitch circle */}
      <g>
        <circle cx={cols[2]} cy={cy} r={g.ballOrbit} fill="none" stroke={ACCENT} strokeWidth="1" strokeDasharray="5 6" opacity="0.6" />
        {boltCircle(cols[2], cy, g.ballOrbit, 9).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="9" fill={i === 0 ? ACCENT : BALL_G} stroke={INK} strokeWidth="1.25" />
        ))}
      </g>

      {/* 4 · Inner race on the shaft */}
      <g>
        <circle cx={cols[3]} cy={cy} r="44" fill={STEEL_G} stroke={INK} strokeWidth="1.5" />
        <circle cx={cols[3]} cy={cy} r="26" fill="var(--color-ground)" stroke={LINE} strokeWidth="1.25" />
        <path d={`M ${cols[3] - 6} ${cy - 26} h 12 M ${cols[3] - 6} ${cy + 26} h 12`} stroke={LINE} strokeWidth="1" />
      </g>

      {/* Numbered balloons + legend row. */}
      {PARTS.map((p, i) => (
        <g key={p.n}>
          <circle cx={cols[i]} cy="248" r="11" fill="none" stroke={ACCENT} strokeWidth="1.25" />
          <text x={cols[i]} y="252" fontSize="12" fill={INK} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="600">
            {p.n}
          </text>
          <text x={cols[i]} y="278" fontSize="11.5" fill={INK} textAnchor="middle" fontFamily="var(--font-figure)" fontWeight="600">
            {p.label}
          </text>
          <text x={cols[i]} y="292" fontSize="10" fill={META} textAnchor="middle" fontFamily="var(--font-mono)">
            {p.note}
          </text>
          <line x1={cols[i]} y1={cy + (i === 3 ? 44 : i === 0 ? 74 : 58)} x2={cols[i]} y2="237" stroke={LINE} strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
        </g>
      ))}

      <text x="60" y="28" fontSize="11" fill={META} fontFamily="var(--font-mono)">
        FIG. 3 · EXPLODED ASSEMBLY · DEEP-GROOVE BALL BEARING
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------------
   A catalogue spec plate. Left: a small dimensioned drawing of a fastener or
   part. Right: a dense monospaced spec table. The look of a page torn from an
   industrial catalogue, applied to whatever the caller wants to specify.
   -------------------------------------------------------------------------- */

type Drawing = "bolt" | "shaft" | "spring" | "flange";

function PlateDrawing({ kind }: { kind: Drawing }) {
  const w = 168;
  const h = 132;
  const cx = w / 2;
  const cy = h / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
      <MechDefs />
      {kind === "bolt" && (
        <g fill="none" stroke={LINE} strokeWidth="1.25">
          <path d={hexPath(48, cy, 26)} fill={STEEL_G} />
          <circle cx="48" cy={cy} r="12" />
          <rect x="74" y={cy - 9} width="70" height="18" fill={STEEL_G} />
          {Array.from({ length: 7 }).map((_, i) => (
            <path key={i} d={`M ${80 + i * 10} ${cy - 9} l 5 18`} strokeWidth="0.75" opacity="0.7" />
          ))}
          <Dim x0={74} x1={144} y={cy + 30} value="M12 × 1.75" />
        </g>
      )}
      {kind === "shaft" && (
        <g fill="none" stroke={LINE} strokeWidth="1.25">
          <rect x="26" y={cy - 22} width="40" height="44" fill={STEEL_G} />
          <rect x="66" y={cy - 14} width="76" height="28" fill={STEEL_2} />
          <line x1="26" y1={cy} x2="150" y2={cy} strokeDasharray="12 3 2 3" opacity="0.5" />
          <Dim x0={66} x1={142} y={cy + 34} value="Ø 20 h6" />
        </g>
      )}
      {kind === "spring" && (
        <g fill="none" stroke={LINE} strokeWidth="1.25">
          <line x1="24" y1={cy} x2="30" y2={cy} />
          <path d={springPath(30, 138, cy, 6, 22)} />
          <line x1="138" y1={cy} x2="144" y2={cy} />
          <Dim x0={30} x1={138} y={cy + 40} value="free 84 mm" />
        </g>
      )}
      {kind === "flange" && (
        <g fill="none" stroke={LINE} strokeWidth="1.25">
          <circle cx={cx} cy={cy} r="46" fill={STEEL_G} />
          <circle cx={cx} cy={cy} r="18" fill="var(--color-ground-2)" />
          {boltCircle(cx, cy, 34, 6).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="var(--color-ground-2)" />
          ))}
          <circle cx={cx} cy={cy} r="34" strokeDasharray="4 4" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}

export interface SpecRow {
  k: string;
  v: string;
}

export function SpecPlate({
  drawing,
  code,
  title,
  rows,
  className = "",
}: {
  drawing: Drawing;
  code: string;
  title: string;
  rows: SpecRow[];
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-md border border-iron/25 bg-ground-2 ${className}`}>
      <div className="flex items-center justify-between border-b border-iron/15 bg-ground px-4 py-2">
        <span className="font-mono text-2xs uppercase tracking-[0.18em] text-iron">{code}</span>
        <span className="font-display text-sm">{title}</span>
      </div>
      <div className="grid grid-cols-[168px_1fr]">
        <div className="border-r border-iron/15 bg-ground p-2">
          <PlateDrawing kind={drawing} />
        </div>
        <dl className="divide-y divide-iron/10 text-sm">
          {rows.map((r) => (
            <div key={r.k} className="flex items-baseline justify-between gap-4 px-4 py-2">
              <dt className="text-paper-2">{r.k}</dt>
              <dd className="tabular font-mono text-xs text-paper">{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   A radial gauge. Sweep from left to right, a value arc in the accent, a needle,
   and a numeral. Used for confidence and headline ratios.
   -------------------------------------------------------------------------- */

export function GaugeDial({
  value,
  label,
  display,
  className = "",
}: {
  value: number; // 0..1
  label: string;
  display: string;
  className?: string;
}) {
  const cx = 90;
  const cy = 92;
  const r = 66;
  const start = 150;
  const end = 30;
  const sweep = end - start + 360; // 240 degrees
  const v = Math.max(0, Math.min(1, value));
  const arc = (a0: number, a1: number) => {
    const p0 = polar(cx, cy, r, a0);
    const p1 = polar(cx, cy, r, a1);
    const large = ((a1 - a0 + 360) % 360) > 180 ? 1 : 0;
    return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  };
  const needle = polar(cx, cy, r - 10, start + sweep * v);
  const ticks = Array.from({ length: 9 }, (_, i) => start + (sweep * i) / 8);

  return (
    <svg viewBox="0 0 180 150" className={className} role="img" aria-label={`${label}: ${display}`}>
      <path d={arc(start, start + sweep)} fill="none" stroke={STEEL_2} strokeWidth="8" strokeLinecap="round" />
      <path d={arc(start, start + sweep * v)} fill="none" stroke={ACCENT} strokeWidth="8" strokeLinecap="round" />
      {ticks.map((a, i) => {
        const o = polar(cx, cy, r + 8, a);
        const inn = polar(cx, cy, r + 2, a);
        return <line key={i} x1={inn.x} y1={inn.y} x2={o.x} y2={o.y} stroke={META} strokeWidth="1" opacity="0.6" />;
      })}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill={INK} />
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize="26" fill={INK} fontFamily="var(--font-figure)" fontWeight="700" className="tabular">
        {display}
      </text>
      <text x={cx} y={cy + 50} textAnchor="middle" fontSize="10" fill={META} fontFamily="var(--font-mono)" className="uppercase" letterSpacing="1">
        {label}
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------------
   A blueprint title block, the bottom-right stamp on an engineering drawing.
   Decorative section divider that reinforces the drawing-office identity.
   -------------------------------------------------------------------------- */

export function TitleBlock({ sheet, title, rev, scale = "NTS" }: { sheet: string; title: string; rev: string; scale?: string }) {
  return (
    <div className="inline-grid grid-cols-[auto_auto] overflow-hidden rounded-sm border border-iron/30 font-mono text-2xs">
      <div className="border-b border-r border-iron/20 px-3 py-1.5 text-iron">SHEET</div>
      <div className="border-b border-iron/20 px-3 py-1.5 tabular text-paper">{sheet}</div>
      <div className="col-span-2 border-b border-iron/20 px-3 py-2 font-display text-sm not-italic tracking-normal text-paper">
        {title}
      </div>
      <div className="border-r border-iron/20 px-3 py-1.5 text-iron">
        REV <span className="tabular text-paper">{rev}</span>
      </div>
      <div className="px-3 py-1.5 text-iron">
        SCALE <span className="tabular text-paper">{scale}</span>
      </div>
    </div>
  );
}

export type { Drawing };
