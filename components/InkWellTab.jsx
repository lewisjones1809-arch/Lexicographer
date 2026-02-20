import { useState } from "react";
import { Droplet, UserStar } from "lucide-react";
import { P, st } from "../styles.js";
import { WELL_UPGRADE_NAMES, MGR_UPGRADE_NAMES, WELL_COSTS, WELL_MGR_COSTS, WELL_MANAGERS, MAX_WELLS } from "../constants.js";
import { fmt } from "../gameUtils.js";
import { mkWellUpg, mkMgrUpg, cycleQty } from "../upgradeUtils.js";
import { UPGRADES_BY_NAME } from "../upgrades.js";
import { WellMiniCard, DeviceUpgradeCard, QtySelector, InfoRow } from "./DeviceCards.jsx";

export function InkWellTab({
  wells, wellCount, wellMgrCount, wellMgrEnabled,
  collectedInk, collectWell, buyWell, buyWellManager, toggleWellManager,
  wellUpgradeLevels, mgrUpgradeLevels, buyDeviceUpgrade,
  critPopup, critKey, onCritEnd, tutorialStep, unlockedQtys, inkMult
}) {
  const [qty, setQty] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const totalWellInk = wells.reduce((s, w) => s + w.ink, 0);
  const nextWellCost = wellCount < MAX_WELLS ? WELL_COSTS[wellCount] : null;
  const nextMgrCost = wellMgrCount < wellCount ? WELL_MGR_COSTS[wellMgrCount] : null;
  const nextMgr = wellMgrCount < MAX_WELLS ? WELL_MANAGERS[wellMgrCount] : null;

  return (
    <div style={{ paddingTop:12 }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:2 }}>
          <div style={{ ...st.heading, fontSize:22, marginBottom:0 }}>The Ink Wells</div>
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
        <div style={{ display:"flex", justifyContent:"center", gap:32, marginBottom:8 }}>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:1, color:P.textMuted }}>In Wells</div><div style={{ fontSize:22, fontWeight:700, color:P.ink, fontFamily:"'Playfair Display',serif" }}>{fmt(totalWellInk)}</div></div>
          <div style={{ fontSize:18, color:P.border, alignSelf:"center" }}>→</div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:1, color:P.textMuted }}>Collected</div><div style={{ fontSize:22, fontWeight:700, color:P.ink, fontFamily:"'Playfair Display',serif" }}>{fmt(collectedInk)}</div></div>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div style={{ ...st.panel, marginBottom:16 }}>
          <div style={{ fontSize:13, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:10 }}>WELL STATS</div>
          {wells.map((well, idx) => {
            const wUpg = wellUpgradeLevels[idx] || mkWellUpg();
            const mUpg = mgrUpgradeLevels[idx]  || mkMgrUpg();
            const wellCapacity   = UPGRADES_BY_NAME["Well Capacity"].valueFormula(wUpg["Well Capacity"] ?? 0);
            const wellFillRate   = UPGRADES_BY_NAME["Well Speed"].valueFormula(wUpg["Well Speed"] ?? 0);
            const critChance     = UPGRADES_BY_NAME["Crit Chance"].valueFormula(wUpg["Crit Chance"] ?? 0);
            const critMult       = UPGRADES_BY_NAME["Crit Multiplier"].valueFormula(wUpg["Crit Multiplier"] ?? 0);
            const hasManager     = idx < wellMgrCount;
            const mgrCollectTime = hasManager ? UPGRADES_BY_NAME["Manager Speed"].valueFormula(mUpg["Manager Speed"] ?? 0) : null;
            const mgr            = hasManager ? WELL_MANAGERS[idx] : null;
            return (
              <div key={idx} style={{ paddingBottom:8, marginBottom:8, borderBottom: idx < wells.length - 1 ? `1px solid ${P.borderLight}` : "none" }}>
                <div style={{ fontSize:11, fontFamily:"'Playfair Display',serif", fontWeight:700, color:P.textPrimary, marginBottom:4 }}>Well {idx + 1}</div>
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

      {/* Well mini-card row */}
      <div style={{ display:"flex", justifyContent:"center", gap:16, flexWrap:"wrap", marginBottom:16 }}>
        {wells.map((well, idx) => {
          const wUpg = wellUpgradeLevels[idx] || mkWellUpg();
          const hasManager = idx < wellMgrCount;
          const isEnabled = hasManager ? (wellMgrEnabled[idx] ?? true) : false;
          return (
            <WellMiniCard key={idx} well={well} idx={idx}
              wUpg={wUpg} hasManager={hasManager} isEnabled={isEnabled}
              onCollect={collectWell} onToggleManager={toggleWellManager}
              critPopup={critPopup} critKey={critKey} onCritEnd={onCritEnd} inkMult={inkMult} />
          );
        })}
      </div>

      {/* Expand */}
      <div style={st.panel}>
        <div style={{ fontSize:14, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:12 }}>EXPAND</div>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:10, background:P.surfaceBg, border:`1px solid ${P.border}`, borderRadius:8, marginBottom:8 }}>
          <div style={{ width:36, height:36, borderRadius:"8px 8px 16px 16px", background:P.panelBg, border:`1.5px solid ${P.border}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Droplet size={16} strokeWidth={1.5} color={P.ink}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>New Ink Well</div>
            <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{wellCount}/{MAX_WELLS} built</div>
          </div>
          {nextWellCost !== null ? (
            <button onClick={buyWell} style={{ padding:"6px 14px", background:collectedInk >= nextWellCost ? P.btnActiveBg : P.btnInactiveBg, color:collectedInk >= nextWellCost ? P.btnActiveText : P.btnInactiveText, border:"none", borderRadius:4, cursor:collectedInk >= nextWellCost ? "pointer" : "default", fontSize:11, fontFamily:"'Courier Prime',monospace" }}>
              {tutorialStep === 2 && wellCount === 0 ? "FREE — on the house" : `${fmt(nextWellCost)} ink`}
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
              {nextMgr ? nextMgr.flavor : `${wellMgrCount}/${wellMgrCount} managers`}
            </div>
          </div>
          {nextMgrCost !== null ? (
            <button onClick={buyWellManager} style={{ padding:"6px 14px", background:collectedInk >= nextMgrCost ? P.btnActiveBg : P.btnInactiveBg, color:collectedInk >= nextMgrCost ? P.btnActiveText : P.btnInactiveText, border:"none", borderRadius:4, cursor:collectedInk >= nextMgrCost ? "pointer" : "default", fontSize:11, fontFamily:"'Courier Prime',monospace" }}>
              {fmt(nextMgrCost)} ink
            </button>
          ) : wellMgrCount >= wellCount ? (
            <span style={{ fontSize:10, color:P.rose, fontFamily:"'Courier Prime',monospace" }}>need well first</span>
          ) : <span style={{ fontSize:10, color:P.sage, fontFamily:"'Courier Prime',monospace" }}>✓ maxed</span>}
        </div>
      </div>

      {/* Well Upgrades */}
      <div style={st.panel}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace", textTransform:"uppercase", letterSpacing:2 }}>Well Upgrades</div>
          <QtySelector qty={qty} onClick={() => setQty(cycleQty(qty, unlockedQtys))} />
        </div>
        {wells.map((_, wellIdx) => (
          <DeviceUpgradeCard key={wellIdx}
            deviceLabel={`Well ${wellIdx + 1}`}
            upgrades={WELL_UPGRADE_NAMES.map(n => UPGRADES_BY_NAME[n])}
            upgradeLevels={wellUpgradeLevels[wellIdx] || mkWellUpg()}
            qty={qty} collectedInk={collectedInk}
            onBuy={(upgrade, count, cost) => buyDeviceUpgrade("well", wellIdx, upgrade, count, cost)} />
        ))}
      </div>

      {/* Manager Upgrades */}
      {wellMgrCount > 0 && (
        <div style={st.panel}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace", textTransform:"uppercase", letterSpacing:2 }}>Manager Upgrades</div>
          </div>
          {Array.from({ length: wellMgrCount }, (_, mgrIdx) => (
            <DeviceUpgradeCard key={mgrIdx}
              deviceLabel={WELL_MANAGERS[mgrIdx].name}
              upgrades={MGR_UPGRADE_NAMES.map(n => UPGRADES_BY_NAME[n])}
              upgradeLevels={mgrUpgradeLevels[mgrIdx] || mkMgrUpg()}
              qty={qty} collectedInk={collectedInk}
              onBuy={(upgrade, count, cost) => buyDeviceUpgrade("manager", mgrIdx, upgrade, count, cost)} />
          ))}
        </div>
      )}
    </div>
  );
}
