// ============================================================
//  relicEngine.js
//  Pure relic effect definitions.
//  Each relic has hooks that fire at specific combat moments.
//  All functions are pure — they take state and return new state.
//
//  HOOKS:
//    onCombatStart(combatState, relicId) → combatState
//    onAttackDamage(damage, card, attacker, relicId) → number
//    onHitRoll(roll, card, attacker, relicId) → number
//    onTurnStart(combatState, relicId) → combatState
//    onVictory(runState, relicId) → runState   (gold bonuses etc.)
// ============================================================

import { addGold } from "./mapGenerator.js";

// ─── STATUS HELPERS ──────────────────────────────────────────

function addStatus(slot, type, stacks) {
  const effects = [...slot.creature.statusEffects];
  const idx = effects.findIndex(e => e.type === type);
  if (idx !== -1) {
    effects[idx] = { ...effects[idx], stacks: effects[idx].stacks + stacks };
  } else {
    effects.push({ type, stacks });
  }
  return { ...slot, creature: { ...slot.creature, statusEffects: effects } };
}

function addStatusToAllActive(combatState, side, type, stacks) {
  const newActive = combatState[side].active.map(slot => addStatus(slot, type, stacks));
  return { ...combatState, [side]: { ...combatState[side], active: newActive } };
}

// ─── RELIC DEFINITIONS ───────────────────────────────────────
//
// Each entry: { id, name, hooks: { ... } }
// All hooks are optional — only define what the relic needs.

