import React, { useState } from "react";
import Money from "../components/Money.jsx";
import Modal from "../components/Modal.jsx";
import { BUCKETS } from "../utils.js";

function bucketBadge(bucketKey, remainingBase) {
  const isSavings = bucketKey === "save_big" || bucketKey === "save_irregular";
  if (isSavings) {
    if (remainingBase < 0) return { cls: "good", text: "Ahead of goal" };
    if (remainingBase === 0) return { cls: "warn", text: "At target" };
    return { cls: "warn", text: "Building" };
  }
  if (remainingBase < 0) return { cls: "bad", text: "Over limit" };
  if (remainingBase === 0) return { cls: "warn", text: "At limit" };
  return { cls: "good", text: "On track" };
}

export default function Dashboard({ ctx }) {
  const {
    settings,
    ratesWarning,
    budgetIncomeBase,
    extraIncomeBase,
    allocatedBase,
    spentBase,
    remainingBase,
    enabledSavings,
    cycleLabel,
    amountBaseToDisplay
  } = ctx;
  const display = settings.displayCurrency;
  const [infoOpen, setInfoOpen] = useState(false);

  function toDisplay(n) {
    const v = amountBaseToDisplay(n);
    return v ?? 0;
  }

  return (
    <>
      <div className="container">
      <div className="header">
        <div className="title" data-tour="dashboard-title">
          <h1>Dashboard</h1>
          <p>Hello, <span className="mono">{settings.name?.trim() ? settings.name.trim() : "there"}</span>.</p>
          <p>
            Period: <span className="mono">{settings.period.toUpperCase()}</span>. Base currency stored internally as{" "}
            <span className="mono">{settings.baseCurrency}</span>.
          </p>
          <button className="icon-btn" type="button" onClick={() => setInfoOpen(true)} data-tour="framework-info">
            <span aria-hidden="true">i</span>
            <span className="sr-only">Explain the budgeting framework</span>
          </button>
        </div>
        <div className="pill" data-tour="dashboard-income">
          <span className="muted">{settings.period === "weekly" ? "Weekly budget" : "Monthly budget"}</span>
          <strong>
            <Money value={toDisplay(budgetIncomeBase)} currency={display} />
          </strong>
        </div>
        <div className="pill">
          <span className="muted">Cycle</span>
          <strong className="mono">{cycleLabel}</strong>
        </div>
        <div className="pill">
          <span className="muted">Extra</span>
          <strong>
            <Money value={toDisplay(extraIncomeBase)} currency={display} />
          </strong>
        </div>
      </div>

      {ratesWarning ? <div className="notice warn" style={{ marginBottom: 12 }}>{ratesWarning}</div> : null}

      <div className="panel">
        <div className="panel-inner">
          <div className="grid cols-2" data-tour="dashboard-buckets">
            {BUCKETS.filter((b) => {
              if (b.key === "invest") return enabledSavings?.invest !== false;
              if (b.key === "save_big") return enabledSavings?.save_big !== false;
              if (b.key === "save_irregular") return enabledSavings?.save_irregular !== false;
              return true;
            }).map((b) => {
              const alloc = allocatedBase[b.key] || 0;
              const spent = spentBase[b.key] || 0;
              const rem = remainingBase[b.key] || 0;
              const badge = bucketBadge(b.key, rem);
              const isSavings = b.key === "save_big" || b.key === "save_irregular";
              const remColor = isSavings && rem < 0 ? "var(--good)" : rem < 0 ? "var(--bad)" : "inherit";

              return (
                <div className="card" key={b.key}>
                  <div className="row">
                    <h3 style={{ margin: 0 }}>{b.label}</h3>
                    <span className={`badge ${badge.cls}`}>{badge.text}</span>
                  </div>

                  <div className="kpi">
                    <div className="item">
                      <div className="label">Allocated</div>
                      <div className="value">
                        <Money value={toDisplay(alloc)} currency={display} />
                      </div>
                      <div className="sub mono muted">
                        Base: <Money value={alloc} currency={settings.baseCurrency} />
                      </div>
                    </div>
                    <div className="item">
                      <div className="label">{b.key === "save_big" || b.key === "save_irregular" ? "Added" : "Spent"}</div>
                      <div className="value">
                        <Money value={toDisplay(spent)} currency={display} />
                      </div>
                      <div className="sub mono muted">
                        Base: <Money value={spent} currency={settings.baseCurrency} />
                      </div>
                    </div>
                    <div className="item" style={{ gridColumn: "1 / -1" }}>
                      <div className="label">Remaining</div>
                      <div className="value" style={{ color: remColor }}>
                        <Money value={toDisplay(rem)} currency={display} />
                      </div>
                      <div className="sub mono muted">
                        Base: <Money value={rem} currency={settings.baseCurrency} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12 }} className="notice">
            Overspending is allowed. If a category goes below zero, we will mark it so you can review it later.
          </div>
        </div>
      </div>
    </div>

      <Modal open={infoOpen} title="Budget framework explained" onClose={() => setInfoOpen(false)}>
      <div className="notice" style={{ marginBottom: 10 }}>
        This app splits your income into simple buckets so you know what each part of your money is for.
      </div>
      <div className="grid">
        <div className="card">
          <h3>Fixed Costs</h3>
          <p className="sub">Rent, bills, groceries, and anything you must pay.</p>
        </div>
        <div className="card">
          <h3>Long‑Term Investments</h3>
          <p className="sub">Savings/investing for your future (retirement, education, etc.).</p>
        </div>
        <div className="card">
          <h3>Savings: Big Goals</h3>
          <p className="sub">Planned goals like travel, a laptop, or a big purchase.</p>
        </div>
        <div className="card">
          <h3>Savings: Irregular Expenses</h3>
          <p className="sub">Non‑monthly costs like birthdays, repairs, or annual fees.</p>
        </div>
        <div className="card">
          <h3>Guilt‑Free Spending</h3>
          <p className="sub">Fun money you can spend without stress.</p>
        </div>
      </div>
      <div className="notice" style={{ marginTop: 10 }}>
        The Savings tab shows how much you’ve contributed and spent in both savings buckets.
        The Transactions tab shows every income and expense in one list.
      </div>
      </Modal>
    </>
  );
}
