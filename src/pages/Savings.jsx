import React, { useMemo } from "react";
import Money from "../components/Money.jsx";

function pct(n) {
  const x = Math.max(0, Math.min(1, n));
  return `${Math.round(x * 100)}%`;
}

export default function Savings({ ctx }) {
  const { settings, ratesWarning, savingsContribBase, savingsSpentBase, savingsRemainingBase, amountBaseToDisplay } = ctx;
  const display = settings.displayCurrency;
  const bigAhead = savingsRemainingBase.big < 0;
  const irregularAhead = savingsRemainingBase.irregular < 0;

  function toDisplay(n) {
    const v = amountBaseToDisplay(n);
    return v ?? 0;
  }

  const bigProgress = useMemo(() => {
    const total = savingsContribBase.big || 0;
    const spent = savingsSpentBase.big || 0;
    if (total <= 0) return 0;
    return (total - Math.max(0, (savingsRemainingBase.big || 0))) / total; // spent/allocated
  }, [savingsContribBase, savingsSpentBase, savingsRemainingBase]);

  const irrProgress = useMemo(() => {
    const total = savingsContribBase.irregular || 0;
    const spent = savingsSpentBase.irregular || 0;
    if (total <= 0) return 0;
    return (total - Math.max(0, (savingsRemainingBase.irregular || 0))) / total;
  }, [savingsContribBase, savingsSpentBase, savingsRemainingBase]);

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Savings</h1>
          <p>
            Savings are allocated from your total income as part of the framework (10% Big Goals, 10% Irregular).
          </p>
        </div>
        <div className="pill">
          <span className="muted">Display</span>
          <strong className="mono">{display}</strong>
        </div>
      </div>

      {ratesWarning ? <div className="notice warn" style={{ marginBottom: 12 }}>{ratesWarning}</div> : null}

      <div className="panel">
        <div className="panel-inner">
          <div className="grid cols-2" data-tour="savings-cards">
            <div className="card">
              <div className="row">
                <h3 style={{ margin: 0 }}>Big Goals</h3>
                <span className={`badge ${bigAhead ? "good" : "warn"}`}>
                  {bigAhead ? "Ahead of goal" : "Building"}
                </span>
              </div>

              <div className="kpi">
                <div className="item">
                  <div className="label">Allocated</div>
                  <div className="value"><Money value={toDisplay(savingsContribBase.big)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsContribBase.big} currency={settings.baseCurrency} /></div>
                </div>
                <div className="item">
                  <div className="label">Spent</div>
                  <div className="value"><Money value={toDisplay(savingsSpentBase.big)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsSpentBase.big} currency={settings.baseCurrency} /></div>
                </div>
                <div className="item" style={{ gridColumn: "1 / -1" }}>
                  <div className="label">Remaining</div>
                  <div className="value" style={{ color: bigAhead ? "var(--good)" : "inherit" }}>
                    <Money value={toDisplay(savingsRemainingBase.big)} currency={display} />
                  </div>
                  <div className="sub mono muted">Base: <Money value={savingsRemainingBase.big} currency={settings.baseCurrency} /></div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="row">
                  <div className="sub">Progress (spent vs allocated)</div>
                  <div className="mono muted">{pct(bigProgress)}</div>
                </div>
                <div className="progress" aria-label="Big goals progress">
                  <div style={{ width: pct(bigProgress) }} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="row">
                <h3 style={{ margin: 0 }}>Irregular Expenses</h3>
                <span className={`badge ${irregularAhead ? "good" : "warn"}`}>
                  {irregularAhead ? "Ahead of goal" : "Building"}
                </span>
              </div>

              <div className="kpi">
                <div className="item">
                  <div className="label">Allocated</div>
                  <div className="value"><Money value={toDisplay(savingsContribBase.irregular)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsContribBase.irregular} currency={settings.baseCurrency} /></div>
                </div>
                <div className="item">
                  <div className="label">Spent</div>
                  <div className="value"><Money value={toDisplay(savingsSpentBase.irregular)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsSpentBase.irregular} currency={settings.baseCurrency} /></div>
                </div>
                <div className="item" style={{ gridColumn: "1 / -1" }}>
                  <div className="label">Remaining</div>
                  <div className="value" style={{ color: irregularAhead ? "var(--good)" : "inherit" }}>
                    <Money value={toDisplay(savingsRemainingBase.irregular)} currency={display} />
                  </div>
                  <div className="sub mono muted">Base: <Money value={savingsRemainingBase.irregular} currency={settings.baseCurrency} /></div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="row">
                  <div className="sub">Progress (spent vs allocated)</div>
                  <div className="mono muted">{pct(irrProgress)}</div>
                </div>
                <div className="progress" aria-label="Irregular expenses progress">
                  <div style={{ width: pct(irrProgress) }} />
                </div>
              </div>
            </div>
          </div>

          <div className="notice" style={{ marginTop: 12 }}>
            These “Savings” buckets behave like envelopes: they are allocated from income, then expenses can consume them.
          </div>
        </div>
      </div>
    </div>
  );
}
