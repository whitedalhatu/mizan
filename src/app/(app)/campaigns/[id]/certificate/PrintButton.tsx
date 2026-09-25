"use client";

import { btn } from "../../../ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btn}>Print / Save as PDF</button>
  );
}
