// ============================================================
//  eventDefs.js
//  20 narrative events for ? map nodes.
//
//  Each event has:
//    id, title, description, icon
//    choices: [{ id, label, outcome }]
//
//  Outcome shape:
//    { type, ...params }
//
//  Outcome types:
//    gold          { amount }                  — gain gold
//    lose_gold     { amount }                  — lose gold (or 0 if broke)
//    heal          { ratio }                   — heal party by ratio of max HP
//    damage        { ratio }                   — damage active creatures
//    add_card      { pool, count }             — draft random card(s)
//    add_relic     { relicId }                 — gain a specific relic
//    catch_chance  { probability }             — attempt to catch a random enemy creature
//    upgrade_card  { count }                   — upgrade N random cards in active creature's deck
//    remove_card   { count }                   — remove N cards from active creature's deck
//    nothing                                   — flavour-only, no effect
//    multi         { outcomes: [] }            — apply multiple outcomes
// ============================================================

export const EVENT_DEFS = [

  // ── GOLD EVENTS ─────────────────────────────────────────────

  {
    id: "forgotten_pouch",
    icon: "¥",
    title: "Forgotten Pouch",
    description:
      "Hidden beneath a mossy stone, you find a small leather pouch. It jingles with the weight of coins.",
    choices: [
      {
        id: "take",
        label: "Take the gold",
        outcome: { type:"gold", amount:40 },
        result: "You pocket 40 gold. Someone will be looking for this.",
      },
      {
        id: "leave",
        label: "Leave it — bad karma",
        outcome: { type:"nothing" },
        result: "You walk on. Your conscience is clean. Your pockets are empty.",
      },
    ],
  },

  {
    id: "traveling_merchant",
    icon: "$",
    title: "Travelling Merchant",
    description:
      "A cloaked merchant blocks your path. 'I've something rare,' they say, producing a glowing vial. 'For a price.'",
    choices: [
      {
        id: "buy_heal",
        label: "Pay 30 gold — buy the vial",
        outcome: { type:"multi", outcomes:[{ type:"lose_gold", amount:30 }, { type:"heal", ratio:0.4 }] },
        result: "Your creatures drink deeply. HP restored.",
        requiresGold: 30,
      },
      {
        id: "decline",
        label: "Decline and move on",
        outcome: { type:"nothing" },
        result: "The merchant shrugs and vanishes into the mist.",
      },
    ],
  },

  {
    id: "gambling_den",
    icon: "⚄",
    title: "Gambling Den",
    description:
      "A rickety tent houses a dice game. The dealer grins. 'Double or nothing. Your creatures look lucky.'",
    choices: [
      {
        id: "gamble_high",
        label: "Bet 50 gold (50% chance to win 100)",
        outcome: { type:"gamble", bet:50, winAmount:100, winChance:0.5 },
        result: "The dice clatter across the table...",
        requiresGold: 50,
      },
      {
        id: "gamble_low",
        label: "Bet 20 gold (60% chance to win 35)",
        outcome: { type:"gamble", bet:20, winAmount:35, winChance:0.6 },
        result: "Small stakes, but every gold counts...",
        requiresGold: 20,
      },
      {
        id: "walk_away",
        label: "Walk away",
        outcome: { type:"nothing" },
        result: "You keep your gold. The house always wins anyway.",
      },
    ],
  },

  {
    id: "tax_collector",
    icon: "✦",
    title: "The Toll Bridge",
    description:
      "A bridge troll demands payment. 'Ten gold per creature — or turn back.' The bridge is the only way forward.",
    choices: [
      {
        id: "pay",
        label: "Pay the toll",
        outcome: { type:"lose_gold_per_party", amountPerCreature:10 },
        result: "The troll steps aside, counting coins with thick fingers.",
      },
      {
        id: "fight_through",
        label: "Charge through — take damage",
        outcome: { type:"damage", ratio:0.2 },
        result: "You force your way past. Your creatures are bruised but free.",
      },
    ],
  },

  // ── CARD EVENTS ──────────────────────────────────────────────

  {
    id: "ancient_library",
    icon: "📖",
    title: "Ancient Library",
    description:
      "Towering shelves hold volumes in forgotten tongues. One book falls open to a page — the technique jumps into your mind.",
    choices: [
      {
        id: "study",
        label: "Study the technique (draft 1 card)",
        outcome: { type:"add_card", pool:"any", count:1 },
        result: "Knowledge absorbed. A new card added to your deck.",
      },
      {
        id: "take_two",
        label: "Study further — draft 2, discard 1",
        outcome: { type:"multi", outcomes:[
          { type:"add_card", pool:"any", count:2 },
          { type:"remove_card", count:1 },
        ]},
        result: "More knowledge, but your mind can only hold so much.",
      },
      {
        id: "leave",
        label: "Leave — knowledge has a price",
        outcome: { type:"nothing" },
        result: "Wisdom is knowing what to leave unread.",
      },
    ],
  },

  {
    id: "card_purge",
    icon: "✕",
    title: "The Purifying Flame",
    description:
      "A ritual fire burns in a stone circle. A voice says: 'Cast in your weakness, receive strength.'",
    choices: [
      {
        id: "purge_one",
        label: "Burn 1 card — receive 1 upgraded card",
        outcome: { type:"multi", outcomes:[
          { type:"remove_card", count:1 },
          { type:"add_card", pool:"any_uncommon", count:1 },
        ]},
        result: "The card turns to ash. A stronger technique emerges.",
      },
      {
        id: "purge_two",
        label: "Burn 2 cards — receive 1 rare card",
        outcome: { type:"multi", outcomes:[
          { type:"remove_card", count:2 },
          { type:"add_card", pool:"rare", count:1 },
        ]},
        result: "Two flames become one. Something rare rises from the smoke.",
      },
      {
        id: "decline",
        label: "Respect the flame — walk past",
        outcome: { type:"nothing" },
        result: "Some sacrifices aren't yours to make.",
      },
    ],
  },

  {
    id: "dueling_ghost",
    icon: "☠",
    title: "The Duelling Ghost",
    description:
      "A translucent warrior challenges you. 'Defeat me in one exchange or pay in pain.' It raises a spectral blade.",
    choices: [
      {
        id: "accept",
        label: "Accept the duel (50% — win a rare card or take damage)",
        outcome: { type:"gamble_card", winPool:"rare", lossOutcome:{ type:"damage", ratio:0.25 }, winChance:0.5 },
        result: "You raise your guard...",
      },
      {
        id: "flee",
        label: "Flee — lose 20 gold",
        outcome: { type:"lose_gold", amount:20 },
        result: "You run. The ghost laughs. Your ego hurts more than the 20 gold.",
        requiresGold: 20,
      },
    ],
  },

  {
    id: "upgrade_shrine",
    icon: "✦",
    title: "Shrine of Tempering",
    description:
      "A weathered shrine hums with power. The inscription reads: 'Only the worthy may improve their craft.'",
    choices: [
      {
        id: "offer_gold",
        label: "Offer 50 gold — upgrade a card",
        outcome: { type:"multi", outcomes:[
          { type:"lose_gold", amount:50 },
          { type:"upgrade_card", count:1 },
        ]},
        result: "The shrine glows. One of your cards has been strengthened.",
        requiresGold: 50,
      },
      {
        id: "offer_hp",
        label: "Offer blood — upgrade a card, lose 15% HP",
        outcome: { type:"multi", outcomes:[
          { type:"damage", ratio:0.15 },
          { type:"upgrade_card", count:1 },
        ]},
        result: "Pain flares briefly. Your card pulses with new power.",
      },
      {
        id: "ignore",
        label: "Walk past the shrine",
        outcome: { type:"nothing" },
        result: "Some power isn't worth the price.",
      },
    ],
  },

  // ── CREATURE EVENTS ──────────────────────────────────────────

  {
    id: "injured_creature",
    icon: "♥",
    title: "Injured Creature",
    description:
      "A wounded creature lies at the roadside, too exhausted to flee. It watches you with wary eyes.",
    choices: [
      {
        id: "heal_catch",
        label: "Tend to its wounds — it may join you (60% catch)",
        outcome: { type:"catch_chance", probability:0.6 },
        result: "You approach slowly, hands open...",
      },
      {
        id: "leave_heal",
        label: "Leave a healing herb and walk on",
        outcome: { type:"heal", ratio:0.1 },
        result: "Helping others restores something in you. Your party heals a little.",
      },
      {
        id: "ignore",
        label: "Leave it — you have enough to worry about",
        outcome: { type:"nothing" },
        result: "You move on. It watches until you're out of sight.",
      },
    ],
  },

  {
    id: "creature_nest",
    icon: "◉",
    title: "Creature Nest",
    description:
      "You stumble into a nesting ground. The guardian creature emerges — not aggressive, merely curious.",
    choices: [
      {
        id: "bond",
        label: "Offer food — attempt to befriend (45% catch)",
        outcome: { type:"catch_chance", probability:0.45 },
        result: "You hold out your hand with an offering...",
      },
      {
        id: "back_away",
        label: "Back away carefully — no harm done",
        outcome: { type:"nothing" },
        result: "You retreat quietly. The creature returns to its nest.",
      },
    ],
  },

  {
    id: "wild_battle",
    icon: "⚔",
    title: "Ambush!",
    description:
      "Creatures burst from the undergrowth! They're disorganised and already limping — easy pickings, or a free catch.",
    choices: [
      {
        id: "catch_attempt",
        label: "Throw a catch attempt (70% — they're weakened)",
        outcome: { type:"catch_chance", probability:0.70 },
        result: "You move fast, targeting the closest one...",
      },
      {
        id: "drive_off",
        label: "Drive them off — gain 25 gold from dropped items",
        outcome: { type:"gold", amount:25 },
        result: "They scatter, leaving behind dropped loot.",
      },
    ],
  },

  // ── HEAL / DAMAGE EVENTS ─────────────────────────────────────

  {
    id: "healing_spring",
    icon: "✿",
    title: "Healing Spring",
    description:
      "Crystal-clear water bubbles from a hidden spring. Your creatures crowd around eagerly.",
    choices: [
      {
        id: "drink_all",
        label: "Let all creatures drink (heal 30% HP)",
        outcome: { type:"heal", ratio:0.3 },
        result: "The cool water works quickly. Wounds close, energy returns.",
      },
      {
        id: "drink_careful",
        label: "Drink carefully — fill a flask for later (+20 gold equivalent heal at next rest)",
        outcome: { type:"gold", amount:30 },
        result: "You collect the water carefully. It'll be worth something later.",
      },
    ],
  },

  {
    id: "cursed_altar",
    icon: "◈",
    title: "Cursed Altar",
    description:
      "A black altar pulses with dark energy. Engravings suggest great power — and great risk.",
    choices: [
      {
        id: "activate",
        label: "Activate the altar (gain rare card, take 20% HP damage)",
        outcome: { type:"multi", outcomes:[
          { type:"damage", ratio:0.2 },
          { type:"add_card", pool:"rare", count:1 },
        ]},
        result: "Dark energy surges through your party. A card materialises.",
      },
      {
        id: "destroy",
        label: "Destroy the altar (gain 60 gold, take 10% HP damage)",
        outcome: { type:"multi", outcomes:[
          { type:"damage", ratio:0.1 },
          { type:"gold", amount:60 },
        ]},
        result: "The altar shatters. Coins scatter across the ground.",
      },
      {
        id: "ignore",
        label: "Leave it alone",
        outcome: { type:"nothing" },
        result: "Some things are best left untouched.",
      },
    ],
  },

  {
    id: "strange_mushroom",
    icon: "◉",
    title: "Strange Mushroom",
    description:
      "A cluster of luminescent mushrooms glows by the path. One of your creatures sniffs at it enthusiastically.",
    choices: [
      {
        id: "eat",
        label: "Let them eat it — unpredictable result",
        outcome: { type:"gamble", bet:0, winAmount:0, winChance:0.5,
          winOutcome:{ type:"heal", ratio:0.35 },
          lossOutcome:{ type:"damage", ratio:0.15 }},
        result: "Your creature chews thoughtfully...",
      },
      {
        id: "harvest",
        label: "Harvest and sell later (+30 gold)",
        outcome: { type:"gold", amount:30 },
        result: "An alchemist will pay well for these.",
      },
      {
        id: "ignore",
        label: "Pull them away — better safe than sorry",
        outcome: { type:"nothing" },
        result: "Your creatures look betrayed. You walk on.",
      },
    ],
  },

  // ── RELIC EVENTS ─────────────────────────────────────────────

  {
    id: "wandering_collector",
    icon: "✦",
    title: "The Collector",
    description:
      "A peculiar figure in a long coat examines trinkets. 'I'll trade,' they say, eyeing your gold pouch.",
    choices: [
      {
        id: "buy_relic",
        label: "Buy a random relic (75 gold)",
        outcome: { type:"multi", outcomes:[
          { type:"lose_gold", amount:75 },
          { type:"add_relic_random" },
        ]},
        result: "The collector hands over a strange artefact with a knowing smile.",
        requiresGold: 75,
      },
      {
        id: "trade_card",
        label: "Trade a card from your deck for a relic",
        outcome: { type:"multi", outcomes:[
          { type:"remove_card", count:1 },
          { type:"add_relic_random" },
        ]},
        result: "The collector studies the card carefully before pocketing it.",
      },
      {
        id: "decline",
        label: "Politely decline",
        outcome: { type:"nothing" },
        result: "They bow slightly and return to their trinkets.",
      },
    ],
  },

  {
    id: "ruined_shrine",
    icon: "◈",
    title: "Ruined Shrine",
    description:
      "Amid the rubble of a collapsed building, an intact reliquary rests on a broken pedestal. Inside: a pulsing artefact.",
    choices: [
      {
        id: "take",
        label: "Take the artefact (random relic)",
        outcome: { type:"add_relic_random" },
        result: "The artefact hums as you pick it up. Something has changed.",
      },
      {
        id: "leave_offering",
        label: "Leave an offering (40 gold) and take it",
        outcome: { type:"multi", outcomes:[
          { type:"lose_gold", amount:40 },
          { type:"add_relic_random" },
          { type:"heal", ratio:0.15 },
        ]},
        result: "Your respect is rewarded. The artefact glows warmly.",
        requiresGold: 40,
      },
      {
        id: "leave",
        label: "Leave it undisturbed",
        outcome: { type:"nothing" },
        result: "Some things belong to history.",
      },
    ],
  },

  // ── FLAVOUR / MIXED EVENTS ───────────────────────────────────

  {
    id: "crossroads_demon",
    icon: "✕",
    title: "The Crossroads",
    description:
      "A figure sits at the crossroads, face hidden in shadow. 'I can offer you power,' it says. 'Everything has a cost.'",
    choices: [
      {
        id: "deal_gold",
        label: "Power through pain — take a rare card, lose 25% HP",
        outcome: { type:"multi", outcomes:[
          { type:"damage", ratio:0.25 },
          { type:"add_card", pool:"rare", count:1 },
        ]},
        result: "A cold hand touches you briefly. A card appears in your mind.",
      },
      {
        id: "deal_future",
        label: "Take 80 gold — your next combat starts with less energy",
        outcome: { type:"gold", amount:80 },
        result: "Gold appears from nowhere. Something feels off.",
      },
      {
        id: "refuse",
        label: "Refuse and walk away",
        outcome: { type:"nothing" },
        result: "The figure tilts its head. 'Another time, then.'",
      },
    ],
  },

  {
    id: "old_trainer",
    icon: "★",
    title: "The Old Trainer",
    description:
      "A weathered trainer sits on a log, watching your creatures. 'Been a while since I've seen a party with that kind of potential.'",
    choices: [
      {
        id: "train_creature",
        label: "Accept training — active creature gains bonus XP (25)",
        outcome: { type:"xp_bonus", amount:25, target:"active_first" },
        result: "The old trainer puts your lead creature through its paces.",
      },
      {
        id: "trade_stories",
        label: "Trade stories — heal 15% HP",
        outcome: { type:"heal", ratio:0.15 },
        result: "An hour passes pleasantly. Your creatures are rested.",
      },
      {
        id: "ask_technique",
        label: "Ask for a technique — draft a colorless card",
        outcome: { type:"add_card", pool:"colorless", count:1 },
        result: "The trainer demonstrates a move. Your creatures watch carefully.",
      },
    ],
  },

  {
    id: "storm_shelter",
    icon: "◌",
    title: "Storm Shelter",
    description:
      "A sudden storm forces you into an abandoned barn. Several other travellers have taken shelter too.",
    choices: [
      {
        id: "trade",
        label: "Trade with the travellers (+30 gold, -1 random card)",
        outcome: { type:"multi", outcomes:[
          { type:"gold", amount:30 },
          { type:"remove_card", count:1 },
        ]},
        result: "Cards change hands. Gold changes hands. The storm rages on.",
      },
      {
        id: "rest",
        label: "Rest with your creatures (heal 20% HP)",
        outcome: { type:"heal", ratio:0.2 },
        result: "You settle in the dry hay. Your creatures sleep soundly.",
      },
      {
        id: "scout",
        label: "Scout the barn — find hidden stash",
        outcome: { type:"gamble", bet:0, winAmount:0, winChance:0.6,
          winOutcome: { type:"gold", amount:55 },
          lossOutcome:{ type:"nothing" }},
        result: "You poke around the corners...",
      },
    ],
  },

  {
    id: "echo_pool",
    icon: "◎",
    title: "The Echo Pool",
    description:
      "A still pool reflects not your image but a version of you — stronger, wearier. It whispers your creature's name.",
    choices: [
      {
        id: "commune",
        label: "Commune with the pool — random outcome",
        outcome: { type:"echo_pool_random" },
        result: "The pool ripples...",
      },
      {
        id: "look_away",
        label: "Look away — some futures are best unseen",
        outcome: { type:"nothing" },
        result: "You break eye contact. The whispers fade.",
      },
    ],
  },
];

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Pick a random event def, optionally avoiding recently seen events.
 * @param {string[]} recentIds — event ids seen in this run (avoid repeats)
 * @returns {EventDef}
 */
export function pickRandomEvent(recentIds = []) {
  const unseen = EVENT_DEFS.filter(e => !recentIds.includes(e.id));
  const pool   = unseen.length > 0 ? unseen : EVENT_DEFS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get an event def by id.
 */
export function getEventDef(id) {
  return EVENT_DEFS.find(e => e.id === id) ?? null;
}

// Pool helpers for add_card outcomes
export const CARD_POOLS = {
  any:           (cards) => cards.filter(c => c.rarity !== "legendary"),
  any_uncommon:  (cards) => cards.filter(c => c.rarity === "uncommon" || c.rarity === "rare"),
  rare:          (cards) => cards.filter(c => c.rarity === "rare" || c.rarity === "legendary"),
  colorless:     (cards) => cards.filter(c => c.type === "colorless"),
};

// Bonus relics available through events (not sold in shop)
export const EVENT_RELICS = [
  "war_drum", "heart_stone", "thorn_bark", "adrenaline_shard",
  "quick_draw", "iron_will", "poison_fang", "echo_stone",
  "glass_cannon", "ancient_tome", "berserker_ring", "momentum_gem",
];
