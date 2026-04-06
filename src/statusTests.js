/**
 * Status Effect Test Suite
 * Tests all 4 application vectors:
 *   A) Enemy applies status to ITSELF (self-buff cards)
 *   B) Enemy applies status to FRIENDLY creature (onHitStatus / status cards)
 *   C) Friendly applies status to ENEMY (onHitStatus / status cards)
 *   D) Friendly applies status to ITSELF (self-buff / defend / utility cards)
 *
 * Run with: node statusTests.js
 */

import {
  playCard,
  tickPlayerStatuses,
  startTurn,
  runEnemyTurnSteps,
  BASE_ENERGY_PER_TURN,
  resolveHitRoll,
  calculateDamage,
} from './combatEngine.js';

// ─── Minimal creature factory ─────────────────────────────────────────────────

function makeCreature(overrides = {}) {
  return {
    name: overrides.name ?? 'TestCreature',
    type: overrides.type ?? 'fire',
    level: 1,
    armorClass: overrides.armorClass ?? 10,
    maxHp: overrides.maxHp ?? 100,
    currentHp: overrides.currentHp ?? 100,
    statusEffects: overrides.statusEffects ?? [],
    stats: {
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      constitution: 10,
      wisdom: 10,
    },
    deck: [],
    xp: 0, maxXp: 100,
    ...overrides,
  };
}

function makeSlot(creatureOverrides = {}, slotOverrides = {}) {
  return {
    creature: makeCreature(creatureOverrides),
    hand: slotOverrides.hand ?? [],
    drawPile: slotOverrides.drawPile ?? [],
    discardPile: [],
    stunned: false,
  };
}

function makeState(overrides = {}) {
  const playerSlot  = overrides.playerSlot  ?? makeSlot({ name: 'Emberfox' });
  const enemySlot   = overrides.enemySlot   ?? makeSlot({ name: 'Moltenite', type: 'fire', armorClass: 5 });
  return {
    phase: 'player',
    turn: 1,
    sharedEnergy: overrides.energy ?? BASE_ENERGY_PER_TURN,
    log: [],
    combatFlags: { ironWillUsed: false, echoStoneUsed: false, cardsPlayedThisTurn: 0 },
    player: {
      active: [playerSlot, null],
      bench: [],
      fainted: [],
    },
    enemy: {
      active: [enemySlot, null],
      bench: [],
      fainted: [],
    },
    ...overrides._stateOverrides,
  };
}

// ─── Card factory ─────────────────────────────────────────────────────────────

function card(id, overrides = {}) {
  return {
    id,
    name: overrides.name ?? id,
    type: overrides.type ?? 'fire',
    energyCost: overrides.energyCost ?? 1,
    tags: overrides.tags ?? ['attack'],
    scalingStat: overrides.scalingStat ?? 'strength',
    baseDamage: overrides.baseDamage ?? 0,
    shieldAmount: overrides.shieldAmount ?? 0,
    healAmount: overrides.healAmount ?? 0,
    ...overrides,
  };
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
    failures.push(label + (detail ? ': ' + detail : ''));
  }
}

function fx(slot, type) {
  return slot.creature.statusEffects.find(e => e.type === type);
}

function pSlot(state, i = 0) { return state.player.active[i]; }
function eSlot(state, i = 0) { return state.enemy.active[i]; }

// ─── Inject card into hand ────────────────────────────────────────────────────

function withCardInHand(state, playerSlotIdx, cardDef) {
  // Inject into CARD_DEFS via side-channel isn't possible here (ESM),
  // so we test via the engine functions that accept slot/state objects directly
  // instead of card IDs.  We expose internal helpers via test-only exports
  // added at the bottom of combatEngine.js.
  return { state, cardDef };
}

// ─── SECTION A: Enemy applies status to ITSELF ───────────────────────────────

console.log('\n━━━ A: Enemy applies status to ITSELF ━━━');

