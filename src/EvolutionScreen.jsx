// ============================================================
//  EvolutionScreen.jsx
//  Dramatic full-screen evolution reveal.
//  Shown as an overlay on MapScreen when any party creature
//  has justEvolved: true.
//
//  Animation sequence:
//    0.0s  — Old form shown, name displayed
//    0.8s  — White flash begins
//    1.2s  — Silhouette morphs to new form (colour shift)
//    2.0s  — Flash fades, new name appears with particle burst
//    2.8s  — Stat comparison slides in
//    4.0s  — CONTINUE button appears
// ============================================================

import { useState, useEffect } from "react";
import { useRun, RunActions } from "./RunContext.jsx";
import { CREATURE_DEFS, getStageName } from "./creatureDefs.js";

// ─── CONSTANTS ───────────────────────────────────────────────

const TYPE_COLORS = {
  fire:      { light:"#FF9741", mid:"#DD6610", dark:"#7A2410" },
  water:     { light:"#74BCFF", mid:"#2B7FE8", dark:"#0E3577" },
  earth:     { light:"#A8D070", mid:"#4A8C2A", dark:"#1A4A08" },
  wind:      { light:"#AAC8FF", mid:"#6070C8", dark:"#283080" },
  shadow:    { light:"#C880FF", mid:"#7038A8", dark:"#2A1050" },
  light:     { light:"#FFD060", mid:"#C89010", dark:"#604000" },
  colorless: { light:"#C8C8C8", mid:"#888888", dark:"#333333" },
};

const TYPE_SHAPES = {
  fire:      "M60,20 C60,20 70,40 55,55 C70,45 80,60 65,75 C75,65 85,75 75,90 C90,75 95,55 80,40 C90,50 85,30 75,25 C80,15 70,5 60,20Z M45,60 C45,60 50,70 42,80 C50,72 55,78 50,88 C58,78 60,65 52,55Z",
  water:     "M50,15 C50,15 65,35 65,55 A15,15 0 0,1 35,55 C35,35 50,15 50,15Z M30,50 C30,50 40,65 40,78 A10,10 0 0,1 20,78 C20,65 30,50 30,50Z M70,50 C70,50 80,65 80,78 A10,10 0 0,1 60,78 C60,65 70,50 70,50Z",
  earth:     "M20,80 L50,20 L80,80Z M35,75 L50,45 L65,75Z M15,90 L35,90 L25,70Z M65,90 L85,90 L75,70Z",
  wind:      "M15,50 C25,35 45,30 55,50 C45,42 50,55 40,65 C55,55 65,65 55,80 C70,65 75,45 60,35 C75,40 85,25 70,20 C80,12 70,5 60,15 C55,8 45,5 40,15 C25,10 15,25 15,50Z",
  shadow:    "M50,10 L58,35 L85,35 L63,52 L72,78 L50,62 L28,78 L37,52 L15,35 L42,35Z",
  light:     "M50,15 L55,38 L78,30 L62,48 L78,65 L55,58 L50,80 L45,58 L22,65 L38,48 L22,30 L45,38Z M50,28 L53,40 L65,36 L56,45 L62,56 L51,52 L50,63 L49,52 L38,56 L44,45 L35,36 L47,40Z",
  colorless: "M25,25 L75,25 L75,75 L25,75Z",
};

const STAGE_LABELS = { baby:"Baby", adult:"Adult", elder:"Elder" };

function statMod(v) { return Math.floor((v - 10) / 2); }

// ─── ANIMATION PHASES ────────────────────────────────────────

const PHASES = {
  OLD_FORM:    0,
  FLASHING:    1,
  NEW_FORM:    2,
  STATS_IN:    3,
  DONE:        4,
};

// ─── PARTICLE BURST ──────────────────────────────────────────

