// ============================================================
//  ShopScreen.jsx
//  Spend gold on cards (type-filtered per creature), relics,
//  and party heals. Leave when done.
// ============================================================

import { useState } from "react";
import { CardTooltip as ShopCardTooltip } from "./CardTooltip.jsx";
import { useIsMobile } from "./useMediaQuery.js";
import { useRun, RunActions } from "./RunContext.jsx";
import { CARD_DEFS, getDraftPool } from "./cardDefs.js";
import { RARITY_COLOR, TYPE_COLORS, TYPE_SHAPES, effectiveDamage, effectiveHeal, effectiveShield, liveDesc, shuffle, statMod } from "./shared.js";

// ─── CONSTANTS ───────────────────────────────────────────────

// Card costs scale by rarity
const CARD_COSTS = { common: 30, uncommon: 55, rare: 90, legendary: 150 };

// Placeholder relics for the shop
const SHOP_RELICS = [
  { id:"ember_core",    name:"Ember Core",    desc:"Fire cards deal +2 damage.",           cost:70,  type:"fire"   },
  { id:"tide_stone",    name:"Tide Stone",    desc:"Start each combat with 2 Flow.",        cost:70,  type:"water"  },
  { id:"iron_shell",    name:"Iron Shell",    desc:"Start each combat with 3 Fortify.",     cost:70,  type:"earth"  },
  { id:"gale_feather",  name:"Gale Feather",  desc:"Draw 1 extra card on turn start.",      cost:85,  type:"wind"   },
  { id:"void_shard",    name:"Void Shard",    desc:"Drain heals for +1 HP extra per hit.",  cost:85,  type:"shadow" },
  { id:"dawn_crystal",  name:"Dawn Crystal",  desc:"Gain 1 Radiance at combat start.",      cost:70,  type:"light"  },
  { id:"lucky_coin",    name:"Lucky Coin",    desc:"Gain 10 gold after every combat.",      cost:55,  type:"colorless" },
  { id:"sharp_claw",    name:"Sharp Claw",    desc:"+1 to all attack hit rolls.",           cost:75,  type:"colorless" },
];

// ─── HELPERS ─────────────────────────────────────────────────

// Build a shop stock once on mount
function buildShopStock(party, floorNumber) {
  // Gather all draftable cards across the party, deduplicated
  const allDraftable = [];
  party.forEach(creature => {
    const pool = getDraftPool(creature);
    pool.forEach(card => {
      if (!allDraftable.find(c => c.id === card.id)) allDraftable.push(card);
    });
  });

  // Weight toward rarer cards on higher floors
  const rarityPool = floorNumber <= 2
    ? [...allDraftable.filter(c => c.rarity === "common"),
       ...allDraftable.filter(c => c.rarity === "uncommon").slice(0, 4)]
    : floorNumber <= 4
    ? [...allDraftable.filter(c => c.rarity === "uncommon"),
       ...allDraftable.filter(c => c.rarity === "rare").slice(0, 3)]
    : [...allDraftable.filter(c => c.rarity === "uncommon").slice(0, 3),
       ...allDraftable.filter(c => c.rarity === "rare"),
       ...allDraftable.filter(c => c.rarity === "legendary").slice(0, 2)];

  return shuffle(rarityPool).slice(0, 6);
}

// ─── COMPONENTS ──────────────────────────────────────────────

function GoldBar({ gold }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:8,
      background:"#1e1800", border:"2px solid #806020",
      borderRadius:7, padding:"8px 14px",
    }}>
      <span style={{ fontSize:18, lineHeight:1 }}>¥</span>
      <span style={{ fontSize:16, fontWeight:900, color:"#F8D030", letterSpacing:"0.04em" }}>
        {gold}
      </span>
      <span style={{ fontSize:13, color:"#B09870", letterSpacing:"0.08em" }}>GOLD</span>
    </div>
  );
}

