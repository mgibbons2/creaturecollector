// ============================================================
//  ShopScreen.jsx
//  Spend gold on cards (type-filtered per creature), relics,
//  and party heals. Leave when done.
// ============================================================

import { useState } from "react";
import { useRun, RunActions } from "./RunContext.jsx";
import { CARD_DEFS, getDraftPool } from "./cardDefs.js";

// ─── CONSTANTS ───────────────────────────────────────────────

const TYPE_COLORS = {
  fire:      { light:"#FF9741", mid:"#DD6610", dark:"#7A2410", bg:"#2a1208" },
  water:     { light:"#74BCFF", mid:"#2B7FE8", dark:"#0E3577", bg:"#081828" },
  earth:     { light:"#A8D070", mid:"#4A8C2A", dark:"#1A4A08", bg:"#0e1e08" },
  wind:      { light:"#AAC8FF", mid:"#6070C8", dark:"#283080", bg:"#101228" },
  shadow:    { light:"#C880FF", mid:"#7038A8", dark:"#2A1050", bg:"#140820" },
  light:     { light:"#FFD060", mid:"#C89010", dark:"#604000", bg:"#201808" },
  colorless: { light:"#C8C8C8", mid:"#888888", dark:"#333333", bg:"#181818" },
};

const TYPE_SHAPES = {
  fire:      "M60,20 C60,20 70,40 55,55 C70,45 80,60 65,75 C75,65 85,75 75,90 C90,75 95,55 80,40Z",
  water:     "M50,15 C50,15 65,35 65,55 A15,15 0 0,1 35,55 C35,35 50,15 50,15Z",
  earth:     "M20,80 L50,20 L80,80Z",
  wind:      "M15,50 C25,35 45,30 55,50 C45,42 50,55 40,65 C55,55 65,65 55,80 C70,65 75,45 60,35Z",
  shadow:    "M50,10 L58,35 L85,35 L63,52 L72,78 L50,62 L28,78 L37,52 L15,35 L42,35Z",
  light:     "M50,15 L55,38 L78,30 L62,48 L78,65 L55,58 L50,80 L45,58 L22,65 L38,48 L22,30 L45,38Z",
  colorless: "M25,25 L75,25 L75,75 L25,75Z",
};

const RARITY_COLOR = {
  common:    "#807860",
  uncommon:  "#4080C0",
  rare:      "#A040D0",
  legendary: "#D09020",
};

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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
      <span style={{ fontSize:9, color:"#605840", letterSpacing:"0.08em" }}>GOLD</span>
    </div>
  );
}

