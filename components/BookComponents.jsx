import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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


function BookTile({ letter, type, size }) {
  const tt = TILE_TYPES[type] || TILE_TYPES.normal;
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: tt.color, border: `${size < 14 ? 1 : 1.5}px solid ${tt.border}`, borderRadius: 3,
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
    </div>
  );
}

function EmptyPage({ pageStyle, scale, slotNum, volumeNumber, allEntries }) {
  const s = n => Math.round(n * scale);
  return (
    <div style={{
      position: "absolute", inset: 0,
      padding: `${s(6)}px ${s(10)}px ${s(10)}px`,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ textAlign: "center", paddingBottom: s(1), flexShrink: 0 }}>
        <span style={{ fontFamily: "'Junicode',serif", fontSize: s(9), color: pageStyle.accent, letterSpacing: 1 }}>
          {volumeNumber != null ? `Volume ${toRoman(volumeNumber)}` : "Lexicon"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: s(2), marginBottom: s(2), flexShrink: 0 }}>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}35` }}/>
        <span style={{ color: `${pageStyle.accent}60`, fontFamily: "'Junicode',serif", fontSize: s(8), lineHeight: 1 }}>❦</span>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}35` }}/>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {Array.from({ length: WORDS_PER_PAGE }).map((_, i) => (
          <div key={i} style={{ borderBottom: `1px dashed ${pageStyle.accent}08`, flex: "1 1 0", minHeight: 0 }}/>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: s(2), marginTop: s(2), flexShrink: 0 }}>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}30` }}/>
        <span style={{ color: `${pageStyle.accent}50`, fontFamily: "'Junicode',serif", fontSize: s(8), lineHeight: 1 }}>❦</span>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}30` }}/>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: s(2), flexShrink: 0,
        fontFamily: "'Junicode',sans-serif", fontSize: s(9), color: pageStyle.accent,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <Aperture size={s(7)}/>{(allEntries ?? []).reduce((sum, e) => sum + e.score, 0)}
        </span>
        <span>{slotNum}</span>
      </div>
    </div>
  );
}

