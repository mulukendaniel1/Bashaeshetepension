import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders an A4 print layout straight into document.body.
 * It stays hidden on screen and is the only thing shown when printing.
 * The styles live in src/print-a4.css.
 */
export default function PrintSheet({ children }: { children: ReactNode }) {
  return createPortal(<div className="a4-print">{children}</div>, document.body);
}