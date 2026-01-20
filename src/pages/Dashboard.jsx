import React from "react";
import Money from "../components/Money.jsx";
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
  const { settings, ratesWarning, totalIncomeBase, allocatedBase, spentBase, remainingBase, amountBaseToDisplay } = ctx;
  const display = settings.displayCurrency;

  function toDisplay(n) {
    const v = amountBaseToDisplay(n);
    return v ?? 0;
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Dashboard</h1>
          <p>Hello, <span className="mono">{settings.name?.trim() ? settings.name.trim() : "there"}</span>.</p>
          <p>
            Period: <span className="mono">{settings.period.toUpperCase()}</span>. Base currency stored internally as{" "}
            <span className="mono">{settings.baseCurrency}</span>.
          </p>
        </div>
        <div className="pill">
          <span className="muted">Total income</span>
          <strong>
            <Money value={toDisplay(totalIncomeBase)} currency={display} />
          </strong>
        </div>
      </div>

      {ratesWarning ? <div className="notice warn" style={{ marginBottom: 12 }}>{ratesWarning}</div> : null}

      <div className="panel">
        <div className="panel-inner">
          <div className="grid cols-2">
            {BUCKETS.map((b) => {
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
                      <div className="label">Spent</div>
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
  );
}