export const RELIC_DEFS = {

  // ── TYPE RELICS ────────────────────────────────────────────

  ember_core: {
    id:   "ember_core",
    name: "Ember Core",
    desc: "Fire cards deal +2 damage.",
    // Applied in damage calculation
    onAttackDamage(damage, card) {
      return card.type === "fire" ? damage + 2 : damage;
    },
  },

  tide_stone: {
    id:   "tide_stone",
    name: "Tide Stone",
    desc: "Start each combat with 2 Flow on all Water creatures.",
    onCombatStart(combatState) {
      let s = combatState;
      s.player.active.forEach((slot, i) => {
        if (slot.creature.type === "water") {
          s = {
            ...s,
            player: {
              ...s.player,
              active: s.player.active.map((sl, j) =>
                j === i ? addStatus(sl, "flow", 2) : sl
              ),
            },
          };
        }
      });
      return s;
    },
  },

  iron_shell: {
    id:   "iron_shell",
    name: "Iron Shell",
    desc: "Start each combat with 3 Fortify on all Earth creatures.",
    onCombatStart(combatState) {
      let s = combatState;
      s.player.active.forEach((slot, i) => {
        if (slot.creature.type === "earth") {
          s = {
            ...s,
            player: {
              ...s.player,
              active: s.player.active.map((sl, j) =>
                j === i ? addStatus(sl, "fortify", 3) : sl
              ),
            },
          };
        }
      });
      return s;
    },
  },

  gale_feather: {
    id:   "gale_feather",
    name: "Gale Feather",
    desc: "Draw 1 extra card at the start of each turn.",
    // Handled in CombatUI endTurn — passed as extraDraw modifier
    extraDrawPerTurn: 1,
  },

  void_shard: {
    id:   "void_shard",
    name: "Void Shard",
    desc: "Drain cards heal for +2 HP extra.",
    onDrainHeal(healAmount) {
      return healAmount + 2;
    },
  },

  dawn_crystal: {
    id:   "dawn_crystal",
    name: "Dawn Crystal",
    desc: "Start each combat with 1 Radiance on all Light creatures.",
    onCombatStart(combatState) {
      let s = combatState;
      s.player.active.forEach((slot, i) => {
        if (slot.creature.type === "light") {
          s = {
            ...s,
            player: {
              ...s.player,
              active: s.player.active.map((sl, j) =>
                j === i ? addStatus(sl, "radiance", 1) : sl
              ),
            },
          };
        }
      });
      return s;
    },
  },

  // ── COLORLESS RELICS ───────────────────────────────────────

  lucky_coin: {
    id:   "lucky_coin",
    name: "Lucky Coin",
    desc: "Gain 10 gold after every combat victory.",
    onVictory(runState) {
      return addGold(runState, 10);
    },
  },

  sharp_claw: {
    id:   "sharp_claw",
    name: "Sharp Claw",
    desc: "+1 to all attack hit rolls.",
    onHitRoll(roll) {
      return roll + 1;
    },
  },

  // ── BONUS RELICS (findable via events / elite rewards) ─────

  war_drum: {
    id:   "war_drum",
    name: "War Drum",
    desc: "Your active creatures deal +1 damage per combat turn elapsed.",
    onAttackDamage(damage, card, attacker, state) {
      const turn = state?.turn ?? 1;
      return damage + Math.min(turn - 1, 10); // cap at +10
    },
  },

  heart_stone: {
    id:   "heart_stone",
    name: "Heart Stone",
    desc: "Gain 3 Shield on all active creatures at combat start.",
    onCombatStart(combatState) {
      return addStatusToAllActive(combatState, "player", "shield", 3);
    },
  },

  thorn_bark: {
    id:   "thorn_bark",
    name: "Thorn Bark",
    desc: "All player creatures gain Thorns 1 at combat start.",
    onCombatStart(combatState) {
      return addStatusToAllActive(combatState, "player", "thorns", 1);
    },
  },

  adrenaline_shard: {
    id:   "adrenaline_shard",
    name: "Adrenaline Shard",
    desc: "Start each combat with 1 extra energy.",
    onCombatStart(combatState) {
      return { ...combatState, sharedEnergy: combatState.sharedEnergy + 1 };
    },
  },

  quick_draw: {
    id:   "quick_draw",
    name: "Quick Draw",
    desc: "Draw 1 extra card when combat starts.",
    onCombatStart(combatState) {
      // Each active slot draws 1 extra card
      const newActive = combatState.player.active.map(slot => {
        if (slot.drawPile.length === 0 && slot.discardPile.length === 0) return slot;
        const drawPile    = slot.drawPile.length > 0 ? [...slot.drawPile] : [...slot.discardPile].sort(() => Math.random() - 0.5);
        const discardPile = slot.drawPile.length > 0 ? slot.discardPile : [];
        const card = drawPile.shift();
        return { ...slot, hand:[...slot.hand, card], drawPile, discardPile };
      });
      return { ...combatState, player:{ ...combatState.player, active: newActive } };
    },
  },

  iron_will: {
    id:   "iron_will",
    name: "Iron Will",
    desc: "The first time a creature would faint each combat, survive at 1 HP instead.",
    // Tracked per-combat via a flag on creature; applied in damage handling
    grantsSurvivorFlag: true,
  },

  poison_fang: {
    id:   "poison_fang",
    name: "Poison Fang",
    desc: "Attack cards apply 1 Poison to the target on hit.",
    onHitApplyStatus: { type: "poison", stacks: 1 },
  },

  echo_stone: {
    id:   "echo_stone",
    name: "Echo Stone",
    desc: "Once per combat, the first card you play is played twice.",
    firstCardDoubled: true,
  },

  glass_cannon: {
    id:   "glass_cannon",
    name: "Glass Cannon",
    desc: "Your creatures deal +4 damage but have -10 max HP.",
    onAttackDamage(damage) { return damage + 4; },
    onCombatStart(combatState) {
      const newActive = combatState.player.active.map(slot => ({
        ...slot,
        creature: {
          ...slot.creature,
          maxHp:     Math.max(1, slot.creature.maxHp - 10),
          currentHp: Math.max(1, slot.creature.currentHp - 10),
        },
      }));
      return { ...combatState, player:{ ...combatState.player, active: newActive } };
    },
  },

  ancient_tome: {
    id:   "ancient_tome",
    name: "Ancient Tome",
    desc: "Intelligence-scaling cards deal +3 damage.",
    onAttackDamage(damage, card) {
      return card.scalingStat === "intelligence" ? damage + 3 : damage;
    },
  },

  berserker_ring: {
    id:   "berserker_ring",
    name: "Berserker Ring",
    desc: "Your creatures deal +2 damage when below 50% HP.",
    onAttackDamage(damage, card, attacker) {
      const pct = attacker.currentHp / attacker.maxHp;
      return pct < 0.5 ? damage + 2 : damage;
    },
  },

  momentum_gem: {
    id:   "momentum_gem",
    name: "Momentum Gem",
    desc: "Each consecutive card played in one turn deals +1 extra damage (stacks up to +4).",
    // Tracked per-turn in CombatUI via cardsPlayedThisTurn counter
    bonusPerConsecutive: 1,
    maxBonus: 4,
  },
};

// ─── APPLICATION HELPERS ─────────────────────────────────────

/**
 * Apply all onCombatStart hooks from owned relics.
 * Call this after initCombat() in CombatScreen.
 *
 * @param {CombatState} combatState
 * @param {string[]}    relicIds     — from run.relics
 * @returns {CombatState}
 */
