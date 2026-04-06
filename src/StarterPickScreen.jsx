// ============================================================
//  StarterPickScreen.jsx
//  One card per starter creature (6 total, one per type).
//  Click a card to preview, confirm to start the run.
// ============================================================

import { useState } from "react";
import { useIsMobile } from "./useMediaQuery.js";
import { useRun, RunActions } from "./RunContext.jsx";
import { STARTER_CREATURES } from "./creatureDefs.js";
import { TYPE_COLORS, TYPE_SHAPES } from "./shared.js";

function StatBar({ label, value, max = 20 }) {
  const col = TYPE_COLORS;
  const pct = (value / max) * 100;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
      <span style={{ fontSize:8, fontWeight:900, color:"#807860", minWidth:28, letterSpacing:"0.06em" }}>
        {label}
      </span>
      <div style={{ flex:1, height:5, background:"#302818", borderRadius:3, overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${pct}%`,
          background:"#A89050", borderRadius:3,
          transition:"width 0.3s ease",
        }} />
      </div>
      <span style={{ fontSize:8, color:"#605840", minWidth:16, textAlign:"right" }}>{value}</span>
    </div>
  );
}

function StarterCard({ def, isSelected, onClick }) {
  const col  = TYPE_COLORS[def.type] || TYPE_COLORS.fire;
  const baby = def.stages.baby;

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? col.bg : "#1a1a10",
        border:`3px solid ${isSelected ? col.mid : "#302818"}`,
        borderRadius:10,
        padding:"16px 14px",
        cursor:"pointer",
        transition:"all 0.15s",
        transform: isSelected ? "translateY(-8px)" : "none",
        boxShadow: isSelected ? `0 12px 30px ${col.mid}44` : "0 2px 8px rgba(0,0,0,0.4)",
        minWidth:150, maxWidth:170,
        fontFamily:"'Courier New', monospace",
        userSelect:"none",
      }}
    >
      {/* Type badge */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{
          fontSize:8, fontWeight:900, padding:"2px 7px",
          background: col.mid + "33", color: col.light,
          border:`1px solid ${col.mid}55`,
          borderRadius:3, letterSpacing:"0.1em", textTransform:"uppercase",
        }}>{def.type}</span>
        {isSelected && (
          <span style={{ fontSize:9, color: col.light, fontWeight:900 }}>★ PICK</span>
        )}
      </div>

      {/* Silhouette */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
        <svg width={70} height={70} viewBox="0 0 100 100"
          style={{ filter:`drop-shadow(0 4px 12px ${col.mid}88)` }}>
          <defs>
            <linearGradient id={`sg-${def.type}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={col.light} />
              <stop offset="100%" stopColor={col.mid} />
            </linearGradient>
          </defs>
          <path d={TYPE_SHAPES[def.type]}
            fill={`url(#sg-${def.type})`}
            stroke={col.dark} strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Name */}
      <div style={{
        fontSize:13, fontWeight:900, color:"#E8E8D0",
        textAlign:"center", letterSpacing:"0.04em", marginBottom:2,
      }}>
        {baby.name.toUpperCase()}
      </div>
      <div style={{
        fontSize:8, color:"#605840", textAlign:"center",
        letterSpacing:"0.08em", marginBottom:10,
      }}>
        Lv 1 · Baby
      </div>

      {/* Stat bars */}
      <div style={{ borderTop:`1px solid ${col.mid}22`, paddingTop:8 }}>
        <StatBar label="STR" value={baby.stats.strength} />
        <StatBar label="DEX" value={baby.stats.dexterity} />
        <StatBar label="INT" value={baby.stats.intelligence} />
        <StatBar label="CON" value={baby.stats.constitution} />
        <StatBar label="WIS" value={baby.stats.wisdom} />
      </div>

      {/* HP + AC */}
      <div style={{
        display:"flex", justifyContent:"space-between", marginTop:8,
        fontSize:9, color:"#807860",
      }}>
        <span>HP <b style={{ color:"#A8D070" }}>{def.baseHp}</b></span>
        <span>AC <b style={{ color:"#74BCFF" }}>{baby.armorClass}</b></span>
      </div>
    </div>
  );
}