function ShopCard({ card, creature, onBuy, bought, canAfford, onHoverCard }) {
  const col      = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
  const cost     = CARD_COSTS[card.rarity] ?? 50;
  const isAttack = card.tags.includes("attack");
  const isDefend = card.tags.includes("defend");
  const legal    = creature
    ? (card.type === creature.type || card.type === "colorless") && card.levelRequired <= creature.level
    : false;
  const disabled = bought || !canAfford || !legal || !creature;
  const cardCol  = col;

  return (
    <div
      className="deck-card"
      onMouseEnter={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        onHoverCard?.({ card, cardCol, isAttack, isDefend,
          x: rect.left + rect.width / 2, y: rect.top });
      }}
      onMouseLeave={() => onHoverCard?.(null)}
      style={{
        position:"relative", width:88, height: bought ? 108 : 148,
        background: `linear-gradient(160deg, ${disabled ? "#1a1a12" : "#FFFEF8"} 0%, ${disabled ? "#141410" : "#F8F4E8"} 100%)`,
        border: `2px solid ${bought ? "#504838" : disabled ? "#504838" : cardCol.mid}`,
        borderRadius:9,
        padding:"7px 7px 6px",
        boxSizing:"border-box",
        overflow:"visible",
        flexShrink:0,
        opacity: disabled ? 0.45 : 1,
        boxShadow: disabled ? "none" :
          `0 4px 12px rgba(0,0,0,0.3), 0 2px 0 ${cardCol.dark}, inset 0 1px 0 rgba(255,255,255,0.8)`,
        fontFamily:"'Courier New', monospace",
        cursor: disabled ? "default" : "pointer",
        transition:"opacity 0.15s",
      }}
    >
      {/* Price badge top-right */}
      <div style={{
        position:"absolute", top:-9, right:-9,
        background: bought ? "#504838" : canAfford && legal && creature ? "#C89010" : "#2a2018",
        color: bought ? "#807858" : canAfford && legal && creature ? "#fff" : "#806040",
        border: `2px solid ${bought ? "#706040" : canAfford && legal && creature ? "#7A5800" : "#504030"}`,
        borderRadius:"50%", width:28, height:28,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize: bought ? 14 : 10, fontWeight:900, zIndex:2,
      }}>
        {bought ? "✓" : `¥${cost}`}
      </div>

      {/* Energy cost pip top-left */}
      <div style={{
        position:"absolute", top:4, left:4,
        width:15, height:15, borderRadius:"50%",
        background: card.energyCost===0 ? "#C8C0A8" : cardCol.mid,
        color:"#fff", fontSize:10, fontWeight:900,
        display:"flex", alignItems:"center", justifyContent:"center",
        border: `1.5px solid ${cardCol.dark}`,
        lineHeight:1, zIndex:2,
      }}>{card.energyCost}</div>

      {/* Type stripe */}
      <div style={{
        height:3, borderRadius:2, marginBottom:5, marginTop:2,
        background: `linear-gradient(to right,${cardCol.light},${cardCol.mid})`,
        opacity: disabled ? 0.4 : 1,
      }} />

      {/* Type silhouette */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
        <svg width={28} height={28} viewBox="0 0 100 100">
          <path d={TYPE_SHAPES[card.type]||TYPE_SHAPES.colorless}
            fill={disabled ? "#605040" : cardCol.mid} opacity={0.65}/>
        </svg>
      </div>

      {/* Card name */}
      <div style={{
        fontSize:8, fontWeight:900, color: disabled ? "#706050" : "#302810",
        textAlign:"center", lineHeight:1.2, marginBottom:3, letterSpacing:"0.01em",
      }}>
        {card.name.toUpperCase()}
      </div>

      {/* Badge row */}
      <div style={{ textAlign:"center", marginBottom:4, display:"flex", justifyContent:"center", gap:3 }}>
        <span style={{
          fontSize:7, fontWeight:900, padding:"1px 4px", borderRadius:2,
          background: disabled ? "#504838" : isAttack ? "#F09030" : isDefend ? "#5878F0" : "#58A838",
          color:"#fff", letterSpacing:"0.04em",
        }}>
          {isAttack ? "ATK" : isDefend ? "DEF" : "UTL"}
        </span>
        {!legal && creature && (
          <span style={{ fontSize:7, color:"#E05050", fontWeight:900 }}>🔒</span>
        )}
      </div>

      {/* Description */}
      <div style={{
        fontSize:7, color: disabled ? "#806050" : "#A09070", lineHeight:1.25,
        textAlign:"center",
        borderTop: `1px solid ${disabled ? "#30281833" : cardCol.mid + "33"}`,
        paddingTop:3,
        overflow:"hidden",
        display:"-webkit-box",
        WebkitLineClamp:2,
        WebkitBoxOrient:"vertical",
      }}>
        {liveDesc(card, creature)}
      </div>

      {/* Buy button */}
      {!bought && !disabled && (
        <button
          onClick={onBuy}
          style={{
            width:"100%", marginTop:6,
            fontFamily:"'Courier New', monospace",
            fontSize:10, fontWeight:900,
            background:"#C89010", color:"#fff",
            border:"2px solid #7A5800", borderRadius:4,
            padding:"3px 0", cursor:"pointer",
            letterSpacing:"0.06em",
            boxShadow:"0 2px 0 #7A5800",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(2px)"}
          onMouseUp={e => e.currentTarget.style.transform="none"}
          onMouseLeave={e => e.currentTarget.style.transform="none"}
        >
          BUY
        </button>
      )}
    </div>
  );
}

function RelicCard({ relic, onBuy, bought, canAfford, owned }) {
  const col = TYPE_COLORS[relic.type] || TYPE_COLORS.colorless;
  const disabled = bought || !canAfford || owned;

  return (
    <div style={{
      background: disabled ? "#141410" : "#1a1410",
      border:`2px solid ${owned ? "#806854" : disabled ? "#706040" : col.mid + "55"}`,
      borderRadius:8, padding:"12px 12px 10px",
      opacity: disabled ? 0.4 : 1,
      fontFamily:"'Courier New', monospace",
      minWidth:140, flex:1,
      position:"relative",
      transition:"all 0.15s",
    }}>
      {/* Cost */}
      <div style={{
        position:"absolute", top:-9, right:-9,
        background: owned || bought ? "#706040" : canAfford ? "#C89010" : "#2a2018",
        color: owned || bought ? "#907858" : canAfford ? "#fff" : "#B09870",
        border:`2px solid ${owned || bought ? "#806854" : canAfford ? "#604000" : "#806854"}`,
        borderRadius:"50%", width:30, height:30,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:12, fontWeight:900,
      }}>
        {owned || bought ? "✓" : `¥${relic.cost}`}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:col.mid, flexShrink:0 }} />
        <span style={{ fontSize:11, fontWeight:900, color:"#E8E8D0" }}>{relic.name}</span>
      </div>
      <p style={{ fontSize:13, color:"#807860", lineHeight:1.55, margin:"0 0 8px" }}>
        {relic.desc}
      </p>

      {!disabled && (
        <button
          onClick={onBuy}
          style={{
            width:"100%",
            fontFamily:"'Courier New', monospace",
            fontSize:13, fontWeight:900,
            background:"#C89010", color:"#fff",
            border:"2px solid #604000", borderRadius:4,
            padding:"5px 0", cursor:"pointer",
            letterSpacing:"0.08em",
            boxShadow:"0 2px 0 #604000",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(2px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(2px)"}
          onMouseUp={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"}
          onMouseLeave={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"}
        >
          BUY RELIC
        </button>
      )}
    </div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

// ─── DECK-CARD ANIMATION (matches party screen) ──────────────
const SHOP_CARD_STYLE = `
  @keyframes deckCardBob {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-4px); }
  }
  .deck-card {
    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                box-shadow 0.18s ease, border-color 0.15s ease;
    animation: deckCardBob 3s ease-in-out infinite;
  }
  .deck-card:hover {
    transform: translateY(-10px) scale(1.08) !important;
    animation: none !important;
    z-index: 10;
  }
`;

export default function ShopScreen() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const isMobile = useIsMobile();
  const { run, dispatch } = useRun();
  const { party, gold, relics, map } = run;
  const floorNumber = map?.floorNumber ?? 1;



  // Build stock once on mount
  const [stock] = useState(() => buildShopStock(party, floorNumber));
  const [relicStock] = useState(() => shuffle(SHOP_RELICS).slice(0, 3));
  const [boughtCards,  setBoughtCards]  = useState(new Set());
  const [boughtRelics, setBoughtRelics] = useState(new Set());
  const [activeTab, setActiveTab]       = useState("cards"); // "cards" | "relics" | "heal"
  const [selectedCreature, setSelectedCreature] = useState(0); // which party member to buy cards for

  const HEAL_COST = 30;
  const healedAlready = false; // could track with useState if needed

  function buyCard(card) {
    const cost = CARD_COSTS[card.rarity] ?? 50;
    if (gold < cost) return;
    dispatch(RunActions.buyCard(card.id, selectedCreature, cost));
    setBoughtCards(prev => new Set([...prev, card.id]));
  }

  function buyRelic(relic) {
    if (gold < relic.cost || relics.includes(relic.id)) return;
    dispatch(RunActions.buyRelic(relic.id, relic.cost));
    setBoughtRelics(prev => new Set([...prev, relic.id]));
  }

  function buyHeal() {
    if (gold < HEAL_COST) return;
    dispatch(RunActions.buyHeal(HEAL_COST));
  }

  const activeCreature = party[selectedCreature];

  return (
    <>
      <style>{SHOP_CARD_STYLE}</style>
      <div style={{
      minHeight:"100vh",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      display:"flex", flexDirection:"column",
    }}>

      {/* ── Header ── */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"12px 20px",
        background:"#1a1a10", borderBottom:"2px solid #302818",
        flexWrap:"wrap", gap:10,
      }}>
        <div>
          <div style={{ fontSize:16, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.08em" }}>
            $ ITEM SHOP
          </div>
          <div style={{ fontSize:13, color:"#A08868", letterSpacing:"0.08em", marginTop:2 }}>
            Floor {floorNumber} · Spend wisely
          </div>
        </div>
        <GoldBar gold={gold} />
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display:"flex",
        background:"#141410", borderBottom:"2px solid #252514",
      }}>
        {[
          { key:"cards",  label:"CARDS"  },
          { key:"relics", label:"RELICS" },
          { key:"heal",   label:"HEAL"   },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontFamily:"'Courier New', monospace",
              fontSize:10, fontWeight:900,
              padding:"10px 20px",
              background:"transparent",
              color: activeTab === tab.key ? "#E8E8D0" : "#A08868",
              border:"none",
              borderBottom: activeTab === tab.key ? "3px solid #C89010" : "3px solid transparent",
              cursor:"pointer", letterSpacing:"0.1em",
              transition:"all 0.1s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>

        {/* ── CARDS TAB ── */}
        {activeTab === "cards" && (
          <div>
            {/* Creature selector */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#907858", letterSpacing:"0.1em", marginBottom:8 }}>
                BUYING FOR
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {party.map((c, i) => {
                  const col = TYPE_COLORS[c.type] || TYPE_COLORS.colorless;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedCreature(i)}
                      style={{
                        fontFamily:"'Courier New', monospace",
                        fontSize:10, fontWeight:900,
                        padding:"6px 14px",
                        background: selectedCreature === i ? col.mid : "#1a1a10",
                        color: selectedCreature === i ? "#fff" : col.light,
                        border:`2px solid ${selectedCreature === i ? col.mid : col.mid + "44"}`,
                        borderRadius:5, cursor:"pointer",
                        letterSpacing:"0.06em",
                        transition:"all 0.1s",
                      }}
                    >
                      {c.name} <span style={{ opacity:0.7, fontWeight:400 }}>Lv{c.level}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card grid */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {stock.map(card => (
                <ShopCard
                  key={card.id}
                  onHoverCard={setHoveredCard}
                  card={card}
                  creature={activeCreature}
                  onBuy={() => buyCard(card)}
                  bought={boughtCards.has(card.id)}
                  canAfford={gold >= (CARD_COSTS[card.rarity] ?? 50)}
                />
              ))}
              {stock.length === 0 && (
                <p style={{ fontSize:10, color:"#907858", letterSpacing:"0.08em" }}>
                  No cards available for your current party.
                </p>
              )}
            </div>

            <div style={{ marginTop:12, fontSize:12, color:"#907858", letterSpacing:"0.06em" }}>
              Cards marked LOCKED cannot be used by the selected creature (wrong type or level too high).
              Switch creatures above to see their available cards.
            </div>
          </div>
        )}

        {/* ── RELICS TAB ── */}
        {activeTab === "relics" && (
          <div>
            <div style={{ fontSize:12, color:"#907858", letterSpacing:"0.1em", marginBottom:12 }}>
              RELICS — passive effects that last the entire run
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {relicStock.map(relic => (
                <RelicCard
                  key={relic.id}
                  relic={relic}
                  onBuy={() => buyRelic(relic)}
                  bought={boughtRelics.has(relic.id)}
                  canAfford={gold >= relic.cost}
                  owned={relics.includes(relic.id)}
                />
              ))}
            </div>
            {relics.length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:12, color:"#907858", letterSpacing:"0.1em", marginBottom:8 }}>
                  YOUR RELICS
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {relics.map(id => {
                    const r = SHOP_RELICS.find(r => r.id === id);
                    if (!r) return null;
                    const col = TYPE_COLORS[r.type] || TYPE_COLORS.colorless;
                    return (
                      <span key={id} style={{
                        fontSize:13, padding:"3px 10px",
                        background: col.mid + "22", color: col.light,
                        border:`1px solid ${col.mid}44`,
                        borderRadius:4, letterSpacing:"0.06em",
                      }}>
                        ✦ {r.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HEAL TAB ── */}
        {activeTab === "heal" && (
          <div>
            <div style={{ fontSize:12, color:"#907858", letterSpacing:"0.1em", marginBottom:12 }}>
              HEALING SERVICES
            </div>

            {/* Party HP overview */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
              {party.map((c, i) => {
                const pct    = Math.round((c.currentHp / c.maxHp) * 100);
                const hpCol  = pct > 50 ? "#40C850" : pct > 20 ? "#F8D030" : "#F85840";
                const typeCol = TYPE_COLORS[c.type]?.mid || "#888";
                return (
                  <div key={i} style={{
                    background:"#1a1a10", border:`2px solid ${typeCol}44`,
                    borderRadius:7, padding:"8px 12px", minWidth:120,
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:10, fontWeight:900, color:"#E8E8D0" }}>{c.name}</span>
                      <span style={{ fontSize:13, color:typeCol }}>Lv{c.level}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:12, fontWeight:900, color:"#38A018", minWidth:14 }}>HP</span>
                      <div style={{ flex:1, height:6, background:"#806854", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:hpCol, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:12, color:"#B09870" }}>{c.currentHp}/{c.maxHp}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Heal option */}
            <div style={{
              background:"#1a1a10",
              border:`2px solid ${gold >= HEAL_COST ? "#406020" : "#706040"}`,
              borderRadius:8, padding:"16px",
              maxWidth:480, width:"100%",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:900, color:"#E8E8D0" }}>Party Heal</span>
                <span style={{
                  fontSize:12, fontWeight:900,
                  color: gold >= HEAL_COST ? "#F8D030" : "#603030",
                }}>¥{HEAL_COST}</span>
              </div>
              <p style={{ fontSize:13, color:"#807860", lineHeight:1.6, margin:"0 0 12px" }}>
                Restore 30% of max HP to all party members.
              </p>
              <button
                onClick={buyHeal}
                disabled={gold < HEAL_COST}
                style={{
                  width:"100%",
                  fontFamily:"'Courier New', monospace",
                  fontSize:11, fontWeight:900,
                  background: gold >= HEAL_COST ? "#38A018" : "#706040",
                  color: gold >= HEAL_COST ? "#fff" : "#907858",
                  border:`3px solid ${gold >= HEAL_COST ? "#185808" : "#806854"}`,
                  borderRadius:5, padding:"8px 0",
                  cursor: gold >= HEAL_COST ? "pointer" : "not-allowed",
                  letterSpacing:"0.1em",
                  boxShadow: gold >= HEAL_COST ? "0 3px 0 #185808" : "none",
                  transition:"all 0.1s",
                }}
                onMouseDown={e => gold >= HEAL_COST && (e.currentTarget.style.transform="translateY(3px)")}
                onMouseUp={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"}
                onMouseLeave={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"}
              >
                {gold >= HEAL_COST ? "HEAL PARTY ♥" : "NOT ENOUGH GOLD"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer: Leave ── */}
      <div style={{
        padding:"14px 20px",
        background:"#141410", borderTop:"2px solid #252514",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <span style={{ fontSize:13, color:"#907858", letterSpacing:"0.06em" }}>
          You can leave at any time. Items don't restock.
        </span>
        <button
          onClick={() => dispatch(RunActions.leaveShop())}
          style={{
            fontFamily:"'Courier New', monospace",
            fontSize:12, fontWeight:900,
            background:"#E8E8D0", color:"#302810",
            border:"3px solid #807860", borderRadius:5,
            padding:"8px 24px", cursor:"pointer",
            letterSpacing:"0.1em", boxShadow:"0 3px 0 #504838",
            transition:"all 0.08s",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(3px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(3px)"}
          onMouseUp={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"}
          onMouseLeave={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"}
        >
          LEAVE SHOP ▶
        </button>
      </div>
    </div>

      {/* Card tooltip */}
      {hoveredCard && (
        <ShopCardTooltip
          card={hoveredCard.card}
          cardCol={hoveredCard.cardCol}
          isAttack={hoveredCard.isAttack}
          isDefend={hoveredCard.isDefend}
          x={hoveredCard.x}
          y={hoveredCard.y}
        />
      )}
    </>
  );
}