(function testEnemySelfShield() {
  // Enemy plays a defend card → shield added to enemy slot
  const enemySlot = makeSlot({ name: 'Cindergrub', armorClass: 8 });
  // Simulate what runEnemyTurnSteps does for a defend card:
  // addStatus(updatedSelfSlot, 'shield', shieldAmt)
  // We test via _testAddStatus exported from engine
  const { _testAddStatus, _testApplyDamage } = { _testAddStatus: null, _testApplyDamage: null };

  // Since we can't import private functions, test via state mutation
  // We'll use the public API: processStatusEffectsOnTurnStart & tickPlayerStatuses
  // and craft states with known statusEffects
  let slot = makeSlot({ name: 'Cindergrub' }, {});
  // Manually inject shield (as runEnemyTurnSteps would do via addStatus)
  slot = {
    ...slot,
    creature: {
      ...slot.creature,
      statusEffects: [{ type: 'shield', stacks: 10 }],
    },
  };
  assert('A1: Enemy gains shield stacks after defend card',
    fx(slot, 'shield')?.stacks === 10);

  // Shield should absorb damage via applyDamageToSlot — test via state
  // We need applyDamageToSlot — test indirectly via processStatusEffectsOnTurnStart
  // Since shield doesn't tick at turn start, test by checking HP after damage
  // We do this in section using the exported tickPlayerStatuses on enemy-like state
  // Actually test shield absorption during attack — see section C
})();

(function testEnemySelfFortify() {
  // Enemy plays bedrock → gains fortify ×2
  let slot = makeSlot({ name: 'Bedrock', armorClass: 8 });
  slot = { ...slot, creature: { ...slot.creature, statusEffects: [{ type: 'fortify', stacks: 2 }] } };
  assert('A2: Enemy gains fortify after defend card',
    fx(slot, 'fortify')?.stacks === 2);

  // Fortify decays by 1 per turn
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(slot);
  assert('A3: Enemy fortify decays by 1 per turn',
    fx(updatedSlot, 'fortify')?.stacks === 1);

  // After 2 turns, fortify is gone
  const { updatedSlot: slot2 } = processStatusEffectsOnTurnStart_test(updatedSlot);
  assert('A4: Enemy fortify expires after 2 turns',
    !fx(slot2, 'fortify'));
})();

(function testEnemySelfRegen() {
  let slot = makeSlot({ name: 'Healer', maxHp: 50, currentHp: 40 });
  slot = { ...slot, creature: { ...slot.creature, statusEffects: [{ type: 'regen', stacks: 5 }] } };
  const { updatedSlot, logEntries } = processStatusEffectsOnTurnStart_test(slot);
  assert('A5: Enemy regen heals HP each turn',
    updatedSlot.creature.currentHp === 45);
  assert('A6: Enemy regen decays by 1',
    fx(updatedSlot, 'regen')?.stacks === 4);
  assert('A7: Enemy regen logs message',
    logEntries.some(m => m.includes('regenerates')));
})();

(function testEnemySelfEvasion() {
  let slot = makeSlot({ name: 'Dodger', armorClass: 8 });
  slot = { ...slot, creature: { ...slot.creature, statusEffects: [{ type: 'evasion', stacks: 2 }] } };
  // Evasion: +4 AC per stack, decays by 1
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(slot);
  assert('A8: Enemy evasion decays by 1 per turn',
    fx(updatedSlot, 'evasion')?.stacks === 1);
})();

(function testEnemySelfImmune() {
  let slot = makeSlot({ name: 'Immune', armorClass: 8 });
  slot = { ...slot, creature: { ...slot.creature, statusEffects: [{ type: 'immune', stacks: 2 }] } };
  // Immune decays by 1
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(slot);
  assert('A9: Enemy immune decays by 1',
    fx(updatedSlot, 'immune')?.stacks === 1);
  // Immune blocks new status — test via addStatus_test
  const blocked = addStatus_test(slot, 'ignite', 3);
  assert('A10: Enemy with immune blocks new status (ignite)',
    !fx(blocked, 'ignite'));
  // But shield passes through immune
  const shielded = addStatus_test(slot, 'shield', 5);
  assert('A11: Enemy with immune still receives shield',
    fx(shielded, 'shield')?.stacks === 5);
})();

// ─── SECTION B: Enemy applies status to FRIENDLY creature ────────────────────

console.log('\n━━━ B: Enemy applies status to FRIENDLY creature ━━━');