function ParticleBurst({ color, active }) {
  if (!active) return null;
  const particles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * 360;
    const dist  = 80 + Math.random() * 60;
    const size  = 4 + Math.random() * 6;
    const rad   = angle * Math.PI / 180;
    const x     = Math.cos(rad) * dist;
    const y     = Math.sin(rad) * dist;
    const delay = Math.random() * 0.3;
    return { x, y, size, delay, angle };
  });

  return (
    <div style={{
      position:"absolute", inset:0,
      display:"flex", alignItems:"center", justifyContent:"center",
      pointerEvents:"none", zIndex:2,
    }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position:"absolute",
          width:  p.size,
          height: p.size,
          borderRadius: "50%",
          background: color,
          transform: `translate(${p.x}px, ${p.y}px)`,
          opacity: 0,
          animation: `particleFly 0.8s ease-out ${p.delay}s forwards`,
          boxShadow: `0 0 6px ${color}`,
        }} />
      ))}
    </div>
  );
}

// ─── CREATURE SILHOUETTE ─────────────────────────────────────

function EvoSilhouette({ type, size, flashing, newForm }) {
  const col = TYPE_COLORS[type] || TYPE_COLORS.colorless;
  return (
    <div style={{
      position:"relative",
      width: size, height: size,
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <svg
        width={size} height={size}
        viewBox="0 0 100 100"
        style={{
          filter: flashing
            ? "brightness(10) saturate(0)"
            : `drop-shadow(0 0 24px ${col.mid}cc)`,
          transition: flashing
            ? "filter 0.15s ease"
            : "filter 0.6s ease",
          animation: newForm && !flashing ? "evoAppear 0.5s ease-out" : "none",
        }}
      >
        <defs>
          <linearGradient id={`evo-grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={col.light} />
            <stop offset="100%" stopColor={col.mid} />
          </linearGradient>
        </defs>
        <path
          d={TYPE_SHAPES[type] || TYPE_SHAPES.colorless}
          fill={flashing ? "#fff" : `url(#evo-grad-${type})`}
          stroke={flashing ? "#fff" : col.dark}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── STAT COMPARISON ROW ─────────────────────────────────────

function StatRow({ label, before, after }) {
  const delta = after - before;
  const modBefore = statMod(before);
  const modAfter  = statMod(after);
  const modDelta  = modAfter - modBefore;
  const improved  = delta > 0;

  return (
    <div style={{
      display:"flex", alignItems:"center",
      padding:"5px 8px",
      background:"#1a1a10",
      border:"1px solid #252514",
      borderRadius:5,
      gap:8,
      animation:"slideInStat 0.4s ease-out both",
    }}>
      <span style={{
        fontSize:8, fontWeight:900, color:"#504838",
        letterSpacing:"0.08em", minWidth:28,
      }}>
        {label}
      </span>

      {/* Before */}
      <span style={{ fontSize:12, color:"#605840", minWidth:22, textAlign:"right" }}>
        {before}
      </span>
      <span style={{ fontSize:10, color:"#403828" }}>→</span>

      {/* After */}
      <span style={{
        fontSize:13, fontWeight:900,
        color: improved ? "#40C850" : before === after ? "#E8E8D0" : "#E84040",
        minWidth:22,
      }}>
        {after}
      </span>

      {/* Delta */}
      {delta !== 0 && (
        <span style={{
          fontSize:9, fontWeight:900,
          color: improved ? "#40C850" : "#E84040",
          marginLeft:2,
        }}>
          ({improved ? "+" : ""}{delta})
        </span>
      )}

      {/* Modifier */}
      <span style={{
        fontSize:8, color:"#403828", marginLeft:"auto",
      }}>
        mod {modAfter >= 0 ? "+" : ""}{modAfter}
      </span>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function EvolutionScreen({ creature, onDone }) {
  const def = CREATURE_DEFS[creature.defId];
  if (!def) { onDone(); return null; }

  const newStageName = getStageName(creature.level);
  const prevLevel    = creature.level === 3 ? 2 : 4; // level just before evolution
  const prevStage    = getStageName(prevLevel);
  const prevStageDef = def.stages[prevStage];
  const newStageDef  = def.stages[newStageName];

  const col          = TYPE_COLORS[creature.type] || TYPE_COLORS.colorless;
  const [phase, setPhase] = useState(PHASES.OLD_FORM);

  // Advance animation automatically
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(PHASES.FLASHING),  900),
      setTimeout(() => setPhase(PHASES.NEW_FORM),   1600),
      setTimeout(() => setPhase(PHASES.STATS_IN),   2600),
      setTimeout(() => setPhase(PHASES.DONE),        3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const isFlashing = phase === PHASES.FLASHING;
  const showNew    = phase >= PHASES.NEW_FORM;
  const showStats  = phase >= PHASES.STATS_IN;
  const showButton = phase >= PHASES.DONE;

  const displayName = showNew ? newStageDef.name : prevStageDef.name;
  const displayDesc = showNew ? newStageDef.description : prevStageDef.description;

  // Stat keys to compare
  const STAT_KEYS = ["strength","dexterity","intelligence","constitution","wisdom"];
  const STAT_LABELS = { strength:"STR", dexterity:"DEX", intelligence:"INT", constitution:"CON", wisdom:"WIS" };

  // Background flash effect
  const bgOpacity = isFlashing ? 0.95 : 0;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      background:"#0a0a08",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Courier New', monospace",
      overflow:"hidden",
    }}>

      {/* White flash overlay */}
      <div style={{
        position:"absolute", inset:0,
        background:"#fff",
        opacity: bgOpacity,
        pointerEvents:"none",
        transition: isFlashing
          ? "opacity 0.25s ease-in"
          : "opacity 0.5s ease-out",
        zIndex:5,
      }} />

      {/* Ambient glow */}
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(circle at 50% 45%, ${col.mid}18 0%, transparent 70%)`,
        pointerEvents:"none",
        animation: showNew ? "glowPulse 2s ease-in-out infinite" : "none",
      }} />

      {/* Stage label — top */}
      <div style={{
        fontSize:9, fontWeight:900, color:col.light,
        letterSpacing:"0.3em", textTransform:"uppercase",
        marginBottom:16,
        opacity: phase >= PHASES.NEW_FORM ? 1 : 0,
        transition:"opacity 0.5s",
        position:"relative", zIndex:10,
      }}>
        {STAGE_LABELS[newStageName]} Form
      </div>

      {/* What's happening label */}
      {phase < PHASES.NEW_FORM && (
        <div style={{
          fontSize:11, fontWeight:900, color:"#E8E8D0",
          letterSpacing:"0.15em", marginBottom:20,
          position:"relative", zIndex:10,
          animation:"textPulse 0.8s ease-in-out infinite",
        }}>
          {prevStageDef.name.toUpperCase()} is evolving!
        </div>
      )}
      {phase >= PHASES.NEW_FORM && (
        <div style={{
          fontSize:11, color:"#807860",
          letterSpacing:"0.1em", marginBottom:20,
          position:"relative", zIndex:10,
          opacity: showNew ? 1 : 0,
          transition:"opacity 0.4s",
        }}>
          {prevStageDef.name} evolved into...
        </div>
      )}

      {/* Silhouette + particles */}
      <div style={{
        position:"relative",
        marginBottom:24, zIndex:10,
      }}>
        <EvoSilhouette
          type={creature.type}
          size={140}
          flashing={isFlashing}
          newForm={showNew}
        />
        <ParticleBurst color={col.mid} active={phase === PHASES.NEW_FORM} />
      </div>

      {/* New name — big reveal */}
      <div style={{
        fontSize:"clamp(28px, 6vw, 48px)",
        fontWeight:900,
        color: showNew ? "#E8E8D0" : "#302818",
        letterSpacing:"0.06em",
        textAlign:"center",
        marginBottom:8,
        position:"relative", zIndex:10,
        animation: phase === PHASES.NEW_FORM ? "nameReveal 0.6s ease-out" : "none",
        textShadow: showNew ? `0 0 30px ${col.mid}88` : "none",
        transition:"color 0.4s, text-shadow 0.4s",
      }}>
        {displayName.toUpperCase()}
      </div>

      {/* Type + Level */}
      <div style={{
        fontSize:10, color:col.light,
        letterSpacing:"0.12em", marginBottom:20,
        position:"relative", zIndex:10,
        opacity: showNew ? 1 : 0.3,
        transition:"opacity 0.4s",
      }}>
        {creature.type.toUpperCase()} · Lv{creature.level} · {STAGE_LABELS[newStageName].toUpperCase()}
      </div>

      {/* Description */}
      {showNew && (
        <p style={{
          fontSize:10, color:"#605840",
          lineHeight:1.7, maxWidth:340,
          textAlign:"center", margin:"0 0 24px",
          position:"relative", zIndex:10,
          animation:"fadeInUp 0.5s ease-out",
        }}>
          {displayDesc}
        </p>
      )}

      {/* Stat comparison */}
      {showStats && (
        <div style={{
          width:"100%", maxWidth:340,
          position:"relative", zIndex:10,
          marginBottom:24,
        }}>
          <div style={{
            fontSize:8, color:"#403828", letterSpacing:"0.12em",
            marginBottom:8, textAlign:"center",
          }}>
            STAT CHANGES
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {STAT_KEYS.map((key, i) => (
              <div key={key} style={{ animationDelay:`${i * 0.07}s` }}>
                <StatRow
                  label={STAT_LABELS[key]}
                  before={prevStageDef.stats[key]}
                  after={newStageDef.stats[key]}
                />
              </div>
            ))}
            {/* AC comparison */}
            <div style={{ animationDelay:"0.35s" }}>
              <StatRow
                label="AC"
                before={prevStageDef.armorClass}
                after={newStageDef.armorClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Continue button */}
      {showButton && (
        <button
          onClick={onDone}
          style={{
            fontFamily:"'Courier New', monospace",
            fontSize:13, fontWeight:900,
            background: col.mid, color:"#fff",
            border:`4px solid ${col.dark}`,
            borderRadius:6, padding:"11px 40px",
            cursor:"pointer", letterSpacing:"0.12em",
            boxShadow:`0 5px 0 ${col.dark}, 0 0 20px ${col.mid}44`,
            position:"relative", zIndex:10,
            animation:"fadeInUp 0.4s ease-out",
          }}
          onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(5px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(5px)"}
          onMouseUp={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"}
          onMouseLeave={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"}
        >
          CONTINUE ▶
        </button>
      )}

      <style>{`
        @keyframes textPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.5; }
        }
        @keyframes glowPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.6; }
        }
        @keyframes evoAppear {
          0%   { transform:scale(0.7); opacity:0; filter:brightness(4); }
          60%  { transform:scale(1.08); filter:brightness(1.5); }
          100% { transform:scale(1); opacity:1; filter:brightness(1); }
        }
        @keyframes nameReveal {
          0%   { transform:scale(1.4) translateY(10px); opacity:0; }
          60%  { transform:scale(0.96); }
          100% { transform:scale(1) translateY(0); opacity:1; }
        }
        @keyframes fadeInUp {
          0%   { opacity:0; transform:translateY(14px); }
          100% { opacity:1; transform:translateY(0); }
        }
        @keyframes slideInStat {
          0%   { opacity:0; transform:translateX(-12px); }
          100% { opacity:1; transform:translateX(0); }
        }
        @keyframes particleFly {
          0%   { opacity:1; transform:translate(0,0) scale(1); }
          100% { opacity:0; transform:translate(var(--px,0),var(--py,0)) scale(0); }
        }
      `}</style>
    </div>
  );
}
