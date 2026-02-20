import { Feather, Aperture } from "lucide-react";
import { P } from "../styles.js";
import { WORDS_PER_PAGE, TILE_TYPES } from "../constants.js";
import { sortEntries, fmt } from "../gameUtils.js";

function BookTile({ letter, type, size }) {
  const tt = TILE_TYPES[type] || TILE_TYPES.normal;
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: tt.color, border: `1.5px solid ${tt.border}`, borderRadius: 3,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Playfair Display',serif", fontSize: size * 0.6,
      fontWeight: 700, color: tt.text,
    }}>
      {type === "lexicoin" ? <Aperture size={Math.round(size * 0.5)} /> : letter}
    </div>
  );
}

// --- BOOK VIEW (full in-page book renderer) ---
export function BookView({ entries, cover, pageStyle, currentPage, setCurrentPage, compact, onClose }) {
  const sorted = sortEntries(entries);
  const totalPages = Math.max(1, Math.ceil(sorted.length / WORDS_PER_PAGE));
  const page = Math.min(currentPage, totalPages - 1);
  const pageEntries = sorted.slice(page * WORDS_PER_PAGE, (page + 1) * WORDS_PER_PAGE);
  const bw = compact ? 280 : 320;
  const bh = compact ? 360 : 420;

  const coverPatternStyle = cover.pattern === "gold-border"
    ? { boxShadow:`inset 0 0 0 6px ${cover.accent}40, inset 0 0 0 8px ${cover.accent}20, 0 8px 24px rgba(0,0,0,0.4)` }
    : cover.pattern === "sigils"
    ? { backgroundImage:`radial-gradient(circle at 30% 40%, ${cover.accent}15 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${cover.accent}10 0%, transparent 40%)` }
    : cover.pattern === "stars"
    ? { backgroundImage:`radial-gradient(1px 1px at 20% 30%, ${cover.accent}80 0%, transparent 100%), radial-gradient(1px 1px at 50% 70%, ${cover.accent}60 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, ${cover.accent}40 0%, transparent 100%), radial-gradient(1.5px 1.5px at 35% 85%, ${cover.accent}70 0%, transparent 100%), radial-gradient(1px 1px at 65% 45%, ${cover.accent}50 0%, transparent 100%)` }
    : {};

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{
        width:bw, height:bh, borderRadius:"4px 12px 12px 4px", position:"relative", overflow:"hidden",
        background:cover.color, border:`2px solid ${cover.accent}50`,
        boxShadow:`4px 0 8px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.3)`,
        ...coverPatternStyle
      }}>
        {/* Spine edge */}
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:14,
          background:`linear-gradient(90deg, ${cover.accent}20, transparent)`,
          borderRight:`1px solid ${cover.accent}30`
        }}/>

        {/* Page interior */}
        <div style={{
          position:"absolute", top:12, right:12, bottom:12, left:22,
          background:pageStyle.bg, borderRadius:"2px 8px 8px 2px",
          padding:"16px 14px", display:"flex", flexDirection:"column",
          boxShadow:"inset 0 0 10px rgba(0,0,0,0.08)"
        }}>
          {/* Page header */}
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            borderBottom:`1px solid ${pageStyle.accent}40`, paddingBottom:8, marginBottom:10
          }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:10, color:pageStyle.accent, letterSpacing:1, textTransform:"uppercase" }}>
              Lexicon
            </span>
            <span style={{ fontFamily:"'Courier Prime',monospace", fontSize:9, color:pageStyle.accent }}>
              pg {page + 1} / {totalPages}
            </span>
          </div>

          {/* Word list — single column, one tile row per entry */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
            {pageEntries.length === 0 && (
              <div style={{ fontStyle:"italic", fontSize:11, color:pageStyle.accent, opacity:0.5, padding:8, textAlign:"center" }}>
                Empty lexicon
              </div>
            )}
            {pageEntries.map((entry, wi) => {
              const tileSize = compact ? 16 : 18;
              const py = compact ? 3 : 4;
              const tileLetters = entry.letters || entry.word.split("").map(l => ({ letter: l, type: "normal" }));
              return (
                <div key={wi} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:`${py}px 4px`, borderBottom:`1px solid ${pageStyle.accent}15`,
                  animation:"wordFadeIn 0.3s ease both", animationDelay:`${wi * 0.03}s`,
                }}>
                  <div style={{ display:"flex", gap:2, overflow:"hidden" }}>
                    {tileLetters.map((lt, i) => (
                      <BookTile key={i} letter={lt.letter} type={lt.type} size={tileSize} />
                    ))}
                  </div>
                  <span style={{
                    fontFamily:"'Courier Prime',monospace", fontSize:9,
                    color:pageStyle.accent, whiteSpace:"nowrap", marginLeft:4, flexShrink:0,
                  }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:2 }}>
                      <Aperture size={8}/>{entry.score}
                    </span>
                  </span>
                </div>
              );
            })}
            {Array.from({ length: WORDS_PER_PAGE - pageEntries.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                borderBottom:`1px dashed ${pageStyle.accent}08`,
                height: compact ? 22 : 26,
              }}/>
            ))}
          </div>

          {/* Page total */}
          {entries.length > 0 && (
            <div style={{
              borderTop:`1px solid ${pageStyle.accent}30`, paddingTop:6, marginTop:4,
              display:"flex", justifyContent:"space-between",
              fontFamily:"'Courier Prime',monospace", fontSize:10, color:pageStyle.accent
            }}>
              <span>{entries.length} word{entries.length !== 1 ? "s" : ""}</span>
              <span style={{display:"inline-flex",alignItems:"center",gap:2}}><Aperture size={9}/>{entries.reduce((s,e)=>s+e.score,0)} total</span>
            </div>
          )}
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div style={{ display:"flex", gap:16, alignItems:"center", marginTop:12 }}>
          <button onClick={() => setCurrentPage(Math.max(0, page - 1))} disabled={page === 0}
            style={{ background:"none", border:"none", color:page===0?P.borderLight:P.textSecondary, fontSize:20, cursor:page===0?"default":"pointer", fontFamily:"'Playfair Display',serif" }}>
            ◀
          </button>
          <span style={{ fontSize:12, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => setCurrentPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            style={{ background:"none", border:"none", color:page>=totalPages-1?P.borderLight:P.textSecondary, fontSize:20, cursor:page>=totalPages-1?"default":"pointer", fontFamily:"'Playfair Display',serif" }}>
            ▶
          </button>
        </div>
      )}

      {onClose && (
        <button onClick={onClose} style={{
          marginTop:12, background:"none", border:`1px solid ${P.border}`,
          color:P.textSecondary, padding:"8px 20px", borderRadius:6, cursor:"pointer",
          fontFamily:"'Playfair Display',serif", fontSize:12, letterSpacing:1
        }}>Close</button>
      )}
    </div>
  );
}

// --- MINI BOOK COVER (for library grid) ---
export function MiniBookCover({ cover, entries, quills, date, onClick }) {
  return (
    <div onClick={onClick} style={{
      width:80, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"transform 0.15s"
    }}
      onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <div style={{
        width:70, height:90, borderRadius:"2px 6px 6px 2px",
        background:cover.color, border:`1.5px solid ${cover.accent}50`,
        boxShadow:"2px 0 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.2)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:6,
          background:`linear-gradient(90deg, ${cover.accent}20, transparent)`,
          borderRight:`1px solid ${cover.accent}25`
        }}/>
        <div style={{ fontSize:18, fontFamily:"'Playfair Display',serif", fontWeight:700, color:cover.accent }}>
          {entries.length}
        </div>
        <div style={{ fontSize:7, color:cover.accent, opacity:0.7, fontFamily:"'Courier Prime',monospace" }}>words</div>
      </div>
      <div style={{ fontSize:9, color:P.quill, fontFamily:"'Courier Prime',monospace", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
        <Feather size={9}/>{fmt(quills)}
      </div>
      <div style={{ fontSize:8, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{date}</div>
    </div>
  );
}
