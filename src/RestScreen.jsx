// ============================================================
//  RestScreen.jsx
//  Two options: Heal (restore 25% max HP to all party members)
//  or Upgrade (permanently upgrade one card in one creature's
//  deck — improves baseDamage, shieldAmount, or drawAmount).
// ============================================================

import { useState } from "react";
import { useRun, RunActions } from "./RunContext.jsx";
import { CARD_DEFS } from "./cardDefs.js";

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

// ─── UPGRADE LOGIC ───────────────────────────────────────────

/**
 * Produces an upgraded copy of a card def.
 * Upgrades are additive — +3 damage, +4 shield, -1 energy cost, +1 draw.
 * Upgraded cards get a "+" suffix on their name.
 */
function upgradeCard(card) {
  const upgraded = { ...card, name: card.name + "+" };
  if (card.baseDamage !== undefined)   upgraded.baseDamage   = card.baseDamage + 3;
  if (card.shieldAmount !== undefined) upgraded.shieldAmount = card.shieldAmount + 4;
  if (card.healAmount !== undefined)   upgraded.healAmount   = card.healAmount + 4;
  if (card.drawAmount !== undefined)   upgraded.drawAmount   = card.drawAmount + 1;
  if (card.energyCost > 0)             upgraded.energyCost   = Math.max(0, card.energyCost - 1);
  return upgraded;
}

// ─── COMPONENTS ──────────────────────────────────────────────

function HPBar({ current, max, type }) {
  const pct    = Math.round((current / max) * 100);
  const hpCol  = pct > 50 ? "#40C850" : pct > 20 ? "#F8D030" : "#F85840";
  const typeCol = TYPE_COLORS[type]?.mid || "#888";
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:8, fontWeight:900, color:"#38A018" }}>HP</span>
        <span style={{ fontSize:8, color:"#605840" }}>{current}/{max}</span>
      </div>
      <div style={{ height:6, background:"#302818", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:hpCol, borderRadius:3, transition:"width 0.4s" }} />
      </div>
      <div style={{ marginTop:3 }}>
        <div style={{ height:2, background:"#302818", borderRadius:1, overflow:"hidden" }}>
          <div style={{
            height:"100%",
            width:`${Math.min(100, ((current + Math.floor(max * 0.25)) / max) * 100)}%`,
            background:hpCol, opacity:0.4, borderRadius:1,
          }} />
        </div>
      </div>
    </div>
  );
}

function PartyCard({ creature, showHealPreview }) {
  const col  = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;
  const healAmt = Math.floor(creature.maxHp * 0.25);
  const newHp   = Math.min(creature.maxHp, creature.currentHp + healAmt);

  return (
    <div style={{
      background:"#1a1a10",
      border:`2px solid ${col.mid}44`,
      borderRadius:8, padding:"12px 14px",
      minWidth:130,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:900, color:"#E8E8D0" }}>{creature.name}</span>
        <span style={{ fontSize:9, color:col.light }}>Lv{creature.level}</span>
      </div>
      <HPBar current={creature.currentHp} max={creature.maxHp} type={creature.type} />
      {showHealPreview && creature.currentHp < creature.maxHp && (
        <div style={{
          marginTop:5, fontSize:8,
          color: "#40C850", fontWeight:900, letterSpacing:"0.06em",
        }}>
          +{newHp - creature.currentHp} HP
        </div>
      )}
      {showHealPreview && creature.currentHp >= creature.maxHp && (
        <div style={{ marginTop:5, fontSize:8, color:"#403828" }}>
          Already full
        </div>
      )}
    </div>
  );
}

