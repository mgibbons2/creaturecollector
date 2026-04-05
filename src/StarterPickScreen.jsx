// ============================================================
//  StarterPickScreen.jsx
//  One card per starter creature (6 total, one per type).
//  Click a card to preview, confirm to start the run.
// ============================================================

import { useState } from "react";
import { useRun, RunActions } from "./RunContext.jsx";
import { STARTER_CREATURES } from "./creatureDefs.js";

const TYPE_COLORS = {
  fire:      { light:"#FF9741", mid:"#DD6610", dark:"#7A2410", bg:"#2a1208", badge:"#FFD4B8" },
  water:     { light:"#74BCFF", mid:"#2B7FE8", dark:"#0E3577", bg:"#081828", badge:"#B8D8FF" },
  earth:     { light:"#A8D070", mid:"#4A8C2A", dark:"#1A4A08", bg:"#0e1e08", badge:"#C8E8A8" },
  wind:      { light:"#AAC8FF", mid:"#6070C8", dark:"#283080", bg:"#101228", badge:"#C8D0F8" },
  shadow:    { light:"#C880FF", mid:"#7038A8", dark:"#2A1050", bg:"#140820", badge:"#D8B8F8" },
  light:     { light:"#FFD060", mid:"#C89010", dark:"#604000", bg:"#201808", badge:"#FFE898" },
};

const TYPE_SHAPES = {
  fire:   "M60,20 C60,20 70,40 55,55 C70,45 80,60 65,75 C75,65 85,75 75,90 C90,75 95,55 80,40 C90,50 85,30 75,25 C80,15 70,5 60,20Z M45,60 C45,60 50,70 42,80 C50,72 55,78 50,88 C58,78 60,65 52,55Z",
  water:  "M50,15 C50,15 65,35 65,55 A15,15 0 0,1 35,55 C35,35 50,15 50,15Z M30,50 C30,50 40,65 40,78 A10,10 0 0,1 20,78 C20,65 30,50 30,50Z M70,50 C70,50 80,65 80,78 A10,10 0 0,1 60,78 C60,65 70,50 70,50Z",
  earth:  "M20,80 L50,20 L80,80Z M35,75 L50,45 L65,75Z M15,90 L35,90 L25,70Z M65,90 L85,90 L75,70Z",
  wind:   "M15,50 C25,35 45,30 55,50 C45,42 50,55 40,65 C55,55 65,65 55,80 C70,65 75,45 60,35 C75,40 85,25 70,20 C80,12 70,5 60,15 C55,8 45,5 40,15 C25,10 15,25 15,50Z",
  shadow: "M50,10 L58,35 L85,35 L63,52 L72,78 L50,62 L28,78 L37,52 L15,35 L42,35Z",
  light:  "M50,15 L55,38 L78,30 L62,48 L78,65 L55,58 L50,80 L45,58 L22,65 L38,48 L22,30 L45,38Z",
};

