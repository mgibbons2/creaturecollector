// ============================================================
//  CREATURE DEFINITIONS — Full Launch Roster
//  30 creatures across 6 types, 5 per type.
//
//  EVOLUTION SYSTEM
//  ─────────────────
//  Each creature has 3 named stages:
//    Baby  (level 1–2) — starter form, lower stats
//    Adult (level 3–4) — evolves at level 3, stat shift
//    Elder (level 5–6) — evolves at level 5, peak form
//
//  Stages share a continuous CreatureInstance. On evolution,
//  the instance's name, description, stats, and armorClass
//  update to the new stage. The deck persists unchanged.
//
//  XP THRESHOLDS
//  ─────────────
//  Lv 2: 15 XP  |  Lv 3 (Adult): 35 XP  |  Lv 4: 60 XP
//  Lv 5 (Elder): 90 XP  |  Lv 6: 130 XP
//
//  XP REWARDS (per combat win)
//  ───────────────────────────
//  Standard combat : 10 XP (active) / 5 XP (bench)
//  Elite combat    : 20 XP (active) / 10 XP (bench)
//  Boss combat     : 40 XP (active) / 20 XP (bench)
//
//  STARTER POOL (1 per type, 6 total)
//  ───────────────────────────────────
//  Balanced, approachable stat spreads. Clear archetypes.
//  Marked with starter: true.
//
//  CATCH POOL (4 per type, 24 total)
//  ───────────────────────────────────
//  More specialised or extreme stat builds.
//  Available from combat/elite nodes only (not boss).
//
//  STAT PHILOSOPHY
//  ───────────────
//  Stats use the D&D modifier formula: floor((stat - 10) / 2)
//  "Average" human = 10 in all stats (modifier +0)
//  Creature stat ranges: 6 (weak) to 20 (exceptional)
//  AC range: 8 (glass cannon) to 18 (fortress)
//  HP range at level 1: 40 (fragile) to 80 (tank)
// ============================================================

import { CreatureType } from './gameSchema.js';

// ─── XP SYSTEM CONSTANTS ────────────────────────────────────

export const XP_THRESHOLDS = [
  { level: 2, totalXp: 15  },
  { level: 3, totalXp: 35  },  // → Adult
  { level: 4, totalXp: 60  },
  { level: 5, totalXp: 90  },  // → Elder
  { level: 6, totalXp: 130 },
];

export const XP_REWARDS = {
  combat: { active: 10, bench: 5  },
  elite:  { active: 20, bench: 10 },
  boss:   { active: 40, bench: 20 },
};

export const EVOLUTION_LEVELS = { ADULT: 3, ELDER: 5 };

/**
 * Returns the stage name for a given level.
 */
export function getStageName(level) {
  if (level >= EVOLUTION_LEVELS.ELDER) return 'elder';
  if (level >= EVOLUTION_LEVELS.ADULT) return 'adult';
  return 'baby';
}

/**
 * Resolves a creature's current stage stats/name/description/AC
 * from its definition and current level.
 *
 * @param {CreatureDef} def
 * @param {number} level
 * @returns {{ name, description, stats, armorClass, maxHp }}
 */
export function resolveStage(def, level) {
  const stage = getStageName(level);
  const s = def.stages[stage];
  const maxHp = def.baseHp + def.hpPerLevel * (level - 1);
  return {
    name: s.name,
    description: s.description,
    stats: { ...s.stats },
    armorClass: s.armorClass,
    maxHp,
  };
}

/**
 * Awards XP to a party after a combat node.
 * Returns updated party array (immutable).
 *
 * @param {CreatureInstance[]} party
 * @param {number[]} activeIndices  — indices in party that were active (0–1 typically)
 * @param {'combat'|'elite'|'boss'} nodeType
 * @param {CreatureDef[]} allDefs   — needed to resolve evolution on level-up
 * @returns {CreatureInstance[]}
 */
export function awardXp(party, activeIndices, nodeType, allDefs) {
  return party.map((creature, idx) => {
    const isActive = activeIndices.includes(idx);
    const xpGain = isActive
      ? XP_REWARDS[nodeType].active
      : XP_REWARDS[nodeType].bench;

    return applyXp(creature, xpGain, allDefs);
  });
}

/**
 * Applies XP to a single creature, handling level-ups and evolution.
 * Returns updated CreatureInstance (immutable).
 */
export function applyXp(creature, xpGain, allDefs) {
  if (creature.level >= 6) return creature; // already maxed

  let { xp = 0, level } = creature;
  xp += xpGain;

  let evolved = false;
  let newLevel = level;

  // Check each threshold in order
  for (const threshold of XP_THRESHOLDS) {
    if (newLevel < threshold.level && xp >= threshold.totalXp) {
      newLevel = threshold.level;
      if (newLevel === EVOLUTION_LEVELS.ADULT || newLevel === EVOLUTION_LEVELS.ELDER) {
        evolved = true;
      }
    }
  }

  if (newLevel === level) {
    // No level-up, just store XP
    return { ...creature, xp };
  }

  // Level up — resolve new stage
  const def = allDefs[creature.defId];
  if (!def) return { ...creature, xp, level: newLevel };

  const stage = resolveStage(def, newLevel);
  const newMaxHp = stage.maxHp;
  // HP scales proportionally on evolution, doesn't fully reset
  const hpRatio = creature.currentHp / creature.maxHp;
  const newCurrentHp = Math.max(1, Math.round(newMaxHp * hpRatio));

  return {
    ...creature,
    xp,
    level: newLevel,
    maxHp: newMaxHp,
    currentHp: newCurrentHp,
    name: stage.name,
    description: stage.description,
    stats: stage.stats,
    armorClass: stage.armorClass,
    justEvolved: evolved, // UI flag — cleared after displaying evolution screen
  };
}


// ============================================================
//  FIRE CREATURES  (5 total — 1 starter, 4 catch)
//  Theme: high offense, moderate HP, low AC, Ignite synergy
// ============================================================

