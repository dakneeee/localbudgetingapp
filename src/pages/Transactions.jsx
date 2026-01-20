import React, { useMemo, useState } from "react";
import Money from "../components/Money.jsx";
import Modal from "../components/Modal.jsx";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, cmpDateDesc, formatDatePretty, isoToday, safeNumber } from "../utils.js";

function categoryLabel(key) {
  const found = EXPENSE_CATEGORIES.find(c => c.key === key);
  return found ? found.label : key || "—";
}

export default function Transactions({ ctx }) {
  const {
    settings,
    ratesWarning,
    transactions,
    amountBaseToDisplay,
    amountDisplayToBase,
    removeTransaction,
    addOrUpdateTransaction
  } = ctx;

  const display = settings.displayCurrency;

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | income | expense
  const [catFilter, setCatFilter] = useState("all"); // category key
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editId, setEditId] = useState(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...transactions]
      .sort((a, b) => cmpDateDesc(a.date, b.date))
      .filter(t => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (typeFilter === "expense" && catFilter !== "all" && (t.category !== catFilter)) return false;

        if (fromDate && t.date < fromDate) return false;
        if (toDate && t.date > toDate) return false;

        if (!query) return true;
        const hay = [
          t.description,
          t.source,
          t.category ? categoryLabel(t.category) : null,
          t.note
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(query);
      });
  }, [transactions, q, typeFilter, catFilter, fromDate, toDate]);

  const editingTx = useMemo(() => {
    if (!editId) return null;
    return transactions.find(t => t.id === editId) || null;
  }, [editId, transactions]);

  function toDisplay(n) {
    const v = amountBaseToDisplay(n);
    return v ?? 0;
  }

  async function confirmDelete(id) {
    const ok = confirm("Delete this transaction? This will correctly recompute totals.");
    if (!ok) return;
    await removeTransaction(id);
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Transactions</h1>
          <p>Search, filter, edit, or delete. All amounts are stored in base currency internally.</p>
        </div>
        <div className="pill">
          <span className="muted">Display</span>
          <strong className="mono">{display}</strong>
        </div>
      </div>

      {ratesWarning ? <div className="notice warn" style={{ marginBottom: 12 }}>{ratesWarning}</div> : null}

      <div className="panel">
        <div className="panel-inner">
          <div className="grid cols-3">
            <div className="field">
              <label>Search</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Merchant, note, source…" />
            </div>
            <div className="field">
              <label>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="field">
              <label>Expense Category</label>
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} disabled={typeFilter !== "expense"}>
                <option value="all">All categories</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid cols-2">
            <div className="field">
              <label>From date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="field">
              <label>To date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: 110 }}>Date</th>
                  <th style={{ minWidth: 90 }}>Type</th>
                  <th style={{ minWidth: 170 }}>Source / Category</th>
                  <th>Description</th>
                  <th style={{ minWidth: 140 }}>Amount ({display})</th>
                  <th style={{ minWidth: 140 }}>Base Amount</th>
                  <th style={{ minWidth: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="muted">No results.</td></tr>
                ) : (
                  filtered.map(t => {
                    const typeLabel = t.type === "income" ? "Income" : "Expense";
                    const src = t.type === "income" ? (t.source || "Income") : categoryLabel(t.category);
                    const amtBase = t.amountBase || 0;
                    const amtDisp = toDisplay(amtBase);
                    return (
                      <tr key={t.id}>
                        <td className="mono">{formatDatePretty(t.date)}</td>
                        <td>
                          <span className={`badge ${t.type === "income" ? "good" : "warn"}`}>{typeLabel}</span>
                        </td>
                        <td>{src}</td>
                        <td>
                          <div>{t.description || "—"}</div>
                          {t.note ? <div className="muted" style={{ marginTop: 4 }}>{t.note}</div> : null}
                        </td>
                        <td className="mono">
                          <Money value={amtDisp} currency={display} showSign />
                        </td>
                        <td className="mono">
                          <Money value={amtBase} currency={settings.baseCurrency} showSign />
                        </td>
                        <td>
                          <div className="actions" style={{ marginTop: 0 }}>
                            <button className="btn" onClick={() => setEditId(t.id)}>Edit</button>
                            <button className="btn danger" onClick={() => confirmDelete(t.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="notice" style={{ marginTop: 12 }}>
            Edit/Delete recompute totals because the app derives all summaries from the transaction list (no hacky deltas).
          </div>
        </div>
      </div>

      <EditModal
        open={!!editingTx}
        tx={editingTx}
        onClose={() => setEditId(null)}
        settings={settings}
        amountBaseToDisplay={amountBaseToDisplay}
        amountDisplayToBase={amountDisplayToBase}
        addOrUpdateTransaction={addOrUpdateTransaction}
      />
    </div>
  );
}

function EditModal({ open, tx, onClose, settings, amountBaseToDisplay, amountDisplayToBase, addOrUpdateTransaction }) {
  const display = settings.displayCurrency;

  const [date, setDate] = useState(isoToday());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [incomeSource, setIncomeSource] = useState("Salary");
  const [incomeCustom, setIncomeCustom] = useState("");

  const [expenseCategory, setExpenseCategory] = useState("fixed");
  const [merchant, setMerchant] = useState("");

  React.useEffect(() => {
    if (!tx) return;
    setDate(tx.date || isoToday());
    const amtDisp = amountBaseToDisplay(tx.amountBase || 0);
    setAmount(Number.isFinite(amtDisp) ? String(Math.abs(amtDisp)) : "");
    setNote(tx.note || "");

    if (tx.type === "income") {
      const src = tx.source || "Salary";
      if (INCOME_SOURCES.includes(src)) {
        setIncomeSource(src);
        setIncomeCustom("");
      } else {
        setIncomeSource("Other");
        setIncomeCustom(src);
      }
    } else {
      setExpenseCategory(tx.category || "fixed");
      setMerchant(tx.description || "");
    }
  }, [tx, amountBaseToDisplay]);

  async function onSave() {
    if (!tx) return;

    const n = safeNumber(amount);
    if (!Number.isFinite(n) || n <= 0) {
      alert("Amount must be a positive number.");
      return;
    }

    const baseAbs = amountDisplayToBase(n);
    if (!Number.isFinite(baseAbs) || baseAbs <= 0) {
      alert("Could not convert amount to base. Try refreshing exchange rates in Settings.");
      return;
    }

    if (tx.type === "income") {
      const srcFinal = incomeSource === "Other" ? (incomeCustom.trim() || "Other") : incomeSource;
      const next = {
        ...tx,
        date,
        amountBase: Math.abs(baseAbs),
        source: srcFinal,
        description: srcFinal,
        note: note.trim() || null,
        updatedAt: Date.now()
      };
      await addOrUpdateTransaction(next);
      onClose();
      return;
    }

    const catObj = EXPENSE_CATEGORIES.find(c => c.key === expenseCategory);
    const catLabel = catObj ? catObj.label : "Expense";
    const label = merchant.trim() || catLabel;

    const next = {
      ...tx,
      date,
      amountBase: -Math.abs(baseAbs),
      category: expenseCategory,
      source: catLabel,
      description: label,
      note: note.trim() || null,
      updatedAt: Date.now()
    };
    await addOrUpdateTransaction(next);
    onClose();
  }

  return (
    <Modal open={open} title="Edit transaction" onClose={onClose}>
      {!tx ? null : (
        <div className="form">
          <div className="grid cols-2">
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Amount ({display})</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
          </div>

          {tx.type === "income" ? (
            <div className="grid cols-2">
              <div className="field">
                <label>Source</label>
                <select value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}>
                  {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Custom source (only used if Source = Other)</label>
                <input value={incomeCustom} onChange={(e) => setIncomeCustom(e.target.value)} />
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
                <input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
            </div>
          )}

          <div className="field">
            <label>Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="actions">
            <button className="btn primary" onClick={onSave}>Save changes</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>

          <div className="notice">
            Editing updates the existing record and recomputes all summaries from the ledger.
          </div>
        </div>
      )}
    </Modal>
  );
}