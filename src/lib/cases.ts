// Case vocabulary and input rules. Pure, so the pages, the server actions and
// the unit tests share one definition. The same enums are CHECK constraints in
// supabase/migrations/20260927140000_cases.sql; change both together.

export const CASE_STATUSES = [
  { code: "open", label: "Open" },
  { code: "inspecting", label: "Inspecting" },
  { code: "closed", label: "Closed" },
] as const;

export const DISPOSITIONS = [
  { code: "warranty_accepted", label: "Warranty accepted" },
  { code: "warranty_rejected", label: "Warranty rejected" },
  { code: "repair", label: "Repair and return" },
  { code: "scrap", label: "Scrap" },
  { code: "return_to_supplier", label: "Return to supplier" },
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number]["code"];
export type Disposition = (typeof DISPOSITIONS)[number]["code"];

export const statusLabel = (c: string) => CASE_STATUSES.find((s) => s.code === c)?.label ?? c;
export const dispositionLabel = (c: string | null) =>
  c ? (DISPOSITIONS.find((d) => d.code === c)?.label ?? c) : "Undecided";

export interface CaseInput {
  rma: string;
  customer: string | null;
  part_serial: string | null;
  run_hours: number | null;
  return_reason: string | null;
  status: CaseStatus;
  disposition: Disposition | null;
  notes: string | null;
}

const text = (v: FormDataEntryValue | null, max: number) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

/**
 * Read and check a case form. Returns the clean row or a message for the
 * person who filled it in. A case cannot close without a disposition: closing
 * is the moment the plant commits to what happens to the part.
 */
export function parseCase(fd: FormData): { ok: true; value: CaseInput } | { ok: false; error: string } {
  const rma = text(fd.get("rma"), 64);
  if (!rma) return { ok: false, error: "An RMA number is required." };

  const hoursRaw = text(fd.get("run_hours"), 12);
  const run_hours = hoursRaw === null ? null : Number(hoursRaw);
  if (run_hours !== null && (!Number.isInteger(run_hours) || run_hours < 0)) {
    return { ok: false, error: "Run hours must be a whole number, zero or more." };
  }

  const status = (text(fd.get("status"), 20) ?? "open") as CaseStatus;
  if (!CASE_STATUSES.some((s) => s.code === status)) return { ok: false, error: "Unknown status." };

  const disposition = text(fd.get("disposition"), 40) as Disposition | null;
  if (disposition && !DISPOSITIONS.some((d) => d.code === disposition)) {
    return { ok: false, error: "Unknown disposition." };
  }
  if (status === "closed" && !disposition) {
    return { ok: false, error: "Choose a disposition before closing the case." };
  }

  return {
    ok: true,
    value: {
      rma,
      customer: text(fd.get("customer"), 120),
      part_serial: text(fd.get("part_serial"), 80),
      run_hours,
      return_reason: text(fd.get("return_reason"), 500),
      status,
      disposition,
      notes: text(fd.get("notes"), 2000),
    },
  };
}