export const FIRE_CREATURES = {

  // ── STARTER ─────────────────────────────────────────────
  emberfox: {
    id: 'emberfox',
    type: CreatureType.FIRE,
    starter: true,
    baseHp: 58,
    hpPerLevel: 8,
    passiveTags: ['ignite', 'aggro'],
    description: 'A quick fire-type that stacks Ignite and presses the advantage.',

    stages: {
      baby: {
        name: 'Emberfox',
        description: 'A small fox with a smoldering tail. Quick and curious.',
        armorClass: 12,
        stats: { strength: 16, dexterity: 17, intelligence: 11, constitution: 11, wisdom: 9 },
      },
      adult: {
        name: 'Blazefox',
        description: 'Its tail burns bright. Learns to channel Ignite into powerful bursts.',
        armorClass: 13,
        stats: { strength: 14, dexterity: 16, intelligence: 13, constitution: 12, wisdom: 10 },
      },
      elder: {
        name: 'Infernus',
        description: 'A living wildfire. Enemies dread the stacks it builds before unleashing Conflagration.',
        armorClass: 14,
        stats: { strength: 16, dexterity: 17, intelligence: 16, constitution: 13, wisdom: 11 },
      },
    },

    starterDeck: [
      'ember_strike', 'ember_strike', 'ember_strike',
      'cinder_toss', 'cinder_toss',
      'heat_up',
      'flame_shield',
      'stoke',
      'focus', 'focus',
    ],

    cardPool: {
      1: ['ember_strike', 'cinder_toss', 'heat_up', 'flame_shield', 'quick_burn', 'smolder', 'stoke', 'ash_wall', 'focus', 'zenith', 'brace'],
      2: ['fan_the_flames', 'scorched_earth', 'flame_dash', 'heat_wave', 'magma_coat'],
      3: ['ignition', 'backdraft', 'pyromaniac', 'burnout'],
      4: ['inferno', 'rising_phoenix', 'volcanic_rage'],
      5: ['conflagration', 'firestorm', 'solar_flare'],
      6: ['heart_of_the_volcano'],
    },
  },

  // ── CATCH POOL ───────────────────────────────────────────

  cindergrub: {
    id: 'cindergrub',
    type: CreatureType.FIRE,
    starter: false,
    baseHp: 38,
    hpPerLevel: 6,
    passiveTags: ['ignite', 'tank', 'thorns'],
    description: 'Slow but heavily armored. Punishes enemies who attack into its Magma Coat.',

    stages: {
      baby: {
        name: 'Cindergrub',
        description: 'A lumpy larva that radiates heat. Surprisingly hard to crack.',
        armorClass: 11,
        stats: { strength: 13, dexterity: 8, intelligence: 10, constitution: 16, wisdom: 10 },
      },
      adult: {
        name: 'Magmapede',
        description: 'Its segments glow with trapped heat. Each hit it takes adds Ignite to the attacker.',
        armorClass: 15,
        stats: { strength: 14, dexterity: 9, intelligence: 11, constitution: 18, wisdom: 11 },
      },
      elder: {
        name: 'Pyrecolossus',
        description: 'A siege engine of fire. Near-impenetrable armor, and anything that breaks through catches flame.',
        armorClass: 17,
        stats: { strength: 16, dexterity: 9, intelligence: 12, constitution: 20, wisdom: 12 },
      },
    },

    starterDeck: [
      'ash_wall', 'ash_wall', 'flame_shield',
      'magma_coat', 'magma_coat',
      'ember_strike', 'ember_strike',
      'heat_up', 'heat_up',
      'focus',
    ],

    cardPool: {
      1: ['ash_wall', 'flame_shield', 'ember_strike', 'heat_up', 'smolder', 'stoke', 'focus', 'brace'],
      2: ['magma_coat', 'heat_wave', 'scorched_earth'],
      3: ['ignition', 'burnout', 'volcanic_rage'],
      4: ['inferno', 'rising_phoenix'],
      5: ['firestorm', 'conflagration'],
      6: ['heart_of_the_volcano', 'solar_flare'],
    },
  },

  sparkwing: {
    id: 'sparkwing',
    type: CreatureType.FIRE,
    starter: false,
    baseHp: 26,
    hpPerLevel: 4,
    passiveTags: ['ignite', 'multi_hit', 'aggro'],
    description: 'Glass cannon. Lowest HP of any Fire creature, highest dexterity. Multi-hit specialist.',

    stages: {
      baby: {
        name: 'Sparkwing',
        description: 'A tiny bird that sheds embers as it flies. Hard to hit.',
        armorClass: 10,
        stats: { strength: 10, dexterity: 18, intelligence: 12, constitution: 8, wisdom: 9 },
      },
      adult: {
        name: 'Scorchwing',
        description: 'Faster now, diving in and out before enemies can react.',
        armorClass: 14,
        stats: { strength: 11, dexterity: 19, intelligence: 13, constitution: 9, wisdom: 10 },
      },
      elder: {
        name: 'Phoenixstrike',
        description: 'A blur of fire and feathers. Three hits before you can blink, each one stacking Ignite.',
        armorClass: 15,
        stats: { strength: 12, dexterity: 20, intelligence: 15, constitution: 10, wisdom: 11 },
      },
    },

    starterDeck: [
      'quick_burn', 'quick_burn', 'quick_burn',
      'cinder_toss', 'cinder_toss',
      'ember_strike', 'ember_strike',
      'flame_dash',
      'focus', 'focus',
    ],

    cardPool: {
      1: ['quick_burn', 'cinder_toss', 'ember_strike', 'stoke', 'focus', 'zenith', 'adrenaline'],
      2: ['flame_dash', 'backdraft', 'fan_the_flames'],
      3: ['ignition', 'pyromaniac', 'burnout'],
      4: ['firestorm', 'rising_phoenix'],
      5: ['solar_flare', 'conflagration'],
      6: ['heart_of_the_volcano'],
    },
  },

  embertoad: {
    id: 'embertoad',
    type: CreatureType.FIRE,
    starter: false,
    baseHp: 34,
    hpPerLevel: 5,
    passiveTags: ['ignite', 'aoe', 'control'],
    description: 'Area control specialist. Smolder and Heat Wave spread Ignite across both enemies efficiently.',

    stages: {
      baby: {
        name: 'Embertoad',
        description: 'A squat toad that exhales smoke. Its wide mouth is perfect for spitting fire at everything.',
        armorClass: 9,
        stats: { strength: 11, dexterity: 10, intelligence: 15, constitution: 13, wisdom: 12 },
      },
      adult: {
        name: 'Scorchtoad',
        description: 'The smoke has become flame. Its belly rumbles before every eruption.',
        armorClass: 12,
        stats: { strength: 12, dexterity: 10, intelligence: 17, constitution: 14, wisdom: 13 },
      },
      elder: {
        name: 'Magmavore',
        description: 'A volcanic nightmare. When it opens its mouth, both enemies start sweating.',
        armorClass: 13,
        stats: { strength: 13, dexterity: 10, intelligence: 19, constitution: 15, wisdom: 14 },
      },
    },

    starterDeck: [
      'smolder', 'smolder', 'smolder',
      'heat_up', 'heat_up',
      'scorched_earth',
      'ember_strike', 'ember_strike',
      'stoke', 'focus',
    ],

    cardPool: {
      1: ['smolder', 'heat_up', 'ember_strike', 'stoke', 'focus', 'zenith'],
      2: ['heat_wave', 'scorched_earth', 'fan_the_flames'],
      3: ['ignition', 'pyromaniac', 'burnout'],
      4: ['inferno', 'volcanic_rage'],
      5: ['firestorm', 'conflagration'],
      6: ['solar_flare', 'heart_of_the_volcano'],
    },
  },

  moltenite: {
    id: 'moltenite',
    type: CreatureType.FIRE,
    starter: false,
    baseHp: 30,
    hpPerLevel: 4,
    passiveTags: ['ignite', 'combo', 'burst'],
    description: 'Combo-oriented. Builds toward Conflagration and Ignition finishers with enablers like Pyromaniac.',

    stages: {
      baby: {
        name: 'Moltenite',
        description: 'A small rock creature with a glowing core. Patient, deliberate.',
        armorClass: 9,
        stats: { strength: 11, dexterity: 11, intelligence: 16, constitution: 12, wisdom: 13 },
      },
      adult: {
        name: 'Magmacore',
        description: 'Its core burns hotter. Every card played feels like stoking a furnace.',
        armorClass: 13,
        stats: { strength: 12, dexterity: 12, intelligence: 18, constitution: 13, wisdom: 14 },
      },
      elder: {
        name: 'Igneousrex',
        description: 'The slow build is over. When it detonates, no stack goes to waste.',
        armorClass: 14,
        stats: { strength: 13, dexterity: 13, intelligence: 20, constitution: 14, wisdom: 15 },
      },
    },

    starterDeck: [
      'cinder_toss', 'cinder_toss',
      'heat_up', 'heat_up', 'heat_up',
      'ember_strike', 'ember_strike',
      'stoke', 'stoke',
      'focus',
    ],

    cardPool: {
      1: ['cinder_toss', 'heat_up', 'ember_strike', 'stoke', 'focus', 'zenith'],
      2: ['fan_the_flames', 'pyromaniac', 'flame_dash'],
      3: ['ignition', 'backdraft', 'burnout'],
      4: ['conflagration', 'volcanic_rage'],
      5: ['firestorm', 'solar_flare'],
      6: ['heart_of_the_volcano'],
    },
  },
};


// ============================================================
//  WATER CREATURES  (5 total — 1 starter, 4 catch)
//  Theme: high HP, moderate AC, healing/shielding, Flow engine
// ============================================================

