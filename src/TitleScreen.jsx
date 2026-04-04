// ============================================================
//  TitleScreen.jsx
// ============================================================

import { useRun, RunActions } from "./RunContext.jsx";

const TYPE_COLORS = {
  fire:"#DD6610", water:"#2B7FE8", earth:"#4A8C2A",
  wind:"#6070C8", shadow:"#7038A8", light:"#C89010",
};

// Animated drifting type-colour orbs in the background
function BackgroundOrbs() {
  const orbs = [
    { type:"fire",   x:15,  y:20,  size:120, delay:0   },
    { type:"water",  x:75,  y:10,  size:90,  delay:1.2 },
    { type:"earth",  x:55,  y:65,  size:140, delay:0.6 },
    { type:"wind",   x:10,  y:70,  size:80,  delay:1.8 },
    { type:"shadow", x:85,  y:55,  size:100, delay:0.3 },
    { type:"light",  x:45,  y:85,  size:70,  delay:2.1 },
  ];
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", zIndex:0 }}>
      {orbs.map((o, i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${o.x}%`, top:`${o.y}%`,
          width: o.size, height: o.size,
          borderRadius:"50%",
          background: TYPE_COLORS[o.type],
          opacity: 0.08,
          filter:"blur(40px)",
          animation:`orbDrift ${6 + i}s ease-in-out ${o.delay}s infinite alternate`,
          transform:"translate(-50%,-50%)",
        }} />
      ))}
    </div>
  );
}

export default function TitleScreen() {
  const { dispatch } = useRun();

  return (
    <div style={{
      minHeight:"100vh",
      width:"100%",
      background:"#1a1a14",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Courier New', monospace",
      position:"relative", overflow:"hidden",
      boxSizing:"border-box",
    }}>
      <BackgroundOrbs />

      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"0 20px", width:"100%", maxWidth:640, margin:"0 auto" }}>

        {/* Logo */}
        <div style={{
          fontSize:11, fontWeight:900, letterSpacing:"0.35em",
          color:"#807860", textTransform:"uppercase", marginBottom:16,
        }}>
          ✦ A Roguelike Adventure ✦
        </div>

        <h1 style={{
          fontFamily:"'Courier New', monospace",
          fontSize:"clamp(36px, 8vw, 72px)",
          fontWeight:900,
          color:"#E8E8D0",
          letterSpacing:"0.06em",
          lineHeight:1.1,
          margin:"0 0 8px",
          textShadow:"0 0 40px rgba(232,216,160,0.3), 3px 3px 0 rgba(0,0,0,0.4)",
        }}>
          CREATURE<br/>COLLECTOR
        </h1>

        <div style={{
          fontSize:14, color:"#605840", letterSpacing:"0.2em",
          textTransform:"uppercase", marginBottom:48,
        }}>
          DECK BUILDER
        </div>

        {/* Type badges */}
        <div style={{
          display:"flex", gap:8, justifyContent:"center",
          flexWrap:"wrap", marginBottom:48,
        }}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span key={type} style={{
              fontSize:9, fontWeight:900, padding:"3px 10px",
              borderRadius:3, letterSpacing:"0.12em",
              background: color + "22",
              border: `1px solid ${color}44`,
              color,
              textTransform:"uppercase",
            }}>
              {type}
            </span>
          ))}
        </div>

        {/* Start button */}
        <PokeButton onClick={() => dispatch(RunActions.goToStarterPick())}>
          NEW GAME ▶
        </PokeButton>

        <div style={{ marginTop:16, fontSize:9, color:"#403828", letterSpacing:"0.1em" }}>
          PRESS TO BEGIN YOUR JOURNEY
        </div>
      </div>

      <style>{`
        @keyframes orbDrift {
          from { transform: translate(-50%,-50%) scale(1); }
          to   { transform: translate(-50%,-50%) scale(1.3) translate(10px, 15px); }
        }
      `}</style>
    </div>
  );
}

function PokeButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily:"'Courier New', monospace",
        fontSize:16, fontWeight:900,
        background:"#E8E8D0", color:"#302810",
        border:"4px solid #807860",
        borderRadius:6,
        padding:"12px 40px",
        cursor:"pointer",
        letterSpacing:"0.12em",
        boxShadow:"0 5px 0 #504838, 0 0 30px rgba(232,216,160,0.15)",
        transition:"all 0.08s",
      }}
      onMouseDown={e => e.currentTarget.style.transform="translateY(5px)"}
      onMouseUp={e   => e.currentTarget.style.transform="translateY(0)"}
      onMouseLeave={e=> e.currentTarget.style.transform="translateY(0)"}
    >
      {children}
    </button>
  );
}
