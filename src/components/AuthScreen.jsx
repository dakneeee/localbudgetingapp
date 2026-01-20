import React, { useState } from "react";

export default function AuthScreen({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        localStorage.setItem("ledgerleaf_remember", remember ? "1" : "0");
        const { error } = await onSignIn(emailTrimmed, password, remember);
        if (error) alert(error.message);
      } else {
        localStorage.setItem("ledgerleaf_remember", remember ? "1" : "0");
        const { error } = await onSignUp(emailTrimmed, password);
        if (error) alert(error.message);
        else {
          localStorage.setItem("ledgerleaf_tour_force", "1");
          localStorage.removeItem("ledgerleaf_tour_seen");
          alert("Check your email to confirm your account, then sign in.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Ledgerleaf</h1>
        <p className="sub">Sign in to sync your data across devices.</p>

        <div className="actions" style={{ marginTop: 10 }}>
          <button
            className={`btn ${mode === "signin" ? "primary" : ""}`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`btn ${mode === "signup" ? "primary" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <label className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Keep me signed in
          </label>
          <button className="btn primary" type="submit" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