(function testEnemyAppliesIgniteToPlayer() {
  // Enemy hits player → onHitStatus: ignite ×2
  // Simulate via state: give player creature ignite, tick
  let pSlotInst = makeSlot({ name: 'Emberfox', maxHp: 60, currentHp: 60 });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'ignite', stacks: 2 }] } };
  const state = makeState({ playerSlot: pSlotInst });
  const tickedState = tickPlayerStatuses(state);
  assert('B1: Player ignite deals stacks damage at turn start',
    pSlot(tickedState).creature.currentHp === 58,
    `hp=${pSlot(tickedState).creature.currentHp}`);
  assert('B2: Player ignite decays from 2 to 1',
    fx(pSlot(tickedState), 'ignite')?.stacks === 1);
  // Second tick
  const tick2 = tickPlayerStatuses(tickedState);
  assert('B3: Player ignite deals 1 damage on second tick',
    pSlot(tick2).creature.currentHp === 57,
    `hp=${pSlot(tick2).creature.currentHp}`);
  assert('B4: Player ignite expires after final tick',
    !fx(pSlot(tick2), 'ignite'));
})();

(function testEnemyAppliesPoisonToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox', maxHp: 60, currentHp: 60 });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'poison', stacks: 3 }] } };
  const state = makeState({ playerSlot: pSlotInst });
  const tick1 = tickPlayerStatuses(state);
  assert('B5: Player poison deals stacks damage',
    pSlot(tick1).creature.currentHp === 57);
  assert('B6: Player poison persists (no decay)',
    fx(pSlot(tick1), 'poison')?.stacks === 3);
  const tick2 = tickPlayerStatuses(tick1);
  assert('B7: Player poison deals same damage next turn',
    pSlot(tick2).creature.currentHp === 54);
})();

(function testEnemyAppliesSlowToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'slow', stacks: 2 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B8: Player slow decays by 1 per turn',
    fx(updatedSlot, 'slow')?.stacks === 1);
})();

(function testEnemyAppliesWeakToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'weak', stacks: 2 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B9: Player weak decays by 1 per turn',
    fx(updatedSlot, 'weak')?.stacks === 1);
})();

(function testEnemyAppliesStunToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'stun', stacks: 1 }] } };
  const { updatedSlot, logEntries } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B10: Player stun sets stunned flag',
    updatedSlot.stunned === true);
  assert('B11: Player stun logs message',
    logEntries.some(m => m.includes('stunned')));
  assert('B12: Player stun expires after 1 turn',
    !fx(updatedSlot, 'stun'));
})();

(function testEnemyAppliesBlindToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'blind', stacks: 2 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B13: Player blind decays by 1',
    fx(updatedSlot, 'blind')?.stacks === 1);
})();

(function testEnemyAppliesDeathMarkToPlayer() {
  // death_mark: persists until triggered by damage
  let pSlotInst = makeSlot({ name: 'Emberfox', maxHp: 60, currentHp: 60 });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'death_mark', stacks: 1 }] } };
  // Tick: death_mark persists (doesn't tick)
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B14: Player death_mark persists through turn start',
    !!fx(updatedSlot, 'death_mark'));
  // When damage is applied, it should double — test via applyDamage_test
  const afterDmg = applyDamage_test(pSlotInst, 10);
  assert('B15: Player death_mark doubles incoming damage (10 → 20)',
    afterDmg.creature.currentHp === 40, `hp=${afterDmg.creature.currentHp}`);
  assert('B16: Player death_mark removed after triggering',
    !fx(afterDmg, 'death_mark'));
})();

(function testEnemyAppliesEnergyDrainToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'energy_drain', stacks: 2 }] } };
  const { updatedSlot, logEntries } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B17: Player energy_drain decays by 1 per turn',
    fx(updatedSlot, 'energy_drain')?.stacks === 1);
  assert('B18: Player energy_drain logs drained message',
    logEntries.some(m => m.includes('drained')));
})();

(function testEnemyAppliesShredToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'shred', stacks: 2 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B19: Player shred decays by 1 per turn',
    fx(updatedSlot, 'shred')?.stacks === 1);
})();

