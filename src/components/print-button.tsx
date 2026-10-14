"use client";

export function PrintButton() {
  return (
    <button type="button" className="button button-primary" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
