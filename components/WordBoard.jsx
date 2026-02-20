import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ApertureIcon as Aperture } from "../assets/icons";
import { TILE_TYPES, LETTER_SCORES } from "../constants.js";
import { P } from "../styles.js";

// --- LETTER TILE ---
export function LetterTile({ letter, count, onClick, size=40, dimmed=false, tileType="normal", draggable=false, onDragStart }) {
  const tt = TILE_TYPES[tileType] || TILE_TYPES.normal;
  const isSpecial = tileType !== "normal";
  const bg = dimmed ? "#ede8e0" : tt.color;
  const border = dimmed ? "#e0d8cc" : tt.border;
  const textColor = dimmed ? "#b0a494" : tt.text;
  return (
    <div onClick={dimmed ? undefined : onClick}
      draggable={draggable && !dimmed}
      onDragStart={draggable && !dimmed ? onDragStart : undefined}
      style={{
        width:size, height:size, display:"inline-flex", alignItems:"center", justifyContent:"center",
        background:bg, border:`2px solid ${border}`, borderRadius:5,
        cursor:dimmed?"default":(draggable?"grab":"pointer"), fontFamily:"'Junicode',serif", fontSize:size*0.45,
        fontWeight:700, color:textColor, position:"relative", userSelect:"none",
        boxShadow:dimmed?"none":"0 1px 4px rgba(44,36,32,0.10)", transition:"all 0.12s", opacity:dimmed?0.5:1
      }}>
      {tileType === "lexicoin" ? <Aperture size={Math.round(size * 0.45)} /> : letter}
      {count > 0 && <span style={{
        position:"absolute", top:-5, right:-5, background:dimmed?"#e0d8cc":(isSpecial?tt.border:"#7a6e62"),
        color:"#ffffff", borderRadius:"50%", width:18, height:18, fontSize:10,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Junicode',sans-serif", fontWeight:700
      }}>{count}</span>}
      {tileType !== "lexicoin" && letter && LETTER_SCORES[letter] !== undefined && (
        <span style={{
          position:"absolute", bottom:-5, left:-5,
          background:"#7a6e62", color:"#ffffff", borderRadius:3, padding:"1px 3px",
          fontSize:7, fontWeight:700, fontFamily:"'Junicode',sans-serif", lineHeight:1.2
        }}>{LETTER_SCORES[letter]}</span>
      )}
      {isSpecial && tt.badge && (
        <span style={{
          position:"absolute", bottom:-6, left:"50%", transform:"translateX(-50%)",
          background:tt.border, color:"#ffffff", borderRadius:3, padding:"1px 4px",
          fontSize:7, fontWeight:700, fontFamily:"'Junicode',sans-serif",
          whiteSpace:"nowrap", lineHeight:1.2
        }}>{tt.badge}</span>
      )}
    </div>
  );
}

