// ============================================================
//  RunContext.jsx
//  Top-level roguelike run state + dispatch.
//  Wrap your app in <RunProvider> and consume with useRun().
// ============================================================

import { createContext, useContext, useReducer, useCallback } from "react";
import {
  createNewRun, createCreatureInstance, addCardToDeck, removeCardFromDeck,
} from "./gameSchema.js";
import {
  generateFloor, advanceFloor, moveToNode, clearCurrentNode,
  getCurrentNode, isFloorComplete, enterCombat, returnToMap,
  enterReward, enterShop, applyRestAction, addGold, spendGold,
  addRelic, catchCreature, reorderParty, generateCardOffer,
  generateGoldReward, getCatchProbability, NodeType,
} from "./mapGenerator.js";
import { applyRelicVictory } from "./relicEngine.js";
import { CREATURE_DEFS, STARTER_CREATURES, awardXp } from "./creatureDefs.js";
import { CARD_DEFS } from "./cardDefs.js";
import { pickRandomEvent, getEventDef, CARD_POOLS, EVENT_RELICS } from "./eventDefs.js";

// ─── INITIAL STATE ───────────────────────────────────────────

const EMPTY_RUN = {
  runId:   null,
  party:   [],
  roster:  [],
  gold:    80,  // bumped from 50 — enough to buy 2 commons or 1 uncommon on floor 1
  relics:  [],
  map:     null,
  phase:   "title",
  pendingReward: null,
  pendingCatch:  null,
  pendingEvent:  null,        // { event, choiceId } — set when entering an event node
  seenEvents:    [],          // event ids seen this run (avoids repeats)
  _lastEventResolution: null, // { effects: [] } — read by EventScreen for display
};

// ─── REDUCER ─────────────────────────────────────────────────

