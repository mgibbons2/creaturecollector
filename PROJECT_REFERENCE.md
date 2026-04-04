# Creature Collector Deckbuilder — Project Reference

> Living source of truth for architecture, design decisions, and file structure.
> Update whenever a new system is added or a decision changes.
> **Last updated: Full audit + polish pass complete. Combat is mechanically correct. All 32 checks pass.**

---

## Table of Contents

1. [Game Concept](#1-game-concept)
2. [Tech Stack & Local Setup](#2-tech-stack--local-setup)
3. [File Map](#3-file-map)
4. [Core Design Decisions](#4-core-design-decisions)
5. [Data Model — gameSchema.js](#5-data-model)
6. [Combat Engine — combatEngine.js](#6-combat-engine)
7. [Map & Roguelike System — mapGenerator.js](#7-map--roguelike-system)
8. [Card Definitions — cardDefs.js](#8-card-definitions)
9. [Creature Definitions — creatureDefs.js](#9-creature-definitions)
10. [Event System — eventDefs.js](#10-event-system)
11. [App Shell & Routing](#11-app-shell--routing)
12. [RunContext — State & Actions](#12-runcontext--state--actions)
13. [CombatUI — Combat Interface](#13-combatui--combat-interface)
14. [Relic Engine — relicEngine.js](#14-relic-engine)
15. [Screens Reference](#15-screens-reference)
16. [Balance Reference](#16-balance-reference)
17. [System Status & Remaining Work](#17-system-status--remaining-work)

---

## 1. Game Concept

A **roguelike creature collector deckbuilder** played in the browser (React).

- Each **run** starts fresh. Pick one of 6 typed starter creatures and build a party of up to 6.
- The **map** is a branching DAG of nodes across multiple floors. You choose your path.
- **Combat** is the core loop: 2 of your creatures vs 2 enemies, card-based, turn-by-turn.
- After combat: attempt to **catch** a defeated enemy, **draft** a new card, collect gold.
- Between fights: **shop** (buy cards, relics, heals), **rest** (heal or upgrade), **events** (narrative choices with mechanical outcomes).
- Creatures **evolve** at levels 3 and 5, gaining stats and new names. A dramatic animation plays.
- Run ends in **victory** (clear the floor boss) or **defeat** (all creatures faint).

---

## 2. Tech Stack & Local Setup

| Layer | Choice |
|---|---|
| Framework | React 18 — plain Vite 5 project, no meta-framework |
| Language | JavaScript ES modules, no TypeScript |
| State | React Context + `useReducer` — one `RunContext` for the full run |
| Styling | Inline styles throughout — no CSS files, no Tailwind |
| Fonts | `'Courier New'` monospace — Pokémon-inspired retro aesthetic |
| Build | Vite (`npm run dev` → http://localhost:5173) |
| Persistence | `localStorage` planned for meta-progression; not yet implemented |

### Running locally

```bash
# Prerequisites: Node.js 18+ (https://nodejs.org)
cd creature-collector
npm install
npm run dev
# Open http://localhost:5173
```

### Project folder structure

```
creature-collector/
├── index.html          ← Vite entry point
├── package.json
├── vite.config.js
├── SETUP.md            ← Detailed setup instructions
└── src/                ← All source files (flat, no subdirectories)
    ├── main.jsx
    ├── App.jsx
    ├── RunContext.jsx
    ├── [all screens].jsx
    └── [all engines].js
```

---

## 3. File Map

```
src/
│
│  ── ENGINE (pure JS, no React) ────────────────────────────────
├── gameSchema.js      (337 lines)   Data model, factory functions, draft helpers
├── combatEngine.js    (846 lines)   Hit rolls, damage, status effects, AI turn
├── mapGenerator.js    (647 lines)   Floor DAG generation, node traversal, catch math
├── cardDefs.js      (2,392 lines)   All 146 card definitions + pool helpers
├── creatureDefs.js  (1,701 lines)   All 30 creature defs + XP/evolution system
├── relicEngine.js     (429 lines)   20 relic defs + 6 application hook functions
├── eventDefs.js       (634 lines)   20 narrative event defs + outcome helpers
│
│  ── APP SHELL ─────────────────────────────────────────────────
├── main.jsx             (9 lines)   React createRoot entry point
├── App.jsx            (107 lines)   RunProvider wrapper + phase router
├── RunContext.jsx     (645 lines)   Global run state (useReducer) + all action creators
│                                   + applyEventOutcome resolver
│
│  ── SCREENS ───────────────────────────────────────────────────
├── TitleScreen.jsx      (147 lines)   Animated title with type-coloured orbs
├── StarterPickScreen.jsx(310 lines)   Pick 1 of 6 starters, stat preview, evo chain
├── MapScreen.jsx        (408 lines)   Roguelike DAG map with SVG connectors
├── CombatScreen.jsx      (86 lines)   Bridge: RunContext → CombatUI
├── CombatUI.jsx       (1,241 lines)   Full Pokémon-style combat (self-contained)
├── CatchScreen.jsx      (501 lines)   Post-combat catch with ball-throw animation
├── RewardScreen.jsx     (341 lines)   Card draft + gold pickup
├── ShopScreen.jsx       (572 lines)   Cards / Relics / Heal tabs
├── RestScreen.jsx       (478 lines)   Heal 25% or upgrade a card
├── EventScreen.jsx      (322 lines)   Narrative event UI — choice + outcome display
├── EvolutionScreen.jsx  (449 lines)   Dramatic evolution reveal with animations
├── GameOverScreen.jsx   (123 lines)   Defeat summary
│
│  ── OVERLAYS (rendered on top of MapScreen, not a phase) ──────
└── PartyScreen.jsx      (760 lines)   Reorder party, swap roster, deck viewer
```

**Total: ~13,700 lines across 23 source files**

---

## 4. Core Design Decisions

### Creatures & Cards

- Every creature has its own **personal deck** (array of card ids, duplicates allowed).
- Starter deck is exactly **10 cards**, defined per `CreatureDef`.
- Cards have a **`type`** — creatures can only draft cards of their own type or **colorless**.
- Cards have a **`levelRequired`** gate — creature must be at or above that level to draft.
- Each card specifies a **`scalingStat`** (`strength | dexterity | intelligence | constitution | wisdom`) — used for both the hit roll and the damage/shield/heal modifier.

### Combat

- **2 active creatures per side** at all times. Bench auto-fills on faint.
- Up to **6 creatures per party** (2 active + up to 4 bench).
- **Shared energy pool** (3/turn) — both active creatures draw from the same pool.
- Each active creature has its **own hand** and **own draw/discard pile**.
- On entering the battlefield a creature **draws 5 cards** immediately.
- Each round: draw **1 card per active creature** (+ relic bonuses) at turn start.
- **Hit resolution**: roll d20 + stat modifier + relic bonuses vs target AC. Hit = damage. Miss = nothing.
- **Damage**: `baseDamage + statMod` where `statMod = floor((scalingStat - 10) / 2)`. Type multiplier applied after.
- **Card effects**: all resolved via `combatEngine.playCard()` — shield, heal, draw, drain, `onHitStatus`, `onPlayStatus`, `energyGain` all fire correctly.
- **Status ticking**: ignite/burn/poison deal damage each turn (ignite decays by 1); gust draws cards; regen heals; stun skips turn. Processed for both player and enemy at turn start.
- **Type matchup**: `TYPE_CHART` applied in `calculateDamage()` — 2× super effective, 0.5× resisted. Effectiveness message shown in combat log.
- **Bench replacement**: `checkFaints()` fires after every card play and status tick — bench creatures automatically fill empty active slots.
- **Enemy AI**: `runEnemyTurn()` from `combatEngine.js` — greedy by expected damage, picks the highest-damage playable card each slot.

### Type System

Six types plus colorless. Matchups (2× = super effective, 0.5× = resisted):

| Attacker | Fire | Water | Earth | Wind | Shadow | Light |
|---|---|---|---|---|---|---|
| Fire   | —    | 0.5×  | 2×   | —    | —    | —    |
| Water  | 2×   | 0.5×  | —    | —    | —    | 0.5× |
| Earth  | 0.5× | —     | 0.5× | 2×   | —    | —    |
| Wind   | —    | —     | 0.5× | 0.5× | 2×   | —    |
| Shadow | —    | —     | —    | 0.5× | 0.5× | 2×   |
| Light  | —    | 2×    | —    | —    | 2×   | 0.5× |

Colorless is always neutral. Type multiplier applied after all other modifiers.

### Signature Keywords (one per type)

| Type | Keyword | Mechanic |
|---|---|---|
| Fire | Ignite | Stacks on enemy. Deal stacks as damage at turn start, then decay by 1. |
| Water | Flow | Stacks on self. Each stack reduces next card cost by 1 (consumed on play). |
| Earth | Fortify | Stacks on self. Each stack = +1 AC until start of your next turn. |
| Wind | Gust | Stacks on self. Draw that many extra cards at start of next turn (consumed). |
| Shadow | Drain | Cards with Drain heal your creature for a ratio of damage dealt. |
| Light | Radiance | Stacks on self. Certain cards consume all Radiance for scaled bonus effects. |

---

## 5. Data Model

**Source:** `gameSchema.js` (337 lines)

### CardDef (static — never mutated)
```js
{
  id, name, description,
  type,           // fire|water|earth|wind|shadow|light|colorless
  energyCost,     // 0–3
  levelRequired,  // 1–6
  rarity,         // common|uncommon|rare|legendary
  tags,           // string[] e.g. ['attack','defend','heal','status','aoe']
  scalingStat,    // stat used for hit roll + damage modifier
  baseDamage?,    shieldAmount?,    healAmount?,    drawAmount?,
  onHitStatus?,   // { type, stacks } — applied on successful hit
  // ... many optional effect fields (see cardDefs.js for full list)
}
```

### CreatureDef (static — never mutated)
```js
{
  id, type, starter: boolean,
  baseHp, hpPerLevel,
  passiveTags: string[],
  description: string,
  stages: {
    baby:  { name, description, armorClass, stats },
    adult: { name, description, armorClass, stats },
    elder: { name, description, armorClass, stats },
  },
  starterDeck: string[],           // exactly 10 card ids
  cardPool: { [levelRequired]: string[] },
}
```

### CreatureInstance (mutable — lives in RunState.party and RunState.roster)
```js
{
  defId, name, type,
  level, xp, xpNext,
  maxHp, currentHp, armorClass,
  stats: { strength, dexterity, intelligence, constitution, wisdom },
  deck: string[],                  // personal card deck — mutates each run
  statusEffects: [{ type, stacks }],
  justEvolved?: boolean,           // UI flag — triggers EvolutionScreen on MapScreen
}
```

### RunState (root of all game state — lives in RunContext)
```js
{
  runId: string,
  party:   CreatureInstance[],     // up to 6; indices 0–1 are active in combat
  roster:  CreatureInstance[],     // all caught creatures (superset of party)
  gold: number,
  relics: string[],                // relic ids — effects applied via relicEngine
  map: MapState,
  phase: string,                   // see phase table in section 11
  pendingReward: { cardOffer, goldAmount } | null,
  pendingCatch:  { candidates, used, lastResult } | null,
  pendingEvent:  { event } | null,
  seenEvents:    string[],         // event ids seen this run (avoids repeats)
  _lastEventResolution: { effects: [] } | null,
}
```

### Key factory functions
| Function | Returns |
|---|---|
| `createCreatureInstance(def, level)` | Fresh `CreatureInstance` at given level |
| `createNewRun(starterDef)` | Fresh `RunState` |
| `getDraftableCards(creature)` | `CardDef[]` filtered by type + level |
| `addCardToDeck(creature, cardId)` | New deck `string[]` — throws on type/level violation |
| `removeCardFromDeck(creature, cardId)` | New deck `string[]` |

---

## 6. Combat Engine

**Source:** `combatEngine.js` (846 lines) — pure functions, no React imports.

### CombatState shape
```js
{
  turn: number,
  phase: 'player' | 'enemy' | 'victory' | 'defeat',
  sharedEnergy: number,
  log: string[],
  player: CombatSide,
  enemy:  CombatSide,
}

// CombatSide
{ active: SlotState[], bench: CreatureInstance[], fainted: CreatureInstance[] }

// SlotState
{ creature: CreatureInstance, hand: string[], drawPile: string[], discardPile: string[] }
```

### Public API
| Function | Description |
|---|---|
| `initCombat(playerParty, enemyParty)` | Creates CombatState; draws 5-card entry hands; sets initiative by DEX |
| `runEnemyTurn(state)` | Full greedy AI turn — picks highest-damage card per slot, resolves hits, returns updated state |
| `endPlayerTurn(state)` | Expires shields; transitions to enemy phase |
| `checkFaints(state)` | Auto-fills bench after damage; sets victory/defeat phase |
| `startTurn(state, side)` | Draws 1 card per active slot; processes status effects; restores energy (player only) |
| `resolveHitRoll(statValue, targetAC)` | Returns `{ hit, roll, modifier, total }` |
| `calculateDamage(base, attackerType, defenderType)` | Applies 2×/0.5× type multiplier |

### Constants
```js
BASE_ENERGY_PER_TURN = 3
ENTRY_HAND_SIZE      = 5
CARDS_PER_ROUND      = 1   // drawn per creature at turn start (before relic bonuses)
```

---

## 7. Map & Roguelike System

**Source:** `mapGenerator.js` (647 lines)

### MapState shape
```js
{
  floorNumber: number,
  nodes: MapNode[],
  currentNodeId: string,
  clearedNodeIds: string[],
}

// MapNode
{ id, type, row, col, connectionIds: string[], cleared: boolean }
```

### Node types
| Type | Icon | Notes |
|---|---|---|
| `start` | ★ | Entry node — pre-cleared, no encounter |
| `combat` | ⚔ | Standard battle |
| `elite` | ☠ | Harder battle; better rewards; 0.7× catch rate |
| `boss` | ✦ | Floor boss — no catch attempt after; 0.25× catch rate |
| `shop` | $ | Buy cards, relics, or a party heal |
| `rest` | ♥ | Heal 25% HP or upgrade a card |
| `event` | ? | Random narrative event from eventDefs.js |

### Floor generation algorithm
1. Pick row count (5–7, scales with floor number).
2. Each row gets 2–4 nodes. Start row and boss row are always width 1.
3. Assign node types from a weighted pool (shifts toward elites on higher floors).
4. Connect each node forward to 1–2 nodes in the next row. All nodes guaranteed reachable.
5. Guarantee at least one shop and one rest per floor.

### Key functions
| Function | Description |
|---|---|
| `generateFloor(floorNumber, enemyKeys)` | Full `MapState` |
| `getReachableNodes(map)` | Nodes reachable from current position |
| `moveToNode(map, nodeId)` | Updates `currentNodeId` |
| `clearCurrentNode(map)` | Marks current node cleared after encounter |
| `advanceFloor(run, enemyKeys)` | Generates next floor; keeps party/gold/relics |
| `generateGoldReward(nodeType, floor)` | Scaled gold amount |
| `generateCardOffer(nodeType, party, cards, floor)` | Type-filtered, rarity-weighted draft offer |
| `getCatchProbability(creature, nodeType)` | `(1 - hpRatio) × 0.7 × nodeModifier` |
| `attemptCatch(creature, nodeType)` | Returns `{ success, probability, creature }` |

---

## 8. Card Definitions

**Source:** `cardDefs.js` (2,392 lines)

### Card counts by type and rarity

| Type | Common | Uncommon | Rare | Legendary | Total |
|---|---|---|---|---|---|
| Fire | 8 | 9 | 5 | 2 | 24 |
| Water | 8 | 9 | 4 | 2 | 23 |
| Earth | 8 | 7 | 4 | 2 | 21 |
| Wind | 8 | 7 | 4 | 2 | 21 |
| Shadow | 8 | 7 | 4 | 2 | 21 |
| Light | 8 | 7 | 4 | 2 | 21 |
| Colorless | 6 | 5 | 3 | 1 | 15 |
| **Total** | | | | | **~146** |

### Stat ranges (post-balance pass)
| Field | Min | Avg | Max |
|---|---|---|---|
| baseDamage | 0 | 5.6 | 25 |
| shieldAmount | 5 | 9.1 | 20 |
| healAmount | 3 | 7.6 | 15 |

### Key exports
| Export | Description |
|---|---|
| `CARD_DEFS` | All cards keyed by id |
| `getCardsByType(type, maxLevel?)` | Cards for a type up to a level gate |
| `getCardsByRarity(rarity)` | All cards of a rarity |
| `getDraftPool(creature)` | Legally draftable cards (type + level + not unplayable) |

---

## 9. Creature Definitions

**Source:** `creatureDefs.js` (1,701 lines)

### Roster — 30 creatures (6 types × 5 each)

| Type | Starter | Catch pool |
|---|---|---|
| Fire | Emberfox | Cindergrub, Sparkwing, Embertoad, Moltenite |
| Water | Tidepup | Coralshell, Mistsprite, Streamkin, Frostveil |
| Earth | Stonepup | Quarrymite, Mudcrawler, Cragspike, Dustwraith |
| Wind | Breezekit | Driftmote, Squallpup, Cyclonix, Galehorn |
| Shadow | Duskrat | Venomfang, Wraithhound, Nightcrawler, Gloomspore |
| Light | Glowpup | Dawnsprite, Cleansewing, Solarbeast, Vesperkin |

### Evolution stages

| Stage | Levels | XP threshold | Triggered at |
|---|---|---|---|
| Baby | 1–2 | 0 | Starting form |
| Adult | 3–4 | 35 XP total | Level 3 — triggers EvolutionScreen |
| Elder | 5–6 | 90 XP total | Level 5 — triggers EvolutionScreen |

On evolution: name, description, stats, and AC update from the new stage def. HP scales proportionally (ratio preserved). Deck unchanged. `justEvolved: true` flag set on the instance — MapScreen detects this and shows EvolutionScreen before allowing further navigation.

### XP rewards per combat type

| Node type | Active XP | Bench XP |
|---|---|---|
| Combat | 10 | 5 |
| Elite | 20 | 10 |
| Boss | 40 | 20 |

Level thresholds: Lv2 @ 15 · Lv3 @ 35 · Lv4 @ 60 · Lv5 @ 90 · Lv6 @ 130

At standard combat pace: ~2 fights per level-up. Bench creatures level ~2× slower than actives.

### Key exports
- `CREATURE_DEFS` — all 30, keyed by id
- `STARTER_CREATURES` — 6 starters only
- `CATCH_POOL` — 24 catchable creatures
- `resolveStage(def, level)` → `{ name, description, stats, armorClass, maxHp }`
- `getStageName(level)` → `'baby' | 'adult' | 'elder'`
- `awardXp(party, activeIndices, nodeType, allDefs)` → updated party array
- `applyXp(creature, xpGain, allDefs)` → updated creature instance (with evolution if triggered)

---

## 10. Event System

**Source:** `eventDefs.js` (634 lines), resolver in `RunContext.jsx`

### 20 events across 5 themes

| Theme | Events |
|---|---|
| Gold | Forgotten Pouch, Travelling Merchant, Gambling Den, Toll Bridge |
| Cards | Ancient Library, Purifying Flame, Duelling Ghost, Shrine of Tempering |
| Creatures | Injured Creature, Creature Nest, Ambush |
| Heal / Damage | Healing Spring, Cursed Altar, Strange Mushroom |
| Relics / Mixed | The Collector, Ruined Shrine, The Crossroads, Old Trainer, Storm Shelter, Echo Pool |

### Outcome types (all wired in `applyEventOutcome`)

| Type | Effect |
|---|---|
| `gold` | Gain gold |
| `lose_gold` | Lose gold (or 0 if broke) |
| `lose_gold_per_party` | Pay gold × party size |
| `heal` | Restore ratio of max HP to all party members |
| `damage` | Deal ratio of max HP to active creatures only |
| `add_card` | Draft random card(s) from a typed pool |
| `remove_card` | Remove random non-curse cards from first creature's deck |
| `upgrade_card` | Upgrade a random card (+3 dmg / +4 shld / -1 cost) |
| `add_relic_random` | Gain a random event-only relic (12-relic pool, distinct from shop) |
| `catch_chance` | Attempt to catch a random wild creature |
| `xp_bonus` | Award XP directly to active creatures |
| `gamble` | Roll against `winChance` — win or loss outcome applied |
| `gamble_card` | Win a card, or take damage on loss |
| `echo_pool_random` | Pick randomly from 5 possible outcomes |
| `multi` | Chain any combination of the above |
| `nothing` | Flavour only — no mechanical effect |

### Repeat prevention
`seenEvents: string[]` on RunState tracks all event ids encountered this run. `pickRandomEvent(recentIds)` filters them out — player sees all 20 before any repeat.

### Gold-gating
Choices with `requiresGold` are disabled with a `"need ¥X, have ¥Y"` label when the player can't afford them.

---

## 11. App Shell & Routing

### Phase → Screen mapping

| Phase | Screen | Notes |
|---|---|---|
| `title` | TitleScreen | Animated type-orb background |
| `starter_pick` | StarterPickScreen | 6 creature cards, stat preview, evolution chain |
| `map` | MapScreen | DAG map + PARTY button opens PartyScreen overlay |
| `combat` | CombatScreen → CombatUI | Builds CombatState, applies relic start, wires callbacks |
| `catch` | CatchScreen | Ball-throw animation, catch probability display |
| `reward` | RewardScreen | Per-creature card draft (type-filtered) + gold pickup |
| `shop` | ShopScreen | Cards / Relics / Heal tabs |
| `rest` | RestScreen | Heal 25% or upgrade a card with stat diff preview |
| `event` | EventScreen | Narrative event — pick a choice, see outcome |
| `gameover` | GameOverScreen | Run summary stats |

### Screen flow
```
title → starter_pick → map ←─────────────────────────────────────────────┐
                        │                                                  │
                        ├─ combat → catch → reward ────────────────────── │
                        ├─ shop ─────────────────────────────────────────  │
                        ├─ rest ──────────────────────────────────────── ──┤
                        ├─ event ─────────────────────────────────────────┘
                        │  (floor boss cleared → advanceFloor → new map)
                        └─ gameover
```

### EvolutionScreen (overlay on MapScreen)
Not a phase. MapScreen checks `party` for `justEvolved: true` on every render via `useEffect`. If found, `EvolutionScreen` is rendered `position: fixed` over the map. Multiple evolutions queue — each plays its full animation before the next. After the last, `clearEvolutionFlag(defId)` is dispatched.

### PartyScreen (overlay on MapScreen)
Not a phase. Opens via the ⚔ PARTY button. Renders `position: fixed` on top of the map. Does not interrupt run state.

---

## 12. RunContext — State & Actions

**Source:** `RunContext.jsx` (645 lines)

### All action creators (RunActions.*)

| Action | Effect |
|---|---|
| `goToStarterPick()` | phase → starter_pick |
| `startRun(defId)` | Creates run, generates floor 1, phase → map |
| `moveToNode(nodeId)` | Updates `map.currentNodeId` |
| `enterNode()` | Reads node type → sets phase; for events, picks a random event first |
| `combatVictory(indices, enemies)` | Awards XP, applies victory relics, generates reward, routes to catch or reward |
| `combatDefeat()` | phase → gameover |
| `draftCard(cardId, ci)` | Adds card to creature deck |
| `removeCard(cardId, ci)` | Removes card from creature deck |
| `takeGold(amount)` | Adds gold |
| `finishReward()` | Clears reward; advances floor if boss cleared; phase → map |
| `buyCard(cardId, ci, cost)` | Deducts gold + drafts card |
| `buyRelic(relicId, cost)` | Deducts gold + adds relic |
| `buyHeal(cost)` | Deducts gold + heals party 30% |
| `leaveShop()` | Clears node + phase → map |
| `restHeal()` | Heals party 25% + clears node + phase → map |
| `restUpgrade(updatedParty)` | Replaces party + clears node + phase → map |
| `attemptCatch(creature, success)` | Catches if success; phase → reward |
| `skipCatch()` | phase → reward |
| `resolveEvent(payload)` | Applies event outcome via `applyEventOutcome()` |
| `finishEvent()` | Clears event, clears node, phase → map |
| `reorderParty(newOrder)` | Replaces party array |
| `swapPartyRoster(partyIdx, rosterId)` | Swaps roster creature into party slot |
| `clearEvolutionFlag(defId)` | Clears `justEvolved` on a creature by defId |
| `addGold(n)` | Gold adjustment |
| `addRelic(relicId)` | Adds relic (no gold cost) |
| `flee()` | phase → map, no reward, no node clear |
| `returnToTitle()` | Full reset to empty run |

---

## 13. CombatUI — Combat Interface

**Source:** `CombatUI.jsx` (1,241 lines)

### Props
```js
CombatUI({
  initialState,  // CombatState from initCombat() — falls back to MOCK_STATE if absent
  relics,        // string[] from run.relics
  onVictory,     // (defeatedEnemies: CreatureInstance[]) => void
  onDefeat,      // () => void
  onFlee,        // () => void | undefined (undefined on boss nodes)
})
```

### Key internal systems

**Card resolution** — `playOnTargetFrom` and `playSelfFrom` both delegate to `combatEngine.playCard()`. All card effects resolve correctly: shield (absorbed by `applyDamageToSlot`), heal (`healAmount + wisdomMod`), draw (`drawAmount`), drain (heals attacker fraction of damage + Void Shard bonus), `onHitStatus`/`onPlayStatus`, `energyGain`, type multiplier via `TYPE_CHART`. Relic hit/damage bonuses applied before/after the engine call.

**Hit and damage resolution** — `combatEngine.playCard` uses `resolveHitRoll(stat, AC)` → d20 + statMod + relicBonus. Damage = `baseDamage + statMod` then `calculateDamage(raw, attackerType, defenderType)` applies type multiplier. Effectiveness message ("It's super effective!") logged when multiplier ≥ 2.

**Status ticking** — `endTurn` processes player creature statuses at the start of each player turn: ignite/burn/poison deal damage (ignite decays), regen heals, gust draws cards, stun marks slot, fortify/flow/radiance/shield persist. Enemy statuses processed by `combatEngine.startTurn` inside `runEnemyTurn`.

**Bench replacement** — `combatEngine.checkFaints()` called after every card play, relic damage, and status tick. Moves bench creatures into empty active slots; sets victory/defeat phase when all slots empty.

**Enemy AI** — `runEnemyTurn(state)` from `combatEngine.js` after a 900ms delay. Greedy by expected damage per slot, respects energy costs, uses `resolveHitRoll` and `calculateDamage` for full effect resolution.

**Drag-and-drop cards** — `onMouseDown` + document `mousemove`/`mouseup`. All handlers in refs via `useEffect`. `dragRef` holds live drag state; `dragRender` triggers re-renders. Cards animate with staggered `cardBob`. SVG dashed arrow drawn from dragged card to hovered enemy target.

**Victory/defeat detection** — `checkCombatEnd(state)` called after every card play and status processing. Collects `enemy.active + enemy.fainted` and passes to `onVictory(defeated)` after 600ms.

**Card draw** — `drawCards(slot, n)` reshuffles discard (Fisher-Yates) when draw pile empties. Per turn: `1 + getRelicExtraDraws(relics)` per active creature.

---

## 14. Relic Engine

**Source:** `relicEngine.js` (429 lines)

### All 20 relics

| Relic | Type | Hook | Effect |
|---|---|---|---|
| Ember Core | Fire | onAttackDamage | Fire cards deal +2 damage |
| Tide Stone | Water | onCombatStart | Water creatures start with 2 Flow |
| Iron Shell | Earth | onCombatStart | Earth creatures start with 3 Fortify |
| Gale Feather | Wind | extraDrawPerTurn | Draw +1 card per turn |
| Void Shard | Shadow | onDrainHeal | Drain heals +2 HP extra |
| Dawn Crystal | Light | onCombatStart | Light creatures start with 1 Radiance |
| Lucky Coin | Colorless | onVictory | +10 gold after every combat win |
| Sharp Claw | Colorless | onHitRoll | +1 to all attack hit rolls |
| War Drum | Colorless | onAttackDamage | +1 damage per combat turn elapsed (max +10) |
| Heart Stone | Colorless | onCombatStart | All active creatures gain Shield 3 |
| Thorn Bark | Colorless | onCombatStart | All active creatures gain Thorns 1 |
| Adrenaline Shard | Colorless | onCombatStart | Start combat with +1 energy |
| Quick Draw | Colorless | onCombatStart | Draw 1 extra card at combat start |
| Iron Will | Colorless | combatFlags | First faint per combat → survive at 1 HP (uses ironWillUsed flag) |
| Poison Fang | Colorless | onHitApplyStatus | All attack hits apply Poison 1 |
| Echo Stone | Colorless | combatFlags | First card played each combat plays twice (uses echoStoneUsed flag) |
| Glass Cannon | Colorless | onAttackDamage + onCombatStart | +4 damage; -10 max HP |
| Ancient Tome | Colorless | onAttackDamage | INT-scaling cards deal +3 damage |
| Berserker Ring | Colorless | onAttackDamage | +2 damage when below 50% HP |
| Momentum Gem | Colorless | flag (deferred) | +1 dmg per consecutive card this turn (max +4) |

### 3 deferred relics
Iron Will, Echo Stone, and Momentum Gem need a `combatFlags` object on `CombatState` to track per-combat state (first-faint-used, first-card-played, cards-played-this-turn). The defs and hook shapes exist in `relicEngine.js` — wiring is the remaining task.

### Application hook exports

| Export | Called from |
|---|---|
| `applyRelicCombatStart(state, relics)` | CombatScreen after `initCombat()` |
| `applyRelicDamageBonus(dmg, card, attacker, state, relics)` | CombatUI `playOnTargetFrom` |
| `applyRelicHitBonus(roll, card, attacker, relics)` | CombatUI `playOnTargetFrom` |
| `getRelicOnHitStatuses(relics)` | CombatUI `playOnTargetFrom` |
| `getRelicExtraDraws(relics)` | CombatUI `endTurn` |
| `applyRelicVictory(runState, relics)` | RunContext `COMBAT_VICTORY` |
| `applyRelicDrainBonus(heal, relics)` | Available — not yet wired into CombatUI |
| `getRelicDef(relicId)` | UI display |

---

## 15. Screens Reference

| Screen | Lines | Summary |
|---|---|---|
| TitleScreen | 147 | Animated type-orb background. NEW GAME → `goToStarterPick()` |
| StarterPickScreen | 310 | 6 creature cards, stat bars, silhouette SVG, evolution chain, deck preview, confirm button |
| MapScreen | 408 | DAG with SVG connectors, node info sidebar, party HP, PARTY button. Intercepts `justEvolved` to show EvolutionScreen overlay |
| EvolutionScreen | 449 | Old form → white flash → new form SVG reveal → particle burst → stat comparison rows → CONTINUE. 4s sequence, auto-advances |
| PartyScreen | 760 | Overlay. 6 slots (0–1 active / 2–5 bench), drag to reorder, + ADD from roster. Right panel: stats grid, evolution path, deck list tab |
| CombatScreen | 86 | Bridge only. Builds `CombatState`, applies relic start effects, passes `onVictory`/`onDefeat`/`onFlee` to CombatUI |
| CombatUI | 1,241 | Full combat. Drag-drop cards, floating bob, SVG target arrows, relic bar, Pokémon layout. d20 hit system. Real enemy AI |
| CatchScreen | 501 | Two candidate cards with % chance (colour-coded). Ball-throw → 3 shakes → success/fail → party preview. Dispatches `attemptCatch` or `skipCatch` |
| RewardScreen | 341 | Gold pickup (COLLECT button). Per-creature card draft — type-filtered, level-gated. Continue unlocks only after both gold and draft resolved |
| ShopScreen | 572 | Three tabs: CARDS (6 items, creature selector, LOCKED badge for ineligible), RELICS (3 random), HEAL (30% for ¥30) |
| RestScreen | 478 | Two choice tiles: Heal (HP preview per creature) or Upgrade (creature selector → card picker → before/after stat diff) |
| EventScreen | 322 | Event card with icon + title + narrative. Choice buttons with gold-gating. Result panel with outcome chips (▲/▼ coloured) |
| GameOverScreen | 123 | Floor, creatures caught, gold, relics. Party gravestones |

---

## 16. Balance Reference

All values set during the balance pass. Tuned so players can buy ~2 items per floor.

### Gold economy

| Source | Amount |
|---|---|
| Starting gold | ¥80 |
| Combat victory | ¥20–35 |
| Elite victory | ¥45–65 |
| Boss victory | ¥80–110 |

| Shop item | Cost |
|---|---|
| Common card | ¥30 |
| Uncommon card | ¥55 |
| Rare card | ¥90 |
| Legendary card | ¥150 |
| Party heal (30% HP) | ¥30 |
| Type relics | ¥70 |
| Colorless relics | ¥55–85 |

### Combat numbers

| Constant | Value | Notes |
|---|---|---|
| Energy per turn | 3 | Shared across both active creatures |
| Entry hand size | 5 | Drawn when creature enters battlefield |
| Cards drawn per turn | 1 per active | + relic bonuses |
| Hit formula | d20 + statMod ≥ AC | statMod = floor((stat-10)/2) |
| Damage formula | baseDamage + statMod | Same stat as hit roll |
| Avg base damage | 5.6 | Across all 146 cards |
| Avg AC (floor 1) | 13.5 | Typical floor 1 hit rate: 45–55% |

### Catch rates

| Node type | Modifier | Max catch chance |
|---|---|---|
| Combat | 1.0× | 70% (at 0 HP) |
| Elite | 0.7× | 49% |
| Boss | 0.25× | 17.5% |

Formula: `min((1 - hpRatio) × 0.7 × modifier, 0.95)`

---

## 17. System Status & Remaining Work

### Fully complete ✓

| System | File(s) |
|---|---|
| Data model + factories | gameSchema.js |
| Combat engine — d20 hit, damage, ALL status effects, AI turn | combatEngine.js |
| Map generator + roguelike helpers | mapGenerator.js |
| 146 card definitions across 6 types + colorless | cardDefs.js |
| 30 creature defs + 3-stage evolution + XP system | creatureDefs.js |
| Relic engine — 20 relics, 6 hooks wired + drain bonus | relicEngine.js |
| Event system — 20 events, 16 outcome types, repeat prevention | eventDefs.js |
| App shell + phase router | App.jsx, main.jsx |
| Global run state + all action creators + event resolver | RunContext.jsx |
| Title screen (animated orbs) | TitleScreen.jsx |
| Starter pick (stat preview, evo chain, deck preview) | StarterPickScreen.jsx |
| Roguelike DAG map with SVG connectors | MapScreen.jsx |
| Dramatic evolution reveal (flash → morph → particles → stats) | EvolutionScreen.jsx |
| Party management overlay (drag reorder, swap, deck viewer) | PartyScreen.jsx |
| Combat bridge | CombatScreen.jsx |
| Full combat UI — all card effects, statuses, type matchup, bench, relics | CombatUI.jsx |
| Post-combat catch screen (ball animation) | CatchScreen.jsx |
| Card draft + gold reward | RewardScreen.jsx |
| Shop (cards / relics / heal) | ShopScreen.jsx |
| Rest site — properly clears node on complete | RestScreen.jsx |
| Narrative event screen (choices + outcome chips) | EventScreen.jsx |
| Game over screen | GameOverScreen.jsx |
| Balance pass (gold, shop prices, d20 combat, real AI) | Multiple files |
| Wiring pass (card effects, statuses, type mult, bench, drain) | CombatUI.jsx, combatEngine.js |
| Minor fixes + audit pass (Flow UI, Fortify both sides, Stun lifecycle, Iron Will, Echo Stone, Momentum Gem, RestScreen) | CombatUI.jsx, combatEngine.js, RestScreen.jsx, RunContext.jsx |

### Remaining

| System | Priority | Effort | Notes |
|---|---|---|---|
| **Meta-progression** | Low | Medium (~4h) | localStorage — run history, creatures seen/caught, unlock bonus starter cards or relics after N wins |
| **Ascension modes** | Low | Medium (~4h) | Difficulty modifier stack applied at `startRun` — enemy HP multiplier, reduced catch rates, energy penalties, elite frequency boost |
