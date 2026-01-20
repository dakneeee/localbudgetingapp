import React from "react";
import { NavLink } from "react-router-dom";

function Tab({ to, label, tourKey }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
      data-tour={tourKey}
    >
      <div className="dot" />
      <div>{label}</div>
    </NavLink>
  );
}

export default function BottomTabs() {
  return (
    <div className="bottom-tabs">
      <div className="tabs-bar" data-tour="tabs">
        <Tab to="/" label="Dashboard" />
        <Tab to="/add" label="Add" tourKey="tab-add" />
        <Tab to="/savings" label="Savings" />
        <Tab to="/transactions" label="Transactions" />
        <Tab to="/settings" label="Settings" tourKey="tab-settings" />
      </div>
    </div>
  );
}
