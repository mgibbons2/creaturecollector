// ============================================================
//  MAP GENERATOR & ROGUELIKE SYSTEM
//  Pure functions — no React, no side effects.
//  Generates the node map for each floor and manages
//  roguelike run progression (floor transitions, rewards,
//  node traversal rules).
// ============================================================


// ------------------------------------------------------------
//  CONSTANTS
// ------------------------------------------------------------

export const NodeType = {
  START:  'start',
  COMBAT: 'combat',
  ELITE:  'elite',
  BOSS:   'boss',
  SHOP:   'shop',
  REST:   'rest',
  EVENT:  'event',
};

// How many rows per floor (start row + content rows + boss row)
// Scales slightly with floor number for a longer late game
const FLOOR_ROW_COUNTS = {
  1: 6,
  2: 6,
  3: 7,
  4: 7,
  default: 8,
};

// Min/max nodes per row (start and boss rows are always width 1)
const ROW_MIN_WIDTH = 2;
const ROW_MAX_WIDTH = 4;

// Weighted node type pools per "era" of the run
// Each entry is [NodeType, weight]
const NODE_POOLS = {
  early: [         // floors 1–2
    [NodeType.COMBAT, 60],
    [NodeType.EVENT,  15],
    [NodeType.SHOP,   15],
    [NodeType.REST,   10],
  ],
  mid: [           // floors 3–4
    [NodeType.COMBAT, 45],
    [NodeType.ELITE,  15],
    [NodeType.EVENT,  20],
    [NodeType.SHOP,   10],
    [NodeType.REST,   10],
  ],
  late: [          // floors 5+
    [NodeType.COMBAT, 35],
    [NodeType.ELITE,  25],
    [NodeType.EVENT,  20],
    [NodeType.SHOP,   10],
    [NodeType.REST,   10],
  ],
};

// Gold rewards per node type
export const GOLD_REWARDS = {
  [NodeType.COMBAT]: { min: 20, max: 35 },   // was 10-20; ~2× to afford shop items
  [NodeType.ELITE]:  { min: 45, max: 65 },   // was 25-40
  [NodeType.BOSS]:   { min: 80, max: 110 },  // was 50-75
};

// Cards offered after each node type
export const DRAFT_OFFER_SIZES = {
  [NodeType.COMBAT]: 3,
  [NodeType.ELITE]:  4,
  [NodeType.BOSS]:   5,
};

// Rest site options
export const REST_OPTIONS = {
  HEAL:    'heal',    // restore 25% of party's max HP
  UPGRADE: 'upgrade', // permanently upgrade one card in one creature's deck
};


// ------------------------------------------------------------
//  UTILITIES
// ------------------------------------------------------------

let _nodeCounter = 0;

