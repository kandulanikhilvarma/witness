// Render the mechanical drawings to standalone SVG files for the README.
//
// The app renders these figures as React with Tailwind colour variables. GitHub
// cannot resolve those variables and strips animation, so the README needs
// self-contained SVGs: literal colours, a light card background, no CSS classes.
// The geometry — the only hard part — comes from src/lib/mech.ts, so the static
// files and the live components cannot drift on the maths.
//
// Run: node scripts/gen-diagrams.ts
// Node 22 strips the TypeScript types; no build step.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bearing,
  gearPath,
  meshPhase,
  polar,
  leader,
  boltCircle,
  type Point,
} from "../src/lib/mech.ts";

const C = {
  paper: "#f6f2ea",
  card: "#ffffff",
  ink: "#1d1b17",
  iron: "#6e675d",
  line: "#d9d5cc",
  accent: "#0e6e78",
  accentDeep: "#0a5158",
  brass: "#8a6d25",
  steel: "#eeeae1",
  sev: ["#3f7a4e", "#96761c", "#bd660f", "#bf341d", "#8a1410"],
};

const SANS = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// Literal-hex gradients. GitHub cannot resolve CSS variables, so these mirror
// the app's steel and rolling-element paint with fixed stops.
const DEFS = `<defs>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#efe9df"/>
      <stop offset="1" stop-color="#dbd4c8"/>
    </linearGradient>
    <radialGradient id="ball" cx="0.34" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.65" stop-color="#ece6db"/>
      <stop offset="1" stop-color="#ccc4b6"/>
    </radialGradient>
  </defs>`;

const STEEL = "url(#steel)";
const BALL = "url(#ball)";

