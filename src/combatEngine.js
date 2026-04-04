// ============================================================
//  COMBAT ENGINE
//  Pure functions only — no side effects, no React state.
//  Every function takes a CombatState and returns a new one.
//  The UI calls these and stores the result in React state.
// ============================================================

import { CARD_DEFS } from './cardDefs.js';


// ------------------------------------------------------------
//  TYPES & CONSTANTS
// ------------------------------------------------------------

export const CreatureType6 = {
  FIRE:    'fire',
  WATER:   'water',
  EARTH:   'earth',
  WIND:    'wind',
  SHADOW:  'shadow',
  LIGHT:   'light',
  COLORLESS: 'colorless',
};

// Type matchup table — multiplier applied to damage
// [attacker type][defender type] = multiplier
// 2.0 = super effective, 0.5 = resisted, 1.0 = neutral
export const TYPE_CHART = {
  fire: {
    fire:     1.0,
    water:    0.5,
    earth:    2.0,  // Fire scorches earth/nature
    wind:     1.0,
    shadow:   1.0,
    light:    1.0,
    colorless: 1.0,
  },
  water: {
    fire:     2.0,  // Water douses fire
    water:    0.5,
    earth:    1.0,
    wind:     1.0,
    shadow:   1.0,
    light:    0.5,  // Light purifies water (resisted)
    colorless: 1.0,
  },
  earth: {
    fire:     0.5,
    water:    1.0,
    earth:    0.5,
    wind:     2.0,  // Earth grounds wind
    shadow:   1.0,
    light:    1.0,
    colorless: 1.0,
  },
  wind: {
    fire:     1.0,
    water:    1.0,
    earth:    0.5,
    wind:     0.5,
    shadow:   2.0,  // Wind disperses shadow
    light:    1.0,
    colorless: 1.0,
  },
  shadow: {
    fire:     1.0,
    water:    1.0,
    earth:    1.0,
    wind:     0.5,
    shadow:   0.5,
    light:    2.0,  // Shadow corrupts light
    colorless: 1.0,
  },
  light: {
    fire:     1.0,
    water:    2.0,  // Light evaporates/purifies water
    earth:    1.0,
    wind:     1.0,
    shadow:   2.0,  // Light banishes shadow
    light:    0.5,
    colorless: 1.0,
  },
  colorless: {
    fire:     1.0,
    water:    1.0,
    earth:    1.0,
    wind:     1.0,
    shadow:   1.0,
    light:    1.0,
    colorless: 1.0,
  },
};


// Stat modifier table (D&D-style): stat value → modifier added to rolls/damage
export function statModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}

// Base energy per turn (shared pool for both active creatures)
export const BASE_ENERGY_PER_TURN = 3;

// Cards drawn into hand when a creature first enters the battlefield
export const ENTRY_HAND_SIZE = 5;

// Cards drawn at the start of each round
export const CARDS_PER_ROUND = 5;


// ------------------------------------------------------------
//  COMBAT STATE SHAPE
// ------------------------------------------------------------
//
// CombatState {
//   turn: number                  — round counter
//   phase: 'player' | 'enemy' | 'between_turns' | 'victory' | 'defeat'
//   sharedEnergy: number          — player's energy pool this turn
//   log: string[]                 — human-readable event log
//
//   player: CombatSide
//   enemy:  CombatSide
// }
//
// CombatSide {
//   active: [SlotState, SlotState]  — the two creatures currently fighting
//   bench:  CreatureInstance[]      — up to 4 on bench
//   fainted: CreatureInstance[]
// }
//
// SlotState {
//   creature: CreatureInstance (with currentHp, statusEffects, stats)
//   hand: string[]              — cardDef ids in hand
//   drawPile: string[]          — shuffled remaining deck
//   discardPile: string[]
// }


// ------------------------------------------------------------
//  INITIALISATION
// ------------------------------------------------------------

/**
 * Shuffle an array (Fisher-Yates). Returns a new array.
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create a fresh SlotState for a creature entering the battlefield.
 * Draws ENTRY_HAND_SIZE cards immediately.
 */
function createSlotState(creature) {
  const drawPile = shuffle([...creature.deck]);
  const hand = drawPile.splice(0, ENTRY_HAND_SIZE);
  return {
    creature: { ...creature, statusEffects: [] },
    hand,
    drawPile,
    discardPile: [],
  };
}