export const WATER_CREATURES = {

  tidepup: {
    id: 'tidepup',
    type: CreatureType.WATER,
    starter: true,
    baseHp: 65,
    hpPerLevel: 9,
    passiveTags: ['flow', 'sustain', 'shield'],
    description: 'Balanced Water starter. Builds Flow steadily, sustains through shield and heal.',

    stages: {
      baby: {
        name: 'Tidepup',
        description: 'A small seal-like creature that splashes water at enemies. Surprisingly resilient.',
        armorClass: 12,
        stats: { strength: 13, dexterity: 12, intelligence: 11, constitution: 16, wisdom: 15 },
      },
      adult: {
        name: 'Wavehound',
        description: 'Larger and more confident. Its Flow engine starts paying off in extended fights.',
        armorClass: 13,
        stats: { strength: 11, dexterity: 13, intelligence: 13, constitution: 16, wisdom: 15 },
      },
      elder: {
        name: 'Abyssalord',
        description: 'Ancient and massive. Can sustain near-indefinitely through shields and the right Flow setup.',
        armorClass: 14,
        stats: { strength: 13, dexterity: 14, intelligence: 15, constitution: 18, wisdom: 17 },
      },
    },

    starterDeck: [
      'steady_flow', 'steady_flow', 'steady_flow',
      'mending_mist', 'mending_mist',
      'ripple', 'ripple',
      'current',
      'trickle',
      'focus',
    ],

    cardPool: {
      1: ['steady_flow', 'mending_mist', 'ripple', 'current', 'bubble_barrier', 'cool_down', 'trickle', 'water_jet', 'focus', 'brace', 'second_wind'],
      2: ['tidal_shield', 'undertow', 'wellspring', 'still_waters', 'flood'],
      3: ['riptide', 'aqua_pulse', 'deep_breath'],
      4: ['torrential_heal', 'ocean_bastion', 'maelstrom'],
      5: ['abyssal_current', 'tidal_wave'],
      6: ['the_deep'],
    },
  },

  coralshell: {
    id: 'coralshell',
    type: CreatureType.WATER,
    starter: false,
    baseHp: 40,
    hpPerLevel: 7,
    passiveTags: ['flow', 'tank', 'shield'],
    description: 'Highest HP of any Water creature. Fortress-style play — absorb everything, heal back up.',

    stages: {
      baby: {
        name: 'Coralshell',
        description: 'A small crab with coral growing on its shell. Hard to hurt.',
        armorClass: 12,
        stats: { strength: 12, dexterity: 8, intelligence: 9, constitution: 17, wisdom: 14 },
      },
      adult: {
        name: 'Tideguard',
        description: 'The coral has grown into a full carapace. Attacks barely scratch it.',
        armorClass: 16,
        stats: { strength: 13, dexterity: 8, intelligence: 10, constitution: 19, wisdom: 15 },
      },
      elder: {
        name: 'Reefcolossus',
        description: 'A living reef. Its AC is the highest of any Water creature. Practically immovable.',
        armorClass: 18,
        stats: { strength: 14, dexterity: 9, intelligence: 11, constitution: 20, wisdom: 16 },
      },
    },

    starterDeck: [
      'bubble_barrier', 'bubble_barrier', 'bubble_barrier',
      'steady_flow', 'steady_flow',
      'mending_mist', 'mending_mist',
      'current', 'current',
      'water_jet',
    ],

    cardPool: {
      1: ['bubble_barrier', 'steady_flow', 'mending_mist', 'current', 'cool_down', 'water_jet', 'brace', 'second_wind'],
      2: ['tidal_shield', 'ocean_bastion', 'still_waters', 'flood'],
      3: ['deep_breath', 'aqua_pulse', 'wellspring'],
      4: ['torrential_heal', 'maelstrom'],
      5: ['tidal_wave', 'abyssal_current'],
      6: ['the_deep'],
    },
  },

  mistsprite: {
    id: 'mistsprite',
    type: CreatureType.WATER,
    starter: false,
    baseHp: 29,
    hpPerLevel: 4,
    passiveTags: ['flow', 'control', 'debuff'],
    description: 'Control-oriented Water. Lower HP but uses Waterlogged and Undertow to keep enemies locked down.',

    stages: {
      baby: {
        name: 'Mistsprite',
        description: 'A small wisp that drifts through fog. Its touch slows and weakens.',
        armorClass: 9,
        stats: { strength: 9, dexterity: 14, intelligence: 16, constitution: 11, wisdom: 14 },
      },
      adult: {
        name: 'Fogwraith',
        description: 'Harder to see, harder to hit. Its debuffs compound into complete enemy helplessness.',
        armorClass: 13,
        stats: { strength: 10, dexterity: 15, intelligence: 18, constitution: 12, wisdom: 16 },
      },
      elder: {
        name: 'Voidtide',
        description: 'The sea made intangible. Enemies staggered by Waterlogged and Stun never get to act.',
        armorClass: 14,
        stats: { strength: 11, dexterity: 16, intelligence: 20, constitution: 13, wisdom: 18 },
      },
    },

    starterDeck: [
      'flood', 'flood',
      'undertow', 'undertow',
      'current', 'current',
      'ripple', 'ripple',
      'cool_down',
      'focus',
    ],

    cardPool: {
      1: ['flood', 'current', 'ripple', 'cool_down', 'water_jet', 'focus', 'nullify'],
      2: ['undertow', 'tidal_shield', 'deep_breath'],
      3: ['maelstrom', 'aqua_pulse', 'riptide'],
      4: ['abyssal_current', 'torrential_heal'],
      5: ['tidal_wave', 'the_deep'],
      6: ['the_deep'],
    },
  },

  streamkin: {
    id: 'streamkin',
    type: CreatureType.WATER,
    starter: false,
    baseHp: 32,
    hpPerLevel: 5,
    passiveTags: ['flow', 'combo', 'heal'],
    description: 'Flow combo specialist. Builds stacks quickly with Ripple and Current, dumps them for massive heals.',

    stages: {
      baby: {
        name: 'Streamkin',
        description: 'A slender eel-like creature that thrives in fast water. Always gathering.',
        armorClass: 9,
        stats: { strength: 10, dexterity: 13, intelligence: 14, constitution: 12, wisdom: 16 },
      },
      adult: {
        name: 'Currentkin',
        description: 'Its Flow builds faster than most. The payoff cards hit harder per stack.',
        armorClass: 12,
        stats: { strength: 11, dexterity: 14, intelligence: 15, constitution: 13, wisdom: 18 },
      },
      elder: {
        name: 'Riverlord',
        description: 'The fastest Flow builder in the game. Torrential Heal and The Deep are its endgame.',
        armorClass: 13,
        stats: { strength: 12, dexterity: 15, intelligence: 16, constitution: 14, wisdom: 20 },
      },
    },

    starterDeck: [
      'current', 'current', 'current',
      'ripple', 'ripple', 'ripple',
      'trickle', 'trickle',
      'mending_mist',
      'focus',
    ],

    cardPool: {
      1: ['current', 'ripple', 'trickle', 'mending_mist', 'steady_flow', 'focus', 'second_wind'],
      2: ['wellspring', 'tidal_shield', 'still_waters'],
      3: ['torrential_heal', 'deep_breath', 'riptide'],
      4: ['ocean_bastion', 'abyssal_current'],
      5: ['tidal_wave', 'the_deep'],
      6: ['the_deep'],
    },
  },

  frostveil: {
    id: 'frostveil',
    type: CreatureType.WATER,
    starter: false,
    baseHp: 30,
    hpPerLevel: 5,
    passiveTags: ['flow', 'aoe', 'sustain'],
    description: 'AoE Water attacker. Aqua Pulse and Tidal Wave hit both enemies while keeping HP topped up.',

    stages: {
      baby: {
        name: 'Frostveil',
        description: 'A jellyfish trailing icy tendrils. Its aura chills the whole battlefield.',
        armorClass: 9,
        stats: { strength: 11, dexterity: 11, intelligence: 15, constitution: 13, wisdom: 14 },
      },
      adult: {
        name: 'Glacialveil',
        description: 'The tendrils grow. AoE damage now comes with meaningful healing attached.',
        armorClass: 12,
        stats: { strength: 12, dexterity: 12, intelligence: 17, constitution: 14, wisdom: 16 },
      },
      elder: {
        name: 'Tidecaller',
        description: 'A force of nature. Calls the tide and heals for every enemy it catches in it.',
        armorClass: 13,
        stats: { strength: 13, dexterity: 13, intelligence: 19, constitution: 15, wisdom: 18 },
      },
    },

    starterDeck: [
      'water_jet', 'water_jet',
      'aqua_pulse', 'aqua_pulse',
      'steady_flow', 'steady_flow',
      'mending_mist', 'mending_mist',
      'current',
      'focus',
    ],

    cardPool: {
      1: ['water_jet', 'aqua_pulse', 'steady_flow', 'mending_mist', 'current', 'focus'],
      2: ['flood', 'wellspring', 'holy_nova'],
      3: ['maelstrom', 'deep_breath', 'riptide'],
      4: ['torrential_heal', 'ocean_bastion'],
      5: ['tidal_wave', 'abyssal_current'],
      6: ['the_deep'],
    },
  },
};


