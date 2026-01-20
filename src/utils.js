export const INCOME_SOURCES = [
  "Salary",
  "Freelance",
  "Allowance",
  "Scholarship",
  "Gift",
  "Other"
];

export const EXPENSE_CATEGORIES = [
  { key: "fixed", label: "Fixed Costs" },
  { key: "invest", label: "Long-Term Investments" },
  { key: "save_big", label: "Savings: Big Goals" },
  { key: "save_irregular", label: "Savings: Irregular Expenses" },
  { key: "guiltfree", label: "Guilt-Free Spending" }
];

export const BUCKETS = [
  { key: "fixed", label: "Fixed Costs" },
  { key: "invest", label: "Long-Term Investments" },
  { key: "save_big", label: "Savings: Big Goals" },
  { key: "save_irregular", label: "Savings: Irregular Expenses" },
  { key: "guiltfree", label: "Guilt-Free Spending" }
];

export function uuid() {
  // simple stable UUID for local app use
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function startOfDayISO(iso) {
  // expects YYYY-MM-DD
  return new Date(`${iso}T00:00:00`);
}

export function cmpDateDesc(aISO, bISO) {
  return startOfDayISO(bISO) - startOfDayISO(aISO);
}

export function withinDateRange(iso, fromISO, toISO) {
  const d = startOfDayISO(iso).getTime();
  const from = fromISO ? startOfDayISO(fromISO).getTime() : null;
  const to = toISO ? startOfDayISO(toISO).getTime() : null;
  if (from !== null && d < from) return false;
  if (to !== null && d > to) return false;
  return true;
}

export function defaultAllocations() {
  // Must be valid:
  // Fixed: 55 (50-60)
  // Invest: 10 fixed
  // Savings total: 20 fixed split 10/10
  // Guilt-free: 15 (10-20)
  return {
    fixedPct: 55,
    investPct: 10,
    saveBigPct: 10,
    saveIrregularPct: 10,
    guiltFreePct: 15
  };
}

export function validateAllocations(a, enabledSavings = { invest: true, save_big: true, save_irregular: true }) {
  const errors = [];
  const fixed = safeNumber(a.fixedPct);
  const guilt = safeNumber(a.guiltFreePct);
  const invest = safeNumber(a.investPct);
  const big = safeNumber(a.saveBigPct);
  const irr = safeNumber(a.saveIrregularPct);

  if (!Number.isFinite(fixed)) errors.push("Fixed Costs percentage must be a number.");
  if (!Number.isFinite(guilt)) errors.push("Guilt-Free percentage must be a number.");

  if (Number.isFinite(fixed) && (fixed < 50 || fixed > 60)) {
    errors.push("Fixed Costs must be between 50 and 60 (inclusive).");
  }
  if (Number.isFinite(guilt) && (guilt < 10 || guilt > 20)) {
    errors.push("Guilt-Free Spending must be between 10 and 20 (inclusive).");
  }

  const investEnabled = !!enabledSavings.invest;
  const bigEnabled = !!enabledSavings.save_big;
  const irrEnabled = !!enabledSavings.save_irregular;

  if (!investEnabled && invest !== 0) errors.push("Long-Term Investments must be 0% when disabled.");
  if (!bigEnabled && big !== 0) errors.push("Big Goals must be 0% when disabled.");
  if (!irrEnabled && irr !== 0) errors.push("Irregular Expenses must be 0% when disabled.");

  const total = fixed + invest + big + irr + guilt;
  if (Number.isFinite(total) && Math.abs(total - 100) > 1e-9) {
    errors.push(`Total allocations must equal 100%. Current total: ${total}%.`);
  }
  return { ok: errors.length === 0, errors };
}

export function formatDatePretty(iso) {
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}