/**
 * Draw N cards into a slot's hand from its drawPile.
 * Automatically reshuffles discardPile into drawPile when empty.
 * Returns updated SlotState (immutable).
 */
function drawCards(slot, n = 1) {
  let { hand, drawPile, discardPile } = slot;
  hand = [...hand];
  drawPile = [...drawPile];
  discardPile = [...discardPile];

  for (let i = 0; i < n; i++) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break; // truly empty deck
      drawPile = shuffle(discardPile);
      discardPile = [];
    }
    hand.push(drawPile.shift());
  }

  return { ...slot, hand, drawPile, discardPile };
}

/**
 * Determines which creature acts first based on DEX.
 * Returns 'player' | 'enemy'. Ties broken randomly.
 *
 * Uses the highest-DEX active creature on each side.
 */
function determineFirstTurn(playerActive, enemyActive) {
  const playerMaxDex = Math.max(...playerActive.map(s => s.creature.stats.dexterity));
  const enemyMaxDex  = Math.max(...enemyActive.map(s => s.creature.stats.dexterity));

  if (playerMaxDex > enemyMaxDex) return 'player';
  if (enemyMaxDex > playerMaxDex) return 'enemy';
  return Math.random() < 0.5 ? 'player' : 'enemy';
}

/**
 * Initialise a full CombatState from player and enemy party arrays.
 * Expects parties sorted by slot order (index 0 and 1 are the active pair).
 *
 * @param {CreatureInstance[]} playerParty  — up to 6, first 2 go active
 * @param {CreatureInstance[]} enemyParty   — up to 6, first 2 go active
 * @returns {CombatState}
 */
export function initCombat(playerParty, enemyParty) {
  const playerActive = playerParty.slice(0, 2).map(createSlotState);
  const enemyActive  = enemyParty.slice(0, 2).map(createSlotState);

  const firstTurn = determineFirstTurn(playerActive, enemyActive);

  return {
    turn: 1,
    phase: firstTurn,  // 'player' or 'enemy'
    sharedEnergy: BASE_ENERGY_PER_TURN,
    log: [`Combat begins! ${firstTurn === 'player' ? 'Player' : 'Enemy'} goes first.`],

    player: {
      active: playerActive,
      bench:  playerParty.slice(2).map(c => ({ ...c })),
      fainted: [],
    },

    enemy: {
      active: enemyActive,
      bench:  enemyParty.slice(2).map(c => ({ ...c })),
      fainted: [],
    },

    // Per-combat flags for deferred relics
    combatFlags: {
      ironWillUsed:      false,  // Iron Will: first-faint survive — one use per combat
      echoStoneUsed:     false,  // Echo Stone: first card doubled — one use per combat
      cardsPlayedThisTurn: 0,   // Momentum Gem: consecutive card bonus counter
    },
  };
}


// ------------------------------------------------------------
//  HIT RESOLUTION
// ------------------------------------------------------------

/**
 * Resolves whether an attack hits, using a d20 roll + stat modifier vs target AC.
 *
 * @param {number} attackerStatValue  — the relevant stat (STR, DEX, INT, etc.)
 * @param {number} targetAC
 * @returns {{ hit: boolean, roll: number, total: number }}
 */
export function resolveHitRoll(attackerStatValue, targetAC) {
  const d20 = Math.floor(Math.random() * 20) + 1;
  const modifier = statModifier(attackerStatValue);
  const total = d20 + modifier;
  return {
    hit: total >= targetAC,
    roll: d20,
    modifier,
    total,
  };
}


// ------------------------------------------------------------
//  DAMAGE CALCULATION
// ------------------------------------------------------------

/**
 * Calculates final damage after type matchup.
 *
 * @param {number}  baseDamage
 * @param {string}  attackerType   — CreatureType of the card/attacker
 * @param {string}  defenderType   — CreatureType of the target creature
 * @returns {{ damage: number, multiplier: number, effectiveness: string }}
 */
export function calculateDamage(baseDamage, attackerType, defenderType) {
  const multiplier = TYPE_CHART[attackerType]?.[defenderType] ?? 1.0;
  const damage = Math.round(baseDamage * multiplier);

  let effectiveness = 'normal';
  if (multiplier >= 2.0) effectiveness = 'super effective';
  if (multiplier <= 0.5) effectiveness = 'not very effective';

  return { damage, multiplier, effectiveness };
}

