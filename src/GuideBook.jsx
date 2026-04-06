// ============================================================
//  GuideBook.jsx  —  In-game illustrated manual
//  Matches the Courier New / dark parchment aesthetic.
// ============================================================

import { useState } from "react";
import { useIsMobile } from "./useMediaQuery.js";
import { TYPE_COLORS } from "./shared.js";

// ── Palette (mirrors the game) ────────────────────────────────
const C = {
  bg:     "#1a1a14",
  panel:  "#22221a",
  border: "#3a3828",
  gold:   "#E8D890",
  dim:    "#807860",
  faint:  "#3a3828",
  text:   "#C8B890",
  bright: "#E8E8D0",
};

// ── SVG illustrations ─────────────────────────────────────────
function IconSword({ size = 20, color = "#E8D890" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14.5 2L22 9.5 9 22.5 1.5 21 2.5 13.5 14.5 2Z" stroke={color} strokeWidth="1.5" fill={color+"22"}/>
      <line x1="3" y1="21" x2="8" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="18" x2="10" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}
function IconShield({ size = 20, color = "#5898F0" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 6v6c0 5.25 3.75 10.05 9 11.25C17.25 22.05 21 17.25 21 12V6L12 2Z" stroke={color} strokeWidth="1.5" fill={color+"22"}/>
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconHeart({ size = 20, color = "#58C870" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 21C12 21 3 14 3 8a4 4 0 018-1 4 4 0 018 1c0 6-9 13-9 13Z" stroke={color} strokeWidth="1.5" fill={color+"22"}/>
    </svg>
  );
}
function IconBolt({ size = 20, color = "#FFD055" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" stroke={color} strokeWidth="1.5" fill={color+"22"}/>
    </svg>
  );
}
function IconCard({ size = 20, color = "#C89010" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="1.5" fill={color+"11"}/>
      <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1"/>
      <line x1="8" y1="14" x2="16" y2="14" stroke={color} strokeWidth="1" strokeLinecap="round"/>
      <line x1="8" y1="17" x2="13" y2="17" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}
function IconMap({ size = 20, color = "#88CC55" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" stroke={color} strokeWidth="1.5" fill={color+"11"}/>
      <line x1="9" y1="3" x2="9" y2="18" stroke={color} strokeWidth="1" strokeDasharray="2 2"/>
      <line x1="15" y1="6" x2="15" y2="21" stroke={color} strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  );
}
function IconStar({ size = 20, color = "#BB77FF" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7l3-7Z" stroke={color} strokeWidth="1.5" fill={color+"22"}/>
    </svg>
  );
}
function IconDice({ size = 20, color = "#E8D890" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="4" stroke={color} strokeWidth="1.5" fill={color+"11"}/>
      <circle cx="8" cy="8" r="1.5" fill={color}/>
      <circle cx="16" cy="8" r="1.5" fill={color}/>
      <circle cx="8" cy="16" r="1.5" fill={color}/>
      <circle cx="16" cy="16" r="1.5" fill={color}/>
      <circle cx="12" cy="12" r="1.5" fill={color}/>
    </svg>
  );
}

// ── Type badge SVG icons ──────────────────────────────────────
const TYPE_ICONS = {
  fire:   "🔥", water: "💧", earth: "🪨",
  wind:   "💨", shadow: "🌑", light: "✨", colorless: "⬜",
};

// ── Type effectiveness matrix ─────────────────────────────────
const TYPE_CHART = {
  fire:   { fire:1, water:0.5, earth:2,   wind:1,   shadow:1,   light:1   },
  water:  { fire:2, water:0.5, earth:1,   wind:1,   shadow:1,   light:0.5 },
  earth:  { fire:0.5,water:1,  earth:0.5, wind:2,   shadow:1,   light:1   },
  wind:   { fire:1, water:1,   earth:0.5, wind:0.5, shadow:2,   light:1   },
  shadow: { fire:1, water:1,   earth:1,   wind:0.5, shadow:0.5, light:2   },
  light:  { fire:1, water:2,   earth:1,   wind:1,   shadow:2,   light:0.5 },
};
const TYPES = ["fire","water","earth","wind","shadow","light"];

// ── Status effects ────────────────────────────────────────────
const STATUSES = [
  // Damage over time
  { type:"ignite",  icon:"🔥", color:"#DD6610", cat:"Damage",  desc:"Takes stacks damage at turn start. Decays -1 per turn." },
  { type:"poison",  icon:"☠",  color:"#44AA44", cat:"Damage",  desc:"Takes stacks damage at turn start. Persists indefinitely." },
  // Defense
  { type:"shield",       icon:"🛡", color:"#5898F0", cat:"Defense", desc:"Absorbs incoming damage. Expires at start of your turn." },
  { type:"fortify",      icon:"🪨", color:"#8c6a2a", cat:"Defense", desc:"+1 to Armor Class per stack. Decays -1 per turn." },
  { type:"evasion",      icon:"💨", color:"#6070C8", cat:"Defense", desc:"+4 to Armor Class per stack. Decays -1 per turn." },
  { type:"thorns",       icon:"🌵", color:"#44AA44", cat:"Defense", desc:"Reflects stacks damage back to attackers. Persists." },
  { type:"immune",       icon:"⭐", color:"#d4aa00", cat:"Defense", desc:"Blocks all new debuffs. Decays -1 per turn." },
  { type:"damage_reduction",icon:"⬇",color:"#5060C8",cat:"Defense",desc:"Reduces incoming damage by stacks%. Decays -1 per turn." },
  // Healing
  { type:"regen",   icon:"💚", color:"#58C870", cat:"Healing", desc:"Heals stacks HP at turn start. Decays -1 per turn." },
  // Buffs
  { type:"flow",    icon:"〰", color:"#2B7FE8", cat:"Buff",    desc:"Reduces next card's energy cost by stacks. Persists." },
  { type:"gust",    icon:"🌪", color:"#6070C8", cat:"Buff",    desc:"Draws stacks extra cards at next turn start. Then consumed." },
  { type:"radiance",icon:"☀", color:"#C89010", cat:"Buff",    desc:"Powers light cards (+2 dmg/stack). Consumed on use." },
  // Debuffs
  { type:"stun",        icon:"⚡", color:"#8866FF", cat:"Debuff", desc:"Skips creature's next turn. Decays -1 per turn." },
  { type:"slow",        icon:"🐢", color:"#776699", cat:"Debuff", desc:"Reduces energy gained next turn. Decays -1 per turn." },
  { type:"weak",        icon:"💔", color:"#AA4466", cat:"Debuff", desc:"Reduces outgoing damage by 25% per stack. Decays." },
  { type:"blind",       icon:"👁", color:"#666644", cat:"Debuff", desc:"-4 to hit rolls per stack. Decays -1 per turn." },
  { type:"shred",       icon:"🩸", color:"#8a4a1a", cat:"Debuff", desc:"-2 to Armor Class per stack. Decays -1 per turn." },
  { type:"waterlogged", icon:"🌊", color:"#2B7FE8", cat:"Debuff", desc:"Amplifies fire damage taken by ×1.5. Decays." },
  { type:"energy_drain",icon:"🔋", color:"#667788", cat:"Debuff", desc:"Drains energy at turn start. Decays -1 per turn." },
  { type:"death_mark",  icon:"💀", color:"#990099", cat:"Debuff", desc:"Doubles the NEXT instance of damage taken. Then removed." },
];

// ── Relics ────────────────────────────────────────────────────
const RELICS = [
  { name:"Ember Core",      icon:"🔥", desc:"Fire cards deal +2 damage." },
  { name:"Tide Stone",      icon:"💧", desc:"Start each combat with 2 Flow on all Water creatures." },
  { name:"Iron Shell",      icon:"🪨", desc:"Start each combat with 3 Fortify on all Earth creatures." },
  { name:"Gale Feather",    icon:"💨", desc:"Draw 1 extra card at the start of each turn." },
  { name:"Void Shard",      icon:"🌑", desc:"Drain cards heal for +2 HP extra." },
  { name:"Dawn Crystal",    icon:"✨", desc:"Start each combat with 1 Radiance on all Light creatures." },
  { name:"Lucky Coin",      icon:"🪙", desc:"Gain 10 gold after every combat victory." },
  { name:"Sharp Claw",      icon:"🗡", desc:"+1 to all attack hit rolls." },
  { name:"War Drum",        icon:"🥁", desc:"Your creatures deal +1 damage per combat turn elapsed." },
  { name:"Heart Stone",     icon:"💚", desc:"Gain 3 Shield on all active creatures at combat start." },
  { name:"Thorn Bark",      icon:"🌵", desc:"All player creatures gain Thorns 1 at combat start." },
  { name:"Adrenaline Shard",icon:"⚡", desc:"Start each combat with 1 extra energy." },
  { name:"Quick Draw",      icon:"🃏", desc:"Draw 1 extra card when combat starts." },
  { name:"Iron Will",       icon:"🛡", desc:"The first time a creature would faint, it survives at 1 HP instead." },
  { name:"Poison Fang",     icon:"☠", desc:"Attack cards apply 1 Poison to the target on hit." },
  { name:"Echo Stone",      icon:"🔁", desc:"Once per combat, the first card you play is played twice." },
  { name:"Glass Cannon",    icon:"💎", desc:"Creatures deal +4 damage but have -10 max HP." },
  { name:"Ancient Tome",    icon:"📖", desc:"Intelligence-scaling cards deal +3 damage." },
  { name:"Berserker Ring",  icon:"💢", desc:"Creatures deal +2 damage when below 50% HP." },
  { name:"Momentum Gem",    icon:"🌀", desc:"Each consecutive card played deals +1 damage (up to +4)." },
];

// ── Chapter definitions ───────────────────────────────────────
const CHAPTERS = [
  { id:"intro",    label:"INTRO",     icon:<IconMap size={14}/> },
  { id:"combat",   label:"COMBAT",    icon:<IconSword size={14}/> },
  { id:"cards",    label:"CARDS",     icon:<IconCard size={14}/> },
  { id:"statuses", label:"STATUSES",  icon:<IconBolt size={14}/> },
  { id:"types",    label:"TYPES",     icon:<IconStar size={14}/> },
  { id:"stats",    label:"STATS",     icon:<IconDice size={14}/> },
  { id:"relics",   label:"RELICS",    icon:<IconHeart size={14}/> },
  { id:"map",      label:"THE MAP",   icon:<IconMap size={14}/> },
];

// ═══════════════════════════════════════════════════════════════
//  CHAPTER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Rule() {
  return <div style={{ height:1, background:`linear-gradient(to right, transparent, ${C.border}, transparent)`, margin:"18px 0" }} />;
}

function Heading({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:900, letterSpacing:"0.06em", color:C.dim,
      textTransform:"uppercase", marginBottom:12, marginTop:4 }}>
      {children}
    </div>
  );
}

function Body({ children }) {
  return <p style={{ fontSize:11, color:C.text, lineHeight:1.8, margin:"0 0 10px" }}>{children}</p>;
}

function Callout({ icon, color, title, children }) {
  return (
    <div style={{ background: color+"11", border:`1px solid ${color}33`, borderRadius:6,
      padding:"10px 14px", marginBottom:10, display:"flex", gap:10, alignItems:"flex-start" }}>
      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{icon}</span>
      <div>
        <div style={{ fontSize:10, fontWeight:900, color, letterSpacing:"0.1em", marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:10.5, color:C.text, lineHeight:1.7 }}>{children}</div>
      </div>
    </div>
  );
}

function ChapterIntro() {
  return (
    <div>
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:36, marginBottom:8 }}>📖</div>
        <div style={{ fontSize:16, fontWeight:900, color:C.gold, letterSpacing:"0.05em", marginBottom:6 }}>
          CREATURE COLLECTOR
        </div>
        <div style={{ fontSize:10, color:C.dim, letterSpacing:"0.15em" }}>COMPLETE FIELD GUIDE</div>
      </div>
      <Body>
        Welcome, Trainer. This guide covers everything you need to master Creature Collector —
        a roguelike deckbuilder where you catch creatures, build card decks, and battle your way
        through a procedurally generated world.
      </Body>
      <Rule/>
      <Heading>THE GOAL</Heading>
      <Body>
        Defeat all enemies on the map and reach the final boss. Each run is fresh — your party,
        your deck, and the map layout are all different every time. Learn the systems and you'll
        find synergies that carry you to victory.
      </Body>
      <Rule/>
      <Heading>THE LOOP</Heading>
      {[
        ["1. PICK A STARTER", "Choose your first creature — they define your starting type and deck."],
        ["2. EXPLORE THE MAP", "Move between nodes: combats, shops, rest sites, events, and more."],
        ["3. FIGHT & WIN",     "Play cards in combat to defeat enemies. Victory grants XP, gold, and card rewards."],
        ["4. GROW YOUR PARTY", "Creatures level up and evolve. Draft new cards, collect relics, buy upgrades."],
        ["5. REACH THE BOSS",  "Every floor ends with a boss encounter. Beat it to advance deeper."],
      ].map(([title, desc]) => (
        <div key={title} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
          <div style={{ fontSize:13, fontWeight:900, color:C.gold, letterSpacing:"0.08em",
            background:C.faint, borderRadius:3, padding:"2px 7px", flexShrink:0, marginTop:2 }}>
            {title}
          </div>
          <div style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

function ChapterCombat() {
  return (
    <div>
      <Heading>HOW COMBAT WORKS</Heading>
      <Body>
        Combat is turn-based. You and the enemy take alternating turns. Each turn you spend
        energy to play cards from your hand.
      </Body>
      <Rule/>
      <Heading>ENERGY</Heading>
      <Callout icon="⚡" color="#FFD055" title="SHARED ENERGY POOL">
        Your active creatures share a pool of <strong>3 energy per creature</strong> per turn.
        Two active creatures = 6 energy per turn. Each card costs energy to play (shown in the top-right pip).
        Unused energy is lost at end of turn.
      </Callout>
      <Rule/>
      <Heading>YOUR HAND</Heading>
      <Body>
        At the start of each turn, each creature draws <strong>5 cards</strong> from their own deck.
        Cards belong to the creature who owns them — you can only play a creature's cards on that creature's turn.
        Drag a card to an enemy to attack, or drop it on yourself for defend/heal/utility cards.
      </Body>
      <Rule/>
      <Heading>HIT ROLLS</Heading>
      <Body>
        Attack cards don't auto-hit. The engine rolls a <strong>d20 + stat modifier</strong> against the
        defender's <strong>Armor Class (AC)</strong>. If the total ≥ AC, the attack lands.
        A natural 20 always hits; a natural 1 always misses.
      </Body>
      {[
        ["FORTIFY",  "+1 AC per stack — harder to hit"],
        ["EVASION",  "+4 AC per stack — much harder to hit"],
        ["SHRED",    "-2 AC per stack — easier to hit"],
        ["BLIND",    "-4 to YOUR hit roll — you miss more"],
      ].map(([name,desc]) => (
        <div key={name} style={{ display:"flex", gap:10, marginBottom:6, fontSize:10.5, color:C.text }}>
          <span style={{ color:C.gold, fontWeight:900, minWidth:70 }}>{name}</span>
          <span>{desc}</span>
        </div>
      ))}
      <Rule/>
      <Heading>DAMAGE</Heading>
      <Body>
        Base damage = <strong>card baseDamage + stat modifier</strong>. Type matchups then apply
        (×2 super-effective, ×0.5 resisted). Some statuses further modify damage — Waterlogged
        amplifies fire ×1.5, Weak reduces outgoing damage by 25%, Death Mark doubles the next hit.
      </Body>
      <Rule/>
      <Heading>SHIELDS</Heading>
      <Body>
        Shield absorbs incoming damage before HP. Any remaining damage after shield breaks
        goes to HP. <strong>Shields expire at the start of your next turn</strong> — so always
        shield on the turn before the enemy attacks.
      </Body>
      <Rule/>
      <Heading>TURN ORDER</Heading>
      {[
        ["PLAYER TURN START", "Shields expire → statuses tick (ignite, poison, regen…) → draw cards → play cards"],
        ["PLAYER ENDS TURN",  "Press END TURN — enemy takes their turn"],
        ["ENEMY TURN",        "Enemy creatures play cards from their decks — attack, defend, apply statuses"],
        ["REPEAT",            "Back to player turn"],
      ].map(([phase, desc]) => (
        <div key={phase} style={{ borderLeft:`2px solid ${C.border}`, paddingLeft:10, marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:900, color:C.gold, letterSpacing:"0.1em", marginBottom:3 }}>{phase}</div>
          <div style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{desc}</div>
        </div>
      ))}
      <Rule/>
      <Heading>FAINTING & SWAPPING</Heading>
      <Body>
        When a creature reaches 0 HP it faints. If you have bench creatures, the next one
        enters automatically. If all your creatures faint — you lose the run.
      </Body>
    </div>
  );
}

function ChapterCards() {
  const tags = [
    { tag:"ATTACK",   color:"#F09030", icon:"⚔", desc:"Targets an enemy. Makes a hit roll. Deals damage on hit." },
    { tag:"DEFEND",   color:"#5878F0", icon:"🛡", desc:"Targets yourself. Grants Shield and/or other defensive buffs." },
    { tag:"HEAL",     color:"#58A838", icon:"💚", desc:"Targets yourself. Restores HP, scales with Wisdom." },
    { tag:"STATUS",   color:"#A840A8", icon:"✦", desc:"Applies a status effect to the target. No damage roll." },
    { tag:"UTILITY",  color:"#808060", icon:"⚙", desc:"Draw cards, gain energy, or other special effects." },
    { tag:"KEYWORD",  color:"#C89010", icon:"★", desc:"Interacts with a specific status type (Gust, Flow, Radiance…)." },
  ];
  const rarities = [
    { label:"COMMON",    color:"#807860" },
    { label:"UNCOMMON",  color:"#4080C0" },
    { label:"RARE",      color:"#A040D0" },
    { label:"LEGENDARY", color:"#D09020" },
  ];
  return (
    <div>
      <Heading>CARD TYPES</Heading>
      {tags.map(t => (
        <div key={t.tag} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
          <span style={{ fontSize:13, fontWeight:900, background:t.color+"22", color:t.color,
            border:`1px solid ${t.color}44`, borderRadius:3, padding:"2px 7px",
            letterSpacing:"0.08em", flexShrink:0, minWidth:58, textAlign:"center" }}>
            {t.icon} {t.tag}
          </span>
          <span style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{t.desc}</span>
        </div>
      ))}
      <Rule/>
      <Heading>STAT SCALING</Heading>
      <Body>
        Most cards scale with one of your creature's stats. The effective value is shown
        in the card tooltip as <span style={{color:C.gold}}>base+bonus</span>.
      </Body>
      {[
        ["STRENGTH",     "⚔", "Scales physical attack damage"],
        ["DEXTERITY",    "🏃", "Scales agile / multi-hit damage"],
        ["INTELLIGENCE", "🧠", "Scales arcane / status damage"],
        ["WISDOM",       "💚", "Scales heal amounts"],
        ["CONSTITUTION", "🛡", "Scales shield amounts"],
      ].map(([stat, icon, desc]) => (
        <div key={stat} style={{ display:"flex", gap:10, marginBottom:6 }}>
          <span style={{ fontSize:10, fontWeight:900, color:C.gold, minWidth:80 }}>{icon} {stat.slice(0,3)}</span>
          <span style={{ fontSize:10.5, color:C.text }}>{desc}</span>
        </div>
      ))}
      <Body>
        The modifier formula is <span style={{color:C.gold, fontFamily:"monospace"}}>⌊(stat − 10) / 2⌋</span>.
        A creature with STR 16 gets +3 bonus damage on strength-scaling attack cards.
      </Body>
      <Rule/>
      <Heading>CARD RARITY</Heading>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        {rarities.map(r => (
          <span key={r.label} style={{ fontSize:13, fontWeight:900, padding:"3px 10px",
            border:`1px solid ${r.color}66`, color:r.color, borderRadius:3, letterSpacing:"0.1em" }}>
            {r.label}
          </span>
        ))}
      </div>
      <Body>Higher rarity cards have stronger effects, but are rarer in shops and rewards.</Body>
      <Rule/>
      <Heading>KEYWORDS</Heading>
      {[
        { kw:"DRAIN",   desc:"Heals the attacker for a portion of damage dealt (e.g. 40% or 100%)." },
        { kw:"CONSUME", desc:"Uses up all stacks of a status (Gust, Flow, Radiance) for bonus effects." },
        { kw:"AOE",     desc:"Hits all enemies simultaneously." },
        { kw:"ALWAYS HITS", desc:"Bypasses the d20 hit roll — cannot miss." },
        { kw:"MULTI-HIT",   desc:"Strikes multiple times in one card play." },
      ].map(({kw, desc}) => (
        <div key={kw} style={{ marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:900, color:C.gold, letterSpacing:"0.1em",
            background:C.faint, padding:"2px 7px", borderRadius:3 }}>{kw}</span>
          <span style={{ fontSize:10.5, color:C.text, marginLeft:8 }}>{desc}</span>
        </div>
      ))}
      <Rule/>
      <Heading>CARD UPGRADES</Heading>
      <Body>
        At upgrade events you can upgrade a card in a creature's deck. Upgraded cards
        (marked with <span style={{color:C.gold}}>+</span>) deal +3 damage, heal/shield +4,
        and cost 1 less energy. Each card can only be upgraded once.
      </Body>
    </div>
  );
}

function ChapterStatuses() {
  const cats = ["Damage","Defense","Healing","Buff","Debuff"];
  return (
    <div>
      <Heading>STATUS EFFECTS</Heading>
      <Body>
        Status effects modify a creature's behaviour each turn. Most are shown as badges
        with a stack count. They can stack — higher stacks = stronger effect.
      </Body>
      {cats.map(cat => {
        const items = STATUSES.filter(s => s.cat === cat);
        return (
          <div key={cat}>
            <Rule/>
            <Heading>{cat.toUpperCase()}</Heading>
            {items.map(s => (
              <div key={s.type} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
                <div style={{ minWidth:32, height:32, borderRadius:6,
                  background:s.color+"22", border:`1px solid ${s.color}55`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16, flexShrink:0 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:900, color:s.color, letterSpacing:"0.08em", marginBottom:2 }}>
                    {s.type.replace(/_/g," ").toUpperCase()}
                  </div>
                  <div style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      <Rule/>
      <Callout icon="⭐" color="#d4aa00" title="IMMUNE">
        Immune blocks ALL new debuffs. Shield and Regen still apply.
        Immune itself decays by 1 per turn.
      </Callout>
    </div>
  );
}

function ChapterTypes() {
  const cellStyle = (val) => {
    const bg = val === 2 ? "#44AA3333" : val === 0.5 ? "#AA333333" : "transparent";
    const color = val === 2 ? "#88EE66" : val === 0.5 ? "#FF7766" : C.dim;
    const label = val === 2 ? "2×" : val === 0.5 ? "½" : "—";
    return { bg, color, label };
  };
  return (
    <div>
      <Heading>TYPE MATCHUPS</Heading>
      <Body>
        Each creature and card has a type. When you attack, the type of the card vs the
        type of the defender determines a damage multiplier.
      </Body>
      <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:12, height:12, borderRadius:2, background:"#44AA3333", border:"1px solid #44AA3355" }}/>
          <span style={{ fontSize:10, color:"#88EE66" }}>×2 Super Effective</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:12, height:12, borderRadius:2, background:"#AA333333", border:"1px solid #AA333355" }}/>
          <span style={{ fontSize:10, color:"#FF7766" }}>×½ Resisted</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:12, height:12, borderRadius:2, background:"transparent", border:`1px solid ${C.border}` }}/>
          <span style={{ fontSize:10, color:C.dim }}>×1 Normal</span>
        </div>
      </div>

      {/* Type chart table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", fontSize:13, width:"100%" }}>
          <thead>
            <tr>
              <th style={{ padding:"4px 6px", color:C.dim, textAlign:"left", fontWeight:900,
                letterSpacing:"0.1em", borderBottom:`1px solid ${C.border}` }}>ATK ↓ DEF →</th>
              {TYPES.map(t => (
                <th key={t} style={{ padding:"4px 6px", color:TYPE_COLORS[t].light,
                  fontWeight:900, letterSpacing:"0.05em", borderBottom:`1px solid ${C.border}`,
                  textTransform:"uppercase", fontSize:12 }}>
                  {TYPE_ICONS[t]} {t.slice(0,3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPES.map(atk => (
              <tr key={atk}>
                <td style={{ padding:"4px 6px", color:TYPE_COLORS[atk].light,
                  fontWeight:900, fontSize:12, letterSpacing:"0.05em", textTransform:"uppercase",
                  borderBottom:`1px solid ${C.faint}` }}>
                  {TYPE_ICONS[atk]} {atk.slice(0,3).toUpperCase()}
                </td>
                {TYPES.map(def => {
                  const val = TYPE_CHART[atk]?.[def] ?? 1;
                  const { bg, color, label } = cellStyle(val);
                  return (
                    <td key={def} style={{ padding:"4px 6px", background:bg,
                      color, fontWeight: val !== 1 ? 900 : 400,
                      textAlign:"center", borderBottom:`1px solid ${C.faint}` }}>
                      {label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Rule/>
      <Heading>COLORLESS</Heading>
      <Body>
        Colorless cards deal normal (×1) damage to all types and are taken normally from
        all types. They're universal — any creature can use colorless cards effectively.
      </Body>
      <Rule/>
      <Heading>TYPE SYNERGIES</Heading>
      {[
        { type:"fire",   tip:"High damage, apply Ignite for damage-over-time. Waterlogged targets take ×1.5 fire." },
        { type:"water",  tip:"Flow generation enables cheap combos. Strong vs Fire and Light." },
        { type:"earth",  tip:"Tankiest type — high Shield, Fortify. Outlast enemies with sustained defence." },
        { type:"wind",   tip:"Speed and evasion. Gust effects draw extra cards. Shred enemy AC." },
        { type:"shadow", tip:"Drain life to sustain yourself. Apply Weak, Blind and Death Mark to cripple foes." },
        { type:"light",  tip:"Radiance synergies burst huge damage with Consume cards. Strong healing." },
      ].map(({ type, tip }) => (
        <div key={type} style={{ display:"flex", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:14, flexShrink:0 }}>{TYPE_ICONS[type]}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:TYPE_COLORS[type].light,
              letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>{type}</div>
            <div style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{tip}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChapterStats() {
  return (
    <div>
      <Heading>CREATURE STATS</Heading>
      <Body>
        Every creature has six stats. Stats range from 8–20, with 10 being average (±0 modifier).
        The modifier formula is <span style={{color:C.gold,fontFamily:"monospace"}}>⌊(stat − 10) / 2⌋</span>.
      </Body>
      {[
        { stat:"STRENGTH",     mod:"+STR", icon:"💪", color:"#DD6610", desc:"Adds to damage of Strength-scaling attack cards." },
        { stat:"DEXTERITY",    mod:"+DEX", icon:"🏃", color:"#6070C8", desc:"Adds to damage of Dexterity-scaling cards. Also affects initiative." },
        { stat:"INTELLIGENCE", mod:"+INT", icon:"🧠", color:"#7038A8", desc:"Adds to damage of Intelligence-scaling (arcane) cards." },
        { stat:"WISDOM",       mod:"+WIS", icon:"💚", color:"#4A8C2A", desc:"Adds to heal amounts of Wisdom-scaling heal cards." },
        { stat:"CONSTITUTION", mod:"+CON", icon:"🪨", color:"#8c6a2a", desc:"Adds to shield amounts of Constitution-scaling defend cards." },
        { stat:"ARMOR CLASS",  mod:"AC",   icon:"🛡", color:"#5898F0", desc:"Base difficulty to land attacks against this creature. Modified live by Fortify, Evasion, Shred." },
      ].map(({ stat, mod, icon, color, desc }) => (
        <div key={stat} style={{ background:color+"0d", border:`1px solid ${color}22`,
          borderRadius:6, padding:"10px 14px", marginBottom:8 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
            <span style={{ fontSize:14 }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight:900, color, letterSpacing:"0.1em" }}>{stat}</span>
            <span style={{ fontSize:13, color:C.dim, marginLeft:"auto",
              background:C.faint, padding:"1px 6px", borderRadius:3 }}>{mod}</span>
          </div>
          <div style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{desc}</div>
        </div>
      ))}
      <Rule/>
      <Heading>EXAMPLE MODIFIERS</Heading>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
        {[
          [8,"−1"],[10,"±0"],[12,"+1"],[14,"+2"],[16,"+3"],[18,"+4"],[20,"+5"]
        ].map(([val, mod]) => (
          <div key={val} style={{ display:"flex", justifyContent:"space-between",
            background:C.faint, borderRadius:4, padding:"4px 10px",
            fontSize:10, color:C.text }}>
            <span>Stat <strong style={{color:C.gold}}>{val}</strong></span>
            <span style={{ color: mod.startsWith("+") ? "#88EE66" : mod === "±0" ? C.dim : "#FF7766",
              fontWeight:900 }}>{mod}</span>
          </div>
        ))}
      </div>
      <Rule/>
      <Heading>XP & LEVELLING</Heading>
      <Body>
        Creatures gain XP from combat victories. When enough XP is accumulated, they level up
        — increasing max HP and potentially evolving into stronger forms with improved stats and
        access to higher-rarity cards.
      </Body>
      <Callout icon="🌟" color="#C89010" title="EVOLUTION">
        Creatures evolve at specific levels (e.g. level 3 → adult, level 6 → elder).
        Evolved forms have significantly higher stats and unlock new deck-building options.
      </Callout>
    </div>
  );
}

function ChapterRelics() {
  return (
    <div>
      <Heading>RELICS</Heading>
      <Body>
        Relics are passive items that modify your run permanently once equipped. You collect
        them from shop purchases and rare events. You can hold multiple relics and their
        effects stack.
      </Body>
      <Rule/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:6 }}>
        {RELICS.map(r => (
          <div key={r.name} style={{ display:"flex", gap:10, alignItems:"flex-start",
            background:C.faint, borderRadius:5, padding:"8px 12px" }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize:10, fontWeight:900, color:C.gold,
                letterSpacing:"0.08em", marginBottom:2 }}>{r.name.toUpperCase()}</div>
              <div style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <Rule/>
      <Callout icon="🪙" color="#C89010" title="ACQUIRING RELICS">
        Relics appear in shops (costs gold) and occasionally as rewards from elite encounters
        and special events. Choose relics that synergize with your current deck strategy.
      </Callout>
    </div>
  );
}

function ChapterMap() {
  return (
    <div>
      <Heading>THE WORLD MAP</Heading>
      <Body>
        The map is procedurally generated each run. You choose a path between nodes — every
        choice matters since you can't go back. Plan your route around your current needs.
      </Body>
      <Rule/>
      <Heading>NODE TYPES</Heading>
      {[
        { icon:"⚔", color:"#DD6610", label:"COMBAT",    desc:"Fight a randomly selected enemy party. Victory grants XP, gold, and a card reward." },
        { icon:"💀", color:"#7038A8", label:"ELITE",     desc:"A harder combat against a named elite enemy. Greater rewards — relic guaranteed on first clear." },
        { icon:"👑", color:"#C89010", label:"BOSS",      desc:"The floor boss. Defeat it to advance to the next floor. Massive rewards." },
        { icon:"🏪", color:"#4A8C2A", label:"SHOP",      desc:"Spend gold on cards, relics, and healing. Shops refresh each floor." },
        { icon:"🔥", color:"#DD6610", label:"REST SITE", desc:"Heal your party or upgrade a card for free. Choose wisely." },
        { icon:"❓", color:"#6070C8", label:"EVENT",     desc:"Random encounter — could be a puzzle, boon, or risk. Narrative choices with gameplay consequences." },
        { icon:"🌟", color:"#C89010", label:"CATCH",     desc:"Encounter a wild creature you can add to your roster." },
      ].map(n => (
        <div key={n.label} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
          <div style={{ width:32, height:32, borderRadius:6,
            background:n.color+"22", border:`1px solid ${n.color}44`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, flexShrink:0 }}>
            {n.icon}
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:900, color:n.color,
              letterSpacing:"0.08em", marginBottom:2 }}>{n.label}</div>
            <div style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{n.desc}</div>
          </div>
        </div>
      ))}
      <Rule/>
      <Heading>GOLD</Heading>
      <Body>
        Gold is earned from combat victories and some events. Spend it in shops on cards
        and relics. Gold carries between floors but cannot be spent outside shops.
      </Body>
      <Rule/>
      <Heading>STRATEGY TIPS</Heading>
      {[
        "Plan your path early — prioritize shops when your deck is weak, rest sites when your HP is low.",
        "Elite encounters are risky but the relic reward can define a winning run.",
        "Catch nodes are optional but expanding your roster gives you backup creatures and bench synergies.",
        "Don't hoard gold — a key relic bought early beats saving gold you never spend.",
        "A focused deck of 12–16 cards often outperforms a bloated 30-card one.",
      ].map((tip, i) => (
        <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
          <span style={{ color:C.gold, fontWeight:900, flexShrink:0 }}>✦</span>
          <span style={{ fontSize:10.5, color:C.text, lineHeight:1.6 }}>{tip}</span>
        </div>
      ))}
    </div>
  );
}

const CHAPTER_CONTENT = {
  intro:    <ChapterIntro/>,
  combat:   <ChapterCombat/>,
  cards:    <ChapterCards/>,
  statuses: <ChapterStatuses/>,
  types:    <ChapterTypes/>,
  stats:    <ChapterStats/>,
  relics:   <ChapterRelics/>,
  map:      <ChapterMap/>,
};

// ═══════════════════════════════════════════════════════════════
//  MAIN GUIDEBOOK MODAL
// ═══════════════════════════════════════════════════════════════

export default function GuideBook({ onClose }) {
  const [chapter, setChapter] = useState("intro");
  const isMobile = useIsMobile();

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.88)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Courier New', monospace",
      padding:"12px",
      boxSizing:"border-box",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width:"100%", maxWidth:780,
        height: isMobile ? "100dvh" : "min(90vh, 640px)",
        background:C.panel,
        border:`2px solid ${C.border}`,
        borderRadius: isMobile ? 0 : 8,
        display:"flex",
        flexDirection:"column",
        overflow:"hidden",
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
      }}>

        {/* Header */}
        <div style={{
          background:C.bg,
          borderBottom:`1px solid ${C.border}`,
          padding:"12px 16px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>📖</span>
            <div>
              <div style={{ fontSize:12, fontWeight:900, color:C.gold, letterSpacing:"0.15em" }}>
                FIELD GUIDE
              </div>
              <div style={{ fontSize:12, color:C.dim, letterSpacing:"0.12em" }}>
                CREATURE COLLECTOR — COMPLETE MANUAL
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:`1px solid ${C.border}`,
            borderRadius:4, color:C.dim, cursor:"pointer",
            fontSize:12, fontWeight:900, padding:"4px 10px",
            fontFamily:"'Courier New', monospace",
            letterSpacing:"0.1em",
            transition:"all 0.1s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
          >✕ CLOSE</button>
        </div>

        {/* Body */}
        <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", flex:1, overflow:"hidden" }}>

          {/* Sidebar nav */}
          <div style={{
            width: isMobile ? "100%" : 110,
            flexShrink:0,
            background:C.bg,
            borderRight: isMobile ? "none" : `1px solid ${C.border}`,
            borderBottom: isMobile ? `1px solid ${C.border}` : "none",
            overflowY: isMobile ? "hidden" : "auto",
            overflowX: isMobile ? "auto" : "hidden",
            display: isMobile ? "flex" : "block",
            flexDirection: isMobile ? "row" : "column",
            padding: isMobile ? "0" : "8px 0",
          }}>
            {CHAPTERS.map(ch => {
              const active = chapter === ch.id;
              return (
                <button key={ch.id} onClick={() => setChapter(ch.id)} style={{
                  width: isMobile ? "auto" : "100%", background:"none",
                  border:"none",
                  borderLeft: isMobile ? "none" : (active ? `3px solid ${C.gold}` : "3px solid transparent"),
                  borderBottom: isMobile ? (active ? `3px solid ${C.gold}` : "3px solid transparent") : "none",
                  color: active ? C.gold : C.dim,
                  fontFamily:"'Courier New', monospace",
                  fontSize:13, fontWeight:900, letterSpacing:"0.12em",
                  padding: isMobile ? "8px 10px" : "9px 10px 9px 11px",
                  textAlign:"left", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:6,
                  transition:"all 0.1s", flexShrink:0,
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = C.text; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = C.dim; }}
                >
                  <span style={{ opacity: active ? 1 : 0.6 }}>{ch.icon}</span>
                  {ch.label}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div style={{
            flex:1, overflowY:"auto",
            padding: isMobile ? "16px 14px" : "20px 22px",
            minHeight:0,
          }}>
            {CHAPTER_CONTENT[chapter]}
            <div style={{ height:32 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
