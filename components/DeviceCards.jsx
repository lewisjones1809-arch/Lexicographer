import { motion, AnimatePresence } from "framer-motion";
import { ApertureIcon as Aperture } from "../assets/icons";
import { TILE_TYPES, UPGRADE_SHORT_NAMES } from "../constants.js";
import { P, st } from "../styles.js";
import { fmt } from "../gameUtils.js";
import { calcBulkBuy, calcQtyBuy, fmtUpgradeVal } from "../upgradeUtils.js";
import { UPGRADES_BY_NAME } from "../upgrades.js";

// --- QTY SELECTOR BUTTON ---
export function QtySelector({ qty, onClick }) {
  const label = qty === "max" ? "Max" : `×${qty}`;
  return (
    <button onClick={onClick} style={{
      padding:"4px 12px", background:P.btnActiveBg, color:P.btnActiveText,
      border:"none", borderRadius:6, cursor:"pointer",
      fontFamily:"'Courier Prime',monospace", fontSize:11, fontWeight:700,
      letterSpacing:1, transition:"all 0.15s",
    }}>{label}</button>
  );
}

// --- INFO ROW (label + value, used inside well/press info panels) ---
export function InfoRow({ label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
      <span style={{ color:P.textMuted, fontFamily:"'Courier Prime',monospace", fontSize:10 }}>{label}</span>
      <span style={{ color:P.textPrimary, fontFamily:"'Courier Prime',monospace", fontSize:10, fontWeight:700 }}>{value}</span>
    </div>
  );
}

// --- WELL MINI CARD ---
export function WellMiniCard({ well, idx, wUpg, hasManager, isEnabled, onCollect, onToggleManager, wellRef, inkMult = 1 }) {
  const wellCapacity = UPGRADES_BY_NAME["Well Capacity"].valueFormula(wUpg["Well Capacity"] ?? 0);
  const wellFillRate = UPGRADES_BY_NAME["Well Speed"].valueFormula(wUpg["Well Speed"] ?? 0) * inkMult;
  const fp = Math.min(100, (well.ink / wellCapacity) * 100);
  const isCollecting = well.collecting;

  return (
    <div ref={wellRef} style={{ width:100, flexShrink:0, position:"relative" }}>
      <div
        onClick={() => { if (!isCollecting) onCollect(idx); }}
        style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:isCollecting ? "default" : "pointer" }}
      >
        <div style={{ fontSize:10, fontFamily:"'Courier Prime',monospace", textTransform:"uppercase", letterSpacing:1.5, color:P.textMuted, fontWeight:700 }}>
          Well {idx + 1}
        </div>

        {/* Cylinder */}
        <div style={{ width:64, height:84, position:"relative", borderRadius:"8px 8px 26px 26px", border: hasManager ? `2px solid ${P.sage}` : `1.5px solid ${P.border}`, overflow:"hidden", background:P.panelBg }}>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${fp}%`, background:"linear-gradient(to top, #527898, #6b8fa8, #80a6c0)", transition:"height 0.08s linear", borderRadius:"0 0 24px 24px" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:5, background:"linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)", borderRadius:"50%" }}/>
          </div>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {isCollecting ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:8, color:"#fff", fontFamily:"'Courier Prime',monospace", fontWeight:700, textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>...</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff", fontFamily:"'Courier Prime',monospace", textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{well.collectTimer.toFixed(1)}s</div>
              </div>
            ) : (
              <div style={{ fontSize:14, fontWeight:700, color: fp > 60 ? "#ffffff" : P.textPrimary, fontFamily:"'Courier Prime',monospace", textShadow: fp > 60 ? "0 1px 3px rgba(0,0,0,0.4)" : "none" }}>
                {fmt(well.ink)}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>
          {parseFloat(wellFillRate.toFixed(2))}/s
        </div>

        {hasManager && (
          <button
            onClick={e => { e.stopPropagation(); onToggleManager(idx); }}
            style={{
              padding:"2px 10px", fontSize:8, fontFamily:"'Courier Prime',monospace",
              border:`1px solid ${isEnabled ? P.sage : P.border}`, borderRadius:8, cursor:"pointer",
              background: isEnabled ? P.sage : "transparent",
              color: isEnabled ? "#ffffff" : P.textMuted, transition:"all 0.15s",
            }}
          >{isEnabled ? "ON" : "OFF"}</button>
        )}
      </div>
    </div>
  );
}

// --- PRESS MINI CARD ---
export function PressMiniCard({ press, idx, pUpg, hasManager, onStart, eject, onEjectEnd }) {
  const pressInterval = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
  const interval = Math.max(0.1, pressInterval);
  const progress = press.running ? Math.min(100, ((interval - press.timer) / interval) * 100) : 0;
  const lcTT = TILE_TYPES.lexicoin;

  return (
    <div style={{ width:100, flexShrink:0, position:"relative" }}>
      <div
        onClick={() => { if (!press.running) onStart(idx); }}
        style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor: press.running ? "default" : "pointer" }}
      >
        <div style={{ fontSize:10, fontFamily:"'Courier Prime',monospace", textTransform:"uppercase", letterSpacing:1.5, color:P.textMuted, fontWeight:700 }}>
          Press {idx + 1}
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <motion.div
            animate={press.running ? { rotate: [0, -0.4, 0.4, 0] } : { rotate: 0 }}
            transition={press.running ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
            style={{
              width:52, height:52, borderRadius:8, background:lcTT.color,
              display:"flex", alignItems:"center", justifyContent:"center",
              border: press.running ? `2px solid ${P.ink}` : hasManager ? `2px solid ${P.sage}` : `1.5px solid ${lcTT.border}`,
              boxShadow: press.running ? `0 0 8px ${P.ink}40` : "none",
            }}
          ><Aperture size={24} strokeWidth={1.5} color={lcTT.text}/></motion.div>
          {press.running ? (<>
            <div style={{ width:64, height:4, borderRadius:2, background:P.borderLight, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg, #527898, #6b8fa8)", borderRadius:2 }}/>
            </div>
            <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{press.timer.toFixed(1)}s</div>
          </>) : (
            <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{hasManager ? "auto" : "tap"}</div>
          )}
        </div>
      </div>

      {/* Eject animation */}
      <AnimatePresence>
        {eject && (
          <div style={{ position:"absolute", top:20, left:"50%", transform:"translateX(-50%)", pointerEvents:"none", zIndex:10 }}>
            <motion.div
              key={eject.key}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: [0, -54, -72], opacity: [1, 1, 0] }}
              transition={{ duration: 0.9, ease: "easeOut", times: [0, 0.75, 1] }}
              onAnimationComplete={() => onEjectEnd(idx)}
              style={{
                width:44, height:44, borderRadius:5,
                background: (TILE_TYPES[eject.tileType] || TILE_TYPES.normal).color,
                border: `2px solid ${(TILE_TYPES[eject.tileType] || TILE_TYPES.normal).border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
                color: (TILE_TYPES[eject.tileType] || TILE_TYPES.normal).text,
              }}
            >
              {eject.tileType === "lexicoin" ? <Aperture size={18} /> : eject.letter}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- DEVICE UPGRADE CARD ---
