import { useState, useEffect, useRef, useCallback } from "react";
import {
  applyRelicDamageBonus, applyRelicHitBonus,
  getRelicExtraDraws, getRelicOnHitStatuses, applyRelicDrainBonus,
} from "./relicEngine.js";
import { runEnemyTurn, BASE_ENERGY_PER_TURN, playCard, checkFaints, TYPE_CHART } from "./combatEngine.js";
import { CARD_DEFS as IMPORTED_CARD_DEFS } from "./cardDefs.js";

// ─── MOCK DATA ───────────────────────────────────────────────

const TYPE_COLORS = {
  fire:      { light:"#FF9741", mid:"#DD6610", dark:"#7A2410", bg:"#FFF4EE", badge:"#FFD4B8" },
  water:     { light:"#74BCFF", mid:"#2B7FE8", dark:"#0E3577", bg:"#EEF5FF", badge:"#B8D8FF" },
  earth:     { light:"#A8D070", mid:"#4A8C2A", dark:"#1A4A08", bg:"#F0F7E8", badge:"#C8E8A8" },
  wind:      { light:"#AAC8FF", mid:"#6070C8", dark:"#283080", bg:"#F0F2FF", badge:"#C8D0F8" },
  shadow:    { light:"#C880FF", mid:"#7038A8", dark:"#2A1050", bg:"#F4EEFF", badge:"#D8B8F8" },
  light:     { light:"#FFD060", mid:"#C89010", dark:"#604000", bg:"#FFFBEE", badge:"#FFE898" },
  colorless: { light:"#C8C8C8", mid:"#888888", dark:"#333333", bg:"#F5F5F5", badge:"#DDDDDD" },
};

const TYPE_SHAPES = {
  fire:   "M60,20 C60,20 70,40 55,55 C70,45 80,60 65,75 C75,65 85,75 75,90 C90,75 95,55 80,40 C90,50 85,30 75,25 C80,15 70,5 60,20Z M45,60 C45,60 50,70 42,80 C50,72 55,78 50,88 C58,78 60,65 52,55 C56,60 54,48 45,60Z",
  water:  "M50,15 C50,15 65,35 65,55 A15,15 0 0,1 35,55 C35,35 50,15 50,15Z M30,50 C30,50 40,65 40,78 A10,10 0 0,1 20,78 C20,65 30,50 30,50Z M70,50 C70,50 80,65 80,78 A10,10 0 0,1 60,78 C60,65 70,50 70,50Z",
  earth:  "M20,80 L50,20 L80,80Z M35,75 L50,45 L65,75Z M15,90 L35,90 L25,70Z M65,90 L85,90 L75,70Z",
  wind:   "M15,50 C25,35 45,30 55,50 C45,42 50,55 40,65 C55,55 65,65 55,80 C70,65 75,45 60,35 C75,40 85,25 70,20 C80,12 70,5 60,15 C55,8 45,5 40,15 C25,10 15,25 15,50Z",
  shadow: "M50,10 L58,35 L85,35 L63,52 L72,78 L50,62 L28,78 L37,52 L15,35 L42,35Z",
  light:  "M50,15 L55,38 L78,30 L62,48 L78,65 L55,58 L50,80 L45,58 L22,65 L38,48 L22,30 L45,38Z M50,28 L53,40 L65,36 L56,45 L62,56 L51,52 L50,63 L49,52 L38,56 L44,45 L35,36 L47,40Z",
  colorless: "M25,25 L75,25 L75,75 L25,75Z",
};

const STATUS_META = {
  ignite:   { label:"Ignite",   color:"#DD6610", icon:"🔥", desc:"Burns each turn, dealing damage" },
  poison:   { label:"Poison",   color:"#4a8c2a", icon:"☠",  desc:"Poisons each turn, dealing damage" },
  shield:   { label:"Shield",   color:"#2B7FE8", icon:"🛡",  desc:"Absorbs incoming damage" },
  fortify:  { label:"Fortify",  color:"#8c6a2a", icon:"🪨",  desc:"Reduces damage taken" },
  flow:     { label:"Flow",     color:"#2b9dd9", icon:"💧",  desc:"Boosts card draw each turn" },
  gust:     { label:"Gust",     color:"#6070C8", icon:"🌀",  desc:"Increases attack damage" },
  radiance: { label:"Radiance", color:"#C89010", icon:"✨",  desc:"Heals a small amount each turn" },
  stun:     { label:"Stun",     color:"#888888", icon:"⚡",  desc:"Skips this creature's next turn" },
  slow:     { label:"Slow",     color:"#888888", icon:"🐢",  desc:"Reduces energy available each turn" },
  weak:     { label:"Weak",     color:"#c05050", icon:"💔",  desc:"Reduces damage dealt" },
  blind:    { label:"Blind",    color:"#555555", icon:"👁",  desc:"Attacks have a chance to miss" },
  evasion:  { label:"Evasion",  color:"#6070C8", icon:"💨",  desc:"Chance to dodge incoming attacks" },
};

const MOCK_STATE = {
  turn: 1, phase: "player", sharedEnergy: 3,
  log: ["A wild FROSTVEIL appeared!", "EMBERFOX, I choose you!", "What will EMBERFOX do?"],
  player: {
    active: [
      {
        creature: {
          name:"EMBERFOX", type:"fire", level:18, stage:"Adult",
          currentHp:46, maxHp:58, armorClass:12, xp:28, xpNext:35,
          stats:{ strength:12, dexterity:15, intelligence:11, constitution:11, wisdom:9 },
          statusEffects:[{ type:"ignite", stacks:2 }],
        },
        hand:["ember_strike","cinder_toss","heat_up","flame_shield","stoke"],
        drawPile:["quick_burn","smolder","ash_wall","focus"], discardPile:[],
      },
      {
        creature: {
          name:"STONEPUP", type:"earth", level:12, stage:"Baby",
          currentHp:45, maxHp:68, armorClass:13, xp:10, xpNext:15,
          stats:{ strength:13, dexterity:8, intelligence:10, constitution:16, wisdom:11 },
          statusEffects:[{ type:"fortify", stacks:3 }],
        },
        hand:["bedrock","rockwall","stone_strike","earthen_skin","mud_slick"],
        drawPile:["quake","dust_cloud","focus"], discardPile:["bedrock"],
      },
    ],
    bench:[
      { name:"DUSKRAT",   type:"shadow", level:8,  currentHp:56, maxHp:56 },
      { name:"GLOWPUP",   type:"light",  level:10, currentHp:60, maxHp:60 },
      { name:"BREEZEKIT", type:"wind",   level:7,  currentHp:52, maxHp:52 },
      { name:"TIDEPUP",   type:"water",  level:9,  currentHp:65, maxHp:65 },
    ],
  },
  enemy: {
    active: [
      {
        creature: {
          name:"FROSTVEIL", type:"water", level:20, stage:"Adult",
          currentHp:28, maxHp:55, armorClass:11, xp:0, xpNext:35,
          stats:{ strength:11, dexterity:11, intelligence:15, constitution:13, wisdom:14 },
          statusEffects:[{ type:"poison", stacks:3 }],
        },
        hand:[], drawPile:[], discardPile:[],
      },
      {
        creature: {
          name:"CINDERGRUB", type:"fire", level:14, stage:"Baby",
          currentHp:70, maxHp:70, armorClass:14, xp:0, xpNext:15,
          stats:{ strength:13, dexterity:8, intelligence:10, constitution:16, wisdom:10 },
          statusEffects:[],
        },
        hand:[], drawPile:[], discardPile:[],
      },
    ],
    bench:[
      { name:"MUDCRAWLER",  type:"earth",  level:11, currentHp:62, maxHp:62 },
      { name:"WRAITHHOUND", type:"shadow", level:13, currentHp:58, maxHp:58 },
    ],
  },
};

const MOCK_CARDS_PARTIAL = {
  ember_strike: { id:"ember_strike", name:"Ember Strike", type:"fire", energyCost:1, rarity:"common", tags:["attack"], scalingStat:"strength", baseDamage:9, description:"Deal 9 damage." },
  cinder_toss:  { id:"cinder_toss",  name:"Cinder Toss",  type:"fire", energyCost:1, rarity:"common", tags:["attack","status"], scalingStat:"strength", baseDamage:7, description:"Deal 7 dmg. Apply 1 Ignite." },
  heat_up:      { id:"heat_up",      name:"Heat Up",      type:"fire", energyCost:1, rarity:"common", tags:["status"], scalingStat:"intelligence", baseDamage:0, description:"Apply 2 Ignite to target." },
  flame_shield: { id:"flame_shield", name:"Flame Shield", type:"fire", energyCost:1, rarity:"common", tags:["defend"], scalingStat:"constitution", shieldAmount:6, description:"Gain 6 Shield. Thorns 2." },
  stoke:        { id:"stoke",        name:"Stoke",        type:"fire", energyCost:0, rarity:"common", tags:["attack","utility"], scalingStat:"intelligence", drawAmount:1, description:"Draw 1. Ignite bonus 3 dmg." },
  quick_burn:   { id:"quick_burn",   name:"Quick Burn",   type:"fire", energyCost:1, rarity:"common", tags:["attack","multi_hit"], scalingStat:"dexterity", baseDamage:3, description:"Deal 3 damage twice." },
  smolder:      { id:"smolder",      name:"Smolder",      type:"fire", energyCost:1, rarity:"common", tags:["status","aoe"], scalingStat:"intelligence", baseDamage:0, description:"Apply 1 Ignite all enemies." },
  ash_wall:     { id:"ash_wall",     name:"Ash Wall",     type:"fire", energyCost:2, rarity:"common", tags:["defend"], scalingStat:"constitution", shieldAmount:10, description:"Gain 10 Shield." },
  focus:        { id:"focus",        name:"Focus",        type:"colorless", energyCost:1, rarity:"common", tags:["utility"], scalingStat:"intelligence", drawAmount:2, description:"Draw 2 cards." },
  bedrock:      { id:"bedrock",      name:"Bedrock",      type:"earth", energyCost:1, rarity:"common", tags:["defend","keyword"], scalingStat:"constitution", description:"Gain 2 Fortify." },
  rockwall:     { id:"rockwall",     name:"Rock Wall",    type:"earth", energyCost:1, rarity:"common", tags:["defend","keyword"], scalingStat:"constitution", shieldAmount:8, description:"Gain 8 Shield + 1 Fortify." },
  stone_strike: { id:"stone_strike", name:"Stone Strike", type:"earth", energyCost:1, rarity:"common", tags:["attack"], scalingStat:"strength", baseDamage:9, description:"Deal 9 damage." },
  earthen_skin: { id:"earthen_skin", name:"Earthen Skin", type:"earth", energyCost:2, rarity:"common", tags:["defend","keyword"], scalingStat:"constitution", shieldAmount:6, description:"Gain 3 Fortify + 6 Shield." },
  mud_slick:    { id:"mud_slick",    name:"Mud Slick",    type:"earth", energyCost:1, rarity:"common", tags:["status","control"], scalingStat:"intelligence", baseDamage:0, description:"Apply Slow (1) to target." },
};

