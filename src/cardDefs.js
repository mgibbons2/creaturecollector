// ============================================================
//  CARD DEFINITIONS — Full Launch Set
//  ~25–30 cards per type + colorless
//
//  Each card follows the CardDef shape from gameSchema.js:
//  {
//    id, name, description, type, energyCost, levelRequired,
//    rarity, tags, scalingStat,
//    baseDamage?, shieldAmount?, healAmount?, drawAmount?,
//    onHitStatus?,    { type, stacks }
//    onPlayStatus?,   { target: 'self'|'enemy', type, stacks }
//    keyword?,        { type, stacks }  — signature keyword effect
//    effect: Function — resolved by combat engine
//  }
//
//  SIGNATURE KEYWORDS (one per type):
//    Ignite  (Fire)    — stacks on enemy; deal stacks as dmg at turn start, -1 per tick
//    Flow    (Water)   — stacks on self; each stack reduces next card's cost by 1
//    Fortify (Earth)   — stacks on self; each stack = +1 AC until your next turn
//    Gust    (Wind)    — stacks on self; draw that many extra cards next turn start
//    Drain   (Shadow)  — damage dealt heals your creature for a portion
//    Radiance(Light)   — stacks on self; some cards consume all stacks for bonus effects
// ============================================================

import { CreatureType } from './gameSchema.js';

const noop = (state) => state; // placeholder — combat engine resolves via tags + fields


// ============================================================
//  FIRE  — Aggro / Burn stacker
//  Identity: get damage on the board fast, stack Ignite,
//  finish with high-cost burst cards. Low defense.
//  scalingStat: mostly strength, some intelligence for magic fire
// ============================================================