function card(w: number, h: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
  ${DEFS}
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${C.card}" stroke="${C.line}"/>
${body}
</svg>
`;
}

function text(
  x: number,
  y: number,
  s: string,
  opts: { size?: number; fill?: string; font?: string; anchor?: string; weight?: number } = {},
): string {
  const { size = 13, fill = C.ink, font = SANS, anchor = "start", weight = 400 } = opts;
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family="${font}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* -------------------------------------------------------------------------- */

function bearingSvg(): string {
  const cx = 168;
  const cy = 170;
  const g = bearing({ cx, cy, rOuter: 122, rBore: 44, balls: 9, phase: -90 });
  const callouts = [
    { label: "Outer raceway", note: "5.1 fatigue / 5.4 erosion", at: polar(cx, cy, 112, -128), to: { x: 322, y: 74 } },
    { label: "Rolling element", note: "5.5 deformation", at: g.ballCentres[2], to: { x: 322, y: 150 } },
    { label: "Inner raceway", note: "5.2 wear / 5.3 corrosion", at: polar(cx, cy, 62, 52), to: { x: 322, y: 226 } },
    { label: "Bore and land", note: "5.6 fracture", at: polar(cx, cy, 44, 120), to: { x: 322, y: 292 } },
  ];

  let b = "";
  b += `<path d="M ${cx - 148} ${cy} H ${cx + 148} M ${cx} ${cy - 148} V ${cy + 148}" fill="none" stroke="${C.iron}" stroke-width="1" stroke-dasharray="14 4 3 4" opacity="0.4"/>`;
  b += `<path d="${g.outerRace}" fill-rule="evenodd" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<path d="${g.innerRace}" fill-rule="evenodd" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${g.cageRadius}" fill="none" stroke="${C.iron}" stroke-width="1" stroke-dasharray="5 6" opacity="0.7"/>`;
  for (const p of g.ballCentres) {
    b += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${g.ballRadius.toFixed(2)}" fill="${BALL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  }
  for (const c of callouts) {
    b += `<path d="${leader(c.at, c.to, 0)}" fill="none" stroke="${C.accent}" stroke-width="1" opacity="0.55"/>`;
    b += `<circle cx="${c.at.x.toFixed(2)}" cy="${c.at.y.toFixed(2)}" r="3" fill="${C.accent}"/>`;
    b += text(c.to.x + 10, c.to.y - 3, c.label, { size: 13, weight: 600 });
    b += text(c.to.x + 10, c.to.y + 14, c.note, { size: 11, fill: C.iron, font: MONO });
  }
  b += text(20, 326, "FIG. 1 · ROLLING BEARING · ISO 15243", { size: 11, fill: C.iron, font: MONO });
  return card(560, 340, b, "Cutaway of a deep-groove ball bearing with ISO 15243 damage classes called out.");
}

function gearSvg(): string {
  const wheel = { cx: 150, cy: 168, rTip: 104, rRoot: 84, teeth: 18 };
  const pitchWheel = (wheel.rTip + wheel.rRoot) / 2;
  const pinion = { cx: 0, cy: 168, rTip: 72, rRoot: 56, teeth: 12 };
  const pitchPinion = (pinion.rTip + pinion.rRoot) / 2;
  pinion.cx = wheel.cx + pitchWheel + pitchPinion;
  const callouts = [
    { label: "Tooth flank", note: "scuffing / fatigue", at: polar(wheel.cx, wheel.cy, wheel.rRoot + 12, -118), to: { x: 44, y: 44 } },
    { label: "Tooth root", note: "cracks / fracture", at: polar(pinion.cx, pinion.cy, pinion.rRoot - 4, -52), to: { x: 404, y: 44 } },
    { label: "Mesh line", note: "wear / deformation", at: { x: wheel.cx + pitchWheel, y: wheel.cy }, to: { x: 458, y: 316 } },
  ];

  let b = "";
  b += `<path d="M 24 ${wheel.cy} H 536" fill="none" stroke="${C.iron}" stroke-width="1" stroke-dasharray="14 4 3 4" opacity="0.4"/>`;
  b += `<circle cx="${wheel.cx}" cy="${wheel.cy}" r="${pitchWheel}" fill="none" stroke="${C.accent}" stroke-width="1" stroke-dasharray="6 5" opacity="0.6"/>`;
  b += `<circle cx="${pinion.cx}" cy="${pinion.cy}" r="${pitchPinion}" fill="none" stroke="${C.accent}" stroke-width="1" stroke-dasharray="6 5" opacity="0.6"/>`;
  b += `<path d="${gearPath({ ...wheel, phase: 0 })}" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${wheel.cx}" cy="${wheel.cy}" r="26" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${wheel.cx}" cy="${wheel.cy}" r="9" fill="none" stroke="${C.iron}" stroke-width="1"/>`;
  b += `<path d="${gearPath({ ...pinion, phase: meshPhase(pinion.teeth) })}" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${pinion.cx}" cy="${pinion.cy}" r="20" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${pinion.cx}" cy="${pinion.cy}" r="7" fill="none" stroke="${C.iron}" stroke-width="1"/>`;
  for (const c of callouts) {
    b += `<path d="${leader(c.at, c.to, 0)}" fill="none" stroke="${C.accent}" stroke-width="1" opacity="0.55"/>`;
    b += `<circle cx="${c.at.x.toFixed(2)}" cy="${c.at.y.toFixed(2)}" r="3" fill="${C.accent}"/>`;
    b += text(c.to.x, c.to.y - 4, c.label, { size: 13, weight: 600, anchor: "middle" });
    b += text(c.to.x, c.to.y + 13, c.note, { size: 11, fill: C.iron, font: MONO, anchor: "middle" });
  }
  b += text(20, 348, "FIG. 2 · SPUR MESH · ISO 10825", { size: 11, fill: C.iron, font: MONO });
  return card(560, 356, b, "Spur wheel driving a pinion with ISO 10825 damage classes called out.");
}

function workflowSvg(): string {
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
  const stages = [
    { t: "Photograph", s: "bench camera", icon: "camera" },
    { t: "Intake", s: "EXIF · pHash", icon: "intake" },
    { t: "Anomaly", s: "PatchCore", icon: "grid" },
    { t: "ISO mode", s: "forced choice", icon: "dial" },
  ];

  const rail = (x1: number, x2: number) =>
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C.iron}" stroke-width="3" opacity="0.35" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C.accent}" stroke-width="2" stroke-dasharray="4 8"/>`;

  const glyph = (icon: string, cx: number, gy: number) => {
    const st = `fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
    if (icon === "camera")
      return `<rect x="${cx - 13}" y="${gy - 8}" width="26" height="17" rx="2.5" ${st}/><rect x="${cx - 11}" y="${gy - 12}" width="9" height="5" rx="1.5" fill="${C.ink}"/><circle cx="${cx}" cy="${gy + 1}" r="5.5" ${st}/>`;
    if (icon === "intake")
      return `<path d="M ${cx - 8} ${gy - 12} h 11 l 5 5 v 19 h -16 Z" ${st}/><path d="M ${cx + 3} ${gy - 12} v 5 h 5" ${st}/><path d="M ${cx - 4} ${gy - 1} h 8 M ${cx - 4} ${gy + 4} h 8 M ${cx - 4} ${gy + 9} h 5" stroke="${C.iron}" stroke-width="1.2" fill="none"/>`;
    if (icon === "grid") {
      let d = "";
      for (const a of [-9, 0, 9])
        for (const bb of [-9, 0, 9]) {
          const hot = a === 0 && bb === 0;
          d += `<circle cx="${cx + a}" cy="${gy + bb}" r="${hot ? 3 : 2.1}" fill="${hot ? C.accent : C.iron}"/>`;
        }
      return d;
    }
    return `<path d="M ${cx - 12} ${gy + 5} A 12 12 0 0 1 ${cx + 12} ${gy + 5}" ${st}/><line x1="${cx}" y1="${gy + 5}" x2="${cx + 7}" y2="${gy - 6}" stroke="${C.accent}" stroke-width="1.8" stroke-linecap="round"/><circle cx="${cx}" cy="${gy + 5}" r="2.4" fill="${C.ink}"/>`;
  };

  let b = "";
  b += rail(36, xs[0]);
  b += rail(xs[0] + cardW, xs[1]);
  b += rail(xs[1] + cardW, xs[2]);
  b += rail(xs[2] + cardW, xs[3]);
  b += rail(xs[3] + cardW, gx - 22);

  stages.forEach((s, i) => {
    const x = xs[i];
    const cx = x + cardW / 2;
    b += `<rect x="${x}" y="${cardTop}" width="${cardW}" height="${cardH}" rx="8" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.25"/>`;
    b += `<rect x="${x + 4}" y="${cardTop + 4}" width="${cardW - 8}" height="15" rx="4" fill="${C.accent}" opacity="0.14"/>`;
    b += text(x + 10, cardTop + 15, `0${i + 1}`, { size: 9, fill: C.iron, font: MONO });
    for (const [bx, by] of [
      [x + 9, cardTop + 9],
      [x + cardW - 9, cardTop + 9],
      [x + 9, cardTop + cardH - 9],
      [x + cardW - 9, cardTop + cardH - 9],
    ])
      b += `<circle cx="${bx}" cy="${by}" r="2.2" fill="none" stroke="${C.iron}" stroke-width="1"/>`;
    b += glyph(s.icon, cx, cardTop + 46);
    b += text(cx, cardTop + 74, s.t, { size: 13.5, weight: 600, anchor: "middle" });
    b += text(cx, cardTop + 89, s.s, { size: 10, fill: C.iron, font: MONO, anchor: "middle" });
  });

  // Confidence gate valve.
  b += `<path d="M ${gx - 22} ${y - 16} L ${gx} ${y} L ${gx - 22} ${y + 16} Z" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<path d="M ${gx + 22} ${y - 16} L ${gx} ${y} L ${gx + 22} ${y + 16} Z" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<line x1="${gx}" y1="${y - 16}" x2="${gx}" y2="${y - 32}" stroke="${C.ink}" stroke-width="1.6"/>`;
  b += `<path d="M ${gx - 9} ${y - 34} h 18" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>`;
  b += `<circle cx="${gx}" cy="${y}" r="3.2" fill="${C.accent}"/>`;
  b += text(gx, cardTop + 74, "Gate", { size: 13.5, weight: 600, anchor: "middle" });
  b += text(gx, cardTop + 89, "confidence", { size: 10, fill: C.iron, font: MONO, anchor: "middle" });

  // Branch pipes and outputs.
  b += `<path d="M ${gx + 22} ${y} C ${gx + 64} ${y}, ${gx + 64} ${autoY}, ${outL} ${autoY}" fill="none" stroke="${C.accent}" stroke-width="1.75"/>`;
  b += `<path d="M ${gx + 22} ${y} C ${gx + 64} ${y}, ${gx + 64} ${reviewY}, ${outL} ${reviewY}" fill="none" stroke="${C.accent}" stroke-width="1.75"/>`;
  b += `<rect x="${outL}" y="${autoY - 17}" width="${outW}" height="34" rx="4" fill="${C.paper}" stroke="${C.ink}"/>`;
  b += text(outL + outW / 2, autoY + 5, "Files automatically", { size: 12.5, anchor: "middle" });
  b += `<rect x="${outL}" y="${reviewY - 17}" width="${outW}" height="34" rx="4" fill="${C.paper}" stroke="${C.accent}" stroke-width="1.5"/>`;
  b += text(outL + outW / 2, reviewY + 5, "Inspector reviews", { size: 12.5, anchor: "middle" });

  // Converge on the isometric fleet cube.
  b += `<path d="M ${outR} ${autoY} C ${outR + 30} ${autoY}, ${cubeX - 26} ${y}, ${cubeX - 20} ${y}" fill="none" stroke="${C.iron}" stroke-width="1.25" opacity="0.7"/>`;
  b += `<path d="M ${outR} ${reviewY} C ${outR + 30} ${reviewY}, ${cubeX - 26} ${y}, ${cubeX - 20} ${y}" fill="none" stroke="${C.iron}" stroke-width="1.25" opacity="0.7"/>`;
  b += `<path d="M ${cubeX} ${y - 22} L ${cubeX + 19} ${y - 11} L ${cubeX} ${y} L ${cubeX - 19} ${y - 11} Z" fill="${C.accent}" stroke="${C.ink}"/>`;
  b += `<path d="M ${cubeX - 19} ${y - 11} L ${cubeX} ${y} L ${cubeX} ${y + 22} L ${cubeX - 19} ${y + 11} Z" fill="${STEEL}" stroke="${C.ink}"/>`;
  b += `<path d="M ${cubeX + 19} ${y - 11} L ${cubeX} ${y} L ${cubeX} ${y + 22} L ${cubeX + 19} ${y + 11} Z" fill="#d6cfc2" stroke="${C.ink}"/>`;
  b += text(cubeX, cardTop - 6, "Insight", { size: 13.5, weight: 600, anchor: "middle" });
  b += text(cubeX, y + 38, "fleet cube", { size: 10, fill: C.iron, font: MONO, anchor: "middle" });
  b += text(36, 236, "FIG. 3 · SCHEMATIC · PHOTOGRAPH TO FINDING", { size: 10.5, fill: C.iron, font: MONO });
  return card(1000, 248, b, "The workflow as a machine: four modules feed a confidence gate valve, and the two outputs converge on the fleet cube.");
}

