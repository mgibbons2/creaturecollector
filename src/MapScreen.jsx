// ============================================================
//  MapScreen.jsx
//  Visual roguelike node map. Click reachable nodes to move,
//  then Enter Node to start the encounter.
// ============================================================

import { useState, useEffect } from "react";
import PartyScreen from "./PartyScreen.jsx";
import EvolutionScreen from "./EvolutionScreen.jsx";
import { useRun, RunActions } from "./RunContext.jsx";
import { getReachableNodes, canMoveToNode, getCurrentNode, NodeType } from "./mapGenerator.js";

// ─── CONSTANTS ───────────────────────────────────────────────

const NODE_META = {
  [NodeType.START]:  { icon:"★", label:"Start",  bg:"#252514", border:"#504830", color:"#A09050" },
  [NodeType.COMBAT]: { icon:"⚔", label:"Battle", bg:"#1e0e0e", border:"#882020", color:"#E84040" },
  [NodeType.ELITE]:  { icon:"☠", label:"Elite",  bg:"#200a20", border:"#882088", color:"#D060E0" },
  [NodeType.BOSS]:   { icon:"✦", label:"Boss",   bg:"#1e1000", border:"#C88020", color:"#F8C030" },
  [NodeType.SHOP]:   { icon:"$", label:"Shop",   bg:"#0a1e10", border:"#208840", color:"#40C060" },
  [NodeType.REST]:   { icon:"♥", label:"Rest",   bg:"#0e0e1e", border:"#204888", color:"#4080E0" },
  [NodeType.EVENT]:  { icon:"?", label:"Event",  bg:"#1a1410", border:"#806030", color:"#C09040" },
};

const TYPE_COLORS = {
  fire:"#DD6610", water:"#2B7FE8", earth:"#4A8C2A",
  wind:"#6070C8", shadow:"#7038A8", light:"#C89010",
};

// ─── NODE DOT ────────────────────────────────────────────────

function MapNode({ node, isCurrent, isReachable, isCleared, onClick }) {
  const meta = NODE_META[node.type] || NODE_META[NodeType.COMBAT];
  const size = node.type === NodeType.BOSS ? 52 : 40;

  return (
    <div
      onClick={isReachable ? onClick : undefined}
      title={`${meta.label}${isCleared ? " (cleared)" : ""}`}
      style={{
        width:  size, height: size,
        borderRadius: "50%",
        background: isCleared ? "#1a1a14" : meta.bg,
        border: `3px solid ${isCurrent ? "#E8E8D0" : isReachable ? meta.color : isCleared ? "#302818" : meta.border}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor: isReachable ? "pointer" : "default",
        opacity: isCleared ? 0.4 : 1,
        transform: isCurrent ? "scale(1.15)" : isReachable ? "scale(1.05)" : "scale(1)",
        transition:"all 0.15s",
        boxShadow: isCurrent
          ? `0 0 0 3px #E8E8D044, 0 0 20px ${meta.color}66`
          : isReachable
          ? `0 0 12px ${meta.color}44`
          : "none",
        flexShrink:0,
        fontFamily:"'Courier New', monospace",
        position:"relative",
        zIndex: isCurrent ? 10 : isReachable ? 5 : 1,
      }}
    >
      <span style={{
        fontSize: node.type === NodeType.BOSS ? 20 : 15,
        color: isCleared ? "#403828" : isCurrent ? "#E8E8D0" : meta.color,
        lineHeight:1,
        userSelect:"none",
      }}>
        {meta.icon}
      </span>
      {/* Label below */}
      <div style={{
        position:"absolute", top:"calc(100% + 4px)",
        left:"50%", transform:"translateX(-50%)",
        fontSize:7, fontWeight:900, color: isCleared ? "#302818" : meta.color,
        letterSpacing:"0.08em", whiteSpace:"nowrap",
      }}>
        {meta.label.toUpperCase()}
      </div>
    </div>
  );
}

