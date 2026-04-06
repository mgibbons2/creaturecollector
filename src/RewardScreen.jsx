// ============================================================
//  RewardScreen.jsx
//  Post-combat card draft + gold pickup.
//  Shows up to 5 card choices; player picks one per creature
//  that participated, then collects gold and continues.
// ============================================================

import { useState } from "react";
import { CardTooltip as RewardCardTooltip } from "./CardTooltip.jsx";
import { useIsMobile } from "./useMediaQuery.js";
import { useRun, RunActions } from "./RunContext.jsx";
import { CARD_DEFS } from "./cardDefs.js";
import { RARITY_COLOR, TYPE_COLORS, TYPE_SHAPES, effectiveDamage, effectiveHeal, effectiveShield, liveDesc, statMod } from "./shared.js";

function CardChoice({ cardId, isSelected, isPlayable, onClick, creature, onHoverCard }) {
  const card = CARD_DEFS[cardId];
  if (!card) return null;
  const col      = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
  const isAttack = card.tags.includes("attack");
  const isDefend = card.tags.includes("defend");
  const cardCol  = col;

  return (
    <div
      className="deck-card"
      onClick={isPlayable ? onClick : undefined}
      onMouseEnter={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        onHoverCard?.({ card, cardCol, isAttack, isDefend,
          x: rect.left + rect.width / 2, y: rect.top });
      }}
      onMouseLeave={() => onHoverCard?.(null)}
      style={{
        position:"relative", width:88, height:124,
        background: isSelected
          ? `linear-gradient(160deg, ${cardCol.bg} 0%, ${cardCol.bg} 100%)`
          : isPlayable
          ? "linear-gradient(160deg, #FFFEF8 0%, #F8F4E8 100%)"
          : "linear-gradient(160deg, #1a1a12 0%, #141410 100%)",
        border: `2px solid ${isSelected ? cardCol.mid : isPlayable ? cardCol.mid + "88" : "#303028"}`,
        borderRadius:9,
        padding:"7px 7px 6px",
        boxSizing:"border-box",
        overflow:"visible",
        flexShrink:0,
        opacity: isPlayable ? 1 : 0.35,
        boxShadow: isSelected
          ? `0 8px 24px ${cardCol.mid}66, 0 2px 0 ${cardCol.dark}, inset 0 1px 0 rgba(255,255,255,0.9)`
          : isPlayable
          ? `0 4px 12px rgba(0,0,0,0.3), 0 2px 0 ${cardCol.dark}, inset 0 1px 0 rgba(255,255,255,0.8)`
          : "none",
        fontFamily:"'Courier New', monospace",
        cursor: isPlayable ? "pointer" : "default",
        transition:"all 0.15s",
        transform: isSelected ? "translateY(-8px) scale(1.05)" : "none",
        userSelect:"none",
      }}
    >
      {/* Energy cost pip top-right */}
      <div style={{
        position:"absolute", top:4, right:4,
        width:16, height:16, borderRadius:"50%",
        background: card.energyCost===0 ? "#C8C0A8" : cardCol.mid,
        color:"#fff", fontSize:11, fontWeight:900,
        display:"flex", alignItems:"center", justifyContent:"center",
        border: `1.5px solid ${cardCol.dark}`,
        lineHeight:1, zIndex:2,
      }}>{card.energyCost}</div>

      {/* Rarity dot top-left */}
      <div style={{
        position:"absolute", top:6, left:6,
        width:6, height:6, borderRadius:"50%",
        background: RARITY_COLOR[card.rarity], zIndex:2,
      }} />

      {/* Type stripe */}
      <div style={{
        height:3, borderRadius:2, marginBottom:5, marginTop:2,
        background: `linear-gradient(to right,${cardCol.light},${cardCol.mid})`,
      }} />

      {/* Type silhouette */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
        <svg width={28} height={28} viewBox="0 0 100 100">
          <defs>
            <linearGradient id={`rg-${cardId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={cardCol.light} />
              <stop offset="100%" stopColor={cardCol.mid} />
            </linearGradient>
          </defs>
          <path d={TYPE_SHAPES[card.type]||TYPE_SHAPES.colorless}
            fill={isPlayable ? `url(#rg-${cardId})` : "#605040"} opacity={0.65}/>
        </svg>
      </div>

      {/* Card name */}
      <div style={{
        fontSize:8, fontWeight:900, color: isPlayable ? "#302810" : "#706050",
        textAlign:"center", lineHeight:1.2, marginBottom:3, letterSpacing:"0.01em",
      }}>
        {card.name.toUpperCase()}
      </div>

      {/* Badge */}
      <div style={{ textAlign:"center", marginBottom:4 }}>
        <span style={{
          fontSize:7, fontWeight:900, padding:"1px 4px", borderRadius:2,
          background: isAttack ? "#F09030" : isDefend ? "#5878F0" : "#58A838",
          color:"#fff", letterSpacing:"0.04em",
        }}>
          {isAttack ? "ATK" : isDefend ? "DEF" : "UTL"}
        </span>
      </div>

      {/* Description */}
      <div style={{
        fontSize:7, color:"#A09070", lineHeight:1.25,
        textAlign:"center",
        borderTop: `1px solid ${cardCol.mid}33`,
        paddingTop:3,
        overflow:"hidden",
        display:"-webkit-box",
        WebkitLineClamp:2,
        WebkitBoxOrient:"vertical",
      }}>
        {liveDesc(card, creature)}
      </div>
    </div>
  );
}

function CreatureDraftRow({ creature, creatureIndex, cardOffer, onDraft, drafted, onHoverCard }) {
  const isDrafted = drafted !== undefined;
  const col = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;

  return (
    <div style={{
      background:"#141410",
      border:`2px solid ${isDrafted ? "#806854" : col.mid + "44"}`,
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
        <span style={{ fontSize:13, color: col.light }}>Lv{creature.level} · {creature.type}</span>
        {isDrafted && (
          <span style={{
            marginLeft:"auto", fontSize:13, fontWeight:900,
            color:"#40C060", letterSpacing:"0.08em",
          }}>
            ✓ DRAFTED
          </span>
        )}
      </div>

      {!isDrafted ? (
        <>
          <div style={{ fontSize:12, color:"#907858", letterSpacing:"0.08em", marginBottom:8 }}>
            CHOOSE ONE CARD TO ADD TO {creature.name.toUpperCase()}'S DECK:
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {cardOffer.map(cardId => {
              const card  = CARD_DEFS[cardId];
              const legal = card && (card.type === creature.type || card.type === "colorless")
                          && card.levelRequired <= creature.level;
              return (
                <CardChoice
                  creature={creature}
                  key={cardId}
                  cardId={cardId}
                  isSelected={false}
                  isPlayable={legal}
                  onClick={() => legal && onDraft(cardId, creatureIndex)}
                  onHoverCard={onHoverCard}
                />
              );
            })}
          </div>
          <div style={{ marginTop:6 }}>
            <button
              onClick={() => onDraft(null, creatureIndex)}
              style={{
                background:"transparent", border:"1px solid #302818",
                color:"#907858", fontSize:13,
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
        <div style={{ fontSize:13, color:"#B09870" }}>
          {drafted ? `Added: ${CARD_DEFS[drafted]?.name ?? drafted}` : "Skipped card draft"}
        </div>
      )}
    </div>
  );
}

// ─── DECK-CARD ANIMATION ──────────────────────────────────────
const REWARD_CARD_STYLE = `
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

export default function RewardScreen() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const isMobile = useIsMobile();
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
    <>
      <style>{REWARD_CARD_STYLE}</style>
      <div style={{
      minHeight:"100vh",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      padding:"24px 20px",
      boxSizing:"border-box",
      maxWidth:780, width:"100%", margin:"0 auto",
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
        <p style={{ fontSize:13, color:"#A08868", letterSpacing:"0.1em" }}>
          Claim your rewards before returning to the map.
        </p>
      </div>

      {/* Gold reward */}
      <div style={{
        background: goldTaken ? "#141410" : "#1e1800",
        border:`2px solid ${goldTaken ? "#806854" : "#806020"}`,
        borderRadius:10, padding:"14px 16px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:16,
        opacity: goldTaken ? 0.5 : 1,
        transition:"all 0.3s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>¥</span>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color: goldTaken ? "#907858" : "#F8D030" }}>
              {goldAmount} GOLD
            </div>
            <div style={{ fontSize:12, color:"#A08868" }}>
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
          onHoverCard={setHoveredCard}
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
            background: canFinish ? "#E8E8D0" : "#706040",
            color: canFinish ? "#302810" : "#907858",
            border:`4px solid ${canFinish ? "#807860" : "#806854"}`,
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

      {hoveredCard && (
        <RewardCardTooltip
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
