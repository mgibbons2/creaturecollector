// ============================================================
//  PartyScreen.jsx
//  Manage party slots, reorder creatures, swap roster members
//  in and out, and inspect any creature's full deck.
//
//  Layout:
//    Top:    Active combat slots (0–1 highlighted)
//    Middle: Bench slots (2–5)
//    Bottom: Full roster — all caught creatures
//    Right panel: Selected creature detail + deck list
// ============================================================

import { useState, useEffect } from "react";
import { useIsMobile } from "./useMediaQuery.js";
import { useRun, RunActions } from "./RunContext.jsx";
import { CARD_DEFS } from "./cardDefs.js";
import { CardTooltip } from "./CardTooltip.jsx";
import { CREATURE_DEFS } from "./creatureDefs.js";
import { getStageName } from "./creatureDefs.js";
import { RARITY_COLOR, TYPE_COLORS, TYPE_SHAPES, effectiveDamage, effectiveHeal, effectiveShield, hpBarColor, hpPercent, liveDesc, statMod } from "./shared.js";

// ─── CONSTANTS ───────────────────────────────────────────────

function hpPct(c)   { return Math.min(100, Math.round((c.currentHp / c.maxHp) * 100)); }
function hpColor(p) { return p > 50 ? "#40C850" : p > 20 ? "#F8D030" : "#F85840"; }

// ─── CREATURE MINI SILHOUETTE ────────────────────────────────

function TypeIcon({ type, size = 20 }) {
  const col = TYPE_COLORS[type] || TYPE_COLORS.colorless;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink:0 }}>
      <path d={TYPE_SHAPES[type] || TYPE_SHAPES.colorless} fill={col.mid} />
    </svg>
  );
}

// ─── PARTY SLOT ──────────────────────────────────────────────

