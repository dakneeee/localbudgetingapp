import React from "react";

export default function Money({ value, currency, showSign = false, className = "" }) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;

  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Math.abs(safe));

  const sign = showSign ? (safe > 0 ? "+" : safe < 0 ? "−" : "") : "";
  return <span className={`mono ${className}`}>{sign}{formatted}</span>;
}