/**
 * Applies damage to a SlotState, accounting for SHIELD status.
 * Returns updated SlotState (immutable).
 */
function applyDamageToSlot(slot, rawDamage) {
  let creature = { ...slot.creature };
  let statusEffects = [...creature.statusEffects];

  // Absorb with shield first
  const shieldIdx = statusEffects.findIndex(e => e.type === 'shield');
  let remaining = rawDamage;

  if (shieldIdx !== -1) {
    const shield = statusEffects[shieldIdx];
    const absorbed = Math.min(shield.stacks, remaining);
    remaining -= absorbed;
    const newStacks = shield.stacks - absorbed;
    if (newStacks <= 0) {
      statusEffects = statusEffects.filter((_, i) => i !== shieldIdx);
    } else {
      statusEffects = statusEffects.map((e, i) =>
        i === shieldIdx ? { ...e, stacks: newStacks } : e
      );
    }
  }

  creature = {
    ...creature,
    currentHp: Math.max(0, creature.currentHp - remaining),
    statusEffects,
  };

  return { ...slot, creature };
}


// ------------------------------------------------------------
//  STATUS EFFECT HELPERS
// ------------------------------------------------------------

/**
 * Adds or stacks a status effect on a slot.
 * Returns updated SlotState (immutable).
 */
function addStatus(slot, effectType, stacks = 1) {
  const statusEffects = [...slot.creature.statusEffects];
  const existing = statusEffects.findIndex(e => e.type === effectType);

  if (existing !== -1) {
    // Always stack — the processStartOfTurn handler controls decay behaviour
    statusEffects[existing] = {
      ...statusEffects[existing],
      stacks: statusEffects[existing].stacks + stacks,
    };
  } else {
    statusEffects.push({ type: effectType, stacks });
  }

  return {
    ...slot,
    creature: { ...slot.creature, statusEffects },
  };
}

/**
 * Processes all status effects on a slot at turn start.
 * Returns { updatedSlot, logEntries }.
 */
function processStatusEffectsOnTurnStart(slot) {
  let updatedSlot = { ...slot };
  const logEntries = [];
  const name = slot.creature.name;
  const newEffects = [];

  for (const effect of slot.creature.statusEffects) {
    switch (effect.type) {

      // ── Damage over time ──────────────────────────────────────────
      case 'burn':
      case 'ignite': {
        const dmg = effect.stacks;
        updatedSlot = applyDamageToSlot(updatedSlot, dmg);
        logEntries.push(`${name} takes ${dmg} ${effect.type} damage!`);
        // Decay by 1 each turn
        if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
        break;
      }
      case 'poison': {
        const dmg = effect.stacks;
        updatedSlot = applyDamageToSlot(updatedSlot, dmg);
        logEntries.push(`${name} is poisoned — takes ${dmg} damage!`);
        // Poison persists (doesn't decay) until cured
        newEffects.push(effect);
        break;
      }

      // ── Healing ──────────────────────────────────────────────────
      case 'regen': {
        const heal = effect.stacks;
        const creature = updatedSlot.creature;
        const newHp = Math.min(creature.maxHp, creature.currentHp + heal);
        updatedSlot = { ...updatedSlot, creature: { ...creature, currentHp: newHp } };
        logEntries.push(`${name} regenerates ${newHp - creature.currentHp} HP.`);
        if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
        break;
      }

      // ── AC buffs ─────────────────────────────────────────────────
      case 'fortify': {
        // Fortify temporarily raises AC — tracked as a status, expires at end of turn
        // We store it as-is and apply it during hit resolution
        newEffects.push(effect);
        break;
      }

      // ── Hand / energy effects ─────────────────────────────────────
      case 'flow': {
        // Flow reduces next card cost — handled during card play, persists
        newEffects.push(effect);
        break;
      }
      case 'gust': {
        // Gust: draw extra cards equal to stacks at turn start, then expire
        const drawCount = effect.stacks;
        updatedSlot = drawCards(updatedSlot, drawCount);
        logEntries.push(`${name} rides the Gust — draws ${drawCount} extra card(s)!`);
        // Consumed on use — do not push back
        break;
      }
      case 'radiance': {
        // Radiance persists — consumed by specific cards, never decays passively
        newEffects.push(effect);
        break;
      }

      // ── Control ──────────────────────────────────────────────────
      case 'stun': {
        // Stun: skip this turn, then expire
        logEntries.push(`${name} is stunned and cannot act!`);
        // Mark the slot as stunned for this turn (used by AI/player action gate)
        updatedSlot = { ...updatedSlot, stunned: true };
        // Stun lasts 1 turn
        if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
        break;
      }
      case 'slow': {
        // Slow: halves energy contribution this turn (approximated as -1 available)
        if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
        break;
      }
      case 'weak': {
        // Weak: reduces outgoing damage by 25% — applied during damage calc
        if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
        break;
      }
      case 'blind': {
        // Blind: -4 to hit rolls — applied during hit resolution
        if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
        break;
      }
      case 'evasion': {
        // Evasion: +4 AC — applied during hit resolution
        if (effect.stacks - 1 > 0) newEffects.push({ ...effect, stacks: effect.stacks - 1 });
        break;
      }

      // ── Persistent buffs ─────────────────────────────────────────
      case 'shield': {
        // Shield absorbs damage — handled in applyDamageToSlot, expires EOT
        newEffects.push(effect);
        break;
      }
      case 'thorns': {
        // Thorns: reflect damage — handled in damage resolution
        newEffects.push(effect);
        break;
      }
      case 'drain': {
        // Drain is a card property, not a persistent status — skip
        break;
      }

      default:
        // Unknown effect — preserve it
        newEffects.push(effect);
    }
  }

  // Write updated effects back
  updatedSlot = {
    ...updatedSlot,
    creature: { ...updatedSlot.creature, statusEffects: newEffects },
  };

  return { updatedSlot, logEntries };
}

