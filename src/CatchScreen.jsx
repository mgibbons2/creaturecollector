// ============================================================
//  CatchScreen.jsx
//  Post-combat catch attempt. Shows defeated enemy creatures,
//  lets player pick one to attempt catching, animates the roll,
//  then shows success/fail before proceeding to rewards.
//
//  Flow:
//    Pick target → throw animation → result → continue
//    OR: Skip → go straight to reward
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useRun, RunActions } from "./RunContext.jsx";
import { CREATURE_DEFS } from "./creatureDefs.js";

// ─── CONSTANTS ───────────────────────────────────────────────

const TYPE_COLORS = {
  fire:      { light:"#FF9741", mid:"#DD6610", dark:"#7A2410", bg:"#2a1208" },
  water:     { light:"#74BCFF", mid:"#2B7FE8", dark:"#0E3577", bg:"#081828" },
  earth:     { light:"#A8D070", mid:"#4A8C2A", dark:"#1A4A08", bg:"#0e1e08" },
  wind:      { light:"#AAC8FF", mid:"#6070C8", dark:"#283080", bg:"#101228" },
  shadow:    { light:"#C880FF", mid:"#7038A8", dark:"#2A1050", bg:"#140820" },
  light:     { light:"#FFD060", mid:"#C89010", dark:"#604000", bg:"#201808" },
  colorless: { light:"#C8C8C8", mid:"#888888", dark:"#333333", bg:"#181818" },
};

const TYPE_SHAPES = {
  fire:      "M60,20 C60,20 70,40 55,55 C70,45 80,60 65,75 C75,65 85,75 75,90 C90,75 95,55 80,40Z",
  water:     "M50,15 C50,15 65,35 65,55 A15,15 0 0,1 35,55 C35,35 50,15 50,15Z",
  earth:     "M20,80 L50,20 L80,80Z",
  wind:      "M15,50 C25,35 45,30 55,50 C45,42 50,55 40,65 C55,55 65,65 55,80 C70,65 75,45 60,35Z",
  shadow:    "M50,10 L58,35 L85,35 L63,52 L72,78 L50,62 L28,78 L37,52 L15,35 L42,35Z",
  light:     "M50,15 L55,38 L78,30 L62,48 L78,65 L55,58 L50,80 L45,58 L22,65 L38,48 L22,30 L45,38Z",
  colorless: "M25,25 L75,25 L75,75 L25,75Z",
};

// Catch animation phases
const PHASE = {
  PICK:    "pick",      // Choosing which creature to attempt
  THROW:   "throw",     // Ball arc animation
  SHAKE:   "shake",     // Ball shaking (3 shakes)
  SUCCESS: "success",   // Caught!
  FAIL:    "fail",      // Broke free
  DONE:    "done",      // Showing final state before continuing
};

// ─── CREATURE CARD ───────────────────────────────────────────

function TargetCard({ candidate, isSelected, isDisabled, onClick }) {
  const { creature, probability } = candidate;
  const col  = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;
  const pct  = Math.round((creature.currentHp / creature.maxHp) * 100);
  const catchPct = Math.round(probability * 100);
  const hpCol = pct > 50 ? "#40C850" : pct > 20 ? "#F8D030" : "#F85840";

  // Catch chance colour
  const catchCol = catchPct >= 60 ? "#40C850"
                 : catchPct >= 30 ? "#F8D030"
                 : "#E84040";

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      style={{
        background: isSelected ? col.bg : "#1a1a10",
        border: `3px solid ${isSelected ? col.mid : isDisabled ? "#252514" : col.mid + "55"}`,
        borderRadius: 10,
        padding: "16px 14px",
        cursor: isDisabled ? "default" : "pointer",
        opacity: isDisabled ? 0.35 : 1,
        transform: isSelected ? "translateY(-6px)" : "none",
        transition: "all 0.2s",
        boxShadow: isSelected ? `0 10px 28px ${col.mid}55` : "none",
        minWidth: 160, flex: 1,
        fontFamily: "'Courier New', monospace",
        userSelect: "none",
      }}
    >
      {/* Silhouette */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
        <svg width={64} height={64} viewBox="0 0 100 100"
          style={{ filter:`drop-shadow(0 4px 12px ${col.mid}88)` }}>
          <defs>
            <linearGradient id={`cg-${creature.type}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={col.light} />
              <stop offset="100%" stopColor={col.mid} />
            </linearGradient>
          </defs>
          <path d={TYPE_SHAPES[creature.type] || TYPE_SHAPES.colorless}
            fill={`url(#cg-${creature.type})`}
            stroke={col.dark} strokeWidth="2" strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Name + type */}
      <div style={{ textAlign:"center", marginBottom:8 }}>
        <div style={{ fontSize:13, fontWeight:900, color:"#E8E8D0", letterSpacing:"0.04em" }}>
          {creature.name}
        </div>
        <div style={{ fontSize:9, color:col.light, marginTop:2 }}>
          {creature.type.toUpperCase()} · Lv{creature.level}
        </div>
      </div>

      {/* HP bar */}
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
          <span style={{ fontSize:8, fontWeight:900, color:"#38A018" }}>HP</span>
          <span style={{ fontSize:8, color:"#605840" }}>{creature.currentHp}/{creature.maxHp}</span>
        </div>
        <div style={{ height:6, background:"#302818", borderRadius:3, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:hpCol, borderRadius:3 }} />
        </div>
      </div>

      {/* Catch chance */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"#141410", border:`1px solid ${catchCol}44`,
        borderRadius:5, padding:"5px 8px",
      }}>
        <span style={{ fontSize:8, color:"#605840", letterSpacing:"0.06em" }}>CATCH CHANCE</span>
        <span style={{ fontSize:13, fontWeight:900, color:catchCol }}>
          {catchPct}%
        </span>
      </div>

      {/* Evolution preview */}
      {CREATURE_DEFS[creature.defId] && (
        <div style={{ marginTop:8, fontSize:7.5, color:"#403828", textAlign:"center", lineHeight:1.5 }}>
          {CREATURE_DEFS[creature.defId].stages.baby.name}
          {" → "}
          {CREATURE_DEFS[creature.defId].stages.adult.name}
          {" → "}
          {CREATURE_DEFS[creature.defId].stages.elder.name}
        </div>
      )}
    </div>
  );
}

