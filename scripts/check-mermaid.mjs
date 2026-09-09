#!/usr/bin/env node
// GitHub's pinned Mermaid fails on a literal "&" inside a diagram block. Scan
// every tracked Markdown file's ```mermaid fences and reject the character
// before it reaches a README push. Exit 1 on any hit.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// No shell glob — cmd.exe on Windows would pass the quotes through literally.
const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f.endsWith(".md"));

let bad = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  let inBlock = false;
  let fence = 0;
  lines.forEach((line, i) => {
    if (/^```mermaid\s*$/.test(line.trim())) {
      inBlock = true;
      fence = i + 1;
      return;
    }
    if (inBlock && line.trim() === "```") {
      inBlock = false;
      return;
    }
    if (inBlock && line.includes("&")) {
      console.error(`check-mermaid: ${file}:${i + 1} — "&" in mermaid block (opened at line ${fence})`);
      bad++;
    }
  });
}

if (bad > 0) {
  console.error(`check-mermaid: FAIL — ${bad} ampersand(s) in mermaid blocks.`);
  process.exit(1);
}
console.log(`check-mermaid: OK — scanned ${files.length} markdown file(s).`);