function makeId(prefix = 'node') {
  return `${prefix}_${++_nodeCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Weighted random pick from a pool.
 * @param {[string, number][]} pool  — [[value, weight], ...]
 * @returns {string}
 */
function weightedPick(pool) {
  const total = pool.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [value, weight] of pool) {
    rand -= weight;
    if (rand <= 0) return value;
  }
  return pool[pool.length - 1][0];
}

/**
 * Random integer inclusive of both bounds.
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Picks the node pool based on floor number.
 */
function getNodePool(floorNumber) {
  if (floorNumber <= 2) return NODE_POOLS.early;
  if (floorNumber <= 4) return NODE_POOLS.mid;
  return NODE_POOLS.late;
}

/**
 * Returns the number of rows for a given floor.
 */
function getRowCount(floorNumber) {
  return FLOOR_ROW_COUNTS[floorNumber] ?? FLOOR_ROW_COUNTS.default;
}


// ------------------------------------------------------------
//  MAP GENERATION
// ------------------------------------------------------------

/**
 * Generates a full floor map.
 *
 * Algorithm:
 * 1. Decide row count and widths.
 * 2. Create nodes row by row, assigning types from the weighted pool.
 * 3. Connect each node to 1–2 nodes in the next row (forward only).
 * 4. Guarantee every node is reachable from start.
 * 5. Guarantee at least one SHOP and one REST per floor (swap if needed).
 *
 * @param {number} floorNumber
 * @param {string[]} [enemyPartyKeys]  — pool of enemy party ids to assign to combat nodes
 * @returns {MapState}
 */
export function generateFloor(floorNumber, enemyPartyKeys = []) {
  _nodeCounter = 0; // reset per floor so ids stay short

  const totalRows = getRowCount(floorNumber);
  const pool = getNodePool(floorNumber);

  // ---- Step 1: Decide row widths ----
  // Row 0 = start (width 1), row totalRows-1 = boss (width 1), rest random
  const rowWidths = Array.from({ length: totalRows }, (_, i) => {
    if (i === 0 || i === totalRows - 1) return 1;
    return randInt(ROW_MIN_WIDTH, ROW_MAX_WIDTH);
  });

  // ---- Step 2: Create nodes ----
  // nodes[row][col]
  const grid = rowWidths.map((width, row) =>
    Array.from({ length: width }, (_, col) => ({
      id: makeId('n'),
      type: assignNodeType(row, totalRows - 1, pool),
      row,
      col,
      connectionIds: [],
      cleared: row === 0, // start node is pre-cleared
      enemyPartyKey: null,
    }))
  );

  // ---- Step 3: Connect nodes forward ----
  for (let row = 0; row < totalRows - 1; row++) {
    const currentRow = grid[row];
    const nextRow    = grid[row + 1];

    // Every node in the current row connects to at least one in the next
    for (let col = 0; col < currentRow.length; col++) {
      const node = currentRow[col];

      // Map col proportionally to next row's width to find a "natural" target
      const naturalTarget = Math.round((col / Math.max(currentRow.length - 1, 1)) * (nextRow.length - 1));
      const primary = Math.min(naturalTarget, nextRow.length - 1);
      node.connectionIds.push(nextRow[primary].id);

      // 40% chance of a second connection to an adjacent node in the next row
      if (Math.random() < 0.4 && nextRow.length > 1) {
        const secondary = primary === 0 ? 1 : primary - 1;
        if (!node.connectionIds.includes(nextRow[secondary].id)) {
          node.connectionIds.push(nextRow[secondary].id);
        }
      }
    }

    // Ensure every node in the NEXT row has at least one incoming connection
    for (let col = 0; col < nextRow.length; col++) {
      const hasIncoming = currentRow.some(n => n.connectionIds.includes(nextRow[col].id));
      if (!hasIncoming) {
        // Connect the nearest current-row node to it
        const nearest = Math.min(col, currentRow.length - 1);
        if (!currentRow[nearest].connectionIds.includes(nextRow[col].id)) {
          currentRow[nearest].connectionIds.push(nextRow[col].id);
        }
      }
    }
  }

  // ---- Step 4: Flatten grid into a node array ----
  let nodes = grid.flat();

  // ---- Step 5: Guarantee shop + rest ----
  // Look at all non-start, non-boss, non-elite nodes and swap if missing
  const contentNodes = nodes.filter(n =>
    n.type !== NodeType.START &&
    n.type !== NodeType.BOSS &&
    n.row !== 0 &&
    n.row !== totalRows - 1
  );

  const hasShop = contentNodes.some(n => n.type === NodeType.SHOP);
  const hasRest = contentNodes.some(n => n.type === NodeType.REST);

  if (!hasShop) {
    const candidate = contentNodes.find(n => n.type === NodeType.COMBAT);
    if (candidate) candidate.type = NodeType.SHOP;
  }

  if (!hasRest) {
    const candidate = contentNodes.find(n =>
      n.type === NodeType.COMBAT && n.type !== NodeType.SHOP
    );
    if (candidate) candidate.type = NodeType.REST;
  }

  // ---- Step 6: Assign enemy parties to combat/elite/boss nodes ----
  if (enemyPartyKeys.length > 0) {
    nodes.forEach(node => {
      if ([NodeType.COMBAT, NodeType.ELITE, NodeType.BOSS].includes(node.type)) {
        const pool = node.type === NodeType.BOSS
          ? enemyPartyKeys.filter(k => k.startsWith('boss'))
          : enemyPartyKeys.filter(k => !k.startsWith('boss'));
        if (pool.length > 0) {
          node.enemyPartyKey = pool[Math.floor(Math.random() * pool.length)];
        }
      }
    });
  }

  const startNode = nodes.find(n => n.row === 0);
  const bossNode  = nodes.find(n => n.row === totalRows - 1);
  if (bossNode) bossNode.type = NodeType.BOSS; // enforce boss on final row

  return {
    floorNumber,
    nodes,
    currentNodeId: startNode.id,
    clearedNodeIds: [startNode.id],
  };
}

/**
 * Assigns a node type based on its row position.
 */
function assignNodeType(row, bossRow, pool) {
  if (row === 0)       return NodeType.START;
  if (row === bossRow) return NodeType.BOSS;
  return weightedPick(pool);
}


// ------------------------------------------------------------
//  TRAVERSAL & VALIDATION
// ------------------------------------------------------------

/**
 * Returns all nodes the player can currently move to.
 * A node is reachable if:
 *   - It is directly connected from the current node, AND
 *   - The current node has been cleared.
 *
 * @param {MapState} mapState
 * @returns {MapNode[]}
 */
export function getReachableNodes(mapState) {
  const current = mapState.nodes.find(n => n.id === mapState.currentNodeId);
  if (!current || !current.cleared) return [];

  return current.connectionIds
    .map(id => mapState.nodes.find(n => n.id === id))
    .filter(Boolean);
}

/**
 * Returns true if the player can legally move to the given node.
 */
export function canMoveToNode(mapState, targetNodeId) {
  return getReachableNodes(mapState).some(n => n.id === targetNodeId);
}

/**
 * Moves the player to a node (does NOT clear it — clearing happens after
 * the encounter is resolved).
 *
 * @param {MapState} mapState
 * @param {string}   targetNodeId
 * @returns {MapState}
 */
export function moveToNode(mapState, targetNodeId) {
  if (!canMoveToNode(mapState, targetNodeId)) {
    console.warn(`Cannot move to node ${targetNodeId} from ${mapState.currentNodeId}`);
    return mapState;
  }

  return {
    ...mapState,
    currentNodeId: targetNodeId,
  };
}

/**
 * Marks the current node as cleared.
 * Call this after the encounter (combat win, shop exit, rest used, event resolved).
 *
 * @param {MapState} mapState
 * @returns {MapState}
 */
export function clearCurrentNode(mapState) {
  const nodes = mapState.nodes.map(n =>
    n.id === mapState.currentNodeId ? { ...n, cleared: true } : n
  );

  return {
    ...mapState,
    nodes,
    clearedNodeIds: [...mapState.clearedNodeIds, mapState.currentNodeId],
  };
}

/**
 * Returns the current node object.
 */
export function getCurrentNode(mapState) {
  return mapState.nodes.find(n => n.id === mapState.currentNodeId) ?? null;
}

/**
 * Returns true if the floor boss has been cleared.
 */
export function isFloorComplete(mapState) {
  const boss = mapState.nodes.find(n => n.type === NodeType.BOSS);
  return boss ? mapState.clearedNodeIds.includes(boss.id) : false;
}


// ------------------------------------------------------------
//  FLOOR TRANSITIONS
// ------------------------------------------------------------

/**
 * Advances the run to the next floor.
 * Generates a fresh map and updates the RunState.
 *
 * @param {RunState}  runState
 * @param {string[]}  enemyPartyKeys   — available enemy party ids for the new floor
 * @returns {RunState}
 */
export function advanceFloor(runState, enemyPartyKeys = []) {
  const nextFloor = (runState.map?.floorNumber ?? 0) + 1;
  const newMap = generateFloor(nextFloor, enemyPartyKeys);

  return {
    ...runState,
    map: newMap,
    phase: 'map',
  };
}


// ------------------------------------------------------------
//  REWARD GENERATION
// ------------------------------------------------------------

/**
 * Generates the gold reward for clearing a node.
 * Scales slightly with floor number.
 *
 * @param {NodeType} nodeType
 * @param {number}   floorNumber
 * @returns {number}
 */
export function generateGoldReward(nodeType, floorNumber) {
  const range = GOLD_REWARDS[nodeType];
  if (!range) return 0;
  const base = randInt(range.min, range.max);
  const floorBonus = Math.floor((floorNumber - 1) * 2);
  return base + floorBonus;
}

/**
 * Generates a card draft offer for the player after a combat node.
 * Returns an array of CardDef ids to show as choices.
 *
 * Filtering rules:
 *   - Only offers cards draftable by at least one creature in the active party.
 *   - Weighted toward higher rarity on later floors.
 *   - No duplicates within a single offer.
 *
 * @param {NodeType}            nodeType
 * @param {CreatureInstance[]}  party
 * @param {CardDef[]}           allCards    — full CARD_DEFS values array
 * @param {number}              floorNumber
 * @returns {string[]}  array of card ids
 */
export function generateCardOffer(nodeType, party, allCards, floorNumber) {
  const offerSize = DRAFT_OFFER_SIZES[nodeType] ?? 3;

  // Pool: cards draftable by at least one party member
  const draftable = allCards.filter(card =>
    party.some(creature =>
      (card.type === creature.type || card.type === 'colorless') &&
      card.levelRequired <= creature.level
    )
  );

  if (draftable.length === 0) return [];

  // Rarity weights shift on later floors
  const rarityWeights = floorNumber <= 2
    ? { common: 60, uncommon: 30, rare: 10, legendary: 0 }
    : floorNumber <= 4
    ? { common: 40, uncommon: 35, rare: 20, legendary: 5 }
    : { common: 20, uncommon: 35, rare: 35, legendary: 10 };

  // Weighted sample without replacement
  const offer = [];
  const pool = [...draftable];

  while (offer.length < offerSize && pool.length > 0) {
    const weighted = pool.map(card => [card.id, rarityWeights[card.rarity] ?? 10]);
    const picked = weightedPick(weighted);
    offer.push(picked);
    const idx = pool.findIndex(c => c.id === picked);
    pool.splice(idx, 1);
  }

  return offer;
}


// ------------------------------------------------------------
//  RUN PHASE TRANSITIONS
// ------------------------------------------------------------
//  These are thin helpers the RunContext dispatcher will call.
//  They return a partial RunState update (spread into the full state).

/**
 * Transitions the run into combat at the current node.
 * @param {RunState} runState
 * @returns {RunState}
 */
export function enterCombat(runState) {
  return { ...runState, phase: 'combat' };
}

/**
 * Transitions back to the map after an encounter is fully resolved.
 * Marks the current node cleared.
 * @param {RunState} runState
 * @returns {RunState}
 */
export function returnToMap(runState) {
  return {
    ...runState,
    phase: 'map',
    map: clearCurrentNode(runState.map),
  };
}

/**
 * Transitions into the reward phase (card draft + gold).
 * @param {RunState} runState
 * @returns {RunState}
 */
export function enterReward(runState) {
  return { ...runState, phase: 'reward' };
}

/**
 * Transitions into the shop.
 * @param {RunState} runState
 * @returns {RunState}
 */
export function enterShop(runState) {
  return { ...runState, phase: 'shop' };
}

/**
 * Applies a rest action to the run state.
 * 'heal'    → restores 25% max HP across all party members.
 * 'upgrade' → handled by UI — passes upgraded creature back in.
 *
 * @param {RunState} runState
 * @param {string}   action  — REST_OPTIONS.HEAL | REST_OPTIONS.UPGRADE
 * @param {CreatureInstance[]} [updatedParty]  — supply if action is 'upgrade'
 * @returns {RunState}
 */
export function applyRestAction(runState, action, updatedParty) {
  if (action === REST_OPTIONS.HEAL) {
    const healedParty = runState.party.map(creature => ({
      ...creature,
      currentHp: Math.min(creature.maxHp, Math.floor(creature.currentHp + creature.maxHp * 0.25)),
    }));
    return {
      ...runState,
      party: healedParty,
      phase: 'map',
      map: clearCurrentNode(runState.map),
    };
  }

  if (action === REST_OPTIONS.UPGRADE && updatedParty) {
    return {
      ...runState,
      party: updatedParty,
      phase: 'map',
      map: clearCurrentNode(runState.map),
    };
  }

  return runState;
}

/**
 * Adds gold to the run state.
 * @param {RunState} runState
 * @param {number}   amount
 * @returns {RunState}
 */
export function addGold(runState, amount) {
  return { ...runState, gold: runState.gold + amount };
}

/**
 * Spends gold. Returns null if insufficient funds.
 * @param {RunState} runState
 * @param {number}   amount
 * @returns {RunState | null}
 */
export function spendGold(runState, amount) {
  if (runState.gold < amount) return null;
  return { ...runState, gold: runState.gold - amount };
}

/**
 * Adds a relic to the run.
 * @param {RunState} runState
 * @param {string}   relicId
 * @returns {RunState}
 */
export function addRelic(runState, relicId) {
  if (runState.relics.includes(relicId)) return runState; // no duplicates
  return { ...runState, relics: [...runState.relics, relicId] };
}

/**
 * Adds a caught creature to the roster (and optionally the party if space).
 * @param {RunState}        runState
 * @param {CreatureInstance} creature
 * @returns {RunState}
 */
export function catchCreature(runState, creature) {
  // Heal caught creature to full HP before adding to party/roster
  const healed = { ...creature, currentHp: creature.maxHp };
  const newRoster = [...runState.roster, healed];
  const newParty  = runState.party.length < 6
    ? [...runState.party, healed]
    : runState.party;

  return {
    ...runState,
    roster: newRoster,
    party:  newParty,
  };
}

/**
 * Reorders the party (drag-and-drop in UI, or post-combat management).
 * Validates that the array contains the same creatures.
 *
 * @param {RunState}          runState
 * @param {CreatureInstance[]} newPartyOrder
 * @returns {RunState}
 */
export function reorderParty(runState, newPartyOrder) {
  if (newPartyOrder.length !== runState.party.length) return runState;
  return { ...runState, party: newPartyOrder };
}


// ------------------------------------------------------------
//  CATCHING MECHANIC
// ------------------------------------------------------------

/**
 * Calculates the catch probability for an enemy creature.
 * Higher chance when the target is lower HP.
 * Reduced chance for elites and bosses.
 *
 * Formula:
 *   base = (1 - currentHp / maxHp) * 0.7   → 0% at full HP, 70% at 0 HP
 *   modifier applied for elite/boss
 *
 * @param {CreatureInstance} target
 * @param {NodeType}         nodeType   — affects catch rate
 * @returns {number}  probability 0–1
 */
export function getCatchProbability(target, nodeType) {
  const hpRatio = target.currentHp / target.maxHp;
  const base = (1 - hpRatio) * 0.7;

  const modifier = nodeType === NodeType.ELITE ? 0.7  // was 0.6
    : nodeType === NodeType.BOSS  ? 0.25 // was 0.2 — bosses still hard but not impossible
    : 1.0;

  return Math.min(base * modifier, 0.95); // cap at 95% — never guaranteed
}

/**
 * Attempts to catch a creature. Returns { success, probability, creature }.
 *
 * @param {CreatureInstance} target
 * @param {NodeType}         nodeType
 * @returns {{ success: boolean, probability: number, creature: CreatureInstance }}
 */
export function attemptCatch(target, nodeType) {
  const probability = getCatchProbability(target, nodeType);
  const roll = Math.random();
  return {
    success: roll < probability,
    probability,
    creature: target,
  };
}
