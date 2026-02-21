import { useState } from "react";
import { motion } from "framer-motion";
import { FeatherIcon as Feather, ApertureIcon as Aperture } from "../assets/icons";
import { P } from "../styles.js";
import { WORDS_PER_PAGE, TILE_TYPES, LETTER_SCORES } from "../constants.js";
import { sortEntries, fmt } from "../gameUtils.js";

function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

function BookTile({ letter, type, size }) {
  const tt = TILE_TYPES[type] || TILE_TYPES.normal;
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: tt.color, border: `1.5px solid ${tt.border}`, borderRadius: 3,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Junicode',serif", fontSize: size * 0.6,
      fontWeight: 700, color: tt.text, lineHeight: 1,
    }}>
      {letter}
    </div>
  );
}

function getScoreLabel(lt) {
  const base = LETTER_SCORES[lt.letter] ?? 0;
  switch (lt.type) {
    case "double_letter": return { score: base, mult: "×2" };
    case "triple_letter": return { score: base, mult: "×3" };
    case "double_word":   return { score: base, mult: null };
    case "triple_word":   return { score: base, mult: null };
    case "golden":        return { score: base, mult: "★"  };
    case "lexicoin":      return { score: 0,    mult: null };
    default:              return { score: base, mult: null };
  }
}

function ScoreTooltip({ tileLetters, rect }) {
  const wordMult = tileLetters.reduce((m, lt) => {
    if (lt.type === "double_word") return m * 2;
    if (lt.type === "triple_word") return m * 3;
    return m;
  }, 1);

  let letterTotal = 0;
  for (const lt of tileLetters) {
    const base = LETTER_SCORES[lt.letter] ?? 0;
    if      (lt.type === "double_letter") letterTotal += base * 2;
    else if (lt.type === "triple_letter") letterTotal += base * 3;
    else if (lt.type === "lexicoin")      letterTotal += 0;
    else                                  letterTotal += base;
  }
  const total = letterTotal * wordMult;

  // Clamp left so tooltip doesn't overflow the right edge of the viewport
  const approxWidth = tileLetters.length * 24 + 90;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - approxWidth - 8));

  return (
    <div style={{
      position: "fixed",
      top: rect.top,
      left,
      transform: "translateY(calc(-100% - 6px))",
      background: P.panelBg,
      border: `1px solid ${P.border}`,
      borderRadius: 6,
      padding: "8px 10px",
      zIndex: 300,
      display: "flex",
      alignItems: "flex-end",
      gap: 5,
      boxShadow: "0 4px 16px rgba(44,36,32,0.18)",
      pointerEvents: "none",
    }}>
      {tileLetters.map((lt, i) => {
        const { score, mult } = getScoreLabel(lt);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <BookTile letter={lt.letter} type={lt.type} size={18} />
            <div style={{ fontFamily: "'Junicode',sans-serif", fontSize: 9, color: P.textSecondary, textAlign: "center", lineHeight: 1 }}>
              {score !== null && <span>{score}</span>}
              {mult && <span style={{ color: P.textMuted }}>{mult}</span>}
            </div>
          </div>
        );
      })}
      {wordMult > 1 && (
        <div style={{ fontFamily: "'Junicode',sans-serif", fontSize: 12, fontWeight: 700, color: P.textPrimary, paddingBottom: 2 }}>
          ×{wordMult}
        </div>
      )}
      <div style={{
        fontFamily: "'Junicode',sans-serif", fontSize: 12, fontWeight: 700,
        color: P.ink, paddingBottom: 2, paddingLeft: wordMult > 1 ? 0 : 4,
        borderLeft: `1px solid ${P.border}`, paddingLeft: 8, marginLeft: 2,
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <Aperture size={10} />{total}
      </div>
    </div>
  );
}