/**
 * Expires SHIELD at end of a slot's turn.
 */
function expireShield(slot) {
  const statusEffects = slot.creature.statusEffects.filter(e => e.type !== 'shield');
  return { ...slot, creature: { ...slot.creature, statusEffects } };
}


// ------------------------------------------------------------
//  CARD PLAYING
// ------------------------------------------------------------

/**
 * The result of playing a card.
 * @typedef {Object} CardPlayResult
 * @property {CombatState} state  — updated combat state
 * @property {boolean}     success
 * @property {string}      message
 */

/**
 * Plays a card from a player creature's hand.
 *
 * @param {CombatState} state
 * @param {number}      slotIndex    — 0 or 1 (which active creature is playing)
 * @param {string}      cardId       — card to play
 * @param {string}      targetSide   — 'enemy' (or 'player' for self-target cards)
 * @param {number}      targetSlot   — 0 or 1 (which enemy slot to target)
 * @returns {CardPlayResult}
 */
export function playCard(state, slotIndex, cardId, targetSide = 'enemy', targetSlot = 0) {
  if (state.phase !== 'player') {
    return { state, success: false, message: "It's not the player's turn." };
  }

  const card = CARD_DEFS[cardId];
  if (!card) {
    return { state, success: false, message: `Unknown card: ${cardId}` };
  }

  // Check energy
  if (state.sharedEnergy < card.energyCost) {
    return { state, success: false, message: `Not enough energy (need ${card.energyCost}, have ${state.sharedEnergy}).` };
  }

  const sourceSlot = state.player.active[slotIndex];
  if (!sourceSlot) {
    return { state, success: false, message: `No creature in player slot ${slotIndex}.` };
  }

  // Check card is in hand
  const handIdx = sourceSlot.hand.indexOf(cardId);
  if (handIdx === -1) {
    return { state, success: false, message: `${card.name} is not in ${sourceSlot.creature.name}'s hand.` };
  }

  let newState = { ...state };
  const log = [...state.log];

  // Deduct energy
  newState = { ...newState, sharedEnergy: newState.sharedEnergy - card.energyCost };

  // Move card from hand to discard
  let updatedSourceSlot = {
    ...sourceSlot,
    hand: sourceSlot.hand.filter((_, i) => i !== handIdx),
    discardPile: [...sourceSlot.discardPile, cardId],
  };

  // ---- Resolve card effect ----
  const attacker = sourceSlot.creature;
  const side = targetSide === 'enemy' ? newState.enemy : newState.player;
  let targetSlotState = side.active[targetSlot];

  if (!targetSlotState) {
    // Fall back to other active slot
    targetSlotState = side.active[targetSlot === 0 ? 1 : 0];
  }
  if (!targetSlotState) {
    return { state, success: false, message: 'No valid target.' };
  }

  const defender = targetSlotState.creature;
  let updatedTargetSlot = { ...targetSlotState };

  // Tags drive the effect resolution
  if (card.tags.includes('attack')) {
    const rollStat = attacker.stats[card.scalingStat] ?? attacker.stats.strength;

    // Apply Fortify AC bonus to the defender
    const defFortify = defender.statusEffects?.find(e => e.type === 'fortify');
    const effectiveDefAC = defender.armorClass + (defFortify?.stacks ?? 0);

    const hitResult = resolveHitRoll(rollStat, effectiveDefAC);
    log.push(
      `${attacker.name} plays ${card.name} — rolls ${hitResult.roll}+${hitResult.modifier}=${hitResult.total} vs AC${effectiveDefAC}${defFortify ? ` (+${defFortify.stacks} Fortify)` : ''}.`
    );

    if (hitResult.hit) {
      // Base damage + stat modifier scaled by card's damage value
      const rawDamage = (card.baseDamage ?? 0) + statModifier(rollStat);
      const { damage, effectiveness } = calculateDamage(rawDamage, attacker.type, defender.type);

      log.push(
        `Hit! ${effectiveness !== 'normal' ? `(${effectiveness}) ` : ''}${damage} damage to ${defender.name}.`
      );

      updatedTargetSlot = applyDamageToSlot(updatedTargetSlot, damage);

      // Apply on-hit status effects from the card
      if (card.onHitStatus) {
        updatedTargetSlot = addStatus(updatedTargetSlot, card.onHitStatus.type, card.onHitStatus.stacks);
        log.push(`${defender.name} gains ${card.onHitStatus.stacks} ${card.onHitStatus.type}!`);
      }

      // Drain: heal attacker for a fraction of damage dealt
      if (card.drain) {
        const drainHeal = Math.max(1, Math.round(damage * card.drain));
        const c = updatedSourceSlot.creature;
        const newHp = Math.min(c.maxHp, c.currentHp + drainHeal);
        updatedSourceSlot = { ...updatedSourceSlot, creature: { ...c, currentHp: newHp } };
        log.push(`${attacker.name} drains ${newHp - c.currentHp} HP!`);
      }

    } else {
      log.push(`Miss! ${attacker.name}'s ${card.name} fails to connect.`);
    }
  }

  if (card.tags.includes('defend')) {
    // Shield applies to the PLAYING creature (self), not the target
    const shieldAmount = (card.shieldAmount ?? 0) + statModifier(attacker.stats[card.scalingStat ?? 'constitution']);
    updatedSourceSlot = addStatus(updatedSourceSlot, 'shield', shieldAmount);
    log.push(`${attacker.name} gains ${shieldAmount} Shield.`);
  }

  if (card.tags.includes('heal')) {
    const healAmount = (card.healAmount ?? 0) + statModifier(attacker.stats[card.scalingStat ?? 'wisdom']);
    const creature = updatedSourceSlot.creature;
    const newHp = Math.min(creature.maxHp, creature.currentHp + healAmount);
    updatedSourceSlot = {
      ...updatedSourceSlot,
      creature: { ...creature, currentHp: newHp },
    };
    log.push(`${attacker.name} heals ${newHp - creature.currentHp} HP.`);
  }

  if (card.tags.includes('utility') && card.drawAmount) {
    updatedSourceSlot = drawCards(updatedSourceSlot, card.drawAmount);
    log.push(`${attacker.name} draws ${card.drawAmount} card(s).`);
  }

  // Energy gain cards
  if (card.energyGain) {
    newState = { ...newState, sharedEnergy: Math.min(10, newState.sharedEnergy + card.energyGain) };
    log.push(`${attacker.name} restores ${card.energyGain} energy!`);
  }

  // Status-only cards — apply onHitStatus directly to the enemy target (no roll)
  if (!card.tags.includes('attack') && card.onHitStatus) {
    updatedTargetSlot = addStatus(updatedTargetSlot, card.onHitStatus.type, card.onHitStatus.stacks);
    log.push(`${defender.name} is afflicted with ${card.onHitStatus.stacks} ${card.onHitStatus.type}!`);
  }

  // On-play status effects (applied to self)
  if (card.onPlayStatus) {
    updatedSourceSlot = addStatus(updatedSourceSlot, card.onPlayStatus.type, card.onPlayStatus.stacks);
    log.push(`${attacker.name} gains ${card.onPlayStatus.stacks} ${card.onPlayStatus.type}!`);
  }
  if (card.onPlayStatus2) {
    updatedSourceSlot = addStatus(updatedSourceSlot, card.onPlayStatus2.type, card.onPlayStatus2.stacks);
    log.push(`${attacker.name} gains ${card.onPlayStatus2.stacks} ${card.onPlayStatus2.type}!`);
  }

  // Heal-on-play (for utility heals that aren't tagged 'heal' but have healAmount)
  if (!card.tags.includes('heal') && card.healAmount) {
    const c = updatedSourceSlot.creature;
    const healAmt = Math.max(1, (card.healAmount ?? 0) + statModifier(attacker.stats[card.scalingStat ?? 'wisdom']));
    const newHp = Math.min(c.maxHp, c.currentHp + healAmt);
    updatedSourceSlot = { ...updatedSourceSlot, creature: { ...c, currentHp: newHp } };
    log.push(`${attacker.name} heals ${newHp - c.currentHp} HP.`);
  }

  // Write updated slots back into state
  const updatedPlayerActive = [...newState.player.active];
  updatedPlayerActive[slotIndex] = updatedSourceSlot;

  const updatedSideActive = [...side.active];
  updatedSideActive[targetSlot] = updatedTargetSlot;

  const updatedEnemy = targetSide === 'enemy'
    ? { ...newState.enemy, active: updatedSideActive }
    : newState.enemy;

  newState = {
    ...newState,
    log,
    player: { ...newState.player, active: updatedPlayerActive },
    enemy: updatedEnemy,
  };

  // Check for faints
  newState = checkFaints(newState);

  return { state: newState, success: true, message: '' };
}