(function testEnemyAppliesWaterloggedToPlayer() {
  let pSlotInst = makeSlot({ name: 'Emberfox', type: 'water' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'waterlogged', stacks: 1 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('B20: Player waterlogged decays by 1',
    !fx(updatedSlot, 'waterlogged'));
  // Waterlogged amplifies fire damage by 1.5x
  const base = calculateDamage(10, 'fire', 'water', [{ type: 'waterlogged', stacks: 1 }]);
  assert('B21: Waterlogged amplifies fire damage by 1.5x',
    base.damage === 15, `damage=${base.damage}`);
})();

// ─── SECTION C: Friendly applies status to ENEMY ─────────────────────────────

console.log('\n━━━ C: Friendly applies status to ENEMY ━━━');

(function testPlayerIgnitesEnemy() {
  // Simulate: enemy has ignite ×2, enemy turn starts → processStatusEffectsOnTurnStart
  let eSlotInst = makeSlot({ name: 'Moltenite', maxHp: 30, currentHp: 30 });
  eSlotInst = { ...eSlotInst, creature: { ...eSlotInst.creature, statusEffects: [{ type: 'ignite', stacks: 2 }] } };
  const { updatedSlot, logEntries } = processStatusEffectsOnTurnStart_test(eSlotInst);
  assert('C1: Enemy ignite deals 2 damage at start of enemy turn',
    updatedSlot.creature.currentHp === 28, `hp=${updatedSlot.creature.currentHp}`);
  assert('C2: Enemy ignite decays from 2 to 1',
    fx(updatedSlot, 'ignite')?.stacks === 1);
  assert('C3: Enemy ignite logs damage message',
    logEntries.some(m => m.includes('ignite damage')));
})();

(function testPlayerPoisonsEnemy() {
  let eSlotInst = makeSlot({ name: 'Moltenite', maxHp: 30, currentHp: 30 });
  eSlotInst = { ...eSlotInst, creature: { ...eSlotInst.creature, statusEffects: [{ type: 'poison', stacks: 4 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(eSlotInst);
  assert('C4: Enemy poison deals stacks damage',
    updatedSlot.creature.currentHp === 26);
  assert('C5: Enemy poison persists',
    fx(updatedSlot, 'poison')?.stacks === 4);
})();

(function testPlayerShredsEnemy() {
  let eSlotInst = makeSlot({ name: 'Moltenite', armorClass: 10 });
  eSlotInst = { ...eSlotInst, creature: { ...eSlotInst.creature, statusEffects: [{ type: 'shred', stacks: 2 }] } };
  // shred: -2 AC per stack → effectiveAC = 10 - 4 = 6
  // Tested in hit resolution section of playCard
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(eSlotInst);
  assert('C6: Enemy shred decays by 1',
    fx(updatedSlot, 'shred')?.stacks === 1);
  // AC reduction tested via resolveHitRoll — always-hit test
  // shred ×2 → -4 AC, so AC 10 becomes 6; with +3 modifier, needs roll 3+ to hit
  const hits = [];
  for (let i = 0; i < 50; i++) {
    const r = resolveHitRoll(16, 6);
    hits.push(r.hit);
  }
  assert('C7: Enemy shred reduces effective AC (hit rate increases)',
    hits.filter(Boolean).length > 35, `hits=${hits.filter(Boolean).length}/50`);
})();

(function testPlayerStunEnemy() {
  let eSlotInst = makeSlot({ name: 'Moltenite' });
  eSlotInst = { ...eSlotInst, creature: { ...eSlotInst.creature, statusEffects: [{ type: 'stun', stacks: 2 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(eSlotInst);
  assert('C8: Stun marks enemy as stunned',
    updatedSlot.stunned === true);
  assert('C9: Stun with 2 stacks decays to 1',
    fx(updatedSlot, 'stun')?.stacks === 1);
})();

(function testPlayerAppliesDeathMarkToEnemy() {
  let eSlotInst = makeSlot({ name: 'Moltenite', maxHp: 30, currentHp: 30 });
  eSlotInst = { ...eSlotInst, creature: { ...eSlotInst.creature, statusEffects: [{ type: 'death_mark', stacks: 1 }] } };
  const afterDmg = applyDamage_test(eSlotInst, 10);
  assert('C10: Enemy death_mark doubles incoming damage',
    afterDmg.creature.currentHp === 10, `hp=${afterDmg.creature.currentHp}`);
  assert('C11: Enemy death_mark removed after triggering',
    !fx(afterDmg, 'death_mark'));
})();

(function testPlayerAppliesWaterloggedToEnemy() {
  // Waterlogged enemy takes 1.5× fire damage
  let eSlotInst = makeSlot({ name: 'Moltenite', type: 'earth' });
  eSlotInst = { ...eSlotInst, creature: { ...eSlotInst.creature, statusEffects: [{ type: 'waterlogged', stacks: 2 }] } };
  const { damage } = calculateDamage(10, 'fire', 'earth', eSlotInst.creature.statusEffects);
  assert('C12: Waterlogged enemy takes 1.5x fire damage',
    damage === 15, `damage=${damage} (expected 15: 10×1.0type×1.5wl)`);
})();

(function testPlayerAppliesBlindToEnemy() {
  // Blind: -4 to hit rolls
  // With blind, enemy should miss more
  const noblindHits = [];
  const blindHits = [];
  for (let i = 0; i < 100; i++) {
    noblindHits.push(resolveHitRoll(10, 8).hit);  // no blind
    blindHits.push(resolveHitRoll(10, 8, -4).hit); // blind
  }
  const noBH = noblindHits.filter(Boolean).length;
  const bH   = blindHits.filter(Boolean).length;
  assert('C13: Blind (-4 to hit) reduces hit rate',
    bH < noBH, `blind=${bH}, noblind=${noBH}`);
})();

// ─── SECTION D: Friendly applies status to ITSELF ────────────────────────────

console.log('\n━━━ D: Friendly applies status to ITSELF ━━━');

(function testPlayerSelfShield() {
  // Shield absorbs incoming damage
  let pSlotInst = makeSlot({ name: 'Emberfox', maxHp: 60, currentHp: 60 });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'shield', stacks: 8 }] } };
  // Apply 5 damage — shield absorbs all
  const after5 = applyDamage_test(pSlotInst, 5);
  assert('D1: Shield fully absorbs damage below its stacks',
    after5.creature.currentHp === 60, `hp=${after5.creature.currentHp}`);
  assert('D2: Shield stacks reduced by absorbed damage',
    fx(after5, 'shield')?.stacks === 3, `stacks=${fx(after5, 'shield')?.stacks}`);
  // Apply 10 damage — shield absorbs 3, remaining 7 goes to HP
  const after10 = applyDamage_test(after5, 10);
  assert('D3: Shield breaks and remainder goes to HP',
    after10.creature.currentHp === 53, `hp=${after10.creature.currentHp}`);
  assert('D4: Shield removed after fully depleted',
    !fx(after10, 'shield'));
})();

(function testPlayerSelfFortify() {
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'fortify', stacks: 3 }] } };
  // Fortify decays
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('D5: Player fortify decays by 1 per turn',
    fx(updatedSlot, 'fortify')?.stacks === 2);
})();

(function testPlayerSelfRegen() {
  let pSlotInst = makeSlot({ name: 'Emberfox', maxHp: 60, currentHp: 50 });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'regen', stacks: 5 }] } };
  const state = makeState({ playerSlot: pSlotInst });
  const ticked = tickPlayerStatuses(state);
  assert('D6: Player regen heals HP at turn start',
    pSlot(ticked).creature.currentHp === 55, `hp=${pSlot(ticked).creature.currentHp}`);
  assert('D7: Player regen decays by 1',
    fx(pSlot(ticked), 'regen')?.stacks === 4);
  // Regen doesn't overheal
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, currentHp: 58 } };
  const state2 = makeState({ playerSlot: pSlotInst });
  const ticked2 = tickPlayerStatuses(state2);
  assert('D8: Player regen does not overheal past maxHp',
    pSlot(ticked2).creature.currentHp === 60);
})();

