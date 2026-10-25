/** RFC 4180 CSV: every field quoted, quotes doubled. Rows are objects with the same keys. */
export function toCsv(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const cell = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(cell).join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
}

/** Saves a CSV in the browser. The BOM makes Excel read ₹ and other UTF-8 correctly. */
export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