// ─── CATCH BALL ANIMATION ────────────────────────────────────

function CatchBall({ phase, success, creature }) {
  const col = TYPE_COLORS[creature?.type] || TYPE_COLORS.colorless;

  const ballStyle = {
    width: 48, height: 48,
    borderRadius: "50%",
    border: "4px solid #302818",
    position: "relative",
    overflow: "hidden",
    boxShadow: `0 0 20px ${col.mid}66`,
    flexShrink: 0,
  };

  // Ball colours change based on result
  const topColor = phase === PHASE.SUCCESS ? col.mid
    : phase === PHASE.FAIL ? "#C84040"
    : "#E8E8D0";
  const bottomColor = phase === PHASE.SUCCESS ? col.dark
    : phase === PHASE.FAIL ? "#802020"
    : "#686858";

  const shaking = phase === PHASE.SHAKE;
  const opening = phase === PHASE.FAIL;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <div style={{
        ...ballStyle,
        animation: shaking ? "ballShake 0.4s ease-in-out 3" : opening ? "ballOpen 0.5s ease-out forwards" : "none",
      }}>
        {/* Top half */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:"50%",
          background: topColor,
          borderBottom: "2px solid #302818",
        }} />
        {/* Bottom half */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:"50%",
          background: bottomColor,
        }} />
        {/* Centre button */}
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          width:12, height:12, borderRadius:"50%",
          background: "#E8E8D0",
          border: "2px solid #302818",
          zIndex:2,
        }} />
      </div>

      {/* Phase label */}
      <div style={{
        fontSize:10, fontWeight:900, letterSpacing:"0.08em",
        color: phase === PHASE.SUCCESS ? "#40C850"
             : phase === PHASE.FAIL    ? "#E84040"
             : "#807860",
      }}>
        {phase === PHASE.THROW   ? "●  ●  ●" :
         phase === PHASE.SHAKE   ? "SHAKING..." :
         phase === PHASE.SUCCESS ? "CAUGHT!" :
         phase === PHASE.FAIL    ? "BROKE FREE!" :
         ""}
      </div>
    </div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function CatchScreen() {
  const { run, dispatch } = useRun();
  const { pendingCatch, party } = run;
  const candidates = pendingCatch?.candidates ?? [];

  const [animPhase, setAnimPhase]     = useState(PHASE.PICK);
  const [selected, setSelected]       = useState(null);  // index into candidates
  const [result, setResult]           = useState(null);  // { success, creature }
  const partyFull = party.length >= 6;

  // Trigger the catch animation sequence
  function throwBall() {
    if (selected === null) return;
    const candidate = candidates[selected];
    const success   = Math.random() < candidate.probability;

    setAnimPhase(PHASE.THROW);

    setTimeout(() => setAnimPhase(PHASE.SHAKE), 800);
    setTimeout(() => {
      setAnimPhase(success ? PHASE.SUCCESS : PHASE.FAIL);
      setResult({ success, creature: candidate.creature });
    }, 800 + 1200); // throw + 3 shakes
    setTimeout(() => {
      setAnimPhase(PHASE.DONE);
    }, 800 + 1200 + 1200); // then show done
  }

  function finish() {
    if (!result) {
      dispatch(RunActions.skipCatch());
      return;
    }
    dispatch(RunActions.attemptCatch(result.creature, result.success));
  }

  // ── Edge cases ──
  if (!pendingCatch || candidates.length === 0) {
    dispatch(RunActions.skipCatch());
    return null;
  }

  const isDone    = animPhase === PHASE.DONE;
  const isAnimating = [PHASE.THROW, PHASE.SHAKE, PHASE.SUCCESS, PHASE.FAIL].includes(animPhase);
  const activeCandidate = selected !== null ? candidates[selected] : null;

  return (
    <div style={{
      minHeight:"100vh",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      display:"flex", flexDirection:"column",
      alignItems:"center",
      padding:"32px 20px",
      boxSizing:"border-box",
    }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:10, color:"#504838", letterSpacing:"0.2em", marginBottom:8 }}>
          ✦ CATCH A CREATURE ✦
        </div>
        <h2 style={{
          fontSize:22, fontWeight:900, color:"#E8E8D0",
          letterSpacing:"0.08em", margin:"0 0 6px",
        }}>
          {animPhase === PHASE.PICK
            ? "Choose your target"
            : animPhase === PHASE.THROW
            ? "Ball in the air..."
            : animPhase === PHASE.SHAKE
            ? "So close..."
            : animPhase === PHASE.SUCCESS
            ? `${result?.creature.name} was caught!`
            : animPhase === PHASE.FAIL
            ? `${result?.creature.name} broke free!`
            : result?.success
            ? `${result?.creature.name} joined your roster!`
            : "The creature escaped."}
        </h2>
        {animPhase === PHASE.PICK && (
          <p style={{ fontSize:9, color:"#504838", letterSpacing:"0.06em", margin:0 }}>
            You can attempt to catch one creature. Lower HP = higher chance.
            {partyFull && " Your party is full — caught creature goes to your roster."}
          </p>
        )}
      </div>

      {/* Animation phase — ball + creature */}
      {isAnimating && activeCandidate && (
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:24,
          marginBottom:24,
        }}>
          {/* Creature silhouette — wobbles on fail */}
          <div style={{
            animation: animPhase === PHASE.FAIL ? "creatureEscape 0.6s ease-out forwards" : "none",
          }}>
            <svg width={80} height={80} viewBox="0 0 100 100"
              style={{
                filter:`drop-shadow(0 4px 16px ${TYPE_COLORS[activeCandidate.creature.type]?.mid}88)`,
                animation: animPhase === PHASE.SUCCESS ? "creatureCaught 0.5s ease-out forwards" : "none",
              }}>
              <path
                d={TYPE_SHAPES[activeCandidate.creature.type] || TYPE_SHAPES.colorless}
                fill={TYPE_COLORS[activeCandidate.creature.type]?.mid || "#888"}
                opacity={animPhase === PHASE.SUCCESS ? 0.4 : 1}
                stroke={TYPE_COLORS[activeCandidate.creature.type]?.dark || "#333"}
                strokeWidth="2"
              />
            </svg>
          </div>

          <CatchBall
            phase={animPhase}
            success={result?.success}
            creature={activeCandidate.creature}
          />
        </div>
      )}

      {/* Done state — summary */}
      {isDone && result && (
        <div style={{
          background: result.success ? "#0e1e0e" : "#1e0e0e",
          border:`3px solid ${result.success ? "#286020" : "#802020"}`,
          borderRadius:10, padding:"20px 28px",
          textAlign:"center", marginBottom:24,
          maxWidth:320,
        }}>
          <div style={{ fontSize:28, marginBottom:8 }}>
            {result.success ? "✦" : "✕"}
          </div>
          <div style={{ fontSize:14, fontWeight:900, color:"#E8E8D0", marginBottom:6 }}>
            {result.success ? `${result.creature.name} caught!` : "Better luck next time."}
          </div>
          <p style={{ fontSize:9, color:"#605840", lineHeight:1.6, margin:0 }}>
            {result.success
              ? partyFull
                ? `${result.creature.name} has been added to your roster. Swap them into your party from the party screen.`
                : `${result.creature.name} has joined your party!`
              : `${result.creature.name} was too strong and broke free.`}
          </p>
        </div>
      )}

      {/* Pick phase — candidate cards */}
      {animPhase === PHASE.PICK && (
        <>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginBottom:20, width:"100%", maxWidth:560 }}>
            {candidates.map((c, i) => (
              <TargetCard
                key={c.creature.defId + i}
                candidate={c}
                isSelected={selected === i}
                isDisabled={false}
                onClick={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button
              onClick={throwBall}
              disabled={selected === null}
              style={{
                fontFamily:"'Courier New', monospace",
                fontSize:13, fontWeight:900,
                background: selected !== null ? "#E8E8D0" : "#252514",
                color:      selected !== null ? "#302810" : "#403828",
                border:`4px solid ${selected !== null ? "#807860" : "#302818"}`,
                borderRadius:6, padding:"11px 32px",
                cursor: selected !== null ? "pointer" : "not-allowed",
                letterSpacing:"0.1em",
                boxShadow: selected !== null ? "0 5px 0 #504838" : "none",
                transition:"all 0.12s",
              }}
              onMouseDown={e => selected !== null && (e.currentTarget.style.transform="translateY(5px)")}
              onMouseUp={e   => (e.currentTarget.style.transform="none")}
              onMouseLeave={e=> (e.currentTarget.style.transform="none")}
            >
              THROW ◎
            </button>

            <button
              onClick={() => dispatch(RunActions.skipCatch())}
              style={{
                fontFamily:"'Courier New', monospace",
                fontSize:11, fontWeight:900,
                background:"transparent",
                color:"#504838",
                border:"2px solid #302818",
                borderRadius:5, padding:"9px 18px",
                cursor:"pointer", letterSpacing:"0.08em",
              }}
            >
              SKIP →
            </button>
          </div>
        </>
      )}

      {/* Continue button — shown when done */}
      {isDone && (
        <button
          onClick={finish}
          style={{
            fontFamily:"'Courier New', monospace",
            fontSize:13, fontWeight:900,
            background:"#E8E8D0", color:"#302810",
            border:"4px solid #807860",
            borderRadius:6, padding:"11px 36px",
            cursor:"pointer", letterSpacing:"0.1em",
            boxShadow:"0 5px 0 #504838",
            transition:"all 0.08s",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"}
          onMouseUp={e   => e.currentTarget.style.transform="none"}
          onMouseLeave={e=> e.currentTarget.style.transform="none"}
        >
          CONTINUE ▶
        </button>
      )}

      {/* Party preview — show current party state */}
      {animPhase === PHASE.PICK && (
        <div style={{ marginTop:28, width:"100%", maxWidth:560 }}>
          <div style={{ fontSize:8, color:"#302818", letterSpacing:"0.1em", marginBottom:8, textAlign:"center" }}>
            YOUR PARTY ({party.length}/6)
          </div>
          <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
            {party.map((c, i) => {
              const col = TYPE_COLORS[c.type] || TYPE_COLORS.colorless;
              return (
                <div key={i} style={{
                  background:"#1a1a10", border:`1.5px solid ${col.mid}44`,
                  borderRadius:5, padding:"4px 10px",
                  display:"flex", alignItems:"center", gap:5,
                }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:col.mid }} />
                  <span style={{ fontSize:9, fontWeight:900, color:"#E8E8D0" }}>{c.name}</span>
                  <span style={{ fontSize:8, color:col.light }}>Lv{c.level}</span>
                </div>
              );
            })}
            {Array.from({ length: 6 - party.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                background:"transparent", border:"1.5px dashed #252514",
                borderRadius:5, padding:"4px 10px", minWidth:60,
              }}>
                <span style={{ fontSize:8, color:"#252514" }}>OPEN</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes ballShake {
          0%,100% { transform: rotate(0deg); }
          25%      { transform: rotate(-12deg) translateX(-4px); }
          75%      { transform: rotate(12deg) translateX(4px); }
        }
        @keyframes ballOpen {
          0%   { transform: scale(1) rotate(0deg); }
          50%  { transform: scale(1.2) rotate(-15deg); }
          100% { transform: scale(0.6) rotate(20deg); opacity:0; }
        }
        @keyframes creatureCaught {
          0%   { opacity:1; transform:scale(1); }
          50%  { opacity:0.5; transform:scale(0.8); filter:brightness(2); }
          100% { opacity:0.15; transform:scale(0.6); }
        }
        @keyframes creatureEscape {
          0%   { transform: translateX(0) scale(1); opacity:1; }
          30%  { transform: translateX(-8px) scale(1.05); }
          60%  { transform: translateX(8px) scale(1.05); }
          100% { transform: translateX(60px) scale(0.8); opacity:0; }
        }
      `}</style>
    </div>
  );
}