// Merge real card defs over the mock set so all 146 cards are available
const MOCK_CARDS = { ...MOCK_CARDS_PARTIAL, ...IMPORTED_CARD_DEFS };

// ─── HELPERS ─────────────────────────────────────────────────

function hpPercent(cur, max) { return Math.max(0, Math.min(100, (cur / max) * 100)); }
function hpBarColor(pct) {
  if (pct > 50) return "#40C850";
  if (pct > 20) return "#F8D030";
  return "#F85840";
}

// ─── CREATURE SILHOUETTE ─────────────────────────────────────

function CreatureSilhouette({ type, size = 96, flip = false, fainted = false, pulse = false }) {
  const col = TYPE_COLORS[type] || TYPE_COLORS.colorless;
  const shape = TYPE_SHAPES[type] || TYPE_SHAPES.colorless;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{
      transform: flip ? "scaleX(-1)" : "none",
      filter: fainted
        ? "grayscale(1) opacity(0.25)"
        : `drop-shadow(0 6px 14px ${col.mid}88)`,
      animation: pulse ? "pokePulse 0.6s ease-in-out" : "none",
      transition:"filter 0.3s",
    }}>
      <defs>
        <linearGradient id={`grad-${type}-${flip}`} x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor={col.light} />
          <stop offset="100%" stopColor={col.mid} />
        </linearGradient>
      </defs>
      <path d={shape}
        fill={`url(#grad-${type}-${flip})`}
        stroke={col.dark} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round"
      />
    </svg>
  );
}

// ─── POKÉMON-STYLE HP BAR PANEL ──────────────────────────────

