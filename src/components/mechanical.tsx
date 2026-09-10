import { bearing, gearPath, meshPhase, polar, leader } from "@/lib/mech";

// Mechanical drawings of the two part families Witness classifies. They are
// schematics, not renders: line weight carries the meaning, colour is spent
// only on the zone under discussion. Everything here is server-rendered SVG:
// no canvas, no chart library, no client JavaScript.

const LINE = "var(--color-iron)";
const INK = "var(--color-paper)";
const META = "var(--color-iron)";
const ACCENT = "var(--color-oxide)";
const STEEL = "color-mix(in srgb, var(--color-iron) 12%, transparent)";

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
      <g fill="none" stroke={LINE} strokeWidth="1">
        {/* Centre lines, the drawing-office convention for an axis of revolution. */}
        <path
          d={`M ${cx - 148} ${cy} H ${cx + 148} M ${cx} ${cy - 148} V ${cy + 148}`}
          strokeDasharray="14 4 3 4"
          opacity="0.45"
        />
      </g>

      {/* Races. Filled as annuli so the bore reads as a hole, not a disc. */}
      <path d={g.outerRace} fillRule="evenodd" fill={STEEL} stroke={LINE} strokeWidth="1.25" />
      <path d={g.innerRace} fillRule="evenodd" fill={STEEL} stroke={LINE} strokeWidth="1.25" />

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
            fill="var(--color-ground-2)"
            stroke={LINE}
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
              fontFamily="var(--font-display)"
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
          fill={STEEL}
          stroke={LINE}
          strokeWidth="1.25"
        />
        <circle cx={wheel.cx} cy={wheel.cy} r="26" fill="var(--color-ground)" stroke={LINE} strokeWidth="1.25" />
        <circle cx={wheel.cx} cy={wheel.cy} r="9" fill="none" stroke={LINE} strokeWidth="1" />
      </g>

      <g className="spin-slow-rev" style={{ transformOrigin: `${pinion.cx}px ${pinion.cy}px` }}>
        <path
          d={gearPath({ ...pinion, phase: meshPhase(pinion.teeth) })}
          fill={STEEL}
          stroke={LINE}
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
              fontFamily="var(--font-display)"
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
   The workflow, drawn. Seven stages and one branch: the confidence gate is the
   only place the system decides whether a person is needed.
   -------------------------------------------------------------------------- */

const STAGES = [
  { t: "Photograph", s: "bench camera" },
  { t: "Intake", s: "EXIF · pHash" },
  { t: "Anomaly", s: "PatchCore" },
  { t: "ISO mode", s: "forced choice" },
  { t: "Gate", s: "confidence" },
];

export function WorkflowFigure({ className = "" }: { className?: string }) {
  const y = 96;
  const x0 = 76;
  const span = 700;
  const step = span / (STAGES.length - 1);

  const gateX = x0 + step * 4;
  const autoY = 40;
  const reviewY = 156;
  const outX = gateX + 150;

  return (
    <svg
      viewBox="0 0 1000 240"
      className={className}
      role="img"
      aria-label="Workflow diagram. A photograph passes through intake, anomaly detection, ISO mode selection, and a confidence gate. High confidence files automatically; low confidence goes to an inspector for review. Both routes end in the fleet insights cube."
    >
      {/* Trunk: photograph through the gate. */}
      <line x1={x0} y1={y} x2={gateX} y2={y} stroke={LINE} strokeWidth="1" opacity="0.4" />
      <line x1={x0} y1={y} x2={gateX} y2={y} className="flow-path" stroke={ACCENT} strokeWidth="2" />

      {/* Branch: the gate splits into auto-file and review. */}
      <path
        d={`M ${gateX} ${y} C ${gateX + 46} ${y}, ${gateX + 46} ${autoY}, ${gateX + 96} ${autoY}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.5"
        opacity="0.8"
      />
      <path
        d={`M ${gateX} ${y} C ${gateX + 46} ${y}, ${gateX + 46} ${reviewY}, ${gateX + 96} ${reviewY}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.5"
        opacity="0.8"
      />

      {STAGES.map((st, i) => {
        const x = x0 + i * step;
        return (
          <g key={st.t}>
            <circle
              cx={x}
              cy={y}
              r="7"
              className="flow-node"
              fill={ACCENT}
              style={{ animationDelay: `${i * 0.4}s` }}
            />
            <circle cx={x} cy={y} r="14" fill="none" stroke={LINE} strokeWidth="1" opacity="0.5" />
            <text
              x={x}
              y={y - 30}
              textAnchor="middle"
              fontSize="15"
              fill={INK}
              fontFamily="var(--font-display)"
              fontWeight="600"
            >
              {st.t}
            </text>
            <text
              x={x}
              y={y + 40}
              textAnchor="middle"
              fontSize="11"
              fill={META}
              fontFamily="var(--font-mono)"
            >
              {st.s}
            </text>
          </g>
        );
      })}

      {/* The two outcomes. */}
      <g>
        <rect
          x={outX - 54}
          y={autoY - 17}
          width="152"
          height="34"
          rx="3"
          fill="var(--color-ground-2)"
          stroke={LINE}
          strokeWidth="1"
        />
        <text x={outX + 22} y={autoY + 5} textAnchor="middle" fontSize="13" fill={INK} fontFamily="var(--font-sans)">
          Files automatically
        </text>

        <rect
          x={outX - 54}
          y={reviewY - 17}
          width="152"
          height="34"
          rx="3"
          fill="var(--color-ground-2)"
          stroke={ACCENT}
          strokeWidth="1.25"
        />
        <text x={outX + 22} y={reviewY + 5} textAnchor="middle" fontSize="13" fill={INK} fontFamily="var(--font-sans)">
          Inspector reviews
        </text>
      </g>

      {/* Both outcomes converge on the fleet cube. */}
      <path
        d={`M ${outX + 98} ${autoY} C ${outX + 140} ${autoY}, ${outX + 140} ${y}, ${outX + 176} ${y}`}
        fill="none"
        stroke={LINE}
        strokeWidth="1.25"
        opacity="0.7"
      />
      <path
        d={`M ${outX + 98} ${reviewY} C ${outX + 140} ${reviewY}, ${outX + 140} ${y}, ${outX + 176} ${y}`}
        fill="none"
        stroke={LINE}
        strokeWidth="1.25"
        opacity="0.7"
      />
      <circle cx={outX + 182} cy={y} r="7" fill={ACCENT} />
      <text
        x={outX + 182}
        y={y - 26}
        textAnchor="middle"
        fontSize="15"
        fill={INK}
        fontFamily="var(--font-display)"
        fontWeight="600"
      >
        Insight
      </text>
      <text
        x={outX + 182}
        y={y + 34}
        textAnchor="middle"
        fontSize="11"
        fill={META}
        fontFamily="var(--font-mono)"
      >
        fleet cube
      </text>
    </svg>
  );
}
