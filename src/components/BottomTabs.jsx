import React from "react";
import { NavLink } from "react-router-dom";

function Tab({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
    >
      <div className="dot" />
      <div>{label}</div>
    </NavLink>
  );
}

export default function BottomTabs() {
  return (
    <div className="bottom-tabs">
      <div className="tabs-bar">
        <Tab to="/" label="Dashboard" />
        <Tab to="/add" label="Add" />
        <Tab to="/savings" label="Savings" />
        <Tab to="/transactions" label="Transactions" />
        <Tab to="/settings" label="Settings" />
      </div>
    </div>
  );
}