function bannerSvg(): string {
  const w = 1200;
  const h = 360;
  let b = `<rect x="0" y="0" width="${w}" height="${h}" fill="${C.paper}"/>`;
  // Faint blueprint grid.
  b += `<g opacity="0.05" stroke="${C.iron}" stroke-width="1">`;
  for (let x = 0; x <= w; x += 32) b += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
  for (let y = 0; y <= h; y += 32) b += `<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`;
  b += `</g>`;

  // Wordmark ring, top left.
  b += `<g transform="translate(84,70)">
    <circle cx="0" cy="0" r="17" fill="none" stroke="${C.ink}" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="7" fill="none" stroke="${C.ink}" stroke-width="2.5"/>
    <circle cx="0" cy="-13" r="3.5" fill="${C.accent}"/>
  </g>`;
  b += text(116, 76, "WITNESS", { size: 26, weight: 700, font: SANS });

  b += text(84, 176, "Read the damage.", { size: 58, weight: 700 });
  b += text(84, 240, "Name the cause.", { size: 58, weight: 700, fill: C.accent });
  b += text(84, 292, "Defect intelligence for rotating equipment. ISO 15243 and ISO 10825.", {
    size: 19,
    fill: C.iron,
  });
  b += text(84, 320, "The model suggests. The inspector decides. Every confirmation becomes training data.", {
    size: 15,
    fill: C.iron,
    font: MONO,
  });

  // Bearing, right side.
  const cx = 980;
  const cy = 180;
  const g = bearing({ cx, cy, rOuter: 120, rBore: 42, balls: 9, phase: -90 });
  b += `<path d="${g.outerRace}" fill-rule="evenodd" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<path d="${g.innerRace}" fill-rule="evenodd" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${g.cageRadius}" fill="none" stroke="${C.iron}" stroke-width="1" stroke-dasharray="5 6" opacity="0.7"/>`;
  g.ballCentres.forEach((p: Point, i: number) => {
    const fill = i === 0 ? C.accent : BALL;
    b += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${g.ballRadius.toFixed(2)}" fill="${fill}" stroke="${C.ink}" stroke-width="1.5"/>`;
  });

  // Small gear, bottom right.
  b += `<path d="${gearPath({ cx: 1120, cy: 300, rTip: 52, rRoot: 40, teeth: 11, phase: 8 })}" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<circle cx="1120" cy="300" r="13" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Witness, read the damage, name the cause. Defect intelligence for rotating equipment.">
  ${DEFS}
${b}
</svg>
`;
}

