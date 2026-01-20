import { getRatesCache, setRatesCache } from "./db.js";

/**
 * Currency conversion:
 * - We store all transactions in BASE currency.
 * - We only convert for display.
 * - We use Frankfurter (free, no key).
 *
 * Endpoint:
 *   https://api.frankfurter.app/latest?from=USD
 *
 * Response:
 *   { amount: 1.0, base: "USD", date: "2024-xx-xx", rates: { EUR: 0.92, ... } }
 */

const FRANKFURTER_LATEST = "https://api.frankfurter.app/latest";

export const COMMON_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD",
  "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN",
  "TRY", "ILS", "ZAR", "SGD", "HKD", "CNY", "INR", "KRW",
  "PHP", "THB", "MYR", "IDR"
];

// Frankfurter supports a specific set; if user chooses unsupported, fetch may fail.
// We still keep UI list reasonable.

export async function fetchRates(base) {
  const url = `${FRANKFURTER_LATEST}?from=${encodeURIComponent(base)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Rates fetch failed (${res.status})`);
  const data = await res.json();
  if (!data || !data.rates) throw new Error("Rates response invalid");
  return {
    base: data.base || base,
    rates: data.rates,
    fetchedAt: Date.now(),
    source: "frankfurter.app",
    date: data.date || null
  };
}

export async function ensureRates(base, { maxAgeMs = 1000 * 60 * 60 * 12 } = {}) {
  // Prefer fresh cache; fallback to stale cache; if no cache, try fetch.
  const cached = await getRatesCache(base);
  const now = Date.now();

  if (cached && cached.fetchedAt && (now - cached.fetchedAt) <= maxAgeMs) {
    return { rates: cached, warning: null, fromCache: true };
  }

  try {
    const fresh = await fetchRates(base);
    await setRatesCache(fresh);
    return { rates: fresh, warning: null, fromCache: false };
  } catch (e) {
    if (cached) {
      return {
        rates: cached,
        warning: "Could not refresh exchange rates. Using cached rates.",
        fromCache: true
      };
    }
    throw e;
  }
}

export function getRate(baseRatesRecord, toCurrency) {
  if (!baseRatesRecord) return null;
  if (toCurrency === baseRatesRecord.base) return 1;
  const r = baseRatesRecord.rates?.[toCurrency];
  return Number.isFinite(r) ? r : null;
}

export function convertBaseToDisplay(amountBase, baseRatesRecord, displayCurrency) {
  const rate = getRate(baseRatesRecord, displayCurrency);
  if (!Number.isFinite(amountBase) || rate === null) return null;
  return amountBase * rate;
}

export function convertDisplayToBase(amountDisplay, baseRatesRecord, displayCurrency) {
  const rate = getRate(baseRatesRecord, displayCurrency);
  if (!Number.isFinite(amountDisplay) || rate === null) return null;
  // amountDisplay = amountBase * rate  => amountBase = amountDisplay / rate
  return amountDisplay / rate;
}