export const FIRE_CARDS = {

  // ---- COMMON ----

  ember_strike: {
    id: 'ember_strike',
    name: 'Ember Strike',
    description: 'Deal 9 damage.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack'],
    scalingStat: 'strength',
    baseDamage: 9,
    effect: noop,
  },

  cinder_toss: {
    id: 'cinder_toss',
    name: 'Cinder Toss',
    description: 'Deal 7 damage. Apply 1 Ignite.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'status'],
    scalingStat: 'strength',
    baseDamage: 7,
    onHitStatus: { type: 'ignite', stacks: 1 },
    effect: noop,
  },

  heat_up: {
    id: 'heat_up',
    name: 'Heat Up',
    description: 'Apply 2 Ignite to target.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['status'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'ignite', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  flame_shield: {
    id: 'flame_shield',
    name: 'Flame Shield',
    description: 'Gain 6 Shield. Deal 2 damage to attacker when hit.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend'],
    scalingStat: 'constitution',
    shieldAmount: 6,
    onPlayStatus: { target: 'self', type: 'thorns', stacks: 2 },
    effect: noop,
  },

  quick_burn: {
    id: 'quick_burn',
    name: 'Quick Burn',
    description: 'Deal 6 damage twice.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'multi_hit'],
    scalingStat: 'dexterity',
    baseDamage: 6,
    hits: 2,
    effect: noop,
  },

  smolder: {
    id: 'smolder',
    name: 'Smolder',
    description: 'Apply 1 Ignite to all enemies.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['status', 'aoe'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'ignite', stacks: 1 },
    baseDamage: 0,
    effect: noop,
  },

  stoke: {
    id: 'stoke',
    name: 'Stoke',
    description: 'Deal 6 damage. Draw 1 card.',
    type: CreatureType.FIRE,
    energyCost: 0,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'utility'],
    scalingStat: 'intelligence',
    baseDamage: 6,
    drawAmount: 1,
    effect: noop,
  },

  ash_wall: {
    id: 'ash_wall',
    name: 'Ash Wall',
    description: 'Gain 10 Shield.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend'],
    scalingStat: 'constitution',
    shieldAmount: 10,
    effect: noop,
  },

  // ---- UNCOMMON ----

  fan_the_flames: {
    id: 'fan_the_flames',
    name: 'Fan the Flames',
    description: 'Double target\'s Ignite stacks.',
    type: CreatureType.FIRE,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['status', 'keyword'],
    scalingStat: 'intelligence',
    keywordEffect: { type: 'ignite', action: 'double' },
    effect: noop,
  },

  scorched_earth: {
    id: 'scorched_earth',
    name: 'Scorched Earth',
    description: 'Deal 5 damage to all enemies. Apply 1 Ignite to each.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'aoe', 'status'],
    scalingStat: 'intelligence',
    baseDamage: 5,
    onHitStatus: { type: 'ignite', stacks: 1 },
    effect: noop,
  },

  flame_dash: {
    id: 'flame_dash',
    name: 'Flame Dash',
    description: 'Deal 8 damage. This card costs 0 if you played a card last turn.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'conditional'],
    scalingStat: 'dexterity',
    baseDamage: 8,
    conditionalCostReduction: { condition: 'played_last_turn', reduction: 2 },
    effect: noop,
  },

  ignition: {
    id: 'ignition',
    name: 'Ignition',
    description: 'Deal damage equal to target\'s Ignite stacks × 3.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'keyword'],
    scalingStat: 'intelligence',
    keywordScaledDamage: { type: 'ignite', multiplier: 3 },
    effect: noop,
  },

  backdraft: {
    id: 'backdraft',
    name: 'Backdraft',
    description: 'Deal 7 damage. If this misses, apply 3 Ignite instead.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'conditional'],
    scalingStat: 'strength',
    baseDamage: 7,
    onMissEffect: { type: 'ignite', stacks: 3 },
    effect: noop,
  },

  pyromaniac: {
    id: 'pyromaniac',
    name: 'Pyromaniac',
    description: 'Gain 1 energy for each Ignite stack on enemies this turn.',
    type: CreatureType.FIRE,
    energyCost: 0,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['utility', 'keyword', 'energy'],
    scalingStat: 'intelligence',
    energyPerStack: { type: 'ignite' },
    effect: noop,
  },

  burnout: {
    id: 'burnout',
    name: 'Burnout',
    description: 'Deal 12 damage. Discard your hand.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'drawback'],
    scalingStat: 'strength',
    baseDamage: 12,
    onPlayEffect: { type: 'discard_hand' },
    effect: noop,
  },

  heat_wave: {
    id: 'heat_wave',
    name: 'Heat Wave',
    description: 'Apply 2 Ignite to all enemies.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['status', 'aoe', 'keyword'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'ignite', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  magma_coat: {
    id: 'magma_coat',
    name: 'Magma Coat',
    description: 'Gain 8 Shield. Apply 1 Ignite to any enemy that attacks you this turn.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['defend', 'keyword', 'reactive'],
    scalingStat: 'constitution',
    shieldAmount: 8,
    reactiveStatus: { trigger: 'on_hit_received', type: 'ignite', stacks: 1 },
    effect: noop,
  },

  // ---- RARE ----

  inferno: {
    id: 'inferno',
    name: 'Inferno',
    description: 'Deal 10 damage to all enemies. Apply 2 Ignite to each.',
    type: CreatureType.FIRE,
    energyCost: 3,
    levelRequired: 3,
    rarity: 'rare',
    tags: ['attack', 'aoe', 'status', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 10,
    onHitStatus: { type: 'ignite', stacks: 2 },
    effect: noop,
  },

  rising_phoenix: {
    id: 'rising_phoenix',
    name: 'Rising Phoenix',
    description: 'Deal 15 damage. If this creature is below 50% HP, heal 10 HP.',
    type: CreatureType.FIRE,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['attack', 'conditional', 'heal'],
    scalingStat: 'strength',
    baseDamage: 15,
    conditionalHeal: { condition: 'self_below_half', healAmount: 10 },
    effect: noop,
  },

  conflagration: {
    id: 'conflagration',
    name: 'Conflagration',
    description: 'Remove all Ignite from target. Deal that much damage × 4.',
    type: CreatureType.FIRE,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['attack', 'keyword'],
    scalingStat: 'intelligence',
    keywordConsumeForDamage: { type: 'ignite', multiplier: 4 },
    effect: noop,
  },

  firestorm: {
    id: 'firestorm',
    name: 'Firestorm',
    description: 'Deal 6 damage to all enemies three times. Apply 1 Ignite per hit.',
    type: CreatureType.FIRE,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'rare',
    tags: ['attack', 'aoe', 'multi_hit', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 6,
    hits: 3,
    onHitStatus: { type: 'ignite', stacks: 1 },
    effect: noop,
  },

  volcanic_rage: {
    id: 'volcanic_rage',
    name: 'Volcanic Rage',
    description: 'Your Fire cards deal +3 damage for the rest of this combat.',
    type: CreatureType.FIRE,
    energyCost: 2,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['buff', 'synergy'],
    scalingStat: 'intelligence',
    combatBuff: { target: 'self', stat: 'fire_damage', amount: 3, duration: 'combat' },
    effect: noop,
  },

  // ---- LEGENDARY ----

  solar_flare: {
    id: 'solar_flare',
    name: 'Solar Flare',
    description: 'Deal 20 damage. Apply 5 Ignite. Cannot miss.',
    type: CreatureType.FIRE,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'legendary',
    tags: ['attack', 'keyword', 'unblockable'],
    scalingStat: 'intelligence',
    baseDamage: 20,
    onHitStatus: { type: 'ignite', stacks: 5 },
    alwaysHits: true,
    effect: noop,
  },

  heart_of_the_volcano: {
    id: 'heart_of_the_volcano',
    name: 'Heart of the Volcano',
    description: 'For 3 turns: your creature is immune to damage. At the end, deal Ignite stacks × 5 to all enemies.',
    type: CreatureType.FIRE,
    energyCost: 3,
    levelRequired: 6,
    rarity: 'legendary',
    tags: ['buff', 'keyword', 'delayed'],
    scalingStat: 'constitution',
    timedEffect: { duration: 3, onExpire: { type: 'ignite_burst', multiplier: 5, target: 'all_enemies' } },
    onPlayStatus: { target: 'self', type: 'immune', stacks: 3 },
    effect: noop,
  },
};


// ============================================================
//  WATER  — Sustain / Shield / Healing
//  Identity: outlast enemies through shielding and healing,
//  build Flow stacks to discount big cards, attrition control.
//  scalingStat: mostly wisdom and constitution
// ============================================================

export const WATER_CARDS = {

  // ---- COMMON ----

  water_jet: {
    id: 'water_jet',
    name: 'Water Jet',
    description: 'Deal 8 damage.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack'],
    scalingStat: 'strength',
    baseDamage: 8,
    effect: noop,
  },

  steady_flow: {
    id: 'steady_flow',
    name: 'Steady Flow',
    description: 'Gain 6 Shield. Gain 1 Flow.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    shieldAmount: 6,
    onPlayStatus: { target: 'self', type: 'flow', stacks: 1 },
    effect: noop,
  },

  mending_mist: {
    id: 'mending_mist',
    name: 'Mending Mist',
    description: 'Heal 8 HP.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['heal'],
    scalingStat: 'wisdom',
    healAmount: 8,
    effect: noop,
  },

  ripple: {
    id: 'ripple',
    name: 'Ripple',
    description: 'Deal 6 damage. Gain 1 Flow.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'keyword'],
    scalingStat: 'dexterity',
    baseDamage: 6,
    onPlayStatus: { target: 'self', type: 'flow', stacks: 1 },
    effect: noop,
  },

  current: {
    id: 'current',
    name: 'Current',
    description: 'Gain 2 Flow.',
    type: CreatureType.WATER,
    energyCost: 0,
    levelRequired: 1,
    rarity: 'common',
    tags: ['keyword', 'utility'],
    scalingStat: 'wisdom',
    onPlayStatus: { target: 'self', type: 'flow', stacks: 2 },
    effect: noop,
  },

  bubble_barrier: {
    id: 'bubble_barrier',
    name: 'Bubble Barrier',
    description: 'Gain 12 Shield.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend'],
    scalingStat: 'constitution',
    shieldAmount: 12,
    effect: noop,
  },

  cool_down: {
    id: 'cool_down',
    name: 'Cool Down',
    description: 'Remove 2 Ignite stacks from target creature.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['utility', 'cleanse'],
    scalingStat: 'wisdom',
    removeStatus: { type: 'ignite', stacks: 2, target: 'any' },
    effect: noop,
  },

  trickle: {
    id: 'trickle',
    name: 'Trickle',
    description: 'Heal 4 HP. Draw 1 card.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['heal', 'utility'],
    scalingStat: 'wisdom',
    healAmount: 4,
    drawAmount: 1,
    effect: noop,
  },

  // ---- UNCOMMON ----

  tidal_shield: {
    id: 'tidal_shield',
    name: 'Tidal Shield',
    description: 'Gain Shield equal to your Flow stacks × 4. Consume all Flow.',
    type: CreatureType.WATER,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    keywordConsumeForShield: { type: 'flow', multiplier: 4 },
    effect: noop,
  },

  undertow: {
    id: 'undertow',
    name: 'Undertow',
    description: 'Deal 7 damage. Apply Stun for 1 turn.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'status', 'control'],
    scalingStat: 'strength',
    baseDamage: 7,
    onHitStatus: { type: 'stun', stacks: 1 },
    effect: noop,
  },

  wellspring: {
    id: 'wellspring',
    name: 'Wellspring',
    description: 'Heal 6 HP. Gain 2 Flow.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['heal', 'keyword'],
    scalingStat: 'wisdom',
    healAmount: 6,
    onPlayStatus: { target: 'self', type: 'flow', stacks: 2 },
    effect: noop,
  },

  riptide: {
    id: 'riptide',
    name: 'Riptide',
    description: 'Deal 5 damage twice. Gain 1 Flow per hit.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'multi_hit', 'keyword'],
    scalingStat: 'dexterity',
    baseDamage: 5,
    hits: 2,
    onHitStatus: { type: 'flow', stacks: 1, target: 'self' },
    effect: noop,
  },

  aqua_pulse: {
    id: 'aqua_pulse',
    name: 'Aqua Pulse',
    description: 'Deal 4 damage to all enemies. Heal 3 HP for each enemy hit.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'aoe', 'heal'],
    scalingStat: 'wisdom',
    baseDamage: 4,
    healPerHit: 3,
    effect: noop,
  },

  flood: {
    id: 'flood',
    name: 'Flood',
    description: 'Apply Waterlogged (2) to all enemies. Waterlogged: -2 AC.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['status', 'aoe', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'waterlogged', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  deep_breath: {
    id: 'deep_breath',
    name: 'Deep Breath',
    description: 'Cleanse all negative status effects from your creature. Gain 3 Flow.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['cleanse', 'keyword', 'utility'],
    scalingStat: 'wisdom',
    cleanseSelf: true,
    onPlayStatus: { target: 'self', type: 'flow', stacks: 3 },
    effect: noop,
  },

  still_waters: {
    id: 'still_waters',
    name: 'Still Waters',
    description: 'Gain 5 Shield. Heal 5 HP.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['defend', 'heal'],
    scalingStat: 'constitution',
    shieldAmount: 5,
    healAmount: 5,
    effect: noop,
  },

  // ---- RARE ----

  torrential_heal: {
    id: 'torrential_heal',
    name: 'Torrential Heal',
    description: 'Heal HP equal to your Flow stacks × 6. Consume all Flow.',
    type: CreatureType.WATER,
    energyCost: 2,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['heal', 'keyword'],
    scalingStat: 'wisdom',
    keywordConsumeForHeal: { type: 'flow', multiplier: 6 },
    effect: noop,
  },

  maelstrom: {
    id: 'maelstrom',
    name: 'Maelstrom',
    description: 'Deal 12 damage to all enemies. Apply 2 Stun to each.',
    type: CreatureType.WATER,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['attack', 'aoe', 'status', 'control'],
    scalingStat: 'intelligence',
    baseDamage: 12,
    onHitStatus: { type: 'stun', stacks: 2 },
    effect: noop,
  },

  ocean_bastion: {
    id: 'ocean_bastion',
    name: 'Ocean Bastion',
    description: 'Gain 20 Shield. Gain 4 Flow.',
    type: CreatureType.WATER,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    shieldAmount: 20,
    onPlayStatus: { target: 'self', type: 'flow', stacks: 4 },
    effect: noop,
  },

  abyssal_current: {
    id: 'abyssal_current',
    name: 'Abyssal Current',
    description: 'Deal 8 damage. For each Flow stack you have, deal 2 extra damage.',
    type: CreatureType.WATER,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'rare',
    tags: ['attack', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 8,
    bonusDamagePerStack: { type: 'flow', amount: 2 },
    effect: noop,
  },

  // ---- LEGENDARY ----

  the_deep: {
    id: 'the_deep',
    name: 'The Deep',
    description: 'Heal to full HP. Gain Flow equal to 50% of your max HP / 5. Cannot be played above 50% HP.',
    type: CreatureType.WATER,
    energyCost: 3,
    levelRequired: 6,
    rarity: 'legendary',
    tags: ['heal', 'keyword', 'conditional'],
    scalingStat: 'wisdom',
    healToFull: true,
    conditionalPlay: { condition: 'self_below_half' },
    onPlayStatus: { target: 'self', type: 'flow', stacks: 'hp_scaled' },
    effect: noop,
  },

  tidal_wave: {
    id: 'tidal_wave',
    name: 'Tidal Wave',
    description: 'Deal 15 damage to all enemies. Heal your creature for total damage dealt.',
    type: CreatureType.WATER,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'legendary',
    tags: ['attack', 'aoe', 'heal'],
    scalingStat: 'intelligence',
    baseDamage: 15,
    healForDamageDealt: true,
    effect: noop,
  },
};


