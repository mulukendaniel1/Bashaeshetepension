import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a receipt layout straight into document.body.
 * It stays hidden on screen and is the only thing shown when printing.
 * See src/print-thermal.css.
 */
export default function ThermalPrint({ children }: { children: ReactNode }) {
  return createPortal(<div className="thermal-print">{children}</div>, document.body);
}

export function ThermalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`tp-row ${bold ? "tp-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}