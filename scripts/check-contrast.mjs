// WCAG contrast gate for the design tokens. Reads the hex values straight from
// src/app/globals.css, so a token edit that drops a text pair below AA fails CI
// instead of shipping. Each pair below is a real text/background combination
// used in the app at small sizes, so every pair needs 4.5:1.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const token = (name) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --color-${name} not found`);
  return m[1];
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const PAIRS = [
  ["paper", "ground"],
  ["paper-2", "ground"],
  ["iron", "ground"],
  ["brass", "ground"],
  ["oxide", "ground"],
  ["on-accent", "oxide"],
  ["on-accent", "oxide-deep"],
  ["c-text", "c-surface"],
  ["c-text-2", "c-surface"],
  ["c-text-3", "c-surface"],
  ["c-text-3", "c-surface-2"],
  ["c-text-3", "c-ground"],
  ...[0, 1, 2, 3, 4].flatMap((n) => [
    [`sev-${n}-ink`, `sev-${n}-bg`],
    [`sev-${n}-ink`, "c-surface"],
  ]),
];

let failed = 0;
for (const [fg, bg] of PAIRS) {
  const r = ratio(token(fg), token(bg));
  const ok = r >= 4.5;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)}  ${fg} on ${bg}`);
}
if (failed) {
  console.error(`\n${failed} pair(s) below WCAG AA 4.5:1`);
  process.exit(1);
}
console.log("\nall text pairs meet WCAG AA");