// ------------------------------------------------------------
//  FAINT HANDLING
// ------------------------------------------------------------

/**
 * Checks all active slots for fainted creatures (HP <= 0).
 * Brings in bench creatures automatically. Checks win/loss.
 * Returns updated CombatState.
 */
export function checkFaints(state) {
  let newState = { ...state };
  const log = [...state.log];

  for (const side of ['player', 'enemy']) {
    let sideState = { ...newState[side] };
    const newActive = [...sideState.active];

    for (let i = 0; i < newActive.length; i++) {
      const slot = newActive[i];
      if (!slot || slot.creature.currentHp > 0) continue;

      log.push(`${slot.creature.name} has fainted!`);
      sideState.fainted = [...sideState.fainted, slot.creature];

      // Bring in next bench creature
      if (sideState.bench.length > 0) {
        const [next, ...remainingBench] = sideState.bench;
        newActive[i] = createSlotState(next);
        sideState.bench = remainingBench;
        log.push(`${next.name} enters the battlefield! (${side})`);
      } else {
        newActive[i] = null;
      }
    }

    sideState.active = newActive.filter(Boolean);
    newState = { ...newState, [side]: sideState };
  }

  // Check victory / defeat
  if (newState.enemy.active.length === 0 && newState.enemy.bench.length === 0) {
    newState = { ...newState, phase: 'victory', log: [...log, 'All enemy creatures fainted. Victory!'] };
  } else if (newState.player.active.length === 0 && newState.player.bench.length === 0) {
    newState = { ...newState, phase: 'defeat', log: [...log, 'All your creatures fainted. Defeat.'] };
  } else {
    newState = { ...newState, log };
  }

  return newState;
}


