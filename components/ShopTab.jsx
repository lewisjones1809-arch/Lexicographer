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

export function ShopTab({ quills, goldenNotebooks, ownedCovers, ownedPages, activeCoverId, activePageId, setActiveCoverId, setActivePageId, buyItem, showMsg, permUpgradeLevels, buyPermUpgrade, unlockedQtys = [1], currentUser, onShowAuth, onBuyIap, uiScale = 1 }) {
  const sc = n => Math.round(n * uiScale);
  const [shopTab, setShopTab] = useState("design");
  const [designTab, setDesignTab] = useState("covers");
  const [qty, setQty] = useState(1);
  const shopTabs = [
    { id:"upgrades", label:"Upgrades"    },
    { id:"design",   label:"Book Design" },
    { id:"boosts",   label:"Boosts"      },
  ];

  return (
    <div className="lex-tab-panel">
      <div style={{ marginBottom:4 }}>
        <div style={st.heading}>Shop</div>
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
            fontFamily:"'BLKCHCRY',serif", fontSize:sc(11),
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
            <div style={{ fontSize:sc(14), fontFamily:"'BLKCHCRY',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1 }}>Upgrades</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:sc(11), color:P.quill, fontFamily:"'Junicode',sans-serif", display:"flex", alignItems:"center", gap:3 }}><Feather size={sc(11)}/> {fmt(quills)}</div>
              {unlockedQtys.length > 1 && <QtySelector qty={qty} onClick={() => setQty(cycleQty(qty, unlockedQtys))} />}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {PERM_UPGRADES.map(upg => {
              const isLocked = upg.lockedIf?.({ permUpgradeLevels }) ?? false;
              const level = permUpgradeLevels[upg.id] || 0;
              const { maxed, cost, description, boxLabel } = getUpgCard(upg, level);
              const isFormula = !upg.levels;

              // Bulk-buy calculation
              const isMax = qty === "max";
              const bulk  = isFormula && !maxed && !isLocked ? calcBulkBuy(upg, level, quills, "max") : null;
              const fixed = isFormula && !maxed && !isLocked && !isMax ? calcQtyBuy(upg, level, qty) : null;
              // Levels-type max: greedily sum consecutive level costs until quills run out
              const levelsMax = !isFormula && isMax && !maxed && !isLocked && upg.levels ? (() => {
                let count = 0, total = 0, lvl = level;
                while (lvl < upg.maxLevel && total + upg.levels[lvl].cost <= quills) {
                  total += upg.levels[lvl].cost; count++; lvl++;
                }
                return { count, totalCost: total };
              })() : null;
              const purchaseCount = isFormula
                ? (isMax ? (bulk?.count ?? 0) : (fixed?.count ?? 0))
                : (isMax ? (levelsMax?.count ?? 1) : 1);
              const purchaseCost  = isFormula
                ? (isMax ? (bulk?.totalCost ?? 0) : (fixed?.totalCost ?? 0))
                : (isMax && levelsMax ? levelsMax.totalCost : cost);
              const displayCost   = isFormula
                ? ((isMax && bulk?.count === 0) ? Math.ceil(upg.costFormula(level)) : purchaseCost)
                : (isMax && levelsMax ? levelsMax.totalCost : cost);
              const canAfford = !maxed && !isLocked && (isFormula
                ? purchaseCount > 0 && quills >= purchaseCost
                : (isMax ? (levelsMax?.count ?? 0) > 0 : quills >= cost));

              return (
                <div key={upg.id} style={{
                  display:"flex", alignItems:"center", gap:12, padding:10,
                  background: maxed ? P.borderLight : P.surfaceBg,
                  border: `1px solid ${maxed ? P.border : P.borderLight}`,
                  borderRadius:8, transition:"all 0.2s",
                  opacity: isLocked ? 0.5 : 1,
                }}>
                  <div style={{
                    width:sc(36), height:sc(46), borderRadius:4, flexShrink:0,
                    background: maxed ? `${P.sage}22` : P.panelBg,
                    border: `1.5px solid ${maxed ? P.sage : P.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {(() => { const Icon = isLocked ? Lock : UPGRADE_ICONS[upg.id]; return Icon ? <Icon size={sc(18)} color={isLocked ? P.textMuted : maxed ? P.sage : P.textPrimary} /> : null; })()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:sc(13), color:P.textPrimary, fontFamily:"'BLKCHCRY',serif", fontWeight:600 }}>{upg.name}</div>
                    <div style={{ fontSize:sc(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>{isLocked ? upg.lockedLabel : description}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                    {!maxed && (
                      <div style={{ fontSize:sc(9), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>
                        {`${level}/${upg.maxLevel}`}
                      </div>
                    )}
                    {isLocked ? (
                      <span style={{ fontSize:sc(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>locked</span>
                    ) : maxed ? (
                      <div style={{
                        background:"#fdf5d0", border:`1px solid #dcc878`, borderRadius:4,
                        padding:"3px 10px", display:"flex", flexDirection:"column", alignItems:"center",
                      }}>
                        <div style={{ fontSize:sc(10), fontFamily:"'Junicode',sans-serif", fontWeight:700, color:P.textPrimary, lineHeight:1.2 }}>{boxLabel}</div>
                        <div style={{ fontSize:sc(7), fontFamily:"'Junicode',sans-serif", color:"#7a5800", lineHeight:1 }}>Max</div>
                      </div>
                    ) : (
                      <button onClick={() => canAfford && buyPermUpgrade(upg.id, purchaseCount, purchaseCost)} style={{
                        padding:"5px 12px", border:"none", borderRadius:4, cursor: canAfford ? "pointer" : "default",
                        background: canAfford ? P.btnActiveBg : P.btnInactiveBg,
                        color: canAfford ? P.btnActiveText : P.btnInactiveText,
                        fontSize:sc(10), fontFamily:"'Junicode',sans-serif", opacity: canAfford ? 1 : 0.5,
                      }}>
                        <Feather size={sc(9)} style={{ verticalAlign:"middle", marginRight:2 }}/>
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
        <div style={st.panel}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", gap:4 }}>
              {[{id:"covers", label:"Covers"}, {id:"pages", label:"Page Styles"}].map(dt => (
                <button key={dt.id} onClick={() => setDesignTab(dt.id)} style={{
                  padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer",
                  fontSize:sc(10), fontFamily:"'Junicode',sans-serif",
                  background: designTab === dt.id ? P.borderLight : "transparent",
                  color: designTab === dt.id ? P.textPrimary : P.textMuted,
                  fontWeight: designTab === dt.id ? 700 : 400,
                  transition:"all 0.15s",
                }}>{dt.label}</button>
              ))}
            </div>
            <div style={{ fontSize:sc(11), color:P.quill, fontFamily:"'Junicode',sans-serif", display:"flex", alignItems:"center", gap:3 }}>
              <BookMarked size={sc(11)}/> {goldenNotebooks}
            </div>
          </div>

          {designTab === "covers" && (
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
                    <div style={{ width:sc(36), height:sc(46), borderRadius:"2px 4px 4px 2px", background:c.color, border:`1.5px solid ${c.accent}60`, flexShrink:0 }}>
                      <div style={{ width:4, height:"100%", background:`${c.accent}20`, borderRight:`1px solid ${c.accent}25` }}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:sc(13), color:P.textPrimary, fontFamily:"'BLKCHCRY',serif", fontWeight:600 }}>{c.name}</div>
                      <div style={{ fontSize:sc(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>×{c.mult.toFixed(2)} bonus</div>
                    </div>
                    {owned ? (
                      active ? <span style={{ fontSize:sc(10), color:P.sage, fontFamily:"'Junicode',sans-serif" }}>✓ active</span>
                      : <button onClick={() => setActiveCoverId(c.id)} style={{ padding:"5px 12px", background:P.btnInactiveBg, border:"none", color:P.btnInactiveText, borderRadius:4, cursor:"pointer", fontSize:sc(10), fontFamily:"'Junicode',sans-serif" }}>Equip</button>
                    ) : (
                      <button onClick={() => buyItem("cover", c)} style={{ padding:"5px 12px", background:canAfford?P.btnActiveBg:P.btnInactiveBg, color:canAfford?P.btnActiveText:P.btnInactiveText, border:"none", borderRadius:4, cursor:canAfford?"pointer":"default", fontSize:sc(10), fontFamily:"'Junicode',sans-serif", opacity:canAfford?1:0.5 }}>
                        <BookMarked size={sc(9)} style={{verticalAlign:"middle", marginRight:2}}/>{c.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {designTab === "pages" && (
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
                    <div style={{ width:sc(36), height:sc(46), borderRadius:3, background:p.bg, border:`1.5px solid ${p.accent}60`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ fontSize:sc(8), color:p.text, fontFamily:"'Junicode',sans-serif", opacity:0.6 }}>Abc</div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:sc(13), color:P.textPrimary, fontFamily:"'BLKCHCRY',serif", fontWeight:600 }}>{p.name}</div>
                      <div style={{ fontSize:sc(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif" }}>×{p.mult.toFixed(2)} bonus</div>
                    </div>
                    {owned ? (
                      active ? <span style={{ fontSize:sc(10), color:P.sage, fontFamily:"'Junicode',sans-serif" }}>✓ active</span>
                      : <button onClick={() => setActivePageId(p.id)} style={{ padding:"5px 12px", background:P.btnInactiveBg, border:"none", color:P.btnInactiveText, borderRadius:4, cursor:"pointer", fontSize:sc(10), fontFamily:"'Junicode',sans-serif" }}>Equip</button>
                    ) : (
                      <button onClick={() => buyItem("page", p)} style={{ padding:"5px 12px", background:canAfford?P.btnActiveBg:P.btnInactiveBg, color:canAfford?P.btnActiveText:P.btnInactiveText, border:"none", borderRadius:4, cursor:canAfford?"pointer":"default", fontSize:sc(10), fontFamily:"'Junicode',sans-serif", opacity:canAfford?1:0.5 }}>
                        <BookMarked size={sc(9)} style={{verticalAlign:"middle", marginRight:2}}/>{p.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Instant Boosts */}
      {shopTab === "boosts" && (
        <div style={st.panel}>
          {/* TEST MODE NOTICE — remove before going live */}
          <div style={{ marginBottom:14, padding:"10px 14px", background:"#fffbeb", border:"1px solid #f59e0b", borderRadius:8, fontSize:11, fontFamily:"'Junicode',sans-serif", color:"#92400e", lineHeight:1.6 }}>
            <div style={{ fontWeight:700, marginBottom:4, fontSize:12 }}>⚠ TEST MODE — do not use a real card</div>
            Use the following test card details when prompted:<br/>
            <span style={{ fontWeight:700 }}>Card: 4242 4242 4242 4242</span> &nbsp;|&nbsp; <span style={{ fontWeight:700 }}>Expiry: 12/34</span> &nbsp;|&nbsp; <span style={{ fontWeight:700 }}>CVC: 123</span><br/>
            Any name and billing address will work. No real payment will be taken.
          </div>
          <div style={{ fontSize:sc(14), fontFamily:"'BLKCHCRY',serif", color:P.textPrimary, fontWeight:700, letterSpacing:1, marginBottom:12 }}>Boosts & Bundles</div>
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
                  <div style={{ fontSize:sc(22), width:sc(36), textAlign:"center", flexShrink:0 }}>{product.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:sc(13), color:P.textPrimary, fontFamily:"'BLKCHCRY',serif", fontWeight:600 }}>{product.name}</div>
                    <div style={{ fontSize:sc(10), color:P.textMuted, fontFamily:"'Junicode',sans-serif", lineHeight:1.4 }}>{product.desc}</div>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {alreadyOwned
                      ? <span style={{ fontSize:sc(10), color:P.sage, fontFamily:"'Junicode',sans-serif" }}>✓ owned</span>
                      : <button onClick={() => currentUser ? onBuyIap(product.id) : onShowAuth()} style={{
                          padding:"5px 10px", border:"none", borderRadius:4, cursor:"pointer",
                          background: currentUser ? P.btnActiveBg : P.btnInactiveBg,
                          color: currentUser ? P.btnActiveText : P.btnInactiveText,
                          fontSize:sc(10), fontFamily:"'Junicode',sans-serif",
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