function runReducer(state, action) {
  switch (action.type) {

    // ── Navigation ──────────────────────────────────────────

    case "GO_TO_STARTER_PICK":
      return { ...EMPTY_RUN, phase: "starter_pick" };

    case "START_RUN": {
      const { creatureDefId } = action;
      const def = CREATURE_DEFS[creatureDefId];
      if (!def) return state;
      const starter  = createCreatureInstance(def, 1);
      const firstMap = generateFloor(1, Object.keys(CREATURE_DEFS).filter(k => !CREATURE_DEFS[k].starter));
      return {
        ...EMPTY_RUN,
        runId:  crypto.randomUUID(),
        party:  [starter],
        roster: [starter],
        gold:   50,
        map:    firstMap,
        phase:  "map",
      };
    }

    case "MOVE_TO_NODE": {
      const newMap = moveToNode(state.map, action.nodeId);
      return { ...state, map: newMap };
    }

    case "ENTER_NODE": {
      const node = getCurrentNode(state.map);
      if (!node) return state;
      switch (node.type) {
        case NodeType.COMBAT:
        case NodeType.ELITE:
        case NodeType.BOSS:
          return enterCombat(state);
        case NodeType.SHOP:
          return enterShop(state);
        case NodeType.REST:
          return { ...state, phase: "rest" };
        case NodeType.EVENT: {
          // Pick a random event, avoiding recently seen ones
          const event = pickRandomEvent(state.seenEvents);
          return {
            ...state,
            phase: "event",
            pendingEvent: { event },
            seenEvents: [...state.seenEvents, event.id],
          };
        }
        default:
          return state;
      }
    }

    // ── Combat outcomes ──────────────────────────────────────

    case "COMBAT_VICTORY": {
      const { activeIndices, enemyPartyDef } = action;
      const node = getCurrentNode(state.map);
      const nodeType = node?.type ?? NodeType.COMBAT;
      const allDefs  = CREATURE_DEFS;

      // Award XP to party members
      const updatedParty = awardXp(state.party, activeIndices, nodeType, allDefs);

      // Generate reward
      const goldAmount = generateGoldReward(nodeType, state.map.floorNumber);
      const cardOffer  = generateCardOffer(
        nodeType, updatedParty, Object.values(CARD_DEFS), state.map.floorNumber
      );

      const clearedMap = clearCurrentNode(state.map);

      // Sync roster: replace any roster entry whose defId matches an updated party member
      const updatedRoster = state.roster.map(rc => {
        const match = updatedParty.find(pc => pc.defId === rc.defId);
        return match ?? rc;
      });

      // Build catch candidates from the enemy active slots passed in action
      // Boss nodes skip the catch phase entirely
      const enemyCreatures = action.enemyCreatures ?? [];
      const catchCandidates = nodeType !== NodeType.BOSS
        ? enemyCreatures.map(c => ({
            creature:    c,
            probability: getCatchProbability(c, nodeType),
          }))
        : [];

      const nextPhase = catchCandidates.length > 0 ? "catch" : "reward";

      // Apply victory relic effects (Lucky Coin etc.)
      const stateWithRelicGold = applyRelicVictory(
        { ...state, party: updatedParty, roster: updatedRoster },
        state.relics
      );

      return {
        ...stateWithRelicGold,
        map:           clearedMap,
        phase:         nextPhase,
        pendingReward: { cardOffer, goldAmount, activeCount: activeIndices.length },
        pendingCatch:  catchCandidates.length > 0 ? { candidates: catchCandidates, used: false } : null,
      };
    }

    case "COMBAT_DEFEAT":
      return { ...state, phase: "gameover" };

    // ── Reward screen ────────────────────────────────────────

    case "TAKE_GOLD": {
      const { amount } = action;
      return addGold({ ...state }, amount);
    }

    case "DRAFT_CARD": {
      const { cardId, creatureIndex } = action;
      const creature = state.party[creatureIndex];
      if (!creature) return state;
      try {
        const newDeck    = addCardToDeck(creature, cardId);
        const newParty   = state.party.map((c, i) => i === creatureIndex ? { ...c, deck: newDeck } : c);
        const newRoster  = state.roster.map(c => c.defId === creature.defId ? { ...c, deck: newDeck } : c);
        return { ...state, party: newParty, roster: newRoster };
      } catch { return state; }
    }

    case "REMOVE_CARD": {
      const { cardId, creatureIndex } = action;
      const creature = state.party[creatureIndex];
      if (!creature) return state;
      try {
        const newDeck   = removeCardFromDeck(creature, cardId);
        const newParty  = state.party.map((c, i) => i === creatureIndex ? { ...c, deck: newDeck } : c);
        const newRoster = state.roster.map(c => c.defId === creature.defId ? { ...c, deck: newDeck } : c);
        return { ...state, party: newParty, roster: newRoster };
      } catch { return state; }
    }

    case "FINISH_REWARD": {
      // If floor complete, advance to next floor; otherwise back to map
      const nextState = { ...state, pendingReward: null, pendingCatch: null };
      if (isFloorComplete(state.map)) {
        const nextFloor = advanceFloor(nextState, Object.keys(CREATURE_DEFS).filter(k => !CREATURE_DEFS[k].starter));
        return { ...nextFloor, phase: "map" };
      }
      return returnToMap(nextState);
    }

    // ── Shop ─────────────────────────────────────────────────

    case "BUY_CARD": {
      const { cardId, creatureIndex, cost } = action;
      const spent = spendGold(state, cost);
      if (!spent) return state;
      return runReducer(spent, { type: "DRAFT_CARD", cardId, creatureIndex });
    }

    case "BUY_RELIC": {
      const { relicId, cost } = action;
      const spent = spendGold(state, cost);
      if (!spent) return state;
      return addRelic(spent, relicId);
    }

    case "BUY_HEAL": {
      const { cost } = action;
      const spent = spendGold(state, cost);
      if (!spent) return state;
      const healedParty = spent.party.map(c => ({
        ...c, currentHp: Math.min(c.maxHp, Math.floor(c.currentHp + c.maxHp * 0.3)),
      }));
      return { ...spent, party: healedParty };
    }

    case "LEAVE_SHOP":
      return returnToMap({ ...state, map: clearCurrentNode(state.map) });

    // ── Rest ─────────────────────────────────────────────────

    case "REST_HEAL":
      return applyRestAction(state, "heal");

    case "REST_UPGRADE": {
      const { updatedParty } = action;
      return applyRestAction(state, "upgrade", updatedParty);
    }

    case "FINISH_REST":
      return {
        ...state,
        phase: "map",
        map: clearCurrentNode(state.map),
      };

    // ── Catch ────────────────────────────────────────────────

    case "CATCH_CREATURE": {
      const { creature } = action;
      return catchCreature(state, creature);
    }

    case "ATTEMPT_CATCH": {
      // Roll is performed in the UI — result passed in
      const { creature, success } = action;
      const base = success ? catchCreature(state, creature) : state;
      return {
        ...base,
        phase:        "reward",
        pendingCatch: { ...state.pendingCatch, used: true, lastResult: { success, creature } },
      };
    }

    case "SKIP_CATCH":
      return {
        ...state,
        phase:        "reward",
        pendingCatch: state.pendingCatch ? { ...state.pendingCatch, used: true } : null,
      };

    // ── Party management ─────────────────────────────────────

    case "REORDER_PARTY": {
      const { newOrder } = action;
      return reorderParty(state, newOrder);
    }

    case "SWAP_PARTY_ROSTER": {
      // Swap a roster creature into a party slot (outgoing returns to roster-only)
      const { partyIndex, rosterId } = action;
      const incoming = state.roster.find(c => c.defId === rosterId);
      if (!incoming || state.party[partyIndex] === undefined) return state;
      const newParty = state.party.map((c, i) => i === partyIndex ? incoming : c);
      return { ...state, party: newParty };
    }

    // ── Misc ─────────────────────────────────────────────────

    // ── Events ─────────────────────────────────────────────

    case "RESOLVE_EVENT": {
      // action.choiceId identifies which choice was taken
      const { eventId, choiceId } = action;
      const event = state.pendingEvent?.event;
      if (!event) return state;
      const choice = event.choices.find(c => c.id === choiceId);
      if (!choice) return state;

      // Apply outcome and collect effect summary
      const { newState, effects } = applyEventOutcome(state, choice.outcome);

      return {
        ...newState,
        _lastEventResolution: { effects },
      };
    }

    case "FINISH_EVENT":
      return {
        ...state,
        phase:        "map",
        pendingEvent: null,
        map:          clearCurrentNode(state.map),
        _lastEventResolution: null,
      };

    case "CLEAR_EVOLUTION_FLAG": {
      // Clear justEvolved on a specific creature by defId
      const newParty  = state.party.map(c =>
        c.defId === action.defId ? { ...c, justEvolved: false } : c
      );
      const newRoster = state.roster.map(c =>
        c.defId === action.defId ? { ...c, justEvolved: false } : c
      );
      return { ...state, party: newParty, roster: newRoster };
    }

    case "ADD_GOLD":
      return addGold(state, action.amount);

    case "SPEND_GOLD": {
      const result = spendGold(state, action.amount);
      return result ?? state;
    }

    case "ADD_RELIC":
      return addRelic(state, action.relicId);

    case "GAME_OVER":
      return { ...state, phase: "gameover" };

    // Flee — return to map without clearing the node or giving rewards
    case "RETURN_TO_MAP_NO_REWARD":
      return { ...state, phase: "map" };

    case "RETURN_TO_TITLE":
      return { ...EMPTY_RUN, phase: "title" };

    default:
      return state;
  }
}