function WordPage({ slotNum, pageEntries, allEntries, pageStyle, scale, hoveredEntry, setHoveredEntry, volumeNumber, bw }) {
  const s = n => Math.round(n * scale);
  const interactive = !!setHoveredEntry;
  return (
    <div style={{
      position: "absolute", inset: 0,
      padding: `${s(6)}px ${s(10)}px ${s(10)}px`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Page header — volume title centred */}
      <div style={{ textAlign: "center", paddingBottom: s(1), flexShrink: 0 }}>
        <span style={{ fontFamily: "'Junicode',serif", fontSize: s(9), color: pageStyle.accent, letterSpacing: 1 }}>
          {volumeNumber != null ? `Volume ${toRoman(volumeNumber)}` : "Lexicon"}
        </span>
      </div>
      {/* Ornate rule */}
      <div style={{ display: "flex", alignItems: "center", gap: s(2), marginBottom: s(2), flexShrink: 0 }}>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}35` }}/>
        <span style={{ color: `${pageStyle.accent}60`, fontFamily: "'Junicode',serif", fontSize: s(8), lineHeight: 1 }}>❦</span>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}35` }}/>
      </div>

      {/* Word list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {pageEntries.length === 0 && (
          <div style={{ fontStyle: "italic", fontSize: s(10), color: pageStyle.accent, opacity: 0.5, padding: s(8), textAlign: "center" }}>
            Inscribe a word to begin
          </div>
        )}
        {pageEntries.map((entry, wi) => {
          const tileLetters = entry.letters || entry.word.split("").map(l => ({ letter: l, type: "normal" }));
          const n = tileLetters.length;
          const maxAvail = bw - s(70);
          const fitted = Math.floor((maxAvail - (n - 1) * 2) / n);
          const tileSize = Math.max(8, Math.min(s(15), fitted));
          const isHovered = interactive && hoveredEntry?.index === wi && hoveredEntry?.slotNum === slotNum;
          return (
            <div
              key={wi}
              onMouseEnter={interactive ? e => setHoveredEntry({ index: wi, slotNum, tileLetters, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
              onMouseLeave={interactive ? () => setHoveredEntry(null) : undefined}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: `0 4px`,
                borderBottom: wi < pageEntries.length - 1 ? `1px solid ${pageStyle.accent}15` : "none",
                cursor: "default", flex: "1 1 0", minHeight: 0, overflow: "hidden",
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
            </div>
          );
        })}
        {Array.from({ length: WORDS_PER_PAGE - pageEntries.length }).map((_, i) => (
          <div key={`empty-${i}`} style={{ borderBottom: `1px dashed ${pageStyle.accent}08`, flex: "1 1 0", minHeight: 0 }}/>
        ))}
      </div>

      {/* Ornate rule */}
      <div style={{ display: "flex", alignItems: "center", gap: s(2), marginTop: s(2), flexShrink: 0 }}>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}30` }}/>
        <span style={{ color: `${pageStyle.accent}50`, fontFamily: "'Junicode',serif", fontSize: s(8), lineHeight: 1 }}>❦</span>
        <div style={{ flex: 1, height: 1, background: `${pageStyle.accent}30` }}/>
      </div>
      {/* Footer — lexicoins left, page number right */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: s(2), flexShrink: 0,
        fontFamily: "'Junicode',sans-serif", fontSize: s(9), color: pageStyle.accent,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <Aperture size={s(7)}/>{allEntries.reduce((sum, e) => sum + e.score, 0)}
        </span>
        <span>{slotNum}</span>
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
  spread: controlledSpread,
  setSpread: setControlledSpread,
}) {
  const [internalSpread, setInternalSpread] = useState(0);
  const spread    = controlledSpread !== undefined ? controlledSpread  : internalSpread;
  const setSpread = setControlledSpread ?? setInternalSpread;
  const [flipInfo,     setFlipInfo]     = useState(null);
  const [hoveredEntry, setHoveredEntry] = useState(null);

  const sorted = sortEntries(entries);
  const bw     = bwProp ?? (compact ? 200 : 240);
  const bh     = bhProp ?? (compact ? 280 : 340);
  const scale  = bw / 200;
  const s      = n => Math.round(n * scale);

  // Slot model: IFC=0, wordPages 1..N (no back cover — right side always a page)
  const N            = Math.ceil(sorted.length / WORDS_PER_PAGE);
  const totalSpreads = Math.max(1, Math.ceil((N + 1) / 2));
  const maxSpread    = totalSpreads - 1;
  const currentSpread = Math.min(spread, maxSpread);

  const spineW = 0;

  // Clamp spread when entries shrink (e.g. publish resets lexicon)
  useEffect(() => {
    if (spread > maxSpread) setSpread(maxSpread);
  }, [maxSpread]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cover pattern ──────────────────────────────────
  // ── Slot helpers ───────────────────────────────────
  const getSlotContent = (idx) => {
    if (idx <= 0) return { type: "ifc" };
    if (idx > N)  return { type: "empty" };
    const wpIdx = idx - 1;
    return {
      type: "words", slotNum: idx, wpIdx,
      pageEntries: sorted.slice(wpIdx * WORDS_PER_PAGE, (wpIdx + 1) * WORDS_PER_PAGE),
    };
  };

  const getPageBg = (idx) => idx <= 0 ? cover.color : pageStyle.bg;

  const renderSlot = (idx, { isFlipFace = false } = {}) => {
    const slot = getSlotContent(idx);
    if (slot.type === "ifc")
      return <IFCPage cover={cover} scale={scale} volumeNumber={volumeNumber} />;
    if (slot.type === "empty")
      return <EmptyPage pageStyle={pageStyle} scale={scale} slotNum={idx} volumeNumber={volumeNumber} allEntries={sorted} />;
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

  // ── Static page slot indices (adjusted during flips) ───
  let leftSlotIdx, rightSlotIdx;
  if (!flipInfo) {
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
    const { dir, fromSpread } = flipInfo;
    // Defer by one frame so the browser paints the animation's final state
    // before React swaps in the static pages — eliminates the end-of-flip snap.
    requestAnimationFrame(() => {
      if      (dir === 1)  setSpread(fromSpread + 1);
      else if (dir === -1) setSpread(fromSpread - 1);
      setFlipInfo(null);
    });
  };

  const canGoForward = !flipInfo && currentSpread < maxSpread;
  const canGoBack    = !flipInfo && currentSpread > 0;

  // Add/remove body class so CSS can lift the tab-content stacking context
  // above the header and clear parent overflow during the animation.
  useEffect(() => {
    if (flipInfo) {
      document.body.classList.add("book-flipping");
    } else {
      document.body.classList.remove("book-flipping");
    }
    return () => document.body.classList.remove("book-flipping");
  }, [!!flipInfo]);

  // ── Dimensions ────────────────────────────────────
  const openW = bw * 2 + spineW;

  // ── Page face shared styles ────────────────────────
  const leftPageStyle  = { position: "absolute", left: 0, top: 0, width: bw, height: bh, overflow: "hidden", borderRadius: `${s(3)}px 0 0 ${s(3)}px` };
  const rightPageStyle = { position: "absolute", left: bw + spineW, top: 0, width: bw, height: bh, overflow: "hidden", borderRadius: `0 ${s(3)}px ${s(3)}px 0` };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* ── Leather board ─────────────────────────────── */}
      {/* Border + top-highlight baked into the board itself so no overlay div
          competes with the flip animation's stacking context. */}
      <div
        className={compact ? "lex-book-compact" : undefined}
        style={{
          position: "relative",
          background: cover.color,
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 18%), repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.04) 1px, rgba(0,0,0,0.04) 2px)`,
          padding: `${s(5)}px`,
          borderRadius: s(5),
          border: `1px solid ${cover.accent}30`,
          boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
        }}
      >

        {/* ── Book container ──────────────────────────── */}
        <div style={{
          width: openW,
          height: bh,
          position: "relative",
          willChange: "transform",
        }}
      >
        {/* ════════════════ OPEN SPREAD ════════════════ */}
        <>
            {/* Left page */}
            <div style={{
              ...leftPageStyle,
              background: getPageBg(leftSlotIdx),
            }}>
              {renderSlot(leftSlotIdx)}
            </div>

            {/* Spine — thin crease, shadows provide the gutter depth */}
            <div style={{
              position: "absolute", left: bw, top: 0, width: spineW, height: bh, zIndex: 2,
              background: `linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 100%)`,
            }}/>

            {/* Right page */}
            <div style={{
              ...rightPageStyle,
              background: getPageBg(rightSlotIdx),
            }}>
              {renderSlot(rightSlotIdx)}
            </div>

            {/* ── FORWARD flip element (dir=1 or "opening") ── */}
            {flipInfo && (flipInfo.dir === 1 || flipInfo.dir === "opening") && (
              // Wrapper owns perspective so only the flip element is in a 3D context —
              // perspectiveOrigin "0% 50%" puts the vanishing point at the rotation axis.
              <div style={{
                position: "absolute", left: bw + spineW, top: 0,
                width: bw, height: bh,
                perspective: "900px", perspectiveOrigin: "0% 50%",
                zIndex: 10,
              }}>
                <div
                  className="lex-flip-fwd"
                  onAnimationEnd={handleFlipEnd}
                  style={{
                    position: "absolute", inset: 0,
                    transformOrigin: "0% 50%",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Front face — old right page (or front cover for opening) */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                    background: flipInfo.dir === "opening" ? cover.color : getPageBg(flipInfo.fromSpread * 2 + 1),
                    borderRadius: `0 ${s(4)}px ${s(4)}px 0`,
                    overflow: "hidden",
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
                  }}>
                    {flipInfo.dir === "opening"
                      ? renderSlot(0, { isFlipFace: true })
                      : renderSlot((flipInfo.fromSpread + 1) * 2, { isFlipFace: true })
                    }
                  </div>
                </div>
              </div>
            )}

            {/* ── BACKWARD flip element (dir=-1) ── */}
            {flipInfo && flipInfo.dir === -1 && (
              // perspectiveOrigin "100% 50%" puts the vanishing point at the rotation axis.
              <div style={{
                position: "absolute", left: 0, top: 0,
                width: bw, height: bh,
                perspective: "900px", perspectiveOrigin: "100% 50%",
                zIndex: 10,
              }}>
                <div
                  className="lex-flip-bwd"
                  onAnimationEnd={handleFlipEnd}
                  style={{
                    position: "absolute", inset: 0,
                    transformOrigin: "100% 50%",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Front face — old left page */}
                  <div style={{
                    position: "absolute", inset: 0,
                    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                    background: getPageBg(flipInfo.fromSpread * 2),
                    borderRadius: `${s(4)}px 0 0 ${s(4)}px`,
                    overflow: "hidden",
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
                  }}>
                    {renderSlot((flipInfo.fromSpread - 1) * 2 + 1, { isFlipFace: true })}
                  </div>
                </div>
              </div>
            )}

            {/* Gutter depth overlays — wider gradients meeting at the fold create a
                natural spine shadow; zIndex 15 keeps them above the flip element */}
            <div style={{
              position: "absolute", left: bw - s(14), top: 0, width: s(14), height: bh,
              background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.07) 55%, rgba(0,0,0,0.28))",
              pointerEvents: "none", zIndex: 15, transform: "translateZ(0)",
            }}/>
            <div style={{
              position: "absolute", left: bw, top: 0, width: s(14), height: bh,
              background: "linear-gradient(90deg, rgba(0,0,0,0.28), rgba(0,0,0,0.07) 45%, transparent)",
              pointerEvents: "none", zIndex: 15, transform: "translateZ(0)",
            }}/>
        </>
        </div>
      </div>

      {/* ── Navigation ─────────────── */}
      {totalSpreads > 1 && (
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12 }}>
          <button
            onClick={goBackward}
            disabled={!canGoBack}
            style={{
              background: "none", border: "none",
              color: canGoBack ? P.textSecondary : P.borderLight,
              cursor: canGoBack ? "pointer" : "default",
              display: "flex", alignItems: "center",
            }}
          ><ChevronLeft size={18} /></button>
          <span style={{ fontSize: 12, color: P.textMuted, fontFamily: "'Junicode',sans-serif" }}>
            {currentSpread + 1} / {totalSpreads}
          </span>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            style={{
              background: "none", border: "none",
              color: canGoForward ? P.textSecondary : P.borderLight,
              cursor: canGoForward ? "pointer" : "default",
              display: "flex", alignItems: "center",
            }}
          ><ChevronRight size={18} /></button>
        </div>
      )}

      {onPublish && (() => {
        const canPublish = sorted.length >= 10;
        return (
          <button
            onClick={onPublish}
            disabled={!canPublish}
            style={{
              marginTop: 8, background: "none",
              border: `1px solid ${P.border}`,
              color: canPublish ? P.textSecondary : P.textMuted,
              padding: "5px 16px", borderRadius: 4,
              cursor: canPublish ? "pointer" : "default",
              fontFamily: "'BLKCHCRY',serif", fontSize: 11, letterSpacing: 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Feather size={10} />
            {canPublish ? "Publish" : `${sorted.length} / 10 words`}
          </button>
        );
      })()}

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