// ============================================================
//  EARTH CREATURES  (5 total — 1 starter, 4 catch)
//  Theme: highest AC, Fortify stacking, slow but devastating
// ============================================================

export const EARTH_CREATURES = {

  stonepup: {
    id: 'stonepup',
    type: CreatureType.EARTH,
    starter: true,
    baseHp: 68,
    hpPerLevel: 10,
    passiveTags: ['fortify', 'tank', 'control'],
    description: 'Balanced Earth starter. Fortify-focused, learns Landslide to convert defense into offense.',

    stages: {
      baby: {
        name: 'Stonepup',
        description: 'A round rock creature with stubby legs. More defensive than it looks.',
        armorClass: 13,
        stats: { strength: 16, dexterity: 8, intelligence: 10, constitution: 18, wisdom: 11 },
      },
      adult: {
        name: 'Boulderback',
        description: 'Its back is now solid stone. Fortify comes easily; enemies chip away uselessly.',
        armorClass: 15,
        stats: { strength: 15, dexterity: 8, intelligence: 11, constitution: 18, wisdom: 12 },
      },
      elder: {
        name: 'Terraforged',
        description: 'The land itself. Stacks Fortify to absurd heights before Landslide ends things decisively.',
        armorClass: 17,
        stats: { strength: 17, dexterity: 9, intelligence: 12, constitution: 20, wisdom: 13 },
      },
    },

    starterDeck: [
      'bedrock', 'bedrock', 'bedrock',
      'rockwall', 'rockwall',
      'stone_strike', 'stone_strike',
      'earthen_skin',
      'mud_slick',
      'focus',
    ],

    cardPool: {
      1: ['bedrock', 'rockwall', 'stone_strike', 'earthen_skin', 'mud_slick', 'quake', 'dust_cloud', 'focus', 'brace'],
      2: ['granite_will', 'stone_skin', 'avalanche', 'living_fortress'],
      3: ['petrify', 'seismic_slam', 'tectonic_shift'],
      4: ['mountain_form', 'landslide', 'geological_patience'],
      5: ['fault_line', 'continental_drift'],
      6: ['world_pillar'],
    },
  },

  quarrymite: {
    id: 'quarrymite',
    type: CreatureType.EARTH,
    starter: false,
    baseHp: 41,
    hpPerLevel: 7,
    passiveTags: ['fortify', 'tank', 'thorns'],
    description: 'Highest AC of any Earth creature. Pairs Fortify with damage-reduction passives for a near-impenetrable wall.',

    stages: {
      baby: {
        name: 'Quarrymite',
        description: 'A beetle-like creature with stone plating. Nearly impossible to one-shot.',
        armorClass: 12,
        stats: { strength: 12, dexterity: 7, intelligence: 9, constitution: 18, wisdom: 12 },
      },
      adult: {
        name: 'Slateback',
        description: 'The plating has fused into layered armor. Attacks that do land deal reduced damage.',
        armorClass: 16,
        stats: { strength: 13, dexterity: 7, intelligence: 10, constitution: 20, wisdom: 13 },
      },
      elder: {
        name: 'Granitolith',
        description: 'A walking fortress. The highest base AC in the game. Few attacks touch it at all.',
        armorClass: 18,
        stats: { strength: 14, dexterity: 8, intelligence: 11, constitution: 20, wisdom: 14 },
      },
    },

    starterDeck: [
      'rockwall', 'rockwall', 'rockwall',
      'earthen_skin', 'earthen_skin',
      'bedrock', 'bedrock',
      'stone_skin', 'stone_skin',
      'stone_strike',
    ],

    cardPool: {
      1: ['rockwall', 'earthen_skin', 'bedrock', 'stone_skin', 'stone_strike', 'quake', 'brace'],
      2: ['granite_will', 'living_fortress', 'avalanche'],
      3: ['geological_patience', 'mountain_form', 'tectonic_shift'],
      4: ['landslide', 'seismic_slam'],
      5: ['fault_line', 'world_pillar'],
      6: ['world_pillar', 'continental_drift'],
    },
  },

  mudcrawler: {
    id: 'mudcrawler',
    type: CreatureType.EARTH,
    starter: false,
    baseHp: 34,
    hpPerLevel: 5,
    passiveTags: ['fortify', 'control', 'slow'],
    description: 'Control Earth. Stacks Slow and Blind to make enemies nearly unable to hit, then grinds them down.',

    stages: {
      baby: {
        name: 'Mudcrawler',
        description: 'A slow-moving slug covered in dense mud. Leaves a trail that slows anything behind it.',
        armorClass: 9,
        stats: { strength: 11, dexterity: 8, intelligence: 14, constitution: 14, wisdom: 13 },
      },
      adult: {
        name: 'Claymancer',
        description: 'Learned to sculpt its mud into traps and walls. Enemies get bogged down.',
        armorClass: 13,
        stats: { strength: 12, dexterity: 9, intelligence: 16, constitution: 15, wisdom: 15 },
      },
      elder: {
        name: 'Terramire',
        description: 'The swamp given form. Slow (5) and Blind (4) applied liberally. Nobody escapes.',
        armorClass: 14,
        stats: { strength: 13, dexterity: 9, intelligence: 18, constitution: 16, wisdom: 17 },
      },
    },

    starterDeck: [
      'mud_slick', 'mud_slick', 'mud_slick',
      'dust_cloud', 'dust_cloud',
      'quake', 'quake',
      'bedrock', 'bedrock',
      'focus',
    ],

    cardPool: {
      1: ['mud_slick', 'dust_cloud', 'quake', 'bedrock', 'focus', 'nullify'],
      2: ['avalanche', 'petrify', 'stone_skin'],
      3: ['seismic_slam', 'tectonic_shift', 'landslide'],
      4: ['fault_line', 'continental_drift'],
      5: ['mountain_form', 'world_pillar'],
      6: ['world_pillar', 'continental_drift'],
    },
  },

  cragspike: {
    id: 'cragspike',
    type: CreatureType.EARTH,
    starter: false,
    baseHp: 32,
    hpPerLevel: 5,
    passiveTags: ['fortify', 'offense', 'combo'],
    description: 'Offensive Earth. Lower AC for the type, but invests Fortify into Landslide and Tectonic Shift for burst.',

    stages: {
      baby: {
        name: 'Cragspike',
        description: 'A nimble lizard with rocky spines. More offensively minded than most Earth creatures.',
        armorClass: 9,
        stats: { strength: 15, dexterity: 11, intelligence: 12, constitution: 13, wisdom: 10 },
      },
      adult: {
        name: 'Spikerock',
        description: 'The spines are now boulders. Seismic Slam and Landslide hit harder at this stage.',
        armorClass: 13,
        stats: { strength: 17, dexterity: 11, intelligence: 13, constitution: 14, wisdom: 11 },
      },
      elder: {
        name: 'Craterborn',
        description: 'Every attack leaves a crater. Stacks Fortify briefly before cashing it all in.',
        armorClass: 14,
        stats: { strength: 19, dexterity: 12, intelligence: 14, constitution: 15, wisdom: 12 },
      },
    },

    starterDeck: [
      'stone_strike', 'stone_strike', 'stone_strike',
      'ground_pound', 'ground_pound',
      'bedrock', 'bedrock',
      'quake', 'quake',
      'focus',
    ],

    cardPool: {
      1: ['stone_strike', 'ground_pound', 'bedrock', 'quake', 'focus', 'adrenaline'],
      2: ['seismic_slam', 'avalanche', 'tectonic_shift'],
      3: ['landslide', 'granite_will', 'geological_patience'],
      4: ['fault_line', 'mountain_form'],
      5: ['continental_drift', 'world_pillar'],
      6: ['world_pillar'],
    },
  },

  dustwraith: {
    id: 'dustwraith',
    type: CreatureType.EARTH,
    starter: false,
    baseHp: 31,
    hpPerLevel: 5,
    passiveTags: ['fortify', 'aoe', 'debuff'],
    description: 'AoE debuffer. Quake and Avalanche combined with Dust Cloud make both enemies permanently Slowed and Blinded.',

    stages: {
      baby: {
        name: 'Dustwraith',
        description: 'A spirit of sand and grit. Its presence fills the air with choking dust.',
        armorClass: 9,
        stats: { strength: 11, dexterity: 12, intelligence: 15, constitution: 13, wisdom: 13 },
      },
      adult: {
        name: 'Sandreaper',
        description: 'The dust has become a storm. Blind and Slow apply to both enemies simultaneously.',
        armorClass: 12,
        stats: { strength: 12, dexterity: 13, intelligence: 17, constitution: 14, wisdom: 15 },
      },
      elder: {
        name: 'Desertlord',
        description: 'The desert incarnate. Continental Drift stuns everything. Nothing sees it coming.',
        armorClass: 13,
        stats: { strength: 13, dexterity: 13, intelligence: 19, constitution: 15, wisdom: 17 },
      },
    },

    starterDeck: [
      'dust_cloud', 'dust_cloud', 'dust_cloud',
      'quake', 'quake',
      'mud_slick', 'mud_slick',
      'bedrock', 'bedrock',
      'focus',
    ],

    cardPool: {
      1: ['dust_cloud', 'quake', 'mud_slick', 'bedrock', 'focus'],
      2: ['avalanche', 'petrify', 'stone_skin'],
      3: ['seismic_slam', 'landslide', 'tectonic_shift'],
      4: ['fault_line', 'mountain_form'],
      5: ['continental_drift', 'world_pillar'],
      6: ['world_pillar', 'continental_drift'],
    },
  },
};


