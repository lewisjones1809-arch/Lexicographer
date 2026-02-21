import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FeatherIcon as Feather, ApertureIcon as Aperture } from "../assets/icons";
import { P } from "../styles.js";
import { WORDS_PER_PAGE, TILE_TYPES, LETTER_SCORES } from "../constants.js";
import { sortEntries, fmt } from "../gameUtils.js";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let r = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  }
  return r;
}

function shadeColor(hex, amt) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
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
  const approxWidth = tileLetters.length * 24 + 90;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - approxWidth - 8));
  return (
    <div style={{
      position: "fixed", top: rect.top, left,
      transform: "translateY(calc(-100% - 6px))",
      background: P.panelBg, border: `1px solid ${P.border}`, borderRadius: 6,
      padding: "8px 10px", zIndex: 300, display: "flex", alignItems: "flex-end", gap: 5,
      boxShadow: "0 4px 16px rgba(44,36,32,0.18)", pointerEvents: "none",
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
        color: P.ink, paddingBottom: 2, borderLeft: `1px solid ${P.border}`, paddingLeft: 8, marginLeft: 2,
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <Aperture size={10} />{total}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page slot renderers
// ─────────────────────────────────────────────

function IFCPage({ cover, scale, volumeNumber }) {
  const s = n => Math.round(n * scale);
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: cover.color,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: s(10),
    }}>
      <div style={{ width: s(44), height: 1, background: `${cover.accent}35` }}/>
      <div style={{
        fontSize: s(7), color: `${cover.accent}70`,
        fontFamily: "'Junicode',serif", letterSpacing: 3, textTransform: "uppercase",
      }}>Lexicographer</div>
      <div style={{ fontSize: s(18), color: `${cover.accent}cc`, fontFamily: "'BLKCHCRY',serif", lineHeight: 1 }}>
        Vol.{toRoman(volumeNumber ?? 1)}
      </div>
      <div style={{ width: s(44), height: 1, background: `${cover.accent}35` }}/>
      <div style={{ fontSize: s(7), color: `${cover.accent}50`, fontFamily: "'Junicode',serif", letterSpacing: 1 }}>
        A Record of Words
      </div>
    </div>
  );
}

function IBCPage({ cover, scale, entries, onPublish }) {
  const s = n => Math.round(n * scale);
  const canPublish = entries.length >= 10;
  const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: cover.color,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: s(10),
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: s(4) }}>
        <div style={{ fontSize: s(10), color: `${cover.accent}90`, fontFamily: "'Junicode',sans-serif" }}>
          {entries.length} word{entries.length !== 1 ? "s" : ""}
        </div>
        {entries.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: s(11), color: `${cover.accent}cc`, fontFamily: "'Junicode',sans-serif" }}>
            <Aperture size={s(9)} />{fmt(totalScore)}
          </div>
        )}
      </div>
      <div style={{ width: s(36), height: 1, background: `${cover.accent}30` }}/>
      {onPublish && (
        <button
          onClick={onPublish}
          disabled={!canPublish}
          style={{
            background: "none",
            border: `1px solid ${cover.accent}${canPublish ? "60" : "28"}`,
            borderRadius: 4,
            padding: `${s(5)}px ${s(14)}px`,
            color: canPublish ? `${cover.accent}dd` : `${cover.accent}35`,
            cursor: canPublish ? "pointer" : "default",
            fontFamily: "'BLKCHCRY',serif",
            fontSize: s(9),
            display: "flex", alignItems: "center", gap: s(4),
          }}
        >
          <Feather size={s(8)} />
          {canPublish ? "Publish Lexicon" : `${entries.length}/10 words`}
        </button>
      )}
      <div style={{
        position: "absolute", bottom: s(12),
        fontSize: s(6), color: `${cover.accent}40`,
        fontFamily: "'Junicode',serif", letterSpacing: 1,
      }}>✦ Lexicographer ✦</div>
    </div>
  );
}

