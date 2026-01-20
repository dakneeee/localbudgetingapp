import { openDB } from "idb";
import { DEFAULT_THEME_KEY } from "./themes.js";
import { defaultAllocations } from "./utils.js";

const DB_NAME = "local_budget_db";
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
      if (!db.objectStoreNames.contains("transactions")) {
        const store = db.createObjectStore("transactions", { keyPath: "id" });
        store.createIndex("byDate", "date");
        store.createIndex("byType", "type");
        store.createIndex("byCategory", "category");
      }
      if (!db.objectStoreNames.contains("rates")) {
        db.createObjectStore("rates", { keyPath: "base" }); // one record per base
      }
    },
  });
}

export async function loadSettings() {
  const db = await getDB();
  const s = await db.get("settings", "app");
  if (s) {
    if (!s.enabledSavings) {
      s.enabledSavings = { invest: true, save_big: true, save_irregular: true };
    }
    if (!s.cycleStartISO) {
      s.cycleStartISO = new Date().toISOString().slice(0, 10);
    }
    if (!s.updatedAt) {
      s.updatedAt = Date.now();
      await db.put("settings", s, "app");
    }
    return s;
  }

  const defaults = {
    period: "monthly", // "weekly" | "monthly"
    baseCurrency: "USD",
    displayCurrency: "USD",
    name: "",
    theme: DEFAULT_THEME_KEY,
    enabledSavings: { invest: true, save_big: true, save_irregular: true },
    cycleStartISO: new Date().toISOString().slice(0, 10),
    allocations: defaultAllocations(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await db.put("settings", defaults, "app");
  return defaults;
}

export async function saveSettings(settings) {
  const db = await getDB();
  await db.put("settings", settings, "app");
}

export async function listTransactions() {
  const db = await getDB();
  return db.getAll("transactions");
}

export async function getTransaction(id) {
  const db = await getDB();
  return db.get("transactions", id);
}

export async function upsertTransaction(tx) {
  const db = await getDB();
  await db.put("transactions", tx);
}

export async function deleteTransaction(id) {
  const db = await getDB();
  await db.delete("transactions", id);
}

export async function getRatesCache(base) {
  const db = await getDB();
  return db.get("rates", base);
}

export async function setRatesCache(record) {
  const db = await getDB();
  await db.put("rates", record);
}

export async function clearAllAndImport({ settings, transactions, rates }) {
  const db = await getDB();
  const tx = db.transaction(["settings", "transactions", "rates"], "readwrite");
  await Promise.all([
    tx.objectStore("settings").clear(),
    tx.objectStore("transactions").clear(),
    tx.objectStore("rates").clear()
  ]);

  if (settings) await tx.objectStore("settings").put(settings, "app");
  if (Array.isArray(transactions)) {
    for (const t of transactions) await tx.objectStore("transactions").put(t);
  }
  if (Array.isArray(rates)) {
    for (const r of rates) await tx.objectStore("rates").put(r);
  }
  await tx.done;
}

export async function exportAll() {
  const db = await getDB();
  const [settings, transactions, rates] = await Promise.all([
    db.get("settings", "app"),
    db.getAll("transactions"),
    db.getAll("rates")
  ]);
  return { settings, transactions, rates, exportedAt: Date.now(), schema: 1 };
}
