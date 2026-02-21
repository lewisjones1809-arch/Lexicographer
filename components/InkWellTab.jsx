import { useState } from "react";
import { motion } from "framer-motion";
import { DropletIcon as Droplet } from "../assets/icons";

import { P, st } from "../styles.js";
import { WELL_UPGRADE_NAMES, MGR_UPGRADE_NAMES, WELL_COSTS, WELL_MGR_COSTS, WELL_MANAGERS, MAX_WELLS } from "../constants.js";
import { fmt } from "../gameUtils.js";
import { mkWellUpg, mkMgrUpg, cycleQty } from "../upgradeUtils.js";
import { UPGRADES_BY_NAME } from "../upgrades.js";
import { WellMiniCard, DeviceUpgradeCard, QtySelector, InfoRow } from "./DeviceCards.jsx";

export function InkWellTab({
  wells, wellCount, wellMgrOwned, wellMgrEnabled,
  collectedInk, collectWell, buyWell, buyWellManager, toggleWellManager,
  wellUpgradeLevels, mgrUpgradeLevels, buyDeviceUpgrade,
  wellRefs, wellFloats, tutorialStep, unlockedQtys, inkMult, uiScale = 1
}) {
  const sc = n => Math.round(n * uiScale);
  const [qty, setQty] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedWell, setSelectedWell] = useState(0);
  const [selectedMgr, setSelectedMgr] = useState(0);
  const nextWellCost = wellCount < MAX_WELLS ? WELL_COSTS[wellCount] : null;
  const ownedMgrIndices = wellMgrOwned.reduce((acc, owned, i) => owned ? [...acc, i] : acc, []);

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
        <div style={{ ...st.heading, fontSize:sc(22), marginBottom:0 }}>Ink Wells</div>
      </div>

      <div className="lex-lexicon-outer">
        {/* Left column: info + well mini-cards */}
        <div className="lex-book-col">
          {/* Info panel */}
          {showInfo && (
            <div style={{ ...st.panel, marginBottom:16 }}>
              <div style={{ fontSize:13, fontFamily:"'BLKCHCRY',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:10 }}>Well Stats</div>
              {wells.map((well, idx) => {
                const wUpg = wellUpgradeLevels[idx] || mkWellUpg();
                const mUpg = mgrUpgradeLevels[idx]  || mkMgrUpg();
                const wellCapacity   = UPGRADES_BY_NAME["Well Capacity"].valueFormula(wUpg["Well Capacity"] ?? 0);
                const wellFillRate   = UPGRADES_BY_NAME["Well Speed"].valueFormula(wUpg["Well Speed"] ?? 0);
                const critChance     = UPGRADES_BY_NAME["Crit Chance"].valueFormula(wUpg["Crit Chance"] ?? 0);
                const critMult       = UPGRADES_BY_NAME["Crit Multiplier"].valueFormula(wUpg["Crit Multiplier"] ?? 0);
                const hasManager     = !!wellMgrOwned[idx];
                const mgrCollectTime = hasManager ? UPGRADES_BY_NAME["Manager Speed"].valueFormula(mUpg["Manager Speed"] ?? 0) : null;
                const mgr            = hasManager ? WELL_MANAGERS[idx] : null;
                return (
                  <div key={idx} style={{ paddingBottom:8, marginBottom:8, borderBottom: idx < wells.length - 1 ? `1px solid ${P.borderLight}` : "none" }}>
                    <div style={{ fontSize:11, fontFamily:"'BLKCHCRY',serif", fontWeight:700, color:P.textPrimary, marginBottom:4 }}>Well {idx + 1}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"2px 16px" }}>
                      <InfoRow label="Ink: "            value={`${fmt(well.ink)} / ${fmt(wellCapacity)}`} />
                      <InfoRow label="Fill rate: "      value={`${parseFloat(wellFillRate.toFixed(2))}/s`} />
                      <InfoRow label="Crit Chance:"     value={`${(critChance * 100).toFixed(1)}%`} />
                      <InfoRow label="Crit Mult: "      value={`${critMult.toFixed(2)}×`} />
                      {hasManager && <>
                        <InfoRow label="Manager: "         value={mgr.name} />
                        <InfoRow label="Collection Time: " value={`${Math.round(mgrCollectTime)}s`} />
                      </>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Wells: real cards + one buy-next placeholder, staggered 3+2 */}
          {(() => {
            const totalSlots = wellCount + (wellCount < MAX_WELLS ? 1 : 0);
            const canAffordWell = collectedInk >= (nextWellCost || 0);

            const slots = Array.from({ length: totalSlots }, (_, idx) => {
              const isBuySlot = idx === wellCount;

              const card = isBuySlot ? (
                <div onClick={canAffordWell ? buyWell : undefined} style={{
                  width:sc(100), flexShrink:0, cursor: canAffordWell ? "pointer" : "default",
                  opacity: canAffordWell ? 1 : 0.55,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:sc(6),
                }}>
                  <div style={{ fontSize:sc(10), fontFamily:"'Junicode',sans-serif", letterSpacing:1, color:P.textMuted, fontWeight:700 }}>
                    Well {idx + 1}
                  </div>
                  <motion.div
                    animate={canAffordWell
                      ? { boxShadow: [`0 0 4px ${P.ink}20`, `0 0 12px ${P.ink}55`, `0 0 4px ${P.ink}20`] }
                      : { boxShadow: "0 0 0px transparent" }
                    }
                    transition={canAffordWell ? { duration:2, repeat:Infinity, ease:"easeInOut" } : { duration:0.2 }}
                    style={{
                      width:sc(64), height:sc(84), borderRadius:`${sc(8)}px ${sc(8)}px ${sc(26)}px ${sc(26)}px`,
                      border: canAffordWell ? `1.5px solid ${P.ink}` : `1.5px dashed ${P.border}`,
                      background: canAffordWell ? P.panelBg : P.surfaceBg,
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:sc(6),
                      transition:"border 0.2s, background 0.2s",
                    }}>
                    <div style={{ fontSize:sc(9), fontFamily:"'BLKCHCRY',serif", color:P.textSecondary, textAlign:"center", lineHeight:1.3, padding:"0 4px" }}>
                      {tutorialStep === 2 && wellCount === 0 ? "FREE" : "Buy New Well"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:3, fontSize:sc(10), color:P.ink, fontFamily:"'Junicode',sans-serif", fontWeight:700 }}>
                      <Droplet size={sc(9)} strokeWidth={1.5}/>{tutorialStep === 2 && wellCount === 0 ? "free" : fmt(nextWellCost)}
                    </div>
                  </motion.div>
                  <div style={{ height:sc(15) }}/>{/* spacer matching fill-rate line */}
                </div>
              ) : (
                <WellMiniCard well={wells[idx]} idx={idx}
                  wUpg={wellUpgradeLevels[idx] || mkWellUpg()}
                  hasManager={!!wellMgrOwned[idx]}
                  isEnabled={!!wellMgrOwned[idx] ? (wellMgrEnabled[idx] ?? true) : false}
                  onCollect={collectWell} onToggleManager={toggleWellManager}
                  wellRef={el => { wellRefs.current[idx] = el; }} inkMult={inkMult}
                  floatData={wellFloats?.[idx]} scale={uiScale} />
              );

              const showBuyMgr = !isBuySlot && !wellMgrOwned[idx] && idx < wellCount;
              const canAffordMgr = collectedInk >= WELL_MGR_COSTS[idx];
              const showMgrName = !isBuySlot && !!wellMgrOwned[idx];

              return (
                <div key={idx} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:sc(6), flexShrink:0 }}>
                  {card}
                  {showBuyMgr && (
                    <button onClick={canAffordMgr ? () => buyWellManager(idx) : undefined} style={{
                      width:sc(100), padding:"3px 0", borderRadius:6, border:"none",
                      background: canAffordMgr ? P.btnActiveBg : P.btnInactiveBg,
                      color: canAffordMgr ? P.btnActiveText : P.btnInactiveText,
                      cursor: canAffordMgr ? "pointer" : "default",
                      fontSize:sc(9), fontFamily:"'Junicode',sans-serif", textAlign:"center", lineHeight:1.5,
                    }}>
                      <div>Hire: {WELL_MANAGERS[idx].name}</div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                        <Droplet size={sc(8)} strokeWidth={1.5}/>{fmt(WELL_MGR_COSTS[idx])}
                      </div>
                    </button>
                  )}
                  {showMgrName && (
                    <div style={{ fontSize:sc(9), color:P.sage, fontFamily:"'Junicode',sans-serif", textAlign:"center" }}>
                      ✓ {WELL_MANAGERS[idx].name}
                    </div>
                  )}
                </div>
              );
            });

            const row2 = slots.slice(3);
            return (
              <div style={{ margin:`0 auto ${sc(16)}px`, width:sc(332) }}>
                <div style={{ display:"flex", justifyContent:"center", gap:sc(16), marginBottom: row2.length > 0 ? sc(16) : 0 }}>{slots.slice(0, 3)}</div>
                {row2.length > 0 && <div style={{ display:"flex", justifyContent:"center", gap:sc(16) }}>{row2}</div>}
              </div>
            );
          })()}
        </div>

        {/* Right column: upgrades */}
        <div className="lex-form-col">
          <div style={st.panel}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Junicode',sans-serif", letterSpacing:1 }}>Upgrades</div>
              {unlockedQtys.length > 1 && <QtySelector qty={qty} onClick={() => setQty(cycleQty(qty, unlockedQtys))} />}
            </div>

            {/* Well tabs */}
            {wells.length > 1 && (
              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {wells.map((_, i) => (
                  <button key={i} onClick={() => setSelectedWell(i)} style={{
                    padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer",
                    fontSize:10, fontFamily:"'Junicode',sans-serif",
                    background: selectedWell === i ? P.borderLight : "transparent",
                    color: selectedWell === i ? P.textPrimary : P.textMuted,
                    fontWeight: selectedWell === i ? 700 : 400,
                    transition:"all 0.15s",
                  }}>Well {i + 1}</button>
                ))}
              </div>
            )}
            <DeviceUpgradeCard
              deviceLabel={`Well ${selectedWell + 1}`}
              upgrades={WELL_UPGRADE_NAMES.map(n => UPGRADES_BY_NAME[n])}
              upgradeLevels={wellUpgradeLevels[selectedWell] || mkWellUpg()}
              qty={qty} collectedInk={collectedInk} scale={uiScale}
              onBuy={(upgrade, count, cost) => buyDeviceUpgrade("well", selectedWell, upgrade, count, cost)} />

            {/* Manager upgrades */}
            {ownedMgrIndices.length > 0 && (
              <>
                <div style={{ borderTop:`1px solid ${P.borderLight}`, margin:"16px 0 12px" }} />
                <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Junicode',sans-serif", letterSpacing:1, marginBottom:8 }}>Manager Upgrades</div>
                {ownedMgrIndices.length > 1 && (
                  <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                    {ownedMgrIndices.map(wellIdx => (
                      <button key={wellIdx} onClick={() => setSelectedMgr(wellIdx)} style={{
                        padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer",
                        fontSize:10, fontFamily:"'Junicode',sans-serif",
                        background: selectedMgr === wellIdx ? P.borderLight : "transparent",
                        color: selectedMgr === wellIdx ? P.textPrimary : P.textMuted,
                        fontWeight: selectedMgr === wellIdx ? 700 : 400,
                        transition:"all 0.15s",
                      }}>{WELL_MANAGERS[wellIdx].name}</button>
                    ))}
                  </div>
                )}
                <DeviceUpgradeCard
                  deviceLabel={WELL_MANAGERS[selectedMgr].name}
                  upgrades={MGR_UPGRADE_NAMES.map(n => UPGRADES_BY_NAME[n])}
                  upgradeLevels={mgrUpgradeLevels[selectedMgr] || mkMgrUpg()}
                  qty={qty} collectedInk={collectedInk} scale={uiScale}
                  onBuy={(upgrade, count, cost) => buyDeviceUpgrade("manager", selectedMgr, upgrade, count, cost)} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
