// ============================================================
//  CombatScreen.jsx
//  Thin wrapper that bridges RunContext ↔ CombatUI.
//
//  CombatUI is self-contained with its own internal combat
//  state (CombatState from combatEngine.js). This screen:
//    1. Initialises a CombatState from the run's party + the
//       current map node's enemy party.
//    2. Passes callbacks into CombatUI for victory/defeat.
//    3. On victory → dispatches COMBAT_VICTORY with active
//       creature indices so XP + rewards are calculated.
//    4. On defeat  → dispatches COMBAT_DEFEAT.
// ============================================================

import { useState, useCallback } from "react";
import { useRun, RunActions }    from "./RunContext.jsx";
import { getCurrentNode, NodeType } from "./mapGenerator.js";
import { initCombat }            from "./combatEngine.js";
import { CREATURE_DEFS } from "./creatureDefs.js";
import { createCreatureInstance } from "./gameSchema.js";
import CombatUI                  from "./CombatUI.jsx";
import { applyRelicCombatStart, applyRelicVictory, RELIC_DEFS } from "./relicEngine.js";

// ─── ENEMY PARTY BUILDER ─────────────────────────────────────
//
// In the full game this reads node.enemyPartyKey and looks up
// ENEMY_PARTY_DEFS. For now we build a simple scaled enemy
// party from the creature pool based on floor number.

function buildEnemyParty(node, floorNumber) {
  const allDefs   = Object.values(CREATURE_DEFS).filter(d => !d.starter);
  const level     = Math.min(6, Math.max(1, Math.floor(floorNumber * 1.5)));
  const isBoss    = node?.type === NodeType.BOSS;
  const isElite   = node?.type === NodeType.ELITE;
  // Scale enemy count with floor: floor 1-2 = 1 enemy, floor 3+ = 2 enemies
  // Bosses and elites always get 2 enemies
  const count     = isBoss || isElite ? 2 : floorNumber <= 2 ? 1 : 2;

  // Pick random enemies, avoid duplicates
  const shuffled  = [...allDefs].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(def =>
    createCreatureInstance(def, level)
  );
}

// ─── COMBAT SCREEN ───────────────────────────────────────────

export default function CombatScreen() {
  const { run, dispatch } = useRun();
  const { party, map }    = run;
  const node              = getCurrentNode(map);
  const floorNumber       = map?.floorNumber ?? 1;

  // Build the initial CombatState once on mount, then apply relic start effects
  const [combatState] = useState(() => {
    const enemyParty = buildEnemyParty(node, floorNumber);
    const base = initCombat(party, enemyParty);
    return applyRelicCombatStart(base, run.relics);
  });

  const handleVictory = useCallback((enemyCreatures = [], activePlayerCount = 1) => {
    // Build activeIndices from actual player count in combat
    const activeIndices = Array.from({ length: activePlayerCount }, (_, i) => i);
    dispatch({ type: "COMBAT_VICTORY", activeIndices, enemyCreatures });
  }, [dispatch]);

  const handleDefeat = useCallback(() => {
    dispatch(RunActions.combatDefeat());
  }, [dispatch]);



  return (
    <CombatUI
      initialState={combatState}
      relics={run.relics}
      onVictory={handleVictory}
      onDefeat={handleDefeat}
      floorNumber={floorNumber}
      nodeType={node?.type ?? NodeType.COMBAT}
    />
  );
}
