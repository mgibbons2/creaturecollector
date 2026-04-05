// ============================================================
//  RewardScreen.jsx
//  Post-combat card draft + gold pickup.
//  Shows up to 5 card choices; player picks one per creature
//  that participated, then collects gold and continues.
// ============================================================

import { useState } from "react";
import { useRun, RunActions } from "./RunContext.jsx";
import { CARD_DEFS } from "./cardDefs.js";

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
  fire:   "M60,20 C60,20 70,40 55,55 C70,45 80,60 65,75 C75,65 85,75 75,90 C90,75 95,55 80,40 C90,50 85,30 75,25Z",
  water:  "M50,15 C50,15 65,35 65,55 A15,15 0 0,1 35,55 C35,35 50,15 50,15Z",
  earth:  "M20,80 L50,20 L80,80Z",
  wind:   "M15,50 C25,35 45,30 55,50 C45,42 50,55 40,65 C55,55 65,65 55,80 C70,65 75,45 60,35Z",
  shadow: "M50,10 L58,35 L85,35 L63,52 L72,78 L50,62 L28,78 L37,52 L15,35 L42,35Z",
  light:  "M50,15 L55,38 L78,30 L62,48 L78,65 L55,58 L50,80 L45,58 L22,65 L38,48 L22,30 L45,38Z",
  colorless: "M25,25 L75,25 L75,75 L25,75Z",
};

const RARITY_COLOR = {
  common:    "#807860",
  uncommon:  "#4080C0",
  rare:      "#A040D0",
  legendary: "#D09020",
};

function CardChoice({ cardId, isSelected, isPlayable, onClick }) {
  const card = CARD_DEFS[cardId];
  if (!card) return null;
  const col = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
  const isAttack = card.tags.includes("attack");
  const isDefend = card.tags.includes("defend");

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      style={{
        width:110,
        background: isSelected ? col.bg : "#1a1a10",
        border:`2.5px solid ${isSelected ? col.mid : isPlayable ? "#302818" : "#1e1e14"}`,
        borderRadius:8,
        padding:"10px 9px 8px",
        cursor: isPlayable ? "pointer" : "default",
        opacity: isPlayable ? 1 : 0.35,
        transform: isSelected ? "translateY(-10px) scale(1.05)" : "none",
        transition:"all 0.15s",
        boxShadow: isSelected ? `0 10px 24px ${col.mid}55` : "none",
        fontFamily:"'Courier New', monospace",
        flexShrink:0,
        userSelect:"none",
        position:"relative",
      }}
    >
      {/* Cost badge */}
      <div style={{
        position:"absolute", top:-8, right:-8,
        width:20, height:20, borderRadius:"50%",
        background: card.energyCost === 0 ? "#252514" : col.mid,
        color: card.energyCost === 0 ? "#605840" : "#fff",
        fontSize:11, fontWeight:900,
        display:"flex", alignItems:"center", justifyContent:"center",
        border:`2px solid ${card.energyCost === 0 ? "#403828" : col.dark}`,
      }}>{card.energyCost}</div>

      {/* Rarity dot */}
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background: RARITY_COLOR[card.rarity] }} />
        <span style={{ fontSize:7, color: RARITY_COLOR[card.rarity], letterSpacing:"0.08em", fontWeight:900 }}>
          {card.rarity.toUpperCase()}
        </span>
      </div>

      {/* Silhouette */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}>
        <svg width={32} height={32} viewBox="0 0 100 100">
          <defs>
            <linearGradient id={`rg-${cardId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={col.light} />
              <stop offset="100%" stopColor={col.mid} />
            </linearGradient>
          </defs>
          <path d={TYPE_SHAPES[card.type] || TYPE_SHAPES.colorless}
            fill={`url(#rg-${cardId})`} opacity={0.7}
          />
        </svg>
      </div>

      {/* Name */}
      <div style={{
        fontSize:9, fontWeight:900, color:"#E8E8D0",
        textAlign:"center", lineHeight:1.2, marginBottom:4,
      }}>
        {card.name.toUpperCase()}
      </div>

      {/* Category */}
      <div style={{ textAlign:"center", marginBottom:5 }}>
        <span style={{
          fontSize:7, fontWeight:900, padding:"1px 4px",
          borderRadius:2, letterSpacing:"0.07em",
          background: isAttack ? "#F09030" : isDefend ? "#5878F0" : "#58A838",
          color:"#fff",
        }}>
          {isAttack ? "ATK" : isDefend ? "DEF" : "UTL"}
        </span>
      </div>

      {/* Description */}
      <div style={{
        fontSize:7.5, color:"#605840", lineHeight:1.45,
        textAlign:"center", borderTop:"1px solid #252514",
        paddingTop:5, minHeight:28,
      }}>
        {card.description}
      </div>
    </div>
  );
}