// ============================================================
//  WIND CREATURES  (5 total — 1 starter, 4 catch)
//  Theme: highest dexterity, evasion, draw engine, card volume
// ============================================================

export const WIND_CREATURES = {

  breezekit: {
    id: 'breezekit',
    type: CreatureType.WIND,
    starter: true,
    baseHp: 52,
    hpPerLevel: 7,
    passiveTags: ['gust', 'draw', 'evasion'],
    description: 'Balanced Wind starter. Builds Gust through consistent play, evasion keeps it alive.',

    stages: {
      baby: {
        name: 'Breezekit',
        description: 'A small cat-like creature trailing wisps of air. Always one step ahead.',
        armorClass: 13,
        stats: { strength: 13, dexterity: 19, intelligence: 13, constitution: 10, wisdom: 11 },
      },
      adult: {
        name: 'Galeclaw',
        description: 'Its movements blur. Gust stacks accumulate faster than enemies can respond.',
        armorClass: 14,
        stats: { strength: 11, dexterity: 18, intelligence: 14, constitution: 11, wisdom: 12 },
      },
      elder: {
        name: 'Stormreaver',
        description: 'A tempest in creature form. Eye of God is its ultimate, and it earns it.',
        armorClass: 15,
        stats: { strength: 12, dexterity: 20, intelligence: 16, constitution: 12, wisdom: 13 },
      },
    },

    starterDeck: [
      'gale_slash', 'gale_slash', 'gale_slash',
      'tailwind', 'tailwind',
      'breeze', 'breeze',
      'dodge',
      'swift_step',
      'focus',
    ],

    cardPool: {
      1: ['gale_slash', 'tailwind', 'breeze', 'dodge', 'swift_step', 'zephyr_strike', 'cutting_wind', 'updraft', 'focus', 'zenith'],
      2: ['storm_burst', 'whirlwind', 'wind_tunnel', 'eye_of_the_storm'],
      3: ['gust_rider', 'slipstream', 'razor_gale', 'cyclone'],
      4: ['tempest', 'infinite_gale', 'hurricane'],
      5: ['the_last_breath', 'gale_force'],
      6: ['eye_of_god'],
    },
  },

  driftmote: {
    id: 'driftmote',
    type: CreatureType.WIND,
    starter: false,
    baseHp: 24,
    hpPerLevel: 4,
    passiveTags: ['gust', 'evasion', 'glass_cannon'],
    description: 'Lowest HP in the game. Compensates with near-unhittable evasion and the highest DEX of any creature.',

    stages: {
      baby: {
        name: 'Driftmote',
        description: 'Barely visible. A mote of wind that somehow has opinions.',
        armorClass: 11,
        stats: { strength: 8, dexterity: 19, intelligence: 13, constitution: 8, wisdom: 11 },
      },
      adult: {
        name: 'Vortexmote',
        description: 'Still barely there, but now it hurts when it hits. Almost impossible to land a blow.',
        armorClass: 15,
        stats: { strength: 9, dexterity: 20, intelligence: 14, constitution: 9, wisdom: 12 },
      },
      elder: {
        name: 'Phantomgale',
        description: 'Theoretical maximum evasion. With Eye of God it takes two full turns before enemies get to act.',
        armorClass: 16,
        stats: { strength: 10, dexterity: 20, intelligence: 16, constitution: 10, wisdom: 13 },
      },
    },

    starterDeck: [
      'dodge', 'dodge', 'dodge',
      'tailwind', 'tailwind', 'tailwind',
      'gale_slash', 'gale_slash',
      'breeze',
      'focus',
    ],

    cardPool: {
      1: ['dodge', 'tailwind', 'gale_slash', 'breeze', 'focus', 'zenith'],
      2: ['eye_of_the_storm', 'wind_tunnel', 'slipstream'],
      3: ['gust_rider', 'the_last_breath', 'cyclone'],
      4: ['hurricane', 'infinite_gale'],
      5: ['gale_force', 'eye_of_god'],
      6: ['eye_of_god'],
    },
  },

  squallpup: {
    id: 'squallpup',
    type: CreatureType.WIND,
    starter: false,
    baseHp: 30,
    hpPerLevel: 4,
    passiveTags: ['gust', 'multi_hit', 'shred'],
    description: 'Multi-hit Wind specialist. Zephyr Strike and Tempest with Cutting Wind Shred stacks equals rapidly declining enemy AC.',

    stages: {
      baby: {
        name: 'Squallpup',
        description: 'A small wolf pup trailing wind. Its claws cut through armor like paper.',
        armorClass: 10,
        stats: { strength: 13, dexterity: 17, intelligence: 11, constitution: 11, wisdom: 10 },
      },
      adult: {
        name: 'Razorwind',
        description: 'Each claw strike applies Shred. By the third hit, nothing has AC left to speak of.',
        armorClass: 14,
        stats: { strength: 14, dexterity: 18, intelligence: 12, constitution: 12, wisdom: 11 },
      },
      elder: {
        name: 'Stormwolf',
        description: 'Tempest from this creature strips three Shred stacks per cast. Armor becomes irrelevant.',
        armorClass: 15,
        stats: { strength: 15, dexterity: 20, intelligence: 13, constitution: 13, wisdom: 12 },
      },
    },

    starterDeck: [
      'zephyr_strike', 'zephyr_strike', 'zephyr_strike',
      'cutting_wind', 'cutting_wind', 'cutting_wind',
      'gale_slash', 'gale_slash',
      'tailwind',
      'focus',
    ],

    cardPool: {
      1: ['zephyr_strike', 'cutting_wind', 'gale_slash', 'tailwind', 'focus', 'adrenaline'],
      2: ['razor_gale', 'whirlwind', 'storm_burst'],
      3: ['tempest', 'gust_rider', 'cyclone'],
      4: ['hurricane', 'infinite_gale'],
      5: ['gale_force', 'the_last_breath'],
      6: ['eye_of_god'],
    },
  },

  cyclonix: {
    id: 'cyclonix',
    type: CreatureType.WIND,
    starter: false,
    baseHp: 28,
    hpPerLevel: 4,
    passiveTags: ['gust', 'combo', 'energy'],
    description: 'Combo engine. Slipstream and Hurricane let it play multiple cards per energy. Gale Force finisher.',

    stages: {
      baby: {
        name: 'Cyclonix',
        description: 'A spinning top of a creature. Every card played accelerates it further.',
        armorClass: 9,
        stats: { strength: 10, dexterity: 15, intelligence: 17, constitution: 10, wisdom: 13 },
      },
      adult: {
        name: 'Tornadrix',
        description: 'The spin is out of control in the best way. Slipstream chains become devastating.',
        armorClass: 13,
        stats: { strength: 11, dexterity: 16, intelligence: 19, constitution: 11, wisdom: 14 },
      },
      elder: {
        name: 'Vortexlord',
        description: 'Six cards in a turn is possible. Eye of God into another full turn is its signature.',
        armorClass: 14,
        stats: { strength: 12, dexterity: 17, intelligence: 20, constitution: 12, wisdom: 15 },
      },
    },

    starterDeck: [
      'tailwind', 'tailwind', 'tailwind',
      'slipstream', 'slipstream',
      'gale_slash', 'gale_slash',
      'swift_step', 'swift_step',
      'focus',
    ],

    cardPool: {
      1: ['tailwind', 'gale_slash', 'swift_step', 'focus', 'zenith'],
      2: ['slipstream', 'wind_tunnel', 'storm_burst'],
      3: ['gust_rider', 'hurricane', 'cyclone'],
      4: ['infinite_gale', 'the_last_breath'],
      5: ['gale_force', 'eye_of_god'],
      6: ['eye_of_god'],
    },
  },

  galehorn: {
    id: 'galehorn',
    type: CreatureType.WIND,
    starter: false,
    baseHp: 31,
    hpPerLevel: 5,
    passiveTags: ['gust', 'aoe', 'burst'],
    description: 'AoE Wind burst. Whirlwind and Tempest are its bread and butter, backed by Storm Burst for hand-size scaling.',

    stages: {
      baby: {
        name: 'Galehorn',
        description: 'A rhino-like creature with a horn that generates miniature cyclones.',
        armorClass: 9,
        stats: { strength: 14, dexterity: 14, intelligence: 14, constitution: 12, wisdom: 11 },
      },
      adult: {
        name: 'Stormhorn',
        description: 'The cyclones are now full-sized. Both enemies take meaningful damage every turn.',
        armorClass: 13,
        stats: { strength: 15, dexterity: 15, intelligence: 16, constitution: 13, wisdom: 12 },
      },
      elder: {
        name: 'Hurricanis',
        description: 'It charges and the battlefield clears. AoE at this scale ends fights in two turns.',
        armorClass: 14,
        stats: { strength: 16, dexterity: 16, intelligence: 18, constitution: 14, wisdom: 13 },
      },
    },

    starterDeck: [
      'whirlwind', 'whirlwind',
      'gale_slash', 'gale_slash',
      'tailwind', 'tailwind',
      'breeze', 'breeze',
      'zephyr_strike',
      'focus',
    ],

    cardPool: {
      1: ['whirlwind', 'gale_slash', 'tailwind', 'breeze', 'zephyr_strike', 'focus'],
      2: ['storm_burst', 'wind_tunnel', 'eye_of_the_storm'],
      3: ['tempest', 'gust_rider', 'cyclone'],
      4: ['infinite_gale', 'hurricane'],
      5: ['gale_force', 'the_last_breath'],
      6: ['eye_of_god'],
    },
  },
};