// One card per device (well / manager / press), showing upgrade buttons in a grid.
export function DeviceUpgradeCard({ deviceLabel, upgrades, upgradeLevels, qty, collectedInk, onBuy }) {
  const cols = Math.min(upgrades.length, 4);

  return (
    <div style={{ background:P.surfaceBg, border:`1px solid ${P.border}`, borderRadius:8, marginBottom:8, overflow:"hidden" }}>
      <div style={{ padding:"8px 10px 6px 10px" }}>
        <div style={{ fontSize:12, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>{deviceLabel}</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:4, padding:"0 8px 8px 8px" }}>
        {upgrades.map((upgrade) => {
          const currentLevel = upgradeLevels[upgrade.name] ?? 0;
          const isMaxed = currentLevel >= upgrade.maxLevel;
          const label = UPGRADE_SHORT_NAMES[upgrade.name] ?? upgrade.name;

          if (isMaxed) {
            return (
              <div key={upgrade.name} style={{
                padding:"5px 3px",
                background:P.panelBg, border:`1px solid ${P.borderLight}`,
                borderRadius:4, textAlign:"center",
                display:"flex", flexDirection:"column", alignItems:"center", gap:1,
              }}>
                <div style={{ fontSize:8, color:P.textMuted, fontFamily:"'Courier Prime',monospace", fontWeight:700, lineHeight:1.2 }}>{label}</div>
                <div style={{ fontSize:8, color:P.sage, fontFamily:"'Courier Prime',monospace", fontWeight:700 }}>MAX</div>
                <div style={{ fontSize:7, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{currentLevel}/{upgrade.maxLevel}</div>
              </div>
            );
          }

          const isMax = qty === "max";
          const bulk  = calcBulkBuy(upgrade, currentLevel, collectedInk, "max");
          const fixed = isMax ? null : calcQtyBuy(upgrade, currentLevel, qty);

          const purchaseCount = isMax ? bulk.count : fixed.count;
          const purchaseCost  = isMax ? bulk.totalCost : fixed.totalCost;
          const canAfford = purchaseCount > 0 && collectedInk >= purchaseCost;

          const displayCount = isMax ? Math.max(1, bulk.count) : fixed.count;
          const displayCost = (isMax && bulk.count === 0)
            ? Math.ceil(upgrade.costFormula(currentLevel))
            : purchaseCost;
          const afterVal = upgrade.valueFormula(Math.min(currentLevel + displayCount, upgrade.maxLevel));

          return (
            <button key={upgrade.name}
              onClick={() => canAfford && onBuy(upgrade, purchaseCount, purchaseCost)}
              style={{
                padding:"5px 3px",
                background: canAfford ? P.btnActiveBg : P.panelBg,
                color: canAfford ? P.btnActiveText : P.textMuted,
                border:`1px solid ${canAfford ? P.btnActiveBg : P.border}`,
                borderRadius:4, cursor: canAfford ? "pointer" : "default",
                textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:1,
                transition:"all 0.15s",
              }}
            >
              <div style={{ fontSize:8, fontFamily:"'Courier Prime',monospace", fontWeight:700, lineHeight:1.2 }}>{label}</div>
              <div style={{ fontSize:7, fontFamily:"'Courier Prime',monospace", opacity:0.8 }}>{currentLevel}/{upgrade.maxLevel} +{displayCount}</div>
              <div style={{ fontSize:9, fontFamily:"'Courier Prime',monospace" }}>{fmt(displayCost)}</div>
              <div style={{ fontSize:7, fontFamily:"'Courier Prime',monospace", opacity:0.85 }}>→ {fmtUpgradeVal(upgrade, afterVal)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
