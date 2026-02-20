import { useState } from "react";
import { FeatherIcon as Feather, CaseUpperIcon as CaseUpper, DropletIcon as Droplet, BookMarkedIcon as BookMarked } from "../assets/icons";
import { HandCoins, Keyboard, Brain, Zap, Lock, Sparkles, Layers } from "lucide-react";
import { P, st } from "../styles.js";
import { IAP_PRODUCTS } from "../constants.js";

const UPGRADE_ICONS = {
  bulk_buying:        HandCoins,
  max_letters:        CaseUpper,
  ink_multiplier:     Droplet,
  monkey_typewriter:  Keyboard,
  monkey_intuition:   Brain,
  monkey_efficiency:  Zap,
  monkey_tile_chance: Sparkles,
  monkey_tile_limit:  Layers,
};
import { COVERS, PAGE_STYLES } from "../constants.js";
import { fmt } from "../gameUtils.js";
import { PERM_UPGRADES } from "../permanentUpgrades.js";
import { QtySelector } from "./DeviceCards.jsx";
import { calcBulkBuy, calcQtyBuy, cycleQty } from "../upgradeUtils.js";

function getUpgCard(upg, level) {
  const maxed = level >= upg.maxLevel;
  if (upg.levels) {
    const entry = upg.levels[maxed ? upg.maxLevel - 1 : level];
    let boxLabel;
    if (entry.boxLabel != null) {
      boxLabel = entry.boxLabel;
    } else {
      const qty = entry.unlocksQty;
      boxLabel = qty === "max" ? "Max" : `×${qty}`;
    }
    return { maxed, cost: entry.cost, boxLabel, description: entry.label };
  }
  return {
    maxed,
    cost: maxed ? 0 : upg.costFormula(level),
    boxLabel: upg.boxLabel(level),
    description: maxed ? upg.maxedLabel : upg.nextLabel(level),
  };
}

