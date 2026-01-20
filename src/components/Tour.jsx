import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TOUR_STORAGE_KEY = "ledgerleaf_tour_seen";

const steps = [
  {
    id: "welcome",
    path: "/",
    selector: '[data-tour="dashboard-title"]',
    title: "Welcome to Ledgerleaf",
    body: "This page gives you a quick snapshot of your budget for the current period."
  },
  {
    id: "income",
    path: "/",
    selector: '[data-tour="dashboard-income"]',
    title: "Total income",
    body: "Add income first so the app can split it into budget buckets."
  },
  {
    id: "buckets",
    path: "/",
    selector: '[data-tour="dashboard-buckets"]',
    title: "Budget categories (buckets)",
    body: "Each bucket is a portion of your income: Fixed Costs, Long‑Term Investments, Savings (Big + Irregular), and Guilt‑Free Spending."
  },
  {
    id: "framework",
    path: "/",
    selector: '[data-tour="framework-info"]',
    title: "What’s the framework?",
    body: "Tap this info button anytime to see how each category works in plain language."
  },
  {
    id: "tabs",
    path: "/",
    selector: '[data-tour="tabs"]',
    title: "Navigation",
    body: "Use these tabs to move between Dashboard, Add, Savings, Transactions, and Settings."
  },
  {
    id: "add",
    path: "/add",
    selector: '[data-tour="add-form"]',
    title: "Add a transaction",
    body: "Enter income or expenses here. The app stores everything in your base currency for accuracy."
  },
  {
    id: "savings",
    path: "/savings",
    selector: '[data-tour="savings-cards"]',
    title: "Savings tab",
    body: "See how much you’ve allocated, spent, and have left for Big Goals and Irregular Expenses."
  },
  {
    id: "transactions",
    path: "/transactions",
    selector: '[data-tour="transactions-panel"]',
    title: "Transactions tab",
    body: "Search and filter your full history, then edit or delete any item."
  },
  {
    id: "settings",
    path: "/settings",
    selector: '[data-tour="settings-profile"]',
    title: "Personalize",
    body: "Update your name, budget period, and currency settings here."
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function Tour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const step = steps[stepIndex];

  useEffect(() => {
    const force = localStorage.getItem("ledgerleaf_tour_force");
    if (force) {
      localStorage.removeItem("ledgerleaf_tour_force");
      localStorage.removeItem(TOUR_STORAGE_KEY);
      setOpen(true);
      return;
    }
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (location.pathname !== step.path) {
      navigate(step.path);
    }
  }, [open, step, location.pathname, navigate]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [open, step, location.pathname]);

  useEffect(() => {
    if (!open) return;
    let raf = null;
    function updateRect() {
      const el = document.querySelector(step.selector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }
    function onMove() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRect);
    }
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, step]);

  const cardStyle = useMemo(() => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const width = 280;
    const margin = 16;
    const preferredTop = targetRect.bottom + 12;
    const estimatedHeight = 170;
    const maxLeft = window.innerWidth - width - margin;
    const left = clamp(targetRect.left, margin, maxLeft);
    const useAbove = preferredTop + estimatedHeight > window.innerHeight;
    const top = useAbove ? targetRect.top - 12 - estimatedHeight : preferredTop;
    return { top: Math.max(margin, top), left };
  }, [targetRect]);

  function closeTour() {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    setOpen(false);
  }

  function nextStep() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      closeTour();
    }
  }

  function prevStep() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  if (!open) return null;

  return (
    <div className="tour-layer" aria-live="polite">
      <div className="tour-backdrop" onClick={closeTour} />
      {targetRect ? (
        <div
          className="tour-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
          }}
        />
      ) : null}
      <div className="tour-card" style={cardStyle}>
        <div className="tour-step">Step {stepIndex + 1} of {steps.length}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button className="btn ghost" onClick={closeTour}>Skip</button>
          <div className="tour-spacer" />
          <button className="btn" onClick={prevStep} disabled={stepIndex === 0}>Back</button>
          <button className="btn primary" onClick={nextStep}>
            {stepIndex === steps.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
