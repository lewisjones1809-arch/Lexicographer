import { useState } from "react";
import { motion } from "framer-motion";
import { CaseUpperIcon as CaseUpper, ApertureIcon as Aperture } from "../assets/icons";
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
  presses, pressCount, pressMgrCount,
  startPress, buyPress, buyPressManager,
  totalLetters, letters, specialTiles, collectedInk,
  pressUpgradeLevels, buyDeviceUpgrade,
  recentTiles, pressEjects, clearPressEject, unlockedQtys, maxLetters
}) {
  const [qty, setQty] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const le = Object.entries(letters).sort((a,b) => a[0].localeCompare(b[0]));
  const nextPressCost = pressCount < MAX_PRESSES ? PRESS_COSTS[pressCount] : null;
  const nextMgrCost = pressMgrCount < pressCount ? PRESS_MGR_COSTS[pressMgrCount] : null;
  const nextMgr = pressMgrCount < MAX_PRESSES ? PRESS_MANAGERS[pressMgrCount] : null;

  // Group special tiles for display
  const specGroups = {};
  specialTiles.forEach(t => {
    const k = t.type === "lexicoin" ? "_wild" : `${t.letter}_${t.type}`;
    specGroups[k] = specGroups[k] || { letter:t.letter, type:t.type, count:0 };
    specGroups[k].count++;
  });

  return (
    <div style={{ paddingTop:12 }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:2 }}>
          <div style={{ ...st.heading, fontSize:22, marginBottom:0 }}>Letter Pressing</div>
          <button onClick={() => setShowInfo(p => !p)} style={{
            width:22, height:22, borderRadius:"50%",
            border:`1.5px solid ${showInfo ? P.ink : P.border}`,
            background: showInfo ? P.borderLight : "transparent",
            color: showInfo ? P.ink : P.textSecondary,
            fontSize:11, fontFamily:"'Playfair Display',serif", fontWeight:700,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            padding:0, transition:"all 0.2s",
          }}>i</button>
        </div>
        <div style={{ ...st.sub, marginBottom:4 }}>{totalLetters}/{maxLetters} letters</div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div style={{ ...st.panel, marginBottom:16 }}>
          <div style={{ fontSize:13, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:10 }}>PRESS STATS</div>
          {presses.map((_, idx) => {
            const pUpg = pressUpgradeLevels[idx] || mkPressUpg();
            const pressInterval = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
            const pressYield    = UPGRADES_BY_NAME["Press Yield"].valueFormula(pUpg["Press Yield"] ?? 0);
            const hasManager    = idx < pressMgrCount;
            const mgr           = hasManager ? PRESS_MANAGERS[idx] : null;
            return (
              <div key={idx} style={{ paddingBottom:8, marginBottom:8, borderBottom: idx < presses.length - 1 ? `1px solid ${P.borderLight}` : "none" }}>
                <div style={{ fontSize:11, fontFamily:"'Playfair Display',serif", fontWeight:700, color:P.textPrimary, marginBottom:4 }}>Press {idx + 1}</div>
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

      {/* Press mini-card row */}
      <div style={{ display:"flex", justifyContent:"center", gap:16, flexWrap:"wrap", marginBottom:recentTiles.length > 0 ? 8 : 16 }}>
        {presses.map((press, idx) => {
          const pUpg = pressUpgradeLevels[idx] || mkPressUpg();
          const hasManager = idx < pressMgrCount;
          return (
            <PressMiniCard key={idx} press={press} idx={idx}
              pUpg={pUpg} hasManager={hasManager}
              onStart={startPress}
              eject={pressEjects[idx] || null}
              onEjectEnd={clearPressEject} />
          );
        })}
      </div>

      {/* Recent tiles row */}
      {recentTiles.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:9, color:P.textMuted, fontFamily:"'Courier Prime',monospace", textTransform:"uppercase", letterSpacing:1.5, textAlign:"center", marginBottom:5 }}>last 10 tiles</div>
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
                    fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700,
                    color:tt.text, flexShrink:0,
                  }}>
                  {tile.tileType === "lexicoin" ? <Aperture size={11} /> : tile.letter}
                  {tile.tileType !== "normal" && tt.badge && (
                    <span style={{
                      position:"absolute", bottom:-5, left:"50%", transform:"translateX(-50%)",
                      background:tt.border, color:"#fff", borderRadius:2, padding:"0 2px",
                      fontSize:6, fontWeight:700, fontFamily:"'Courier Prime',monospace",
                      whiteSpace:"nowrap", lineHeight:1.4,
                    }}>{tt.badge}</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expand */}
      <div style={st.panel}>
        <div style={{ fontSize:14, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:12 }}>EXPAND</div>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:10, background:P.surfaceBg, border:`1px solid ${P.border}`, borderRadius:8, marginBottom:8 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:P.panelBg, border:`1.5px solid ${P.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CaseUpper size={16} strokeWidth={1.5} color={P.textSecondary}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>New Letter Press</div>
            <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{pressCount}/{MAX_PRESSES} built</div>
          </div>
          {nextPressCost !== null ? (
            <button onClick={buyPress} style={{ padding:"6px 14px", background:collectedInk >= nextPressCost ? P.btnActiveBg : P.btnInactiveBg, color:collectedInk >= nextPressCost ? P.btnActiveText : P.btnInactiveText, border:"none", borderRadius:4, cursor:collectedInk >= nextPressCost ? "pointer" : "default", fontSize:11, fontFamily:"'Courier Prime',monospace" }}>
              {fmt(nextPressCost)} ink
            </button>
          ) : <span style={{ fontSize:10, color:P.sage, fontFamily:"'Courier Prime',monospace" }}>✓ maxed</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:10, background:P.surfaceBg, border:`1px solid ${P.border}`, borderRadius:8 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:P.panelBg, border:`1.5px solid ${P.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <UserStar size={16} strokeWidth={1.5} color={P.sage}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>
              {nextMgr ? `Hire: ${nextMgr.name}` : "All Managers Hired"}
            </div>
            <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>
              {nextMgr ? nextMgr.flavor : `${pressMgrCount}/${pressMgrCount} managers`}
            </div>
          </div>
          {nextMgrCost !== null ? (
            <button onClick={buyPressManager} style={{ padding:"6px 14px", background:collectedInk >= nextMgrCost ? P.btnActiveBg : P.btnInactiveBg, color:collectedInk >= nextMgrCost ? P.btnActiveText : P.btnInactiveText, border:"none", borderRadius:4, cursor:collectedInk >= nextMgrCost ? "pointer" : "default", fontSize:11, fontFamily:"'Courier Prime',monospace" }}>
              {fmt(nextMgrCost)} ink
            </button>
          ) : pressMgrCount >= pressCount ? (
            <span style={{ fontSize:10, color:P.rose, fontFamily:"'Courier Prime',monospace" }}>need press first</span>
          ) : <span style={{ fontSize:10, color:P.sage, fontFamily:"'Courier Prime',monospace" }}>✓ maxed</span>}
        </div>
      </div>

      {/* Press Upgrades */}
      <div style={st.panel}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace", textTransform:"uppercase", letterSpacing:2 }}>Press Upgrades</div>
          <QtySelector qty={qty} onClick={() => setQty(cycleQty(qty, unlockedQtys))} />
        </div>
        {presses.map((_, pressIdx) => (
          <DeviceUpgradeCard key={pressIdx}
            deviceLabel={`Press ${pressIdx + 1}`}
            upgrades={PRESS_UPGRADE_NAMES.map(n => UPGRADES_BY_NAME[n])}
            upgradeLevels={pressUpgradeLevels[pressIdx] || mkPressUpg()}
            qty={qty} collectedInk={collectedInk}
            onBuy={(upgrade, count, cost) => buyDeviceUpgrade("press", pressIdx, upgrade, count, cost)} />
        ))}
      </div>

      {/* Letter inventory */}
      <div style={{ ...st.panel, marginTop:8 }}>
        <div style={{ ...st.sub, marginBottom:10 }}>Current inventory</div>
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
  );
}
