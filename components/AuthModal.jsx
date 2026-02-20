import { useState } from "react";
import { FeatherIcon as Feather } from "../assets/icons";
import { X, Eye, EyeOff } from "lucide-react";
import { P } from "../styles.js";

export function AuthModal({ onLogin, onClose, resetToken = null }) {
  const [tab, setTab] = useState("login");        // "login" | "register"
  const [screen, setScreen] = useState(resetToken ? "reset" : null); // null | "forgot" | "sent" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchTab(t) { setTab(t); setError(""); }
  function goForgot() { setScreen("forgot"); setError(""); setEmail(""); }
  function goLogin() { setScreen(null); setTab("login"); setError(""); setPassword(""); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (screen === "forgot") {
        await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setScreen("sent");
        return;
      }

      if (screen === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Something went wrong"); return; }
        localStorage.setItem("lexToken", data.token);
        onLogin(data.user, data.token);
        return;
      }

      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      localStorage.setItem("lexToken", data.token);
      onLogin(data.user, data.token);
    } catch {
      setError("Could not reach the server. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (id) => ({
    flex: 1, padding: "8px 0", border: "none", cursor: "pointer",
    background: tab === id ? P.borderLight : "transparent",
    color: tab === id ? P.textPrimary : P.textMuted,
    fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: tab === id ? 700 : 400,
    borderBottom: tab === id ? `2px solid ${P.quill}` : "2px solid transparent",
    transition: "all 0.2s",
  });

  const title =
    screen === "forgot" ? "Reset Password" :
    screen === "sent"   ? "Check Your Email" :
    screen === "reset"  ? "New Password" :
                          "Lexicographer Account";

  const submitLabel =
    screen === "forgot" ? "Send Reset Email" :
    screen === "reset"  ? "Set New Password" :
    tab === "login"     ? "Sign In" : "Create Account";

  const footerNote =
    screen === "forgot" || screen === "sent"
      ? "Enter the email you registered with."
      : screen === "reset"
        ? "Your account is almost recovered."
        : tab === "register"
          ? "Your account saves your quills, upgrades, and purchases. We never share your data."
          : "Your account saves your quills, upgrades, and purchases across sessions.";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: P.surfaceBg, border: `1px solid ${P.border}`,
        borderRadius: 12, padding: 28, width: 340, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Feather size={18} color={P.quill} />
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: P.textPrimary }}>
              {title}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: P.textMuted, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs — only in normal login/register mode */}
        {screen === null && (
          <div style={{ display: "flex", marginBottom: 20 }}>
            <button style={tabStyle("login")} onClick={() => switchTab("login")}>Sign In</button>
            <button style={tabStyle("register")} onClick={() => switchTab("register")}>Create Account</button>
          </div>
        )}

        {/* "Sent" confirmation screen */}
        {screen === "sent" ? (
          <div>
            <div style={{ fontSize: 13, color: P.textSecondary, fontFamily: "'Junicode',sans-serif", lineHeight: 1.6, marginBottom: 20 }}>
              If an account exists for that address, a reset link has been sent. Check your inbox (and spam folder).
            </div>
            <button onClick={goLogin} style={{
              width: "100%", padding: "11px 0", borderRadius: 6, border: "none",
              background: P.btnInactiveBg, color: P.btnInactiveText,
              fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Email — shown on login / register / forgot */}
            {screen !== "reset" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: P.textMuted, fontFamily: "'Junicode',sans-serif", letterSpacing: 0.5 }}>EMAIL</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                  style={{
                    padding: "10px 12px", borderRadius: 6, border: `1px solid ${P.border}`,
                    background: P.panelBg, color: P.textPrimary,
                    fontFamily: "'Junicode',sans-serif", fontSize: 13, outline: "none",
                  }}
                />
              </div>
            )}

            {/* Password — shown on login / register / reset (not forgot) */}
            {screen !== "forgot" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: P.textMuted, fontFamily: "'Junicode',sans-serif", letterSpacing: 0.5 }}>
                  {screen === "reset" ? "NEW PASSWORD" : "PASSWORD"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    required minLength={8}
                    autoComplete={tab === "login" && screen === null ? "current-password" : "new-password"}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "10px 38px 10px 12px", borderRadius: 6,
                      border: `1px solid ${P.border}`, background: P.panelBg,
                      color: P.textPrimary, fontFamily: "'Junicode',sans-serif",
                      fontSize: 13, outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: P.textMuted, display: "flex", alignItems: "center", padding: 2,
                    }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {(tab === "register" || screen === "reset") && (
                  <div style={{ fontSize: 10, color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>
                    Minimum 8 characters
                  </div>
                )}
              </div>
            )}

            {/* Forgot password link — login tab only */}
            {screen === null && tab === "login" && (
              <div style={{ textAlign: "right", marginTop: -4 }}>
                <button
                  type="button" onClick={goForgot}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: P.textMuted, fontFamily: "'Junicode',sans-serif", padding: 0, textDecoration: "underline" }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div style={{
                padding: "8px 12px", background: "#3a1a1a", border: "1px solid #8a3030",
                borderRadius: 6, fontSize: 12, color: "#e07070",
                fontFamily: "'Junicode',sans-serif",
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 4, padding: "11px 0", borderRadius: 6, border: "none",
              background: loading ? P.btnInactiveBg : P.btnActiveBg,
              color: loading ? P.btnInactiveText : P.btnActiveText,
              fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700,
              cursor: loading ? "default" : "pointer", transition: "all 0.2s",
            }}>
              {loading ? "Please wait…" : submitLabel}
            </button>

            {/* Back link on forgot screen */}
            {screen === "forgot" && (
              <button
                type="button" onClick={goLogin}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: P.textMuted, fontFamily: "'Junicode',sans-serif", textDecoration: "underline", padding: 0, marginTop: -4 }}
              >
                Back to sign in
              </button>
            )}
          </form>
        )}

        <div style={{ marginTop: 16, fontSize: 10, color: P.textMuted, fontFamily: "'Junicode',sans-serif", textAlign: "center", lineHeight: 1.5 }}>
          {footerNote}
        </div>
      </div>
    </div>
  );
}