// ============================================================
//  SHADOW CREATURES  (5 total — 1 starter, 4 catch)
//  Theme: drain/sustain, poison stacking, debuff control
// ============================================================

export const SHADOW_CREATURES = {

  duskrat: {
    id: 'duskrat',
    type: CreatureType.SHADOW,
    starter: true,
    baseHp: 56,
    hpPerLevel: 8,
    passiveTags: ['drain', 'poison', 'sustain'],
    description: 'Balanced Shadow starter. Drain sustains it while Poison stacks tick. Great long-fight creature.',

    stages: {
      baby: {
        name: 'Duskrat',
        description: 'A small rat with shadowy fur. Its bite carries a mild toxin.',
        armorClass: 12,
        stats: { strength: 11, dexterity: 16, intelligence: 16, constitution: 12, wisdom: 12 },
      },
      adult: {
        name: 'Shadowrat',
        description: 'The toxin is now a full Poison stack per bite. Drain keeps it healthy through long fights.',
        armorClass: 13,
        stats: { strength: 12, dexterity: 15, intelligence: 15, constitution: 13, wisdom: 14 },
      },
      elder: {
        name: 'Umbravore',
        description: 'It feeds on life itself. Void Rupture is its endgame — drain from every enemy at once.',
        armorClass: 14,
        stats: { strength: 13, dexterity: 16, intelligence: 17, constitution: 14, wisdom: 16 },
      },
    },

    starterDeck: [
      'shadow_strike', 'shadow_strike', 'shadow_strike',
      'venom', 'venom',
      'dark_pulse', 'dark_pulse',
      'weaken',
      'night_veil',
      'focus',
    ],

    cardPool: {
      1: ['shadow_strike', 'venom', 'dark_pulse', 'weaken', 'night_veil', 'creeping_dark', 'lifesteal', 'shadow_step', 'focus', 'second_wind'],
      2: ['plague', 'soul_rend', 'enervate', 'umbral_grasp'],
      3: ['toxic_cloud', 'midnight_feast', 'consume'],
      4: ['death_mark', 'rot', 'black_hole'],
      5: ['shadow_pact', 'void_rupture'],
      6: ['eclipse', 'void_rupture'],
    },
  },

  venomfang: {
    id: 'venomfang',
    type: CreatureType.SHADOW,
    starter: false,
    baseHp: 29,
    hpPerLevel: 4,
    passiveTags: ['drain', 'poison', 'aggro'],
    description: 'Poison aggressor. Highest intelligence of any Shadow creature. Stacks Poison fast and detonates with Black Hole.',

    stages: {
      baby: {
        name: 'Venomfang',
        description: 'A small serpent with dripping fangs. Its Poison stacks accumulate alarmingly fast.',
        armorClass: 9,
        stats: { strength: 10, dexterity: 14, intelligence: 17, constitution: 11, wisdom: 12 },
      },
      adult: {
        name: 'Toxicobra',
        description: 'Plague into Toxic Cloud into Rot — a poison package that locks enemies in.',
        armorClass: 13,
        stats: { strength: 11, dexterity: 15, intelligence: 19, constitution: 12, wisdom: 13 },
      },
      elder: {
        name: 'Viperking',
        description: 'The apex poison user. Black Hole with ten stacks on a target ends fights instantly.',
        armorClass: 14,
        stats: { strength: 12, dexterity: 16, intelligence: 20, constitution: 13, wisdom: 14 },
      },
    },

    starterDeck: [
      'venom', 'venom', 'venom',
      'creeping_dark', 'creeping_dark',
      'shadow_strike', 'shadow_strike',
      'dark_pulse', 'dark_pulse',
      'focus',
    ],

    cardPool: {
      1: ['venom', 'creeping_dark', 'shadow_strike', 'dark_pulse', 'focus'],
      2: ['plague', 'toxic_cloud', 'enervate'],
      3: ['midnight_feast', 'rot', 'consume'],
      4: ['black_hole', 'death_mark'],
      5: ['void_rupture', 'eclipse'],
      6: ['eclipse'],
    },
  },

  wraithhound: {
    id: 'wraithhound',
    type: CreatureType.SHADOW,
    starter: false,
    baseHp: 32,
    hpPerLevel: 5,
    passiveTags: ['drain', 'control', 'debuff'],
    description: 'Debuff controller. Weaken and Umbral Grasp cripple enemy output. Shadow Pact for burst finishing.',

    stages: {
      baby: {
        name: 'Wraithhound',
        description: 'A ghost dog that howls in frequencies that weaken the will.',
        armorClass: 9,
        stats: { strength: 12, dexterity: 13, intelligence: 15, constitution: 13, wisdom: 14 },
      },
      adult: {
        name: 'Voidhound',
        description: 'Its howl now applies Weak to both enemies simultaneously.',
        armorClass: 13,
        stats: { strength: 13, dexterity: 14, intelligence: 17, constitution: 14, wisdom: 16 },
      },
      elder: {
        name: 'Dreadwolf',
        description: 'Enemies weakened by it deal single-digit damage. It outlasts everything.',
        armorClass: 14,
        stats: { strength: 14, dexterity: 15, intelligence: 19, constitution: 15, wisdom: 18 },
      },
    },

    starterDeck: [
      'weaken', 'weaken', 'weaken',
      'shadow_strike', 'shadow_strike',
      'dark_pulse', 'dark_pulse',
      'umbral_grasp',
      'night_veil',
      'focus',
    ],

    cardPool: {
      1: ['weaken', 'shadow_strike', 'dark_pulse', 'night_veil', 'focus', 'nullify'],
      2: ['umbral_grasp', 'enervate', 'soul_rend'],
      3: ['death_mark', 'consume', 'midnight_feast'],
      4: ['rot', 'black_hole'],
      5: ['eclipse', 'shadow_pact'],
      6: ['eclipse', 'void_rupture'],
    },
  },

  nightcrawler: {
    id: 'nightcrawler',
    type: CreatureType.SHADOW,
    starter: false,
    baseHp: 30,
    hpPerLevel: 5,
    passiveTags: ['drain', 'evasion', 'burst'],
    description: 'Evasion + Drain hybrid. Shadow Step and Lifesteal let it dodge and recover simultaneously.',

    stages: {
      baby: {
        name: 'Nightcrawler',
        description: 'A slender shadow creature that blends into darkness. Hard to catch, harder to hurt.',
        armorClass: 10,
        stats: { strength: 11, dexterity: 17, intelligence: 13, constitution: 12, wisdom: 12 },
      },
      adult: {
        name: 'Phantomwalker',
        description: 'Every dodge is followed by a draining counter. It gains life faster than it loses it.',
        armorClass: 14,
        stats: { strength: 12, dexterity: 18, intelligence: 15, constitution: 13, wisdom: 14 },
      },
      elder: {
        name: 'Voidstrider',
        description: 'Shadow Pact with full Drain at this stage is a near-indestructible loop.',
        armorClass: 15,
        stats: { strength: 13, dexterity: 20, intelligence: 17, constitution: 14, wisdom: 16 },
      },
    },

    starterDeck: [
      'shadow_step', 'shadow_step', 'shadow_step',
      'lifesteal', 'lifesteal',
      'dark_pulse', 'dark_pulse',
      'shadow_strike', 'shadow_strike',
      'focus',
    ],

    cardPool: {
      1: ['shadow_step', 'lifesteal', 'dark_pulse', 'shadow_strike', 'focus'],
      2: ['soul_rend', 'umbral_grasp', 'enervate'],
      3: ['consume', 'midnight_feast', 'shadow_pact'],
      4: ['death_mark', 'black_hole'],
      5: ['void_rupture', 'eclipse'],
      6: ['eclipse'],
    },
  },

  gloomspore: {
    id: 'gloomspore',
    type: CreatureType.SHADOW,
    starter: false,
    baseHp: 33,
    hpPerLevel: 5,
    passiveTags: ['drain', 'aoe', 'poison'],
    description: 'AoE Shadow. Creeping Dark and Plague hit both enemies, Void Rupture drains from all simultaneously.',

    stages: {
      baby: {
        name: 'Gloomspore',
        description: 'A mushroom-like creature releasing spores of shadow. The spores carry Poison.',
        armorClass: 9,
        stats: { strength: 11, dexterity: 10, intelligence: 16, constitution: 14, wisdom: 13 },
      },
      adult: {
        name: 'Darkbloom',
        description: 'The spores now fill the battlefield. Both enemies take Poison every turn.',
        armorClass: 12,
        stats: { strength: 12, dexterity: 10, intelligence: 18, constitution: 15, wisdom: 15 },
      },
      elder: {
        name: 'Voidfungus',
        description: 'The whole battlefield is its territory. Eclipse from this creature ends entire combat phases.',
        armorClass: 13,
        stats: { strength: 13, dexterity: 11, intelligence: 20, constitution: 16, wisdom: 17 },
      },
    },

    starterDeck: [
      'creeping_dark', 'creeping_dark', 'creeping_dark',
      'dark_pulse', 'dark_pulse',
      'venom', 'venom',
      'plague',
      'night_veil',
      'focus',
    ],

    cardPool: {
      1: ['creeping_dark', 'dark_pulse', 'venom', 'plague', 'night_veil', 'focus'],
      2: ['toxic_cloud', 'plague', 'enervate'],
      3: ['midnight_feast', 'black_hole', 'consume'],
      4: ['rot', 'death_mark'],
      5: ['void_rupture', 'eclipse'],
      6: ['eclipse'],
    },
  },
};


