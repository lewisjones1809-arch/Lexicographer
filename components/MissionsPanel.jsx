import { Calendar, X, BookMarked } from "lucide-react";
import { P, st } from "../styles.js";

function getMidnightCountdown() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight - now;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function MissionsTrigger({ onClick, hasUnclaimed }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: hasUnclaimed ? P.textPrimary : P.textSecondary,
        display: "flex",
        alignItems: "center",
      }}
      title="Daily Missions"
    >
      <Calendar size={20} />
      {hasUnclaimed && (
        <span style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 10,
          height: 10,
          background: P.rose,
          borderRadius: "50%",
          border: `1.5px solid ${P.panelBg}`,
        }} />
      )}
    </button>
  );
}

export function MissionsPanel({ missions, onClaim, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44,36,32,0.55)",
        zIndex: 200,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: 80,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: P.panelBg,
          border: `1px solid ${P.border}`,
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 8px 40px rgba(44,36,32,0.28)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={st.heading}>Daily Missions</div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: P.textMuted, padding: 2, lineHeight: 1 }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ ...st.sub, marginBottom: 20 }}>
          Resets in: {getMidnightCountdown()}
        </div>

        {/* Mission cards */}
        {missions.map(m => {
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
          const isComplete = m.progress >= m.target;
          return (
            <div key={m.id} style={{ ...st.panel, marginBottom: 12 }}>
              <div style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 14,
                fontWeight: 700,
                color: P.textPrimary,
                marginBottom: 4,
              }}>
                {missionTitle(m)}
              </div>
              <div style={{
                fontFamily: "'Courier Prime',monospace",
                fontSize: 11,
                color: P.textSecondary,
                marginBottom: 10,
                lineHeight: 1.5,
              }}>
                {m.desc}
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6,
                background: P.borderLight,
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: 6,
              }}>
                <div style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: isComplete ? P.sage : P.ink,
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div style={{
                fontFamily: "'Courier Prime',monospace",
                fontSize: 10,
                color: P.textMuted,
                marginBottom: 12,
              }}>
                {m.progress} / {m.target}
              </div>

              {/* Reward + claim row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "'Courier Prime',monospace",
                  fontSize: 11,
                  color: P.quill,
                }}>
                  <BookMarked size={13} />
                  {m.reward} notebook{m.reward !== 1 ? "s" : ""}
                </div>
                {m.claimed ? (
                  <span style={{
                    fontFamily: "'Courier Prime',monospace",
                    fontSize: 11,
                    color: P.sage,
                    fontWeight: 700,
                  }}>
                    ✓ Claimed
                  </span>
                ) : (
                  <button
                    onClick={() => isComplete && onClaim(m.id)}
                    style={{
                      ...st.btn(isComplete),
                      padding: "6px 14px",
                      fontSize: 11,
                    }}
                  >
                    Claim
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function missionTitle(m) {
  switch (m.type) {
    case "words_inscribed":   return `Inscribe ${m.target} Words`;
    case "ink_collected":     return `Collect ${m.target} Ink`;
    case "letters_collected": return `Collect ${m.target} Letters`;
    case "long_word":         return `Write a ${m.minLength}+ Letter Word`;
    case "publish":           return "Publish a Lexicon";
    default:                  return m.desc;
  }
}
