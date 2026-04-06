// ============================================================
//  GameOverScreen.jsx — Defeat screen
//  VictoryScreen.jsx  — Floor clear / win screen
//  Both exported from this file.
// ============================================================

import { useRun, RunActions } from "./RunContext.jsx";
import { TYPE_COLORS } from "./shared.js";

function StatLine({ label, value }) {
  return (
    <div style={{
      display:"flex", justifyContent:"space-between",
      borderBottom:"1px solid #252514",
      padding:"6px 0",
      fontSize:10,
    }}>
      <span style={{ color:"#B09870", letterSpacing:"0.06em" }}>{label}</span>
      <span style={{ color:"#E8E8D0", fontWeight:900 }}>{value}</span>
    </div>
  );
}

export function GameOverScreen() {
  const { run, dispatch } = useRun();
  const { party, gold, relics, map } = run;

  const floor = map?.floorNumber ?? 1;
  const caught = run.roster?.length ?? 0;

  return (
    <div style={{
      minHeight:"100vh",
      background:"#0e0808",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Courier New', monospace",
      padding:"32px 20px",
      boxSizing:"border-box",
    }}>

      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontSize:48, marginBottom:12 }}>☠</div>
        <h2 style={{
          fontSize:28, fontWeight:900,
          color:"#E84040", letterSpacing:"0.1em",
          margin:"0 0 8px",
          textShadow:"0 0 30px rgba(232,64,64,0.4)",
        }}>
          DEFEATED
        </h2>
        <p style={{ fontSize:10, color:"#A08868", letterSpacing:"0.08em" }}>
          All creatures have fainted. Your run is over.
        </p>
      </div>

      {/* Run summary */}
      <div style={{
        background:"#141410", border:"2px solid #302818",
        borderRadius:10, padding:"16px 20px",
        width:"100%", maxWidth:340, marginBottom:24,
      }}>
        <div style={{
          fontSize:13, color:"#907858", letterSpacing:"0.12em",
          textTransform:"uppercase", marginBottom:10,
        }}>
          Run Summary
        </div>
        <StatLine label="Floor reached"   value={floor} />
        <StatLine label="Creatures caught" value={caught} />
        <StatLine label="Gold remaining"  value={`¥${gold}`} />
        <StatLine label="Relics found"    value={relics.length} />
      </div>

      {/* Party gravestones */}
      {party.length > 0 && (
        <div style={{
          display:"flex", gap:8, flexWrap:"wrap",
          justifyContent:"center", marginBottom:24,
        }}>
          {party.map((c, i) => {
            const typeCol = TYPE_COLORS[c.type]?.mid || "#888";
            return (
              <div key={i} style={{
                background:"#141410",
                border:"2px solid #252514",
                borderRadius:8, padding:"8px 12px",
                textAlign:"center", minWidth:90,
              }}>
                <div style={{ fontSize:14, marginBottom:4 }}>✝</div>
                <div style={{ fontSize:13, fontWeight:900, color:"#E8E8D0" }}>{c.name}</div>
                <div style={{ fontSize:12, color: typeCol + "88" }}>Lv{c.level}</div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => dispatch(RunActions.returnToTitle())}
        style={{
          fontFamily:"'Courier New', monospace",
          fontSize:13, fontWeight:900,
          background:"#E8E8D0", color:"#302810",
          border:"4px solid #807860",
          borderRadius:6, padding:"11px 32px",
          cursor:"pointer", letterSpacing:"0.1em",
          boxShadow:"0 5px 0 #504838",
          transition:"all 0.08s",
        }}
        onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"}
        onMouseUp={e   => e.currentTarget.style.transform="none"}
        onMouseLeave={e=> e.currentTarget.style.transform="none"}
      >
        ← RETURN TO TITLE
      </button>
    </div>
  );
}