// ─── EVENT OUTCOME RESOLVER ─────────────────────────────────

/**
 * Apply an event outcome to the run state.
 * Returns { newState, effects: [] } where effects is a summary for display.
 */
function applyEventOutcome(state, outcome) {
  if (!outcome) return { newState: state, effects: [{ type:"nothing" }] };

  // Handle multi-outcomes recursively
  if (outcome.type === "multi") {
    let s = state;
    let allEffects = [];
    for (const sub of (outcome.outcomes ?? [])) {
      const { newState, effects } = applyEventOutcome(s, sub);
      s = newState;
      allEffects = [...allEffects, ...effects];
    }
    return { newState: s, effects: allEffects };
  }

  switch (outcome.type) {

    case "gold": {
      return {
        newState: addGold(state, outcome.amount),
        effects: [{ type:"gold", amount: outcome.amount }],
      };
    }

    case "lose_gold": {
      const amt = Math.min(state.gold, outcome.amount);
      const spent = spendGold(state, amt);
      return {
        newState: spent ?? state,
        effects: [{ type:"lose_gold", amount: amt }],
      };
    }

    case "lose_gold_per_party": {
      const total = Math.min(state.gold, (outcome.amountPerCreature ?? 10) * state.party.length);
      const spent = spendGold(state, total);
      return {
        newState: spent ?? state,
        effects: [{ type:"lose_gold", amount: total }],
      };
    }

    case "heal": {
      const healedParty = state.party.map(c => ({
        ...c,
        currentHp: Math.min(c.maxHp, Math.floor(c.currentHp + c.maxHp * (outcome.ratio ?? 0.25))),
      }));
      return {
        newState: { ...state, party: healedParty },
        effects: [{ type:"heal", ratio: outcome.ratio }],
      };
    }

    case "damage": {
      const damagedParty = state.party.map((c, i) => {
        if (i > 1) return c; // only active creatures take event damage
        const dmg = Math.floor(c.maxHp * (outcome.ratio ?? 0.1));
        return { ...c, currentHp: Math.max(1, c.currentHp - dmg) };
      });
      return {
        newState: { ...state, party: damagedParty },
        effects: [{ type:"damage", ratio: outcome.ratio }],
      };
    }

    case "add_card": {
      // Pick a random card from the pool draftable by the first active creature
      const creature  = state.party[0];
      if (!creature) return { newState: state, effects: [{ type:"nothing" }] };
      const poolFn    = CARD_POOLS[outcome.pool] ?? CARD_POOLS.any;
      const allCards  = Object.values(CARD_DEFS).filter(c => !c.unplayable);
      const eligible  = poolFn(allCards).filter(
        c => c.type === creature.type || c.type === "colorless"
      );
      if (eligible.length === 0) return { newState: state, effects: [{ type:"nothing" }] };
      const effects = [];
      let newState = state;
      const count = outcome.count ?? 1;
      for (let i = 0; i < count; i++) {
        const pick = eligible[Math.floor(Math.random() * eligible.length)];
        const newDeck = [...newState.party[0].deck, pick.id];
        const newParty = newState.party.map((c, idx) => idx === 0 ? { ...c, deck: newDeck } : c);
        newState = { ...newState, party: newParty };
        effects.push({ type:"card_added", name: pick.name });
      }
      return { newState, effects };
    }

    case "remove_card": {
      // Remove random non-curse cards from first creature's deck
      const creature = state.party[0];
      if (!creature || creature.deck.length === 0)
        return { newState: state, effects: [{ type:"nothing" }] };
      const removable = creature.deck.filter(id => {
        const c = CARD_DEFS[id];
        return c && !c.tags?.includes("curse");
      });
      if (removable.length === 0) return { newState: state, effects: [{ type:"nothing" }] };
      const effects = [];
      let newDeck = [...creature.deck];
      const count = Math.min(outcome.count ?? 1, removable.length);
      for (let i = 0; i < count; i++) {
        const randomId = removable[Math.floor(Math.random() * removable.length)];
        const idx = newDeck.indexOf(randomId);
        if (idx !== -1) {
          newDeck.splice(idx, 1);
          effects.push({ type:"card_removed", name: CARD_DEFS[randomId]?.name ?? randomId });
        }
      }
      const newParty = state.party.map((c, i) => i === 0 ? { ...c, deck: newDeck } : c);
      return { newState: { ...state, party: newParty }, effects };
    }

    case "upgrade_card": {
      // Upgrade a random card in the first creature's deck (simple +3 dmg / -1 cost)
      const creature = state.party[0];
      if (!creature || creature.deck.length === 0)
        return { newState: state, effects: [{ type:"nothing" }] };
      const upgradeable = [...new Set(creature.deck)].filter(id => {
        const c = CARD_DEFS[id];
        return c && !id.endsWith("_plus") && !c.tags?.includes("curse");
      });
      if (upgradeable.length === 0) return { newState: state, effects: [{ type:"nothing" }] };
      const pick = upgradeable[Math.floor(Math.random() * upgradeable.length)];
      const base = CARD_DEFS[pick];
      const upgId = pick + "_plus";
      if (!CARD_DEFS[upgId]) {
        CARD_DEFS[upgId] = {
          ...base, id: upgId, name: base.name + "+",
          baseDamage:   base.baseDamage   !== undefined ? base.baseDamage + 3   : undefined,
          shieldAmount: base.shieldAmount !== undefined ? base.shieldAmount + 4 : undefined,
          healAmount:   base.healAmount   !== undefined ? base.healAmount + 4   : undefined,
          energyCost:   Math.max(0, (base.energyCost ?? 1) - 1),
        };
      }
      const newDeck = [...creature.deck];
      const idx = newDeck.indexOf(pick);
      if (idx !== -1) newDeck[idx] = upgId;
      const newParty = state.party.map((c, i) => i === 0 ? { ...c, deck: newDeck } : c);
      return {
        newState: { ...state, party: newParty },
        effects: [{ type:"upgraded", name: base.name + "+" }],
      };
    }

    case "add_relic_random": {
      // Give a random event relic not already owned
      const available = EVENT_RELICS.filter(id => !state.relics.includes(id));
      if (available.length === 0) {
        // Fall back to gold
        return { newState: addGold(state, 50), effects: [{ type:"gold", amount:50 }] };
      }
      const pick = available[Math.floor(Math.random() * available.length)];
      return {
        newState: addRelic(state, pick),
        effects: [{ type:"relic_added", name: pick.replace(/_/g," ") }],
      };
    }

    case "catch_chance": {
      const prob     = outcome.probability ?? 0.5;
      const roll     = Math.random();
      if (roll < prob) {
        const catchDefs = Object.values(CREATURE_DEFS).filter(d => !d.starter);
        if (catchDefs.length === 0) return { newState: state, effects: [{ type:"nothing" }] };
        const def      = catchDefs[Math.floor(Math.random() * catchDefs.length)];
        const level    = Math.max(1, state.map?.floorNumber ?? 1);
        const instance = createCreatureInstance(def, level);
        const newState = catchCreature(state, instance);
        return { newState, effects: [{ type:"catch_success", name: def.stages.baby.name }] };
      }
      return { newState: state, effects: [{ type:"catch_fail" }] };
    }

    case "xp_bonus": {
      // Apply XP directly — use awardXp helper with synthetic indices
      const activeIndices = outcome.target === "active_first" ? [0]
                          : outcome.target === "all_active"   ? [0, 1]
                          : [0];
      // Temporarily boost XP by adding it directly then running awardXp logic
      const boosted = state.party.map((c, i) =>
        activeIndices.includes(i) ? { ...c, xp: (c.xp ?? 0) + (outcome.amount ?? 20) } : c
      );
      return {
        newState: { ...state, party: boosted },
        effects: [{ type:"xp_bonus", amount: outcome.amount }],
      };
    }

    case "gamble": {
      const won = Math.random() < (outcome.winChance ?? 0.5);
      if (won) {
        // Win: deduct bet then add win amount as net gold
        const afterBet  = outcome.bet > 0 ? (spendGold(state, Math.min(state.gold, outcome.bet)) ?? state) : state;
        const afterWin  = outcome.winAmount > 0 ? addGold(afterBet, outcome.winAmount) : afterBet;
        const winOc     = outcome.winOutcome;
        if (winOc) {
          const { newState: winState, effects: winFx } = applyEventOutcome(afterWin, winOc);
          return { newState: winState, effects: winFx };
        }
        return {
          newState: afterWin,
          effects: [{ type:"win_gamble", amount: (outcome.winAmount ?? 0) - (outcome.bet ?? 0) }],
        };
      } else {
        const lossOc = outcome.lossOutcome ?? { type:"lose_gold", amount: outcome.bet ?? 0 };
        if (lossOc.type === "lose_gold" || !outcome.lossOutcome) {
          const amt = Math.min(state.gold, outcome.bet ?? 0);
          const spent = spendGold(state, amt);
          return {
            newState: spent ?? state,
            effects: [{ type:"lose_gamble", amount: amt }],
          };
        }
        return applyEventOutcome(state, lossOc);
      }
    }

    case "gamble_card": {
      const won = Math.random() < (outcome.winChance ?? 0.5);
      if (won) {
        return applyEventOutcome(state, { type:"add_card", pool: outcome.winPool ?? "rare", count:1 });
      }
      return applyEventOutcome(state, outcome.lossOutcome ?? { type:"nothing" });
    }

    case "echo_pool_random": {
      // Pick one of several random outcomes
      const pool = [
        { type:"heal", ratio:0.3 },
        { type:"add_card", pool:"any", count:1 },
        { type:"gold", amount:45 },
        { type:"damage", ratio:0.1 },
        { type:"upgrade_card", count:1 },
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return applyEventOutcome(state, pick);
    }

    case "nothing":
    default:
      return { newState: state, effects: [{ type:"nothing" }] };
  }
}

// ─── CONTEXT ─────────────────────────────────────────────────

const RunContext = createContext(null);

export function RunProvider({ children }) {
  const [run, dispatch] = useReducer(runReducer, { ...EMPTY_RUN, phase: "title" });
  return (
    <RunContext.Provider value={{ run, dispatch }}>
      {children}
    </RunContext.Provider>
  );
}

export function useRun() {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error("useRun must be used inside <RunProvider>");
  return ctx;
}

// ─── ACTION CREATORS (convenience wrappers) ──────────────────

export const RunActions = {
  goToStarterPick:  ()                        => ({ type: "GO_TO_STARTER_PICK" }),
  startRun:         (creatureDefId)           => ({ type: "START_RUN", creatureDefId }),
  moveToNode:       (nodeId)                  => ({ type: "MOVE_TO_NODE", nodeId }),
  enterNode:        ()                        => ({ type: "ENTER_NODE" }),
  combatVictory:    (activeIndices, enemies)   => ({ type: "COMBAT_VICTORY", activeIndices, enemyCreatures: enemies ?? [] }),
  combatDefeat:     ()                        => ({ type: "COMBAT_DEFEAT" }),
  draftCard:        (cardId, creatureIndex)   => ({ type: "DRAFT_CARD", cardId, creatureIndex }),
  removeCard:       (cardId, creatureIndex)   => ({ type: "REMOVE_CARD", cardId, creatureIndex }),
  takeGold:         (amount)                  => ({ type: "TAKE_GOLD", amount }),
  finishReward:     ()                        => ({ type: "FINISH_REWARD" }),
  buyCard:          (cardId, ci, cost)        => ({ type: "BUY_CARD", cardId, creatureIndex: ci, cost }),
  buyRelic:         (relicId, cost)           => ({ type: "BUY_RELIC", relicId, cost }),
  buyHeal:          (cost)                    => ({ type: "BUY_HEAL", cost }),
  leaveShop:        ()                        => ({ type: "LEAVE_SHOP" }),
  restHeal:         ()                        => ({ type: "REST_HEAL" }),
  restUpgrade:      (updatedParty)            => ({ type: "REST_UPGRADE", updatedParty }),
  catchCreature:    (creature)                => ({ type: "CATCH_CREATURE", creature }),
  reorderParty:     (newOrder)                => ({ type: "REORDER_PARTY", newOrder }),
  swapPartyRoster:  (partyIndex, rosterId)    => ({ type: "SWAP_PARTY_ROSTER", partyIndex, rosterId }),
  addGold:          (amount)                  => ({ type: "ADD_GOLD", amount }),
  addRelic:         (relicId)                 => ({ type: "ADD_RELIC", relicId }),
  clearEvolutionFlag: (defId)               => ({ type: "CLEAR_EVOLUTION_FLAG", defId }),
  resolveEvent:     (payload)               => payload
                                               ? { type: "RESOLVE_EVENT", ...payload }
                                               : { type: "FINISH_EVENT" },
  finishEvent:      ()                      => ({ type: "FINISH_EVENT" }),
  returnToTitle:    ()                        => ({ type: "RETURN_TO_TITLE" }),
  flee:             ()                        => ({ type: "RETURN_TO_MAP_NO_REWARD" }),
  finishRest:       ()                        => ({ type: "FINISH_REST" }),
  attemptCatch:     (creature, success)       => ({ type: "ATTEMPT_CATCH", creature, success }),
  skipCatch:        ()                        => ({ type: "SKIP_CATCH" }),
};
