import { describe, expect, it } from "vitest";
import { BEARING_MODES, GEAR_MODES, SEVERITY, modeLabel, familyForStandard } from "./iso";
import { CONFIDENCE_GATE, agreement, forceChoice, validReview, reviewStateLabel } from "./gate";
import { applyFilter, countBy, crossTab, type Finding } from "./buckets";
import { scoreProvenance, provenanceBand } from "./provenance";
import { toCsv } from "./csv";

describe("iso catalogue", () => {
  it("has unique codes per family and five severity grades", () => {
    for (const modes of [BEARING_MODES, GEAR_MODES]) {
      expect(new Set(modes.map((m) => m.code)).size).toBe(modes.length);
    }
    expect(SEVERITY.map((s) => s.level)).toEqual([0, 1, 2, 3, 4]);
  });
  it("resolves labels through the standard", () => {
    expect(familyForStandard("ISO 10825")).toBe("gear");
    expect(modeLabel("ISO 15243", "5.6")).toBe("Fracture and cracking");
    expect(modeLabel("ISO 15243", "nope")).toBe("nope");
  });
});

describe("forceChoice (stage-2 output guard)", () => {
  it("keeps an on-catalogue answer and its confidence", () => {
    const r = forceChoice('Sure: {"mode_code":"5.3","severity":2,"confidence":0.91,"rationale":"rust bloom"}', "bearing");
    expect(r).toMatchObject({ modeCode: "5.3", severity: 2, confidence: 0.91, rationale: "rust bloom" });
  });
  it("sends an invented code to a person: confidence 0, below the gate", () => {
    const r = forceChoice('{"mode_code":"9.9","severity":4,"confidence":0.97}', "bearing");
    expect(r.confidence).toBe(0);
    expect(r.confidence).toBeLessThan(CONFIDENCE_GATE);
    expect(r.rationale).toMatch(/not in ISO 15243/);
  });
  it("survives a reply that is not JSON", () => {
    const r = forceChoice("I cannot tell from this photo.", "gear");
    expect(r.confidence).toBe(0);
    expect(GEAR_MODES.map((m) => m.code)).toContain(r.modeCode);
  });
  it("clamps severity to the mode's ceiling and confidence to 0..1", () => {
    const r = forceChoice('{"mode_code":"5.2","severity":4,"confidence":7}', "bearing");
    expect(r.severity).toBe(2); // 5.2 wear ceiling
    expect(r.confidence).toBe(1);
  });
});

describe("validReview (inspector input guard)", () => {
  it("accepts a catalogue mode, integer severity, known cause", () => {
    expect(validReview({ mode: "5.1", severity: "3", attribution: "" }, "bearing")).toEqual({
      mode: "5.1",
      severity: 3,
      attribution: null,
    });
  });
  it("rejects a mode from the other family, a bad severity, an unknown cause", () => {
    expect(validReview({ mode: "scuff", severity: 1, attribution: null }, "bearing")).toBeNull();
    expect(validReview({ mode: "5.1", severity: 5, attribution: null }, "bearing")).toBeNull();
    expect(validReview({ mode: "5.1", severity: 1.5, attribution: null }, "bearing")).toBeNull();
    expect(validReview({ mode: "5.1", severity: 1, attribution: "gremlins" }, "bearing")).toBeNull();
  });
  it("labels review states for people", () => {
    expect(reviewStateLabel("queued")).toBe("Awaiting review");
    expect(reviewStateLabel("weird")).toBe("weird");
  });
});

describe("agreement (gate calibration)", () => {
  it("counts only human-reviewed rows that carry a model call", () => {
    const a = agreement([
      { model_mode: "5.1", iso_mode: "5.1", review_state: "confirmed" },
      { model_mode: "5.1", iso_mode: "5.3", review_state: "corrected" },
      { model_mode: "5.1", iso_mode: "5.1", review_state: "auto" },
      { model_mode: null, iso_mode: "5.1", review_state: "confirmed" },
    ]);
    expect(a.reviewed).toBe(2);
    expect(a.byMode[0]).toEqual({ mode: "5.1", reviewed: 2, agreed: 1, rate: 0.5 });
  });
});

describe("bucket engine", () => {
  const F: Finding[] = [
    { mode: "5.1", standard: "ISO 15243", severity: 3, attribution: "lubrication" },
    { mode: "5.1", standard: "ISO 15243", severity: 2, attribution: null },
    { mode: "5.3", standard: "ISO 15243", severity: 3, attribution: "lubrication" },
  ];
  it("filters on any axis and counts without an unattributed bucket", () => {
    expect(applyFilter(F, { severities: new Set([3]) })).toHaveLength(2);
    expect(countBy(F, "attribution").get("lubrication")).toBe(2);
    expect(countBy(F, "attribution").has("")).toBe(false);
  });
  it("cross-tabulates mode × severity in catalogue order", () => {
    const ct = crossTab(F, ["5.3", "5.1"]);
    expect(ct.modes).toEqual(["5.3", "5.1"]);
    expect(ct.cells.get("5.1|3")).toBe(1);
    expect(ct.colTotal.get(3)).toBe(2);
    expect(ct.total).toBe(3);
  });
});

describe("provenance", () => {
  it("caps a duplicate at 30 whatever its metadata", () => {
    const exif = { DateTimeOriginal: "x", Make: "x", FNumber: 2, latitude: 1 };
    expect(scoreProvenance({ exif, duplicate: false, filename: "IMG_0001.jpg" }).score).toBe(100);
    expect(scoreProvenance({ exif, duplicate: true, filename: "IMG_0001.jpg" }).score).toBe(30);
    expect(provenanceBand(30)).toBe("low");
  });
});

describe("csv", () => {
  it("quotes fields and defuses spreadsheet formulas", () => {
    const out = toCsv([{ a: 'say "hi", ok', b: "=HYPERLINK(1)", c: -3 }]);
    expect(out).toBe('"a","b","c"\r\n"say ""hi"", ok","\'=HYPERLINK(1)","-3"\r\n');
  });
});