const CREATURE_SHAPES = {
  "emberfox": "M50,26 C44,26 38,30 37,36 C36,42 38,48 42,50 C40,54 38,60 38,66 L34,82 C33,84 35,86 37,85 L40,84 C41,83 42,82 42,80 L44,72 C46,74 50,75 54,74 L56,72 L58,80 C58,82 59,83 60,84 L63,85 C65,86 67,84 66,82 L62,66 C62,60 60,54 58,50 C62,48 64,42 63,36 C62,30 56,26 50,26Z M41,34 C39,28 40,22 44,20 C46,18 48,22 46,26Z M59,34 C61,28 60,22 56,20 C54,18 52,22 54,26Z M44,38 C44,34 47,32 50,32 C53,32 56,34 56,38 C56,44 53,47 50,47 C47,47 44,44 44,38Z",
  "tidepup": "M50,28 C42,28 35,34 34,42 C33,50 37,58 44,62 L42,72 L38,82 C37,85 40,87 42,85 L46,83 L48,74 C49,76 50,77 51,76 L52,74 L54,83 L58,85 C60,87 63,85 62,82 L58,72 L56,62 C63,58 67,50 66,42 C65,34 58,28 50,28Z M38,36 C32,34 27,38 26,44 C25,50 29,56 35,57 C31,53 30,46 33,40Z M62,36 C68,34 73,38 74,44 C75,50 71,56 65,57 C69,53 70,46 67,40Z M43,36 C43,30 46,27 50,27 C54,27 57,30 57,36 C57,44 54,49 50,49 C46,49 43,44 43,36Z M40,38 C38,32 40,26 44,24 C46,22 48,26 46,30Z M60,38 C62,32 60,26 56,24 C54,22 52,26 54,30Z",
  "stonepup": "M50,30 C42,30 36,36 35,43 C34,50 38,58 44,62 L42,72 L38,82 C37,85 40,87 42,86 L46,83 L48,74 L52,74 L54,83 L58,86 C60,87 63,85 62,82 L58,72 L56,62 C62,58 66,50 65,43 C64,36 58,30 50,30Z M38,38 C32,34 28,28 32,23 L38,30Z M62,38 C68,34 72,28 68,23 L62,30Z M42,38 C42,32 46,28 50,28 C54,28 58,32 58,38 C58,46 54,52 50,52 C46,52 42,46 42,38Z M34,44 C26,44 22,52 25,58 C27,63 32,64 35,61Z M66,44 C74,44 78,52 75,58 C73,63 68,64 65,61Z M48,52 L44,62 L50,65 L56,62 L52,52Z",
  "breezekit": "M50,28 C43,28 37,33 36,40 C35,47 38,55 43,58 L41,68 L38,78 C37,81 40,83 42,82 L45,79 L48,68 L52,68 L55,79 L58,82 C60,83 63,81 62,78 L59,68 L57,58 C62,55 65,47 64,40 C63,33 57,28 50,28Z M40,34 C36,28 37,22 42,20 C44,19 46,22 44,26Z M60,34 C64,28 63,22 58,20 C56,19 54,22 56,26Z M43,36 C43,30 46,26 50,26 C54,26 57,30 57,36 C57,44 54,50 50,50 C46,50 43,44 43,36Z M36,42 C28,40 22,44 21,51 C20,58 26,63 33,62Z M64,42 C72,40 78,44 79,51 C80,58 74,63 67,62Z",
  "duskrat": "M50,30 C43,30 37,35 36,42 C35,49 38,57 43,61 L40,71 L37,81 C36,84 39,86 41,85 L44,82 L47,71 L53,71 L56,82 L59,85 C61,86 64,84 63,81 L60,71 L57,61 C62,57 65,49 64,42 C63,35 57,30 50,30Z M38,36 C33,28 35,21 41,20 C43,18 46,23 44,27Z M62,36 C67,28 65,21 59,20 C57,18 54,23 56,27Z M43,38 C43,32 46,28 50,28 C54,28 57,32 57,38 C57,46 54,52 50,52 C46,52 43,46 43,38Z M54,72 C60,78 74,82 78,76 C82,70 78,62 72,62 C70,66 64,68 60,64Z M35,44 C27,42 22,48 24,55 C26,60 32,62 36,58Z M65,44 C73,42 78,48 76,55 C74,60 68,62 64,58Z",
  "glowpup": "M50,28 C42,28 36,34 35,41 C34,48 37,56 43,60 L40,70 L37,80 C36,83 39,85 41,84 L44,81 L47,70 L53,70 L56,81 L59,84 C61,85 64,83 63,80 L60,70 L57,60 C63,56 66,48 65,41 C64,34 58,28 50,28Z M38,34 C33,26 35,20 41,19 C43,18 46,22 44,26Z M62,34 C67,26 65,20 59,19 C57,18 54,22 56,26Z M43,36 C43,30 46,26 50,26 C54,26 57,30 57,36 C57,44 54,50 50,50 C46,50 43,44 43,36Z M36,42 C28,40 23,46 25,53 C27,58 33,60 37,56Z M64,42 C72,40 77,46 75,53 C73,58 67,60 63,56Z M50,26 C50,26 48,18 46,14 C44,10 46,8 50,8 C54,8 56,10 54,14 C52,18 50,26 50,26Z",
};

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
        {(() => {
          const shapeKey = baby.name.toLowerCase().replace(/\s/g, "");
          const shape = CREATURE_SHAPES[shapeKey] || CREATURE_SHAPES[def.id] || "";
          const gradId = `sg-${def.id}`;
          return (
            <svg width={80} height={80} viewBox="0 0 100 100" style={{ overflow:"visible",
              filter:`drop-shadow(0 4px 14px ${col.mid}99)` }}>
              <defs>
                <linearGradient id={gradId} x1="15%" y1="0%" x2="85%" y2="100%">
                  <stop offset="0%"   stopColor={col.light} />
                  <stop offset="55%"  stopColor={col.mid} />
                  <stop offset="100%" stopColor={col.dark} />
                </linearGradient>
              </defs>
              <ellipse cx="50" cy="97" rx="24" ry="4" fill={col.dark} opacity="0.2" />
              <path d={shape} fill={col.dark} opacity="0.25" transform="translate(2,4)" />
              <path d={shape} fill={`url(#${gradId})`}
                stroke={col.dark} strokeWidth="1.2"
                strokeLinejoin="round" strokeLinecap="round" />
              <path d={shape} fill={col.light} opacity="0.2"
                style={{ clipPath:"inset(0 0 60% 0)" }} />
            </svg>
          );
        })()}
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
      maxWidth:340,
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
      onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(5px)"}
      onMouseUp={e   => e.currentTarget.style.transform="translateY(0)"}
      onMouseLeave={e=> e.currentTarget.style.transform="translateY(0)"}
    >
      {label} ▶
    </button>
  );
}