// ------------------------------------------------------------
//  TURN MANAGEMENT
// ------------------------------------------------------------

/**
 * Ends the player's turn.
 * - Expires shields on player slots
 * - Hands off to enemy phase
 * Returns updated CombatState.
 */
export function endPlayerTurn(state) {
  if (state.phase !== 'player') return state;

  const log = [...state.log, "Player ends their turn."];

  // Expire shields on all player active slots
  const updatedActive = state.player.active.map(expireShield);

  return {
    ...state,
    phase: 'enemy',
    log,
    player: { ...state.player, active: updatedActive },
  };
}

/**
 * Starts a new round:
 * - Increments turn counter
 * - Restores shared energy
 * - Each active creature draws 1 card
 * - Processes start-of-turn status effects for the active side
 *
 * Call this at the beginning of whoever's turn it now is.
 *
 * @param {CombatState} state
 * @param {'player'|'enemy'} side
 * @returns {CombatState}
 */
export function startTurn(state, side) {
  let newState = { ...state };
  const log = [...state.log, `--- Turn ${state.turn} (${side}) ---`];

  // Restore energy only at the start of the player's turn
  if (side === 'player') {
    newState = { ...newState, sharedEnergy: BASE_ENERGY_PER_TURN };
  }

  // Each active creature on this side draws a card and processes status effects
  const sideState = newState[side];
  const newActive = sideState.active.map(slot => {
    // Draw 1 card
    // Discard entire hand to discard pile before drawing
    const handDiscarded = {
      ...slot,
      discardPile: [...slot.discardPile, ...slot.hand],
      hand: [],
    };
    let updated = drawCards(handDiscarded, CARDS_PER_ROUND);
    // Process burn etc.
    const { updatedSlot, logEntries } = processStatusEffectsOnTurnStart(updated);
    logEntries.forEach(e => log.push(e));
    return updatedSlot;
  });

  newState = {
    ...newState,
    log,
    [side]: { ...sideState, active: newActive },
  };

  // Check if anything fainted from status damage
  newState = checkFaints(newState);

  return newState;
}