function EmptyPage({ pageStyle, scale }) {
  const s = n => Math.round(n * scale);
  return (
    <div style={{ position: "absolute", inset: 0, padding: `${s(16)}px ${s(14)}px` }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${pageStyle.accent}08`, height: s(20) }}/>
      ))}
    </div>
  );
}

function WordPage({ slotNum, pageEntries, allEntries, pageStyle, scale, hoveredEntry, setHoveredEntry, volumeNumber, bw }) {
  const s = n => Math.round(n * scale);
  const interactive = !!setHoveredEntry;
  return (
    <div style={{
      position: "absolute", inset: 0,
      padding: `${s(12)}px ${s(10)}px`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Page header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${pageStyle.accent}40`,
        paddingBottom: s(6), marginBottom: s(8), flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'Junicode',serif", fontSize: s(9), color: pageStyle.accent, letterSpacing: 1 }}>
          {volumeNumber != null ? `Volume ${toRoman(volumeNumber)}` : "Lexicon"}
        </span>
        {allEntries.length > 0 && (
          <span style={{ fontFamily: "'Junicode',sans-serif", fontSize: s(8), color: pageStyle.accent, display: "inline-flex", alignItems: "center", gap: 2 }}>
            <Aperture size={s(7)}/>{allEntries.reduce((sum, e) => sum + e.score, 0)} total
          </span>
        )}
      </div>

      {/* Word list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {pageEntries.length === 0 && (
          <div style={{ fontStyle: "italic", fontSize: s(10), color: pageStyle.accent, opacity: 0.5, padding: s(8), textAlign: "center" }}>
            Inscribe a word to begin
          </div>
        )}
        {pageEntries.map((entry, wi) => {
          const py = Math.max(2, s(3));
          const tileLetters = entry.letters || entry.word.split("").map(l => ({ letter: l, type: "normal" }));
          const n = tileLetters.length;
          const maxAvail = bw - s(70);
          const fitted = Math.floor((maxAvail - (n - 1) * 2) / n);
          const tileSize = Math.max(8, Math.min(s(15), fitted));
          const isHovered = interactive && hoveredEntry?.index === wi && hoveredEntry?.slotNum === slotNum;
          return (
            <motion.div
              key={wi}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: wi * 0.03 }}
              onMouseEnter={interactive ? e => setHoveredEntry({ index: wi, slotNum, tileLetters, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
              onMouseLeave={interactive ? () => setHoveredEntry(null) : undefined}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: `${py}px 4px`,
                borderBottom: wi < pageEntries.length - 1 ? `1px solid ${pageStyle.accent}15` : "none",
                cursor: "default", flexShrink: 0,
              }}
            >
              {isHovered && <ScoreTooltip tileLetters={tileLetters} rect={hoveredEntry.rect} />}
              <div style={{ display: "flex", gap: 2, overflow: "hidden", flex: 1, minWidth: 0, height: s(16), alignItems: "center" }}>
                {tileLetters.map((lt, i) => <BookTile key={i} letter={lt.letter} type={lt.type} size={tileSize} />)}
              </div>
              <span style={{ fontFamily: "'Junicode',sans-serif", fontSize: s(9), color: pageStyle.accent, whiteSpace: "nowrap", marginLeft: 4, flexShrink: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <Aperture size={s(7)}/>{entry.score}
                </span>
              </span>
            </motion.div>
          );
        })}
        {Array.from({ length: WORDS_PER_PAGE - pageEntries.length }).map((_, i) => (
          <div key={`empty-${i}`} style={{ borderBottom: `1px dashed ${pageStyle.accent}08`, height: s(20), flexShrink: 0 }}/>
        ))}
      </div>

      {/* Page number */}
      <div style={{
        borderTop: `1px solid ${pageStyle.accent}30`, paddingTop: s(4), marginTop: s(4),
        textAlign: "right", fontFamily: "'Junicode',sans-serif", fontSize: s(9),
        color: pageStyle.accent, flexShrink: 0,
      }}>
        {slotNum}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BookView
// ─────────────────────────────────────────────

export function BookView({
  entries, cover, pageStyle,
  compact, bw: bwProp, bh: bhProp,
  onClose, volumeNumber, onPublish,
  startOpen = false,
}) {
  const [bookOpen,     setBookOpen]     = useState(startOpen);
  const [spread,       setSpread]       = useState(0);
  const [flipInfo,     setFlipInfo]     = useState(null);
  const [hoveredEntry, setHoveredEntry] = useState(null);

  const sorted = sortEntries(entries);
  const bw     = bwProp ?? (compact ? 200 : 240);
  const bh     = bhProp ?? (compact ? 280 : 340);
  const scale  = bw / 200;
  const s      = n => Math.round(n * scale);

  // Slot model: IFC=0, wordPage0..N-1, IBC at an odd index (always right-hand page)
  const N       = Math.ceil(sorted.length / WORDS_PER_PAGE);
  const ibcSlot = (N + 1) % 2 === 1 ? N + 1 : N + 2; // always odd → right-hand page
  const totalSpreads = (ibcSlot + 1) / 2;
  const maxSpread    = Math.max(0, totalSpreads - 1);
  const currentSpread = Math.min(spread, maxSpread);

  const spineW   = s(20);
  const foreEdge = s(16);
  const bands    = Math.min(Math.max(N * 2, 3), 18);

  // Clamp spread when entries shrink (e.g. publish resets lexicon)
  useEffect(() => {
    if (spread > maxSpread) setSpread(maxSpread);
  }, [maxSpread]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cover pattern ──────────────────────────────────
  const coverPatternStyle =
    cover.pattern === "gold-border"
      ? { boxShadow: `inset 0 0 0 6px ${cover.accent}40, inset 0 0 0 8px ${cover.accent}20` }
    : cover.pattern === "sigils"
      ? { backgroundImage: `radial-gradient(circle at 30% 40%, ${cover.accent}15 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${cover.accent}10 0%, transparent 40%)` }
    : cover.pattern === "stars"
      ? { backgroundImage: `radial-gradient(1px 1px at 20% 30%, ${cover.accent}80 0%, transparent 100%), radial-gradient(1px 1px at 50% 70%, ${cover.accent}60 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, ${cover.accent}40 0%, transparent 100%), radial-gradient(1.5px 1.5px at 35% 85%, ${cover.accent}70 0%, transparent 100%)` }
    : {};

  // ── Slot helpers ───────────────────────────────────
  const getSlotContent = (idx) => {
    if (idx <= 0)         return { type: "ifc" };
    if (idx === ibcSlot)  return { type: "ibc" };
    if (idx > ibcSlot)    return { type: "empty" };
    if (idx > N)          return { type: "blank" }; // blank verso before IBC
    const wpIdx = idx - 1;
    return {
      type: "words", slotNum: idx, wpIdx,
      pageEntries: sorted.slice(wpIdx * WORDS_PER_PAGE, (wpIdx + 1) * WORDS_PER_PAGE),
    };
  };

  const getPageBg = (idx) => {
    const t = getSlotContent(idx).type;
    return (t === "ifc" || t === "ibc") ? cover.color : pageStyle.bg;
  };

  const renderSlot = (idx, { isFlipFace = false } = {}) => {
    const slot = getSlotContent(idx);
    if (slot.type === "ifc")
      return <IFCPage cover={cover} scale={scale} volumeNumber={volumeNumber} />;
    if (slot.type === "ibc")
      return <IBCPage cover={cover} scale={scale} entries={sorted} onPublish={onPublish} />;
    if (slot.type === "blank" || slot.type === "empty")
      return <EmptyPage pageStyle={pageStyle} scale={scale} />;
    return (
      <WordPage
        slotNum={slot.slotNum}
        pageEntries={slot.pageEntries}
        allEntries={sorted}
        pageStyle={pageStyle}
        scale={scale}
        hoveredEntry={isFlipFace ? null : hoveredEntry}
        setHoveredEntry={isFlipFace ? null : setHoveredEntry}
        volumeNumber={volumeNumber}
        bw={bw}
      />
    );
  };

  // Reusable front-cover face (used in closed state AND opening flip front face)
  const renderCoverFace = () => (
    <div style={{ position: "absolute", inset: 0, background: cover.color, ...coverPatternStyle }}>
      {/* Spine */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: s(18),
        background: `linear-gradient(90deg, ${cover.accent}40, ${cover.accent}15 60%, transparent)`,
        borderRight: `1px solid ${cover.accent}45`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: s(6),
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: s(3), height: s(3), borderRadius: "50%", background: `${cover.accent}70` }}/>
        ))}
      </div>
      {/* Cover title */}
      <div style={{
        position: "absolute", left: s(22), top: s(10), right: s(8),
        display: "flex", flexDirection: "column", alignItems: "center", gap: s(4),
        pointerEvents: "none",
      }}>
        <div style={{ fontSize: s(7), color: `${cover.accent}80`, fontFamily: "'Junicode',serif", letterSpacing: 2, textTransform: "uppercase" }}>
          Lexicographer
        </div>
        <div style={{ width: s(32), height: 1, background: `${cover.accent}35` }}/>
        <div style={{ fontSize: s(12), color: `${cover.accent}cc`, fontFamily: "'BLKCHCRY',serif" }}>
          Vol.{toRoman(volumeNumber ?? 1)}
        </div>
      </div>
    </div>
  );

  // ── Static page slot indices (adjusted during flips) ───
  let leftSlotIdx, rightSlotIdx;
  if (!flipInfo || flipInfo.dir === "opening") {
    leftSlotIdx  = currentSpread * 2;
    rightSlotIdx = currentSpread * 2 + 1;
  } else if (flipInfo.dir === 1) {
    leftSlotIdx  = flipInfo.fromSpread * 2;
    rightSlotIdx = (flipInfo.fromSpread + 1) * 2 + 1;
  } else { // -1
    leftSlotIdx  = (flipInfo.fromSpread - 1) * 2;
    rightSlotIdx = flipInfo.fromSpread * 2 + 1;
  }

  // ── Handlers ───────────────────────────────────────
  const handleOpen = () => {
    setHoveredEntry(null);
    setBookOpen(true);
    setSpread(0);
    setFlipInfo({ dir: "opening", fromSpread: 0 });
  };

  const goForward = () => {
    if (flipInfo || currentSpread >= maxSpread) return;
    setHoveredEntry(null);
    setFlipInfo({ dir: 1, fromSpread: currentSpread });
  };

  const goBackward = () => {
    if (flipInfo || currentSpread <= 0) return;
    setHoveredEntry(null);
    setFlipInfo({ dir: -1, fromSpread: currentSpread });
  };

  const handleFlipEnd = () => {
    if (!flipInfo) return;
    if      (flipInfo.dir === 1)  setSpread(flipInfo.fromSpread + 1);
    else if (flipInfo.dir === -1) setSpread(flipInfo.fromSpread - 1);
    // "opening": no spread change
    setFlipInfo(null);
  };

  const canGoForward = bookOpen && !flipInfo && currentSpread < maxSpread;
  const canGoBack    = bookOpen && !flipInfo && currentSpread > 0;

  // ── Dimensions ────────────────────────────────────
  const openW   = bw * 2 + spineW;
  const closedW = bw + foreEdge;

  // ── Page face shared styles ────────────────────────
  const leftPageStyle  = { position: "absolute", left: 0, top: 0, width: bw, height: bh, borderRadius: `${s(4)}px 0 0 ${s(4)}px`, overflow: "hidden" };
  const rightPageStyle = { position: "absolute", left: bw + spineW, top: 0, width: bw, height: bh, borderRadius: `0 ${s(4)}px ${s(4)}px 0`, overflow: "hidden" };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* ── Book container ────────────────────────────── */}
      <div
        className={compact ? "lex-book-compact" : undefined}
        style={{
          width: bookOpen ? openW : closedW,
          height: bh,
          position: "relative",
          transition: "width 0.28s ease",
          perspective: bookOpen ? "1400px" : undefined,
        }}
      >
        {!bookOpen ? (

          /* ════════════════ CLOSED COVER ════════════════ */
          <>
            {/* Fore-edge page stack */}
            <div style={{
              position: "absolute", right: 0, top: s(6), bottom: s(6),
              width: foreEdge, borderRadius: `0 ${s(4)}px ${s(4)}px 0`,
              overflow: "hidden", boxShadow: "2px 2px 10px rgba(0,0,0,0.35)",
              display: "flex", flexDirection: "column",
            }}>
              {Array.from({ length: bands }).map((_, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: i % 2 === 0 ? pageStyle.bg : shadeColor(pageStyle.bg, -10),
                  borderBottom: i < bands - 1 ? "0.5px solid rgba(0,0,0,0.1)" : "none",
                }}/>
              ))}
            </div>

            {/* Cover body — clickable */}
            <div
              onClick={handleOpen}
              style={{
                position: "absolute", left: 0, top: 0, width: bw, height: bh,
                borderRadius: `${s(4)}px 0 0 ${s(4)}px`,
                background: cover.color,
                border: `2px solid ${cover.accent}50`,
                boxShadow: "0 8px 28px rgba(0,0,0,0.35), inset -4px 0 10px rgba(0,0,0,0.18)",
                cursor: "pointer", overflow: "hidden",
                ...coverPatternStyle,
              }}
            >
              {renderCoverFace()}
              {/* "open" hint */}
              <div style={{
                position: "absolute", bottom: s(10), left: 0, right: 0,
                textAlign: "center", fontSize: s(6), color: `${cover.accent}45`,
                fontFamily: "'Junicode',serif", letterSpacing: 1, pointerEvents: "none",
              }}>open</div>
            </div>
          </>

        ) : (

          /* ════════════════ OPEN SPREAD ════════════════ */
          <>
            {/* Left page */}
            <div style={{
              ...leftPageStyle,
              background: getPageBg(leftSlotIdx),
              boxShadow: "inset -8px 0 16px rgba(0,0,0,0.14), -2px 4px 24px rgba(0,0,0,0.22)",
            }}>
              {renderSlot(leftSlotIdx)}
            </div>

            {/* Spine */}
            <div style={{
              position: "absolute", left: bw, top: 0, width: spineW, height: bh, zIndex: 2,
              background: `linear-gradient(90deg, rgba(0,0,0,0.2) 0%, ${cover.accent}22 35%, ${cover.accent}14 65%, rgba(0,0,0,0.06) 100%)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: s(8),
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: s(3), height: s(3), borderRadius: "50%", background: `${cover.accent}60` }}/>
              ))}
            </div>

            {/* Right page */}
            <div style={{
              ...rightPageStyle,
              background: getPageBg(rightSlotIdx),
              boxShadow: "inset 8px 0 16px rgba(0,0,0,0.14), 2px 4px 24px rgba(0,0,0,0.22)",
            }}>
              {/* Fore-edge bands on right edge */}
              <div style={{
                position: "absolute", right: 0, top: s(4), bottom: s(4), width: s(8),
                overflow: "hidden", display: "flex", flexDirection: "column", pointerEvents: "none",
              }}>
                {Array.from({ length: bands }).map((_, i) => (
                  <div key={i} style={{ flex: 1, background: i % 2 === 0 ? pageStyle.bg : shadeColor(pageStyle.bg, -8) }}/>
                ))}
              </div>
              {renderSlot(rightSlotIdx)}
            </div>

            {/* ── FORWARD flip element (dir=1 or "opening") ── */}
            {flipInfo && (flipInfo.dir === 1 || flipInfo.dir === "opening") && (
              <div
                className="lex-flip-fwd"
                onAnimationEnd={handleFlipEnd}
                style={{
                  position: "absolute", left: bw + spineW, top: 0,
                  width: bw, height: bh,
                  transformOrigin: "0% 50%",
                  transformStyle: "preserve-3d",
                  zIndex: 10,
                }}
              >
                {/* Front face — old right page (or front cover for opening) */}
                <div style={{
                  position: "absolute", inset: 0,
                  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  background: flipInfo.dir === "opening" ? cover.color : getPageBg(flipInfo.fromSpread * 2 + 1),
                  borderRadius: `0 ${s(4)}px ${s(4)}px 0`,
                  overflow: "hidden",
                  boxShadow: "inset 8px 0 16px rgba(0,0,0,0.12)",
                }}>
                  {flipInfo.dir === "opening"
                    ? renderCoverFace()
                    : renderSlot(flipInfo.fromSpread * 2 + 1, { isFlipFace: true })
                  }
                </div>
                {/* Back face — new left page */}
                <div style={{
                  position: "absolute", inset: 0,
                  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: getPageBg(flipInfo.dir === "opening" ? 0 : (flipInfo.fromSpread + 1) * 2),
                  borderRadius: `${s(4)}px 0 0 ${s(4)}px`,
                  overflow: "hidden",
                  boxShadow: "inset -8px 0 16px rgba(0,0,0,0.12)",
                }}>
                  {flipInfo.dir === "opening"
                    ? renderSlot(0, { isFlipFace: true })
                    : renderSlot((flipInfo.fromSpread + 1) * 2, { isFlipFace: true })
                  }
                </div>
              </div>
            )}

            {/* ── BACKWARD flip element (dir=-1) ── */}
            {flipInfo && flipInfo.dir === -1 && (
              <div
                className="lex-flip-bwd"
                onAnimationEnd={handleFlipEnd}
                style={{
                  position: "absolute", left: 0, top: 0,
                  width: bw, height: bh,
                  transformOrigin: "100% 50%",
                  transformStyle: "preserve-3d",
                  zIndex: 10,
                }}
              >
                {/* Front face — old left page */}
                <div style={{
                  position: "absolute", inset: 0,
                  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  background: getPageBg(flipInfo.fromSpread * 2),
                  borderRadius: `${s(4)}px 0 0 ${s(4)}px`,
                  overflow: "hidden",
                  boxShadow: "inset -8px 0 16px rgba(0,0,0,0.12)",
                }}>
                  {renderSlot(flipInfo.fromSpread * 2, { isFlipFace: true })}
                </div>
                {/* Back face — prev right page */}
                <div style={{
                  position: "absolute", inset: 0,
                  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: getPageBg((flipInfo.fromSpread - 1) * 2 + 1),
                  borderRadius: `0 ${s(4)}px ${s(4)}px 0`,
                  overflow: "hidden",
                  boxShadow: "inset 8px 0 16px rgba(0,0,0,0.12)",
                }}>
                  {renderSlot((flipInfo.fromSpread - 1) * 2 + 1, { isFlipFace: true })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Navigation (only when open) ─────────────── */}
      {bookOpen && totalSpreads > 1 && (
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12 }}>
          <button
            onClick={goBackward}
            disabled={!canGoBack}
            style={{
              background: "none", border: "none",
              color: canGoBack ? P.textSecondary : P.borderLight,
              fontSize: 20, cursor: canGoBack ? "pointer" : "default",
              fontFamily: "'BLKCHCRY',serif",
            }}
          >◀</button>
          <span style={{ fontSize: 12, color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>
            {currentSpread + 1} / {totalSpreads}
          </span>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            style={{
              background: "none", border: "none",
              color: canGoForward ? P.textSecondary : P.borderLight,
              fontSize: 20, cursor: canGoForward ? "pointer" : "default",
              fontFamily: "'BLKCHCRY',serif",
            }}
          >▶</button>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginTop: 12, background: "none", border: `1px solid ${P.border}`,
            color: P.textSecondary, padding: "8px 20px", borderRadius: 6, cursor: "pointer",
            fontFamily: "'BLKCHCRY',serif", fontSize: 12, letterSpacing: 1,
          }}
        >Close</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MiniBookCover (library grid thumbnail)
// ─────────────────────────────────────────────

export function MiniBookCover({ cover, entries, quills, date, volumeNumber, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ width: 90, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "transform 0.15s" }}
      onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
      onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <div style={{
        width: 70, height: 90, borderRadius: "2px 6px 6px 2px",
        background: cover.color, border: `1.5px solid ${cover.accent}50`,
        boxShadow: "2px 0 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 6,
          background: `linear-gradient(90deg, ${cover.accent}20, transparent)`,
          borderRight: `1px solid ${cover.accent}25`,
        }}/>
        <div style={{ fontSize: 8, color: cover.accent, opacity: 0.7, fontFamily: "'Junicode',sans-serif", letterSpacing: 0.5 }}>Volume</div>
        <div style={{ fontSize: 20, fontFamily: "'Junicode',serif", fontWeight: 700, color: cover.accent, lineHeight: 1.1 }}>
          {toRoman(volumeNumber ?? 1)}
        </div>
      </div>
      <div style={{ fontSize: 9, color: P.quill, fontFamily: "'Junicode',sans-serif", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <span>{entries.length} word{entries.length !== 1 ? "s" : ""}</span>
        <span>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Feather size={9}/>{fmt(quills)}</span>
      </div>
      <div style={{ fontSize: 8, color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>{date}</div>
    </div>
  );
}