function PartySlot({
  creature, slotIndex, isActive, isEmpty,
  isSelected, isDragOver, dragFrom,
  onSelect, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const col = creature ? TYPE_COLORS[creature.type] || TYPE_COLORS.colorless : null;
  const pct = creature ? hpPct(creature) : 0;

  return (
    <div
      draggable={!!creature}
      onDragStart={creature ? () => onDragStart(slotIndex) : undefined}
      onDragOver={e => { e.preventDefault(); onDragOver(slotIndex); }}
      onDrop={e => { e.preventDefault(); onDrop(slotIndex); }}
      onDragEnd={onDragEnd}
      onClick={() => creature && onSelect(slotIndex, "party")}
      style={{
        background: isDragOver
          ? "#252520"
          : isSelected
          ? col?.bg ?? "#1e1e14"
          : "#1a1a10",
        border: `2.5px solid ${
          isDragOver ? "#807860"
          : isSelected ? col?.mid ?? "#807860"
          : isActive ? "#A08868"
          : "#706040"
        }`,
        borderRadius: 8,
        padding: "10px 12px",
        cursor: creature ? "grab" : "default",
        transition: "all 0.12s",
        boxShadow: isSelected ? `0 0 16px ${col?.mid}44` : "none",
        minHeight: 76,
        display: "flex", alignItems: "center", gap: 10,
        position: "relative",
      }}
    >
      {/* Active badge */}
      {isActive && (
        <div style={{
          position:"absolute", top:-8, left:8,
          fontSize:11, fontWeight:900,
          background:"#E84040", color:"#fff",
          padding:"1px 6px", borderRadius:3,
          letterSpacing:"0.1em",
        }}>
          ACTIVE
        </div>
      )}

      {/* Slot number */}
      <div style={{
        fontSize:13, fontWeight:900, color:"#806854",
        minWidth:14, textAlign:"center", flexShrink:0,
      }}>
        {slotIndex + 1}
      </div>

      {isEmpty ? (
        <div style={{
          flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, color:"#706040", letterSpacing:"0.1em",
          border:"1.5px dashed #252514", borderRadius:5,
          height:52, fontFamily:"'Courier New', monospace",
        }}>
          EMPTY
        </div>
      ) : (
        <>
          <TypeIcon type={creature.type} size={22} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
              <span style={{ fontSize:11, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.02em" }}>
                {creature.name}
              </span>
              <span style={{ fontSize:12, color: col?.light }}>Lv{creature.level}</span>
            </div>
            {/* HP bar */}
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:11, fontWeight:900, color:"#38A018", minWidth:12 }}>HP</span>
              <div style={{ flex:1, height:5, background:"#806854", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:hpColor(pct), borderRadius:2, transition:"width 0.3s" }} />
              </div>
              <span style={{ fontSize:11, color:"#B09870" }}>{creature.currentHp}/{creature.maxHp}</span>
            </div>
            {/* XP bar */}
            {creature.xpNext && (
              <div style={{ marginTop:3, height:2, background:"#806854", borderRadius:1, overflow:"hidden" }}>
                <div style={{
                  height:"100%",
                  width:`${Math.min(100, Math.round((creature.xp / creature.xpNext) * 100))}%`,
                  background:"#4898F0", borderRadius:1,
                }} />
              </div>
            )}
          </div>
          {/* AC pill */}
          <div style={{
            fontSize:12, color:"#B09870",
            background:"#141410", border:"1px solid #252514",
            borderRadius:4, padding:"2px 5px", flexShrink:0,
          }}>
            AC{creature.armorClass}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ROSTER CARD ─────────────────────────────────────────────

function RosterCard({ creature, isInParty, isSelected, onSelect, onAddToParty, partyFull }) {
  const col = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;
  const pct = hpPct(creature);

  return (
    <div
      onClick={() => onSelect(creature.defId, "roster")}
      style={{
        background: isSelected ? col.bg : "#1a1a10",
        border:`2px solid ${isSelected ? col.mid : isInParty ? col.mid + "55" : "#706040"}`,
        borderRadius:8, padding:"10px 12px",
        cursor:"pointer",
        transition:"all 0.12s",
        boxShadow: isSelected ? `0 0 14px ${col.mid}44` : "none",
        display:"flex", alignItems:"center", gap:10,
        position:"relative",
      }}
    >
      {isInParty && (
        <div style={{
          position:"absolute", top:-7, right:8,
          fontSize:11, fontWeight:900,
          background: col.mid, color:"#fff",
          padding:"1px 5px", borderRadius:3,
          letterSpacing:"0.08em",
        }}>
          IN PARTY
        </div>
      )}

      <TypeIcon type={creature.type} size={18} />

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:3 }}>
          <span style={{ fontSize:10, fontWeight:900, color:"#E8E8D0" }}>{creature.name}</span>
          <span style={{ fontSize:12, color:col.light }}>Lv{creature.level}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:11, fontWeight:900, color:"#38A018", minWidth:12 }}>HP</span>
          <div style={{ flex:1, height:4, background:"#806854", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:hpColor(pct), borderRadius:2 }} />
          </div>
        </div>
      </div>

      {!isInParty && (
        <button
          onClick={e => { e.stopPropagation(); onAddToParty(creature.defId); }}
          disabled={partyFull}
          title={partyFull ? "Party is full (6/6)" : "Add to party"}
          style={{
            fontFamily:"'Courier New', monospace",
            fontSize:13, fontWeight:900,
            background: partyFull ? "#706040" : col.mid,
            color: partyFull ? "#907858" : "#fff",
            border:`2px solid ${partyFull ? "#806854" : col.dark}`,
            borderRadius:4, padding:"3px 8px",
            cursor: partyFull ? "not-allowed" : "pointer",
            flexShrink:0,
          }}
        >
          + ADD
        </button>
      )}
    </div>
  );
}

// ─── DETAIL PANEL ────────────────────────────────────────────

function DetailPanel({ creature, partyIndex, onSwapOut, rosterCreature, onHoverCard }) {
  const [tab, setTab] = useState("stats"); // stats | deck

  // Reset to stats tab when a different creature is selected
  const creatureKey = creature?.defId ?? creature?.name ?? null;
  useEffect(() => { setTab("stats"); }, [creatureKey]);

  const col   = TYPE_COLORS[creature?.type] || TYPE_COLORS.colorless;
  const def   = CREATURE_DEFS[creature?.defId];
  const stage = creature ? getStageName(creature.level) : null;
  const pct   = creature ? hpPct(creature) : 0;

  // Unique cards in deck with counts
  const deckCounts = {};
  (creature?.deck ?? []).forEach(id => { deckCounts[id] = (deckCounts[id] || 0) + 1; });
  const uniqueCards = Object.entries(deckCounts);

  if (!creature) return (
    <div style={{
      flex:1, display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:13, color:"#806854", letterSpacing:"0.1em",
      fontFamily:"'Courier New', monospace",
    }}>
      SELECT A CREATURE
    </div>
  );

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100%",
      fontFamily:"'Courier New', monospace",
    }}>
      {/* Creature header */}
      <div style={{
        background: col.bg, borderBottom:`2px solid ${col.mid}44`,
        padding:"14px 16px",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <svg width={44} height={44} viewBox="0 0 100 100"
            style={{ filter:`drop-shadow(0 3px 8px ${col.mid}88)`, flexShrink:0 }}>
            <defs>
              <linearGradient id={`dp-${creature.type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={col.light} />
                <stop offset="100%" stopColor={col.mid} />
              </linearGradient>
            </defs>
            <path d={TYPE_SHAPES[creature.type] || TYPE_SHAPES.colorless}
              fill={`url(#dp-${creature.type})`} stroke={col.dark} strokeWidth="2" />
          </svg>
          <div>
            <div style={{ fontSize:14, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.03em" }}>
              {creature.name}
            </div>
            <div style={{ fontSize:13, color:col.light, marginTop:2 }}>
              {creature.type.toUpperCase()} · Lv{creature.level} · {stage.toUpperCase()}
            </div>
          </div>
        </div>

        {/* HP + XP bars */}
        <div style={{ marginBottom:5 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
            <span style={{ fontSize:12, fontWeight:900, color:"#38A018" }}>HP</span>
            <span style={{ fontSize:12, color:"#B09870" }}>{creature.currentHp}/{creature.maxHp}</span>
          </div>
          <div style={{ height:6, background:"#806854", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:hpColor(pct), borderRadius:3, transition:"width 0.3s" }} />
          </div>
        </div>
        {creature.xpNext && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
              <span style={{ fontSize:11, color:"#4898F0" }}>XP</span>
              <span style={{ fontSize:11, color:"#907858" }}>{creature.xp ?? 0}/{creature.xpNext}</span>
            </div>
            <div style={{ height:3, background:"#806854", borderRadius:2, overflow:"hidden" }}>
              <div style={{
                height:"100%",
                width:`${Math.min(100, Math.round(((creature.xp ?? 0) / creature.xpNext) * 100))}%`,
                background:"#4898F0", borderRadius:2,
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", background:"#141410", borderBottom:"1px solid #252514" }}>
        {["stats","deck"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily:"'Courier New', monospace",
            fontSize:13, fontWeight:900,
            padding:"7px 14px", background:"transparent",
            color: tab === t ? "#E8E8D0" : "#A08868",
            border:"none",
            borderBottom: tab === t ? `2px solid ${col.mid}` : "2px solid transparent",
            cursor:"pointer", letterSpacing:"0.1em", textTransform:"uppercase",
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"visible", padding:"12px 14px" }}>

        {/* STATS TAB */}
        {tab === "stats" && (
          <div>
            {/* Stats grid */}
            <div style={{
              display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:6, marginBottom:14,
            }}>
              {["strength","dexterity","intelligence","constitution","wisdom"].map(stat => {
                const val = creature.stats?.[stat] ?? 10;
                const mod = statMod(val);
                return (
                  <div key={stat} style={{
                    background:"#141410", border:"1px solid #252514",
                    borderRadius:5, padding:"6px 8px",
                  }}>
                    <div style={{ fontSize:11, color:"#A08868", letterSpacing:"0.08em", marginBottom:2 }}>
                      {stat.toUpperCase().slice(0,3)}
                    </div>
                    <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                      <span style={{ fontSize:14, fontWeight:900, color:"#E8E8D0" }}>{val}</span>
                      <span style={{ fontSize:13, color: mod >= 0 ? "#40C850" : "#E84040", fontWeight:700 }}>
                        {mod >= 0 ? "+" : ""}{mod}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div style={{
                background:"#141410", border:"1px solid #252514",
                borderRadius:5, padding:"6px 8px",
              }}>
                <div style={{ fontSize:11, color:"#A08868", letterSpacing:"0.08em", marginBottom:2 }}>AC</div>
                <div style={{ fontSize:14, fontWeight:900, color:"#74BCFF" }}>{creature.armorClass}</div>
              </div>
            </div>

            {/* Evolution path */}
            {def && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"#907858", letterSpacing:"0.1em", marginBottom:6 }}>
                  EVOLUTION PATH
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {["baby","adult","elder"].map((s, i) => {
                    const stageDef = def.stages[s];
                    const isCurrent = s === stage;
                    const isPast = (i < ["baby","adult","elder"].indexOf(stage));
                    return (
                      <>
                        {i > 0 && (
                          <div key={`arrow-${i}`} style={{
                            fontSize:13,
                            color: isPast || isCurrent ? col.mid : "#806854",
                          }}>→</div>
                        )}
                        <div key={s} style={{
                          background: isCurrent ? col.bg : "#141410",
                          border:`1.5px solid ${isCurrent ? col.mid : isPast ? col.mid + "44" : "#706040"}`,
                          borderRadius:5, padding:"4px 8px",
                          textAlign:"center",
                        }}>
                          <div style={{ fontSize:12, fontWeight:900, color: isCurrent ? "#E8E8D0" : "#A08868" }}>
                            {stageDef.name}
                          </div>
                          <div style={{ fontSize:11, color:"#907858" }}>
                            Lv{s === "baby" ? "1" : s === "adult" ? "3" : "5"}
                          </div>
                        </div>
                      </>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Passive tags */}
            {def?.passiveTags?.length > 0 && (
              <div>
                <div style={{ fontSize:11, color:"#907858", letterSpacing:"0.1em", marginBottom:6 }}>
                  SYNERGY TAGS
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {def.passiveTags.map(tag => (
                    <span key={tag} style={{
                      fontSize:12, padding:"2px 7px",
                      background: col.mid + "22", color:col.light,
                      border:`1px solid ${col.mid}44`,
                      borderRadius:3, letterSpacing:"0.06em",
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DECK TAB */}
        {tab === "deck" && (
          <div>
            <div style={{ fontSize:11, color:"#907858", letterSpacing:"0.1em", marginBottom:8 }}>
              DECK — {creature.deck.length} cards ({uniqueCards.length} unique)
            </div>
            {uniqueCards.length === 0 && (
              <p style={{ fontSize:13, color:"#907858" }}>No cards in deck.</p>
            )}
            <style>{`
              @keyframes deckCardBob {
                0%,100% { transform: translateY(0px); }
                50%      { transform: translateY(-4px); }
              }
              .deck-card {
                transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                            box-shadow 0.18s ease,
                            border-color 0.15s ease;
                animation: deckCardBob 3s ease-in-out infinite;
                cursor: pointer;
              }
              .deck-card:hover {
                transform: translateY(-10px) scale(1.08) !important;
                animation: none !important;
                z-index: 10;
              }

            `}</style>
            <div style={{
              display:"flex", flexWrap:"wrap", gap:12, marginTop:4,
              paddingBottom:12,
            }}>
              {uniqueCards.map(([cardId, count], cardIndex) => {
                const card = CARD_DEFS[cardId];
                if (!card) return null;
                const cardCol = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
                const isAttack = card.tags.includes("attack");
                const isDefend = card.tags.includes("defend");
                const bobDelay = (cardIndex * 0.4) % 3;
                return (
                  <div key={cardId} className="deck-card" 
                    onMouseEnter={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onHoverCard?.({ card, cardCol, isAttack, isDefend, x: rect.left + rect.width/2, y: rect.top });
                    }}
                    onMouseLeave={() => onHoverCard?.(null)}
                    style={{
                    position:"relative", width:88, height:124,
                    background:`linear-gradient(160deg, #FFFEF8 0%, #F8F4E8 100%)`,
                    border:`2px solid ${cardCol.mid}`,
                    borderRadius:9,
                    padding:"7px 7px 6px",
                    boxSizing:"border-box",
                    overflow:"visible",
                    flexShrink:0,
                    boxShadow:`0 4px 12px rgba(0,0,0,0.3), 0 2px 0 ${cardCol.dark}, inset 0 1px 0 rgba(255,255,255,0.8)`,
                    fontFamily:"'Courier New', monospace",
                    animationDelay: `${bobDelay}s`,
                  }}>
                    {/* Energy cost pip */}
                    <div style={{
                      position:"absolute", top:4, right:4,
                      width:16, height:16, borderRadius:"50%",
                      background: card.energyCost===0 ? "#C8C0A8" : cardCol.mid,
                      color:"#fff", fontSize:11, fontWeight:900,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      border:`1.5px solid ${cardCol.dark}`,
                      lineHeight:1,
                    }}>{card.energyCost}</div>

                    {/* Count badge */}
                    {count > 1 && (
                      <div style={{
                        position:"absolute", top:4, left:4,
                        width:15, height:15, borderRadius:"50%",
                        background:"#302810", color:"#E8E8D0",
                        fontSize:12, fontWeight:900,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        border:"1.5px solid #605840",
                      }}>×{count}</div>
                    )}

                    {/* Type stripe */}
                    <div style={{
                      height:3, borderRadius:2, marginBottom:5, marginTop:2,
                      background:`linear-gradient(to right,${cardCol.light},${cardCol.mid})`,
                    }} />

                    {/* Type silhouette */}
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
                      <svg width={28} height={28} viewBox="0 0 100 100">
                        <path d={TYPE_SHAPES[card.type]||TYPE_SHAPES.colorless}
                          fill={cardCol.mid} opacity={0.65}/>
                      </svg>
                    </div>

                    {/* Card name */}
                    <div style={{
                      fontSize:8, fontWeight:900, color:"#302810",
                      textAlign:"center", lineHeight:1.2, marginBottom:3,
                      letterSpacing:"0.01em",
                    }}>
                      {card.name.toUpperCase()}
                    </div>

                    {/* Badge */}
                    <div style={{ textAlign:"center", marginBottom:4 }}>
                      <span style={{
                        fontSize:7, fontWeight:900, padding:"1px 4px", borderRadius:2,
                        background: isAttack?"#F09030":isDefend?"#5878F0":"#58A838",
                        color:"#fff", letterSpacing:"0.04em",
                      }}>
                        {isAttack?"ATK":isDefend?"DEF":"UTL"}
                      </span>
                    </div>

                    {/* Description — small hint, hover tooltip shows full text */}
                    <div style={{
                      fontSize:7, color:"#A09070", lineHeight:1.25,
                      textAlign:"center",
                      borderTop:`1px solid ${cardCol.mid}33`,
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
              })}
            </div>
          </div>
        )}
      </div>



      {/* Swap out button — shown if this is a party slot and there's a roster swap pending */}
      {partyIndex !== null && partyIndex !== undefined && (
        <div style={{
          padding:"10px 14px",
          borderTop:"1px solid #252514",
        }}>
          <div style={{ fontSize:12, color:"#907858", marginBottom:6, letterSpacing:"0.06em" }}>
            MOVE TO POSITION
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {[0,1,2,3,4,5].filter(i => i !== partyIndex).map(i => (
              <button
                key={i}
                onClick={() => onSwapOut(partyIndex, i)}
                style={{
                  fontFamily:"'Courier New', monospace",
                  fontSize:12, fontWeight:900,
                  background:"#706040", color:"#807860",
                  border:"1.5px solid #302818", borderRadius:4,
                  padding:"3px 8px", cursor:"pointer",
                  letterSpacing:"0.06em",
                }}
              >
                SLOT {i+1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function PartyScreen({ onClose }) {
  const isMobile = useIsMobile();
  const { run, dispatch } = useRun();
  const { party, roster } = run;
  const [hoveredCard, setHoveredCard] = useState(null);

  // Selection state: { source: "party"|"roster", index: number|defId }
  const [selection, setSelection]   = useState(null);
  const [dragFrom,  setDragFrom]    = useState(null);
  const [dragOver,  setDragOver]    = useState(null);

  // Bench = party slots 2–5 (may be empty)
  const partySlots = Array.from({ length: 6 }, (_, i) => party[i] ?? null);
  const rosterOnly = roster.filter(c => !party.some(p => p.defId === c.defId));

  // Selected creature object
  const selectedCreature = (() => {
    if (!selection) return null;
    if (selection.source === "party") return party[selection.index] ?? null;
    if (selection.source === "roster") return roster.find(c => c.defId === selection.index) ?? null;
    return null;
  })();
  const selectedPartyIndex = selection?.source === "party" ? selection.index : null;

  // ── Drag reorder ──
  function handleDragStart(slotIndex) {
    setDragFrom(slotIndex);
  }
  function handleDragOver(slotIndex) {
    setDragOver(slotIndex);
  }
  function handleDrop(targetIndex) {
    if (dragFrom === null || dragFrom === targetIndex) {
      setDragFrom(null); setDragOver(null); return;
    }
    const newOrder = [...party];
    const a = newOrder[dragFrom];
    const b = newOrder[targetIndex];
    newOrder[dragFrom]   = b ?? null;
    newOrder[targetIndex] = a ?? null;
    // Filter nulls for trailing empties, keep up to party length
    const filtered = newOrder.filter(Boolean);
    dispatch(RunActions.reorderParty(filtered));
    setDragFrom(null); setDragOver(null);
  }
  function handleDragEnd() {
    setDragFrom(null); setDragOver(null);
  }

  // ── Swap slot positions ──
  function handleSwapSlots(fromIdx, toIdx) {
    const newOrder = [...party];
    const a = newOrder[fromIdx] ?? null;
    const b = newOrder[toIdx]   ?? null;
    newOrder[fromIdx] = b;
    newOrder[toIdx]   = a;
    dispatch(RunActions.reorderParty(newOrder.filter(Boolean)));
    setSelection(null);
  }

  // ── Add roster creature to party ──
  function handleAddToParty(defId) {
    if (party.length >= 6) return;
    const creature = roster.find(c => c.defId === defId);
    if (!creature) return;
    const newParty = [...party, creature];
    dispatch(RunActions.reorderParty(newParty));
  }

  // ── Remove from party (send back to roster only) ──
  function handleRemoveFromParty(slotIndex) {
    if (party.length <= 1) return; // keep at least 1
    const newParty = party.filter((_, i) => i !== slotIndex);
    dispatch(RunActions.reorderParty(newParty));
    setSelection(null);
  }

  return (<>
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(10,10,8,0.96)",
      display:"flex", flexDirection:"column",
      fontFamily:"'Courier New', monospace",
    }}>

      {/* ── Header ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 16px",
        background:"#1a1a10", borderBottom:"2px solid #302818",
        flexShrink:0,
      }}>
        <div>
          <span style={{ fontSize:14, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.08em" }}>
            PARTY
          </span>
          <span style={{ fontSize:13, color:"#A08868", marginLeft:12, letterSpacing:"0.06em" }}>
            {party.length}/6 · Drag slots to reorder · First 2 fight
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            fontFamily:"'Courier New', monospace",
            fontSize:11, fontWeight:900,
            background:"#706040", color:"#807860",
            border:"2px solid #302818", borderRadius:5,
            padding:"5px 14px", cursor:"pointer", letterSpacing:"0.08em",
          }}
        >
          CLOSE ✕
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, display:"flex", flexDirection: isMobile ? "column" : "row", overflow:"hidden" }}>

        {/* Left: Party + Roster */}
        <div style={{
          width: isMobile ? "100%" : 340, flexShrink:0,
          overflowY:"auto",
          padding:"14px",
          borderRight: isMobile ? "none" : "2px solid #252514",
          borderBottom: isMobile ? "2px solid #252514" : "none",
          display:"flex", flexDirection:"column", gap:10,
          maxHeight: isMobile ? "50%" : "none",
        }}>

          {/* Active label */}
          <div style={{ fontSize:11, color:"#E84040", letterSpacing:"0.12em", fontWeight:900 }}>
            ▸ ACTIVE IN COMBAT (slots 1–2)
          </div>

          {/* Slots 0–1 */}
          {[0,1].map(i => (
            <PartySlot
              key={i}
              creature={partySlots[i]}
              slotIndex={i}
              isActive={true}
              isEmpty={!partySlots[i]}
              isSelected={selection?.source === "party" && selection?.index === i}
              isDragOver={dragOver === i}
              onSelect={setSelection.bind(null, { source:"party", index:i })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dragFrom={dragFrom}
            />
          ))}

          {/* Bench label */}
          <div style={{ fontSize:11, color:"#A08868", letterSpacing:"0.12em", fontWeight:900, marginTop:4 }}>
            ▸ BENCH (slots 3–6)
          </div>

          {/* Slots 2–5 */}
          {[2,3,4,5].map(i => (
            <PartySlot
              key={i}
              creature={partySlots[i]}
              slotIndex={i}
              isActive={false}
              isEmpty={!partySlots[i]}
              isSelected={selection?.source === "party" && selection?.index === i}
              isDragOver={dragOver === i}
              onSelect={setSelection.bind(null, { source:"party", index:i })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dragFrom={dragFrom}
            />
          ))}

          {/* Remove from party */}
          {selection?.source === "party" && party[selection.index] && party.length > 1 && (
            <button
              onClick={() => handleRemoveFromParty(selection.index)}
              style={{
                fontFamily:"'Courier New', monospace",
                fontSize:13, fontWeight:900,
                background:"transparent", color:"#803030",
                border:"1.5px solid #802020", borderRadius:5,
                padding:"5px", cursor:"pointer", letterSpacing:"0.08em",
                marginTop:4,
              }}
            >
              REMOVE FROM PARTY
            </button>
          )}

          {/* Roster section */}
          {rosterOnly.length > 0 && (
            <>
              <div style={{ fontSize:11, color:"#A08868", letterSpacing:"0.12em", fontWeight:900, marginTop:8 }}>
                ▸ ROSTER — NOT IN PARTY ({rosterOnly.length})
              </div>
              {rosterOnly.map(c => (
                <RosterCard
                  key={c.defId}
                  creature={c}
                  isInParty={false}
                  isSelected={selection?.source === "roster" && selection?.index === c.defId}
                  onSelect={(id) => setSelection({ source:"roster", index:id })}
                  onAddToParty={handleAddToParty}
                  partyFull={party.length >= 6}
                />
              ))}
            </>
          )}
        </div>

        {/* Right: Detail panel */}
        <div style={{ flex:1, overflow:"visible", display:"flex", flexDirection:"column", minWidth:0 }}>
          <DetailPanel
            creature={selectedCreature}
            partyIndex={selectedPartyIndex}
            onSwapOut={handleSwapSlots}
            onHoverCard={setHoveredCard}
          />
        </div>
      </div>
    </div>

    {/* Card tooltip — rendered at screen level so it's never clipped */}
    {hoveredCard && (
      <CardTooltip
        card={hoveredCard.card}
        cardCol={hoveredCard.cardCol}
        isAttack={hoveredCard.isAttack}
        isDefend={hoveredCard.isDefend}
        x={hoveredCard.x}
        y={hoveredCard.y}
        creature={selectedCreature}
      />
    )}
  </>);
}
