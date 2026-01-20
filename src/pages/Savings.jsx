import React, { useMemo } from "react";
import Money from "../components/Money.jsx";

function pct(n) {
  const x = Math.max(0, Math.min(1, n));
  return `${Math.round(x * 100)}%`;
}

export default function Savings({ ctx }) {
  const {
    settings,
    ratesWarning,
    savingsGoalBase,
    savingsSavedBase,
    savingsProgressBase,
    savingsTotalBase,
    savingsExtraBase,
    enabledSavings,
    amountBaseToDisplay
  } = ctx;
  const display = settings.displayCurrency;

  function toDisplay(n) {
    const v = amountBaseToDisplay(n);
    return v ?? 0;
  }

  const longTermProgress = useMemo(() => {
    const goal = savingsGoalBase.longTerm || 0;
    const saved = savingsProgressBase.longTerm || 0;
    if (goal <= 0) return 0;
    return saved / goal;
  }, [savingsGoalBase, savingsSavedBase]);

  const bigProgress = useMemo(() => {
    const goal = savingsGoalBase.big || 0;
    const saved = savingsProgressBase.big || 0;
    if (goal <= 0) return 0;
    return saved / goal;
  }, [savingsGoalBase, savingsSavedBase]);

  const irregularProgress = useMemo(() => {
    const goal = savingsGoalBase.irregular || 0;
    const saved = savingsProgressBase.irregular || 0;
    if (goal <= 0) return 0;
    return saved / goal;
  }, [savingsGoalBase, savingsSavedBase]);

  const totalGoalBase = (savingsGoalBase.longTerm || 0) + (savingsGoalBase.big || 0) + (savingsGoalBase.irregular || 0);
  const totalProgress = useMemo(() => {
    if (totalGoalBase <= 0) return 0;
    const savedOnly = (savingsProgressBase.longTerm || 0) + (savingsProgressBase.big || 0) + (savingsProgressBase.irregular || 0);
    return savedOnly / totalGoalBase;
  }, [savingsSavedBase, totalGoalBase]);

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Savings</h1>
          <p>
            Your monthly or weekly savings goals are based on your budgeted income.
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
            {enabledSavings?.invest !== false ? (
            <div className="card">
              <div className="row">
                <h3 style={{ margin: 0 }}>Long-Term Investments</h3>
                <span className={`badge ${savingsSavedBase.longTerm >= savingsGoalBase.longTerm ? "good" : "warn"}`}>
                  {savingsSavedBase.longTerm >= savingsGoalBase.longTerm ? "On goal" : "Building"}
                </span>
              </div>

              <div className="kpi">
                <div className="item">
                  <div className="label">Goal</div>
                  <div className="value"><Money value={toDisplay(savingsGoalBase.longTerm)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsGoalBase.longTerm} currency={settings.baseCurrency} /></div>
                </div>
                <div className="item">
                  <div className="label">Saved</div>
                  <div className="value"><Money value={toDisplay(savingsSavedBase.longTerm)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsSavedBase.longTerm} currency={settings.baseCurrency} /></div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="row">
                  <div className="sub">This {settings.period === "weekly" ? "week's" : "month's"} progress</div>
                  <div className="mono muted">{pct(longTermProgress)}</div>
                </div>
                <div className="progress" aria-label="Long-term savings progress">
                  <div style={{ width: pct(longTermProgress) }} />
                </div>
              </div>
            </div>
            ) : null}

            {enabledSavings?.save_big !== false ? (
            <div className="card">
              <div className="row">
                <h3 style={{ margin: 0 }}>Big Goals</h3>
                <span className={`badge ${savingsSavedBase.big >= savingsGoalBase.big ? "good" : "warn"}`}>
                  {savingsSavedBase.big >= savingsGoalBase.big ? "On goal" : "Building"}
                </span>
              </div>

              <div className="kpi">
                <div className="item">
                  <div className="label">Goal</div>
                  <div className="value"><Money value={toDisplay(savingsGoalBase.big)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsGoalBase.big} currency={settings.baseCurrency} /></div>
                </div>
                <div className="item">
                  <div className="label">Saved</div>
                  <div className="value"><Money value={toDisplay(savingsSavedBase.big)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsSavedBase.big} currency={settings.baseCurrency} /></div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="row">
                  <div className="sub">This {settings.period === "weekly" ? "week's" : "month's"} progress</div>
                  <div className="mono muted">{pct(bigProgress)}</div>
                </div>
                <div className="progress" aria-label="Big goals progress">
                  <div style={{ width: pct(bigProgress) }} />
                </div>
              </div>
            </div>
            ) : null}

            {enabledSavings?.save_irregular !== false ? (
            <div className="card">
              <div className="row">
                <h3 style={{ margin: 0 }}>Irregular Expenses</h3>
                <span className={`badge ${savingsSavedBase.irregular >= savingsGoalBase.irregular ? "good" : "warn"}`}>
                  {savingsSavedBase.irregular >= savingsGoalBase.irregular ? "On goal" : "Building"}
                </span>
              </div>

              <div className="kpi">
                <div className="item">
                  <div className="label">Goal</div>
                  <div className="value"><Money value={toDisplay(savingsGoalBase.irregular)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsGoalBase.irregular} currency={settings.baseCurrency} /></div>
                </div>
                <div className="item">
                  <div className="label">Saved</div>
                  <div className="value"><Money value={toDisplay(savingsSavedBase.irregular)} currency={display} /></div>
                  <div className="sub mono muted">Base: <Money value={savingsSavedBase.irregular} currency={settings.baseCurrency} /></div>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="row">
                  <div className="sub">This {settings.period === "weekly" ? "week's" : "month's"} progress</div>
                  <div className="mono muted">{pct(irregularProgress)}</div>
                </div>
                <div className="progress" aria-label="Irregular expenses progress">
                  <div style={{ width: pct(irregularProgress) }} />
                </div>
              </div>
            </div>
            ) : null}
          </div>

          <div className="notice" style={{ marginTop: 12 }}>
            Progress only increases when you log savings as expenses in those categories. Extras count toward total only.
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="row">
              <h3 style={{ margin: 0 }}>Total Savings</h3>
              <span className="mono">
                <Money value={toDisplay(savingsTotalBase)} currency={display} />
              </span>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="row">
                <div className="sub">Progress (total vs goal)</div>
                <div className="mono muted">{pct(totalProgress)}</div>
              </div>
              <div className="progress" aria-label="Total savings progress">
                <div style={{ width: pct(totalProgress) }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