function ShopCard({ card, creature, onBuy, bought, canAfford }) {
  const col  = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
  const cost = CARD_COSTS[card.rarity] ?? 50;
  const isAttack = card.tags.includes("attack");
  const isDefend = card.tags.includes("defend");
  const legal = creature
    ? (card.type === creature.type || card.type === "colorless") && card.levelRequired <= creature.level
    : false;

  const disabled = bought || !canAfford || !legal || !creature;

  return (
    <div style={{
      width:110, flexShrink:0,
      background: bought ? "#141410" : disabled ? "#141410" : col.bg,
      border:`2px solid ${bought ? "#252514" : disabled ? "#252514" : col.mid + "66"}`,
      borderRadius:8, padding:"10px 9px 8px",
      opacity: bought ? 0.35 : disabled ? 0.45 : 1,
      fontFamily:"'Courier New', monospace",
      position:"relative",
      transition:"all 0.15s",
    }}>
      {/* Cost badge */}
      <div style={{
        position:"absolute", top:-9, right:-9,
        background: bought ? "#252514" : canAfford && legal ? "#C89010" : "#2a2018",
        color: bought ? "#403828" : canAfford && legal ? "#fff" : "#605840",
        border:`2px solid ${bought ? "#302818" : canAfford && legal ? "#604000" : "#302818"}`,
        borderRadius:"50%", width:28, height:28,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:9, fontWeight:900,
      }}>
        {bought ? "✓" : `¥${cost}`}
      </div>

      {/* Rarity + type */}
      <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:6 }}>
        <div style={{ width:5, height:5, borderRadius:"50%", background:RARITY_COLOR[card.rarity] }} />
        <span style={{ fontSize:7, color:RARITY_COLOR[card.rarity], fontWeight:900, letterSpacing:"0.08em" }}>
          {card.rarity.toUpperCase()}
        </span>
      </div>

      {/* Silhouette */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}>
        <svg width={30} height={30} viewBox="0 0 100 100">
          <path d={TYPE_SHAPES[card.type] || TYPE_SHAPES.colorless} fill={col.mid} opacity={0.7} />
        </svg>
      </div>

      <div style={{ fontSize:9, fontWeight:900, color:"#E8E8D0", textAlign:"center", lineHeight:1.2, marginBottom:3 }}>
        {card.name.toUpperCase()}
      </div>

      <div style={{ textAlign:"center", marginBottom:5 }}>
        <span style={{
          fontSize:7, fontWeight:900, padding:"1px 4px", borderRadius:2,
          background: isAttack ? "#F09030" : isDefend ? "#5878F0" : "#58A838",
          color:"#fff", letterSpacing:"0.07em",
        }}>
          {isAttack ? "ATK" : isDefend ? "DEF" : "UTL"}
        </span>
        {!legal && creature && (
          <span style={{ fontSize:7, color:"#603030", marginLeft:4, fontWeight:900 }}>LOCKED</span>
        )}
      </div>

      <div style={{ fontSize:7.5, color:"#605840", lineHeight:1.4, textAlign:"center", borderTop:"1px solid #252514", paddingTop:5, minHeight:26 }}>
        {card.description}
      </div>

      {!bought && !disabled && (
        <button
          onClick={onBuy}
          style={{
            width:"100%", marginTop:7,
            fontFamily:"'Courier New', monospace",
            fontSize:8, fontWeight:900,
            background:"#C89010", color:"#fff",
            border:"2px solid #604000", borderRadius:4,
            padding:"4px 0", cursor:"pointer",
            letterSpacing:"0.08em",
            boxShadow:"0 2px 0 #604000",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(2px)"}
          onMouseUp={e   => e.currentTarget.style.transform="none"}
          onMouseLeave={e=> e.currentTarget.style.transform="none"}
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
      border:`2px solid ${owned ? "#302818" : disabled ? "#252514" : col.mid + "55"}`,
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
        background: owned || bought ? "#252514" : canAfford ? "#C89010" : "#2a2018",
        color: owned || bought ? "#403828" : canAfford ? "#fff" : "#605840",
        border:`2px solid ${owned || bought ? "#302818" : canAfford ? "#604000" : "#302818"}`,
        borderRadius:"50%", width:30, height:30,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:8, fontWeight:900,
      }}>
        {owned || bought ? "✓" : `¥${relic.cost}`}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:col.mid, flexShrink:0 }} />
        <span style={{ fontSize:11, fontWeight:900, color:"#E8E8D0" }}>{relic.name}</span>
      </div>
      <p style={{ fontSize:9, color:"#807860", lineHeight:1.55, margin:"0 0 8px" }}>
        {relic.desc}
      </p>

      {!disabled && (
        <button
          onClick={onBuy}
          style={{
            width:"100%",
            fontFamily:"'Courier New', monospace",
            fontSize:9, fontWeight:900,
            background:"#C89010", color:"#fff",
            border:"2px solid #604000", borderRadius:4,
            padding:"5px 0", cursor:"pointer",
            letterSpacing:"0.08em",
            boxShadow:"0 2px 0 #604000",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(2px)"}
          onMouseUp={e   => e.currentTarget.style.transform="none"}
          onMouseLeave={e=> e.currentTarget.style.transform="none"}
        >
          BUY RELIC
        </button>
      )}
    </div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function ShopScreen() {
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
          <div style={{ fontSize:9, color:"#504838", letterSpacing:"0.08em", marginTop:2 }}>
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
              color: activeTab === tab.key ? "#E8E8D0" : "#504838",
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
              <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.1em", marginBottom:8 }}>
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
                  card={card}
                  creature={activeCreature}
                  onBuy={() => buyCard(card)}
                  bought={boughtCards.has(card.id)}
                  canAfford={gold >= (CARD_COSTS[card.rarity] ?? 50)}
                />
              ))}
              {stock.length === 0 && (
                <p style={{ fontSize:10, color:"#403828", letterSpacing:"0.08em" }}>
                  No cards available for your current party.
                </p>
              )}
            </div>

            <div style={{ marginTop:12, fontSize:8, color:"#403828", letterSpacing:"0.06em" }}>
              Cards marked LOCKED cannot be used by the selected creature (wrong type or level too high).
              Switch creatures above to see their available cards.
            </div>
          </div>
        )}

        {/* ── RELICS TAB ── */}
        {activeTab === "relics" && (
          <div>
            <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.1em", marginBottom:12 }}>
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
                <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.1em", marginBottom:8 }}>
                  YOUR RELICS
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {relics.map(id => {
                    const r = SHOP_RELICS.find(r => r.id === id);
                    if (!r) return null;
                    const col = TYPE_COLORS[r.type] || TYPE_COLORS.colorless;
                    return (
                      <span key={id} style={{
                        fontSize:9, padding:"3px 10px",
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
            <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.1em", marginBottom:12 }}>
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
                      <span style={{ fontSize:9, color:typeCol }}>Lv{c.level}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:8, fontWeight:900, color:"#38A018", minWidth:14 }}>HP</span>
                      <div style={{ flex:1, height:6, background:"#302818", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:hpCol, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:8, color:"#605840" }}>{c.currentHp}/{c.maxHp}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Heal option */}
            <div style={{
              background:"#1a1a10",
              border:`2px solid ${gold >= HEAL_COST ? "#406020" : "#252514"}`,
              borderRadius:8, padding:"16px",
              maxWidth:320,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:900, color:"#E8E8D0" }}>Party Heal</span>
                <span style={{
                  fontSize:12, fontWeight:900,
                  color: gold >= HEAL_COST ? "#F8D030" : "#603030",
                }}>¥{HEAL_COST}</span>
              </div>
              <p style={{ fontSize:9, color:"#807860", lineHeight:1.6, margin:"0 0 12px" }}>
                Restore 30% of max HP to all party members.
              </p>
              <button
                onClick={buyHeal}
                disabled={gold < HEAL_COST}
                style={{
                  width:"100%",
                  fontFamily:"'Courier New', monospace",
                  fontSize:11, fontWeight:900,
                  background: gold >= HEAL_COST ? "#38A018" : "#252514",
                  color: gold >= HEAL_COST ? "#fff" : "#403828",
                  border:`3px solid ${gold >= HEAL_COST ? "#185808" : "#302818"}`,
                  borderRadius:5, padding:"8px 0",
                  cursor: gold >= HEAL_COST ? "pointer" : "not-allowed",
                  letterSpacing:"0.1em",
                  boxShadow: gold >= HEAL_COST ? "0 3px 0 #185808" : "none",
                  transition:"all 0.1s",
                }}
                onMouseDown={e => gold >= HEAL_COST && (e.currentTarget.style.transform="translateY(3px)")}
                onMouseUp={e   => (e.currentTarget.style.transform="none")}
                onMouseLeave={e=> (e.currentTarget.style.transform="none")}
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
        <span style={{ fontSize:9, color:"#403828", letterSpacing:"0.06em" }}>
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
          onMouseDown={e => e.currentTarget.style.transform="translateY(3px)"}
          onMouseUp={e   => e.currentTarget.style.transform="none"}
          onMouseLeave={e=> e.currentTarget.style.transform="none"}
        >
          LEAVE SHOP ▶
        </button>
      </div>
    </div>
  );
}