function CreatureDraftRow({ creature, creatureIndex, cardOffer, onDraft, drafted }) {
  const isDrafted = drafted !== undefined;
  const col = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;

  return (
    <div style={{
      background:"#141410",
      border:`2px solid ${isDrafted ? "#302818" : col.mid + "44"}`,
      borderRadius:10, padding:"14px",
      marginBottom:12,
      opacity: isDrafted ? 0.6 : 1,
      transition:"opacity 0.3s",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <div style={{
          width:8, height:8, borderRadius:"50%",
          background: col.mid, flexShrink:0,
        }} />
        <span style={{ fontSize:11, fontWeight:900, color:"#E8E8D0" }}>
          {creature.name}
        </span>
        <span style={{ fontSize:9, color: col.light }}>Lv{creature.level} · {creature.type}</span>
        {isDrafted && (
          <span style={{
            marginLeft:"auto", fontSize:9, fontWeight:900,
            color:"#40C060", letterSpacing:"0.08em",
          }}>
            ✓ DRAFTED
          </span>
        )}
      </div>

      {!isDrafted ? (
        <>
          <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.08em", marginBottom:8 }}>
            CHOOSE ONE CARD TO ADD TO {creature.name.toUpperCase()}'S DECK:
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {cardOffer.map(cardId => {
              const card  = CARD_DEFS[cardId];
              const legal = card && (card.type === creature.type || card.type === "colorless")
                          && card.levelRequired <= creature.level;
              return (
                <CardChoice
                  key={cardId}
                  cardId={cardId}
                  isSelected={false}
                  isPlayable={legal}
                  onClick={() => legal && onDraft(cardId, creatureIndex)}
                />
              );
            })}
          </div>
          <div style={{ marginTop:6 }}>
            <button
              onClick={() => onDraft(null, creatureIndex)}
              style={{
                background:"transparent", border:"1px solid #302818",
                color:"#403828", fontSize:9,
                fontFamily:"'Courier New', monospace",
                padding:"4px 10px", borderRadius:4,
                cursor:"pointer", letterSpacing:"0.08em",
              }}
            >
              SKIP — take no card
            </button>
          </div>
        </>
      ) : (
        <div style={{ fontSize:9, color:"#605840" }}>
          {drafted ? `Added: ${CARD_DEFS[drafted]?.name ?? drafted}` : "Skipped card draft"}
        </div>
      )}
    </div>
  );
}

export default function RewardScreen() {
  const { run, dispatch } = useRun();
  const { pendingReward, party } = run;

  const [goldTaken,   setGoldTaken]   = useState(false);
  const [drafted,     setDrafted]     = useState({}); // { creatureIndex: cardId|null }

  if (!pendingReward) {
    dispatch(RunActions.finishReward());
    return null;
  }

  const { cardOffer, goldAmount, activeCount } = pendingReward;
  const activeCreatures = party.slice(0, activeCount ?? 1); // only creatures that fought

  const allDrafted = activeCreatures.every((_, i) => drafted[i] !== undefined);
  const canFinish  = goldTaken && allDrafted;

  function handleDraft(cardId, creatureIndex) {
    if (cardId) dispatch(RunActions.draftCard(cardId, creatureIndex));
    setDrafted(prev => ({ ...prev, [creatureIndex]: cardId ?? null }));
  }

  function handleTakeGold() {
    dispatch(RunActions.addGold(goldAmount));
    setGoldTaken(true);
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      padding:"24px 20px",
      boxSizing:"border-box",
      maxWidth:780, margin:"0 auto",
    }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:22, marginBottom:4 }}>⚔</div>
        <h2 style={{
          fontSize:22, fontWeight:900, color:"#E8E8D0",
          letterSpacing:"0.1em", margin:"0 0 6px",
        }}>
          VICTORY
        </h2>
        <p style={{ fontSize:9, color:"#504838", letterSpacing:"0.1em" }}>
          Claim your rewards before returning to the map.
        </p>
      </div>

      {/* Gold reward */}
      <div style={{
        background: goldTaken ? "#141410" : "#1e1800",
        border:`2px solid ${goldTaken ? "#302818" : "#806020"}`,
        borderRadius:10, padding:"14px 16px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:16,
        opacity: goldTaken ? 0.5 : 1,
        transition:"all 0.3s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>¥</span>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color: goldTaken ? "#403828" : "#F8D030" }}>
              {goldAmount} GOLD
            </div>
            <div style={{ fontSize:8, color:"#504838" }}>
              {goldTaken ? "Collected" : "Battle reward"}
            </div>
          </div>
        </div>
        {!goldTaken && (
          <button
            onClick={handleTakeGold}
            style={{
              fontFamily:"'Courier New', monospace",
              fontSize:10, fontWeight:900,
              background:"#C89010", color:"#fff",
              border:"3px solid #604000",
              borderRadius:4, padding:"6px 14px",
              cursor:"pointer", letterSpacing:"0.08em",
              boxShadow:"0 3px 0 #604000",
            }}
            onMouseDown={e => e.currentTarget.style.transform="translateY(3px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(3px)"}
            onMouseUp={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"}
            onMouseLeave={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"}
          >
            COLLECT
          </button>
        )}
      </div>

      {/* Card drafts per creature */}
      {activeCreatures.map((creature, i) => (
        <CreatureDraftRow
          key={creature.defId}
          creature={creature}
          creatureIndex={i}
          cardOffer={cardOffer}
          onDraft={handleDraft}
          drafted={drafted[i]}
        />
      ))}

      {/* Continue */}
      <div style={{ textAlign:"center", marginTop:20 }}>
        <button
          onClick={() => dispatch(RunActions.finishReward())}
          disabled={!canFinish}
          style={{
            fontFamily:"'Courier New', monospace",
            fontSize:13, fontWeight:900,
            background: canFinish ? "#E8E8D0" : "#252514",
            color: canFinish ? "#302810" : "#403828",
            border:`4px solid ${canFinish ? "#807860" : "#302818"}`,
            borderRadius:6, padding:"11px 36px",
            cursor: canFinish ? "pointer" : "not-allowed",
            letterSpacing:"0.1em",
            boxShadow: canFinish ? "0 5px 0 #504838" : "none",
            transition:"all 0.15s",
          }}
          onMouseDown={e => canFinish && (e.currentTarget.style.transform="translateY(5px)")}
          onMouseUp={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"}
          onMouseLeave={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"}
        >
          {canFinish ? "RETURN TO MAP ▶" : "COLLECT REWARDS FIRST"}
        </button>
      </div>
    </div>
  );
}
