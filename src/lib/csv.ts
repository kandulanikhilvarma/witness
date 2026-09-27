// RFC 4180 CSV from flat rows. Every field is quoted, so commas, quotes and
// line breaks in mode labels or notes survive. A leading =, +, - or @ is
// prefixed with a quote character so a spreadsheet never runs a cell as a
// formula (CSV injection).
export function toCsv(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: string | number | null) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s) && typeof v === "string") s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [cols.map(cell).join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n") + "\r\n";
}
