"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-sm bg-black px-4 py-2 text-sm font-medium text-white print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
