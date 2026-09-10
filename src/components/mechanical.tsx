import { bearing, gearPath, meshPhase, polar, leader } from "@/lib/mech";

// Mechanical drawings of the two part families Witness classifies. They are
// schematics, not renders: line weight carries the meaning, colour is spent
// only on the zone under discussion. Everything here is server-rendered SVG:
// no canvas, no chart library, no client JavaScript.

const LINE = "var(--color-iron)";
const INK = "var(--color-paper)";
const META = "var(--color-iron)";
const ACCENT = "var(--color-oxide)";

// Shared paint. A vertical steel gradient for machined faces, a spherical
// gradient for rolling elements, and a section hatch for cut surfaces. Inlined
// per figure; identical IDs across figures resolve to the first definition,
// which is harmless because every definition is the same.
export function MechDefs() {
  return (
    <defs>
      <linearGradient id="mech-steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--color-ground-2)" />
        <stop offset="0.5" stopColor="color-mix(in srgb, var(--color-iron) 12%, var(--color-ground-2))" />
        <stop offset="1" stopColor="color-mix(in srgb, var(--color-iron) 30%, var(--color-ground-2))" />
      </linearGradient>
      <radialGradient id="mech-ball" cx="0.34" cy="0.3" r="0.8">
        <stop offset="0" stopColor="var(--color-ground-2)" />
        <stop offset="0.65" stopColor="color-mix(in srgb, var(--color-iron) 16%, var(--color-ground-2))" />
        <stop offset="1" stopColor="color-mix(in srgb, var(--color-iron) 44%, var(--color-ground-2))" />
      </radialGradient>
      <pattern id="mech-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-iron)" strokeWidth="0.6" opacity="0.5" />
      </pattern>
    </defs>
  );
}

const STEEL_FILL = "url(#mech-steel)";
const BALL_FILL = "url(#mech-ball)";

/* --------------------------------------------------------------------------
   Deep-groove ball bearing, face-on. Classified against ISO 15243.
   -------------------------------------------------------------------------- */

export function BearingFigure({ className = "" }: { className?: string }) {
  const cx = 168;
  const cy = 170;
  const g = bearing({ cx, cy, rOuter: 122, rBore: 44, balls: 9, phase: -90 });

  const callouts = [
    {
      label: "Outer raceway",
      note: "5.1 fatigue · 5.4 electrical erosion",
      at: polar(cx, cy, 112, -128),
      to: { x: 322, y: 74 },
    },
    {
      label: "Rolling element",
      note: "5.5 plastic deformation",
      at: g.ballCentres[2] ?? { x: cx, y: cy },
      to: { x: 322, y: 150 },
    },
    {
      label: "Inner raceway",
      note: "5.2 wear · 5.3 corrosion",
      at: polar(cx, cy, 62, 52),
      to: { x: 322, y: 226 },
    },
    {
      label: "Bore and land",
      note: "5.6 fracture and cracking",
      at: polar(cx, cy, 44, 120),
      to: { x: 322, y: 292 },
    },
  ];

  return (
    <svg
      viewBox="0 0 560 340"
      className={className}
      role="img"
      aria-label="Cutaway drawing of a deep-groove ball bearing. Callouts mark the outer raceway, the rolling elements, the inner raceway and the bore, each labelled with the ISO 15243 damage classes that appear there."
    >
      <MechDefs />
      <g fill="none" stroke={LINE} strokeWidth="1">
        {/* Centre lines, the drawing-office convention for an axis of revolution. */}
        <path
          d={`M ${cx - 148} ${cy} H ${cx + 148} M ${cx} ${cy - 148} V ${cy + 148}`}
          strokeDasharray="14 4 3 4"
          opacity="0.45"
        />
      </g>

      {/* Races. Filled as annuli so the bore reads as a hole, not a disc. */}
      <path d={g.outerRace} fillRule="evenodd" fill={STEEL_FILL} stroke={INK} strokeWidth="1.25" />
      <path d={g.innerRace} fillRule="evenodd" fill={STEEL_FILL} stroke={INK} strokeWidth="1.25" />

      {/* Cage pitch circle, then the rolling elements riding on it. */}
      <circle
        cx={cx}
        cy={cy}
        r={g.cageRadius}
        fill="none"
        stroke={LINE}
        strokeWidth="1"
        strokeDasharray="5 6"
        opacity="0.7"
      />
      <g className="spin-slow" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {g.ballCentres.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={g.ballRadius}
            fill={BALL_FILL}
            stroke={INK}
            strokeWidth="1.25"
          />
        ))}
      </g>

      {/* Callouts. Leader lines elbow out to a right-hand column. */}
      <g>
        {callouts.map((c) => (
          <g key={c.label}>
            <path d={leader(c.at, c.to, 0)} fill="none" stroke={ACCENT} strokeWidth="1" opacity="0.55" />
            <circle cx={c.at.x} cy={c.at.y} r="3" fill={ACCENT} />
            <text
              x={c.to.x + 10}
              y={c.to.y - 3}
              fontSize="13"
              fill={INK}
              fontFamily="var(--font-figure)"
              fontWeight="600"
            >
              {c.label}
            </text>
            <text
              x={c.to.x + 10}
              y={c.to.y + 14}
              fontSize="11"
              fill={META}
              fontFamily="var(--font-mono)"
            >
              {c.note}
            </text>
          </g>
        ))}
      </g>

      <text x="20" y="326" fontSize="11" fill={META} fontFamily="var(--font-mono)">
        FIG. 1 · ROLLING BEARING · ISO 15243
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------------
   A meshing spur pair. Classified against ISO 10825.
   -------------------------------------------------------------------------- */

