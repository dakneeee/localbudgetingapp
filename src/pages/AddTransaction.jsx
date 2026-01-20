import React, { useMemo, useState } from "react";
import Money from "../components/Money.jsx";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, isoToday, safeNumber, uuid, formatDatePretty } from "../utils.js";

export default function AddTransaction({ ctx }) {
  const { settings, ratesWarning, rateToDisplay, amountDisplayToBase, amountBaseToDisplay, addOrUpdateTransaction } = ctx;

  const [mode, setMode] = useState("income"); // income | expense
  const [date, setDate] = useState(isoToday());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // income fields
  const [incomeSource, setIncomeSource] = useState("Salary");
  const [incomeCustom, setIncomeCustom] = useState("");

  // expense fields
  const [expenseCategory, setExpenseCategory] = useState("fixed");
  const [merchant, setMerchant] = useState("");

  const displayCurrency = settings.displayCurrency;

  const preview = useMemo(() => {
    const n = safeNumber(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    const base = amountDisplayToBase(n);
    if (!Number.isFinite(base)) return null;
    return { base };
  }, [amount, amountDisplayToBase]);

  const canConvert = rateToDisplay !== null;

  async function onSubmit(e) {
    e.preventDefault();

    const n = safeNumber(amount);
    if (!Number.isFinite(n) || n <= 0) {
      alert("Amount must be a positive number.");
      return;
    }
    if (!canConvert) {
      alert("Exchange rates are not available yet. Go to Settings and refresh rates, then try again.");
      return;
    }

    const base = amountDisplayToBase(n);
    if (!Number.isFinite(base) || base <= 0) {
      alert("Could not convert amount to base currency. Try refreshing rates.");
      return;
    }

    if (mode === "income") {
      const sourceFinal = incomeSource === "Other" ? (incomeCustom.trim() || "Other") : incomeSource;
      const tx = {
        id: uuid(),
        type: "income",
        date,
        amountBase: base,
        source: sourceFinal,
        description: sourceFinal,
        note: note.trim() || null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await addOrUpdateTransaction(tx);
      setAmount("");
      setNote("");
      alert("Income added.");
      return;
    }

    // expense
    const catObj = EXPENSE_CATEGORIES.find(c => c.key === expenseCategory);
    const catLabel = catObj ? catObj.label : "Expense";
    const label = merchant.trim() || catLabel;

    const tx = {
      id: uuid(),
      type: "expense",
      date,
      amountBase: -Math.abs(base),
      category: expenseCategory,
      source: catLabel,
      description: label,
      note: note.trim() || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await addOrUpdateTransaction(tx);
    setAmount("");
    setNote("");
    setMerchant("");
    alert("Expense added.");
  }

  const amountDisplay = safeNumber(amount);
  const amountBaseForDisplay = preview?.base ?? null;
  const baseCurrency = settings.baseCurrency;

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Add Transaction</h1>
          <p>
            Enter amounts in your <span className="mono">{displayCurrency}</span> display currency.
            They are stored internally in <span className="mono">{baseCurrency}</span>.
          </p>
        </div>
        <div className="pill">
          <span className="muted">Rate</span>
          <strong className="mono">
            {rateToDisplay ? `1 ${baseCurrency} = ${rateToDisplay.toFixed(4)} ${displayCurrency}` : "—"}
          </strong>
        </div>
      </div>

      {ratesWarning ? <div className="notice warn" style={{ marginBottom: 12 }}>{ratesWarning}</div> : null}

      <div className="panel">
        <div className="panel-inner">
          <div className="actions" style={{ marginTop: 0 }}>
            <button className={`btn ${mode === "income" ? "primary" : ""}`} onClick={() => setMode("income")}>
              Income
            </button>
            <button className={`btn ${mode === "expense" ? "primary" : ""}`} onClick={() => setMode("expense")}>
              Expense
            </button>
          </div>

          <form className="form" onSubmit={onSubmit} style={{ marginTop: 12 }}>
            <div className="grid cols-2">
              <div className="field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="field">
                <label>Amount ({displayCurrency})</label>
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {mode === "income" ? (
              <div className="grid cols-2">
                <div className="field">
                  <label>Source</label>
                  <select value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}>
                    {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Custom source (only used if Source = Other)</label>
                  <input
                    placeholder="e.g., Part-time job"
                    value={incomeCustom}
                    onChange={(e) => setIncomeCustom(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid cols-2">
                <div className="field">
                  <label>Category</label>
                  <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Merchant / Label</label>
                  <input
                    placeholder="e.g., Rent, Starbucks, Phone bill"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label>Note (optional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional details…" />
            </div>

            <div className="notice">
              <div className="row" style={{ alignItems: "baseline" }}>
                <div>
                  <div className="muted">Preview</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {Number.isFinite(amountDisplay) && amountDisplay > 0 ? (
                      <>
                        <strong>
                          <Money value={amountDisplay} currency={displayCurrency} />
                        </strong>{" "}
                        on <span className="mono">{formatDatePretty(date)}</span>
                      </>
                    ) : (
                      <span className="muted">Enter an amount to preview.</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="muted">Stored (base)</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {Number.isFinite(amountBaseForDisplay) ? (
                      <strong><Money value={amountBaseForDisplay} currency={baseCurrency} /></strong>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="actions">
              <button className="btn primary" type="submit" disabled={!canConvert}>
                Save {mode === "income" ? "Income" : "Expense"}
              </button>
              {!canConvert ? (
                <div className="notice warn" style={{ flex: 1 }}>
                  Exchange rates unavailable. Go to Settings → Refresh rates.
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}