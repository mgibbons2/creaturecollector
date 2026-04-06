// ============================================================
//  TitleScreen.jsx
// ============================================================

import { useState } from "react";
import { useRun, RunActions } from "./RunContext.jsx";
import { useIsMobile } from "./useMediaQuery.js";
import GuideBook from "./GuideBook.jsx";
import { TYPE_COLORS } from "./shared.js";

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
          background: TYPE_COLORS[o.type]?.mid || "#888",
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
  const [showGuide, setShowGuide] = useState(false);
  const isMobile = useIsMobile();

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

      <div style={{ position:"relative", zIndex:1, textAlign:"center", width:"100%", maxWidth:640, margin:"0 auto", padding: isMobile ? "0 16px" : "0 20px" }}>

        {/* Logo */}
        <div style={{
          fontSize:11, fontWeight:900, letterSpacing:"0.08em",
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
          fontSize:14, color:"#B09870", letterSpacing:"0.05em",
          textTransform:"uppercase", marginBottom:48,
        }}>
          DECK BUILDER
        </div>

        {/* Type badges */}
        <div style={{
          display:"flex", gap:8, justifyContent:"center",
          flexWrap:"wrap", marginBottom:48,
        }}>
          {Object.entries(TYPE_COLORS).map(([type, col]) => (
            <span key={type} style={{
              fontSize:13, fontWeight:900, padding:"3px 10px",
              borderRadius:3, letterSpacing:"0.12em",
              background: col.mid + "22",
              border: `1px solid ${col.mid}44`,
              color: col.mid,
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

        <div style={{ marginTop:14 }}>
          <PokeButton onClick={() => setShowGuide(true)} secondary>
            📖 HOW TO PLAY
          </PokeButton>
        </div>

        <div style={{ marginTop:16, fontSize:13, color:"#907858", letterSpacing:"0.1em" }}>
          PRESS TO BEGIN YOUR JOURNEY
        </div>
      </div>

      {showGuide && <GuideBook onClose={() => setShowGuide(false)} />}

      <style>{`
        @keyframes orbDrift {
          from { transform: translate(-50%,-50%) scale(1); }
          to   { transform: translate(-50%,-50%) scale(1.3) translate(10px, 15px); }
        }
      `}</style>
    </div>
  );
}

function PokeButton({ onClick, children, secondary = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily:"'Courier New', monospace",
        fontSize: secondary ? 13 : 16, fontWeight:900,
        background: secondary ? "transparent" : "#E8E8D0",
        color: secondary ? "#807860" : "#302810",
        border: secondary ? "2px solid #3a3828" : "4px solid #807860",
        borderRadius:6,
        padding: secondary ? "9px 28px" : "12px 40px",
        cursor:"pointer",
        letterSpacing:"0.12em",
        boxShadow: secondary
          ? "0 3px 0 #252018"
          : "0 5px 0 #504838, 0 0 30px rgba(232,216,160,0.15)",
        transition:"all 0.08s",
      }}
      onMouseDown={e => e.currentTarget.style.transform="translateY(3px)"}
      onMouseUp={e   => e.currentTarget.style.transform="translateY(0)"}
      onMouseLeave={e=> e.currentTarget.style.transform="translateY(0)"}
      onMouseEnter={e=> { if(secondary) e.currentTarget.style.borderColor="#807860"; }}
    >
      {children}
    </button>
  );
}
