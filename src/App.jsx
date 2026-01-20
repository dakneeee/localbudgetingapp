import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import BottomTabs from "./components/BottomTabs.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import Tour from "./components/Tour.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AddTransaction from "./pages/AddTransaction.jsx";
import Savings from "./pages/Savings.jsx";
import Transactions from "./pages/Transactions.jsx";
import Settings from "./pages/Settings.jsx";
import { DEFAULT_THEME_KEY } from "./themes.js";

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
import { supabase } from "./supabase.js";

const SYNC_KEY_PREFIX = "ledgerleaf_sync_";

export default function App() {
  const [settings, setSettings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [ratesRecord, setRatesRecord] = useState(null);
  const [ratesWarning, setRatesWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncConflicts, setSyncConflicts] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(0);
  const location = useLocation();

  function toISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function addDays(d, days) {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
  }

  function addMonths(d, months) {
    const next = new Date(d);
    const day = next.getDate();
    next.setMonth(next.getMonth() + months, 1);
    const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, daysInMonth));
    return next;
  }

  function getCycleRange(period, cycleStartISO) {
    const today = new Date();
    const start = cycleStartISO ? new Date(`${cycleStartISO}T00:00:00`) : new Date(`${toISO(today)}T00:00:00`);
    if (period === "weekly") {
      const diffDays = Math.floor((today - start) / 86400000);
      const cycles = diffDays >= 0 ? Math.floor(diffDays / 7) : 0;
      const cycleStart = addDays(start, cycles * 7);
      const cycleEnd = addDays(cycleStart, 6);
      return { startISO: toISO(cycleStart), endISO: toISO(cycleEnd), startDate: cycleStart };
    }
    const monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    const cycles = monthsDiff >= 0 ? monthsDiff : 0;
    const cycleStart = addMonths(start, cycles);
    const cycleEnd = addDays(addMonths(cycleStart, 1), -1);
    return { startISO: toISO(cycleStart), endISO: toISO(cycleEnd), startDate: cycleStart };
  }

  function getWeekLabel(startDate) {
    const month = startDate.toLocaleString(undefined, { month: "long" });
    const year = startDate.getFullYear();
    const first = new Date(year, startDate.getMonth(), 1);
    const firstDay = first.getDay();
    const dayIndex = (startDate.getDate() - 1) + firstDay;
    const week = Math.floor(dayIndex / 7) + 1;
    const daysInMonth = new Date(year, startDate.getMonth() + 1, 0).getDate();
    const weeksInMonth = Math.ceil((daysInMonth + firstDay) / 7);
    return `Week ${week} of ${weeksInMonth} [${month}]`;
  }

  function getLastSync(userId) {
    if (!userId) return 0;
    return Number(localStorage.getItem(`${SYNC_KEY_PREFIX}${userId}`)) || 0;
  }

  function setLastSync(userId, ts) {
    if (!userId) return;
    localStorage.setItem(`${SYNC_KEY_PREFIX}${userId}`, String(ts));
    setLastSyncAt(ts);
  }

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const nextSession = data?.session || null;
      setSession(nextSession);
      setLastSyncAt(getLastSync(nextSession?.user?.id));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLastSyncAt(getLastSync(nextSession?.user?.id));
    });
    return () => sub?.subscription?.unsubscribe();
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
    document.documentElement.dataset.theme = DEFAULT_THEME_KEY;
  }, []);

  const ctx = useMemo(() => {
    if (!settings) return null;

    const allocValidation = validateAllocations(settings.allocations, settings.enabledSavings);

    const rateToDisplay = ratesRecord ? getRate(ratesRecord, settings.displayCurrency) : null;

    function amountBaseToDisplay(amountBase) {
      if (!ratesRecord) return null;
      return convertBaseToDisplay(amountBase, ratesRecord, settings.displayCurrency);
    }
    function amountDisplayToBase(amountDisplay) {
      if (!ratesRecord) return null;
      return convertDisplayToBase(amountDisplay, ratesRecord, settings.displayCurrency);
    }

    function getRateToCurrency(currency) {
      if (!ratesRecord) return null;
      return getRate(ratesRecord, currency);
    }

    function amountBaseToCurrency(amountBase, currency) {
      if (!ratesRecord) return null;
      return convertBaseToDisplay(amountBase, ratesRecord, currency);
    }

    function amountCurrencyToBase(amountDisplay, currency) {
      if (!ratesRecord) return null;
      return convertDisplayToBase(amountDisplay, ratesRecord, currency);
    }

    const { startISO: cycleStartISO, endISO: cycleEndISO, startDate: cycleStartDate } = getCycleRange(
      settings.period,
      settings.cycleStartISO
    );
    const cycleLabel = settings.period === "weekly"
      ? getWeekLabel(cycleStartDate)
      : cycleStartDate.toLocaleString(undefined, { month: "long", year: "numeric" });

    const inCycle = (t) => (!cycleStartISO || !cycleEndISO) ? true : (t.date >= cycleStartISO && t.date <= cycleEndISO);

    // Derived totals (current cycle only):
    const incomes = transactions.filter(t => t.type === "income" && inCycle(t));
    const expenses = transactions.filter(t => t.type === "expense" && inCycle(t));
    const savingsTxs = transactions.filter(t => t.type === "savings" && inCycle(t));

    const budgetSources = new Set(["Salary", "Freelance", "Allowance", "Scholarship"]);

    function incomeBucket(t) {
      if (t.incomeBucket === "budget" || t.incomeBucket === "extra" || t.incomeBucket === "savings") {
        return t.incomeBucket;
      }
      if (budgetSources.has(t.source)) return "budget";
      if (t.source === "Gift") return "extra";
      return "budget";
    }

    const totalIncomeBase = incomes.reduce((s, t) => s + (t.amountBase || 0), 0);
    const budgetIncomeBase = incomes
      .filter(t => incomeBucket(t) === "budget")
      .reduce((s, t) => s + (t.amountBase || 0), 0);
    const extraIncomeBase = incomes
      .filter(t => incomeBucket(t) === "extra")
      .reduce((s, t) => s + (t.amountBase || 0), 0);
    const savingsExtraBase = incomes
      .filter(t => incomeBucket(t) === "savings")
      .reduce((s, t) => s + (t.amountBase || 0), 0);

    const extraSpentBase = [
      ...expenses.filter(e => e.expenseSource === "extra"),
      ...savingsTxs.filter(s => s.savingsSource === "extra")
    ].reduce((s, t) => s + Math.abs(t.amountBase || 0), 0);
    const extraBalanceBase = extraIncomeBase - extraSpentBase;

    // Allocation amounts are based on budget income and framework.
    const a = settings.allocations;
    const enabledSavings = settings.enabledSavings || { invest: true, save_big: true, save_irregular: true };
    const allocatedBase = {
      fixed: budgetIncomeBase * (a.fixedPct / 100),
      invest: enabledSavings.invest ? budgetIncomeBase * (a.investPct / 100) : 0,
      save_big: enabledSavings.save_big ? budgetIncomeBase * (a.saveBigPct / 100) : 0,
      save_irregular: enabledSavings.save_irregular ? budgetIncomeBase * (a.saveIrregularPct / 100) : 0,
      guiltfree: budgetIncomeBase * (a.guiltFreePct / 100)
    };

    const spentBase = {
      fixed: 0,
      invest: 0,
      save_big: 0,
      save_irregular: 0,
      guiltfree: 0
    };
    for (const e of expenses) {
      if (e.expenseSource === "extra") continue;
      const k = e.category;
      if (k && spentBase[k] !== undefined) {
        spentBase[k] += Math.abs(e.amountBase || 0);
      }
    }
    for (const s of savingsTxs) {
      if (s.savingsSource === "extra") continue;
      const k = s.category;
      if (k && spentBase[k] !== undefined) {
        spentBase[k] += Math.abs(s.amountBase || 0);
      }
    }

    const remainingBase = Object.fromEntries(
      Object.keys(allocatedBase).map(k => [k, (allocatedBase[k] || 0) - (spentBase[k] || 0)])
    );

    // Savings-specific:
    const savingsGoalBase = {
      longTerm: allocatedBase.invest,
      big: allocatedBase.save_big,
      irregular: allocatedBase.save_irregular
    };
    const savingsAddedAll = {
      longTerm: 0,
      big: 0,
      irregular: 0
    };
    const savingsAddedBudget = {
      longTerm: 0,
      big: 0,
      irregular: 0
    };
    for (const s of savingsTxs) {
      const amt = Math.abs(s.amountBase || 0);
      if (s.category === "invest") savingsAddedAll.longTerm += amt;
      if (s.category === "save_big") savingsAddedAll.big += amt;
      if (s.category === "save_irregular") savingsAddedAll.irregular += amt;
      if (s.savingsSource !== "extra") {
        if (s.category === "invest") savingsAddedBudget.longTerm += amt;
        if (s.category === "save_big") savingsAddedBudget.big += amt;
        if (s.category === "save_irregular") savingsAddedBudget.irregular += amt;
      }
    }

    const savingsSavedBase = {
      longTerm: enabledSavings.invest ? savingsAddedAll.longTerm : 0,
      big: enabledSavings.save_big ? savingsAddedAll.big : 0,
      irregular: enabledSavings.save_irregular ? savingsAddedAll.irregular : 0
    };
    const savingsProgressBase = {
      longTerm: enabledSavings.invest ? savingsAddedBudget.longTerm : 0,
      big: enabledSavings.save_big ? savingsAddedBudget.big : 0,
      irregular: enabledSavings.save_irregular ? savingsAddedBudget.irregular : 0
    };
    const savingsTotalBase = savingsSavedBase.longTerm + savingsSavedBase.big + savingsSavedBase.irregular;

    // CRUD helpers:
    async function refreshTransactions() {
      const txs = await listTransactions();
      setTransactions(txs);
    }

    async function autoSyncIfEnabled() {
      if (!session?.user?.id) return;
      try {
        await syncNow();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Auto-sync failed:", e);
      }
    }

    async function addOrUpdateTransaction(tx) {
      await upsertTransaction(tx);
      await refreshTransactions();
      await autoSyncIfEnabled();
    }

    async function removeTransaction(id) {
      await deleteTransaction(id);
      await refreshTransactions();
      await autoSyncIfEnabled();
    }

    async function updateSettings(partial) {
      const next = { ...settings, ...partial, updatedAt: Date.now() };
      setSettings(next);
      await saveSettings(next);
      await autoSyncIfEnabled();
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
      await autoSyncIfEnabled();
    }

    async function clearAll() {
      await clearAllAndImport({ settings: null, transactions: [], rates: [] });
      const s = await loadSettings();
      const txs = await listTransactions();
      setSettings(s);
      setTransactions(txs);
      const { rates, warning } = await ensureRates(s.baseCurrency);
      setRatesRecord(rates);
      setRatesWarning(warning);
      await autoSyncIfEnabled();
    }

    async function clearTransactionsKeepSettings() {
      const currentSettings = await loadSettings();
      await clearAllAndImport({ settings: currentSettings, transactions: [], rates: [] });
      const s = await loadSettings();
      const txs = await listTransactions();
      setSettings(s);
      setTransactions(txs);
      const { rates, warning } = await ensureRates(s.baseCurrency);
      setRatesRecord(rates);
      setRatesWarning(warning);
      await autoSyncIfEnabled();
    }

    async function signUp(email, password) {
      return supabase.auth.signUp({ email, password });
    }

    async function signIn(email, password) {
      return supabase.auth.signInWithPassword({ email, password });
    }

    async function signOut() {
      await supabase.auth.signOut();
      setSyncConflicts(null);
      setLastSyncAt(0);
    }

    function toMs(value) {
      if (Number.isFinite(value)) return value;
      const d = new Date(value);
      return Number.isFinite(d.getTime()) ? d.getTime() : 0;
    }

    async function syncNow() {
      if (!session?.user?.id) {
        throw new Error("Sign in to sync.");
      }
      const userId = session.user.id;
      setSyncBusy(true);
      setSyncConflicts(null);
      try {
        const localSettings = await loadSettings();
        const localTxs = await listTransactions();
        const lastSync = getLastSync(userId);

        const { data: remoteSettingsRow, error: settingsErr } = await supabase
          .from("user_settings")
          .select("data, updated_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (settingsErr) throw settingsErr;

        const { data: remoteTxRows, error: txErr } = await supabase
          .from("transactions")
          .select("id, data, updated_at")
          .eq("user_id", userId);
        if (txErr) throw txErr;

        const conflicts = { settings: null, transactions: [] };
        const localTxMap = new Map(localTxs.map(t => [t.id, t]));
        const remoteTxMap = new Map((remoteTxRows || []).map(r => [r.id, r]));

        const localSettingsUpdated = Number(localSettings.updatedAt) || 0;
        const remoteSettingsUpdated = remoteSettingsRow
          ? (Number(remoteSettingsRow.data?.updatedAt) || toMs(remoteSettingsRow.updated_at))
          : 0;

        if (remoteSettingsRow) {
          if (localSettingsUpdated > lastSync && remoteSettingsUpdated > lastSync && localSettingsUpdated !== remoteSettingsUpdated) {
            conflicts.settings = { local: localSettings, remote: remoteSettingsRow.data };
          } else if (remoteSettingsUpdated > localSettingsUpdated) {
            const next = { ...remoteSettingsRow.data, updatedAt: remoteSettingsUpdated || Date.now() };
            await saveSettings(next);
          }
        }

        const toPushTxs = [];
        const toPullTxs = [];

        for (const [id, row] of remoteTxMap.entries()) {
          const remoteData = { ...row.data, id };
          const remoteUpdated = Number(remoteData.updatedAt) || toMs(row.updated_at);
          const local = localTxMap.get(id);
          if (!local) {
            toPullTxs.push({ ...remoteData, updatedAt: remoteUpdated || Date.now() });
            continue;
          }
          const localUpdated = Number(local.updatedAt) || Number(local.createdAt) || 0;
          if (localUpdated > lastSync && remoteUpdated > lastSync && localUpdated !== remoteUpdated) {
            conflicts.transactions.push({ id, local, remote: remoteData });
            continue;
          }
          if (remoteUpdated > localUpdated) {
            toPullTxs.push({ ...remoteData, updatedAt: remoteUpdated || Date.now() });
          } else if (localUpdated > remoteUpdated) {
            toPushTxs.push(local);
          }
        }

        for (const [id, local] of localTxMap.entries()) {
          if (remoteTxMap.has(id)) continue;
          toPushTxs.push(local);
        }

        if (toPullTxs.length) {
          for (const t of toPullTxs) await upsertTransaction(t);
        }

        if (conflicts.settings || conflicts.transactions.length) {
          setSyncConflicts(conflicts);
          return { conflicts: true };
        }

        if (localSettingsUpdated > remoteSettingsUpdated) {
          await supabase.from("user_settings").upsert(
            {
              user_id: userId,
              data: localSettings,
              updated_at: new Date(localSettingsUpdated).toISOString()
            },
            { onConflict: "user_id" }
          );
        }

        if (toPushTxs.length) {
          const rows = toPushTxs.map(t => ({
            id: t.id,
            user_id: userId,
            data: t,
            updated_at: new Date(Number(t.updatedAt) || Date.now()).toISOString()
          }));
          await supabase.from("transactions").upsert(rows, { onConflict: "id" });
        }

        const now = Date.now();
        setLastSync(userId, now);
        const s = await loadSettings();
        const txs = await listTransactions();
        setSettings(s);
        setTransactions(txs);
        return { conflicts: false };
      } finally {
        setSyncBusy(false);
      }
    }

    async function resolveSyncConflicts({ settingsChoice, txChoices }) {
      if (!session?.user?.id || !syncConflicts) return;
      const userId = session.user.id;
      setSyncBusy(true);
      try {
        const toPushTxs = [];
        const toPullTxs = [];

        for (const item of syncConflicts.transactions) {
          const choice = txChoices?.[item.id] || "local";
          if (choice === "local") toPushTxs.push(item.local);
          if (choice === "remote") toPullTxs.push(item.remote);
        }

        if (syncConflicts.settings) {
          if (settingsChoice === "remote") {
            const remoteSettings = syncConflicts.settings.remote;
            const updatedAt = Number(remoteSettings.updatedAt) || Date.now();
            await saveSettings({ ...remoteSettings, updatedAt });
          } else {
            const localSettings = syncConflicts.settings.local;
            await supabase.from("user_settings").upsert(
              {
                user_id: userId,
                data: localSettings,
                updated_at: new Date(Number(localSettings.updatedAt) || Date.now()).toISOString()
              },
              { onConflict: "user_id" }
            );
          }
        }

        if (toPullTxs.length) {
          for (const t of toPullTxs) await upsertTransaction(t);
        }

        if (toPushTxs.length) {
          const rows = toPushTxs.map(t => ({
            id: t.id,
            user_id: userId,
            data: t,
            updated_at: new Date(Number(t.updatedAt) || Date.now()).toISOString()
          }));
          await supabase.from("transactions").upsert(rows, { onConflict: "id" });
        }

        const now = Date.now();
        setLastSync(userId, now);
        setSyncConflicts(null);
        const s = await loadSettings();
        const txs = await listTransactions();
        setSettings(s);
        setTransactions(txs);
      } finally {
        setSyncBusy(false);
      }
    }

    return {
      settings,
      transactions,
      ratesRecord,
      ratesWarning,
      allocValidation,
      enabledSavings,
      totalIncomeBase,
      budgetIncomeBase,
      extraIncomeBase,
      extraBalanceBase,
      savingsExtraBase,
      allocatedBase,
      spentBase,
      remainingBase,
      savingsGoalBase,
      savingsSavedBase,
      savingsProgressBase,
      savingsTotalBase,
      cycleStartISO,
      cycleEndISO,
      cycleLabel,
      rateToDisplay,
      amountBaseToDisplay,
      amountDisplayToBase,
      getRateToCurrency,
      amountBaseToCurrency,
      amountCurrencyToBase,
      addOrUpdateTransaction,
      removeTransaction,
      updateSettings,
      refreshRatesNow,
      migrateBaseCurrency,
      doExport,
      doImport,
      clearAll,
      clearTransactionsKeepSettings,
      signUp,
      signIn,
      signOut,
      syncNow,
      resolveSyncConflicts,
      syncConflicts,
      syncBusy,
      session,
      lastSyncAt
    };
  }, [settings, transactions, ratesRecord, ratesWarning, session, syncConflicts, syncBusy, lastSyncAt]);

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

  if (!session) {
    return <AuthScreen onSignIn={ctx.signIn} onSignUp={ctx.signUp} />;
  }

  return (
    <>
      <div className="page" key={location.pathname}>
        <Routes location={location}>
        <Route path="/" element={<Dashboard ctx={ctx} />} />
        <Route path="/add" element={<AddTransaction ctx={ctx} />} />
        <Route path="/savings" element={<Savings ctx={ctx} />} />
        <Route path="/transactions" element={<Transactions ctx={ctx} />} />
        <Route path="/settings" element={<Settings ctx={ctx} />} />
        </Routes>
      </div>
      <Tour />
      <BottomTabs />
    </>
  );
}
