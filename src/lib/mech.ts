// Geometry for the mechanical drawings — the parts Witness actually inspects.
//
// One source of truth. The React components under src/components/mechanical.tsx
// render these paths in the app; scripts/gen-diagrams.ts renders the same paths
// into the static SVG files the README embeds. If the drawings ever disagree,
// one of the two forgot to re-run the generator, not the maths.
//
// Angles are degrees, 0 = east, increasing clockwise in SVG's y-down space.

function n(v: number): string {
  return Number(v.toFixed(2)).toString();
}

export interface Point {
  x: number;
  y: number;
}

export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** A ring, drawn as one path. Render with fillRule="evenodd" to punch the bore. */
export function annulus(cx: number, cy: number, rOuter: number, rInner: number): string {
  const ring = (r: number) =>
    `M ${n(cx - r)} ${n(cy)} a ${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0 Z`;
  return `${ring(rOuter)} ${ring(rInner)}`;
}

export interface GearSpec {
  cx: number;
  cy: number;
  /** Root circle — the valley between teeth. */
  rRoot: number;
  /** Tip circle — the crest of a tooth. */
  rTip: number;
  teeth: number;
  /** Tooth width at the root, as a fraction of the angular pitch. */
  rootSpan?: number;
  /** Tooth width at the tip, as a fraction of the angular pitch. Smaller than
   *  rootSpan, which is what gives the flank its taper. */
  tipSpan?: number;
  /** Rotate the whole gear. Used to mesh a pair: one gear is offset by half a
   *  pitch so its teeth fall into the other's valleys. */
  phase?: number;
}

/**
 * A spur gear as a single closed path: root arc, up the leading flank, across
 * the tip, down the trailing flank, repeat. Not an involute profile — a
 * trapezoidal approximation, which is what a schematic wants and what reads
 * correctly at 200 px wide.
 */
export function gearPath(spec: GearSpec): string {
  const { cx, cy, rRoot, rTip, teeth, rootSpan = 0.3, tipSpan = 0.17, phase = 0 } = spec;
  const pitch = 360 / teeth;
  const first = polar(cx, cy, rRoot, phase - pitch * rootSpan);
  let d = `M ${n(first.x)} ${n(first.y)}`;

  for (let i = 0; i < teeth; i++) {
    const c = phase + i * pitch;
    const p1 = polar(cx, cy, rRoot, c - pitch * rootSpan);
    const p2 = polar(cx, cy, rTip, c - pitch * tipSpan);
    const p3 = polar(cx, cy, rTip, c + pitch * tipSpan);
    const p4 = polar(cx, cy, rRoot, c + pitch * rootSpan);
    if (i > 0) d += ` A ${n(rRoot)} ${n(rRoot)} 0 0 1 ${n(p1.x)} ${n(p1.y)}`;
    d += ` L ${n(p2.x)} ${n(p2.y)}`;
    d += ` A ${n(rTip)} ${n(rTip)} 0 0 1 ${n(p3.x)} ${n(p3.y)}`;
    d += ` L ${n(p4.x)} ${n(p4.y)}`;
  }

  d += ` A ${n(rRoot)} ${n(rRoot)} 0 0 1 ${n(first.x)} ${n(first.y)} Z`;
  return d;
}

/** Half a pitch, in degrees. A meshing pinion is offset by this. */
export function meshPhase(teeth: number): number {
  return 180 / teeth;
}

export interface BearingSpec {
  cx: number;
  cy: number;
  /** Outside diameter of the outer race. */
  rOuter: number;
  /** Bore radius. */
  rBore: number;
  balls: number;
  /** Rotate the ball set. */
  phase?: number;
}

export interface BearingGeometry {
  outerRace: string;
  innerRace: string;
  ballOrbit: number;
  ballRadius: number;
  ballCentres: Point[];
  cageRadius: number;
}

/**
 * A deep-groove ball bearing seen face-on. The four radii are derived from the
 * outside diameter and the bore so the drawing stays in proportion at any size:
 * races take a quarter of the annular span each, the rolling elements take the
 * half between them.
 */
export function bearing(spec: BearingSpec): BearingGeometry {
  const { cx, cy, rOuter, rBore, balls, phase = 0 } = spec;
  const span = rOuter - rBore;
  const raceThickness = span * 0.26;
  const rOuterRaceInner = rOuter - raceThickness;
  const rInnerRaceOuter = rBore + raceThickness;
  const ballOrbit = (rOuterRaceInner + rInnerRaceOuter) / 2;
  const ballRadius = ((rOuterRaceInner - rInnerRaceOuter) / 2) * 0.92;

  const ballCentres: Point[] = [];
  for (let i = 0; i < balls; i++) {
    ballCentres.push(polar(cx, cy, ballOrbit, phase + (i * 360) / balls));
  }

  return {
    outerRace: annulus(cx, cy, rOuter, rOuterRaceInner),
    innerRace: annulus(cx, cy, rInnerRaceOuter, rBore),
    ballOrbit,
    ballRadius,
    ballCentres,
    cageRadius: ballOrbit,
  };
}

/** A leader line from a callout label to a point on the drawing, with an elbow. */
export function leader(from: Point, to: Point, elbow = 14): string {
  const dir = to.x >= from.x ? 1 : -1;
  const mid = from.x + dir * elbow;
  return `M ${n(from.x)} ${n(from.y)} L ${n(mid)} ${n(from.y)} L ${n(to.x)} ${n(to.y)}`;
}

/** A regular hexagon (bolt head, seen on the flats), pointy-top by default. */
export function hexPath(cx: number, cy: number, r: number, phase = -90): string {
  const pts = Array.from({ length: 6 }, (_, i) => polar(cx, cy, r, phase + i * 60));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${n(p.x)} ${n(p.y)}`).join(" ") + " Z";
}

/** Centres on a bolt circle. Catalogue plates and flanges sit on these. */
export function boltCircle(cx: number, cy: number, r: number, count: number, phase = -90): Point[] {
  return Array.from({ length: count }, (_, i) => polar(cx, cy, r, phase + (i * 360) / count));
}

/**
 * A helical compression spring drawn side-on between two x positions, as a
 * single zig-zag path. Coils is the number of full turns; amp is the radius.
 */
export function springPath(x0: number, x1: number, cy: number, coils: number, amp: number): string {
  const segs = coils * 2;
  const dx = (x1 - x0) / segs;
  let d = `M ${n(x0)} ${n(cy)}`;
  for (let i = 1; i <= segs; i++) {
    const x = x0 + i * dx;
    const y = cy + (i % 2 === 0 ? 0 : i % 4 === 1 ? -amp : amp);
    d += ` L ${n(x)} ${n(y)}`;
  }
  return d;
}