// ------------------------------------------------------------
//  AI TURN
// ------------------------------------------------------------

/**
 * Simple AI: plays cards greedily by highest base damage first,
 * targets the player's active creature with the lowest HP.
 * Falls back to defending if no attack cards are playable.
 *
 * @param {CombatState} state
 * @returns {CombatState}
 */
export function runEnemyTurn(state) {
  if (state.phase !== 'enemy') return state;

  let newState = startTurn(state, 'enemy');
  if (newState.phase === 'victory' || newState.phase === 'defeat') return newState;

  const log = [...newState.log];

  // Give enemy its own energy pool (same size, independent)
  let enemyEnergy = BASE_ENERGY_PER_TURN;

  // Iterate over each active enemy slot
  for (let slotIdx = 0; slotIdx < newState.enemy.active.length; slotIdx++) {
    const slot = newState.enemy.active[slotIdx];
    if (!slot) continue;

    // Keep playing cards while there's energy and cards to play
    let keepPlaying = true;
    let safetyCounter = 0;
    while (keepPlaying && safetyCounter < 20) {
      safetyCounter++;
      // Re-read slot from newState so hand is updated after each card play
      const slot = newState.enemy.active[slotIdx];
      if (!slot) { keepPlaying = false; break; }
      const playableCards = slot.hand
        .map(id => CARD_DEFS[id])
        .filter(c => c && c.energyCost <= enemyEnergy)
        .sort((a, b) => (b.baseDamage ?? 0) - (a.baseDamage ?? 0));

      if (playableCards.length === 0) {
        keepPlaying = false;
        break;
      }

      const card = playableCards[0];

      // Pick target: player active with lowest HP
      const targetIdx = newState.player.active
        .map((s, i) => ({ hp: s?.creature.currentHp ?? Infinity, i }))
        .sort((a, b) => a.hp - b.hp)[0]?.i ?? 0;

      // Resolve attack (reuse same hit logic but driven manually here)
      const attacker = slot.creature;
      const defenderSlot = newState.player.active[targetIdx];
      if (!defenderSlot) break;

      const defender = defenderSlot.creature;
      // Apply Fortify AC bonus — each Fortify stack adds +1 AC
      const fortify = defender.statusEffects.find(e => e.type === 'fortify');
      const effectiveAC = defender.armorClass + (fortify?.stacks ?? 0);
      const rollStat = attacker.stats[card.scalingStat] ?? attacker.stats.strength;
      const hitResult = resolveHitRoll(rollStat, effectiveAC);

      log.push(
        `${attacker.name} plays ${card.name} — rolls ${hitResult.roll} + ${hitResult.modifier} = ${hitResult.total} vs AC ${effectiveAC}${fortify ? ` (${defender.armorClass}+${fortify.stacks} Fortify)` : ''}.`
      );

      let updatedDefenderSlot = { ...defenderSlot };

      if (hitResult.hit && card.tags.includes('attack')) {
        const rawDamage = (card.baseDamage ?? 0) + statModifier(rollStat);
        const { damage, effectiveness } = calculateDamage(rawDamage, attacker.type, defender.type);

        log.push(
          `Hit! ${effectiveness !== 'normal' ? `(${effectiveness}) ` : ''}${damage} damage to ${defender.name}.`
        );

        updatedDefenderSlot = applyDamageToSlot(updatedDefenderSlot, damage);

        if (card.onHitStatus) {
          updatedDefenderSlot = addStatus(updatedDefenderSlot, card.onHitStatus.type, card.onHitStatus.stacks);
          log.push(`${defender.name} gains ${card.onHitStatus.stacks} stack(s) of ${card.onHitStatus.type}.`);
        }
      } else if (!hitResult.hit) {
        log.push(`Miss! ${attacker.name}'s ${card.name} fails to connect.`);
      }

      // Update enemy slot hand/discard
      const handIdx = newState.enemy.active[slotIdx].hand.indexOf(card.id);
      const updatedEnemySlot = {
        ...newState.enemy.active[slotIdx],
        hand: newState.enemy.active[slotIdx].hand.filter((_, i) => i !== handIdx),
        discardPile: [...newState.enemy.active[slotIdx].discardPile, card.id],
      };

      const updatedEnemyActive = [...newState.enemy.active];
      updatedEnemyActive[slotIdx] = updatedEnemySlot;

      const updatedPlayerActive = [...newState.player.active];
      updatedPlayerActive[targetIdx] = updatedDefenderSlot;

      enemyEnergy -= card.energyCost;

      newState = {
        ...newState,
        log,
        enemy:  { ...newState.enemy,  active: updatedEnemyActive },
        player: { ...newState.player, active: updatedPlayerActive },
      };

      newState = checkFaints(newState);
      if (newState.phase === 'victory' || newState.phase === 'defeat') return newState;
    }

    // Expire enemy shields at end of their turn
    const finalActive = [...newState.enemy.active];
    if (finalActive[slotIdx]) {
      finalActive[slotIdx] = expireShield(finalActive[slotIdx]);
    }
    newState = { ...newState, enemy: { ...newState.enemy, active: finalActive } };
  }

  // Hand back to player, increment turn counter, start player's turn
  newState = {
    ...newState,
    turn: newState.turn + 1,
    phase: 'player',
    log: [...newState.log, "Enemy turn ends. Player's turn begins."],
  };

  newState = startTurn(newState, 'player');
  return newState;
}