export function GearMeshFigure({ className = "" }: { className?: string }) {
  const wheel = { cx: 150, cy: 168, rTip: 104, rRoot: 84, teeth: 18 };
  const pitchWheel = (wheel.rTip + wheel.rRoot) / 2;
  const pinion = { cx: 0, cy: 168, rTip: 72, rRoot: 56, teeth: 12 };
  const pitchPinion = (pinion.rTip + pinion.rRoot) / 2;
  pinion.cx = wheel.cx + pitchWheel + pitchPinion;

  const callouts = [
    {
      label: "Tooth flank",
      note: "scuffing · contact fatigue",
      at: polar(wheel.cx, wheel.cy, wheel.rRoot + 12, -118),
      to: { x: 44, y: 44 },
    },
    {
      label: "Tooth root",
      note: "cracks · tooth fracture",
      at: polar(pinion.cx, pinion.cy, pinion.rRoot - 4, -52),
      to: { x: 404, y: 44 },
    },
    {
      label: "Mesh contact line",
      note: "wear · plastic deformation",
      at: { x: wheel.cx + pitchWheel, y: wheel.cy },
      to: { x: 458, y: 316 },
    },
  ];

  return (
    <svg
      viewBox="0 0 560 356"
      className={className}
      role="img"
      aria-label="Drawing of a spur wheel driving a smaller pinion. Callouts mark the tooth flank, the tooth root and the mesh contact line, each labelled with the ISO 10825 damage classes that appear there."
    >
      <MechDefs />
      <g fill="none" stroke={LINE} strokeWidth="1" opacity="0.45">
        <path d={`M 24 ${wheel.cy} H 536`} strokeDasharray="14 4 3 4" />
        <path d={`M ${wheel.cx} 30 V 306`} strokeDasharray="14 4 3 4" />
        <path d={`M ${pinion.cx} 60 V 276`} strokeDasharray="14 4 3 4" />
      </g>

      {/* Pitch circles. Where the two circles touch is where the teeth roll. */}
      <circle
        cx={wheel.cx}
        cy={wheel.cy}
        r={pitchWheel}
        fill="none"
        stroke={ACCENT}
        strokeWidth="1"
        strokeDasharray="6 5"
        opacity="0.6"
      />
      <circle
        cx={pinion.cx}
        cy={pinion.cy}
        r={pitchPinion}
        fill="none"
        stroke={ACCENT}
        strokeWidth="1"
        strokeDasharray="6 5"
        opacity="0.6"
      />

      {/* The wheel turns one way, the pinion the other. Half a pitch of phase on
          the pinion drops its teeth into the wheel's valleys. */}
      <g className="spin-slow" style={{ transformOrigin: `${wheel.cx}px ${wheel.cy}px` }}>
        <path
          d={gearPath({ ...wheel, phase: 0 })}
          fill={STEEL_FILL}
          stroke={INK}
          strokeWidth="1.25"
        />
        <circle cx={wheel.cx} cy={wheel.cy} r="26" fill="var(--color-ground)" stroke={LINE} strokeWidth="1.25" />
        <circle cx={wheel.cx} cy={wheel.cy} r="9" fill="none" stroke={LINE} strokeWidth="1" />
      </g>

      <g className="spin-slow-rev" style={{ transformOrigin: `${pinion.cx}px ${pinion.cy}px` }}>
        <path
          d={gearPath({ ...pinion, phase: meshPhase(pinion.teeth) })}
          fill={STEEL_FILL}
          stroke={INK}
          strokeWidth="1.25"
        />
        <circle cx={pinion.cx} cy={pinion.cy} r="20" fill="var(--color-ground)" stroke={LINE} strokeWidth="1.25" />
        <circle cx={pinion.cx} cy={pinion.cy} r="7" fill="none" stroke={LINE} strokeWidth="1" />
      </g>

      <g>
        {callouts.map((c) => (
          <g key={c.label}>
            <path d={leader(c.at, c.to, 0)} fill="none" stroke={ACCENT} strokeWidth="1" opacity="0.55" />
            <circle cx={c.at.x} cy={c.at.y} r="3" fill={ACCENT} />
            <text
              x={c.to.x}
              y={c.to.y - 4}
              fontSize="13"
              fill={INK}
              fontFamily="var(--font-figure)"
              fontWeight="600"
              textAnchor="middle"
            >
              {c.label}
            </text>
            <text
              x={c.to.x}
              y={c.to.y + 13}
              fontSize="11"
              fill={META}
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {c.note}
            </text>
          </g>
        ))}
      </g>

      <text x="20" y="348" fontSize="11" fill={META} fontFamily="var(--font-mono)">
        FIG. 2 · SPUR MESH · ISO 10825
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------------------
   The workflow as a machine. Four process modules ride a driven rail into a
   confidence gate valve. The two outputs converge on the fleet cube. The rail
   flow animates; the console never does.
   -------------------------------------------------------------------------- */

type StageIcon = "camera" | "intake" | "grid" | "dial";

const STAGES: { t: string; s: string; icon: StageIcon }[] = [
  { t: "Photograph", s: "bench camera", icon: "camera" },
  { t: "Intake", s: "EXIF · pHash", icon: "intake" },
  { t: "Anomaly", s: "PatchCore", icon: "grid" },
  { t: "ISO mode", s: "forced choice", icon: "dial" },
];

function StageGlyph({ icon }: { icon: StageIcon }) {
  const s = {
    fill: "none",
    stroke: INK,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (icon === "camera")
    return (
      <g>
        <rect x={-13} y={-8} width={26} height={17} rx={2.5} {...s} />
        <rect x={-11} y={-12} width={9} height={5} rx={1.5} fill={INK} stroke="none" />
        <circle cx={0} cy={1} r={5.5} {...s} />
      </g>
    );
  if (icon === "intake")
    return (
      <g>
        <path d="M -8 -12 h 11 l 5 5 v 19 h -16 Z" {...s} />
        <path d="M 3 -12 v 5 h 5" {...s} />
        <path d="M -4 -1 h 8 M -4 4 h 8 M -4 9 h 5" stroke={META} strokeWidth={1.2} />
      </g>
    );
  if (icon === "grid")
    return (
      <g>
        {[-9, 0, 9].map((gx) =>
          [-9, 0, 9].map((gy) => {
            const hot = gx === 0 && gy === 0;
            return <circle key={`${gx},${gy}`} cx={gx} cy={gy} r={hot ? 3 : 2.1} fill={hot ? ACCENT : META} />;
          }),
        )}
      </g>
    );
  return (
    <g>
      <path d="M -12 5 A 12 12 0 0 1 12 5" {...s} />
      <line x1={0} y1={5} x2={7} y2={-6} stroke={ACCENT} strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={0} cy={5} r={2.4} fill={INK} />
    </g>
  );
}

export function WorkflowFigure({ className = "" }: { className?: string }) {
  const y = 116;
  const cardW = 118;
  const cardTop = 68;
  const cardH = 96;
  const xs = [60, 208, 356, 504];

  const gx = 690;
  const autoY = 58;
  const reviewY = 182;
  const outL = 762;
  const outW = 152;
  const outR = outL + outW;
  const cubeX = 956;

  const rail = (x1: number, x2: number, key: string) => (
    <g key={key}>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={META} strokeWidth={3} opacity={0.35} strokeLinecap="round" />
      <line x1={x1} y1={y} x2={x2} y2={y} className="flow-path" stroke={ACCENT} strokeWidth={2} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 1000 248"
      className={className}
      role="img"
      aria-label="The workflow drawn as a machine. Four modules, photograph, intake, anomaly detection and ISO mode selection, ride a driven rail into a confidence gate valve. High confidence files automatically; low confidence routes to an inspector. Both outputs converge on the fleet insights cube."
    >
      <MechDefs />

      {rail(36, xs[0], "inlet")}
      {rail(xs[0] + cardW, xs[1], "s1")}
      {rail(xs[1] + cardW, xs[2], "s2")}
      {rail(xs[2] + cardW, xs[3], "s3")}
      {rail(xs[3] + cardW, gx - 22, "s4")}

      {STAGES.map((st, i) => {
        const x = xs[i];
        const cx = x + cardW / 2;
        const bolts = [
          [x + 9, cardTop + 9],
          [x + cardW - 9, cardTop + 9],
          [x + 9, cardTop + cardH - 9],
          [x + cardW - 9, cardTop + cardH - 9],
        ];
        return (
          <g key={st.t}>
            <rect x={x} y={cardTop} width={cardW} height={cardH} rx={8} fill={STEEL_FILL} stroke={INK} strokeWidth={1.25} />
            <rect x={x + 4} y={cardTop + 4} width={cardW - 8} height={15} rx={4} fill={ACCENT} opacity={0.14} />
            <text x={x + 10} y={cardTop + 15} fontSize={9} fill={META} fontFamily="var(--font-mono)">{`0${i + 1}`}</text>
            {bolts.map(([bx, by], j) => (
              <circle key={j} cx={bx} cy={by} r={2.2} fill="none" stroke={META} strokeWidth={1} />
            ))}
            <g transform={`translate(${cx}, ${cardTop + 46})`}>
              <StageGlyph icon={st.icon} />
            </g>
            <text x={cx} y={cardTop + 74} textAnchor="middle" fontSize={13.5} fill={INK} fontFamily="var(--font-figure)" fontWeight="600">
              {st.t}
            </text>
            <text x={cx} y={cardTop + 89} textAnchor="middle" fontSize={10} fill={META} fontFamily="var(--font-mono)">
              {st.s}
            </text>
          </g>
        );
      })}

      {/* Confidence gate, drawn as a gate valve. */}
      <g>
        <path d={`M ${gx - 22} ${y - 16} L ${gx} ${y} L ${gx - 22} ${y + 16} Z`} fill={STEEL_FILL} stroke={INK} strokeWidth={1.25} />
        <path d={`M ${gx + 22} ${y - 16} L ${gx} ${y} L ${gx + 22} ${y + 16} Z`} fill={STEEL_FILL} stroke={INK} strokeWidth={1.25} />
        <line x1={gx} y1={y - 16} x2={gx} y2={y - 32} stroke={INK} strokeWidth={1.6} />
        <path d={`M ${gx - 9} ${y - 34} h 18`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={gx} cy={y} r={3.2} className="flow-node" fill={ACCENT} />
        <text x={gx} y={cardTop + 74} textAnchor="middle" fontSize={13.5} fill={INK} fontFamily="var(--font-figure)" fontWeight="600">
          Gate
        </text>
        <text x={gx} y={cardTop + 89} textAnchor="middle" fontSize={10} fill={META} fontFamily="var(--font-mono)">
          confidence
        </text>
      </g>

      {/* Branch pipes from the valve to the two outputs. */}
      <path d={`M ${gx + 22} ${y} C ${gx + 64} ${y}, ${gx + 64} ${autoY}, ${outL} ${autoY}`} fill="none" stroke={ACCENT} strokeWidth={1.75} />
      <path d={`M ${gx + 22} ${y} C ${gx + 64} ${y}, ${gx + 64} ${reviewY}, ${outL} ${reviewY}`} fill="none" stroke={ACCENT} strokeWidth={1.75} />

      {/* Outputs. */}
      <rect x={outL} y={autoY - 17} width={outW} height={34} rx={4} fill="var(--color-ground-2)" stroke={INK} strokeWidth={1} />
      <text x={outL + outW / 2} y={autoY + 5} textAnchor="middle" fontSize={12.5} fill={INK} fontFamily="var(--font-sans)">
        Files automatically
      </text>
      <rect x={outL} y={reviewY - 17} width={outW} height={34} rx={4} fill="var(--color-ground-2)" stroke={ACCENT} strokeWidth={1.5} />
      <text x={outL + outW / 2} y={reviewY + 5} textAnchor="middle" fontSize={12.5} fill={INK} fontFamily="var(--font-sans)">
        Inspector reviews
      </text>

      {/* Converge on the fleet cube, drawn isometric. */}
      <path d={`M ${outR} ${autoY} C ${outR + 30} ${autoY}, ${cubeX - 26} ${y}, ${cubeX - 20} ${y}`} fill="none" stroke={META} strokeWidth={1.25} opacity={0.7} />
      <path d={`M ${outR} ${reviewY} C ${outR + 30} ${reviewY}, ${cubeX - 26} ${y}, ${cubeX - 20} ${y}`} fill="none" stroke={META} strokeWidth={1.25} opacity={0.7} />
      <path d={`M ${cubeX} ${y - 22} L ${cubeX + 19} ${y - 11} L ${cubeX} ${y} L ${cubeX - 19} ${y - 11} Z`} fill={ACCENT} stroke={INK} strokeWidth={1} />
      <path d={`M ${cubeX - 19} ${y - 11} L ${cubeX} ${y} L ${cubeX} ${y + 22} L ${cubeX - 19} ${y + 11} Z`} fill={STEEL_FILL} stroke={INK} strokeWidth={1} />
      <path d={`M ${cubeX + 19} ${y - 11} L ${cubeX} ${y} L ${cubeX} ${y + 22} L ${cubeX + 19} ${y + 11} Z`} fill="color-mix(in srgb, var(--color-iron) 24%, var(--color-ground-2))" stroke={INK} strokeWidth={1} />
      <text x={cubeX} y={cardTop - 6} textAnchor="middle" fontSize={13.5} fill={INK} fontFamily="var(--font-figure)" fontWeight="600">
        Insight
      </text>
      <text x={cubeX} y={y + 38} textAnchor="middle" fontSize={10} fill={META} fontFamily="var(--font-mono)">
        fleet cube
      </text>

      <text x={36} y={236} fontSize={10.5} fill={META} fontFamily="var(--font-mono)">
        SCHEMATIC · PHOTOGRAPH TO FINDING
      </text>
    </svg>
  );
}