// ============================================================
//  EARTH  — Armor / Slow Control
//  Identity: massive AC buffs via Fortify, hard CC, punish
//  enemies who swing into a fortified wall.
//  scalingStat: constitution, strength
// ============================================================

export const EARTH_CARDS = {

  // ---- COMMON ----

  stone_strike: {
    id: 'stone_strike',
    name: 'Stone Strike',
    description: 'Deal 9 damage.',
    type: CreatureType.EARTH,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack'],
    scalingStat: 'strength',
    baseDamage: 9,
    effect: noop,
  },

  bedrock: {
    id: 'bedrock',
    name: 'Bedrock',
    description: 'Gain 2 Fortify.',
    type: CreatureType.EARTH,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 2 },
    effect: noop,
  },

  mud_slick: {
    id: 'mud_slick',
    name: 'Mud Slick',
    description: 'Apply Slow (1) to target. Slow: -1 to all hit rolls.',
    type: CreatureType.EARTH,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['status', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'slow', stacks: 1 },
    baseDamage: 0,
    effect: noop,
  },

  rockwall: {
    id: 'rockwall',
    name: 'Rock Wall',
    description: 'Gain 8 Shield. Gain 1 Fortify.',
    type: CreatureType.EARTH,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    shieldAmount: 8,
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 1 },
    effect: noop,
  },

  quake: {
    id: 'quake',
    name: 'Quake',
    description: 'Deal 7 damage to all enemies.',
    type: CreatureType.EARTH,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'aoe'],
    scalingStat: 'strength',
    baseDamage: 7,
    effect: noop,
  },

  earthen_skin: {
    id: 'earthen_skin',
    name: 'Earthen Skin',
    description: 'Gain 3 Fortify. Gain 6 Shield.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    shieldAmount: 6,
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 3 },
    effect: noop,
  },

  ground_pound: {
    id: 'ground_pound',
    name: 'Ground Pound',
    description: 'Deal 11 damage. Apply Slow (1).',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'status', 'control'],
    scalingStat: 'strength',
    baseDamage: 11,
    onHitStatus: { type: 'slow', stacks: 1 },
    effect: noop,
  },

  dust_cloud: {
    id: 'dust_cloud',
    name: 'Dust Cloud',
    description: 'Apply Blind (2) to all enemies. Blind: -2 to hit rolls.',
    type: CreatureType.EARTH,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['status', 'aoe', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'blind', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  // ---- UNCOMMON ----

  granite_will: {
    id: 'granite_will',
    name: 'Granite Will',
    description: 'Gain Fortify equal to your current Shield / 4 (rounded up).',
    type: CreatureType.EARTH,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['defend', 'keyword', 'synergy'],
    scalingStat: 'constitution',
    fortifyFromShield: { divisor: 4 },
    effect: noop,
  },

  petrify: {
    id: 'petrify',
    name: 'Petrify',
    description: 'Apply Stun (1) to target. Apply Slow (2) to target.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['status', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'stun', stacks: 1 },
    additionalStatus: { type: 'slow', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  seismic_slam: {
    id: 'seismic_slam',
    name: 'Seismic Slam',
    description: 'Deal 10 damage. Deal 5 damage to the other enemy.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'splash'],
    scalingStat: 'strength',
    baseDamage: 10,
    splashDamage: { target: 'other_enemy', amount: 5 },
    effect: noop,
  },

  tectonic_shift: {
    id: 'tectonic_shift',
    name: 'Tectonic Shift',
    description: 'Gain 4 Fortify. Lose all Shield. Gain Shield equal to Fortify × 3.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['defend', 'keyword', 'combo'],
    scalingStat: 'constitution',
    onPlayEffect: { type: 'fortify_to_shield', fortifyGain: 4, multiplier: 3 },
    effect: noop,
  },

  stone_skin: {
    id: 'stone_skin',
    name: 'Stone Skin',
    description: 'Until your next turn, reduce all incoming damage by 3.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['defend', 'buff'],
    scalingStat: 'constitution',
    onPlayStatus: { target: 'self', type: 'damage_reduction', stacks: 3 },
    effect: noop,
  },

  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    description: 'Deal 6 damage to all enemies. Apply Slow (2) to each.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'aoe', 'status', 'control'],
    scalingStat: 'strength',
    baseDamage: 6,
    onHitStatus: { type: 'slow', stacks: 2 },
    effect: noop,
  },

  living_fortress: {
    id: 'living_fortress',
    name: 'Living Fortress',
    description: 'Gain 5 Fortify. While you have Fortify, attacks against you deal 2 less damage.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['defend', 'keyword', 'buff'],
    scalingStat: 'constitution',
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 5 },
    conditionalPassive: { requires: 'fortify', effect: 'reduce_incoming', amount: 2 },
    effect: noop,
  },

  // ---- RARE ----

  mountain_form: {
    id: 'mountain_form',
    name: 'Mountain Form',
    description: 'Gain 8 Fortify. For this turn, you cannot be stunned.',
    type: CreatureType.EARTH,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['defend', 'keyword', 'buff'],
    scalingStat: 'constitution',
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 8 },
    onPlayImmunity: { type: 'stun', duration: 1 },
    effect: noop,
  },

  landslide: {
    id: 'landslide',
    name: 'Landslide',
    description: 'Deal damage equal to your Fortify stacks × 5 to all enemies.',
    type: CreatureType.EARTH,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['attack', 'aoe', 'keyword'],
    scalingStat: 'strength',
    keywordScaledDamage: { type: 'fortify', multiplier: 5 },
    effect: noop,
  },

  geological_patience: {
    id: 'geological_patience',
    name: 'Geological Patience',
    description: 'Skip your attack this turn. Gain 10 Fortify and 20 Shield.',
    type: CreatureType.EARTH,
    energyCost: 2,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['defend', 'keyword', 'drawback'],
    scalingStat: 'constitution',
    shieldAmount: 20,
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 10 },
    onPlayEffect: { type: 'skip_attack' },
    effect: noop,
  },

  fault_line: {
    id: 'fault_line',
    name: 'Fault Line',
    description: 'Deal 15 damage. Apply Stun (2) and Slow (3) to target.',
    type: CreatureType.EARTH,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'rare',
    tags: ['attack', 'status', 'control'],
    scalingStat: 'strength',
    baseDamage: 15,
    onHitStatus: { type: 'stun', stacks: 2 },
    additionalStatus: { type: 'slow', stacks: 3 },
    effect: noop,
  },

  // ---- LEGENDARY ----

  world_pillar: {
    id: 'world_pillar',
    name: 'World Pillar',
    description: 'Gain 15 Fortify. This creature cannot faint this turn.',
    type: CreatureType.EARTH,
    energyCost: 3,
    levelRequired: 6,
    rarity: 'legendary',
    tags: ['defend', 'keyword', 'buff'],
    scalingStat: 'constitution',
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 15 },
    onPlayImmunity: { type: 'faint', duration: 1 },
    effect: noop,
  },

  continental_drift: {
    id: 'continental_drift',
    name: 'Continental Drift',
    description: 'Apply Stun (3) and Slow (5) to all enemies. Gain 6 Fortify.',
    type: CreatureType.EARTH,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'legendary',
    tags: ['status', 'aoe', 'control', 'keyword'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'stun', stacks: 3 },
    additionalStatus: { type: 'slow', stacks: 5 },
    onPlayStatus: { target: 'self', type: 'fortify', stacks: 6 },
    baseDamage: 0,
    effect: noop,
  },
};


