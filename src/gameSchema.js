// ============================================================
//  CORE DATA MODEL — Roguelike Creature Collector Deckbuilder
// ============================================================
//
//  This file defines the shape of every major game object.
//  Nothing here is mutable game state — these are the
//  *definitions* (templates) that live instances are created from.
//
//  Naming convention:
//    - "Definition" / "Def"  → static template (read-only source of truth)
//    - "Instance"            → a live, mutable copy during a run
// ============================================================


// ------------------------------------------------------------
//  CREATURE TYPES  (the "colors" of your game)
// ------------------------------------------------------------
//  Each creature belongs to exactly one type.
//  Cards belong to one type OR are colorless.

export const CreatureType = {
  FIRE:    'fire',
  WATER:   'water',
  EARTH:   'earth',
  WIND:    'wind',
  SHADOW:  'shadow',
  LIGHT:   'light',
  COLORLESS: 'colorless', // Any creature can draft these
};


// ------------------------------------------------------------
//  CARD DEFINITION  (static template)
// ------------------------------------------------------------
//  Cards are never mutated. A card "in a deck" is just its id
//  referenced in a creature's deckInstance.

export const CardRarity = {
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  LEGENDARY: 'legendary',
};

/**
 * @typedef {Object} CardDef
 * @property {string}   id           - Unique identifier e.g. "fire_ember_strike"
 * @property {string}   name         - Display name
 * @property {string}   description  - Rules text shown on card
 * @property {string}   type         - CreatureType (or COLORLESS)
 * @property {number}   energyCost   - Energy spent to play (0–3 typical)
 * @property {number}   levelRequired - Minimum creature level to include in deck
 * @property {string}   rarity       - CardRarity
 * @property {string[]} tags         - e.g. ['attack', 'aoe', 'buff', 'status']
 * @property {Function} effect       - (battleState, source, targets) => newBattleState
 */

// Example card definitions
export const CARD_DEFS = {
  ember_strike: {
    id: 'ember_strike',
    name: 'Ember Strike',
    description: 'Deal 6 damage. Apply 1 Burn.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 1,
    rarity: CardRarity.COMMON,
    tags: ['attack', 'status'],
    effect: (battleState, source, targets) => {
      // Implementation in combat engine
      return battleState;
    },
  },

  inferno: {
    id: 'inferno',
    name: 'Inferno',
    description: 'Deal 4 damage to ALL enemies. Apply 2 Burn to each.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 3,       // Only accessible once creature hits level 3
    rarity: CardRarity.UNCOMMON,
    tags: ['attack', 'aoe', 'status'],
    effect: (battleState, source, targets) => battleState,
  },

  steady_flow: {
    id: 'steady_flow',
    name: 'Steady Flow',
    description: 'Gain 4 Shield.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 1,
    rarity: CardRarity.COMMON,
    tags: ['defend'],
    effect: (battleState, source, targets) => battleState,
  },

  // Colorless — any creature can draft this
  focus: {
    id: 'focus',
    name: 'Focus',
    description: 'Draw 2 cards.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 1,
    rarity: CardRarity.COMMON,
    tags: ['utility'],
    effect: (battleState, source, targets) => battleState,
  },

  zenith: {
    id: 'zenith',
    name: 'Zenith',
    description: 'Gain 3 Energy this turn.',
    type: CreatureType.COLORLESS,
    energyCost: 0,
    levelRequired: 1,
    rarity: CardRarity.UNCOMMON,
    tags: ['utility'],
    effect: (battleState, source, targets) => battleState,
  },
};


// ------------------------------------------------------------
//  CREATURE DEFINITION  (static template)
// ------------------------------------------------------------

/**
 * @typedef {Object} CreatureDef
 * @property {string}   id            - Unique identifier e.g. "emberfox"
 * @property {string}   name          - Display name
 * @property {string}   type          - CreatureType
 * @property {number}   baseHp        - Max HP at level 1
 * @property {number}   hpPerLevel    - HP added per level above 1
 * @property {number}   baseEnergy    - Energy available per combat turn
 * @property {string[]} starterDeck   - Array of CardDef ids (exactly 10)
 * @property {Object}   cardPool      - { [levelRequired]: cardId[] }
 *                                      Cards a creature can draft, keyed by min level
 * @property {string}   description   - Flavour / gameplay summary
 * @property {string[]} passiveTags   - Hints for synergy display e.g. ['burn', 'aoe']
 */

export const CREATURE_DEFS = {
  emberfox: {
    id: 'emberfox',
    name: 'Emberfox',
    type: CreatureType.FIRE,
    baseHp: 60,
    hpPerLevel: 8,
    baseEnergy: 3,
    description: 'An aggressive fire-type that excels at stacking Burn.',
    passiveTags: ['burn', 'aggro'],

    // The 10 cards every Emberfox starts a run with
    starterDeck: [
      'ember_strike', 'ember_strike', 'ember_strike',
      'ember_strike', 'ember_strike',
      'steady_flow',  // colorless allowed in starter deck
      'focus', 'focus',
      'zenith',
      'ember_strike',  // 10 total
    ],

    // Cards this creature CAN draft (beyond what's already in the deck)
    // keyed by levelRequired so the draft UI can filter automatically
    cardPool: {
      1: ['ember_strike', 'focus', 'zenith'],
      3: ['inferno'],
      // level 5+, 7+, etc. added as more cards are defined
    },
  },
};


// ------------------------------------------------------------
//  CREATURE INSTANCE  (mutable, lives inside a Run)
// ------------------------------------------------------------
//  Created from a CreatureDef at the start of a run.
//  This is the object you put in React state.

