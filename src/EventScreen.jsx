// ============================================================
//  EventScreen.jsx
//  Renders a narrative event from the current map node.
//  Player picks a choice, sees the outcome, then continues.
//
//  Flow:
//    PICK phase  — show event text + choices
//    RESULT phase — show outcome narrative + effect summary
//    CONTINUE    — dispatch RESOLVE_EVENT → return to map
// ============================================================

import { useState } from "react";
import { useRun, RunActions } from "./RunContext.jsx";

// ─── CONSTANTS ───────────────────────────────────────────────

const TYPE_COLORS = {
  fire:"#DD6610", water:"#2B7FE8", earth:"#4A8C2A",
  wind:"#6070C8", shadow:"#7038A8", light:"#C89010",
};

// ─── OUTCOME SUMMARY CHIP ────────────────────────────────────

function OutcomeChip({ label, positive }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontSize:10, fontWeight:900, padding:"3px 10px",
      background: positive ? "#0e1e0e" : "#1e0e0e",
      color:       positive ? "#40C850" : "#E84040",
      border:`1.5px solid ${positive ? "#286020" : "#802020"}`,
      borderRadius:4, letterSpacing:"0.04em",
      fontFamily:"'Courier New', monospace",
    }}>
      {positive ? "▲" : "▼"} {label}
    </span>
  );
}

function NeutralChip({ label }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontSize:10, fontWeight:900, padding:"3px 10px",
      background:"#1a1a10", color:"#807860",
      border:"1.5px solid #302818",
      borderRadius:4, letterSpacing:"0.04em",
      fontFamily:"'Courier New', monospace",
    }}>
      ◈ {label}
    </span>
  );
}

// Summarise an outcome into human-readable chips
function OutcomeSummary({ resolution }) {
  if (!resolution) return null;
  const { effects = [], message } = resolution;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
      {effects.map((e, i) => {
        if (e.type === "gold")         return <OutcomeChip key={i} label={`+${e.amount} Gold`}       positive />;
        if (e.type === "lose_gold")    return <OutcomeChip key={i} label={`-${e.amount} Gold`}       positive={false} />;
        if (e.type === "heal")         return <OutcomeChip key={i} label={`Healed ${Math.round(e.ratio*100)}% HP`} positive />;
        if (e.type === "damage")       return <OutcomeChip key={i} label={`-${Math.round(e.ratio*100)}% HP`} positive={false} />;
        if (e.type === "card_added")   return <OutcomeChip key={i} label={`Card: ${e.name}`}         positive />;
        if (e.type === "card_removed") return <OutcomeChip key={i} label={`Removed: ${e.name}`}      positive={false} />;
        if (e.type === "relic_added")  return <OutcomeChip key={i} label={`Relic: ${e.name}`}        positive />;
        if (e.type === "catch_success")return <OutcomeChip key={i} label={`Caught ${e.name}!`}       positive />;
        if (e.type === "catch_fail")   return <OutcomeChip key={i} label="Creature fled"             positive={false} />;
        if (e.type === "xp_bonus")     return <OutcomeChip key={i} label={`+${e.amount} XP`}         positive />;
        if (e.type === "upgraded")     return <OutcomeChip key={i} label={`Upgraded: ${e.name}`}     positive />;
        if (e.type === "win_gamble")   return <OutcomeChip key={i} label={`Won! +${e.amount} Gold`}  positive />;
        if (e.type === "lose_gamble")  return <OutcomeChip key={i} label={`Lost ${e.amount} Gold`}   positive={false} />;
        if (e.type === "nothing")      return <NeutralChip  key={i} label="No effect" />;
        return null;
      })}
    </div>
  );
}

// ─── CHOICE BUTTON ───────────────────────────────────────────

