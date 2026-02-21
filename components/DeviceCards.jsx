import { motion, AnimatePresence } from "framer-motion";
import { ApertureIcon as Aperture, DropletIcon as Droplet } from "../assets/icons";
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
      fontFamily:"'Junicode',sans-serif", fontSize:11, fontWeight:700,
      letterSpacing:1, transition:"all 0.15s",
    }}>{label}</button>
  );
}

// --- INFO ROW (label + value, used inside well/press info panels) ---
export function InfoRow({ label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
      <span style={{ color:P.textMuted, fontFamily:"'Junicode',sans-serif", fontSize:10 }}>{label}</span>
      <span style={{ color:P.textPrimary, fontFamily:"'Junicode',sans-serif", fontSize:10, fontWeight:700 }}>{value}</span>
    </div>
  );
}

// --- WELL MINI CARD ---
export function WellMiniCard({ well, idx, wUpg, hasManager, isEnabled, onCollect, onToggleManager, wellRef, inkMult = 1, floatData, scale = 1 }) {
  const wellCapacity = UPGRADES_BY_NAME["Well Capacity"].valueFormula(wUpg["Well Capacity"] ?? 0);
  const wellFillRate = UPGRADES_BY_NAME["Well Speed"].valueFormula(wUpg["Well Speed"] ?? 0) * inkMult;
  const fp = Math.min(100, (well.ink / wellCapacity) * 100);
  const isCollecting = well.collecting;
  const s = n => Math.round(n * scale);

  return (
    <div ref={wellRef} style={{ width:s(100), flexShrink:0, position:"relative" }}>
      {/* Ink collection float animation */}
      <AnimatePresence>
        {floatData && (
          <motion.div
            key={floatData.key}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: [1, 1, 0], y: -s(52) }}
            transition={{ duration: 1.4, ease: "easeOut", times: [0, 0.45, 1] }}
            style={{
              position: "absolute", top: s(28), left: "50%", transform: "translateX(-50%)",
              pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 3,
              fontSize: s(12), fontWeight: 700, fontFamily: "'Junicode',sans-serif",
              color: floatData.isCrit ? "#c9a227" : P.ink,
              textShadow: "0 1px 3px rgba(255,255,255,0.95)",
            }}
          >
            {floatData.isCrit && <span>★</span>}
            <span>+{fmt(floatData.amount)}</span>
            <Droplet size={s(10)} strokeWidth={1.5} />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onClick={() => { if (!isCollecting) onCollect(idx); }}
        style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:s(6), cursor:isCollecting ? "default" : "pointer" }}
      >
        <div style={{ fontSize:s(10), fontFamily:"'Junicode',sans-serif", letterSpacing:1, color:P.textMuted, fontWeight:700 }}>
          Well {idx + 1}
        </div>

        {/* Cylinder */}
        <div style={{ width:s(64), height:s(84), position:"relative", borderRadius:`${s(8)}px ${s(8)}px ${s(26)}px ${s(26)}px`, border: hasManager ? `2px solid ${P.sage}` : `1.5px solid ${P.border}`, overflow:"hidden", background:P.panelBg }}>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${fp}%`, background:"linear-gradient(to top, #152c3d, #1e3a52, #2d5070)", transition:"height 0.08s linear", borderRadius:`0 0 ${s(24)}px ${s(24)}px` }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:5, background:"linear-gradient(to bottom, rgba(255,255,255,0.28), transparent)", borderRadius:"50%" }}/>
          </div>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {isCollecting ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:s(8), color:"#fff", fontFamily:"'Junicode',sans-serif", fontWeight:700, textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>...</div>
                <div style={{ fontSize:s(13), fontWeight:700, color:"#fff", fontFamily:"'Junicode',sans-serif", textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{well.collectTimer.toFixed(1)}s</div>
              </div>
            ) : (
              <div style={{ fontSize:s(14), fontWeight:700, color: fp > 50 ? "#ffffff" : P.textPrimary, fontFamily:"'Junicode',sans-serif", textShadow: fp > 50 ? "0 1px 3px rgba(0,0,0,0.5)" : "none" }}>
                {fmt(well.ink)}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize:s(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>
          {fmt(wellFillRate)}/s
        </div>

        {hasManager && (
          <button
            onClick={e => { e.stopPropagation(); onToggleManager(idx); }}
            style={{
              padding:`2px ${s(10)}px`, fontSize:s(8), fontFamily:"'Junicode',sans-serif",
              border:`1px solid ${isEnabled ? P.sage : P.border}`, borderRadius:s(8), cursor:"pointer",
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
export function PressMiniCard({ press, idx, pUpg, hasManager, onStart, eject, onEjectEnd, scale = 1 }) {
  const pressInterval = UPGRADES_BY_NAME["Press Speed"].valueFormula(pUpg["Press Speed"] ?? 0);
  const interval = Math.max(0.1, pressInterval);
  const progress = press.running ? Math.min(100, ((interval - press.timer) / interval) * 100) : 0;
  const nTT = TILE_TYPES.normal;
  const s = n => Math.round(n * scale);

  return (
    <div style={{ width:s(100), flexShrink:0, position:"relative" }}>
      <div
        onClick={() => { if (!press.running) onStart(idx); }}
        style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:s(6), cursor: press.running ? "default" : "pointer" }}
      >
        <div style={{ fontSize:s(10), fontFamily:"'Junicode',sans-serif", letterSpacing:1, color:P.textMuted, fontWeight:700 }}>
          Press {idx + 1}
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:s(4) }}>
          <motion.div
            animate={press.running ? { rotate: [0, -0.4, 0.4, 0] } : { rotate: 0 }}
            transition={press.running ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
            style={{
              width:s(52), height:s(52), borderRadius:s(8), background:nTT.color,
              display:"flex", alignItems:"center", justifyContent:"center",
              border: press.running ? `2px solid ${P.ink}` : hasManager ? `2px solid ${P.sage}` : `1.5px solid ${nTT.border}`,
              boxShadow: press.running ? `0 0 8px ${P.ink}40` : "none",
            }}
          ><Aperture size={s(24)} strokeWidth={1.5} color={nTT.text}/></motion.div>
          {press.running ? (<>
            <div style={{ width:s(64), height:s(4), borderRadius:s(2), background:P.borderLight, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg, #152c3d, #2d5070)", borderRadius:s(2) }}/>
            </div>
            <div style={{ fontSize:s(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>{press.timer.toFixed(1)}s</div>
          </>) : (
            <div style={{ fontSize:s(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>{hasManager ? "auto" : "tap"}</div>
          )}
        </div>
      </div>

      {/* Eject animation */}
      <AnimatePresence>
        {eject && (
          <div style={{ position:"absolute", top:s(20), left:"50%", transform:"translateX(-50%)", pointerEvents:"none", zIndex:10 }}>
            <motion.div
              key={eject.key}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: [0, -s(54), -s(72)], opacity: [1, 1, 0] }}
              transition={{ duration: 0.9, ease: "easeOut", times: [0, 0.75, 1] }}
              onAnimationComplete={() => onEjectEnd(idx)}
              style={{
                width:s(44), height:s(44), borderRadius:s(5),
                background: (TILE_TYPES[eject.tileType] || TILE_TYPES.normal).color,
                border: `2px solid ${(TILE_TYPES[eject.tileType] || TILE_TYPES.normal).border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Junicode',serif", fontSize:s(20), fontWeight:700,
                color: (TILE_TYPES[eject.tileType] || TILE_TYPES.normal).text,
              }}
            >
              {eject.tileType === "lexicoin" ? <Aperture size={s(18)} /> : eject.letter}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- DEVICE UPGRADE CARD ---