export function ShopTab({ quills, goldenNotebooks, ownedCovers, ownedPages, activeCoverId, activePageId, setActiveCoverId, setActivePageId, buyItem, showMsg, permUpgradeLevels, buyPermUpgrade, unlockedQtys = [1], currentUser, onShowAuth, onBuyIap }) {
  const [shopTab, setShopTab] = useState("design");
  const [qty, setQty] = useState(1);
  const shopTabs = [
    { id:"upgrades", label:"Upgrades"    },
    { id:"design",   label:"Book Design" },
    { id:"boosts",   label:"Boosts"      },
  ];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
        <div style={st.heading}>Shop</div>
        <div style={{ fontSize:12, color:P.quill, fontFamily:"'Playfair Display',serif", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><Feather size={12}/> {fmt(quills)}</div>
      </div>
      <div style={{ ...st.sub, marginBottom:12 }}>Unlock permanent upgrades!</div>

      {/* Shop sub-tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:16 }}>
        {shopTabs.map(tab => (
          <button key={tab.id} onClick={() => setShopTab(tab.id)} style={{
            flex:1, padding:"10px 6px",
            background: shopTab === tab.id ? P.borderLight : "transparent",
            border: shopTab === tab.id ? `1px solid ${P.border}` : `1px solid transparent`,
            borderRadius:8, cursor:"pointer", transition:"all 0.2s",
            fontFamily:"'Playfair Display',serif", fontSize:11,
            fontWeight: shopTab === tab.id ? 700 : 400,
            color: shopTab === tab.id ? P.textPrimary : P.textMuted,
            letterSpacing:0.3
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Quill Upgrades */}
      {shopTab === "upgrades" && (
        <div style={st.panel}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:14, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1 }}>UPGRADES</div>
            {unlockedQtys.length > 1 && <QtySelector qty={qty} onClick={() => setQty(cycleQty(qty, unlockedQtys))} />}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {PERM_UPGRADES.map(upg => {
              const isLocked = upg.lockedIf?.({ permUpgradeLevels }) ?? false;
              const level = permUpgradeLevels[upg.id] || 0;
              const { maxed, cost, description } = getUpgCard(upg, level);
              const isFormula = !upg.levels;

              // Bulk-buy calculation for formula-based upgrades
              const isMax = qty === "max";
              const bulk  = isFormula && !maxed && !isLocked ? calcBulkBuy(upg, level, quills, "max") : null;
              const fixed = isFormula && !maxed && !isLocked && !isMax ? calcQtyBuy(upg, level, qty) : null;
              const purchaseCount = isFormula ? (isMax ? (bulk?.count ?? 0) : (fixed?.count ?? 0)) : 1;
              const purchaseCost  = isFormula ? (isMax ? (bulk?.totalCost ?? 0) : (fixed?.totalCost ?? 0)) : cost;
              const displayCost   = isFormula
                ? ((isMax && bulk?.count === 0) ? Math.ceil(upg.costFormula(level)) : purchaseCost)
                : cost;
              const canAfford = !maxed && !isLocked && (isFormula
                ? purchaseCount > 0 && quills >= purchaseCost
                : quills >= cost);

              return (
                <div key={upg.id} style={{
                  display:"flex", alignItems:"center", gap:12, padding:10,
                  background: maxed ? P.borderLight : P.surfaceBg,
                  border: `1px solid ${maxed ? P.border : P.borderLight}`,
                  borderRadius:8, transition:"all 0.2s",
                  opacity: isLocked ? 0.5 : 1,
                }}>
                  <div style={{
                    width:36, height:46, borderRadius:4, flexShrink:0,
                    background: maxed ? `${P.sage}22` : P.panelBg,
                    border: `1.5px solid ${maxed ? P.sage : P.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {(() => { const Icon = isLocked ? Lock : UPGRADE_ICONS[upg.id]; return Icon ? <Icon size={18} color={isLocked ? P.textMuted : maxed ? P.sage : P.textPrimary} /> : null; })()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>{upg.name}</div>
                    <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>{isLocked ? upg.lockedLabel : description}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                    <div style={{ fontSize:9, color: maxed ? P.sage : P.textMuted, fontFamily:"'Courier Prime',monospace" }}>
                      {maxed ? "MAX" : `${level}/${upg.maxLevel}`}
                    </div>
                    {isLocked ? (
                      <span style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>locked</span>
                    ) : maxed ? (
                      <span style={{ fontSize:10, color:P.sage, fontFamily:"'Courier Prime',monospace" }}>✓ owned</span>
                    ) : (
                      <button onClick={() => canAfford && buyPermUpgrade(upg.id, purchaseCount, purchaseCost)} style={{
                        padding:"5px 12px", border:"none", borderRadius:4, cursor: canAfford ? "pointer" : "default",
                        background: canAfford ? P.btnActiveBg : P.btnInactiveBg,
                        color: canAfford ? P.btnActiveText : P.btnInactiveText,
                        fontSize:10, fontFamily:"'Courier Prime',monospace", opacity: canAfford ? 1 : 0.5,
                      }}>
                        <Feather size={9} style={{ verticalAlign:"middle", marginRight:2 }}/>
                        {fmt(displayCost)}{isFormula && purchaseCount > 1 ? ` ×${purchaseCount}` : ""}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Book Design */}
      {shopTab === "design" && (
        <div>
          {/* Covers */}
          <div style={st.panel}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:14, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1 }}>COVERS</div>
              <div style={{ fontSize:11, color:P.quill, fontFamily:"'Courier Prime',monospace", display:"flex", alignItems:"center", gap:3 }}><BookMarked size={11}/> {goldenNotebooks}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {COVERS.filter(c => !c.premiumOnly || ownedCovers.includes(c.id)).map(c => {
                const owned = ownedCovers.includes(c.id);
                const active = activeCoverId === c.id;
                const canAfford = goldenNotebooks >= c.cost;
                return (
                  <div key={c.id} style={{
                    display:"flex", alignItems:"center", gap:12, padding:10,
                    background: active ? P.borderLight : P.surfaceBg,
                    border: active ? `1px solid ${P.border}` : `1px solid ${P.borderLight}`,
                    borderRadius:8, transition:"all 0.2s"
                  }}>
                    <div style={{ width:36, height:46, borderRadius:"2px 4px 4px 2px", background:c.color, border:`1.5px solid ${c.accent}60`, flexShrink:0 }}>
                      <div style={{ width:4, height:"100%", background:`${c.accent}20`, borderRight:`1px solid ${c.accent}25` }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>{c.name}</div>
                      <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>×{c.mult.toFixed(2)} bonus</div>
                    </div>
                    {owned ? (
                      active ? <span style={{ fontSize:10, color:P.sage, fontFamily:"'Courier Prime',monospace" }}>✓ active</span>
                      : <button onClick={() => setActiveCoverId(c.id)} style={{ padding:"5px 12px", background:P.btnInactiveBg, border:"none", color:P.btnInactiveText, borderRadius:4, cursor:"pointer", fontSize:10, fontFamily:"'Courier Prime',monospace" }}>Equip</button>
                    ) : (
                      <button onClick={() => buyItem("cover", c)} style={{ padding:"5px 12px", background:canAfford?P.btnActiveBg:P.btnInactiveBg, color:canAfford?P.btnActiveText:P.btnInactiveText, border:"none", borderRadius:4, cursor:canAfford?"pointer":"default", fontSize:10, fontFamily:"'Courier Prime',monospace", opacity:canAfford?1:0.5 }}>
                        <BookMarked size={9} style={{verticalAlign:"middle", marginRight:2}}/>{c.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Page styles */}
          <div style={st.panel}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:14, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1 }}>PAGE STYLES</div>
              <div style={{ fontSize:11, color:P.quill, fontFamily:"'Courier Prime',monospace", display:"flex", alignItems:"center", gap:3 }}><BookMarked size={11}/> {goldenNotebooks}</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {PAGE_STYLES.filter(p => !p.premiumOnly || ownedPages.includes(p.id)).map(p => {
                const owned = ownedPages.includes(p.id);
                const active = activePageId === p.id;
                const canAfford = goldenNotebooks >= p.cost;
                return (
                  <div key={p.id} style={{
                    display:"flex", alignItems:"center", gap:12, padding:10,
                    background: active ? P.borderLight : P.surfaceBg,
                    border: active ? `1px solid ${P.border}` : `1px solid ${P.borderLight}`,
                    borderRadius:8, transition:"all 0.2s"
                  }}>
                    <div style={{ width:36, height:46, borderRadius:3, background:p.bg, border:`1.5px solid ${p.accent}60`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ fontSize:8, color:p.text, fontFamily:"'Courier Prime',monospace", opacity:0.6 }}>Abc</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>{p.name}</div>
                      <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace" }}>×{p.mult.toFixed(2)} bonus</div>
                    </div>
                    {owned ? (
                      active ? <span style={{ fontSize:10, color:P.sage, fontFamily:"'Courier Prime',monospace" }}>✓ active</span>
                      : <button onClick={() => setActivePageId(p.id)} style={{ padding:"5px 12px", background:P.btnInactiveBg, border:"none", color:P.btnInactiveText, borderRadius:4, cursor:"pointer", fontSize:10, fontFamily:"'Courier Prime',monospace" }}>Equip</button>
                    ) : (
                      <button onClick={() => buyItem("page", p)} style={{ padding:"5px 12px", background:canAfford?P.btnActiveBg:P.btnInactiveBg, color:canAfford?P.btnActiveText:P.btnInactiveText, border:"none", borderRadius:4, cursor:canAfford?"pointer":"default", fontSize:10, fontFamily:"'Courier Prime',monospace", opacity:canAfford?1:0.5 }}>
                        <BookMarked size={9} style={{verticalAlign:"middle", marginRight:2}}/>{p.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Instant Boosts */}
      {shopTab === "boosts" && (
        <div style={st.panel}>
          {/* TEST MODE NOTICE — remove before going live */}
          <div style={{ marginBottom:14, padding:"10px 14px", background:"#fffbeb", border:"1px solid #f59e0b", borderRadius:8, fontSize:11, fontFamily:"'Courier Prime',monospace", color:"#92400e", lineHeight:1.6 }}>
            <div style={{ fontWeight:700, marginBottom:4, fontSize:12 }}>⚠ TEST MODE — do not use a real card</div>
            Use the following test card details when prompted:<br/>
            <span style={{ fontWeight:700 }}>Card: 4242 4242 4242 4242</span> &nbsp;|&nbsp; <span style={{ fontWeight:700 }}>Expiry: 12/34</span> &nbsp;|&nbsp; <span style={{ fontWeight:700 }}>CVC: 123</span><br/>
            Any name and billing address will work. No real payment will be taken.
          </div>
          <div style={{ fontSize:14, fontFamily:"'Playfair Display',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:12 }}>BOOSTS & BUNDLES</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {IAP_PRODUCTS.map(product => {
              const isPremiumCosmetic = product.id === "premium_cosmetics";
              const alreadyOwned = isPremiumCosmetic && ownedCovers.includes("obsidian") && ownedPages.includes("gilded_folio");
              return (
                <div key={product.id} style={{
                  display:"flex", alignItems:"center", gap:12, padding:10,
                  background: alreadyOwned ? P.borderLight : P.surfaceBg,
                  border: `1px solid ${alreadyOwned ? P.border : P.borderLight}`,
                  borderRadius:8,
                }}>
                  <div style={{ fontSize:22, width:36, textAlign:"center", flexShrink:0 }}>{product.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:P.textPrimary, fontFamily:"'Playfair Display',serif", fontWeight:600 }}>{product.name}</div>
                    <div style={{ fontSize:10, color:P.textMuted, fontFamily:"'Courier Prime',monospace", lineHeight:1.4 }}>{product.desc}</div>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {alreadyOwned
                      ? <span style={{ fontSize:10, color:P.sage, fontFamily:"'Courier Prime',monospace" }}>✓ owned</span>
                      : <button onClick={() => currentUser ? onBuyIap(product.id) : onShowAuth()} style={{
                          padding:"5px 10px", border:"none", borderRadius:4, cursor:"pointer",
                          background: currentUser ? P.btnActiveBg : P.btnInactiveBg,
                          color: currentUser ? P.btnActiveText : P.btnInactiveText,
                          fontSize:10, fontFamily:"'Courier Prime',monospace",
                        }}>
                          {product.price}
                        </button>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
