import React, { useMemo, useState, useEffect } from "react";
import Money from "../components/Money.jsx";
import Modal from "../components/Modal.jsx";
import { COMMON_CURRENCIES } from "../currency.js";
import { DEFAULT_THEME_KEY } from "../themes.js";
import { defaultAllocations, safeNumber, validateAllocations } from "../utils.js";

export default function Settings({ ctx }) {
  const {
    settings,
    ratesRecord,
    ratesWarning,
    allocValidation,
    updateSettings,
    refreshRatesNow,
    migrateBaseCurrency,
    doExport,
    doImport,
    clearAll,
    clearTransactionsKeepSettings,
    signIn,
    signUp,
    signOut,
    syncNow,
    resolveSyncConflicts,
    syncConflicts,
    syncBusy,
    session,
    lastSyncAt,
    amountBaseToDisplay
  } = ctx;

  const [fixedPct, setFixedPct] = useState(String(settings.allocations.fixedPct));
  const [guiltPct, setGuiltPct] = useState(String(settings.allocations.guiltFreePct));
  const [period, setPeriod] = useState(settings.period);
  const [baseCurrency, setBaseCurrency] = useState(settings.baseCurrency);
  const [displayCurrency, setDisplayCurrency] = useState(settings.displayCurrency);
  const [name, setName] = useState(settings.name || "");

  const [backupText, setBackupText] = useState("");
  const [busy, setBusy] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [settingsChoice, setSettingsChoice] = useState("local");
  const [txChoices, setTxChoices] = useState({});
  const [conflictOpen, setConflictOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const computedAlloc = useMemo(() => {
    const a = {
      fixedPct: safeNumber(fixedPct),
      investPct: 10,
      saveBigPct: 10,
      saveIrregularPct: 10,
      guiltFreePct: safeNumber(guiltPct)
    };
    return { a, v: validateAllocations(a) };
  }, [fixedPct, guiltPct]);

  useEffect(() => {
    if (!syncConflicts) return;
    setSettingsChoice("local");
    const defaults = {};
    for (const item of syncConflicts.transactions || []) {
      defaults[item.id] = "local";
    }
    setTxChoices(defaults);
    setConflictOpen(true);
  }, [syncConflicts]);

  async function saveAll() {
    const v = computedAlloc.v;
    if (!v.ok) {
      alert(v.errors.join("\n"));
      return;
    }

    // Save period + allocation
    await updateSettings({
      name: name.trim(),
      period,
      displayCurrency,
      theme: DEFAULT_THEME_KEY,
      allocations: computedAlloc.a
    });

    // Base currency migration (if changed)
    if (baseCurrency !== settings.baseCurrency) {
      setBusy(true);
      try {
        await migrateBaseCurrency(baseCurrency);
      } catch (e) {
        alert(e?.message || "Failed to change base currency.");
        // restore local UI state to actual setting
        setBaseCurrency(settings.baseCurrency);
      } finally {
        setBusy(false);
      }
    } else {
      // if base unchanged, still save display currency (done above)
    }

    alert("Settings saved.");
  }

  async function saveProfile() {
    await updateSettings({ name: name.trim() });
    alert("Profile saved.");
  }

  async function onRefreshRates() {
    setBusy(true);
    try {
      await refreshRatesNow();
      alert("Rates refreshed.");
    } catch (e) {
      alert(e?.message || "Failed to refresh rates.");
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    const payload = await doExport();
    const text = JSON.stringify(payload, null, 2);
    setBackupText(text);

    // Trigger download
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onImport() {
    if (!backupText.trim()) {
      alert("Paste a backup JSON first (or use the file picker).");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(backupText);
    } catch {
      alert("Invalid JSON.");
      return;
    }
    const ok = confirm("Import will overwrite your current local data. Continue?");
    if (!ok) return;

    setBusy(true);
    try {
      await doImport({
        settings: parsed.settings,
        transactions: parsed.transactions,
        rates: parsed.rates
      });
      alert("Import complete.");
    } catch (e) {
      alert(e?.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onClearAll() {
    if (typeof clearAll !== "function") {
      await doImport({ settings: null, transactions: [], rates: [] });
      setBackupText("");
      alert("All data cleared.");
      return;
    }
    const ok = confirm("Clear all data? This will remove settings, transactions, and cached rates.");
    if (!ok) return;
    setBusy(true);
    try {
      await clearAll();
      setBackupText("");
      alert("All data cleared.");
    } catch (e) {
      alert(e?.message || "Failed to clear data.");
    } finally {
      setBusy(false);
    }
  }

  async function onClearTransactions() {
    const ok = confirm("Clear all transactions but keep your profile and budget settings?");
    if (!ok) return;
    setBusy(true);
    try {
      await clearTransactionsKeepSettings();
      setBackupText("");
      alert("Transactions cleared.");
    } catch (e) {
      alert(e?.message || "Failed to clear transactions.");
    } finally {
      setBusy(false);
    }
  }

  async function onSync() {
    try {
      const result = await syncNow();
      if (result?.conflicts) {
        alert("Conflicts found. Review and choose which version to keep.");
      } else {
        alert("Sync complete.");
      }
    } catch (e) {
      alert(e?.message || "Sync failed.");
    }
  }

  async function onResolveConflicts() {
    try {
      await resolveSyncConflicts({ settingsChoice, txChoices });
      alert("Conflicts resolved and synced.");
      setConflictOpen(false);
    } catch (e) {
      alert(e?.message || "Failed to resolve conflicts.");
    }
  }

  async function onSignIn() {
    const { error } = await signIn(authEmail.trim(), authPassword);
    if (error) {
      alert(error.message);
      return;
    }
    setAuthPassword("");
  }

  async function onSignUp() {
    const { error } = await signUp(authEmail.trim(), authPassword);
    if (error) {
      alert(error.message);
      return;
    }
    setAuthPassword("");
    alert("Check your email to confirm your account, then sign in.");
  }

  async function onSignOut() {
    await signOut();
  }

  async function onPickFile(file) {
    const text = await file.text();
    setBackupText(text);
  }

  async function resetAllocDefaults() {
    const d = defaultAllocations();
    setFixedPct(String(d.fixedPct));
    setGuiltPct(String(d.guiltFreePct));
  }

  const lastUpdated = ratesRecord?.fetchedAt
    ? new Date(ratesRecord.fetchedAt).toLocaleString()
    : "—";
  const lastSyncLabel = lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "—";

  return (
    <>
      <div className="container">
      <div className="header">
        <div className="title">
          <h1>Settings</h1>
          <p>Allocations must match the framework exactly, or saving is blocked.</p>
        </div>
        <div className="pill">
          <span className="muted">Rates updated</span>
          <strong className="mono">{lastUpdated}</strong>
        </div>
      </div>

      {ratesWarning ? <div className="notice warn" style={{ marginBottom: 12 }}>{ratesWarning}</div> : null}

      <div className="panel">
        <div className="panel-inner">
          <div className="settings-tabs">
            <button
              className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button
              className={`tab-btn ${activeTab === "budget" ? "active" : ""}`}
              onClick={() => setActiveTab("budget")}
            >
              Budget
            </button>
            <button
              className={`tab-btn ${activeTab === "sync" ? "active" : ""}`}
              onClick={() => setActiveTab("sync")}
            >
              Sync
            </button>
            <button
              className={`tab-btn ${activeTab === "backup" ? "active" : ""}`}
              onClick={() => setActiveTab("backup")}
            >
              Backup
            </button>
          </div>

          {activeTab === "profile" ? (
            <div className="card" data-tour="settings-profile">
              <h3>Profile</h3>
              <div className="field">
                <label>Name (for greeting)</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="actions">
                <button className="btn primary" onClick={saveProfile} disabled={busy}>Save profile</button>
              </div>
            </div>
          ) : null}

          {activeTab === "budget" ? (
            <div className="split">
              <div className="card">
                <h3>Budget period</h3>
                <div className="field">
                  <label>Weekly / Monthly</label>
                  <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <h3 style={{ marginTop: 14 }}>Currency</h3>
                <div className="grid cols-2">
                  <div className="field">
                    <label>Base currency (stored internally)</label>
                    <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
                      {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Display currency (switch anytime)</label>
                    <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
                      {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="actions">
                  <button className="btn" onClick={onRefreshRates} disabled={busy}>Refresh rates</button>
                </div>

                <div className="notice" style={{ marginTop: 10 }}>
                  If refresh fails, cached rates are used with a warning. Transactions are always stored in base currency.
                </div>
              </div>

              <div className="card">
                <h3>Allocations (framework)</h3>

              <div className="grid cols-2">
                <div className="field">
                  <label>Fixed Costs % (50–60)</label>
                  <input value={fixedPct} onChange={(e) => setFixedPct(e.target.value)} inputMode="numeric" />
                </div>
                <div className="field">
                  <label>Guilt-Free % (10–20)</label>
                  <input value={guiltPct} onChange={(e) => setGuiltPct(e.target.value)} inputMode="numeric" />
                </div>
              </div>

              <div className="notice" style={{ marginTop: 8 }}>
                <div className="row">
                  <div className="muted">Long-Term Investments</div>
                  <div className="mono">10%</div>
                </div>
                <div className="row">
                  <div className="muted">Savings: Big Goals</div>
                  <div className="mono">10%</div>
                </div>
                <div className="row">
                  <div className="muted">Savings: Irregular Expenses</div>
                  <div className="mono">10%</div>
                </div>
              </div>

              {!computedAlloc.v.ok ? (
                <div className="notice bad" style={{ marginTop: 10 }}>
                  <strong>Cannot save:</strong>
                  <ul style={{ margin: "8px 0 0 18px" }}>
                    {computedAlloc.v.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="notice" style={{ marginTop: 10 }}>
                  Allocation valid. Total is 100% and adjustable ranges are respected.
                </div>
              )}

                <div className="actions">
                  <button className="btn" onClick={resetAllocDefaults} disabled={busy}>Reset defaults</button>
                  <button className="btn primary" onClick={saveAll} disabled={busy || !computedAlloc.v.ok}>
                    Save settings
                  </button>
                </div>

                <div className="notice warn" style={{ marginTop: 10 }}>
                  Changing the base currency will migrate all stored transactions by converting amounts using current rates.
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "sync" ? (
            <div className="card">
              <h3>Cloud sync</h3>
              <p className="sub">
                Sign in to sync across devices. Your local data stays on this device unless you sync.
              </p>

              {session ? (
                <div className="notice" style={{ marginTop: 10 }}>
                  Signed in as <strong>{session.user.email}</strong>
                </div>
              ) : (
                <div className="grid cols-2" style={{ marginTop: 10 }}>
                  <div className="field">
                    <label>Email</label>
                    <input
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@email.com"
                    />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <div className="actions">
                {session ? (
                  <>
                    <button className="btn" onClick={onSync} disabled={syncBusy}>Sync now</button>
                    <button className="btn ghost" onClick={onSignOut}>Sign out</button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={onSignIn} disabled={!authEmail || !authPassword}>Sign in</button>
                    <button className="btn ghost" onClick={onSignUp} disabled={!authEmail || !authPassword}>Sign up</button>
                  </>
                )}
              </div>

              <div className="notice" style={{ marginTop: 10 }}>
                Last sync: <span className="mono">{lastSyncLabel}</span>
              </div>

              {syncConflicts ? (
                <div className="notice warn" style={{ marginTop: 10 }}>
                  Conflicts found. Review and choose which version to keep.
                </div>
              ) : null}
              {syncConflicts ? (
                <div className="actions">
                  <button className="btn" onClick={() => setConflictOpen(true)}>Review conflicts</button>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "backup" ? (
            <div className="card">
              <h3>Backup (Export / Import)</h3>

              <div className="actions" style={{ marginTop: 0 }}>
                <button className="btn" onClick={onExport} disabled={busy}>Export JSON</button>
                <label className="btn" style={{ cursor: busy ? "not-allowed" : "pointer" }}>
                  Import from file
                  <input
                    type="file"
                    accept="application/json"
                    style={{ display: "none" }}
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onPickFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button className="btn danger" onClick={onImport} disabled={busy}>Import (overwrite)</button>
                <button className="btn danger" onClick={onClearTransactions} disabled={busy}>Clear transactions only</button>
                <button className="btn danger" onClick={onClearAll} disabled={busy}>Clear all data</button>
              </div>

              <div className="field" style={{ marginTop: 10 }}>
                <label>Backup JSON (paste here to import, or export to download)</label>
                <textarea
                  value={backupText}
                  onChange={(e) => setBackupText(e.target.value)}
                  placeholder="Export will also put JSON here. Import will overwrite local data."
                />
              </div>

              <div className="notice">
                Export includes settings, transactions, and cached exchange rates. Import replaces everything.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>

      <Modal open={!!syncConflicts && conflictOpen} title="Resolve sync conflicts" onClose={() => setConflictOpen(false)}>
      {syncConflicts?.settings ? (
        <div className="card" style={{ marginBottom: 10 }}>
          <h3>Settings conflict</h3>
          <div className="grid cols-2">
            <label className="notice">
              <input
                type="radio"
                checked={settingsChoice === "local"}
                onChange={() => setSettingsChoice("local")}
              />{" "}
              Keep local settings
            </label>
            <label className="notice">
              <input
                type="radio"
                checked={settingsChoice === "remote"}
                onChange={() => setSettingsChoice("remote")}
              />{" "}
              Use cloud settings
            </label>
          </div>
        </div>
      ) : null}

      {syncConflicts?.transactions?.length ? (
        <div className="card">
          <h3>Transaction conflicts</h3>
          <div className="grid">
            {syncConflicts.transactions.map((item) => {
              const localAmt = amountBaseToDisplay?.(item.local.amountBase ?? 0) ?? 0;
              const remoteAmt = amountBaseToDisplay?.(item.remote.amountBase ?? 0) ?? 0;
              return (
                <div key={item.id} className="notice">
                  <div className="row">
                    <strong>{item.local.description || "Transaction"}</strong>
                    <span className="mono">{item.local.date || "—"}</span>
                  </div>
                  <div className="grid cols-2" style={{ marginTop: 8 }}>
                    <label>
                      <input
                        type="radio"
                        checked={(txChoices[item.id] || "local") === "local"}
                        onChange={() => setTxChoices({ ...txChoices, [item.id]: "local" })}
                      />{" "}
                      Keep local (
                      <Money value={localAmt} currency={settings.displayCurrency} showSign />
                      )
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={txChoices[item.id] === "remote"}
                        onChange={() => setTxChoices({ ...txChoices, [item.id]: "remote" })}
                      />{" "}
                      Use cloud (
                      <Money value={remoteAmt} currency={settings.displayCurrency} showSign />
                      )
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={onResolveConflicts} disabled={syncBusy}>
          Resolve and sync
        </button>
      </div>
      </Modal>
    </>
  );
}
