import "server-only";
import sharp from "sharp";
import { StubClassifier } from "./classifier";
import { extractFeatures } from "./pipeline";
import { modesFor, STANDARD, type PartFamily } from "./iso";

// Stage-2: given an anomalous part, force a choice among the ISO failure modes
// for its family. Two backends behind one call. The default is keyless and
// deterministic — the same feature heuristic Stage-0 uses — so the phase ships
// and the confidence gate + review queue are exercised with no external
// dependency. When OPENROUTER_API_KEY is set the call routes to a real vision
// model instead; the interface and the downstream gate do not change. A forced
// choice: the model may only return a code from the family's own catalog.

export const CONFIDENCE_GATE = 0.7;

export interface Stage2Result {
  modeCode: string;
  modeLabel: string;
  severity: number;
  confidence: number;
  rationale: string;
  source: string; // "keyless-stub" | "openrouter:<model>"
}

export function vlmConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function classifyCrop(buffer: Buffer, family: PartFamily): Promise<Stage2Result> {
  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await openRouterForcedChoice(buffer, family);
    } catch (e) {
      // A model outage must not strand a finding — fall back to the keyless
      // path and let the low confidence route it to human review. Log the
      // reason (never the key) so a misconfigured VLM is diagnosable.
      console.error("[stage2] OpenRouter failed, falling back to keyless:", e instanceof Error ? e.message : e);
    }
  }
  return keylessForcedChoice(buffer, family);
}

async function keylessForcedChoice(buffer: Buffer, family: PartFamily): Promise<Stage2Result> {
  const feats = await extractFeatures(buffer, family);
  const c = await new StubClassifier().classify({ ...feats, buffer });
  return {
    modeCode: c.modeCode,
    modeLabel: c.modeLabel,
    severity: c.severity,
    confidence: c.confidence,
    rationale: `Keyless heuristic over surface texture (edge density ${feats.edgeDensity.toFixed(2)}, contrast ${feats.contrast.toFixed(0)}). Deterministic, not a trained vision model — set OPENROUTER_API_KEY to route this through a VLM.`,
    source: "keyless-stub",
  };
}

async function openRouterForcedChoice(buffer: Buffer, family: PartFamily): Promise<Stage2Result> {
  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
  const modes = modesFor(family);
  const jpeg = await sharp(buffer, { failOn: "none" }).jpeg({ quality: 80 }).toBuffer();
  const dataUri = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  const list = modes.map((m) => `${m.code} = ${m.label}`).join("; ");

  const system = `You are a reliability engineer classifying ${family} damage under ${STANDARD[family]}. Choose exactly one failure mode from the given list — never a code outside it. Respond with ONLY compact JSON: {"mode_code": "<code>", "severity": <0-4>, "confidence": <0-1>, "rationale": "<one sentence>"}. Severity: 0 serviceable, 2 plan repair, 3 remove from service, 4 safety-critical. If unsure, still choose, and lower the confidence.`;
  const user = `Failure modes: ${list}. Classify the damage in this photograph.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "x-title": "Witness",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image_url", image_url: { url: dataUri } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  const j = await res.json();
  const text: string = j.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

  // Force the choice back onto the catalog — a hallucinated code is discarded.
  const mode = modes.find((m) => m.code === String(parsed.mode_code)) ?? modes[0];
  const severity = Math.min(mode.ceiling, Math.max(0, Math.round(Number(parsed.severity) || 0)));
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  return {
    modeCode: mode.code,
    modeLabel: mode.label,
    severity,
    confidence,
    rationale: String(parsed.rationale || "").slice(0, 500),
    source: `openrouter:${model}`,
  };
}