// ─── SVG CONNECTOR LINES ─────────────────────────────────────

function ConnectorLines({ nodes, nodePositions, clearedIds }) {
  const lines = [];
  nodes.forEach(node => {
    const from = nodePositions[node.id];
    if (!from) return;
    node.connectionIds.forEach(toId => {
      const to = nodePositions[toId];
      if (!to) return;
      const cleared = clearedIds.includes(node.id) && clearedIds.includes(toId);
      lines.push({ from, to, cleared, key: `${node.id}-${toId}` });
    });
  });

  return (
    <svg
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"visible" }}
    >
      {lines.map(l => (
        <line
          key={l.key}
          x1={l.from.x} y1={l.from.y}
          x2={l.to.x}   y2={l.to.y}
          stroke={l.cleared ? "#302818" : "#504838"}
          strokeWidth={l.cleared ? 1 : 1.5}
          strokeDasharray={l.cleared ? "4 4" : "none"}
          opacity={l.cleared ? 0.4 : 0.7}
        />
      ))}
    </svg>
  );
}

// ─── PARTY BAR ───────────────────────────────────────────────

function PartyBar({ party }) {
  return (
    <div style={{
      display:"flex", gap:8, flexWrap:"wrap",
    }}>
      {party.map((c, i) => {
        const pct = Math.round((c.currentHp / c.maxHp) * 100);
        const hpCol = pct > 50 ? "#40C850" : pct > 20 ? "#F8D030" : "#F85840";
        const typeCol = TYPE_COLORS[c.type] || "#888";
        return (
          <div key={i} style={{
            background:"#1a1a10", border:`2px solid ${typeCol}44`,
            borderRadius:7, padding:"7px 10px",
            fontFamily:"'Courier New', monospace", minWidth:120,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:10, fontWeight:900, color:"#E8E8D0" }}>{c.name}</span>
              <span style={{ fontSize:9, color:typeCol }}>Lv{c.level}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:8, fontWeight:900, color:"#38A018", minWidth:14 }}>HP</span>
              <div style={{ flex:1, height:6, background:"#302818", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:hpCol, borderRadius:3, transition:"width 0.3s" }} />
              </div>
              <span style={{ fontSize:8, color:"#605840" }}>{c.currentHp}/{c.maxHp}</span>
            </div>
            {/* XP bar */}
            {c.xpNext && (
              <div style={{ marginTop:3 }}>
                <div style={{ height:2, background:"#302818", borderRadius:1, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(c.xp/c.xpNext)*100)}%`, background:"#4898F0" }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function MapScreen() {
  const { run, dispatch } = useRun();
  const { map, party, gold, relics } = run;

  const reachable   = getReachableNodes(map);
  const [partyOpen, setPartyOpen]         = useState(false);
  const [pendingNodeId, setPendingNodeId] = useState(map.currentNodeId ?? null);
  // Check for any creature that just evolved — show evo screen first
  const [evoQueue,  setEvoQueue]           = useState([]);
  const [showingEvo, setShowingEvo]        = useState(false);

  // Whenever the party changes, check for justEvolved flags
  useEffect(() => {
    const evolved = party.filter(c => c.justEvolved);
    if (evolved.length > 0 && !showingEvo) {
      setEvoQueue(evolved);
      setShowingEvo(true);
    }
  }, [party]);

  function handleEvoDone() {
    // Clear flag for the creature we just showed
    const current = evoQueue[0];
    if (current) dispatch(RunActions.clearEvolutionFlag(current.defId));
    const remaining = evoQueue.slice(1);
    if (remaining.length > 0) {
      setEvoQueue(remaining);
    } else {
      setShowingEvo(false);
      setEvoQueue([]);
    }
  }
  const currentNode = getCurrentNode(map);
  // pendingNode is the node the player has clicked to preview
  const pendingNode = pendingNodeId
    ? map.nodes.find(n => n.id === pendingNodeId)
    : null;

  // Build a grid layout: rows from bottom (row 0) to top (boss row)
  // Group nodes by row, sort ascending by col
  const rowMap = {};
  map.nodes.forEach(n => {
    if (!rowMap[n.row]) rowMap[n.row] = [];
    rowMap[n.row].push(n);
  });
  const rows      = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
  const maxRow    = Math.max(...rows);
  const ROW_H     = 80;    // px per row
  const COL_W     = 80;    // px per column slot
  const NODE_SIZE = 52;    // max node size (boss)
  const PAD_X     = 60;
  const PAD_Y     = 40;

  // Calculate max cols for centering
  const maxCols = Math.max(...rows.map(r => rowMap[r].length));
  const totalW  = maxCols * COL_W + PAD_X * 2;
  const totalH  = (maxRow + 1) * ROW_H + PAD_Y * 2 + 30; // +30 for labels

  // Map node id → { x, y } centre positions (rows rendered bottom-to-top)
  const nodePositions = {};
  rows.forEach(row => {
    const nodesInRow = rowMap[row].sort((a, b) => a.col - b.col);
    const count = nodesInRow.length;
    nodesInRow.forEach((node, colIdx) => {
      const rowFromBottom = row; // row 0 = bottom
      const y = totalH - PAD_Y - NODE_SIZE / 2 - rowFromBottom * ROW_H - 30;
      // Centre the nodes in the row
      const rowWidth = count * COL_W - (COL_W - NODE_SIZE);
      const startX   = (totalW - rowWidth) / 2;
      const x        = startX + colIdx * COL_W + NODE_SIZE / 2;
      nodePositions[node.id] = { x, y };
    });
  });

  const canEnter = pendingNode
    && reachable.some(r => r.id === pendingNode.id)
    && !map.clearedNodeIds.includes(pendingNode.id)
    && pendingNode.type !== NodeType.START;

  return (
    <div style={{
      minHeight:"100vh",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      display:"flex", flexDirection:"column",
      position:"relative",
    }}>

      {/* ── Party Screen Overlay ── */}
      {partyOpen && (
        <div style={{
          position:"fixed", inset:0, zIndex:1000,
          background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}
          onClick={e => { if(e.target === e.currentTarget) setPartyOpen(false); }}
        >
          <div style={{
            width:"min(900px, 95vw)", maxHeight:"90vh",
            overflow:"auto", borderRadius:12,
            boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
          }}>
            <PartyScreen onClose={() => setPartyOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 16px",
        background:"#1a1a10", borderBottom:"2px solid #302818",
        flexWrap:"wrap", gap:8,
      }}>
        <div style={{ fontSize:11, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.08em" }}>
          FLOOR {map.floorNumber}
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#F8D030", fontWeight:900 }}>
            ¥ {gold}
          </span>
          {relics.length > 0 && (
            <span style={{ fontSize:9, color:"#C89010" }}>
              RELICS: {relics.length}
            </span>
          )}
          <button
            onClick={() => setPartyOpen(true)}
            style={{
              fontFamily:"'Courier New', monospace",
              fontSize:10, fontWeight:900,
              background:"#252514", color:"#E8E8D0",
              border:"2px solid #504838", borderRadius:5,
              padding:"5px 14px", cursor:"pointer",
              letterSpacing:"0.08em",
            }}
          >
            ⚔ PARTY
          </button>
        </div>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── Map canvas ── */}
        <div style={{
          flex:1, overflowY:"auto", overflowX:"auto",
          padding:"20px",
          display:"flex", justifyContent:"center",
        }}>
          <div style={{ position:"relative", width:totalW, height:totalH, flexShrink:0 }}>

            {/* Connection lines behind nodes */}
            <ConnectorLines
              nodes={map.nodes}
              nodePositions={nodePositions}
              clearedIds={map.clearedNodeIds}
            />

            {/* Nodes */}
            {map.nodes.map(node => {
              const pos      = nodePositions[node.id];
              if (!pos) return null;
              const meta     = NODE_META[node.type] || NODE_META[NodeType.COMBAT];
              const size     = node.type === NodeType.BOSS ? NODE_SIZE : 40;
              const isCur    = node.id === pendingNodeId;
              const isReach  = reachable.some(r => r.id === node.id);
              const isClr    = map.clearedNodeIds.includes(node.id);

              return (
                <div key={node.id} style={{
                  position:"absolute",
                  left: pos.x - size / 2,
                  top:  pos.y - size / 2 - 14, // -14 to leave room for label
                }}>
                  <MapNode
                    node={node}
                    isCurrent={isCur}
                    isReachable={isReach}
                    isCleared={isClr}
                    onClick={() => setPendingNodeId(node.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{
          width:260, flexShrink:0,
          background:"#141410", borderLeft:"2px solid #252514",
          padding:"16px",
          overflowY:"auto",
          display:"flex", flexDirection:"column", gap:16,
        }}>

          {/* Current node info */}
          {pendingNode && (
            <div style={{
              background:"#1a1a10", border:"2px solid #302818",
              borderRadius:8, padding:"12px",
            }}>
              <div style={{ fontSize:9, color:"#504838", letterSpacing:"0.1em", marginBottom:6 }}>
                CURRENT NODE
              </div>
              <div style={{
                display:"flex", alignItems:"center", gap:8, marginBottom:8,
              }}>
                <span style={{
                  fontSize:20,
                  color:(NODE_META[pendingNode.type] || NODE_META[NodeType.COMBAT]).color,
                }}>
                  {(NODE_META[pendingNode.type] || NODE_META[NodeType.COMBAT]).icon}
                </span>
                <div>
                  <div style={{ fontSize:12, fontWeight:900, color:"#E8E8D0" }}>
                    {(NODE_META[pendingNode.type] || NODE_META[NodeType.COMBAT]).label}
                  </div>
                  <div style={{ fontSize:8, color:"#504838" }}>
                    {map.clearedNodeIds.includes(pendingNode.id) ? "Cleared" : "Not yet entered"}
                  </div>
                </div>
              </div>

              {canEnter && (
                <button
                  onClick={() => {
                    dispatch(RunActions.moveToNode(pendingNode.id));
                    setTimeout(() => dispatch(RunActions.enterNode()), 0);
                  }}
                  style={{
                    width:"100%",
                    fontFamily:"'Courier New', monospace",
                    fontSize:11, fontWeight:900,
                    background:"#E8E8D0", color:"#302810",
                    border:"3px solid #807860",
                    borderRadius:5, padding:"8px",
                    cursor:"pointer", letterSpacing:"0.1em",
                    boxShadow:"0 3px 0 #504838",
                  }}
                  onMouseDown={e => e.currentTarget.style.transform="translateY(3px)"}
                  onMouseUp={e   => e.currentTarget.style.transform="none"}
                  onMouseLeave={e=> e.currentTarget.style.transform="none"}
                >
                  ENTER ▶
                </button>
              )}
            </div>
          )}

          {/* Node legend */}
          <div>
            <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.1em", marginBottom:8 }}>
              LEGEND
            </div>
            {Object.entries(NODE_META).filter(([t]) => t !== NodeType.START).map(([type, meta]) => (
              <div key={type} style={{
                display:"flex", alignItems:"center", gap:6, marginBottom:4,
              }}>
                <span style={{ fontSize:12, color:meta.color, minWidth:16 }}>{meta.icon}</span>
                <span style={{ fontSize:9, color:"#605840" }}>{meta.label}</span>
              </div>
            ))}
          </div>

          {/* Party */}
          <div>
            <div style={{ fontSize:8, color:"#403828", letterSpacing:"0.1em", marginBottom:8 }}>
              PARTY
            </div>
            <PartyBar party={party} />
          </div>
        </div>
      </div>
    </div>
  );
}