// ============================================================
//  WIND  — Speed / Evasion / Card Draw
//  Identity: play many cards per turn via Gust draw engine,
//  evade attacks, apply lightweight debuffs, cycle fast.
//  scalingStat: dexterity, intelligence
// ============================================================

export const WIND_CARDS = {

  // ---- COMMON ----

  gale_slash: {
    id: 'gale_slash',
    name: 'Gale Slash',
    description: 'Deal 8 damage. Gain 1 Gust.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'keyword'],
    scalingStat: 'dexterity',
    baseDamage: 8,
    onPlayStatus: { target: 'self', type: 'gust', stacks: 1 },
    effect: noop,
  },

  tailwind: {
    id: 'tailwind',
    name: 'Tailwind',
    description: 'Gain 2 Gust.',
    type: CreatureType.WIND,
    energyCost: 0,
    levelRequired: 1,
    rarity: 'common',
    tags: ['keyword', 'utility'],
    scalingStat: 'dexterity',
    onPlayStatus: { target: 'self', type: 'gust', stacks: 2 },
    effect: noop,
  },

  zephyr_strike: {
    id: 'zephyr_strike',
    name: 'Zephyr Strike',
    description: 'Deal 7 damage twice.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'multi_hit'],
    scalingStat: 'dexterity',
    baseDamage: 7,
    hits: 2,
    effect: noop,
  },

  dodge: {
    id: 'dodge',
    name: 'Dodge',
    description: 'This creature cannot be hit until your next turn.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend', 'evasion'],
    scalingStat: 'dexterity',
    onPlayStatus: { target: 'self', type: 'evasion', stacks: 1 },
    effect: noop,
  },

  breeze: {
    id: 'breeze',
    name: 'Breeze',
    description: 'Draw 2 cards.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['utility'],
    scalingStat: 'intelligence',
    drawAmount: 2,
    effect: noop,
  },

  cutting_wind: {
    id: 'cutting_wind',
    name: 'Cutting Wind',
    description: 'Deal 6 damage. Apply Shred (1). Shred: target loses 1 AC.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'status', 'control'],
    scalingStat: 'dexterity',
    baseDamage: 6,
    onHitStatus: { type: 'shred', stacks: 1 },
    effect: noop,
  },

  updraft: {
    id: 'updraft',
    name: 'Updraft',
    description: 'Gain 5 Shield. Gain 1 Gust.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    shieldAmount: 5,
    onPlayStatus: { target: 'self', type: 'gust', stacks: 1 },
    effect: noop,
  },

  swift_step: {
    id: 'swift_step',
    name: 'Swift Step',
    description: 'Draw 1 card. Deal 6 damage.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'utility'],
    scalingStat: 'dexterity',
    baseDamage: 6,
    drawAmount: 1,
    effect: noop,
  },

  // ---- UNCOMMON ----

  storm_burst: {
    id: 'storm_burst',
    name: 'Storm Burst',
    description: 'Deal 3 damage for each card in your hand.',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'synergy'],
    scalingStat: 'intelligence',
    damagePerHandCard: 3,
    effect: noop,
  },

  gust_rider: {
    id: 'gust_rider',
    name: 'Gust Rider',
    description: 'Consume all Gust. Deal 4 damage per stack consumed.',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'keyword'],
    scalingStat: 'dexterity',
    keywordConsumeForDamage: { type: 'gust', multiplier: 4 },
    effect: noop,
  },

  whirlwind: {
    id: 'whirlwind',
    name: 'Whirlwind',
    description: 'Deal 5 damage to all enemies. Draw 1 card.',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'aoe', 'utility'],
    scalingStat: 'dexterity',
    baseDamage: 5,
    drawAmount: 1,
    effect: noop,
  },

  slipstream: {
    id: 'slipstream',
    name: 'Slipstream',
    description: 'Your next card this turn costs 0.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['utility', 'combo'],
    scalingStat: 'intelligence',
    onPlayEffect: { type: 'free_next_card' },
    effect: noop,
  },

  razor_gale: {
    id: 'razor_gale',
    name: 'Razor Gale',
    description: 'Deal 6 damage. Apply Shred (2).',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'status'],
    scalingStat: 'dexterity',
    baseDamage: 6,
    onHitStatus: { type: 'shred', stacks: 2 },
    effect: noop,
  },

  eye_of_the_storm: {
    id: 'eye_of_the_storm',
    name: 'Eye of the Storm',
    description: 'Gain Evasion (2). Gain 3 Gust.',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['defend', 'keyword', 'evasion'],
    scalingStat: 'dexterity',
    onPlayStatus: { target: 'self', type: 'evasion', stacks: 2 },
    onPlayStatus2: { target: 'self', type: 'gust', stacks: 3 },
    effect: noop,
  },

  cyclone: {
    id: 'cyclone',
    name: 'Cyclone',
    description: 'Discard up to 3 cards. Deal 5 damage for each discarded.',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'utility', 'combo'],
    scalingStat: 'intelligence',
    discardForDamage: { max: 3, damagePerDiscard: 5 },
    effect: noop,
  },

  wind_tunnel: {
    id: 'wind_tunnel',
    name: 'Wind Tunnel',
    description: 'Draw 3 cards. Gain 1 Gust for each card drawn.',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['utility', 'keyword'],
    scalingStat: 'intelligence',
    drawAmount: 3,
    gustPerDraw: 1,
    effect: noop,
  },

  // ---- RARE ----

  tempest: {
    id: 'tempest',
    name: 'Tempest',
    description: 'Deal 8 damage to all enemies. Apply Shred (3) to each.',
    type: CreatureType.WIND,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['attack', 'aoe', 'status'],
    scalingStat: 'dexterity',
    baseDamage: 8,
    onHitStatus: { type: 'shred', stacks: 3 },
    effect: noop,
  },

  infinite_gale: {
    id: 'infinite_gale',
    name: 'Infinite Gale',
    description: 'Draw cards until you have 7 in hand.',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['utility'],
    scalingStat: 'intelligence',
    drawToHandSize: 7,
    effect: noop,
  },

  hurricane: {
    id: 'hurricane',
    name: 'Hurricane',
    description: 'Play the top card of your deck for free.',
    type: CreatureType.WIND,
    energyCost: 1,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['utility', 'combo'],
    scalingStat: 'intelligence',
    onPlayEffect: { type: 'play_top_of_deck' },
    effect: noop,
  },

  the_last_breath: {
    id: 'the_last_breath',
    name: 'The Last Breath',
    description: 'Gain Evasion (5). Draw 3 cards. Gain 5 Gust.',
    type: CreatureType.WIND,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'rare',
    tags: ['defend', 'keyword', 'utility'],
    scalingStat: 'dexterity',
    onPlayStatus: { target: 'self', type: 'evasion', stacks: 5 },
    drawAmount: 3,
    onPlayStatus2: { target: 'self', type: 'gust', stacks: 5 },
    effect: noop,
  },

  // ---- LEGENDARY ----

  eye_of_god: {
    id: 'eye_of_god',
    name: 'Eye of God',
    description: 'Take an extra full turn after this one.',
    type: CreatureType.WIND,
    energyCost: 3,
    levelRequired: 6,
    rarity: 'legendary',
    tags: ['utility', 'combo'],
    scalingStat: 'intelligence',
    onPlayEffect: { type: 'extra_turn' },
    effect: noop,
  },

  gale_force: {
    id: 'gale_force',
    name: 'Gale Force',
    description: 'Deal 5 damage for each card played this turn (including this one).',
    type: CreatureType.WIND,
    energyCost: 2,
    levelRequired: 5,
    rarity: 'legendary',
    tags: ['attack', 'synergy'],
    scalingStat: 'intelligence',
    damagePerCardPlayedThisTurn: 5,
    effect: noop,
  },
};