function ChoiceButton({ choice, isDisabled, disabledReason, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <button
        onClick={!isDisabled ? onClick : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={isDisabled}
        style={{
          width:"100%",
          fontFamily:"'Courier New', monospace",
          fontSize:11, fontWeight:900,
          textAlign:"left",
          background: isDisabled ? "#141410"
                    : hovered    ? "#252514"
                    :              "#1a1a10",
          color: isDisabled ? "#403828" : "#E8E8D0",
          border:`2px solid ${isDisabled ? "#252514" : hovered ? "#807860" : "#302818"}`,
          borderRadius:7, padding:"12px 14px",
          cursor: isDisabled ? "not-allowed" : "pointer",
          transition:"all 0.1s",
          letterSpacing:"0.03em",
          lineHeight:1.4,
        }}
      >
        <span style={{ color: isDisabled ? "#403828" : "#C89010", marginRight:8 }}>▸</span>
        {choice.label}
        {isDisabled && disabledReason && (
          <span style={{ fontSize:9, color:"#603030", marginLeft:8, fontWeight:400 }}>
            ({disabledReason})
          </span>
        )}
      </button>
    </div>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────

export default function EventScreen() {
  const { run, dispatch } = useRun();
  const { pendingEvent, gold, party } = run;

  const [phase, setPhase]           = useState("pick"); // pick | result
  const [resolution, setResolution] = useState(null);   // { message, effects }
  const [choiceResult, setResult]   = useState(null);   // narrative text

  if (!pendingEvent) {
    dispatch(RunActions.resolveEvent(null));
    return null;
  }

  const { event, choiceIndex } = pendingEvent;
  const choices = event.choices;

  function canAfford(choice) {
    if (!choice.requiresGold) return true;
    return gold >= choice.requiresGold;
  }

  function handleChoice(choice, idx) {
    if (!canAfford(choice)) return;

    // Dispatch resolution to RunContext — it applies the outcome and returns effect summary
    dispatch(RunActions.resolveEvent({ eventId: event.id, choiceId: choice.id }));

    // Show result narrative immediately (outcome effects applied in RunContext)
    setResult(choice.result);
    setResolution(run._lastEventResolution); // populated by RunContext after dispatch
    setPhase("result");
  }

  // The resolution effects come back via run._lastEventResolution
  // set by RunContext after RESOLVE_EVENT — we read them on re-render
  const liveResolution = run._lastEventResolution;

  return (
    <div style={{
      minHeight:"100vh",
      background:"#111108",
      fontFamily:"'Courier New', monospace",
      display:"flex", flexDirection:"column",
      alignItems:"center",
      padding:"40px 20px",
      boxSizing:"border-box",
    }}>

      {/* Event card */}
      <div style={{
        width:"100%", maxWidth:560,
        background:"#1a1a10",
        border:"3px solid #302818",
        borderRadius:12, padding:"28px 28px 24px",
        boxShadow:"0 4px 0 #0a0a08",
      }}>

        {/* Icon + title */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
          <div style={{
            fontSize:28, lineHeight:1,
            background:"#252514",
            border:"2px solid #403828",
            borderRadius:8, padding:"8px 12px",
            flexShrink:0,
          }}>
            {event.icon}
          </div>
          <div>
            <div style={{
              fontSize:8, color:"#504838",
              letterSpacing:"0.2em", textTransform:"uppercase",
              marginBottom:4,
            }}>
              ? EVENT · Floor {run.map?.floorNumber ?? 1}
            </div>
            <h2 style={{
              fontSize:20, fontWeight:900, color:"#E8E8D0",
              letterSpacing:"0.05em", margin:0,
            }}>
              {event.title}
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:"#252514", margin:"0 0 18px" }} />

        {/* Narrative */}
        <p style={{
          fontSize:12, color:"#807860",
          lineHeight:1.8, margin:"0 0 24px",
          letterSpacing:"0.02em",
        }}>
          {event.description}
        </p>

        {/* ── PICK PHASE ── */}
        {phase === "pick" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {choices.map((choice, i) => (
              <ChoiceButton
                key={choice.id}
                choice={choice}
                isDisabled={!canAfford(choice)}
                disabledReason={
                  choice.requiresGold && gold < choice.requiresGold
                    ? `need ¥${choice.requiresGold}, have ¥${gold}`
                    : null
                }
                onClick={() => handleChoice(choice, i)}
              />
            ))}
          </div>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === "result" && (
          <div>
            {/* Result narrative */}
            <div style={{
              background:"#141410",
              border:"2px solid #252514",
              borderRadius:8, padding:"14px 16px",
              marginBottom:16,
            }}>
              <p style={{
                fontSize:11, color:"#E8E8D0",
                lineHeight:1.7, margin:0,
                fontStyle:"italic",
              }}>
                "{choiceResult}"
              </p>
            </div>

            {/* Effects summary from RunContext */}
            {liveResolution?.effects?.length > 0 && (
              <OutcomeSummary resolution={liveResolution} />
            )}

            {/* Continue */}
            <button
              onClick={() => dispatch(RunActions.finishEvent())}
              style={{
                fontFamily:"'Courier New', monospace",
                fontSize:12, fontWeight:900,
                background:"#E8E8D0", color:"#302810",
                border:"3px solid #807860", borderRadius:5,
                padding:"9px 28px", cursor:"pointer",
                letterSpacing:"0.1em",
                boxShadow:"0 4px 0 #504838",
                marginTop:20,
                display:"block",
                transition:"all 0.08s",
              }}
              onMouseDown={e => e.currentTarget.style.transform="translateY(4px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(4px)"} onTouchStart={e => e.currentTarget.style.transform="translateY(4px)"}
              onMouseUp={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"} onTouchEnd={e => e.currentTarget.style.transform="none"}
              onMouseLeave={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"} onTouchCancel={e => e.currentTarget.style.transform="none"}
            >
              CONTINUE ▶
            </button>
          </div>
        )}
      </div>

      {/* Party HP sidebar */}
      <div style={{
        width:"100%", maxWidth:560,
        marginTop:14, display:"flex", gap:6, flexWrap:"wrap",
      }}>
        {party.map((c, i) => {
          const pct    = Math.min(100, Math.round((c.currentHp / c.maxHp) * 100));
          const hpCol  = pct > 50 ? "#40C850" : pct > 20 ? "#F8D030" : "#F85840";
          const typeCol = TYPE_COLORS[c.type] || "#888";
          return (
            <div key={i} style={{
              flex:1, minWidth:100,
              background:"#1a1a10", border:`1.5px solid ${typeCol}44`,
              borderRadius:6, padding:"6px 10px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:9, fontWeight:900, color:"#E8E8D0" }}>{c.name}</span>
                <span style={{ fontSize:8, color:typeCol }}>Lv{c.level}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:7, fontWeight:900, color:"#38A018", minWidth:12 }}>HP</span>
                <div style={{ flex:1, height:4, background:"#302818", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:hpCol, borderRadius:2 }} />
                </div>
                <span style={{ fontSize:7, color:"#605840" }}>{c.currentHp}/{c.maxHp}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