// ============================================================
//  LIGHT CREATURES  (5 total — 1 starter, 4 catch)
//  Theme: Radiance buildup, cleanse, buff/combo payoffs
// ============================================================

export const LIGHT_CREATURES = {

  glowpup: {
    id: 'glowpup',
    type: CreatureType.LIGHT,
    starter: true,
    baseHp: 60,
    hpPerLevel: 8,
    passiveTags: ['radiance', 'heal', 'buff'],
    description: 'Balanced Light starter. Builds Radiance naturally, cleanse keeps it healthy, Genesis/Divine Judgment finish.',

    stages: {
      baby: {
        name: 'Glowpup',
        description: 'A small dog radiating warm light. Its presence heals those around it.',
        armorClass: 12,
        stats: { strength: 10, dexterity: 12, intelligence: 15, constitution: 13, wisdom: 17 },
      },
      adult: {
        name: 'Luminhound',
        description: 'Brighter now. Its Radiance builds faster and its healing is substantial.',
        armorClass: 13,
        stats: { strength: 11, dexterity: 13, intelligence: 15, constitution: 14, wisdom: 17 },
      },
      elder: {
        name: 'Solarknight',
        description: 'Pure light given purpose. Genesis with 10 Radiance stacks ends anything.',
        armorClass: 14,
        stats: { strength: 12, dexterity: 14, intelligence: 17, constitution: 15, wisdom: 20 },
      },
    },

    starterDeck: [
      'holy_strike', 'holy_strike', 'holy_strike',
      'illuminate', 'illuminate',
      'mend', 'mend',
      'purify',
      'light_shield',
      'focus',
    ],

    cardPool: {
      1: ['holy_strike', 'illuminate', 'mend', 'purify', 'light_shield', 'smite', 'radiant_touch', 'dawn_barrier', 'focus', 'second_wind', 'brace'],
      2: ['solar_beam', 'benediction', 'blinding_flash', 'holy_nova', 'valor'],
      3: ['consecrate', 'celestial_ward', 'light_of_ruin'],
      4: ['divine_judgment', 'ascension', 'miracle'],
      5: ['genesis', 'the_last_light'],
      6: ['the_last_light', 'genesis'],
    },
  },

  dawnsprite: {
    id: 'dawnsprite',
    type: CreatureType.LIGHT,
    starter: false,
    baseHp: 28,
    hpPerLevel: 4,
    passiveTags: ['radiance', 'combo', 'burst'],
    description: 'Radiance speed-builder. Illuminate chains and Ascension let it pop Divine Judgment in two or three turns.',

    stages: {
      baby: {
        name: 'Dawnsprite',
        description: 'A tiny fairy of first light. Illuminate is almost free for it.',
        armorClass: 10,
        stats: { strength: 9, dexterity: 15, intelligence: 16, constitution: 10, wisdom: 16 },
      },
      adult: {
        name: 'Solsprite',
        description: 'Faster Radiance accumulation at this stage. Valor + Solar Beam becomes a reliable combo.',
        armorClass: 14,
        stats: { strength: 10, dexterity: 16, intelligence: 18, constitution: 11, wisdom: 18 },
      },
      elder: {
        name: 'Apotheosis',
        description: 'Radiance maxes in two turns. Divine Judgment with 12 stacks is a 60-damage nuke.',
        armorClass: 15,
        stats: { strength: 11, dexterity: 17, intelligence: 20, constitution: 12, wisdom: 20 },
      },
    },

    starterDeck: [
      'illuminate', 'illuminate', 'illuminate',
      'holy_strike', 'holy_strike',
      'solar_beam', 'solar_beam',
      'valor', 'valor',
      'focus',
    ],

    cardPool: {
      1: ['illuminate', 'holy_strike', 'solar_beam', 'valor', 'focus', 'zenith'],
      2: ['ascension', 'blinding_flash', 'consecrate'],
      3: ['divine_judgment', 'celestial_ward', 'light_of_ruin'],
      4: ['miracle', 'genesis'],
      5: ['the_last_light', 'genesis'],
      6: ['the_last_light'],
    },
  },

  cleansewing: {
    id: 'cleansewing',
    type: CreatureType.LIGHT,
    starter: false,
    baseHp: 32,
    hpPerLevel: 5,
    passiveTags: ['radiance', 'cleanse', 'sustain'],
    description: 'Sustain/cleanse specialist. Counters Shadow and status-heavy enemies. Miracle at level 5 is almost unkillable.',

    stages: {
      baby: {
        name: 'Cleansewing',
        description: 'A moth-like creature with purifying wingdust. Every beat of its wings removes a debuff.',
        armorClass: 9,
        stats: { strength: 10, dexterity: 13, intelligence: 14, constitution: 13, wisdom: 17 },
      },
      adult: {
        name: 'Purgemoth',
        description: 'Benediction is its core identity now. Cleanse everything, keep stacking Radiance.',
        armorClass: 13,
        stats: { strength: 11, dexterity: 14, intelligence: 16, constitution: 14, wisdom: 19 },
      },
      elder: {
        name: 'Sacredwing',
        description: 'Immune to the chaos of debuffs. Miracle when needed. The Last Light as a fail-safe.',
        armorClass: 14,
        stats: { strength: 12, dexterity: 15, intelligence: 18, constitution: 15, wisdom: 20 },
      },
    },

    starterDeck: [
      'purify', 'purify', 'purify',
      'mend', 'mend',
      'benediction',
      'illuminate', 'illuminate',
      'holy_strike', 'holy_strike',
    ],

    cardPool: {
      1: ['purify', 'mend', 'illuminate', 'holy_strike', 'light_shield', 'focus', 'second_wind', 'nullify'],
      2: ['benediction', 'holy_nova', 'valor'],
      3: ['celestial_ward', 'consecrate', 'miracle'],
      4: ['divine_judgment', 'ascension'],
      5: ['genesis', 'the_last_light'],
      6: ['the_last_light'],
    },
  },

  solarbeast: {
    id: 'solarbeast',
    type: CreatureType.LIGHT,
    starter: false,
    baseHp: 35,
    hpPerLevel: 5,
    passiveTags: ['radiance', 'offense', 'aoe'],
    description: 'Offensive Light. Holy Nova, Light of Ruin, and Genesis make it the most damaging Light creature.',

    stages: {
      baby: {
        name: 'Solarbeast',
        description: 'A lion-like creature with a mane of sunlight. Radiance builds toward offensive payoffs.',
        armorClass: 10,
        stats: { strength: 14, dexterity: 12, intelligence: 15, constitution: 14, wisdom: 14 },
      },
      adult: {
        name: 'Solarion',
        description: 'The mane blazes. Light of Ruin at this stage deals serious AoE damage.',
        armorClass: 14,
        stats: { strength: 15, dexterity: 13, intelligence: 17, constitution: 15, wisdom: 16 },
      },
      elder: {
        name: 'Aurorex',
        description: 'The sun made manifest. Genesis from this creature hits both enemies for north of 50 total damage.',
        armorClass: 15,
        stats: { strength: 16, dexterity: 14, intelligence: 19, constitution: 16, wisdom: 18 },
      },
    },

    starterDeck: [
      'holy_strike', 'holy_strike',
      'illuminate', 'illuminate',
      'smite', 'smite',
      'holy_nova', 'holy_nova',
      'radiant_touch',
      'focus',
    ],

    cardPool: {
      1: ['holy_strike', 'illuminate', 'smite', 'holy_nova', 'radiant_touch', 'focus'],
      2: ['solar_beam', 'consecrate', 'blinding_flash'],
      3: ['light_of_ruin', 'divine_judgment', 'valor'],
      4: ['ascension', 'celestial_ward'],
      5: ['genesis', 'the_last_light'],
      6: ['genesis', 'the_last_light'],
    },
  },

  vesperkin: {
    id: 'vesperkin',
    type: CreatureType.LIGHT,
    starter: false,
    baseHp: 31,
    hpPerLevel: 5,
    passiveTags: ['radiance', 'control', 'blind'],
    description: 'Control Light. Blinding Flash and Light of Ruin stack Blind on both enemies, then Radiance bursts finish.',

    stages: {
      baby: {
        name: 'Vesperkin',
        description: 'A twilight creature balanced between light and dark. Its glow blinds before it strikes.',
        armorClass: 9,
        stats: { strength: 11, dexterity: 13, intelligence: 16, constitution: 12, wisdom: 15 },
      },
      adult: {
        name: 'Dusklight',
        description: 'The blinding is now industrial. Enemies with Blind (4) barely ever land hits.',
        armorClass: 13,
        stats: { strength: 12, dexterity: 14, intelligence: 18, constitution: 13, wisdom: 17 },
      },
      elder: {
        name: 'Eclipsar',
        description: 'Ironic for a Light creature, but it wins by making everything dark. Then Divine Judgment.',
        armorClass: 14,
        stats: { strength: 13, dexterity: 15, intelligence: 20, constitution: 14, wisdom: 19 },
      },
    },

    starterDeck: [
      'blinding_flash', 'blinding_flash',
      'illuminate', 'illuminate',
      'holy_strike', 'holy_strike',
      'smite', 'smite',
      'purify',
      'focus',
    ],

    cardPool: {
      1: ['blinding_flash', 'illuminate', 'holy_strike', 'smite', 'purify', 'focus'],
      2: ['solar_beam', 'consecrate', 'valor'],
      3: ['light_of_ruin', 'celestial_ward', 'benediction'],
      4: ['divine_judgment', 'ascension'],
      5: ['genesis', 'the_last_light'],
      6: ['the_last_light', 'genesis'],
    },
  },
};


// ============================================================
//  MASTER EXPORTS
// ============================================================

export const CREATURE_DEFS = {
  ...FIRE_CREATURES,
  ...WATER_CREATURES,
  ...EARTH_CREATURES,
  ...WIND_CREATURES,
  ...SHADOW_CREATURES,
  ...LIGHT_CREATURES,
};

export const STARTER_CREATURES = Object.values(CREATURE_DEFS)
  .filter(c => c.starter)
  .reduce((acc, c) => ({ ...acc, [c.id]: c }), {});

export const CATCH_POOL = Object.values(CREATURE_DEFS)
  .filter(c => !c.starter)
  .reduce((acc, c) => ({ ...acc, [c.id]: c }), {});

export default CREATURE_DEFS;