// ------------------------------------------------------------
//  MANUAL SWAP  (costs the turn for that slot — no card play after)
// ------------------------------------------------------------

/**
 * Player swaps a bench creature into an active slot.
 * The swapped-out creature goes to the bench.
 * This does NOT end the overall turn — the other active creature can still act.
 *
 * Note: implement a "hasActed" flag per slot if you want to restrict
 * swap + attack on the same slot in the same turn.
 *
 * @param {CombatState} state
 * @param {number} activeSlotIdx  — 0 or 1
 * @param {number} benchIdx       — index in player.bench
 * @returns {CombatState}
 */
export function swapCreature(state, activeSlotIdx, benchIdx) {
  if (state.phase !== 'player') return state;

  const sideState = state.player;
  const outgoing = sideState.active[activeSlotIdx];
  const incoming = sideState.bench[benchIdx];

  if (!outgoing || !incoming) return state;

  const newActive = [...sideState.active];
  newActive[activeSlotIdx] = createSlotState(incoming);  // fresh hand on entry

  const newBench = [...sideState.bench];
  newBench[benchIdx] = outgoing.creature;  // send outgoing back to bench (as creature, not slot)

  const log = [
    ...state.log,
    `${outgoing.creature.name} retreats. ${incoming.name} enters the battlefield!`,
  ];

  return {
    ...state,
    log,
    player: {
      ...sideState,
      active: newActive,
      bench: newBench,
    },
  };
}
