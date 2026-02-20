import { useState } from "react";
import { motion } from "framer-motion";
import { CaseUpperIcon as CaseUpper, ApertureIcon as Aperture, DropletIcon as Droplet } from "../assets/icons";
import { UserStar } from "lucide-react";
import { P, st } from "../styles.js";
import { PRESS_UPGRADE_NAMES, PRESS_COSTS, PRESS_MGR_COSTS, PRESS_MANAGERS, MAX_PRESSES, TILE_TYPES } from "../constants.js";
import { fmt } from "../gameUtils.js";
import { mkPressUpg, cycleQty } from "../upgradeUtils.js";
import { UPGRADES_BY_NAME } from "../upgrades.js";
import { PressMiniCard, DeviceUpgradeCard, QtySelector, InfoRow } from "./DeviceCards.jsx";
import { LetterTile } from "./WordBoard.jsx";

const PRESS_SPECIAL_NAMES  = ["Double Letter %","Triple Letter %","Double Word %","Triple Word %","Wildcard %","Golden Tile %"];
const PRESS_SPECIAL_LABELS = ["DL%","TL%","DW%","TW%","Wild%","Gold%"];

export function LetterPressTab({
  presses, pressCount, pressMgrOwned,
  startPress, buyPress, buyPressManager,
  totalLetters, letters, specialTiles, collectedInk,
  pressUpgradeLevels, buyDeviceUpgrade,
  recentTiles, pressEjects, clearPressEject, unlockedQtys, maxLetters
}) {
  const [qty, setQty] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedPress, setSelectedPress] = useState(0);
  const le = Object.entries(letters).sort((a,b) => a[0].localeCompare(b[0]));
  const nextPressCost = pressCount < MAX_PRESSES ? PRESS_COSTS[pressCount] : null;

  // Group special tiles for display
  const specGroups = {};
  specialTiles.forEach(t => {
    const k = t.type === "lexicoin" ? "_wild" : `${t.letter}_${t.type}`;
    specGroups[k] = specGroups[k] || { letter:t.letter, type:t.type, count:0 };
    specGroups[k].count++;
  });

  return (
    <div className="lex-tab-panel" style={{ paddingTop:12, position:"relative" }}>
      {/* Info button — top right */}
      <button onClick={() => setShowInfo(p => !p)} style={{
        position:"absolute", top:0, right:0,
        width:22, height:22, borderRadius:"50%",
        border:`1.5px solid ${showInfo ? P.ink : P.border}`,
        background: showInfo ? P.borderLight : "transparent",
        color: showInfo ? P.ink : P.textSecondary,
        fontSize:11, fontFamily:"'BLKCHCRY',serif", fontWeight:700,
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        padding:0, transition:"all 0.2s",
      }}>i</button>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <div style={{ ...st.heading, fontSize:22, marginBottom:0 }}>Letter Pressing</div>
      </div>

      <div className="lex-lexicon-outer">
        {/* Left column: info + press mini-cards + recent tiles + inventory */}
        <div className="lex-book-col">
          {/* Info panel */}
          {showInfo && (
            <div style={{ ...st.panel, marginBottom:16 }}>
              <div style={{ fontSize:13, fontFamily:"'BLKCHCRY',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:10 }}>Press Stats</div>
              {presses.map((_, idx) => {
                const pUpg = pressUpgradeLevels[idx] || mkPressUpg();
                const pressInterval = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
                const pressYield    = UPGRADES_BY_NAME["Press Yield"].valueFormula(pUpg["Press Yield"] ?? 0);
                const hasManager    = !!pressMgrOwned[idx];
                const mgr           = hasManager ? PRESS_MANAGERS[idx] : null;
                return (
                  <div key={idx} style={{ paddingBottom:8, marginBottom:8, borderBottom: idx < presses.length - 1 ? `1px solid ${P.borderLight}` : "none" }}>
                    <div style={{ fontSize:11, fontFamily:"'BLKCHCRY',serif", fontWeight:700, color:P.textPrimary, marginBottom:4 }}>Press {idx + 1}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"2px 16px" }}>
                      <InfoRow label="Press Time: " value={`${pressInterval.toFixed(1)}s`} />
                      <InfoRow label="Yield: "      value={`×${Math.floor(pressYield)}`} />
                      {PRESS_SPECIAL_NAMES.map((name, si) => {
                        const val = UPGRADES_BY_NAME[name].valueFormula(pUpg[name] ?? 0);
                        return val > 0 ? <InfoRow key={name} label={PRESS_SPECIAL_LABELS[si]} value={`${(val * 100).toFixed(1)}%`} /> : null;
                      })}
                      {hasManager && <InfoRow label="Manager" value={mgr.name} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Press grid — row 1: slots 0-2, row 2: slots 3-4 staggered by half */}
          {(() => {
            const mb = recentTiles.length > 0 ? 8 : 16;
            const totalSlots = pressCount + (pressCount < MAX_PRESSES ? 1 : 0);
            const canAffordPress = collectedInk >= (nextPressCost || 0);

            const slots = Array.from({ length: totalSlots }, (_, idx) => {
              const isBuySlot = idx === pressCount;

              const card = isBuySlot ? (
                <motion.div onClick={canAffordPress ? buyPress : undefined}
                  animate={canAffordPress
                    ? { boxShadow: [`0 0 4px ${P.ink}20`, `0 0 12px ${P.ink}55`, `0 0 4px ${P.ink}20`] }
                    : { boxShadow: "0 0 0px transparent" }
                  }
                  transition={canAffordPress ? { duration:2, repeat:Infinity, ease:"easeInOut" } : { duration:0.2 }}
                  style={{
                    width:100, height:100, flexShrink:0, cursor: canAffordPress ? "pointer" : "default",
                    opacity: canAffordPress ? 1 : 0.55,
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6,
                    borderRadius:8,
                    border: canAffordPress ? `1.5px solid ${P.ink}` : `1.5px dashed ${P.border}`,
                    background: canAffordPress ? P.panelBg : P.surfaceBg,
                    transition:"border 0.2s, background 0.2s, opacity 0.2s",
                  }}>
                  <div style={{ fontSize:9, fontFamily:"'BLKCHCRY',serif", color:P.textSecondary, textAlign:"center", lineHeight:1.3, padding:"0 4px" }}>Buy New Press</div>
                  <div style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, color:P.ink, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>
                    <Droplet size={9} strokeWidth={1.5}/>{fmt(nextPressCost)}
                  </div>
                </motion.div>
              ) : (
                <PressMiniCard press={presses[idx]} idx={idx}
                  pUpg={pressUpgradeLevels[idx] || mkPressUpg()} hasManager={!!pressMgrOwned[idx]}
                  onStart={startPress}
                  eject={pressEjects[idx] || null}
                  onEjectEnd={clearPressEject} />
              );

              const showHireMgr = !isBuySlot && !pressMgrOwned[idx];
              const canAffordMgr = collectedInk >= PRESS_MGR_COSTS[idx];
              const showMgrName = !isBuySlot && !!pressMgrOwned[idx];

              return (
                <div key={idx} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
                  {card}
                  {showHireMgr && (
                    <button onClick={canAffordMgr ? () => buyPressManager(idx) : undefined} style={{
                      width:100, padding:"3px 0", borderRadius:6, border:"none",
                      background: canAffordMgr ? P.btnActiveBg : P.btnInactiveBg,
                      color: canAffordMgr ? P.btnActiveText : P.btnInactiveText,
                      cursor: canAffordMgr ? "pointer" : "default",
                      fontSize:9, fontFamily:"'Junicode',sans-serif", textAlign:"center", lineHeight:1.5,
                    }}>
                      <div>Hire: {PRESS_MANAGERS[idx].name}</div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                        <UserStar size={8} strokeWidth={1.5}/>{fmt(PRESS_MGR_COSTS[idx])}
                      </div>
                    </button>
                  )}
                  {showMgrName && (
                    <div style={{ fontSize:9, color:P.sage, fontFamily:"'Junicode',sans-serif", textAlign:"center" }}>
                      ✓ {PRESS_MANAGERS[idx].name}
                    </div>
                  )}
                </div>
              );
            });
            const row2 = slots.slice(3);
            return (
              <div style={{ margin:`0 auto ${mb}px`, width:332 }}>
                <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom: row2.length > 0 ? 16 : 0 }}>{slots.slice(0, 3)}</div>
                {row2.length > 0 && <div style={{ display:"flex", justifyContent:"center", gap:16 }}>{row2}</div>}
              </div>
            );
          })()}

          {/* Recent tiles row */}
          {recentTiles.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, color:P.textMuted, fontFamily:"'Junicode',sans-serif", letterSpacing:1, textAlign:"center", marginBottom:5 }}>Last 10 tiles</div>
              <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:4, padding:"2px 0" }}>
                {recentTiles.map((tile, ti) => {
                  const tt = TILE_TYPES[tile.tileType] || TILE_TYPES.normal;
                  const isNewest = ti === recentTiles.length - 1;
                  return (
                    <motion.div key={tile.id}
                      initial={isNewest ? { scale: 0.5, opacity: 0 } : false}
                      animate={isNewest ? { scale: 1, opacity: 1 } : false}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{
                        position:"relative", width:30, height:30, borderRadius:4,
                        background:tt.color, border:`1.5px solid ${tt.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:"'Junicode',serif", fontSize:14, fontWeight:700,
                        color:tt.text, flexShrink:0,
                      }}>
                      {tile.tileType === "lexicoin" ? <Aperture size={11} /> : tile.letter}
                      {tile.tileType !== "normal" && tt.badge && (
                        <span style={{
                          position:"absolute", bottom:-5, left:"50%", transform:"translateX(-50%)",
                          background:tt.border, color:"#fff", borderRadius:2, padding:"0 2px",
                          fontSize:6, fontWeight:700, fontFamily:"'Junicode',sans-serif",
                          whiteSpace:"nowrap", lineHeight:1.4,
                        }}>{tt.badge}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Letter inventory */}
          <div style={st.panel}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
              <div style={{ ...st.sub }}>Current inventory</div>
              <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>{totalLetters}/{maxLetters} letters</div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
              {le.length === 0 && Object.keys(specGroups).length === 0 ? (
                <div style={{ fontSize:12, color:P.textMuted, fontStyle:"italic" }}>No letters yet</div>
              ) : (<>
                {le.map(([l, c]) => <LetterTile key={l} letter={l} count={c} onClick={() => {}} size={34}/>)}
                {Object.values(specGroups).map(g => (
                  <LetterTile key={g.type + (g.letter||"W")} letter={g.letter||""} count={g.count} onClick={() => {}} size={34} tileType={g.type} />
                ))}
              </>)}
            </div>
          </div>
        </div>

        {/* Right column: press upgrades */}
        <div className="lex-form-col">
          {pressCount > 0 && (
            <div style={st.panel}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Junicode',sans-serif", letterSpacing:1 }}>Press Upgrades</div>
                {unlockedQtys.length > 1 && <QtySelector qty={qty} onClick={() => setQty(cycleQty(qty, unlockedQtys))} />}
              </div>
              {pressCount > 1 && (
                <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                  {presses.map((_, i) => (
                    <button key={i} onClick={() => setSelectedPress(i)} style={{
                      padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer",
                      fontSize:10, fontFamily:"'Junicode',sans-serif",
                      background: selectedPress === i ? P.borderLight : "transparent",
                      color: selectedPress === i ? P.textPrimary : P.textMuted,
                      fontWeight: selectedPress === i ? 700 : 400,
                      transition:"all 0.15s",
                    }}>Press {i + 1}</button>
                  ))}
                </div>
              )}
              <DeviceUpgradeCard
                deviceLabel={`Press ${selectedPress + 1}`}
                upgrades={PRESS_UPGRADE_NAMES.map(n => UPGRADES_BY_NAME[n])}
                upgradeLevels={pressUpgradeLevels[selectedPress] || mkPressUpg()}
                qty={qty} collectedInk={collectedInk}
                onBuy={(upgrade, count, cost) => buyDeviceUpgrade("press", selectedPress, upgrade, count, cost)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