// ============================================================
//  SHADOW  — Debuff / Drain / Poison
//  Identity: stack Drain to sustain while poisoning/debuffing
//  enemies into helplessness. Rewards staying in longer fights.
//  scalingStat: intelligence, dexterity
// ============================================================

export const SHADOW_CARDS = {

  // ---- COMMON ----

  shadow_strike: {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    description: 'Deal 8 damage. Drain (heal 2 HP).',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'keyword'],
    scalingStat: 'dexterity',
    baseDamage: 8,
    drain: { healRatio: 0.4 },
    effect: noop,
  },

  venom: {
    id: 'venom',
    name: 'Venom',
    description: 'Apply 2 Poison to target. Poison: deal 2 damage per stack at turn start, stacks decay by 1.',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['status', 'keyword'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'poison', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  dark_pulse: {
    id: 'dark_pulse',
    name: 'Dark Pulse',
    description: 'Deal 7 damage. Drain (heal 2 HP).',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 7,
    drain: { healRatio: 0.5 },
    effect: noop,
  },

  night_veil: {
    id: 'night_veil',
    name: 'Night Veil',
    description: 'Gain 7 Shield.',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend'],
    scalingStat: 'constitution',
    shieldAmount: 7,
    effect: noop,
  },

  weaken: {
    id: 'weaken',
    name: 'Weaken',
    description: 'Apply Weak (2) to target. Weak: deal 2 less damage per stack.',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['status', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'weak', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  creeping_dark: {
    id: 'creeping_dark',
    name: 'Creeping Dark',
    description: 'Apply 1 Poison to all enemies.',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['status', 'aoe'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'poison', stacks: 1 },
    baseDamage: 0,
    effect: noop,
  },

  lifesteal: {
    id: 'lifesteal',
    name: 'Lifesteal',
    description: 'Deal 9 damage. Heal for 100% of damage dealt.',
    type: CreatureType.SHADOW,
    energyCost: 2,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 9,
    drain: { healRatio: 1.0 },
    effect: noop,
  },

  shadow_step: {
    id: 'shadow_step',
    name: 'Shadow Step',
    description: 'Gain Evasion (1). Deal 6 damage.',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'evasion'],
    scalingStat: 'dexterity',
    baseDamage: 6,
    onPlayStatus: { target: 'self', type: 'evasion', stacks: 1 },
    effect: noop,
  },

  // ---- UNCOMMON ----

  plague: {
    id: 'plague',
    name: 'Plague',
    description: 'Apply 3 Poison to all enemies.',
    type: CreatureType.SHADOW,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['status', 'aoe'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'poison', stacks: 3 },
    baseDamage: 0,
    effect: noop,
  },

  soul_rend: {
    id: 'soul_rend',
    name: 'Soul Rend',
    description: 'Deal 8 damage. Drain (heal 50% of damage dealt). Apply Weak (1).',
    type: CreatureType.SHADOW,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'keyword', 'status'],
    scalingStat: 'intelligence',
    baseDamage: 8,
    drain: { healRatio: 0.5 },
    onHitStatus: { type: 'weak', stacks: 1 },
    effect: noop,
  },

  enervate: {
    id: 'enervate',
    name: 'Enervate',
    description: 'Target loses 1 energy next turn.',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['control', 'status'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'energy_drain', stacks: 1 },
    baseDamage: 0,
    effect: noop,
  },

  toxic_cloud: {
    id: 'toxic_cloud',
    name: 'Toxic Cloud',
    description: 'Apply 2 Poison to all enemies. Drain 3 HP from each poisoned enemy.',
    type: CreatureType.SHADOW,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['status', 'aoe', 'keyword'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'poison', stacks: 2 },
    drainFromPoisoned: 3,
    baseDamage: 0,
    effect: noop,
  },

  consume: {
    id: 'consume',
    name: 'Consume',
    description: 'Remove 1 card from your hand permanently. Heal 15 HP.',
    type: CreatureType.SHADOW,
    energyCost: 1,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['utility', 'heal'],
    scalingStat: 'wisdom',
    removeSelfCard: 1,
    healAmount: 15,
    effect: noop,
  },

  umbral_grasp: {
    id: 'umbral_grasp',
    name: 'Umbral Grasp',
    description: 'Apply Stun (1) and Weak (2) to target.',
    type: CreatureType.SHADOW,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['status', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'stun', stacks: 1 },
    additionalStatus: { type: 'weak', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  midnight_feast: {
    id: 'midnight_feast',
    name: 'Midnight Feast',
    description: 'Drain HP from target equal to their Poison stacks × 4.',
    type: CreatureType.SHADOW,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['keyword', 'status'],
    scalingStat: 'intelligence',
    drainFromPoison: { multiplier: 4 },
    effect: noop,
  },

  // ---- RARE ----

  death_mark: {
    id: 'death_mark',
    name: 'Death Mark',
    description: 'Target takes double damage from all sources until your next turn.',
    type: CreatureType.SHADOW,
    energyCost: 2,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['status', 'control', 'combo'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'death_mark', stacks: 1 },
    baseDamage: 0,
    effect: noop,
  },

  black_hole: {
    id: 'black_hole',
    name: 'Black Hole',
    description: 'Deal damage equal to total Poison stacks on all enemies to each of them. Remove all Poison.',
    type: CreatureType.SHADOW,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['attack', 'aoe', 'keyword'],
    scalingStat: 'intelligence',
    poisonBurst: { consumeAll: true },
    effect: noop,
  },

  shadow_pact: {
    id: 'shadow_pact',
    name: 'Shadow Pact',
    description: 'Lose 10 HP. Deal 20 damage. Drain 100% of damage dealt.',
    type: CreatureType.SHADOW,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'rare',
    tags: ['attack', 'keyword', 'drawback'],
    scalingStat: 'intelligence',
    selfDamage: 10,
    baseDamage: 20,
    drain: { healRatio: 1.0 },
    effect: noop,
  },

  rot: {
    id: 'rot',
    name: 'Rot',
    description: 'Apply 5 Poison to target. They cannot remove Poison this combat.',
    type: CreatureType.SHADOW,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['status', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'poison', stacks: 5 },
    locksStatus: 'poison',
    effect: noop,
  },

  // ---- LEGENDARY ----

  void_rupture: {
    id: 'void_rupture',
    name: 'Void Rupture',
    description: 'Deal 10 damage to all enemies. Drain 100% of all damage dealt.',
    type: CreatureType.SHADOW,
    energyCost: 3,
    levelRequired: 6,
    rarity: 'legendary',
    tags: ['attack', 'aoe', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 10,
    drain: { healRatio: 1.0 },
    effect: noop,
  },

  eclipse: {
    id: 'eclipse',
    name: 'Eclipse',
    description: 'Apply Stun (2), Weak (3), and 4 Poison to all enemies.',
    type: CreatureType.SHADOW,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'legendary',
    tags: ['status', 'aoe', 'control'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'stun', stacks: 2 },
    additionalStatus: { type: 'weak', stacks: 3 },
    extraStatus: { type: 'poison', stacks: 4 },
    baseDamage: 0,
    effect: noop,
  },
};


// ============================================================
//  LIGHT  — Buff / Cleanse / Combo
//  Identity: build Radiance stacks, cleanse allies, then
//  unleash powerful Radiance-consuming finishers. Rewards
//  patience and setup.
//  scalingStat: wisdom, intelligence
// ============================================================

export const LIGHT_CARDS = {

  // ---- COMMON ----

  holy_strike: {
    id: 'holy_strike',
    name: 'Holy Strike',
    description: 'Deal 8 damage. Gain 1 Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'keyword'],
    scalingStat: 'wisdom',
    baseDamage: 8,
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 1 },
    effect: noop,
  },

  illuminate: {
    id: 'illuminate',
    name: 'Illuminate',
    description: 'Gain 2 Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 0,
    levelRequired: 1,
    rarity: 'common',
    tags: ['keyword', 'utility'],
    scalingStat: 'wisdom',
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 2 },
    effect: noop,
  },

  mend: {
    id: 'mend',
    name: 'Mend',
    description: 'Heal 7 HP. Gain 1 Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['heal', 'keyword'],
    scalingStat: 'wisdom',
    healAmount: 7,
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 1 },
    effect: noop,
  },

  purify: {
    id: 'purify',
    name: 'Purify',
    description: 'Cleanse 1 negative status from your creature. Gain 2 Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['cleanse', 'keyword'],
    scalingStat: 'wisdom',
    cleanseSelf: { stacks: 1 },
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 2 },
    effect: noop,
  },

  light_shield: {
    id: 'light_shield',
    name: 'Light Shield',
    description: 'Gain 7 Shield. Gain 1 Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    shieldAmount: 7,
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 1 },
    effect: noop,
  },

  smite: {
    id: 'smite',
    name: 'Smite',
    description: 'Deal 7 damage to a Shadow-type creature (4 to others).',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'conditional'],
    scalingStat: 'wisdom',
    baseDamage: 7,
    bonusVsType: { type: 'shadow', bonus: 4 },
    effect: noop,
  },

  radiant_touch: {
    id: 'radiant_touch',
    name: 'Radiant Touch',
    description: 'Deal 6 damage. Heal 3 HP.',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'heal'],
    scalingStat: 'wisdom',
    baseDamage: 6,
    healAmount: 3,
    effect: noop,
  },

  dawn_barrier: {
    id: 'dawn_barrier',
    name: 'Dawn Barrier',
    description: 'Gain 9 Shield.',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend'],
    scalingStat: 'constitution',
    shieldAmount: 9,
    effect: noop,
  },

  // ---- UNCOMMON ----

  solar_beam: {
    id: 'solar_beam',
    name: 'Solar Beam',
    description: 'Consume all Radiance. Deal 3 damage per stack consumed.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'keyword'],
    scalingStat: 'intelligence',
    keywordConsumeForDamage: { type: 'radiance', multiplier: 3 },
    effect: noop,
  },

  benediction: {
    id: 'benediction',
    name: 'Benediction',
    description: 'Heal 10 HP. Cleanse all negative statuses from your creature.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['heal', 'cleanse'],
    scalingStat: 'wisdom',
    healAmount: 10,
    cleanseSelf: true,
    effect: noop,
  },

  blinding_flash: {
    id: 'blinding_flash',
    name: 'Blinding Flash',
    description: 'Apply Blind (3) to all enemies. Gain 2 Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['status', 'aoe', 'keyword'],
    scalingStat: 'intelligence',
    onHitStatus: { type: 'blind', stacks: 3 },
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 2 },
    baseDamage: 0,
    effect: noop,
  },

  consecrate: {
    id: 'consecrate',
    name: 'Consecrate',
    description: 'Deal 5 damage to all enemies. Gain 1 Radiance per enemy hit.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['attack', 'aoe', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 5,
    radiancePerHit: 1,
    effect: noop,
  },

  valor: {
    id: 'valor',
    name: 'Valor',
    description: 'Your creature deals +2 damage for each Radiance stack it has this turn.',
    type: CreatureType.LIGHT,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['buff', 'keyword', 'synergy'],
    scalingStat: 'wisdom',
    combatBuff: { type: 'damage_per_radiance', amount: 2, duration: 'turn' },
    effect: noop,
  },

  celestial_ward: {
    id: 'celestial_ward',
    name: 'Celestial Ward',
    description: 'Gain Shield equal to Radiance stacks × 3. Keep Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'uncommon',
    tags: ['defend', 'keyword'],
    scalingStat: 'constitution',
    shieldFromRadiance: { multiplier: 3, consume: false },
    effect: noop,
  },

  holy_nova: {
    id: 'holy_nova',
    name: 'Holy Nova',
    description: 'Deal 4 damage to all enemies. Heal 4 HP.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'aoe', 'heal'],
    scalingStat: 'wisdom',
    baseDamage: 4,
    healAmount: 4,
    effect: noop,
  },

  // ---- RARE ----

  divine_judgment: {
    id: 'divine_judgment',
    name: 'Divine Judgment',
    description: 'Consume all Radiance. Deal 5 damage per stack. Cannot miss.',
    type: CreatureType.LIGHT,
    energyCost: 3,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['attack', 'keyword', 'unblockable'],
    scalingStat: 'wisdom',
    keywordConsumeForDamage: { type: 'radiance', multiplier: 5 },
    alwaysHits: true,
    effect: noop,
  },

  ascension: {
    id: 'ascension',
    name: 'Ascension',
    description: 'Gain 6 Radiance. All your cards cost 1 less this turn.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 4,
    rarity: 'rare',
    tags: ['keyword', 'buff', 'combo'],
    scalingStat: 'wisdom',
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 6 },
    onPlayEffect: { type: 'reduce_all_costs', amount: 1, duration: 'turn' },
    effect: noop,
  },

  miracle: {
    id: 'miracle',
    name: 'Miracle',
    description: 'Heal your creature to full HP. Lose all Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 2,
    levelRequired: 5,
    rarity: 'rare',
    tags: ['heal', 'keyword'],
    scalingStat: 'wisdom',
    healToFull: true,
    onPlayEffect: { type: 'consume_status', statusType: 'radiance' },
    effect: noop,
  },

  light_of_ruin: {
    id: 'light_of_ruin',
    name: 'Light of Ruin',
    description: 'Deal 12 damage to all enemies. Apply Blind (4) to each. Gain 3 Radiance.',
    type: CreatureType.LIGHT,
    energyCost: 3,
    levelRequired: 5,
    rarity: 'rare',
    tags: ['attack', 'aoe', 'status', 'keyword'],
    scalingStat: 'intelligence',
    baseDamage: 12,
    onHitStatus: { type: 'blind', stacks: 4 },
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 3 },
    effect: noop,
  },

  // ---- LEGENDARY ----

  genesis: {
    id: 'genesis',
    name: 'Genesis',
    description: 'Consume all Radiance. For each stack: deal 4 damage to all enemies, heal 4 HP, and gain 4 Shield.',
    type: CreatureType.LIGHT,
    energyCost: 3,
    levelRequired: 6,
    rarity: 'legendary',
    tags: ['attack', 'heal', 'defend', 'keyword', 'aoe'],
    scalingStat: 'wisdom',
    radianceBurst: { damagePerStack: 4, healPerStack: 4, shieldPerStack: 4 },
    effect: noop,
  },

  the_last_light: {
    id: 'the_last_light',
    name: 'The Last Light',
    description: 'If your creature is below 25% HP: heal to full, gain 10 Radiance, and deal 25 damage. Cannot miss.',
    type: CreatureType.LIGHT,
    energyCost: 3,
    levelRequired: 6,
    rarity: 'legendary',
    tags: ['attack', 'heal', 'keyword', 'conditional', 'unblockable'],
    scalingStat: 'wisdom',
    conditionalPlay: { condition: 'self_below_quarter' },
    healToFull: true,
    onPlayStatus: { target: 'self', type: 'radiance', stacks: 10 },
    baseDamage: 25,
    alwaysHits: true,
    effect: noop,
  },
};