// One card per device (well / manager / press), each upgrade as a fixed-height row.
export function DeviceUpgradeCard({ deviceLabel, upgrades, upgradeLevels, qty, collectedInk, onBuy, scale = 1 }) {
  const ROW_H = Math.round(38 * scale);
  const s = n => Math.round(n * scale);

  return (
    <div style={{ background:P.surfaceBg, border:`1px solid ${P.border}`, borderRadius:8, marginBottom:8, overflow:"hidden" }}>
      <div style={{ padding:`6px ${s(10)}px 4px` }}>
        <div style={{ fontSize:s(11), color:P.textPrimary, fontFamily:"'BLKCHCRY',serif", fontWeight:600, letterSpacing:0.5 }}>{deviceLabel}</div>
      </div>

      <div style={{ borderTop:`1px solid ${P.borderLight}` }}>
        {upgrades.map((upgrade, i) => {
          const currentLevel = upgradeLevels[upgrade.name] ?? 0;
          const isMaxed = currentLevel >= upgrade.maxLevel;
          const label = UPGRADE_SHORT_NAMES[upgrade.name] ?? upgrade.name;
          const currentVal = upgrade.valueFormula(currentLevel);
          const rowBorder = i < upgrades.length - 1 ? `1px solid ${P.borderLight}` : "none";

          if (isMaxed) {
            return (
              <div key={upgrade.name} style={{
                height: ROW_H, display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:`0 ${s(10)}px`, borderBottom: rowBorder,
              }}>
                <div style={{ fontSize:s(9), color:P.textMuted, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>{label}</div>
                <div style={{
                  background:"#fdf5d0", border:`1px solid #dcc878`, borderRadius:4,
                  padding:"2px 4px", display:"flex", flexDirection:"column", alignItems:"center", width:s(72), flexShrink:0,
                }}>
                  <div style={{ fontSize:s(10), fontFamily:"'Junicode',sans-serif", fontWeight:700, color:P.textPrimary, lineHeight:1.2 }}>{fmtUpgradeVal(upgrade, currentVal)}</div>
                  <div style={{ fontSize:s(7), fontFamily:"'Junicode',sans-serif", color:"#7a5800", lineHeight:1 }}>Max</div>
                </div>
              </div>
            );
          }

          const isMax = qty === "max";
          const bulk  = calcBulkBuy(upgrade, currentLevel, collectedInk, "max");
          const fixed = isMax ? null : calcQtyBuy(upgrade, currentLevel, qty);

          const purchaseCount = isMax ? bulk.count : fixed.count;
          const purchaseCost  = isMax ? bulk.totalCost : fixed.totalCost;
          const canAfford = purchaseCount > 0 && collectedInk >= purchaseCost;
          const displayCost = (isMax && bulk.count === 0)
            ? Math.ceil(upgrade.costFormula(currentLevel))
            : purchaseCost;

          return (
            <button key={upgrade.name}
              onClick={() => canAfford && onBuy(upgrade, purchaseCount, purchaseCost)}
              style={{
                height: ROW_H, display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:`0 ${s(10)}px`, width:"100%", textAlign:"left",
                background: canAfford ? `${P.btnActiveBg}18` : "transparent",
                border:"none", borderBottom: rowBorder,
                cursor: canAfford ? "pointer" : "default",
                transition:"background 0.15s",
              }}
            >
              <div style={{ fontSize:s(9), fontFamily:"'Junicode',sans-serif", fontWeight:700, color: canAfford ? P.textPrimary : P.textMuted }}>{label}</div>
              <div style={{
                background: canAfford ? P.btnActiveBg : P.panelBg,
                border:`1px solid ${canAfford ? P.btnActiveBg : P.border}`,
                borderRadius:4, padding:"2px 4px",
                display:"flex", flexDirection:"column", alignItems:"center", width:s(72), flexShrink:0,
              }}>
                <div style={{ fontSize:s(10), fontFamily:"'Junicode',sans-serif", fontWeight:700, color: canAfford ? P.btnActiveText : P.textPrimary, lineHeight:1.2 }}>{fmtUpgradeVal(upgrade, currentVal)}</div>
                <div style={{ fontSize:s(7), fontFamily:"'Junicode',sans-serif", color: canAfford ? P.btnActiveText : P.textMuted, lineHeight:1, display:"flex", alignItems:"center", gap:2 }}>
                  <Droplet size={s(6)}/>{fmt(displayCost)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
