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

function card(w: number, h: number, body: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
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
  b += `<path d="${g.outerRace}" fill-rule="evenodd" fill="${C.steel}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<path d="${g.innerRace}" fill-rule="evenodd" fill="${C.steel}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${g.cageRadius}" fill="none" stroke="${C.iron}" stroke-width="1" stroke-dasharray="5 6" opacity="0.7"/>`;
  for (const p of g.ballCentres) {
    b += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${g.ballRadius.toFixed(2)}" fill="${C.card}" stroke="${C.ink}" stroke-width="1.25"/>`;
  }
  for (const c of callouts) {
    b += `<path d="${leader(c.at, c.to, 0)}" fill="none" stroke="${C.accent}" stroke-width="1" opacity="0.55"/>`;
    b += `<circle cx="${c.at.x.toFixed(2)}" cy="${c.at.y.toFixed(2)}" r="3" fill="${C.accent}"/>`;
    b += text(c.to.x + 10, c.to.y - 3, c.label, { size: 13, weight: 600 });
    b += text(c.to.x + 10, c.to.y + 14, c.note, { size: 11, fill: C.iron, font: MONO });
  }
  b += text(20, 326, "FIG. 1 — ROLLING BEARING · ISO 15243", { size: 11, fill: C.iron, font: MONO });
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
  b += `<path d="${gearPath({ ...wheel, phase: 0 })}" fill="${C.steel}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${wheel.cx}" cy="${wheel.cy}" r="26" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${wheel.cx}" cy="${wheel.cy}" r="9" fill="none" stroke="${C.iron}" stroke-width="1"/>`;
  b += `<path d="${gearPath({ ...pinion, phase: meshPhase(pinion.teeth) })}" fill="${C.steel}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${pinion.cx}" cy="${pinion.cy}" r="20" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.25"/>`;
  b += `<circle cx="${pinion.cx}" cy="${pinion.cy}" r="7" fill="none" stroke="${C.iron}" stroke-width="1"/>`;
  for (const c of callouts) {
    b += `<path d="${leader(c.at, c.to, 0)}" fill="none" stroke="${C.accent}" stroke-width="1" opacity="0.55"/>`;
    b += `<circle cx="${c.at.x.toFixed(2)}" cy="${c.at.y.toFixed(2)}" r="3" fill="${C.accent}"/>`;
    b += text(c.to.x, c.to.y - 4, c.label, { size: 13, weight: 600, anchor: "middle" });
    b += text(c.to.x, c.to.y + 13, c.note, { size: 11, fill: C.iron, font: MONO, anchor: "middle" });
  }
  b += text(20, 348, "FIG. 2 — SPUR MESH · ISO 10825", { size: 11, fill: C.iron, font: MONO });
  return card(560, 356, b, "Spur wheel driving a pinion with ISO 10825 damage classes called out.");
}