export function applyRelicCombatStart(combatState, relicIds = []) {
  return relicIds.reduce((state, id) => {
    const relic = RELIC_DEFS[id];
    if (relic?.onCombatStart) {
      try { return relic.onCombatStart(state); }
      catch (e) { console.warn(`Relic ${id} onCombatStart error:`, e); }
    }
    return state;
  }, combatState);
}

/**
 * Apply all onAttackDamage hooks.
 * Call this in playOnTargetFrom before final damage is applied.
 *
 * @param {number}   baseDamage
 * @param {CardDef}  card
 * @param {CreatureInstance} attacker
 * @param {CombatState} combatState
 * @param {string[]} relicIds
 * @returns {number}
 */
export function applyRelicDamageBonus(baseDamage, card, attacker, combatState, relicIds = []) {
  return relicIds.reduce((dmg, id) => {
    const relic = RELIC_DEFS[id];
    if (relic?.onAttackDamage) {
      try { return relic.onAttackDamage(dmg, card, attacker, combatState); }
      catch (e) { console.warn(`Relic ${id} onAttackDamage error:`, e); }
    }
    return dmg;
  }, baseDamage);
}

/**
 * Apply all onHitRoll hooks.
 * Call this in resolveHitRoll before comparing to AC.
 *
 * @param {number}   baseRoll   — d20 + stat modifier
 * @param {CardDef}  card
 * @param {CreatureInstance} attacker
 * @param {string[]} relicIds
 * @returns {number}
 */
export function applyRelicHitBonus(baseRoll, card, attacker, relicIds = []) {
  return relicIds.reduce((roll, id) => {
    const relic = RELIC_DEFS[id];
    if (relic?.onHitRoll) {
      try { return relic.onHitRoll(roll, card, attacker); }
      catch (e) { console.warn(`Relic ${id} onHitRoll error:`, e); }
    }
    return roll;
  }, baseRoll);
}

/**
 * Get total extra draws per turn from relics.
 * @param {string[]} relicIds
 * @returns {number}
 */
export function getRelicExtraDraws(relicIds = []) {
  return relicIds.reduce((n, id) => {
    const relic = RELIC_DEFS[id];
    return n + (relic?.extraDrawPerTurn ?? 0);
  }, 0);
}

/**
 * Apply all onHitApplyStatus relics (e.g. Poison Fang).
 * Returns array of { type, stacks } to apply to target on hit.
 * @param {string[]} relicIds
 * @returns {{ type: string, stacks: number }[]}
 */
export function getRelicOnHitStatuses(relicIds = []) {
  return relicIds.flatMap(id => {
    const relic = RELIC_DEFS[id];
    return relic?.onHitApplyStatus ? [relic.onHitApplyStatus] : [];
  });
}

/**
 * Apply all onVictory hooks (gold bonuses, etc).
 * Call this in RunContext COMBAT_VICTORY or after victory confirmed.
 *
 * @param {RunState} runState
 * @param {string[]} relicIds
 * @returns {RunState}
 */
export function applyRelicVictory(runState, relicIds = []) {
  return relicIds.reduce((state, id) => {
    const relic = RELIC_DEFS[id];
    if (relic?.onVictory) {
      try { return relic.onVictory(state); }
      catch (e) { console.warn(`Relic ${id} onVictory error:`, e); }
    }
    return state;
  }, runState);
}

/**
 * Apply drain heal bonus from relics (Void Shard etc).
 * @param {number}   baseHeal
 * @param {string[]} relicIds
 * @returns {number}
 */
export function applyRelicDrainBonus(baseHeal, relicIds = []) {
  return relicIds.reduce((heal, id) => {
    const relic = RELIC_DEFS[id];
    if (relic?.onDrainHeal) {
      try { return relic.onDrainHeal(heal); }
      catch (e) { console.warn(`Relic ${id} onDrainHeal error:`, e); }
    }
    return heal;
  }, baseHeal);
}

// ─── RELIC DISPLAY HELPERS ───────────────────────────────────

/**
 * Returns the full relic def for a given id.
 * Falls back to a minimal stub if unknown.
 */
export function getRelicDef(relicId) {
  return RELIC_DEFS[relicId] ?? {
    id:   relicId,
    name: relicId,
    desc: "Unknown relic.",
  };
}

/**
 * Get all relic defs for a run's relic list.
 */
export function getRunRelics(relicIds = []) {
  return relicIds.map(getRelicDef);
}
