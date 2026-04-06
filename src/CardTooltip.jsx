// ─── CardTooltip.jsx ─────────────────────────────────────────────────────
//  Shared hover tooltip used by PartyScreen, ShopScreen, RewardScreen.
//  Renders at fixed position above the hovered card.
// ─────────────────────────────────────────────────────────────────────────

import { TYPE_COLORS, effectiveDamage, effectiveHeal, effectiveShield, liveDesc, statMod } from "./shared.js";

export function CardTooltip({ card, cardCol, isAttack, isDefend, x, y, creature }) {
  if (!card || !cardCol) return null;
  const tipW = 220;
  const vp   = typeof window !== "undefined" ? window.innerWidth : 1400;
  const left = Math.max(8, Math.min(x - tipW / 2, vp - tipW - 8));
  const top  = y - 16;
  const col  = cardCol;
  return (
    <div style={{
      position:"fixed",
      left, top,
      transform:"translateY(-100%)",
      width:tipW,
      background:"linear-gradient(160deg, #1E1A12 0%, #100D08 100%)",
      border:`2px solid ${col.mid}`,
      borderRadius:12,
      padding:"14px 16px 12px",
      boxShadow:`0 16px 40px rgba(0,0,0,0.9), 0 0 0 1px ${col.dark}44, 0 0 24px ${col.mid}33`,
      pointerEvents:"none",
      zIndex:9999,
      fontFamily:"'Courier New', monospace",
    }}>
      {/* Type colour bar */}
      <div style={{ height:3, borderRadius:2, marginBottom:10,
        background:`linear-gradient(to right,${col.light},${col.mid},${col.dark})` }} />
      {/* Card name */}
      <div style={{ fontSize:15, fontWeight:900, color:col.light,
        marginBottom:6, letterSpacing:"0.03em", lineHeight:1.2 }}>
        {card.name.toUpperCase()}
      </div>
      {/* Tag + cost row */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:900, padding:"3px 8px", borderRadius:4,
          background: isAttack?"#C05818":isDefend?"#3050C0":"#307820",
          color:"#fff", letterSpacing:"0.06em" }}>
          {isAttack?"ATTACK":isDefend?"DEFEND":"UTILITY"}
        </span>
        <span style={{ fontSize:13, color:"#C8B890", fontWeight:700 }}>⚡ {card.energyCost}</span>
      </div>
      {/* Description */}
      <div style={{ fontSize:13, color:"#E0D0A8", lineHeight:1.65, marginBottom:10,
        borderBottom:`1px solid ${col.mid}33`, paddingBottom:10 }}>
        {liveDesc(card, creature)}
      </div>
      {/* Stat lines */}
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {card.baseDamage > 0 && (
          <div style={{ fontSize:13, color:"#F09060", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span>⚔</span>
            <span>{effectiveDamage(card, creature)} damage</span>
            {statMod(creature?.stats?.[card.scalingStat ?? "strength"] ?? 10) !== 0 &&
              <span style={{color:"#B07850",fontWeight:400,fontSize:11}}>
                ({card.baseDamage}+{statMod(creature?.stats?.[card.scalingStat ?? "strength"] ?? 10)} STR)
              </span>}
          </div>
        )}
        {card.shieldAmount > 0 && (
          <div style={{ fontSize:13, color:"#70A8F8", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span>🛡</span>
            <span>{effectiveShield(card, creature)} shield</span>
            {statMod(creature?.stats?.[card.scalingStat ?? "constitution"] ?? 10) !== 0 &&
              <span style={{color:"#5080C8",fontWeight:400,fontSize:11}}>
                ({card.shieldAmount}+{statMod(creature?.stats?.[card.scalingStat ?? "constitution"] ?? 10)} CON)
              </span>}
          </div>
        )}
        {card.healAmount > 0 && (
          <div style={{ fontSize:13, color:"#60D880", fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span>💚</span>
            <span>{effectiveHeal(card, creature)} heal</span>
            {statMod(creature?.stats?.[card.scalingStat ?? "wisdom"] ?? 10) !== 0 &&
              <span style={{color:"#40A860",fontWeight:400,fontSize:11}}>
                ({card.healAmount}+{statMod(creature?.stats?.[card.scalingStat ?? "wisdom"] ?? 10)} WIS)
              </span>}
          </div>
        )}
        {card.onHitStatus && (
          <div style={{ fontSize:13, color:"#E8B050", fontWeight:700 }}>
            ✦ On hit: {card.onHitStatus.stacks}× {card.onHitStatus.type}
          </div>
        )}
        {card.onPlayStatus && (
          <div style={{ fontSize:13, color:"#90D0F0", fontWeight:700 }}>
            ★ On play: {card.onPlayStatus.stacks}× {card.onPlayStatus.type}
          </div>
        )}
      </div>
    </div>
  );
}
