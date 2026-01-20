import React, { useMemo, useState } from "react";
import Money from "../components/Money.jsx";
import { COMMON_CURRENCIES } from "../currency.js";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, isoToday, safeNumber, uuid, formatDatePretty } from "../utils.js";

export default function AddTransaction({ ctx }) {
  const {
    settings,
    ratesWarning,
    getRateToCurrency,
    amountCurrencyToBase,
    amountBaseToCurrency,
    budgetIncomeBase,
    extraIncomeBase,
    remainingBase,
    addOrUpdateTransaction
  } = ctx;

  const [mode, setMode] = useState("income"); // income | expense
  const [date, setDate] = useState(isoToday());
  const [dateMode, setDateMode] = useState("today"); // today | yesterday | custom
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [amountCurrency, setAmountCurrency] = useState(settings.displayCurrency);

  // income fields
  const [incomeSource, setIncomeSource] = useState("Salary");
  const [incomeCustom, setIncomeCustom] = useState("");
  const [otherBucket, setOtherBucket] = useState("budget"); // budget | extra
  const [giftToSavings, setGiftToSavings] = useState(false);

  // expense fields
  const [expenseCategory, setExpenseCategory] = useState("fixed");
  const [merchant, setMerchant] = useState("");
  const [expenseSource, setExpenseSource] = useState("budget"); // budget | extra

  const displayCurrency = settings.displayCurrency;
  const baseCurrency = settings.baseCurrency;
  const rateToInput = getRateToCurrency(amountCurrency);

  function offsetIso(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  React.useEffect(() => {
    if (dateMode === "today") setDate(offsetIso(0));
    if (dateMode === "yesterday") setDate(offsetIso(-1));
  }, [dateMode]);

  const preview = useMemo(() => {
    const n = safeNumber(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    const base = amountCurrencyToBase(n, amountCurrency);
    if (!Number.isFinite(base)) return null;
    return { base };
  }, [amount, amountCurrency, amountCurrencyToBase]);

  const hasFunds = expenseSource === "extra"
    ? extraIncomeBase > 0
    : budgetIncomeBase > 0;
  const canConvert = rateToInput !== null && (mode === "expense" ? hasFunds : true);

  async function onSubmit(e) {
    e.preventDefault();

    const n = safeNumber(amount);
    if (!Number.isFinite(n) || n <= 0) {
      alert("Amount must be a positive number.");
      return;
    }
    if (mode === "expense" && !hasFunds) {
      alert(`No ${expenseSource} balance available. Add income first.`);
      return;
    }
    if (!canConvert) {
      alert("Exchange rates are not available yet. Go to Settings and refresh rates, then try again.");
      return;
    }

    const base = amountCurrencyToBase(n, amountCurrency);
    if (!Number.isFinite(base) || base <= 0) {
      alert("Could not convert amount to base currency. Try refreshing rates.");
      return;
    }

    if (mode === "income") {
      const sourceFinal = incomeSource === "Other" ? (incomeCustom.trim() || "Other") : incomeSource;
      const incomeBucket = incomeSource === "Gift"
        ? (giftToSavings ? "savings" : "extra")
        : incomeSource === "Other"
          ? (otherBucket === "extra" ? "extra" : "budget")
          : "budget";
      const tx = {
        id: uuid(),
        type: "income",
        date,
        amountBase: base,
        incomeBucket,
        inputCurrency: amountCurrency,
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
      expenseSource,
      inputCurrency: amountCurrency,
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
  const budgetBalanceDisplay = amountBaseToCurrency(budgetIncomeBase || 0, displayCurrency);
  const extraBalanceDisplay = amountBaseToCurrency(extraIncomeBase || 0, displayCurrency);
  const remainingBaseForCategory = mode === "expense" ? (remainingBase?.[expenseCategory] || 0) : null;
  const remainingAfterBase = mode === "expense" && Number.isFinite(amountBaseForDisplay)
    ? remainingBaseForCategory - Math.abs(amountBaseForDisplay)
    : remainingBaseForCategory;
  const remainingAfterDisplay = Number.isFinite(remainingAfterBase)
    ? amountBaseToCurrency(remainingAfterBase, displayCurrency)
    : null;

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
            {rateToInput ? `1 ${baseCurrency} = ${rateToInput.toFixed(4)} ${amountCurrency}` : "—"}
          </strong>
        </div>
        <div className="pill">
          <span className="muted">Budget</span>
          <strong className="mono">
            <Money value={budgetBalanceDisplay ?? 0} currency={displayCurrency} />
          </strong>
        </div>
        <div className="pill">
          <span className="muted">Extra</span>
          <strong className="mono">
            <Money value={extraBalanceDisplay ?? 0} currency={displayCurrency} />
          </strong>
        </div>
      </div>

      {ratesWarning ? <div className="notice warn" style={{ marginBottom: 12 }}>{ratesWarning}</div> : null}

      <div className="panel" data-tour="add-form">
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
                <select value={dateMode} onChange={(e) => setDateMode(e.target.value)}>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="custom">Pick a date</option>
                </select>
              </div>

              <div className="field">
                <label>Amount ({amountCurrency})</label>
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {dateMode === "custom" ? (
              <div className="field">
                <label>Custom date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            ) : null}

            <div className="field">
              <label>Amount currency</label>
              <select value={amountCurrency} onChange={(e) => setAmountCurrency(e.target.value)}>
                {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
                {incomeSource === "Other" ? (
                  <div className="field">
                    <label>Counts toward</label>
                    <select value={otherBucket} onChange={(e) => setOtherBucket(e.target.value)}>
                      <option value="budget">Budget</option>
                      <option value="extra">Extra</option>
                    </select>
                  </div>
                ) : null}
                {incomeSource === "Gift" ? (
                  <div className="field">
                    <label>Add gift to savings?</label>
                    <select
                      value={giftToSavings ? "yes" : "no"}
                      onChange={(e) => setGiftToSavings(e.target.value === "yes")}
                    >
                      <option value="no">No, keep as extra</option>
                      <option value="yes">Yes, add to savings</option>
                    </select>
                  </div>
                ) : null}
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
              <div className="field">
                <label>Pay from</label>
                <select value={expenseSource} onChange={(e) => setExpenseSource(e.target.value)}>
                  <option value="budget">Budget</option>
                  <option value="extra">Extra</option>
                </select>
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
                          <Money value={amountDisplay} currency={amountCurrency} />
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
              {mode === "expense" ? (
                <div className="row" style={{ marginTop: 8 }}>
                  <div className="muted">Remaining after this expense</div>
                  <div className="mono">
                    {Number.isFinite(remainingAfterDisplay)
                      ? <Money value={remainingAfterDisplay} currency={displayCurrency} showSign />
                      : "—"}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="actions">
              <button className="btn primary" type="submit" disabled={!canConvert}>
                Save {mode === "income" ? "Income" : "Expense"}
              </button>
              {!canConvert ? (
                <div className="notice warn" style={{ flex: 1 }}>
                  {rateToInput === null
                    ? "Exchange rates unavailable. Go to Settings → Refresh rates."
                    : `No ${expenseSource} balance available.`}
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