function HPPanel({ creature, isEnemy, showXP = false, slot = null }) {
  const col    = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;
  const pct    = hpPercent(creature.currentHp, creature.maxHp);
  const barCol = hpBarColor(pct);
  const xpPct  = (creature.xp && creature.xpNext) ? (creature.xp / creature.xpNext) * 100 : 0;
  const fainted = creature.currentHp <= 0;

  return (
    <div style={{
      background: isEnemy ? "#1A1A14" : "#F5F3E8",
      border: `2.5px solid ${col.mid}`,
      borderRadius: 10,
      padding: "9px 13px 10px",
      minWidth: 200,
      boxSizing: "border-box",
      boxShadow: isEnemy
        ? `0 4px 18px ${col.mid}33, inset 0 1px 0 rgba(255,255,255,0.05)`
        : `0 4px 18px ${col.mid}22, inset 0 1px 0 rgba(255,255,255,0.7), 2px 3px 0 ${col.mid}33`,
      opacity: fainted ? 0.5 : 1,
      transition: "opacity 0.3s",
    }}>
      {/* Type accent stripe */}
      <div style={{
        height: 3, borderRadius: 2, marginBottom: 8,
        background: `linear-gradient(to right, ${col.light}, ${col.mid}, ${col.dark})`,
      }} />

      {/* Name row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{
          fontSize: 14, fontWeight: 900,
          color: isEnemy ? col.light : "#2A1E08",
          letterSpacing: "0.02em",
          textShadow: isEnemy ? `0 0 12px ${col.mid}66` : "none",
        }}>
          {creature.name}
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {/* AC badge */}
          <span style={{
            fontSize: 9, fontWeight: 900,
            background: isEnemy ? col.dark : col.mid,
            color: "#fff",
            borderRadius: 4, padding: "2px 6px",
            letterSpacing: "0.06em",
          }}>AC {creature.armorClass}</span>
          {/* Level badge */}
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: isEnemy ? "#807860" : "#605840",
          }}>Lv{creature.level}</span>
        </div>
      </div>

      {/* Status effects — only rendered when there are effects */}
      {creature.statusEffects.length > 0 && (
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:6, alignItems:"center" }}>
        {creature.statusEffects.map((e, i) => {
              const m = STATUS_META[e.type] || { color:"#888", icon:"?", label:"Unknown", desc:"" };
              const tipLabel = `${m.label}${e.stacks > 1 ? ` ×${e.stacks}` : ""}${m.desc ? ` — ${m.desc}` : ""}`;
              return (
                <Tip key={i} label={tipLabel}>
                  <span style={{
                    fontSize:11, fontWeight:900, padding:"2px 6px",
                    background: m.color, color:"#fff",
                    borderRadius:4, letterSpacing:"0.02em",
                    border:`1px solid ${m.color}cc`,
                    cursor:"default",
                    display:"inline-flex", alignItems:"center", gap:2,
                    boxShadow:`0 2px 4px ${m.color}55`,
                  }}>
                    <span style={{fontSize:13}}>{m.icon}</span>
                    {e.stacks > 1 && (
                      <span style={{fontSize:9, fontWeight:900}}>×{e.stacks}</span>
                    )}
                  </span>
                </Tip>
              );
            })
        }
      </div>
      )}

      {/* HP bar row */}
      <div style={{ marginBottom:3 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:3 }}>
          <span style={{
            fontSize:8, fontWeight:900,
            color: isEnemy ? "#807860" : "#505040",
            letterSpacing:"0.1em",
          }}>HP</span>
          <span style={{
            fontSize:12, fontWeight:900,
            color: isEnemy ? "#E8E8D0" : "#2A1E08",
          }}>
            {creature.currentHp}
            <span style={{ fontSize:9, fontWeight:500, color: isEnemy ? "#605840" : "#907860" }}>
              /{creature.maxHp}
            </span>
          </span>
        </div>
        <div style={{
          height:8, background: isEnemy ? "#0A0A06" : "#C8C0A0",
          borderRadius:4, overflow:"hidden",
          border:`1px solid ${isEnemy ? "#302818" : "#A09878"}`,
        }}>
          <div style={{
            height:"100%", width:`${pct}%`,
            background:`linear-gradient(to right, ${barCol}cc, ${barCol})`,
            borderRadius:4,
            transition:"width 0.45s ease",
            boxShadow:`0 0 6px ${barCol}88`,
          }} />
        </div>
      </div>

      {/* XP bar — player only */}
      {showXP && (
        <div style={{ marginTop:4 }}>
          <div style={{
            height:3, background:"#C8C0A0",
            borderRadius:2, overflow:"hidden",
          }}>
            <div style={{
              height:"100%", width:`${xpPct}%`,
              background:`linear-gradient(to right, #60A8F0, #4070D8)`,
              transition:"width 0.5s ease",
              boxShadow:"0 0 4px #4898F088",
            }} />
          </div>
        </div>
      )}

      {/* Card counts row — inside the panel */}
      {slot && (
        <div style={{
          display:"flex", gap:4,
          justifyContent: "space-between",
          alignItems:"center",
          marginTop:7,
          paddingTop:6,
          borderTop:`1px solid ${isEnemy ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        }}>
          <Tip label="Cards in hand">
            <div style={{
              display:"flex", alignItems:"center", gap:3,
              background: isEnemy ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              borderRadius:5, padding:"3px 7px",
              fontSize:11, fontWeight:900,
              color: isEnemy ? "#C8C8B0" : "#302810",
              letterSpacing:"0.02em",
            }}>
              <span style={{fontSize:13}}>✋</span>
              <span>{slot.hand.length}</span>
            </div>
          </Tip>
          <Tip label="Cards in deck">
            <div style={{
              display:"flex", alignItems:"center", gap:3,
              background: isEnemy ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              borderRadius:5, padding:"3px 7px",
              fontSize:11, fontWeight:900,
              color: isEnemy ? "#C8C8B0" : "#302810",
              letterSpacing:"0.02em",
            }}>
              <span style={{fontSize:13}}>📚</span>
              <span>{slot.drawPile.length}</span>
            </div>
          </Tip>
          <Tip label="Cards in discard">
            <div style={{
              display:"flex", alignItems:"center", gap:3,
              background: isEnemy ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              borderRadius:5, padding:"3px 7px",
              fontSize:11, fontWeight:900,
              color: isEnemy ? "#C8C8B0" : "#302810",
              letterSpacing:"0.02em",
            }}>
              <span style={{fontSize:13}}>🗑</span>
              <span>{slot.discardPile.length}</span>
            </div>
          </Tip>
        </div>
      )}
    </div>
  );
}

// ─── TOOLTIP HELPER ─────────────────────────────────────────

function Tip({ label, children }) {
  return (
    <span className="tip-wrap">
      {children}
      <span className="tip-box">{label}</span>
    </span>
  );
}

// ─── BATTLEFIELD SLOT ────────────────────────────────────────

function BattleSlot({ slot, isEnemy, isTargeted, isGlowing, onClick }) {
  const { creature } = slot;
  const fainted = creature.currentHp <= 0;
  const col = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;

  return (
    <div
      onClick={isTargeted && !fainted ? onClick : undefined}
      style={{
        display:"flex",
        flexDirection: isEnemy ? "row-reverse" : "row",
        alignItems:"flex-end",
        gap:10,
        cursor: isTargeted && !fainted ? "pointer" : "default",
        padding:6,
        borderRadius:10,
        background: isTargeted ? `${col.mid}18` : "transparent",
        outline: isGlowing
          ? "4px solid #F8D030"
          : isTargeted && !fainted
          ? `3px solid ${col.mid}`
          : "none",
        outlineOffset: 3,
        transition:"all 0.15s",
        position:"relative",
      }}
    >
      {isTargeted && !fainted && (
        <div style={{
          position:"absolute",
          top: isEnemy ? -22 : "auto",
          bottom: isEnemy ? "auto" : -22,
          left:"50%", transform:"translateX(-50%)",
          fontSize:9, fontWeight:900,
          color: col.light,
          background: col.dark,
          border:`2px solid ${col.mid}`,
          borderRadius:4, padding:"2px 8px",
          whiteSpace:"nowrap", zIndex:20,
          letterSpacing:"0.1em",
        }}>
          {isEnemy ? "▼ TARGET" : "▲ TARGET"}
        </div>
      )}

      <CreatureSilhouette
        type={creature.type}
        size={isEnemy ? 86 : 98}
        flip={isEnemy}
        fainted={fainted}
      />

      <div>
        <HPPanel creature={creature} isEnemy={isEnemy} showXP={!isEnemy} slot={slot} />

      </div>
    </div>
  );
}

// ─── FOE BENCH LIST (slim vertical strip, sits outside creature area) ──

function FoeBenchList({ bench }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:3,
      background:"rgba(216,208,192,0.82)",
      border:"2px solid #A09880",
      borderRadius:6,
      padding:"5px 6px",
      backdropFilter:"blur(2px)",
      minWidth:52,
    }}>
      <span style={{
        fontSize:7, fontWeight:900, color:"#605840",
        letterSpacing:"0.12em", textAlign:"center", marginBottom:1,
      }}>FOE</span>
      {bench.length === 0 && (
        <span style={{ fontSize:8, color:"#C0B898", fontStyle:"italic", textAlign:"center" }}>—</span>
      )}
      {bench.map((c, i) => {
        const col = TYPE_COLORS[c.type] || TYPE_COLORS.colorless;
        const pct = hpPercent(c.currentHp, c.maxHp);
        return (
          <div key={i} title={`${c.name} Lv${c.level} — ${c.currentHp}/${c.maxHp} HP`} style={{
            display:"flex", alignItems:"center", gap:4,
            background:"rgba(255,254,240,0.9)",
            border:"1.5px solid #C8C0A0", borderRadius:4,
            padding:"2px 5px",
          }}>
            {/* Type dot */}
            <div style={{
              width:7, height:7, borderRadius:"50%",
              background:col.mid, flexShrink:0,
            }} />
            {/* Name + HP bar stacked */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:7.5, fontWeight:900, color:"#302810",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>{c.name}</div>
              <div style={{
                height:3, background:"#685840", borderRadius:2, overflow:"hidden", marginTop:1,
              }}>
                <div style={{
                  height:"100%", width:`${pct}%`,
                  background: hpBarColor(pct), borderRadius:2,
                }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PLAYER BENCH BAR (horizontal strip, bottom-right) ───────

function PlayerBenchBar({ bench }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:4,
      background:"rgba(216,208,192,0.82)",
      border:"2px solid #A09880",
      borderRadius:6, padding:"5px 8px",
      backdropFilter:"blur(2px)",
    }}>
      <span style={{ fontSize:7, fontWeight:900, color:"#605840", letterSpacing:"0.12em", textAlign:"center" }}>
        PARTY
      </span>
      <div style={{ display:"flex", gap:4 }}>
        {bench.length === 0 && (
          <span style={{ fontSize:9, color:"#C0B898", fontStyle:"italic" }}>—</span>
        )}
        {bench.map((c, i) => {
          const col = TYPE_COLORS[c.type] || TYPE_COLORS.colorless;
          const pct = hpPercent(c.currentHp, c.maxHp);
          return (
            <div key={i} title={`${c.name} Lv${c.level}`} style={{
              display:"flex", flexDirection:"column", alignItems:"center",
              gap:2, background:"rgba(255,254,240,0.9)",
              border:"1.5px solid #C8C0A0", borderRadius:4,
              padding:"3px 5px", minWidth:50,
            }}>
              <svg width={14} height={14} viewBox="0 0 100 100">
                <path d={TYPE_SHAPES[c.type]} fill={col.mid} />
              </svg>
              <span style={{ fontSize:7.5, fontWeight:900, color:"#302810", lineHeight:1, textAlign:"center" }}>
                {c.name.slice(0,6)}
              </span>
              <div style={{ width:32, height:3, background:"#685840", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:hpBarColor(pct), borderRadius:2 }} />
              </div>
              <span style={{ fontSize:7, color:"#807860" }}>Lv{c.level}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CARD VISUAL (shared between idle and dragging ghost) ────

function CardFace({ card, col, isSelected, isDragging, effectiveCost }) {
  const isAttack = card.tags.includes("attack");
  const isDefend = card.tags.includes("defend");
  return (
    <div style={{
      width:58, height:78, position:"relative", overflow:"hidden",
      background: isDragging ? col.bg : isSelected ? col.bg : "#FFFEF5",
      border:`2.5px solid ${isDragging || isSelected ? col.mid : "#C8C0A0"}`,
      borderRadius:7,
      padding:"5px 5px 4px",
      boxSizing:"border-box",
      boxShadow: isDragging
        ? `0 16px 40px ${col.mid}88, 0 4px 0 ${col.dark}`
        : isSelected
        ? `0 8px 20px ${col.mid}55, 0 2px 0 ${col.dark}`
        : "0 2px 0 #C8C0A0",
      userSelect:"none",
    }}>
      {/* Energy pip — shows effective cost after Flow discount */}
      {(() => {
        const ec = effectiveCost ?? card.energyCost;
        const discounted = ec < card.energyCost;
        return (
          <div style={{
            position:"absolute", top:3, right:3,
            width:16, height:16, borderRadius:"50%",
            background: ec === 0 ? "#E8E0C8" : discounted ? "#2B7FE8" : col.mid,
            color: ec === 0 ? "#807860" : "#fff",
            fontSize:9, fontWeight:900,
            display:"flex", alignItems:"center", justifyContent:"center",
            border:`2.5px solid ${ec === 0 ? "#B0A880" : discounted ? "#0E3577" : col.dark}`,
            boxShadow: discounted ? "0 0 6px #2B7FE888" : "0 1px 4px rgba(0,0,0,0.2)",
            textDecoration: discounted ? "line-through" : "none",
          }}>{ec}</div>
        );
      })()}
      {/* Type stripe */}
      <div style={{ height:4, borderRadius:2, marginBottom:6, background:`linear-gradient(to right, ${col.light}, ${col.mid})` }} />
      {/* Silhouette */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:4 }}>
        <svg width={20} height={20} viewBox="0 0 100 100">
          <path d={TYPE_SHAPES[card.type] || TYPE_SHAPES.colorless} fill={col.mid} opacity={0.6} />
        </svg>
      </div>
      {/* Name */}
      <div style={{ fontSize:7, fontWeight:900, color:"#302810", textAlign:"center", lineHeight:1.1, marginBottom:2, letterSpacing:"0.02em" }}>
        {card.name.toUpperCase()}
      </div>
      {/* Badge */}
      <div style={{ textAlign:"center", marginBottom:5 }}>
        <span style={{
          fontSize:7, fontWeight:900, padding:"1px 4px", borderRadius:3, letterSpacing:"0.05em",
          background: isAttack ? "#F09030" : isDefend ? "#5878F0" : "#58A838", color:"#fff",
        }}>{isAttack ? "ATK" : isDefend ? "DEF" : "UTL"}</span>
      </div>
      {/* Desc */}
      <div style={{ fontSize:7, color:"#605840", lineHeight:1.3, textAlign:"center", borderTop:"1px solid #E0D8B8", paddingTop:3 }}>
        {card.description}
      </div>
    </div>
  );
}

// ─── DRAGGABLE CARD ──────────────────────────────────────────

function DraggableCard({ cardId, slotIdx, isSelected, isPlayable, bobDelay, effectiveCost, onDragStart, onDragEnd, onDragMove, onClick }) {
  const card = MOCK_CARDS[cardId];
  if (!card) return null;
  const col    = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
  const ref    = useRef(null);
  const dragging = useRef(false);
  const startPos = useRef({ x:0, y:0 });

  // Keep latest callback refs so mouse handlers always call current versions
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef  = useRef(onDragMove);
  const onDragEndRef   = useRef(onDragEnd);
  const onClickRef     = useRef(onClick);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
    onDragMoveRef.current  = onDragMove;
    onDragEndRef.current   = onDragEnd;
    onClickRef.current     = onClick;
  });

  function handleMouseDown(e) {
    if (!isPlayable) return;
    e.preventDefault();
    dragging.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    function onMove(mv) {
      const dx = mv.clientX - startPos.current.x;
      const dy = mv.clientY - startPos.current.y;
      if (!dragging.current && Math.sqrt(dx*dx+dy*dy) > 6) {
        dragging.current = true;
        const rect = ref.current?.getBoundingClientRect();
        const cx = rect ? rect.left + rect.width/2 : mv.clientX;
        const cy = rect ? rect.top  + rect.height/2 : mv.clientY;
        onDragStartRef.current({ cardId, slotIdx, originX: cx, originY: cy });
      }
      if (dragging.current) {
        onDragMoveRef.current({ x: mv.clientX, y: mv.clientY });
      }
    }
    function onUp(up) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
      if (dragging.current) {
        onDragEndRef.current({ x: up.clientX, y: up.clientY });
        dragging.current = false;
      } else {
        onClickRef.current();
      }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      data-card-id={cardId}
      data-slot-idx={slotIdx}
      style={{
        flexShrink:0,
        cursor: isPlayable ? "grab" : "not-allowed",
        opacity: isPlayable ? 1 : 0.4,
        transform: isSelected ? "translateY(-18px) scale(1.07)" : "translateY(0)",
        transition:"transform 0.15s ease, opacity 0.15s",
        animation: isPlayable && !isSelected ? `cardBob 2.4s ease-in-out ${bobDelay}s infinite` : "none",
        position:"relative", zIndex: isSelected ? 10 : 1,
      }}
    >
      <CardFace card={card} col={col} isSelected={isSelected} isDragging={false} effectiveCost={effectiveCost} />
    </div>
  );
}

// ─── RELIC BAR ───────────────────────────────────────────────

function RelicBar({ relicIds }) {
  if (!relicIds || relicIds.length === 0) return null;
  // Import relic names inline from the small lookup we have available
  const RELIC_NAMES = {
    ember_core:"Ember Core", tide_stone:"Tide Stone", iron_shell:"Iron Shell",
    gale_feather:"Gale Feather", void_shard:"Void Shard", dawn_crystal:"Dawn Crystal",
    lucky_coin:"Lucky Coin", sharp_claw:"Sharp Claw", war_drum:"War Drum",
    heart_stone:"Heart Stone", thorn_bark:"Thorn Bark", adrenaline_shard:"Adrenaline Shard",
    quick_draw:"Quick Draw", iron_will:"Iron Will", poison_fang:"Poison Fang",
    echo_stone:"Echo Stone", glass_cannon:"Glass Cannon", ancient_tome:"Ancient Tome",
    berserker_ring:"Berserker Ring", momentum_gem:"Momentum Gem",
  };
  return (
    <div style={{
      display:"flex", gap:5, flexWrap:"wrap",
      padding:"6px 10px",
      background:"#E0DCC8",
      border:"2px solid #A0987A",
      borderRadius:6,
      marginBottom:8,
      fontFamily:"'Courier New', monospace",
    }}>
      <span style={{ fontSize:7, fontWeight:900, color:"#605840", letterSpacing:"0.1em", alignSelf:"center" }}>
        RELICS
      </span>
      {relicIds.map(id => (
        <span key={id} style={{
          fontSize:8, fontWeight:900,
          background:"#C8C0A0", color:"#302810",
          border:"1.5px solid #A09070",
          borderRadius:3, padding:"1px 6px",
          letterSpacing:"0.04em",
        }}>
          ✦ {RELIC_NAMES[id] ?? id}
        </span>
      ))}
    </div>
  );
}

// ─── BATTLE TEXT BOX ─────────────────────────────────────────

function BattleTextBox({ log, selectedCard, targetingMode, onPlay, onCancel, onEndTurn, isPlayerTurn, isEnemyStep, onAdvanceQueue, energy }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);

  return (
    <div style={{
      background:"#E8E8D0",
      border:"4px solid #807860",
      borderRadius:8,
      padding:"12px 14px 10px",
      boxShadow:"inset 0 1px 0 rgba(255,255,255,0.55), 3px 3px 0 rgba(128,120,96,0.35)",
    }}>
      {/* Log */}
      <div ref={ref} style={{
        height:50, overflowY:"auto",
        fontSize:13, color:"#302810",
        lineHeight:1.65, marginBottom:10,
      }}>
        <div style={{ opacity:0.45, fontSize:11 }}>{log[log.length - 2] || ""}</div>
        <div style={{ fontWeight:700 }}>▸ {log[log.length - 1] || ""}</div>
      </div>

      {/* Controls */}
      <div style={{
        borderTop:"2px solid #C8C0A0",
        paddingTop:9,
        display:"flex", alignItems:"center", gap:7, flexWrap:"wrap",
      }}>
        {selectedCard && !targetingMode && (
          <PokeButton color="#38A018" dark="#185808" onClick={onPlay}>
            USE MOVE
          </PokeButton>
        )}
        {selectedCard && (
          <PokeButton color="#D8C068" dark="#907820" textColor="#302810" onClick={onCancel}>
            BACK
          </PokeButton>
        )}
        {!selectedCard && isPlayerTurn && (
          <PokeButton color="#E83020" dark="#801808" onClick={onEndTurn}>
            END TURN ▶
          </PokeButton>
        )}

        {isEnemyStep && (
          <PokeButton color="#2060C8" dark="#0A2870" onClick={onAdvanceQueue}>
            CONTINUE ▶
          </PokeButton>
        )}
        {!isPlayerTurn && !isEnemyStep && (
          <span style={{
            fontSize:11, color:"#807860", fontStyle:"italic",
          }}>
            Enemy is acting...
          </span>
        )}

        {/* Energy orbs */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:9, fontWeight:900, color:"#605840", letterSpacing:"0.08em" }}>
            ENERGY
          </span>
          {Array.from({ length:3 }).map((_, i) => (
            <div key={i} style={{
              width:15, height:15, borderRadius:"50%",
              background: i < energy ? "#F8D030" : "transparent",
              border:`2.5px solid ${i < energy ? "#C08808" : "#A09878"}`,
              boxShadow: i < energy ? "0 0 7px #F8D03099" : "none",
              transition:"all 0.2s",
            }} />
          ))}
          <span style={{ fontSize:12, fontWeight:900, color:"#302810", minWidth:20 }}>
            {energy}<span style={{ color:"#907860", fontWeight:500 }}>/3</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function PokeButton({ color, dark, textColor = "#fff", onClick, children }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={onClick}
      style={{
        fontFamily:"'Courier New', monospace",
        fontSize:12, fontWeight:900,
        background: color, color: textColor,
        border:`3px solid ${dark}`,
        borderRadius:5,
        padding:"5px 14px",
        cursor:"pointer",
        letterSpacing:"0.07em",
        boxShadow: pressed ? `0 0 0 ${dark}` : `0 3px 0 ${dark}`,
        transform: pressed ? "translateY(3px)" : "none",
        transition:"all 0.07s",
        outline:"none",
      }}
    >
      {children}
    </button>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function CombatUI({ initialState, relics = [], onVictory, onDefeat } = {}) {
  // If no initialState supplied (standalone dev mode), fall back to mock
  const startState = initialState ?? MOCK_STATE;
  const [state, setState]           = useState(startState);
  const [selectedCard, setSelected] = useState(null);
  const [targeting, setTargeting]   = useState(false);
  // Enemy turn step-through
  const [enemyQueue, setEnemyQueue] = useState([]); // [{newState, attackerSlot, messages}]
  const [hoveredCard, setHoveredCard]  = useState(null); // {cardId, x, y, slotIdx}
  const [attackFlash, setAttackFlash] = useState(null); // slotIdx of attacking enemy
  const isPlayerTurn = state.phase === "player";
  const isEnemyStep  = state.phase === "enemy_step";

  // If combat starts with enemy going first, auto-trigger their turn after a delay
  useEffect(() => {
    if (startState.phase === "enemy") {
      const timer = setTimeout(() => {
        // Trigger the same step-through enemy turn as endTurn uses
        setState(p => ({ ...p, phase:"enemy", sharedEnergy:0 }));
        setTimeout(() => {
          setState(p => {
            if (p.phase !== "enemy") return p;
            let afterEnemy;
            try { afterEnemy = runEnemyTurn(p); }
            catch(e) { console.warn("runEnemyTurn error:", e); afterEnemy = { ...p, phase:"player", turn:p.turn+1 }; }

            const prevLogLen = p.log.length;
            const newMessages = afterEnemy.log.slice(prevLogLen);
            const steps = [];
            let batch = [];
            for (const msg of newMessages) {
              batch.push(msg);
              if (msg.includes('damage') || msg.includes('fainted') ||
                  msg.includes('Miss!') || msg.includes('ignite') || msg.includes('poison')) {
                steps.push({ messages: [...batch], stateAfter: afterEnemy });
                batch = [];
              }
            }
            if (batch.length > 0) steps.push({ messages: [...batch], stateAfter: afterEnemy });

            if (steps.length === 0) {
              if (checkCombatEnd(afterEnemy)) return afterEnemy;
              const extraDraws = getRelicExtraDraws(relics);
              const newActive = afterEnemy.player.active.map(s => extraDraws > 0 ? drawCards(s, extraDraws) : s);
              return { ...afterEnemy, phase:"player", sharedEnergy:BASE_ENERGY_PER_TURN,
                       turn:(afterEnemy.turn??1)+1, player:{...afterEnemy.player,active:newActive},
                       combatFlags:{...(afterEnemy.combatFlags??{}),cardsPlayedThisTurn:0} };
            }

            setEnemyQueue(steps.slice(1).map((s,i) => ({...s, isFinal: i===steps.length-2, resolvedState:afterEnemy})));
            const firstStep = steps[0];
            const attackMsg = firstStep.messages.find(m => m.includes('plays'));
            if (attackMsg) {
              const s0 = p.enemy.active[0]?.creature?.name;
              const s1 = p.enemy.active[1]?.creature?.name;
              const aSlot = attackMsg.includes(s0) ? 0 : attackMsg.includes(s1) ? 1 : 0;
              setAttackFlash(aSlot);
              setTimeout(() => setAttackFlash(null), 400);
            }
            return { ...p, phase:"enemy_step", log:[...p.log.slice(-20),...firstStep.messages], _pendingResolvedState:afterEnemy };
          });
        }, 900);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── Drag state ──
  // dragRef holds the live drag data; dragRender is React state just to trigger re-renders.
  // All mousemove/mouseup handlers read from dragRef so they always see fresh data.
  const dragRef                     = useRef(null);
  const [dragRender, setDragRender] = useState(null); // mirrors dragRef for rendering
  const [burstAt, setBurstAt]       = useState(null);
  const enemySlotRefs               = useRef([]);
  const rootRef                     = useRef(null);

  // Convenience: current drag for render logic
  const drag = dragRender;

  function handleDragStart({ cardId, slotIdx, originX, originY }) {
    const d = { cardId, slotIdx, originX, originY, x: originX, y: originY, hoverTarget: null };
    dragRef.current = d;
    setDragRender({ ...d });
    setSelected(null);
    setTargeting(false);
  }

  function handleDragMove({ x, y }) {
    if (!dragRef.current) return;
    // Hit-test enemy slots using live DOM rects
    let hoverTarget = null;
    const card = MOCK_CARDS[dragRef.current.cardId];
    const needsTarget = card && (card.tags.includes("attack") || card.tags.includes("status"));
    if (needsTarget) {
      for (let i = 0; i < enemySlotRefs.current.length; i++) {
        const el = enemySlotRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          hoverTarget = { side:"enemy", slotIdx: i };
          break;
        }
      }
    }
    dragRef.current = { ...dragRef.current, x, y, hoverTarget };
    setDragRender({ ...dragRef.current });
  }

  function handleDragEnd({ x, y }) {
    const d = dragRef.current;
    if (!d) return;
    const card = MOCK_CARDS[d.cardId];
    const needsTarget = card && (card.tags.includes("attack") || card.tags.includes("status"));
    if (needsTarget && d.hoverTarget) {
      setBurstAt({ x, y });
      setTimeout(() => setBurstAt(null), 500);
      playOnTargetFrom(d.slotIdx, d.cardId, d.hoverTarget.slotIdx);
    } else if (!needsTarget) {
      playSelfFrom(d.slotIdx, d.cardId);
    }
    dragRef.current = null;
    setDragRender(null);
  }

  function log(msg) {
    setState(p => ({ ...p, log:[...p.log.slice(-20), msg] }));
  }

  // Flow: each stack reduces the NEXT card played by 1 energy (consumed on play)
  function getFlowStacks(slotIdx) {
    const slot = state.player.active[slotIdx];
    if (!slot) return 0;
    const flow = slot.creature.statusEffects.find(e => e.type === "flow");
    return flow?.stacks ?? 0;
  }

  function getEffectiveCost(cardId, slotIdx) {
    const card = MOCK_CARDS[cardId];
    if (!card) return 99;
    const flowDiscount = getFlowStacks(slotIdx);
    return Math.max(0, card.energyCost - flowDiscount);
  }

  function selectCard(slotIdx, cardId) {
    const card = MOCK_CARDS[cardId];
    if (!card) return;
    const effectiveCost = getEffectiveCost(cardId, slotIdx);
    if (state.sharedEnergy < effectiveCost) { log(`Not enough energy! (need ${effectiveCost})`); return; }
    if (selectedCard?.cardId === cardId && selectedCard?.slotIdx === slotIdx) {
      setSelected(null); setTargeting(false); return;
    }
    setSelected({ slotIdx, cardId });
    const needsTarget = card.tags.includes("attack") || card.tags.includes("status");
    setTargeting(needsTarget);
    log(needsTarget
      ? `${state.player.active[slotIdx].creature.name} wants to use ${card.name.toUpperCase()}!`
      : `Ready to use ${card.name.toUpperCase()}. Press USE MOVE.`);
  }

  function playOnTargetFrom(srcSlotIdx, cardId, enemySlotIdx) {
    const card = MOCK_CARDS[cardId];
    if (!card) return;
    const attacker = state.player.active[srcSlotIdx]?.creature;
    const defender = state.enemy.active[enemySlotIdx]?.creature;
    if (!attacker || !defender) return;

    // ── Compute Flow discount (reduces card energy cost) ──
    const flowStacks    = getFlowStacks(srcSlotIdx);
    const effectiveCost = Math.max(0, card.energyCost - flowStacks);

    // ── Apply relic hit bonus by lowering defender AC ──
    const relicHitBonus = applyRelicHitBonus(0, card, attacker, relics);
    // Patch state: lower AC by relic hit bonus, and consume Flow stacks
    let patchedState = state;
    if (relicHitBonus > 0) {
      patchedState = {
        ...patchedState,
        enemy: {
          ...patchedState.enemy,
          active: patchedState.enemy.active.map((s, i) =>
            i !== enemySlotIdx ? s : {
              ...s,
              creature: { ...s.creature, armorClass: Math.max(1, s.creature.armorClass - relicHitBonus) }
            }
          ),
        },
      };
    }
    // Consume Flow stacks from the playing creature before the engine deducts energy
    if (flowStacks > 0) {
      const newEffects = patchedState.player.active[srcSlotIdx].creature.statusEffects
        .filter(e => e.type !== "flow");
      patchedState = {
        ...patchedState,
        // Pre-credit the flow discount to sharedEnergy so combatEngine sees enough
        sharedEnergy: patchedState.sharedEnergy + flowStacks,
        player: {
          ...patchedState.player,
          active: patchedState.player.active.map((s, i) =>
            i !== srcSlotIdx ? s : {
              ...s,
              creature: { ...s.creature, statusEffects: newEffects },
            }
          ),
        },
      };
    }

    // Use combatEngine.playCard for full effect resolution
    // (shield, heal, draw, drain, statuses, type multiplier, faint checking)
    const result = playCard(patchedState, srcSlotIdx, cardId, "enemy", enemySlotIdx);

    if (!result.success) {
      log(result.message || "Card could not be played.");
      return;
    }

    let afterPlay = result.state;

    // Apply relic damage bonus on top of combatEngine result
    const beforeHp      = defender.currentHp;
    const beforePlayerHp = state.player.active[srcSlotIdx]?.creature.currentHp ?? 0;
    const afterHp  = afterPlay.enemy.active[enemySlotIdx]?.creature.currentHp ?? beforeHp;
    const afterPlayerHp = afterPlay.player.active[srcSlotIdx]?.creature.currentHp ?? beforePlayerHp;
    const dealtDmg = beforeHp - afterHp;

    // ── Momentum Gem: bonus damage per consecutive card this turn ──
    if (relics.includes("momentum_gem") && dealtDmg > 0) {
      const cardsPlayed = afterPlay.combatFlags?.cardsPlayedThisTurn ?? 0;
      const momentumBonus = Math.min(4, cardsPlayed); // +1 per card, cap +4
      if (momentumBonus > 0) {
        afterPlay = {
          ...afterPlay,
          enemy: {
            ...afterPlay.enemy,
            active: afterPlay.enemy.active.map((s, i) =>
              i !== enemySlotIdx ? s : {
                ...s,
                creature: { ...s.creature, currentHp: Math.max(0, s.creature.currentHp - momentumBonus) },
              }
            ),
          },
          log: [...afterPlay.log, `Momentum Gem: +${momentumBonus} bonus damage!`],
        };
        afterPlay = checkFaints(afterPlay);
      }
    }

    // Void Shard: if card has drain, give extra heal on top of base drain
    if (dealtDmg > 0 && card.drain) {
      const baseDrainHeal = afterPlayerHp - beforePlayerHp; // already healed by combatEngine
      const bonusDrainHeal = applyRelicDrainBonus(0, relics);
      if (bonusDrainHeal > 0 && afterPlay.player.active[srcSlotIdx]) {
        const slot = afterPlay.player.active[srcSlotIdx];
        const newHp = Math.min(slot.creature.maxHp, slot.creature.currentHp + bonusDrainHeal);
        afterPlay = {
          ...afterPlay,
          player: {
            ...afterPlay.player,
            active: afterPlay.player.active.map((s, i) =>
              i === srcSlotIdx
                ? { ...s, creature: { ...s.creature, currentHp: newHp } }
                : s
            ),
          },
        };
      }
    }
    if (dealtDmg > 0) {
      const relicBonus = applyRelicDamageBonus(0, card, attacker, state, relics);
      if (relicBonus > 0) {
        afterPlay = {
          ...afterPlay,
          enemy: {
            ...afterPlay.enemy,
            active: afterPlay.enemy.active.map((s, i) =>
              i !== enemySlotIdx ? s : {
                ...s,
                creature: { ...s.creature, currentHp: Math.max(0, s.creature.currentHp - relicBonus) }
              }
            ),
          },
          log: [...afterPlay.log, `Relic bonus: +${relicBonus} damage!`],
        };
        // Re-check faints after relic bonus damage
        afterPlay = checkFaints(afterPlay);
      }

      // Apply relic on-hit statuses (Poison Fang etc.)
      const relicStatuses = getRelicOnHitStatuses(relics);
      if (relicStatuses.length > 0) {
        afterPlay = {
          ...afterPlay,
          enemy: {
            ...afterPlay.enemy,
            active: afterPlay.enemy.active.map((s, i) => {
              if (i !== enemySlotIdx) return s;
              let c = s.creature;
              relicStatuses.forEach(({ type, stacks }) => {
                const efx = [...c.statusEffects];
                const idx = efx.findIndex(e => e.type === type);
                if (idx !== -1) efx[idx] = { ...efx[idx], stacks: efx[idx].stacks + stacks };
                else efx.push({ type, stacks });
                c = { ...c, statusEffects: efx };
              });
              return { ...s, creature: c };
            }),
          },
        };
      }
    }

    // Trim log and push effectiveness message if type multiplier applies
    const typeMultiplier = TYPE_CHART[card.type]?.[defender.type] ?? 1.0;
    const effMsg = typeMultiplier >= 2.0 ? "It's super effective!" 
                 : typeMultiplier <= 0.5 ? "It's not very effective..."
                 : null;

    afterPlay = {
      ...afterPlay,
      log: [
        ...afterPlay.log.slice(-20),
        ...(effMsg ? [effMsg] : []),
      ],
    };

    // ── Echo Stone: first card played is played twice ──
    if (relics.includes("echo_stone") && !afterPlay.combatFlags?.echoStoneUsed) {
      // Mark as used before the second play to prevent infinite recursion
      afterPlay = {
        ...afterPlay,
        combatFlags: { ...afterPlay.combatFlags, echoStoneUsed: true },
        log: [...afterPlay.log, "Echo Stone resonates — the move plays again!"],
      };
      // Re-run the same card on the same target using the updated state
      try {
        const echoResult = playCard(afterPlay, srcSlotIdx, cardId, "enemy", enemySlotIdx);
        if (echoResult.success) afterPlay = echoResult.state;
      } catch(e) { /* echo failed silently */ }
    }

    // ── Iron Will: prevent first faint ──
    if (relics.includes("iron_will") && !afterPlay.combatFlags?.ironWillUsed) {
      const fainted = afterPlay.player.active.filter(s => s && s.creature.currentHp <= 0);
      if (fainted.length > 0) {
        afterPlay = {
          ...afterPlay,
          combatFlags: { ...afterPlay.combatFlags, ironWillUsed: true },
          log: [...afterPlay.log, "Iron Will activates! Creature survives at 1 HP!"],
          player: {
            ...afterPlay.player,
            active: afterPlay.player.active.map(s =>
              s && s.creature.currentHp <= 0
                ? { ...s, creature: { ...s.creature, currentHp: 1 } }
                : s
            ),
          },
        };
      }
    }

    // Increment consecutive card counter for Momentum Gem
    afterPlay = {
      ...afterPlay,
      combatFlags: {
        ...(afterPlay.combatFlags ?? {}),
        cardsPlayedThisTurn: (afterPlay.combatFlags?.cardsPlayedThisTurn ?? 0) + 1,
      },
    };

    setState(afterPlay);
    setSelected(null); setTargeting(false);
    setState(p => { checkCombatEnd(p); return p; });
  }

  function playOnTarget(enemySlotIdx) {
    if (!selectedCard || !targeting) return;
    playOnTargetFrom(selectedCard.slotIdx, selectedCard.cardId, enemySlotIdx);
  }

  function playSelfFrom(srcSlotIdx, cardId) {
    const card = MOCK_CARDS[cardId];
    if (!card) return;

    // Consume Flow stacks (discount energy cost)
    const flowStacks = getFlowStacks(srcSlotIdx);
    let stateForPlay = state;
    if (flowStacks > 0) {
      const newEffects = state.player.active[srcSlotIdx].creature.statusEffects
        .filter(e => e.type !== "flow");
      stateForPlay = {
        ...state,
        sharedEnergy: state.sharedEnergy + flowStacks, // pre-credit so engine sees enough
        player: {
          ...state.player,
          active: state.player.active.map((s, i) =>
            i !== srcSlotIdx ? s : {
              ...s,
              creature: { ...s.creature, statusEffects: newEffects },
            }
          ),
        },
      };
    }

    // Use combatEngine.playCard targeting own slot (self = player, slot srcSlotIdx)
    const result = playCard(stateForPlay, srcSlotIdx, cardId, "player", srcSlotIdx);

    if (!result.success) {
      log(result.message || "Card could not be played.");
      return;
    }

    let afterPlay = result.state;
    afterPlay = {
      ...afterPlay,
      log: [...afterPlay.log.slice(-20)],
    };

    setState(afterPlay);
    setSelected(null); setTargeting(false);
  }

  function playSelf() {
    if (!selectedCard) return;
    playSelfFrom(selectedCard.slotIdx, selectedCard.cardId);
  }

  // Check if combat has ended — call onVictory/onDefeat callbacks
  function checkCombatEnd(combatState) {
    const allEnemyFainted = combatState.enemy.active.every(
      s => s.creature.currentHp <= 0
    ) && combatState.enemy.bench.length === 0;
    const allPlayerFainted = combatState.player.active.every(
      s => s.creature.currentHp <= 0
    ) && combatState.player.bench.length === 0;

    if (allEnemyFainted) {
      // Collect defeated enemy creatures to pass to catch screen
      const defeated = [
        ...combatState.enemy.active.map(s => s.creature),
        ...combatState.enemy.fainted ?? [],
      ].filter(Boolean);
      const activePlayerCount = combatState.player.active.filter(Boolean).length;
      setTimeout(() => onVictory?.(defeated, activePlayerCount), 600);
      return true;
    }
    if (allPlayerFainted) { setTimeout(() => onDefeat?.(), 600); return true; }
    return false;
  }

  // Draw n cards for a slot, reshuffling discard into draw when empty
  function drawCards(slot, n = 1) {
    let hand        = [...slot.hand];
    let drawPile    = [...slot.drawPile];
    let discardPile = [...slot.discardPile];
    for (let i = 0; i < n; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length === 0) break;
        // Reshuffle: Fisher-Yates
        drawPile = [...discardPile].sort(() => Math.random() - 0.5);
        discardPile = [];
      }
      hand.push(drawPile.shift());
    }
    return { ...slot, hand, drawPile, discardPile };
  }

  function endTurn() {
    log("Player ended the turn.");
    setState(p => ({ ...p, phase:"enemy", sharedEnergy:0 }));

    setTimeout(() => {
      setState(p => {
        // Run enemy turn — get final state
        let afterEnemy;
        try { afterEnemy = runEnemyTurn(p); }
        catch(e) {
          console.warn("runEnemyTurn error:", e);
          afterEnemy = { ...p, phase:"player", turn: p.turn+1 };
        }

        // Extract the new log lines added during enemy turn
        const prevLogLen = p.log.length;
        const newMessages = afterEnemy.log.slice(prevLogLen);

        // Build a step-through queue: each entry is the full resolved state
        // plus the messages that happened, so player can read them one at a time
        // We split on attack boundaries (lines containing "plays" or "damage" or "ignite")
        const steps = [];
        let batch = [];
        for (const msg of newMessages) {
          batch.push(msg);
          // Break into a step after each meaningful enemy action
          if (msg.includes('damage') || msg.includes('fainted') || 
              msg.includes('Miss!') || msg.includes('Ignite') ||
              msg.includes('ignite') || msg.includes('poison') || msg.includes('burn')) {
            steps.push({ messages: [...batch], stateAfter: afterEnemy });
            batch = [];
          }
        }
        // Any remaining messages
        if (batch.length > 0) {
          steps.push({ messages: [...batch], stateAfter: afterEnemy });
        }

        if (steps.length === 0) {
          // No interesting enemy actions — go straight to player turn
          if (checkCombatEnd(afterEnemy)) return afterEnemy;
          const extraDraws = getRelicExtraDraws(relics);
          const newActive = afterEnemy.player.active.map(slot =>
            extraDraws > 0 ? drawCards(slot, extraDraws) : slot
          );
          return {
            ...afterEnemy,
            phase: "player",
            sharedEnergy: BASE_ENERGY_PER_TURN,
            turn: (afterEnemy.turn ?? 1) + 1,
            player: { ...afterEnemy.player, active: newActive },
            combatFlags: { ...(afterEnemy.combatFlags ?? {}), cardsPlayedThisTurn: 0 },
          };
        }

        // Queue up the steps — first step shown immediately, rest on CONTINUE
        // Show first step's messages in log, keep phase as enemy until all steps done
        setEnemyQueue(steps.slice(1).map((s, i) => ({
          ...s,
          isFinal: i === steps.length - 2,
          resolvedState: afterEnemy,
        })));

        const firstStep = steps[0];
        // Flash animation: detect which enemy slot attacked
        const attackMsg = firstStep.messages.find(m => m.includes('plays'));
        if (attackMsg) {
          // Determine which slot attacked (slot 0 or 1)
          const slot0name = p.enemy.active[0]?.creature?.name;
          const slot1name = p.enemy.active[1]?.creature?.name;
          const attackingSlot = attackMsg.includes(slot0name) ? 0 : attackMsg.includes(slot1name) ? 1 : 0;
          setAttackFlash(attackingSlot);
          setTimeout(() => setAttackFlash(null), 400);
        }

        return {
          ...p,
          phase: "enemy_step", // special phase: show log + CONTINUE button
          log: [...p.log.slice(-20), ...firstStep.messages],
          _pendingResolvedState: afterEnemy,
        };
      });
    }, 900);
  }

  function advanceEnemyQueue() {
    if (enemyQueue.length === 0) {
      // All steps shown — now actually apply the resolved state and start player turn
      setState(p => {
        const resolved = p._pendingResolvedState ?? p;
        if (checkCombatEnd(resolved)) return resolved;

        // Player status processing
        const processedActive = resolved.player.active.map(slot => {
          const newEffects = [];
          let updated = { ...slot, creature: { ...slot.creature }, stunned: false };
          const statusLog = [];
          for (const effect of slot.creature.statusEffects) {
            switch(effect.type) {
              case 'ignite': case 'burn': {
                const dmg = effect.stacks;
                updated = { ...updated, creature: { ...updated.creature, currentHp: Math.max(0, updated.creature.currentHp - dmg) }};
                statusLog.push(`${slot.creature.name} takes ${dmg} ${effect.type} damage!`);
                if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
                break;
              }
              case 'poison': {
                const dmg = effect.stacks;
                updated = { ...updated, creature: { ...updated.creature, currentHp: Math.max(0, updated.creature.currentHp - dmg) }};
                statusLog.push(`${slot.creature.name} takes ${dmg} poison damage!`);
                newEffects.push(effect);
                break;
              }
              case 'regen': {
                const heal = effect.stacks;
                const newHp = Math.min(updated.creature.maxHp, updated.creature.currentHp + heal);
                updated = { ...updated, creature: { ...updated.creature, currentHp: newHp }};
                statusLog.push(`${slot.creature.name} regenerates ${heal} HP.`);
                if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
                break;
              }
              case 'gust': {
                updated = drawCards(updated, effect.stacks);
                statusLog.push(`${slot.creature.name} gains ${effect.stacks} Gust draws!`);
                break;
              }
              case 'stun': {
                updated = { ...updated, stunned: true };
                statusLog.push(`${slot.creature.name} is stunned!`);
                if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
                break;
              }
              default:
                newEffects.push(effect);
            }
          }
          updated = { ...updated, creature: { ...updated.creature, statusEffects: newEffects }};
          return { slot: updated, statusLog };
        });

        const statusLogLines = processedActive.flatMap(x => x.statusLog);
        const processedSlots = processedActive.map(x => x.slot);

        let afterStatus = {
          ...resolved,
          player: { ...resolved.player, active: processedSlots },
          log: [...resolved.log.slice(-20), ...statusLogLines],
          _pendingResolvedState: undefined,
        };
        afterStatus = checkFaints(afterStatus);
        if (checkCombatEnd(afterStatus)) return afterStatus;

        const extraDraws = getRelicExtraDraws(relics);
        const newActive = afterStatus.player.active.map(slot =>
          extraDraws > 0 ? drawCards(slot, extraDraws) : slot
        );

        return {
          ...afterStatus,
          phase: "player",
          sharedEnergy: BASE_ENERGY_PER_TURN,
          turn: (afterStatus.turn ?? 1) + 1,
          player: { ...afterStatus.player, active: newActive },
          combatFlags: { ...(afterStatus.combatFlags ?? {}), cardsPlayedThisTurn: 0 },
        };
      });
    } else {
      // Show next step
      const [nextStep, ...remaining] = enemyQueue;
      setEnemyQueue(remaining);

      // Flash attack animation
      const attackMsg = nextStep.messages?.find(m => m.includes('plays'));
      if (attackMsg) {
        const slot0name = state.enemy.active[0]?.creature?.name;
        const slot1name = state.enemy.active[1]?.creature?.name;
        const attackingSlot = attackMsg.includes(slot0name) ? 0 : attackMsg.includes(slot1name) ? 1 : 0;
        setAttackFlash(attackingSlot);
        setTimeout(() => setAttackFlash(null), 400);
      }

      setState(p => ({
        ...p,
        log: [...p.log.slice(-20), ...(nextStep.messages ?? [])],
      }));
    }
  }


  const selDef = selectedCard ? MOCK_CARDS[selectedCard.cardId] : null;

  return (
    <div ref={rootRef} style={{
      fontFamily:"'Courier New', monospace",
      background:"#F0EFE0",
      minHeight:"100vh",
      padding:14,
      boxSizing:"border-box",
      maxWidth:820,
      margin:"0 auto",
      position:"relative",
      userSelect: drag ? "none" : "auto",
    }}>

      {/* ─── Relic bar ── */}
      <RelicBar relicIds={relics} />

      {/* ─── BATTLEFIELD ─── */}
      <div style={{
        position:"relative",
        background:"linear-gradient(to bottom, #A0C8E8 0%, #A0C8E8 42%, #70A050 42%, #609040 54%, #D8C898 54%, #C8B880 100%)",
        border:"4px solid #807860",
        borderRadius:10,
        overflow:"hidden",
        marginBottom:10,
        boxShadow:"inset 0 0 50px rgba(0,0,0,0.12), 3px 4px 0 rgba(128,120,96,0.4)",
        padding:"14px 16px 16px",
        minHeight:300,
      }}>
        {/* Round badge */}
        <div style={{
          position:"absolute", top:10, left:"50%", transform:"translateX(-50%)",
          background:"#E8E8D0", border:"3px solid #807860",
          borderRadius:5, padding:"2px 16px",
          fontSize:10, fontWeight:900, color:"#302810",
          letterSpacing:"0.1em", zIndex:10,
          boxShadow:"1px 2px 0 rgba(128,120,96,0.3)",
        }}>
          RND {state.turn} · {state.phase === "player" ? "YOUR TURN" : "ENEMY TURN"}
        </div>

        {/* Enemy creatures — centered in the top half */}
        <div style={{
          display:"flex", justifyContent:"center", alignItems:"flex-end",
          gap:20, marginTop:22, marginBottom:6,
        }}>
          {state.enemy.active.map((slot, i) => (
            <div key={i} ref={el => enemySlotRefs.current[i] = el}
              style={{ animation: attackFlash === i ? 'enemyAttack 0.4s ease-in-out' : 'none' }}>
              <BattleSlot
                slot={slot} isEnemy
                onClick={() => playOnTarget(i)}
                isTargeted={targeting || (drag?.hoverTarget?.slotIdx === i)}
                isGlowing={drag?.hoverTarget?.slotIdx === i}
              />
            </div>
          ))}
        </div>

        {/* Horizon line */}
        <div style={{ height:2, background:"rgba(60,80,40,0.35)", margin:"2px 0" }} />

        {/* Player row — each creature is a column: card above, hand below */}
        <div style={{
          display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", gap:10, marginTop:8,
        }}>
          <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
            {state.player.active.map((slot, slotIdx) => {
              const col = TYPE_COLORS[slot.creature.type] || TYPE_COLORS.colorless;
              return (
                <div key={slotIdx} style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
                  {/* Creature silhouette + info card */}
                  <BattleSlot slot={slot} isEnemy={false} isTargeted={false} />

                  {/* This creature's hand — directly below its card */}
                  <div style={{
                    background:"#E8E4D0",
                    border:"2px solid #C8C0A0",
                    borderRadius:7,
                    padding:"6px 8px 6px",
                    marginTop:5,
                    overflow:"visible",
                    minWidth:220,
                  }}>
                    <div style={{
                      fontSize:8, fontWeight:900, color:"#807860",
                      letterSpacing:"0.08em", marginBottom:5,
                      display:"flex", alignItems:"center", gap:5,
                    }}>
                      <svg width={9} height={9} viewBox="0 0 100 100">
                        <path d={TYPE_SHAPES[slot.creature.type]} fill={col.mid} />
                      </svg>
                      {slot.creature.name.toUpperCase()}
                      {slot.stunned && (
                        <span style={{ color:"#D04040", fontWeight:900, marginLeft:4 }}>STUNNED</span>
                      )}
                    </div>
                    <div style={{
                      display:"flex", gap:5, overflowX:"auto",
                      paddingBottom:24, paddingTop:4,
                      alignItems:"flex-end", overflowY:"visible",
                    }}>
                      {slot.hand.length === 0 ? (
                        <div style={{
                          width:58, height:78, border:"2px dashed #C8C0A0",
                          borderRadius:6, display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:8, color:"#C8C0A0",
                          flexShrink:0,
                        }}>EMPTY</div>
                      ) : slot.hand.map((cardId, ci) => {
                        const isSelected = selectedCard?.cardId===cardId && selectedCard?.slotIdx===slotIdx;
                        const isPlayable = isPlayerTurn && getEffectiveCost(cardId, slotIdx) <= state.sharedEnergy && !slot.stunned;
                        return (
                          <div
                            key={`${cardId}-${ci}`}
                            className={`compact-card${isSelected ? " selected" : ""}`}
                            style={{ flexShrink:0 }}
                            onClick={() => selectCard(slotIdx, cardId)}
                            onMouseEnter={e => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setHoveredCard({ cardId, slotIdx, x: r.left + r.width/2, y: r.top });
                            }}
                            onMouseLeave={() => setHoveredCard(null)}
                          >
                            <DraggableCard
                              cardId={cardId}
                              slotIdx={slotIdx}
                              bobDelay={ci * 0.3}
                              isSelected={isSelected}
                              isPlayable={isPlayable}
                              effectiveCost={getEffectiveCost(cardId, slotIdx)}
                              onDragStart={handleDragStart}
                              onDragMove={handleDragMove}
                              onDragEnd={handleDragEnd}
                              onClick={() => selectCard(slotIdx, cardId)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <PlayerBenchBar bench={state.player.bench} />
        </div>
      </div>

      {/* ─── TEXT BOX ─── */}
      <BattleTextBox
        log={state.log}
        selectedCard={selDef}
        targetingMode={targeting}
        onPlay={playSelf}
        onCancel={() => { setSelected(null); setTargeting(false); }}
        onEndTurn={endTurn}
        isPlayerTurn={isPlayerTurn}
        isEnemyStep={isEnemyStep}
        onAdvanceQueue={advanceEnemyQueue}
        energy={state.sharedEnergy}
      />

      {/* ── Drag ghost card ── */}
      {drag && (() => {
        const card = MOCK_CARDS[drag.cardId];
        if (!card) return null;
        const col = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
        return (
          <div style={{
            position:"fixed",
            left: drag.x - 43,
            top:  drag.y - 65,
            zIndex:9999,
            pointerEvents:"none",
            transform:"rotate(-6deg) scale(1.12)",
            filter:`drop-shadow(0 12px 28px ${col.mid}99)`,
            transition:"filter 0.1s",
          }}>
            <CardFace card={card} col={col} isSelected={false} isDragging={true} />
          </div>
        );
      })()}

      {/* ── Arrow SVG overlay ── */}
      {drag && drag.hoverTarget && (() => {
        const tEl = enemySlotRefs.current[drag.hoverTarget.slotIdx];
        if (!tEl) return null;
        const tr = tEl.getBoundingClientRect();
        const rootR = rootRef.current?.getBoundingClientRect() || { left:0, top:0 };
        const sx = drag.x          - rootR.left;
        const sy = drag.y - 30     - rootR.top;
        const tx = tr.left + tr.width/2  - rootR.left;
        const ty = tr.top  + tr.height/2 - rootR.top;
        const mx = (sx + tx) / 2;
        const my = Math.min(sy, ty) - 40;
        const card = MOCK_CARDS[drag.cardId];
        const col  = TYPE_COLORS[card?.type] || TYPE_COLORS.colorless;
        const angle = Math.atan2(ty - sy, tx - sx) * 180 / Math.PI;
        return (
          <svg style={{
            position:"absolute", inset:0,
            width:"100%", height:"100%",
            pointerEvents:"none", zIndex:9000, overflow:"visible",
          }}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={col.mid} />
              </marker>
              <filter id="arrowGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {/* Curved path */}
            <path
              d={`M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`}
              fill="none"
              stroke={col.mid}
              strokeWidth="3.5"
              strokeDasharray="8 5"
              markerEnd="url(#arrowhead)"
              filter="url(#arrowGlow)"
              opacity="0.9"
              style={{ animation:"dashFlow 0.5s linear infinite" }}
            />
            {/* Pulsing target circle */}
            <circle cx={tx} cy={ty} r="22" fill={col.mid} opacity="0.18"
              style={{ animation:"targetPulse 0.7s ease-in-out infinite" }}
            />
            <circle cx={tx} cy={ty} r="14" fill="none" stroke={col.mid} strokeWidth="2.5" opacity="0.7" />
          </svg>
        );
      })()}

      {/* ── Play burst ── */}
      {burstAt && (() => {
        const rootR = rootRef.current?.getBoundingClientRect() || { left:0, top:0 };
        const x = burstAt.x - rootR.left;
        const y = burstAt.y - rootR.top;
        return (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:9000, overflow:"visible" }}>
            {[0,45,90,135,180,225,270,315].map((deg, i) => {
              const rad = deg * Math.PI / 180;
              const ex  = x + Math.cos(rad)*40;
              const ey  = y + Math.sin(rad)*40;
              return (
                <line key={i} x1={x} y1={y} x2={ex} y2={ey}
                  stroke="#F8D030" strokeWidth="3" strokeLinecap="round"
                  opacity="0.9"
                  style={{ animation:"burstLine 0.45s ease-out forwards" }}
                />
              );
            })}
            <circle cx={x} cy={y} r="18" fill="#fff" opacity="0.6"
              style={{ animation:"burstCircle 0.45s ease-out forwards" }}
            />
          </svg>
        );
      })()}

      {/* ─── CARD HOVER OVERLAY (fixed, above everything) ─── */}
      {hoveredCard && (() => {
        const card = MOCK_CARDS[hoveredCard.cardId];
        if (!card) return null;
        const col = TYPE_COLORS[card.type] || TYPE_COLORS.colorless;
        const slot = state.player.active[hoveredCard.slotIdx];
        const ec = getEffectiveCost(hoveredCard.cardId, hoveredCard.slotIdx);
        const isPlayable = isPlayerTurn && ec <= state.sharedEnergy && !slot?.stunned;
        return (
          <div
            className="card-hover-overlay"
            style={{ left: hoveredCard.x, top: hoveredCard.y }}
          >
            {/* Scaled-up card face — 2× the compact size */}
            <div style={{
              width: 120, height: 190,
              background: "#FFFEF5",
              border: `3px solid ${isPlayable ? col.mid : "#C8C0A0"}`,
              borderRadius: 10,
              padding: "10px 10px 9px",
              boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 4px 0 ${col.dark}`,
              opacity: isPlayable ? 1 : 0.7,
              overflow: "hidden",
              boxSizing: "border-box",
            }}>
              {/* Energy pip */}
              <div style={{
                position:"absolute", top:-10, right:-10,
                width:26, height:26, borderRadius:"50%",
                background: ec===0?"#E8E0C8": ec<card.energyCost?"#2B7FE8":col.mid,
                color:"#fff", fontSize:14, fontWeight:900,
                display:"flex", alignItems:"center", justifyContent:"center",
                border:`3px solid ${col.dark}`,
              }}>{ec}</div>
              {/* Type stripe */}
              <div style={{ height:5, borderRadius:3, marginBottom:8, background:`linear-gradient(to right,${col.light},${col.mid})` }} />
              {/* Silhouette */}
              <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}>
                <svg width={40} height={40} viewBox="0 0 100 100">
                  <path d={TYPE_SHAPES[card.type]||TYPE_SHAPES.colorless} fill={col.mid} opacity={0.7}/>
                </svg>
              </div>
              {/* Name */}
              <div style={{ fontSize:11, fontWeight:900, color:"#302810", textAlign:"center", lineHeight:1.2, marginBottom:5, letterSpacing:"0.02em" }}>
                {card.name.toUpperCase()}
              </div>
              {/* Badge */}
              <div style={{ textAlign:"center", marginBottom:6 }}>
                <span style={{
                  fontSize:9, fontWeight:900, padding:"2px 7px", borderRadius:4,
                  background: card.tags.includes("attack")?"#F09030":card.tags.includes("defend")?"#5878F0":"#58A838",
                  color:"#fff", letterSpacing:"0.07em",
                }}>
                  {card.tags.includes("attack")?"ATK":card.tags.includes("defend")?"DEF":"UTL"}
                </span>
              </div>
              {/* Description */}
              <div style={{ fontSize:9, color:"#504830", lineHeight:1.4, textAlign:"center", borderTop:`1px solid ${col.mid}33`, paddingTop:5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical" }}>
                {card.description}
              </div>
              {/* Not playable reason */}
              {!isPlayable && isPlayerTurn && (
                <div style={{ marginTop:5, fontSize:8, color:"#C04030", textAlign:"center", fontWeight:900 }}>
                  {ec > state.sharedEnergy ? "NOT ENOUGH ENERGY" : slot?.stunned ? "STUNNED" : ""}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes pokePulse {
          0%  { transform: scale(1); }
          40% { transform: scale(1.12); }
          100%{ transform: scale(1); }
        }
        @keyframes cardHoverPop {
    0%   { transform: translateY(0) scale(1); }
    100% { transform: translateY(-8px) scale(1.7); }
  }
  @keyframes enemyAttack {
    0%   { transform: translateX(0) scale(1); filter: brightness(1); }
    20%  { transform: translateX(-12px) scale(1.08); filter: brightness(1.5) hue-rotate(10deg); }
    50%  { transform: translateX(8px) scale(1.05); filter: brightness(1.3); }
    75%  { transform: translateX(-4px) scale(1.02); filter: brightness(1.1); }
    100% { transform: translateX(0) scale(1); filter: brightness(1); }
  }
  @keyframes cardBob {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          25%     { transform: translateY(-5px) rotate(0.8deg); }
          75%     { transform: translateY(-3px) rotate(-0.5deg); }
        }
        @keyframes dashFlow {
          to { stroke-dashoffset: -26; }
        }
        @keyframes targetPulse {
          0%,100% { r: 22; opacity: 0.18; }
          50%     { r: 28; opacity: 0.08; }
        }
        @keyframes burstLine {
          0%   { stroke-width:3; opacity:0.9; }
          100% { stroke-width:0.5; opacity:0; }
        }
        @keyframes burstCircle {
          0%   { r:18; opacity:0.6; }
          100% { r:40; opacity:0; }
        }
        ::-webkit-scrollbar { height:4px; width:4px; }
        .tip-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          cursor: default;
        }
        .tip-box {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #1A1A10;
          color: #E8E8D0;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          white-space: nowrap;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #404030;
          pointer-events: none;
          z-index: 9999;
          transition: opacity 0.12s ease, visibility 0s 0.12s;
        }
        .tip-box::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #404030;
        }
        .tip-wrap:hover .tip-box {
          visibility: visible;
          opacity: 1;
          transition: opacity 0.12s ease;
        }
        .compact-card {
          width: 58px;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          transform-origin: bottom center;
          position: relative;
          z-index: 1;
          cursor: pointer;
          flex-shrink: 0;
        }
        .compact-card:hover {
          transform: translateY(-4px);
        }
        .compact-card.selected {
          transform: translateY(-5px);
          outline: 2px solid #F09030;
          border-radius: 7px;
        }
        .card-hover-overlay {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
          transform: translateX(-50%) translateY(-100%) translateY(-12px);
          filter: drop-shadow(0 16px 32px rgba(0,0,0,0.55));
          transition: opacity 0.1s ease;
        }
        ::-webkit-scrollbar-track { background:#E0D8C0; }
        ::-webkit-scrollbar-thumb { background:#A09878; border-radius:2px; }
      `}</style>
    </div>
  );
}