// ============================================================
//  COLORLESS  — Utility / Neutral
//  Any creature can draft these. No signature keyword.
//  Focus: energy, draw, removal, and universal tools.
//  scalingStat: varies per card
// ============================================================

export const COLORLESS_CARDS = {

  focus: {
    id: 'focus',
    name: 'Focus',
    description: 'Draw 2 cards.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['utility'],
    scalingStat: 'intelligence',
    drawAmount: 2,
    effect: noop,
  },

  zenith: {
    id: 'zenith',
    name: 'Zenith',
    description: 'Gain 2 energy.',
    type: CreatureType.COLORLESS,
    energyCost: 0,
    levelRequired: 1,
    rarity: 'common',
    tags: ['utility', 'energy'],
    scalingStat: 'intelligence',
    energyGain: 2,
    effect: noop,
  },

  brace: {
    id: 'brace',
    name: 'Brace',
    description: 'Gain 8 Shield.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['defend'],
    scalingStat: 'constitution',
    shieldAmount: 8,
    effect: noop,
  },

  adrenaline: {
    id: 'adrenaline',
    name: 'Adrenaline',
    description: 'Deal 8 damage. Gain 1 energy.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['attack', 'energy'],
    scalingStat: 'strength',
    baseDamage: 8,
    energyGain: 1,
    effect: noop,
  },

  steady_hand: {
    id: 'steady_hand',
    name: 'Steady Hand',
    description: 'Your next attack this turn cannot miss.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['utility', 'buff'],
    scalingStat: 'dexterity',
    onPlayEffect: { type: 'next_attack_cannot_miss' },
    effect: noop,
  },

  reclaim: {
    id: 'reclaim',
    name: 'Reclaim',
    description: 'Return a card from your discard pile to your hand.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 1,
    rarity: 'common',
    tags: ['utility'],
    scalingStat: 'intelligence',
    onPlayEffect: { type: 'reclaim_from_discard' },
    effect: noop,
  },

  overcharge: {
    id: 'overcharge',
    name: 'Overcharge',
    description: 'Gain 3 energy. Lose 5 HP.',
    type: CreatureType.COLORLESS,
    energyCost: 0,
    levelRequired: 1,
    rarity: 'uncommon',
    tags: ['energy', 'drawback'],
    scalingStat: 'constitution',
    energyGain: 3,
    selfDamage: 5,
    effect: noop,
  },

  second_wind: {
    id: 'second_wind',
    name: 'Second Wind',
    description: 'Heal 12 HP.',
    type: CreatureType.COLORLESS,
    energyCost: 2,
    levelRequired: 1,
    rarity: 'common',
    tags: ['heal'],
    scalingStat: 'wisdom',
    healAmount: 12,
    effect: noop,
  },

  shatter: {
    id: 'shatter',
    name: 'Shatter',
    description: 'Remove all Shield from target. Deal 1 damage per Shield removed.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'utility'],
    scalingStat: 'intelligence',
    shieldBreak: { damagePerShield: 1 },
    effect: noop,
  },

  wild_strike: {
    id: 'wild_strike',
    name: 'Wild Strike',
    description: 'Deal 10 damage. 50% chance to deal 10 damage to yourself.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['attack', 'risky'],
    scalingStat: 'strength',
    baseDamage: 10,
    riskEffect: { chance: 0.5, selfDamage: 10 },
    effect: noop,
  },

  momentum: {
    id: 'momentum',
    name: 'Momentum',
    description: 'Draw 1 card for each card you have played this turn.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['utility', 'synergy'],
    scalingStat: 'intelligence',
    drawPerCardsPlayed: 1,
    effect: noop,
  },

  nullify: {
    id: 'nullify',
    name: 'Nullify',
    description: 'Remove all status effects from any creature.',
    type: CreatureType.COLORLESS,
    energyCost: 2,
    levelRequired: 2,
    rarity: 'uncommon',
    tags: ['utility', 'cleanse'],
    scalingStat: 'wisdom',
    clearAllStatuses: true,
    effect: noop,
  },

  calculated_risk: {
    id: 'calculated_risk',
    name: 'Calculated Risk',
    description: 'Reveal the top 3 cards of your deck. Play one for free, discard the rest.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 3,
    rarity: 'rare',
    tags: ['utility', 'combo'],
    scalingStat: 'intelligence',
    onPlayEffect: { type: 'scry_and_play', count: 3 },
    effect: noop,
  },

  war_cry: {
    id: 'war_cry',
    name: 'War Cry',
    description: 'All your creatures deal +3 damage this turn.',
    type: CreatureType.COLORLESS,
    energyCost: 1,
    levelRequired: 3,
    rarity: 'rare',
    tags: ['buff', 'synergy'],
    scalingStat: 'strength',
    combatBuff: { target: 'all_allies', stat: 'damage', amount: 3, duration: 'turn' },
    effect: noop,
  },

  last_resort: {
    id: 'last_resort',
    name: 'Last Resort',
    description: 'Deal damage equal to your missing HP.',
    type: CreatureType.COLORLESS,
    energyCost: 2,
    levelRequired: 3,
    rarity: 'rare',
    tags: ['attack', 'conditional'],
    scalingStat: 'strength',
    damageFromMissingHp: true,
    effect: noop,
  },

  the_gambit: {
    id: 'the_gambit',
    name: 'The Gambit',
    description: 'Draw 5 cards. Shuffle 3 Wounds (0-cost, deal 3 damage to yourself when drawn) into your deck.',
    type: CreatureType.COLORLESS,
    energyCost: 0,
    levelRequired: 4,
    rarity: 'legendary',
    tags: ['utility', 'drawback', 'risky'],
    scalingStat: 'intelligence',
    drawAmount: 5,
    shuffleIntoDecks: [{ cardId: 'wound', count: 3 }],
    effect: noop,
  },

  // Special card — only enters deck via The Gambit
  wound: {
    id: 'wound',
    name: 'Wound',
    description: 'When drawn, deal 3 damage to your creature. (Cannot be played.)',
    type: CreatureType.COLORLESS,
    energyCost: 0,
    levelRequired: 1,
    rarity: 'common',
    tags: ['curse', 'unplayable'],
    scalingStat: 'constitution',
    onDrawEffect: { selfDamage: 3 },
    unplayable: true,
    effect: noop,
  },
};


// ============================================================
//  MASTER EXPORT — merge all types into one lookup object
// ============================================================

export const CARD_DEFS = {
  ...FIRE_CARDS,
  ...WATER_CARDS,
  ...EARTH_CARDS,
  ...WIND_CARDS,
  ...SHADOW_CARDS,
  ...LIGHT_CARDS,
  ...COLORLESS_CARDS,
};

export default CARD_DEFS;


// ============================================================
//  CARD POOL HELPERS
// ============================================================

/**
 * All cards for a given type, optionally filtered by max level required.
 */
export function getCardsByType(type, maxLevel = Infinity) {
  return Object.values(CARD_DEFS).filter(
    c => c.type === type && c.levelRequired <= maxLevel
  );
}

/**
 * All cards of a given rarity.
 */
export function getCardsByRarity(rarity) {
  return Object.values(CARD_DEFS).filter(c => c.rarity === rarity);
}

/**
 * Cards a creature can currently draft (type match + level gate).
 * Colorless is always included.
 */
export function getDraftPool(creature) {
  return Object.values(CARD_DEFS).filter(c =>
    (c.type === creature.type || c.type === CreatureType.COLORLESS) &&
    c.levelRequired <= creature.level &&
    !c.unplayable
  );
}