function explodedSvg(): string {
  const cy = 150;
  const cols = [120, 250, 380, 510];
  const g = bearing({ cx: 0, cy, rOuter: 74, rBore: 26, balls: 9, phase: -90 });
  const parts = [
    { n: "1", label: "Outer race", note: "hardened ring" },
    { n: "2", label: "Cage", note: "ball spacing" },
    { n: "3", label: "Rolling element", note: "9 off" },
    { n: "4", label: "Inner race", note: "shaft fit" },
  ];
  let b = "";
  b += `<line x1="60" y1="${cy}" x2="600" y2="${cy}" stroke="${C.iron}" stroke-width="1" stroke-dasharray="14 4 3 4" opacity="0.5"/>`;
  b += `<circle cx="${cols[0]}" cy="${cy}" r="74" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<circle cx="${cols[0]}" cy="${cy}" r="60" fill="${C.card}" stroke="${C.iron}" stroke-width="1.25"/>`;
  b += `<circle cx="${cols[1]}" cy="${cy}" r="58" fill="none" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${cols[1]}" cy="${cy}" r="44" fill="none" stroke="${C.ink}" stroke-width="1.25"/>`;
  for (const p of boltCircle(cols[1], cy, 51, 9))
    b += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="6.5" fill="${C.card}" stroke="${C.ink}" stroke-width="1"/>`;
  b += `<circle cx="${cols[2]}" cy="${cy}" r="${g.ballOrbit.toFixed(2)}" fill="none" stroke="${C.accent}" stroke-width="1" stroke-dasharray="5 6" opacity="0.6"/>`;
  boltCircle(cols[2], cy, g.ballOrbit, 9).forEach((p: Point, i: number) => {
    b += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="9" fill="${i === 0 ? C.accent : BALL}" stroke="${C.ink}" stroke-width="1.25"/>`;
  });
  b += `<circle cx="${cols[3]}" cy="${cy}" r="44" fill="${STEEL}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<circle cx="${cols[3]}" cy="${cy}" r="26" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<path d="M ${cols[3] - 6} ${cy - 26} h 12 M ${cols[3] - 6} ${cy + 26} h 12" stroke="${C.ink}" stroke-width="1"/>`;
  parts.forEach((p, i) => {
    const r = i === 3 ? 44 : i === 0 ? 74 : 58;
    b += `<line x1="${cols[i]}" y1="${cy + r}" x2="${cols[i]}" y2="237" stroke="${C.iron}" stroke-width="0.75" stroke-dasharray="3 3" opacity="0.6"/>`;
    b += `<circle cx="${cols[i]}" cy="248" r="11" fill="none" stroke="${C.accent}" stroke-width="1.25"/>`;
    b += text(cols[i], 252, p.n, { size: 12, weight: 600, anchor: "middle" });
    b += text(cols[i], 278, p.label, { size: 11.5, weight: 600, anchor: "middle" });
    b += text(cols[i], 292, p.note, { size: 10, fill: C.iron, font: MONO, anchor: "middle" });
  });
  b += text(60, 28, "FIG. 4 · EXPLODED ASSEMBLY · DEEP-GROOVE BALL BEARING", { size: 11, fill: C.iron, font: MONO });
  return card(640, 300, b, "Exploded assembly of a deep-groove ball bearing: outer race, cage, rolling elements, inner race.");
}

/* -------------------------------------------------------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "docs", "assets");
mkdirSync(out, { recursive: true });

const files: Array<[string, string]> = [
  ["banner.svg", bannerSvg()],
  ["fig-bearing.svg", bearingSvg()],
  ["fig-gear-mesh.svg", gearSvg()],
  ["fig-exploded.svg", explodedSvg()],
  ["fig-workflow.svg", workflowSvg()],
];

for (const [name, svg] of files) {
  writeFileSync(join(out, name), svg, "utf8");
  console.log(`wrote docs/assets/${name} (${svg.length} bytes)`);
}
