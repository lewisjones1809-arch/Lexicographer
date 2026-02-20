import { DropletIcon as Droplet, CaseUpperIcon as CaseUpper } from "../assets/icons";
import { P, st } from "../styles.js";
import { fmt } from "../gameUtils.js";

export function OfflineRewardModal({ reward, onClose }) {
  const h = Math.floor(reward.elapsedSeconds / 3600);
  const m = Math.floor((reward.elapsedSeconds % 3600) / 60);
  const timeStr = h > 0
    ? `${h} hour${h !== 1 ? "s" : ""} ${m} minute${m !== 1 ? "s" : ""}`
    : `${m} minute${m !== 1 ? "s" : ""}`;

  const normalCount  = Object.values(reward.newNormals  || {}).reduce((a, b) => a + b, 0);
  const specialCount = (reward.newSpecials || []).length;

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(44,36,32,0.55)", zIndex:150, animation:"fadeIn 0.3s ease" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:P.panelBg, border:`1px solid ${P.border}`, borderRadius:12, padding:"28px 28px", maxWidth:360, width:"90%", boxShadow:"0 8px 32px rgba(44,36,32,0.15)" }}
      >
        <div style={{ textAlign:"center", fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:P.textPrimary, letterSpacing:1, marginBottom:4 }}>
          Whilst you were away
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:P.textMuted, fontFamily:"'Courier Prime',monospace", marginBottom:22 }}>
          {timeStr}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
          {reward.inkEarned > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:P.textSecondary, fontFamily:"'Courier Prime',monospace" }}>
                <Droplet size={14} strokeWidth={1.5} color={P.ink}/> Ink collected
              </span>
              <span style={{ fontSize:16, fontWeight:700, color:P.ink, fontFamily:"'Playfair Display',serif" }}>
                +{fmt(reward.inkEarned)}
              </span>
            </div>
          )}

          {reward.totalNewLetters > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:P.textSecondary, fontFamily:"'Courier Prime',monospace" }}>
                  <CaseUpper size={14} strokeWidth={1.5}/> Letters produced
                </span>
                <span style={{ fontSize:16, fontWeight:700, color:P.textPrimary, fontFamily:"'Playfair Display',serif" }}>
                  +{reward.totalNewLetters}
                </span>
              </div>
              {specialCount > 0 && (
                <div style={{ textAlign:"right", fontSize:11, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>
                  including {specialCount} special tile{specialCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ ...st.btn(true), width:"100%" }}>
          Continue
        </button>
      </div>
    </div>
  );
}