function UpgradeCardTile({ cardId, creature, isSelected, onClick }) {
  const baseDef = CARD_DEFS[cardId];
  if (!baseDef) return null;
  const upgraded = upgradeCard(baseDef);
  const col = TYPE_COLORS[baseDef.type] || TYPE_COLORS.colorless;

  return (
    <div
      onClick={onClick}
      style={{
        width:110, flexShrink:0,
        background: isSelected ? col.bg : "#1a1a10",
        border:`2px solid ${isSelected ? col.mid : "#302818"}`,
        borderRadius:8, padding:"10px 9px",
        cursor:"pointer",
        transform: isSelected ? "translateY(-8px) scale(1.04)" : "none",
        transition:"all 0.15s",
        boxShadow: isSelected ? `0 8px 20px ${col.mid}44` : "none",
        fontFamily:"'Courier New', monospace",
        userSelect:"none",
      }}
    >
      {/* Type dot */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}>
        <svg width={26} height={26} viewBox="0 0 100 100">
          <path d={TYPE_SHAPES[baseDef.type] || TYPE_SHAPES.colorless} fill={col.mid} opacity={0.7} />
        </svg>
      </div>

      <div style={{ fontSize:9, fontWeight:900, color:"#E8E8D0", textAlign:"center", marginBottom:5, lineHeight:1.2 }}>
        {baseDef.name.toUpperCase()}
      </div>

      {/* Before → After */}
      <div style={{
        borderTop:"1px solid #252514", paddingTop:6,
        fontSize:7.5, lineHeight:1.6,
      }}>
        {baseDef.baseDamage !== undefined && (
          <div>
            <span style={{ color:"#605840" }}>DMG </span>
            <span style={{ color:"#E85840" }}>{baseDef.baseDamage}</span>
            <span style={{ color:"#505040" }}> → </span>
            <span style={{ color:"#40C850", fontWeight:900 }}>{upgraded.baseDamage}</span>
          </div>
        )}
        {baseDef.shieldAmount !== undefined && (
          <div>
            <span style={{ color:"#605840" }}>SHD </span>
            <span style={{ color:"#4080E0" }}>{baseDef.shieldAmount}</span>
            <span style={{ color:"#505040" }}> → </span>
            <span style={{ color:"#40C850", fontWeight:900 }}>{upgraded.shieldAmount}</span>
          </div>
        )}
        {baseDef.healAmount !== undefined && (
          <div>
            <span style={{ color:"#605840" }}>HEL </span>
            <span style={{ color:"#40A030" }}>{baseDef.healAmount}</span>
            <span style={{ color:"#505040" }}> → </span>
            <span style={{ color:"#40C850", fontWeight:900 }}>{upgraded.healAmount}</span>
          </div>
        )}
        {baseDef.energyCost > 0 && (
          <div>
            <span style={{ color:"#605840" }}>NRG </span>
            <span style={{ color:"#F8D030" }}>{baseDef.energyCost}</span>
            <span style={{ color:"#505040" }}> → </span>
            <span style={{ color:"#40C850", fontWeight:900 }}>{upgraded.energyCost}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function RestScreen() {
  const { run, dispatch } = useRun();
  const { party } = run;

  const [choice, setChoice]             = useState(null);  // null | "heal" | "upgrade"
  const [confirmed, setConfirmed]       = useState(false);
  const [selectedCreature, setCreature] = useState(0);
  const [selectedCard, setCard]         = useState(null);  // cardId string

  const creature = party[selectedCreature];

  // Unique card ids in this creature's deck (for upgrade selection)
  const deckCardIds = creature ? [...new Set(creature.deck)] : [];

  function doHeal() {
    dispatch(RunActions.restHeal());
    setConfirmed(true);
  }

  function doUpgrade() {
    if (!creature || !selectedCard) return;
    const baseDef    = CARD_DEFS[selectedCard];
    if (!baseDef) return;
    const upgraded   = upgradeCard(baseDef);
    // Replace first occurrence of selectedCard in deck with upgraded version
    // We store upgraded cards with their "+" id to keep them distinct
    const upgradedId = selectedCard + "_plus";
    // Inject the upgraded def into CARD_DEFS at runtime (local mutation, fine for session)
    CARD_DEFS[upgradedId] = { ...upgraded, id: upgradedId };

    const newDeck    = [...creature.deck];
    const idx        = newDeck.indexOf(selectedCard);
    if (idx !== -1) newDeck[idx] = upgradedId;

    const updatedParty = party.map((c, i) =>
      i === selectedCreature ? { ...c, deck: newDeck } : c
    );
    dispatch(RunActions.restUpgrade(updatedParty));
    setConfirmed(true);
  }

  // ── Confirmed view ──
  if (confirmed) {
    return (
      <div style={{
        minHeight:"100vh", background:"#111108",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        fontFamily:"'Courier New', monospace", gap:20,
        padding:24,
      }}>
        <div style={{ fontSize:32 }}>♥</div>
        <h2 style={{ fontSize:20, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.1em", margin:0 }}>
          {choice === "heal" ? "PARTY HEALED" : "CARD UPGRADED"}
        </h2>
        <p style={{ fontSize:9, color:"#504838", letterSpacing:"0.08em" }}>
          {choice === "heal"
            ? "Your creatures are rested and ready."
            : `${CARD_DEFS[selectedCard + "_plus"]?.name ?? "Card"} is now stronger.`}
        </p>
        <button
          onClick={() => dispatch(RunActions.finishRest())}
          style={{
            fontFamily:"'Courier New', monospace",
            fontSize:12, fontWeight:900,
            background:"#E8E8D0", color:"#302810",
            border:"3px solid #807860", borderRadius:5,
            padding:"9px 28px", cursor:"pointer",
            letterSpacing:"0.1em", boxShadow:"0 4px 0 #504838",
            transition:"all 0.08s",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(4px)"}
          onMouseUp={e   => e.currentTarget.style.transform="none"}
          onMouseLeave={e=> e.currentTarget.style.transform="none"}
        >
          RETURN TO MAP ▶
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      display:"flex", flexDirection:"column",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding:"12px 20px",
        background:"#1a1a10", borderBottom:"2px solid #302818",
      }}>
        <div style={{ fontSize:16, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.08em" }}>
          ♥ REST SITE
        </div>
        <div style={{ fontSize:9, color:"#504838", letterSpacing:"0.08em", marginTop:2 }}>
          Take a moment. You can only choose one.
        </div>
      </div>

      <div style={{ flex:1, padding:"24px 20px", overflowY:"auto" }}>

        {/* ── Choice cards ── */}
        {!choice && (
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>

            {/* Heal option */}
            <div
              onClick={() => setChoice("heal")}
              style={{
                flex:1, minWidth:220, maxWidth:320,
                background:"#0e1e0e",
                border:"3px solid #286020",
                borderRadius:10, padding:"24px",
                cursor:"pointer",
                transition:"all 0.15s",
                boxShadow:"0 4px 0 #184010",
              }}
              onMouseEnter={e => e.currentTarget.style.transform="translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform="none"}
            >
              <div style={{ fontSize:32, marginBottom:10 }}>♥</div>
              <div style={{ fontSize:15, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.06em", marginBottom:8 }}>
                HEAL PARTY
              </div>
              <p style={{ fontSize:10, color:"#607850", lineHeight:1.65, margin:0 }}>
                Restore <b style={{ color:"#40C850" }}>25% max HP</b> to every creature in your party.
                A good choice when your team is hurting.
              </p>
            </div>

            {/* Upgrade option */}
            <div
              onClick={() => setChoice("upgrade")}
              style={{
                flex:1, minWidth:220, maxWidth:320,
                background:"#0e100e",
                border:"3px solid #4060A0",
                borderRadius:10, padding:"24px",
                cursor:"pointer",
                transition:"all 0.15s",
                boxShadow:"0 4px 0 #203060",
              }}
              onMouseEnter={e => e.currentTarget.style.transform="translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform="none"}
            >
              <div style={{ fontSize:32, marginBottom:10 }}>✦</div>
              <div style={{ fontSize:15, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.06em", marginBottom:8 }}>
                UPGRADE CARD
              </div>
              <p style={{ fontSize:10, color:"#607890", lineHeight:1.65, margin:0 }}>
                Permanently improve one card in any creature's deck.
                <b style={{ color:"#AAC8FF" }}> +3 damage / +4 shield / -1 energy cost.</b>
              </p>
            </div>
          </div>
        )}

        {/* ── HEAL flow ── */}
        {choice === "heal" && (
          <div>
            <div style={{
              fontSize:9, color:"#403828", letterSpacing:"0.1em", marginBottom:12,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <button
                onClick={() => setChoice(null)}
                style={{ background:"none", border:"none", color:"#504838", cursor:"pointer", fontSize:12 }}
              >←</button>
              HEAL PARTY — 25% max HP restored
            </div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
              {party.map((c, i) => (
                <PartyCard key={i} creature={c} showHealPreview />
              ))}
            </div>

            <button
              onClick={doHeal}
              style={{
                fontFamily:"'Courier New', monospace",
                fontSize:13, fontWeight:900,
                background:"#38A018", color:"#fff",
                border:"4px solid #185808",
                borderRadius:6, padding:"11px 36px",
                cursor:"pointer", letterSpacing:"0.1em",
                boxShadow:"0 5px 0 #185808",
                transition:"all 0.08s",
              }}
              onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"}
              onMouseUp={e   => e.currentTarget.style.transform="none"}
              onMouseLeave={e=> e.currentTarget.style.transform="none"}
            >
              ♥ REST AND HEAL
            </button>
          </div>
        )}

        {/* ── UPGRADE flow ── */}
        {choice === "upgrade" && (
          <div>
            <div style={{
              fontSize:9, color:"#403828", letterSpacing:"0.1em", marginBottom:12,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <button
                onClick={() => { setChoice(null); setCard(null); }}
                style={{ background:"none", border:"none", color:"#504838", cursor:"pointer", fontSize:12 }}
              >←</button>
              UPGRADE CARD — choose a creature, then a card
            </div>

            {/* Creature selector */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
              {party.map((c, i) => {
                const col = TYPE_COLORS[c.type] || TYPE_COLORS.colorless;
                return (
                  <button
                    key={i}
                    onClick={() => { setCreature(i); setCard(null); }}
                    style={{
                      fontFamily:"'Courier New', monospace",
                      fontSize:10, fontWeight:900,
                      padding:"6px 14px",
                      background: selectedCreature === i ? col.mid : "#1a1a10",
                      color: selectedCreature === i ? "#fff" : col.light,
                      border:`2px solid ${selectedCreature === i ? col.mid : col.mid + "44"}`,
                      borderRadius:5, cursor:"pointer", letterSpacing:"0.06em",
                      transition:"all 0.1s",
                    }}
                  >
                    {c.name} <span style={{ opacity:0.7, fontWeight:400 }}>Lv{c.level}</span>
                  </button>
                );
              })}
            </div>

            {/* Card selection */}
            {creature && (
              <>
                <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.08em", marginBottom:8 }}>
                  {creature.name.toUpperCase()}'S DECK — {deckCardIds.length} unique cards
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                  {deckCardIds.map(cardId => (
                    <UpgradeCardTile
                      key={cardId}
                      cardId={cardId}
                      creature={creature}
                      isSelected={selectedCard === cardId}
                      onClick={() => setCard(selectedCard === cardId ? null : cardId)}
                    />
                  ))}
                  {deckCardIds.length === 0 && (
                    <p style={{ fontSize:9, color:"#403828" }}>No cards in deck.</p>
                  )}
                </div>
              </>
            )}

            {selectedCard && (
              <button
                onClick={doUpgrade}
                style={{
                  fontFamily:"'Courier New', monospace",
                  fontSize:13, fontWeight:900,
                  background:"#4060C0", color:"#fff",
                  border:"4px solid #203080",
                  borderRadius:6, padding:"11px 36px",
                  cursor:"pointer", letterSpacing:"0.1em",
                  boxShadow:"0 5px 0 #203080",
                  transition:"all 0.08s",
                }}
                onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"}
                onMouseUp={e   => e.currentTarget.style.transform="none"}
                onMouseLeave={e=> e.currentTarget.style.transform="none"}
              >
                ✦ UPGRADE {CARD_DEFS[selectedCard]?.name.toUpperCase()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
