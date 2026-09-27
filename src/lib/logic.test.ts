import { describe, expect, it } from "vitest";
import { BEARING_MODES, GEAR_MODES, SEVERITY, modeLabel, familyForStandard } from "./iso";
import { CONFIDENCE_GATE, agreement, forceChoice, routeFinding, validReview, reviewStateLabel } from "./gate";
import { applyFilter, countBy, crossTab, repeatSignals, type Finding } from "./buckets";
import { scoreProvenance, provenanceBand } from "./provenance";
import { toCsv } from "./csv";
import { parseCase } from "./cases";

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

describe("routeFinding (confidence gate + mode track record)", () => {
  it("queues below the gate and files above it with no history", () => {
    expect(routeFinding(0.69, null).state).toBe("queued");
    expect(routeFinding(0.7, null).state).toBe("auto");
  });
  it("queues a confident call on a mode inspectors often overturn", () => {
    expect(routeFinding(0.95, { reviewed: 40, agreed: 20 }).state).toBe("queued");
    expect(routeFinding(0.95, { reviewed: 40, agreed: 38 }).state).toBe("auto");
  });
  it("ignores a track record too short to trust", () => {
    expect(routeFinding(0.95, { reviewed: 5, agreed: 0 }).state).toBe("auto");
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

describe("parseCase", () => {
  const form = (o: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(o)) fd.set(k, v);
    return fd;
  };
  it("needs an RMA and trims blanks to null", () => {
    expect(parseCase(form({ rma: "  " })).ok).toBe(false);
    const r = parseCase(form({ rma: " RMA-1 ", customer: " ", run_hours: "1200" }));
    expect(r).toEqual({
      ok: true,
      value: expect.objectContaining({ rma: "RMA-1", customer: null, run_hours: 1200, status: "open" }),
    });
  });
  it("rejects fractional or negative hours and unknown enums", () => {
    expect(parseCase(form({ rma: "R", run_hours: "1.5" })).ok).toBe(false);
    expect(parseCase(form({ rma: "R", run_hours: "-2" })).ok).toBe(false);
    expect(parseCase(form({ rma: "R", status: "lost" })).ok).toBe(false);
    expect(parseCase(form({ rma: "R", disposition: "shrug" })).ok).toBe(false);
  });
  it("will not close a case without a disposition", () => {
    expect(parseCase(form({ rma: "R", status: "closed" })).ok).toBe(false);
    expect(parseCase(form({ rma: "R", status: "closed", disposition: "scrap" })).ok).toBe(true);
  });
});

describe("repeatSignals", () => {
  it("flags a mode repeating within one batch, worst first", () => {
    const A = [{ code: "LOT-A", supplier: "S1" }];
    const B = [{ code: "LOT-B", supplier: null }];
    const rows = [
      ...[1, 2, 3].map((severity) => ({ mode: "5.1", standard: "ISO 15243", severity, batches: A })),
      ...[4, 4, 4, 4].map((severity) => ({ mode: "crack", standard: "ISO 10825", severity, batches: B })),
      { mode: "5.3", standard: "ISO 15243", severity: 4, batches: A },
    ];
    const s = repeatSignals(rows);
    expect(s.map((x) => [x.batch, x.mode, x.count, x.worst])).toEqual([
      ["LOT-B", "crack", 4, 4],
      ["LOT-A", "5.1", 3, 3],
    ]);
  });
});