function PreviewPanel({ def }) {
  if (!def) return null;
  const col  = TYPE_COLORS[def.type] || TYPE_COLORS.fire;
  const baby = def.stages.baby;

  return (
    <div style={{
      background:"#1a1a10",
      border:`2px solid ${col.mid}44`,
      borderRadius:10, padding:"20px",
      maxWidth:400, width:"100%",
      fontFamily:"'Courier New', monospace",
    }}>
      <div style={{ fontSize:10, color: col.light, fontWeight:900, letterSpacing:"0.1em", marginBottom:8 }}>
        {def.type.toUpperCase()} TYPE
      </div>
      <div style={{ fontSize:15, fontWeight:900, color:"#E8E8D0", marginBottom:4 }}>
        {baby.name}
        <span style={{ fontSize:10, color:"#605840", fontWeight:400, marginLeft:8 }}>
          → {def.stages.adult.name} → {def.stages.elder.name}
        </span>
      </div>
      <p style={{ fontSize:10, color:"#807860", lineHeight:1.7, margin:"8px 0 12px" }}>
        {baby.description}
      </p>

      {/* Passive tags */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:12 }}>
        {def.passiveTags.map(t => (
          <span key={t} style={{
            fontSize:8, fontWeight:900, padding:"1px 6px",
            background: col.mid + "22", color: col.light,
            border:`1px solid ${col.mid}44`,
            borderRadius:3, letterSpacing:"0.08em", textTransform:"uppercase",
          }}>{t}</span>
        ))}
      </div>

      {/* Starter deck preview */}
      <div style={{ fontSize:9, color:"#504838", letterSpacing:"0.08em", marginBottom:6 }}>
        STARTER DECK ({def.starterDeck.length} cards)
      </div>
      <div style={{
        display:"flex", flexWrap:"wrap", gap:4,
        maxHeight:80, overflow:"hidden",
      }}>
        {[...new Set(def.starterDeck)].map(cardId => (
          <span key={cardId} style={{
            fontSize:8, padding:"2px 6px",
            background:"#252514", border:"1px solid #303020",
            borderRadius:3, color:"#A09070",
            textTransform:"capitalize",
          }}>
            {cardId.replace(/_/g," ")}
            {def.starterDeck.filter(c=>c===cardId).length > 1
              ? ` ×${def.starterDeck.filter(c=>c===cardId).length}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StarterPickScreen() {
  const isMobile = useIsMobile();
  const { dispatch }    = useRun();
  const starters        = Object.values(STARTER_CREATURES);
  const [picked, setPicked] = useState(null);

  const selectedDef = picked ? STARTER_CREATURES[picked] : null;

  return (
    <div style={{
      minHeight:"100vh",
      width:"100%",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      padding:"32px 20px",
      boxSizing:"border-box",
      overflowY:"auto",
    }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:32, width:"100%" }}>
        <div style={{
          fontSize:10, color:"#504838", letterSpacing:"0.25em",
          textTransform:"uppercase", marginBottom:8,
        }}>
          Step 1 of 1
        </div>
        <h2 style={{
          fontSize:26, fontWeight:900, color:"#E8E8D0",
          letterSpacing:"0.08em", margin:0,
        }}>
          CHOOSE YOUR STARTER
        </h2>
        <p style={{ fontSize:10, color:"#605840", marginTop:6, letterSpacing:"0.06em" }}>
          This creature begins your journey. Others can be caught along the way.
        </p>
      </div>

      {/* Cards row */}
      <div style={{
        display:"flex", flexWrap:"wrap", gap:12,
        justifyContent:"center", marginBottom:32,
        width:"100%",
      }}>
        {starters.map(def => (
          <StarterCard
            key={def.id}
            def={def}
            isSelected={picked === def.id}
            onClick={() => setPicked(def.id)}
          />
        ))}
      </div>

      {/* Preview + confirm */}
      {selectedDef && (
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:16,
        }}>
          <PreviewPanel def={selectedDef} />
          <ConfirmButton
            label={`START WITH ${selectedDef.stages.baby.name.toUpperCase()}`}
            color={TYPE_COLORS[selectedDef.type]}
            onClick={() => dispatch(RunActions.startRun(selectedDef.id))}
          />
        </div>
      )}

      {!selectedDef && (
        <p style={{ textAlign:"center", fontSize:10, color:"#303020", letterSpacing:"0.1em" }}>
          ← SELECT A CREATURE TO SEE DETAILS
        </p>
      )}

      {/* Back */}
      <div style={{ textAlign:"center", marginTop:20 }}>
        <button
          onClick={() => dispatch(RunActions.returnToTitle())}
          style={{
            background:"transparent", border:"none",
            color:"#403828", fontSize:10, cursor:"pointer",
            fontFamily:"'Courier New', monospace",
            letterSpacing:"0.1em", textDecoration:"underline",
          }}
        >
          ← BACK TO TITLE
        </button>
      </div>
    </div>
  );
}

function ConfirmButton({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily:"'Courier New', monospace",
        fontSize:13, fontWeight:900,
        background: color.mid, color:"#fff",
        border:`4px solid ${color.dark}`,
        borderRadius:6,
        padding:"11px 32px",
        cursor:"pointer",
        letterSpacing:"0.1em",
        boxShadow:`0 5px 0 ${color.dark}, 0 0 20px ${color.mid}44`,
        transition:"all 0.08s",
      }}
      onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"}
      onMouseUp={e   => e.currentTarget.style.transform="translateY(0)"}
      onMouseLeave={e=> e.currentTarget.style.transform="translateY(0)"}
    >
      {label} ▶
    </button>
  );
}
