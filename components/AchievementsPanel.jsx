import { BookMarkedIcon as BookMarked } from "../assets/icons";
import { Trophy, X } from "lucide-react";
import { P, st } from "../styles.js";
import { fmt } from "../gameUtils.js";

export function AchievementsTrigger({ onClick, claimableCount, iconSize = 20 }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: claimableCount > 0 ? P.textPrimary : P.textSecondary,
        display: "flex",
        alignItems: "center",
      }}
      title="Achievements"
    >
      <Trophy size={iconSize} />
      {claimableCount > 0 && (
        <span style={{
          position: "absolute",
          top: 0,
          right: 0,
          minWidth: 14,
          height: 14,
          background: P.rose,
          borderRadius: 7,
          border: `1.5px solid ${P.panelBg}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          fontFamily: "'Junicode',sans-serif",
          fontWeight: 700,
          color: "#fff",
          padding: "0 2px",
        }}>
          {claimableCount}
        </span>
      )}
    </button>
  );
}

const goalLabels = {
  ink:              n => `Collect ${fmt(n)} ink`,
  words:            n => `Inscribe ${fmt(n)} unique words`,
  lexicons:         n => `Publish ${fmt(n)} lexicons`,
  wildcard_letters: n => `Inscribe a ${n}-letter word using only wildcards`,
};

function ProgressBar({ progress, threshold }) {
  const pct     = Math.min(progress / threshold, 1) * 100;
  const isReady = progress >= threshold;
  return (
    <div style={{
      position: "relative",
      height: 20,
      background: P.borderLight,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 12,
    }}>
      <div style={{
        height: "100%",
        width: `${pct}%`,
        background: isReady ? P.sage : P.ink,
        borderRadius: 4,
        transition: "width 0.3s ease",
      }} />
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Junicode',sans-serif",
        fontSize: 10,
        fontWeight: 700,
        color: "#fff",
        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}>
        {fmt(progress)} / {fmt(threshold)}
      </div>
    </div>
  );
}

function RewardClaimRow({ reward, isReady, onClaim }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "'Junicode',sans-serif",
        fontSize: 11,
        color: P.quill,
      }}>
        <BookMarked size={13} />
        {reward} notebook{reward !== 1 ? "s" : ""}
      </div>
      <button
        onClick={() => isReady && onClaim()}
        style={{ ...st.btn(isReady), padding: "6px 14px", fontSize: 11 }}
      >
        Claim
      </button>
    </div>
  );
}

export function AchievementsPanel({ achievements, achievementProgress, achievementLevels, onClaim, onClose }) {
  const totalLevels    = achievements.reduce((s, a) => s + a.levels.length, 0);
  const unlockedLevels = achievements.reduce((s, a) => s + Math.min(achievementLevels[a.id] ?? 0, a.levels.length), 0);

  const visibleAchievements = achievements.filter(a => a.visibility !== "hidden" || (achievementLevels[a.id] ?? 0) > 0);
  const hiddenAchievements  = achievements.filter(a => a.visibility === "hidden" && (achievementLevels[a.id] ?? 0) === 0);

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
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={st.heading}>Achievements</div>
            <div style={{
              fontFamily: "'Junicode',sans-serif",
              fontSize: 11,
              color: P.textMuted,
            }}>
              {unlockedLevels} / {totalLevels}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: P.textMuted, padding: 2, lineHeight: 1 }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ ...st.sub, marginBottom: 20 }}>
          Collect Achievements to earn rewards!
        </div>

        {/* Main achievements */}
        {visibleAchievements.map(a => {
          const claimedCount = achievementLevels[a.id] ?? 0;
          const progress     = achievementProgress[a.id] ?? 0;
          const isMaxed      = claimedCount >= a.levels.length;

          if (isMaxed) {
            return (
              <div key={a.id} style={{ ...st.panel, marginBottom: 12, opacity: 0.6 }}>
                <div style={{
                  fontFamily: "'BLKCHCRY',serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: P.textPrimary,
                  marginBottom: 6,
                }}>
                  {a.levels[a.levels.length - 1].name}
                </div>
                <div style={{
                  fontFamily: "'Junicode',sans-serif",
                  fontSize: 11,
                  color: P.sage,
                  fontWeight: 700,
                }}>
                  ✓ All levels claimed
                </div>
              </div>
            );
          }

          const currentLevel = a.levels[claimedCount];
          const isReady      = progress >= currentLevel.threshold;
          const goalText     = (goalLabels[a.unit ?? "ink"])(currentLevel.threshold);

          return (
            <div key={a.id} style={{ ...st.panel, marginBottom: 12 }}>
              <div style={{
                fontFamily: "'BLKCHCRY',serif",
                fontSize: 14,
                fontWeight: 700,
                color: P.textPrimary,
                marginBottom: 2,
              }}>
                {currentLevel.name}
              </div>
              <div style={{
                fontFamily: "'Junicode',sans-serif",
                fontSize: 11,
                color: P.textSecondary,
                marginBottom: 4,
              }}>
                {goalText}
              </div>
              <div style={{
                fontFamily: "'Junicode',sans-serif",
                fontSize: 10,
                color: P.textMuted,
                marginBottom: 8,
              }}>
                Level {claimedCount + 1} / {a.levels.length}
              </div>
              <ProgressBar progress={progress} threshold={currentLevel.threshold} />
              <RewardClaimRow reward={currentLevel.reward} isReady={isReady} onClaim={() => onClaim(a.id)} />
            </div>
          );
        })}

        {/* Hidden achievements section */}
        {hiddenAchievements.length > 0 && (
          <>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              marginBottom: 12,
            }}>
              <div style={{ flex: 1, height: 1, background: P.border }} />
              <div style={{
                fontFamily: "'Junicode',sans-serif",
                fontSize: 10,
                color: P.textMuted,
                whiteSpace: "nowrap",
              }}>
                Hidden ({hiddenAchievements.length})
              </div>
              <div style={{ flex: 1, height: 1, background: P.border }} />
            </div>

            {hiddenAchievements.map(a => {
              const progress   = achievementProgress[a.id] ?? 0;
              const firstLevel = a.levels[0];
              const isReady    = progress >= firstLevel.threshold;
              const goalText   = (goalLabels[a.unit ?? "ink"])(firstLevel.threshold);

              return (
                <div key={a.id} style={{ ...st.panel, marginBottom: 12, opacity: isReady ? 1 : 0.75 }}>
                  <div style={{
                    fontFamily: "'BLKCHCRY',serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: isReady ? P.textPrimary : P.textMuted,
                    marginBottom: 2,
                    letterSpacing: isReady ? 0 : 2,
                  }}>
                    {isReady ? firstLevel.name : "???"}
                  </div>
                  <div style={{
                    fontFamily: "'Junicode',sans-serif",
                    fontSize: 11,
                    color: isReady ? P.textSecondary : P.textMuted,
                    marginBottom: 4,
                    letterSpacing: isReady ? 0 : 1,
                  }}>
                    {isReady ? goalText : "???"}
                  </div>
                  <div style={{
                    fontFamily: "'Junicode',sans-serif",
                    fontSize: 10,
                    color: P.textMuted,
                    marginBottom: 8,
                  }}>
                    0 / {a.levels.length}
                  </div>
                  <ProgressBar progress={progress} threshold={firstLevel.threshold} />
                  <RewardClaimRow reward={firstLevel.reward} isReady={isReady} onClaim={() => onClaim(a.id)} />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
