import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route } from "react-router-dom";
import BottomTabs from "./components/BottomTabs.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AddTransaction from "./pages/AddTransaction.jsx";
import Savings from "./pages/Savings.jsx";
import Transactions from "./pages/Transactions.jsx";
import Settings from "./pages/Settings.jsx";
import { DEFAULT_THEME_KEY, THEME_KEYS } from "./themes.js";

import {
  loadSettings,
  saveSettings,
  listTransactions,
  upsertTransaction,
  deleteTransaction,
  exportAll,
  clearAllAndImport
} from "./db.js";

import { ensureRates, convertBaseToDisplay, convertDisplayToBase, getRate } from "./currency.js";
import { validateAllocations } from "./utils.js";

export default function App() {
  const [settings, setSettings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [ratesRecord, setRatesRecord] = useState(null);
  const [ratesWarning, setRatesWarning] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load settings + transactions
  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      const txs = await listTransactions();
      setSettings(s);
      setTransactions(txs);
      setLoading(false);
    })();
  }, []);

  // Load / refresh rates when base currency changes
  useEffect(() => {
    if (!settings?.baseCurrency) return;
    (async () => {
      try {
        const { rates, warning } = await ensureRates(settings.baseCurrency);
        setRatesRecord(rates);
        setRatesWarning(warning);
      } catch (e) {
        setRatesRecord(null);
        setRatesWarning("Could not load exchange rates yet. Some conversions may be unavailable.");
      }
    })();
  }, [settings?.baseCurrency]);

  useEffect(() => {
    const key = THEME_KEYS.includes(settings?.theme) ? settings.theme : DEFAULT_THEME_KEY;
    document.documentElement.dataset.theme = key;
  }, [settings?.theme]);

  const ctx = useMemo(() => {
    if (!settings) return null;

    const allocValidation = validateAllocations(settings.allocations);

    const rateToDisplay = ratesRecord ? getRate(ratesRecord, settings.displayCurrency) : null;

    function amountBaseToDisplay(amountBase) {
      if (!ratesRecord) return null;
      return convertBaseToDisplay(amountBase, ratesRecord, settings.displayCurrency);
    }
    function amountDisplayToBase(amountDisplay) {
      if (!ratesRecord) return null;
      return convertDisplayToBase(amountDisplay, ratesRecord, settings.displayCurrency);
    }

    // Derived totals:
    const incomes = transactions.filter(t => t.type === "income");
    const expenses = transactions.filter(t => t.type === "expense");

    const totalIncomeBase = incomes.reduce((s, t) => s + (t.amountBase || 0), 0);

    // Allocation amounts are based on total income and framework.
    const a = settings.allocations;
    const allocatedBase = {
      fixed: totalIncomeBase * (a.fixedPct / 100),
      invest: totalIncomeBase * (a.investPct / 100),
      save_big: totalIncomeBase * (a.saveBigPct / 100),
      save_irregular: totalIncomeBase * (a.saveIrregularPct / 100),
      guiltfree: totalIncomeBase * (a.guiltFreePct / 100)
    };

    const spentBase = {
      fixed: 0,
      invest: 0,
      save_big: 0,
      save_irregular: 0,
      guiltfree: 0
    };
    for (const e of expenses) {
      const k = e.category;
      if (k && spentBase[k] !== undefined) {
        spentBase[k] += Math.abs(e.amountBase || 0);
      }
    }

    const remainingBase = Object.fromEntries(
      Object.keys(allocatedBase).map(k => [k, (allocatedBase[k] || 0) - (spentBase[k] || 0)])
    );

    // Savings-specific:
    const savingsContribBase = {
      big: allocatedBase.save_big,
      irregular: allocatedBase.save_irregular
    };
    const savingsSpentBase = {
      big: spentBase.save_big,
      irregular: spentBase.save_irregular
    };
    const savingsRemainingBase = {
      big: savingsContribBase.big - savingsSpentBase.big,
      irregular: savingsContribBase.irregular - savingsSpentBase.irregular
    };

    // CRUD helpers:
    async function refreshTransactions() {
      const txs = await listTransactions();
      setTransactions(txs);
    }

    async function addOrUpdateTransaction(tx) {
      await upsertTransaction(tx);
      await refreshTransactions();
    }

    async function removeTransaction(id) {
      await deleteTransaction(id);
      await refreshTransactions();
    }

    async function updateSettings(partial) {
      const next = { ...settings, ...partial };
      setSettings(next);
      await saveSettings(next);
    }

    async function refreshRatesNow() {
      const { rates, warning } = await ensureRates(settings.baseCurrency, { maxAgeMs: 0 });
      setRatesRecord(rates);
      setRatesWarning(warning);
    }

    async function migrateBaseCurrency(newBase) {
      // Convert all stored base amounts from oldBase -> newBase using current rates.
      const oldBase = settings.baseCurrency;
      if (oldBase === newBase) return;

      // Ensure we have rates for old base (to get oldBase -> newBase)
      const { rates: oldRates } = await ensureRates(oldBase, { maxAgeMs: 0 }).catch(async () => {
        // fallback to cache if available
        const fallback = await ensureRates(oldBase);
        return fallback;
      });

      const factor = getRate(oldRates, newBase); // 1 oldBase = factor newBase
      if (!factor) {
        throw new Error(`No conversion rate available for ${oldBase} → ${newBase}.`);
      }

      // Update all transactions
      const txs = await listTransactions();
      for (const t of txs) {
        const next = { ...t, amountBase: (t.amountBase || 0) * factor };
        await upsertTransaction(next);
      }

      // Update settings base currency; keep display currency as-is unless it equals old base
      const nextDisplay = settings.displayCurrency === oldBase ? newBase : settings.displayCurrency;
      const nextSettings = { ...settings, baseCurrency: newBase, displayCurrency: nextDisplay };
      await saveSettings(nextSettings);
      setSettings(nextSettings);

      // Load rates for new base
      const { rates: newRates, warning } = await ensureRates(newBase, { maxAgeMs: 0 });
      setRatesRecord(newRates);
      setRatesWarning(warning);

      // Reload transactions into state
      await refreshTransactions();
    }

    async function doExport() {
      return exportAll();
    }

    async function doImport(payload) {
      await clearAllAndImport(payload);
      const s = await loadSettings();
      const txs = await listTransactions();
      setSettings(s);
      setTransactions(txs);
      // refresh rates for new base
      const { rates, warning } = await ensureRates(s.baseCurrency);
      setRatesRecord(rates);
      setRatesWarning(warning);
    }

    return {
      settings,
      transactions,
      ratesRecord,
      ratesWarning,
      allocValidation,
      totalIncomeBase,
      allocatedBase,
      spentBase,
      remainingBase,
      savingsContribBase,
      savingsSpentBase,
      savingsRemainingBase,
      rateToDisplay,
      amountBaseToDisplay,
      amountDisplayToBase,
      addOrUpdateTransaction,
      removeTransaction,
      updateSettings,
      refreshRatesNow,
      migrateBaseCurrency,
      doExport,
      doImport
    };
  }, [settings, transactions, ratesRecord, ratesWarning]);

  if (loading || !ctx) {
    return (
      <div className="container">
        <div className="header">
          <div className="title">
            <h1>Local Budget</h1>
            <p>Loading your local data…</p>
          </div>
        </div>
        <div className="panel">
          <div className="panel-inner">
            <div className="notice">Initializing IndexedDB and settings.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard ctx={ctx} />} />
        <Route path="/add" element={<AddTransaction ctx={ctx} />} />
        <Route path="/savings" element={<Savings ctx={ctx} />} />
        <Route path="/transactions" element={<Transactions ctx={ctx} />} />
        <Route path="/settings" element={<Settings ctx={ctx} />} />
      </Routes>
      <BottomTabs />
    </>
  );
}