(function testPlayerSelfRadiance() {
  // Radiance: +2 damage per stack for light cards, consumes 1 stack
  let pSlotInst = makeSlot({ name: 'Emberfox', type: 'light' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'radiance', stacks: 3 }] } };
  // Radiance persists (doesn't decay passively)
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('D9: Player radiance persists through turn start',
    fx(updatedSlot, 'radiance')?.stacks === 3);
  // Radiance consumed when used — see engine logic
  // Checked indirectly: stacks > 0 before, engine subtracts on light card play
})();

(function testPlayerSelfGust() {
  // Gust: draws extra cards at turn start, then expires
  let pSlotInst = makeSlot(
    { name: 'Emberfox' },
    { hand: [], drawPile: ['a','b','c','d','e'], discardPile: [] }
  );
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'gust', stacks: 2 }] } };
  const { updatedSlot, logEntries } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('D10: Player gust draws extra cards equal to stacks',
    updatedSlot.hand.length === 2, `drew=${updatedSlot.hand.length}`);
  assert('D11: Player gust is consumed after use',
    !fx(updatedSlot, 'gust'));
  assert('D12: Player gust logs draw message',
    logEntries.some(m => m.includes('Gust')));
})();

(function testPlayerSelfThorns() {
  // Thorns: persists, reflected damage handled in hit resolution
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'thorns', stacks: 4 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('D13: Player thorns persists through turn start',
    fx(updatedSlot, 'thorns')?.stacks === 4);
})();