// --- BOOK VIEW (full in-page book renderer) ---
export function BookView({ entries, cover, pageStyle, currentPage, setCurrentPage, compact, bw: bwProp, bh: bhProp, onClose, volumeNumber, onPublish }) {
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const sorted = sortEntries(entries);
  const totalPages = Math.max(1, Math.ceil(sorted.length / WORDS_PER_PAGE));
  const page = Math.min(currentPage, totalPages - 1);
  const pageEntries = sorted.slice(page * WORDS_PER_PAGE, (page + 1) * WORDS_PER_PAGE);
  const bw = bwProp ?? (compact ? 280 : 320);
  const bh = bhProp ?? (compact ? 360 : 420);
  const scale = bw / 280;

  const coverPatternStyle = cover.pattern === "gold-border"
    ? { boxShadow:`inset 0 0 0 6px ${cover.accent}40, inset 0 0 0 8px ${cover.accent}20, 0 8px 24px rgba(0,0,0,0.4)` }
    : cover.pattern === "sigils"
    ? { backgroundImage:`radial-gradient(circle at 30% 40%, ${cover.accent}15 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${cover.accent}10 0%, transparent 40%)` }
    : cover.pattern === "stars"
    ? { backgroundImage:`radial-gradient(1px 1px at 20% 30%, ${cover.accent}80 0%, transparent 100%), radial-gradient(1px 1px at 50% 70%, ${cover.accent}60 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, ${cover.accent}40 0%, transparent 100%), radial-gradient(1.5px 1.5px at 35% 85%, ${cover.accent}70 0%, transparent 100%), radial-gradient(1px 1px at 65% 45%, ${cover.accent}50 0%, transparent 100%)` }
    : {};

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div className={compact ? "lex-book-compact" : undefined} style={{
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
            <span style={{ fontFamily:"'Junicode',serif", fontSize:10, color:pageStyle.accent, letterSpacing:1 }}>
              {volumeNumber != null ? `Volume ${toRoman(volumeNumber)}` : "Lexicon"}
            </span>
            {entries.length > 0 && (
              <span style={{ fontFamily:"'Junicode',sans-serif", fontSize:9, color:pageStyle.accent, display:"inline-flex", alignItems:"center", gap:2 }}>
                <Aperture size={8}/>{entries.reduce((s,e)=>s+e.score,0)} total
              </span>
            )}
          </div>

          {/* Word list — single column, one tile row per entry */}
          <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
            {pageEntries.length === 0 && (
              <div style={{ fontStyle:"italic", fontSize:11, color:pageStyle.accent, opacity:0.5, padding:8, textAlign:"center" }}>
                Inscribe a word to begin your Lexicon
              </div>
            )}
            {pageEntries.map((entry, wi) => {
              const py = Math.max(2, Math.round(3 * scale));
              const tileLetters = entry.letters || entry.word.split("").map(l => ({ letter: l, type: "normal" }));
              const maxAvail = bw - 112;
              const n = tileLetters.length;
              const fitted = Math.floor((maxAvail - (n - 1) * 2) / n);
              const tileSize = Math.max(8, Math.min(Math.round(16 * scale), fitted));
              const isHovered = hoveredEntry?.index === wi;
              return (
                <motion.div key={wi}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: wi * 0.03 }}
                  onMouseEnter={e => setHoveredEntry({ index: wi, tileLetters, rect: e.currentTarget.getBoundingClientRect() })}
                  onMouseLeave={() => setHoveredEntry(null)}
                  style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:`${py}px 4px`, borderBottom: wi < pageEntries.length - 1 ? `1px solid ${pageStyle.accent}15` : "none",
                    cursor: "default",
                  }}>
                  {isHovered && <ScoreTooltip tileLetters={tileLetters} rect={hoveredEntry.rect} />}
                  <div style={{ display:"flex", gap:2, overflow:"hidden", flex:1, minWidth:0, height: Math.round(16 * scale), alignItems:"center" }}>
                    {tileLetters.map((lt, i) => (
                      <BookTile key={i} letter={lt.letter} type={lt.type} size={tileSize} />
                    ))}
                  </div>
                  <span style={{
                    fontFamily:"'Junicode',sans-serif", fontSize:9,
                    color:pageStyle.accent, whiteSpace:"nowrap", marginLeft:4, flexShrink:0,
                  }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:2 }}>
                      <Aperture size={8}/>{entry.score}
                    </span>
                  </span>
                </motion.div>
              );
            })}
            {Array.from({ length: WORDS_PER_PAGE - pageEntries.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                borderBottom:`1px dashed ${pageStyle.accent}08`,
                height: Math.round(22 * scale),
              }}/>
            ))}
          </div>

          {/* Page footer */}
          <div style={{
            borderTop:`1px solid ${pageStyle.accent}30`, paddingTop:6, marginTop:4,
            display:"flex", justifyContent:"space-between", alignItems:"center",
            fontFamily:"'Junicode',sans-serif", fontSize:10, color:pageStyle.accent
          }}>
            <span style={{ minWidth:40 }}>{entries.length > 0 ? `${entries.length} word${entries.length !== 1 ? "s" : ""}` : ""}</span>
            {onPublish && (
              <button onClick={onPublish} disabled={entries.length < 10} style={{
                display:"inline-flex", alignItems:"center", gap:3,
                background:"none", border:`1px solid ${pageStyle.accent}${entries.length >= 10 ? "60" : "25"}`,
                borderRadius:4, padding:"2px 8px",
                color: entries.length >= 10 ? pageStyle.accent : `${pageStyle.accent}40`,
                cursor: entries.length >= 10 ? "pointer" : "default",
                fontFamily:"'Junicode',sans-serif", fontSize:9,
              }}>
                <Feather size={8}/> {entries.length >= 10 ? "Publish" : `${entries.length}/10`}
              </button>
            )}
            <span style={{ minWidth:40, textAlign:"right" }}>pg.{page + 1}</span>
          </div>
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div style={{ display:"flex", gap:16, alignItems:"center", marginTop:12 }}>
          <button onClick={() => setCurrentPage(Math.max(0, page - 1))} disabled={page === 0}
            style={{ background:"none", border:"none", color:page===0?P.borderLight:P.textSecondary, fontSize:20, cursor:page===0?"default":"pointer", fontFamily:"'BLKCHCRY',serif" }}>
            ◀
          </button>
          <span style={{ fontSize:12, color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>
            {page + 1} / {totalPages}
          </span>
          <button onClick={() => setCurrentPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            style={{ background:"none", border:"none", color:page>=totalPages-1?P.borderLight:P.textSecondary, fontSize:20, cursor:page>=totalPages-1?"default":"pointer", fontFamily:"'BLKCHCRY',serif" }}>
            ▶
          </button>
        </div>
      )}

      {onClose && (
        <button onClick={onClose} style={{
          marginTop:12, background:"none", border:`1px solid ${P.border}`,
          color:P.textSecondary, padding:"8px 20px", borderRadius:6, cursor:"pointer",
          fontFamily:"'BLKCHCRY',serif", fontSize:12, letterSpacing:1
        }}>Close</button>
      )}
    </div>
  );
}

// --- MINI BOOK COVER (for library grid) ---
export function MiniBookCover({ cover, entries, quills, date, volumeNumber, onClick }) {
  return (
    <div onClick={onClick} style={{
      width:90, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"transform 0.15s"
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
        <div style={{ fontSize:8, color:cover.accent, opacity:0.7, fontFamily:"'Junicode',sans-serif", letterSpacing:0.5 }}>Volume</div>
        <div style={{ fontSize:20, fontFamily:"'Junicode',serif", fontWeight:700, color:cover.accent, lineHeight:1.1 }}>
          {toRoman(volumeNumber ?? 1)}
        </div>
      </div>
      <div style={{ fontSize:9, color:P.quill, fontFamily:"'Junicode',sans-serif", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
        <span style={{ color:P.quill }}>{entries.length} word{entries.length !== 1 ? "s" : ""}</span>
        <span style={{ color:P.quill }}>|</span>
        <span style={{ display:"flex", alignItems:"center", gap:2 }}><Feather size={9}/>{fmt(quills)}</span>
      </div>
      <div style={{ fontSize:8, color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>{date}</div>
    </div>
  );
}