function workflowSvg(): string {
  const stages = [
    { t: "Photograph", s: "bench camera" },
    { t: "Intake", s: "EXIF · pHash" },
    { t: "Anomaly", s: "PatchCore" },
    { t: "ISO mode", s: "forced choice" },
    { t: "Gate", s: "confidence" },
  ];
  const y = 96;
  const x0 = 82;
  const span = 560;
  const step = span / (stages.length - 1);
  const gateX = x0 + step * 4;
  const autoY = 40;
  const reviewY = 156;
  const outX = gateX + 118;

  let b = "";
  b += `<line x1="${x0}" y1="${y}" x2="${gateX}" y2="${y}" stroke="${C.accent}" stroke-width="2"/>`;
  b += `<path d="M ${gateX} ${y} C ${gateX + 36} ${y}, ${gateX + 36} ${autoY}, ${gateX + 76} ${autoY}" fill="none" stroke="${C.accent}" stroke-width="1.5"/>`;
  b += `<path d="M ${gateX} ${y} C ${gateX + 36} ${y}, ${gateX + 36} ${reviewY}, ${gateX + 76} ${reviewY}" fill="none" stroke="${C.accent}" stroke-width="1.5"/>`;
  stages.forEach((st, i) => {
    const x = x0 + i * step;
    b += `<circle cx="${x}" cy="${y}" r="7" fill="${C.accent}"/>`;
    b += `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${C.iron}" stroke-width="1" opacity="0.5"/>`;
    b += text(x, y - 30, st.t, { size: 14, weight: 600, anchor: "middle" });
    b += text(x, y + 40, st.s, { size: 11, fill: C.iron, font: MONO, anchor: "middle" });
  });
  b += `<rect x="${outX - 52}" y="${autoY - 17}" width="150" height="34" rx="3" fill="${C.paper}" stroke="${C.iron}"/>`;
  b += text(outX + 23, autoY + 5, "Files automatically", { size: 12, anchor: "middle" });
  b += `<rect x="${outX - 52}" y="${reviewY - 17}" width="150" height="34" rx="3" fill="${C.paper}" stroke="${C.accent}" stroke-width="1.25"/>`;
  b += text(outX + 23, reviewY + 5, "Inspector reviews", { size: 12, anchor: "middle" });
  const cubeX = outX + 186;
  b += `<path d="M ${outX + 98} ${autoY} C ${outX + 138} ${autoY}, ${outX + 138} ${y}, ${cubeX - 8} ${y}" fill="none" stroke="${C.iron}" stroke-width="1.25" opacity="0.7"/>`;
  b += `<path d="M ${outX + 98} ${reviewY} C ${outX + 138} ${reviewY}, ${outX + 138} ${y}, ${cubeX - 8} ${y}" fill="none" stroke="${C.iron}" stroke-width="1.25" opacity="0.7"/>`;
  b += `<circle cx="${cubeX}" cy="${y}" r="7" fill="${C.accent}"/>`;
  b += text(cubeX, y - 26, "Insight", { size: 14, weight: 600, anchor: "middle" });
  b += text(cubeX, y + 34, "fleet cube", { size: 11, fill: C.iron, font: MONO, anchor: "middle" });
  b += text(20, 226, "FIG. 3 — PIPELINE · PHOTOGRAPH TO FINDING", { size: 11, fill: C.iron, font: MONO });
  return card(1000, 240, b, "The pipeline from photograph to reviewed finding, with the confidence gate splitting auto-filed from human-reviewed records.");
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
  b += `<path d="${g.outerRace}" fill-rule="evenodd" fill="${C.steel}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<path d="${g.innerRace}" fill-rule="evenodd" fill="${C.steel}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${g.cageRadius}" fill="none" stroke="${C.iron}" stroke-width="1" stroke-dasharray="5 6" opacity="0.7"/>`;
  g.ballCentres.forEach((p: Point, i: number) => {
    const fill = i === 0 ? C.accent : C.card;
    b += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${g.ballRadius.toFixed(2)}" fill="${fill}" stroke="${C.ink}" stroke-width="1.5"/>`;
  });

  // Small gear, bottom right.
  b += `<path d="${gearPath({ cx: 1120, cy: 300, rTip: 52, rRoot: 40, teeth: 11, phase: 8 })}" fill="${C.steel}" stroke="${C.ink}" stroke-width="1.5"/>`;
  b += `<circle cx="1120" cy="300" r="13" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Witness — read the damage, name the cause. Defect intelligence for rotating equipment.">
${b}
</svg>
`;
}

/* -------------------------------------------------------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "docs", "assets");
mkdirSync(out, { recursive: true });

const files: Array<[string, string]> = [
  ["banner.svg", bannerSvg()],
  ["fig-bearing.svg", bearingSvg()],
  ["fig-gear-mesh.svg", gearSvg()],
  ["fig-workflow.svg", workflowSvg()],
];

for (const [name, svg] of files) {
  writeFileSync(join(out, name), svg, "utf8");
  console.log(`wrote docs/assets/${name} (${svg.length} bytes)`);
}