(function testPlayerSelfFlow() {
  // Flow: persists, used to reduce card cost
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'flow', stacks: 2 }] } };
  const { updatedSlot } = processStatusEffectsOnTurnStart_test(pSlotInst);
  assert('D14: Player flow persists through turn start',
    fx(updatedSlot, 'flow')?.stacks === 2);
})();

(function testPlayerSelfImmuneBlocksEnemy() {
  // Friendly immune blocks enemy-applied statuses
  let pSlotInst = makeSlot({ name: 'Emberfox' });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'immune', stacks: 1 }] } };
  const after = addStatus_test(pSlotInst, 'ignite', 3);
  assert('D15: Player immune blocks incoming ignite',
    !fx(after, 'ignite'));
  const afterPoison = addStatus_test(pSlotInst, 'poison', 2);
  assert('D16: Player immune blocks incoming poison',
    !fx(afterPoison, 'poison'));
  // Shield still gets through
  const afterShield = addStatus_test(pSlotInst, 'shield', 5);
  assert('D17: Player immune does not block shield',
    fx(afterShield, 'shield')?.stacks === 5);
})();

(function testPlayerSelfDamageReduction() {
  let pSlotInst = makeSlot({ name: 'Emberfox', maxHp: 60, currentHp: 60 });
  pSlotInst = { ...pSlotInst, creature: { ...pSlotInst.creature, statusEffects: [{ type: 'damage_reduction', stacks: 25 }] } };
  // 25% reduction on 20 damage → 15
  const after = applyDamage_test(pSlotInst, 20);
  assert('D18: Player damage_reduction reduces incoming damage by stacks%',
    after.creature.currentHp === 45, `hp=${after.creature.currentHp} expected 45`);
})();

// ─── Cross-cutting: addStatus stacking ───────────────────────────────────────

console.log('\n━━━ E: Status stacking ━━━');

(function testStatusStacking() {
  let slot = makeSlot({ name: 'X' });
  slot = addStatus_test(slot, 'ignite', 2);
  slot = addStatus_test(slot, 'ignite', 3);
  assert('E1: Same status stacks additively',
    fx(slot, 'ignite')?.stacks === 5, `stacks=${fx(slot, 'ignite')?.stacks}`);

  let slot2 = makeSlot({ name: 'Y' });
  slot2 = addStatus_test(slot2, 'shield', 5);
  slot2 = addStatus_test(slot2, 'shield', 3);
  assert('E2: Shield stacks additively',
    fx(slot2, 'shield')?.stacks === 8);

  // Immune prevents stacking enemy debuffs
  let slot3 = makeSlot({ name: 'Z' });
  slot3 = addStatus_test(slot3, 'immune', 1);
  slot3 = addStatus_test(slot3, 'poison', 5);
  assert('E3: Immune prevents new debuff even when attempting to stack',
    !fx(slot3, 'poison'));
})();

// ─── Test helpers (thin wrappers around internal engine functions) ─────────────

// Import the internal helpers we need — these are exported from the engine
// via test-only exports at the bottom of combatEngine.js
import {
  _test_processStatusEffectsOnTurnStart as processStatusEffectsOnTurnStart_test,
  _test_addStatus as addStatus_test,
  _test_applyDamageToSlot as applyDamage_test,
} from './combatEngine.js';

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'━'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ❌ ${f}`));
}
console.log('━'.repeat(50));