/**
 * Creates a fresh creature instance from a definition.
 * @param {CreatureDef} def
 * @param {number} [startingLevel=1]
 * @returns {CreatureInstance}
 */
export function createCreatureInstance(def, startingLevel = 1) {
  // Resolve stats, name, and AC from the correct evolution stage
  const stageName = startingLevel >= 5 ? 'elder' : startingLevel >= 3 ? 'adult' : 'baby';
  const stage = def.stages?.[stageName] ?? def.stages?.baby ?? {};
  const maxHp = def.baseHp + def.hpPerLevel * (startingLevel - 1);

  // XP threshold to reach the next level
  const XP_TABLE = [
    { level: 2, totalXp: 15 },
    { level: 3, totalXp: 35 },
    { level: 4, totalXp: 60 },
    { level: 5, totalXp: 90 },
    { level: 6, totalXp: 130 },
  ];
  const xpEntry = XP_TABLE.find(t => t.level === startingLevel + 1);

  return {
    defId:       def.id,
    name:        stage.name       ?? def.name,
    type:        def.type,
    level:       startingLevel,
    xp:          0,
    xpNext:      xpEntry?.totalXp ?? null,
    maxHp,
    currentHp:   maxHp,
    armorClass:  stage.armorClass ?? 12,
    stats:       stage.stats      ?? { strength:10, dexterity:10, intelligence:10, constitution:10, wisdom:10 },
    energy:      def.baseEnergy   ?? 3,
    deck:        [...def.starterDeck],
    statusEffects: [],
    justEvolved: false,
  };
}


// ------------------------------------------------------------
//  STATUS EFFECT DEFINITIONS
// ------------------------------------------------------------

export const StatusEffectDef = {
  BURN: {
    id: 'burn',
    name: 'Burn',
    description: 'Take N damage at the start of each turn.',
    stackable: true,
    // Called each turn by the combat engine
    onTurnStart: (creature, stacks) => {
      // Returns damage to apply
      return stacks;
    },
  },

  SHIELD: {
    id: 'shield',
    name: 'Shield',
    description: 'Absorb N incoming damage. Expires end of turn.',
    stackable: true,
    expiresEndOfTurn: true,
    onDamageReceived: (creature, stacks, incomingDamage) => {
      const absorbed = Math.min(stacks, incomingDamage);
      return { remainingDamage: incomingDamage - absorbed, remainingStacks: stacks - absorbed };
    },
  },

  STUN: {
    id: 'stun',
    name: 'Stun',
    description: 'Skip your next turn.',
    stackable: false,
    expiresAfterTrigger: true,
  },
};


// ------------------------------------------------------------
//  RUN STATE  (the top-level mutable game state)
// ------------------------------------------------------------
//  This is what you store in your top-level React context/state.

/**
 * @typedef {Object} RunState
 * @property {string}             runId         - UUID for the run
 * @property {CreatureInstance[]} party         - Active creatures (max 3 recommended)
 * @property {CreatureInstance[]} roster        - All caught creatures this run
 * @property {number}             gold          - Currency for shops
 * @property {string[]}           relics        - Relic ids collected this run
 * @property {MapState}           map           - The current floor's node map
 * @property {string}             phase         - 'map' | 'combat' | 'shop' | 'event' | 'gameover'
 */

/**
 * Creates a brand new run.
 * @param {CreatureDef} starterCreatureDef
 * @returns {RunState}
 */
export function createNewRun(starterCreatureDef) {
  const starter = createCreatureInstance(starterCreatureDef, 1);
  return {
    runId: crypto.randomUUID(),
    party: [starter],
    roster: [starter],
    gold: 50,
    relics: [],
    map: null,     // Generated separately by the map system
    phase: 'map',
  };
}


// ------------------------------------------------------------
//  DRAFT HELPERS
// ------------------------------------------------------------
//  These functions enforce the type-restriction rules.

/**
 * Returns all card defs a creature is currently eligible to draft.
 * Filters by: creature type OR colorless, AND levelRequired <= creature.level.
 *
 * @param {CreatureInstance} creature
 * @returns {CardDef[]}
 */
export function getDraftableCards(creature) {
  return Object.values(CARD_DEFS).filter(card => {
    const typeAllowed = card.type === creature.type || card.type === CreatureType.COLORLESS;
    const levelAllowed = card.levelRequired <= creature.level;
    return typeAllowed && levelAllowed;
  });
}

/**
 * Adds a card to a creature's deck (enforces type rules).
 * Returns updated deck array (immutable — does not mutate input).
 *
 * @param {CreatureInstance} creature
 * @param {string} cardId
 * @returns {string[]} new deck array
 */
export function addCardToDeck(creature, cardId) {
  const card = CARD_DEFS[cardId];
  if (!card) throw new Error(`Unknown card: ${cardId}`);

  const typeAllowed = card.type === creature.type || card.type === CreatureType.COLORLESS;
  if (!typeAllowed) {
    throw new Error(`${creature.name} cannot draft ${card.name} (type mismatch)`);
  }
  if (card.levelRequired > creature.level) {
    throw new Error(`${creature.name} must be level ${card.levelRequired} to draft ${card.name}`);
  }

  return [...creature.deck, cardId];
}

/**
 * Removes one copy of a card from a creature's deck.
 * Returns updated deck array (immutable).
 *
 * @param {CreatureInstance} creature
 * @param {string} cardId
 * @returns {string[]} new deck array
 */
export function removeCardFromDeck(creature, cardId) {
  const idx = creature.deck.indexOf(cardId);
  if (idx === -1) throw new Error(`Card ${cardId} not in deck`);
  return [...creature.deck.slice(0, idx), ...creature.deck.slice(idx + 1)];
}
