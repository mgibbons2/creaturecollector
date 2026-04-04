// ============================================================
//  App.jsx
//  Root component. Wraps everything in <RunProvider> and
//  routes between screens based on run.phase.
//
//  Screen map:
//    title        → TitleScreen
//    starter_pick → StarterPickScreen
//    map          → MapScreen
//    combat       → CombatScreen (CombatUI.jsx wired to RunContext)
//    reward       → RewardScreen
//    shop         → ShopScreen   (stub — build next)
//    rest         → RestScreen   (stub — build next)
//    gameover     → GameOverScreen
// ============================================================

import { useRun, RunProvider, RunActions } from "./RunContext.jsx";
import TitleScreen         from "./TitleScreen.jsx";
import StarterPickScreen   from "./StarterPickScreen.jsx";
import MapScreen           from "./MapScreen.jsx";
import RewardScreen        from "./RewardScreen.jsx";
import { GameOverScreen }  from "./GameOverScreen.jsx";
import CombatScreen        from "./CombatScreen.jsx";
import ShopScreen          from "./ShopScreen.jsx";
import RestScreen          from "./RestScreen.jsx";
import CatchScreen         from "./CatchScreen.jsx";
import EventScreen         from "./EventScreen.jsx";

// ─── STUB SCREENS (placeholders until built) ─────────────────

// ShopScreen imported above

// RestScreen imported above

// EventScreen imported above

// Shared stub styles
const stubStyle = {
  minHeight:"100vh", background:"#111108",
  display:"flex", flexDirection:"column",
  alignItems:"center", justifyContent:"center",
  fontFamily:"'Courier New', monospace", gap:16,
  padding:24,
};
const stubH2 = {
  fontSize:24, fontWeight:900, color:"#E8E8D0",
  letterSpacing:"0.1em", margin:0,
};
const stubP = { fontSize:10, color:"#504838", letterSpacing:"0.08em", margin:0 };

function StubButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily:"'Courier New', monospace",
        fontSize:12, fontWeight:900,
        background:"#E8E8D0", color:"#302810",
        border:"3px solid #807860", borderRadius:5,
        padding:"9px 24px", cursor:"pointer",
        letterSpacing:"0.1em", boxShadow:"0 4px 0 #504838",
        transition:"all 0.08s",
      }}
      onMouseDown={e => e.currentTarget.style.transform="translateY(4px)"}
      onMouseUp={e   => e.currentTarget.style.transform="none"}
      onMouseLeave={e=> e.currentTarget.style.transform="none"}
    >
      {children}
    </button>
  );
}

// ─── ROUTER ──────────────────────────────────────────────────

function Router() {
  const { run } = useRun();

  switch (run.phase) {
    case "title":        return <TitleScreen />;
    case "starter_pick": return <StarterPickScreen />;
    case "map":          return <MapScreen />;
    case "combat":       return <CombatScreen />;
    case "reward":       return <RewardScreen />;
    case "catch":        return <CatchScreen />;
    case "shop":         return <ShopScreen />;
    case "rest":         return <RestScreen />;
    case "event":        return <EventScreen />;
    case "gameover":     return <GameOverScreen />;
    default:             return <TitleScreen />;
  }
}

// ─── ROOT ────────────────────────────────────────────────────

export default function App() {
  return (
    <RunProvider>
      <div style={{
        margin: 0, padding: 0,
        width:"100%",
        minHeight:"100vh",
        fontFamily:"'Courier New', monospace",
        WebkitFontSmoothing:"antialiased",
        overflowX:"hidden",
      }}>
        <Router />
      </div>
    </RunProvider>
  );
}