// --- LEXICOIN KEYBOARD PICKER ---
export function LexiconKeyboard({ onSelect }) {
  const rows = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["Z","X","C","V","B","N","M"],
  ];
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(44,36,32,0.55)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:180,
    }}>
      <div style={{
        background:P.panelBg, border:`1px solid ${P.border}`,
        borderRadius:10, padding:"12px 10px", boxShadow:"0 4px 20px rgba(44,36,32,0.18)",
      }}>
        <div style={{ fontSize:10, color:P.textSecondary, fontFamily:"'Junicode',sans-serif",
          textAlign:"center", marginBottom:10, letterSpacing:1 }}>
          <Aperture size={12} style={{verticalAlign:"middle", marginRight:4}}/> Pick a letter for your wildcard
        </div>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display:"flex", justifyContent:"center", gap:4, marginBottom:4 }}>
            {row.map(letter => (
              <button key={letter} onClick={() => onSelect(letter)} style={{
                width:30, height:34, background:P.surfaceBg, border:`1.5px solid ${P.border}`,
                borderRadius:4, color:P.textPrimary, fontSize:13, fontWeight:700,
                fontFamily:"'Junicode',serif", cursor:"pointer", transition:"all 0.1s"
              }}
                onMouseOver={e => { e.currentTarget.style.background=P.btnActiveBg; e.currentTarget.style.color=P.btnActiveText; }}
                onMouseOut={e => { e.currentTarget.style.background=P.surfaceBg; e.currentTarget.style.color=P.textPrimary; }}
              >{letter}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- WORD BOARD (pointer-events drag for board reordering, HTML5 drop for inventory) ---
export function WordBoard({ wordTiles, removeWordTile, reorderWordTiles, insertWordTile, clearWord }) {
  const [removingIds, setRemovingIds] = useState(new Set());
  const [dragState, setDragState] = useState(null); // { fromIdx, letter, tileType, ghostX, ghostY }
  const [isDragging, setIsDragging] = useState(false);
  const [dropIdx, setDropIdx] = useState(null);

  // Refs to avoid stale closures in document event listeners
  const dragStateRef  = useRef(null);
  const dropIdxRef    = useRef(null);
  const wordTilesRef  = useRef(wordTiles);
  const boardRef      = useRef(null);

  useEffect(() => { wordTilesRef.current = wordTiles; }, [wordTiles]);
  // Keep refs in sync each render
  dragStateRef.current = dragState;
  dropIdxRef.current   = dropIdx;

  // --- Pointer drag (board tile reorder, works on touch + mouse) ---
  const handleTilePointerDown = (e, idx) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const tile = wordTiles[idx];
    const ds = {
      fromIdx: idx,
      letter: tile.letter,
      tileType: tile.tileType || "normal",
      ghostX: e.clientX,
      ghostY: e.clientY,
    };
    dragStateRef.current = ds;
    setDragState(ds);
    setIsDragging(true);
    setDropIdx(null);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const { clientX: x, clientY: y } = e;
      setDragState(prev => prev ? { ...prev, ghostX: x, ghostY: y } : null);

      // Hit-test board tiles via BoundingClientRect (unaffected by ghost element z-order)
      const tiles = boardRef.current?.querySelectorAll('[data-tile-idx]');
      let newDrop = null;
      if (tiles?.length) {
        for (const tile of tiles) {
          const r = tile.getBoundingClientRect();
          if (y >= r.top - 12 && y <= r.bottom + 12 && x >= r.left - 4 && x <= r.right + 4) {
            const i = +tile.dataset.tileIdx;
            newDrop = x < r.left + r.width / 2 ? i : i + 1;
            break;
          }
        }
      }
      // Append-to-end if pointer is over the board container but no tile
      if (newDrop === null && boardRef.current) {
        const r = boardRef.current.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
          newDrop = wordTilesRef.current.length;
      }
      // Don't drop a tile onto itself
      const from = dragStateRef.current?.fromIdx;
      if (from != null && (newDrop === from || newDrop === from + 1)) newDrop = null;

      dropIdxRef.current = newDrop;
      setDropIdx(newDrop);
    };

    const handleUp = () => {
      const ds = dragStateRef.current;
      const di = dropIdxRef.current;
      if (ds && di !== null) reorderWordTiles(ds.fromIdx, di);
      dragStateRef.current = null;
      setDragState(null);
      setIsDragging(false);
      setDropIdx(null);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup',   handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup',   handleUp);
    };
  }, [isDragging]);

  // --- Remove animation ---
  const handleRemove = (id) => {
    setRemovingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      removeWordTile(id);
      setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 220);
  };

  // --- HTML5 drop handlers (inventory → board, desktop only) ---
  const handleContainerDragOver = (e) => {
    e.preventDefault();
    if (dropIdx === null) setDropIdx(wordTiles.length);
  };
  const handleContainerDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropIdx(null);
  };
  const handleTileDragOver = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropIdx(e.clientX < rect.left + rect.width / 2 ? idx : idx + 1);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const target = dropIdx !== null ? dropIdx : wordTiles.length;
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.source === "inventory") insertWordTile(data.letter, data.tileType, target);
    } catch {}
    setDropIdx(null);
  };

  const containerStyle = {
    minHeight: 64, border: "2px dashed rgba(139,115,85,0.3)", borderRadius: 8,
    padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 6,
    alignItems: "center", background: "rgba(245,236,215,0.03)", touchAction: "none",
  };

  const showPhantom = dropIdx !== null;
  const visuals = [];
  for (let i = 0; i <= wordTiles.length; i++) {
    if (showPhantom && dropIdx === i) visuals.push({ type: "phantom", key: `ph-${i}` });
    if (i < wordTiles.length) visuals.push({ type: "tile", tile: wordTiles[i], idx: i });
  }

  if (wordTiles.length === 0 && !showPhantom) {
    return (
      <div ref={boardRef} style={containerStyle}
        onDragOver={e => { e.preventDefault(); setDropIdx(0); }}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleDrop}
      >
        <div style={{ fontSize: 13, color: "#6b6050", fontStyle: "italic", fontFamily: "'Junicode',sans-serif" }}>
          Click or drag letters here...
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={boardRef} style={containerStyle}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleDrop}
      >
        {visuals.map(item => {
          if (item.type === "phantom") {
            return (
              <motion.div key={item.key}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 44, opacity: 1 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                style={{ height: 44, borderRadius: 5, flexShrink: 0, border: "2px dashed #6b8fa8", background: "rgba(107,143,168,0.08)" }}
              />
            );
          }
          const { tile, idx } = item;
          const removing = removingIds.has(tile.id);
          const isDraggingThis = dragState?.fromIdx === idx;
          const tt = TILE_TYPES[tile.tileType || "normal"] || TILE_TYPES.normal;
          return (
            <div key={tile.id}
              data-tile-idx={idx}
              onPointerDown={removing ? undefined : (e) => handleTilePointerDown(e, idx)}
              onDragOver={(e) => handleTileDragOver(e, idx)}
              style={{ position: "relative", flexShrink: 0, touchAction: "none" }}
            >
              <div style={{
                maxWidth: removing ? 0 : 50, overflow: "hidden",
                opacity: removing ? 0 : isDraggingThis ? 0.3 : 1,
                transition: "max-width 0.22s ease, opacity 0.22s ease",
              }}>
                <div style={{
                  width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                  background: tt.color, border: `2px solid ${tt.border}`,
                  borderRadius: 5, fontFamily: "'Junicode',serif", fontSize: 22,
                  fontWeight: 700, color: tt.text, userSelect: "none",
                  cursor: removing ? "default" : "grab",
                  boxShadow: "0 1px 4px rgba(44,36,32,0.10)",
                }}>
                  {tile.tileType === "lexicoin" && tile.letter === null ? <Aperture size={18} /> : tile.letter}
                </div>
              </div>
              {!removing && tile.tileType !== "lexicoin" && tile.letter && LETTER_SCORES[tile.letter] !== undefined && (
                <span style={{
                  position: "absolute", bottom: -5, left: -5,
                  background: "#7a6e62", color: "#ffffff", borderRadius: 3, padding: "1px 3px",
                  fontSize: 7, fontWeight: 700, fontFamily: "'Junicode',sans-serif", lineHeight: 1.2, zIndex: 1,
                }}>{LETTER_SCORES[tile.letter]}</span>
              )}
              {!removing && (
                <button onClick={() => handleRemove(tile.id)} style={{
                  position: "absolute", top: -7, right: -3, width: 18, height: 18,
                  background: "#b0a494", border: "2px solid #e0d8cc", borderRadius: "50%",
                  color: "#ffffff", fontSize: 10, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1, padding: 0, zIndex: 1,
                }}>×</button>
              )}
            </div>
          );
        })}
        <button onClick={clearWord} style={{
          marginLeft: 6, padding: "4px 10px", background: "none",
          border: "1px solid rgba(139,115,85,0.25)", color: "#6b6050",
          borderRadius: 4, cursor: "pointer", fontSize: 10, fontFamily: "'Junicode',sans-serif",
        }}>clear</button>
      </div>

      {/* Floating ghost tile during pointer drag */}
      {dragState && (
        <div style={{
          position: "fixed",
          left: dragState.ghostX - 22,
          top: dragState.ghostY - 22,
          pointerEvents: "none",
          zIndex: 1000,
          opacity: 0.85,
          transform: "scale(1.08)",
        }}>
          <div style={{
            width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
            background: (TILE_TYPES[dragState.tileType] || TILE_TYPES.normal).color,
            border: `2px solid ${(TILE_TYPES[dragState.tileType] || TILE_TYPES.normal).border}`,
            borderRadius: 5, fontFamily: "'Junicode',serif", fontSize: 22,
            fontWeight: 700, color: (TILE_TYPES[dragState.tileType] || TILE_TYPES.normal).text,
            boxShadow: "0 4px 12px rgba(44,36,32,0.25)",
            cursor: "grabbing",
          }}>
            {dragState.tileType === "lexicoin" ? <Aperture size={18} /> : dragState.letter}
          </div>
        </div>
      )}
    </>
  );
}
