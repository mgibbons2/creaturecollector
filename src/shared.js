// ============================================================
//  shared.js — Single source of truth for constants and
//  helper functions used across multiple screens.
//  Import what you need:
//    import { TYPE_COLORS, TYPE_SHAPES, statMod, ... } from "./shared.js";
// ============================================================

// ─── Type palette ─────────────────────────────────────────────
// Each type has: light, mid, dark (used for text/borders/backgrounds)
// bg (light screen background tint), badge (chip background)
export const TYPE_COLORS = {
  fire:      { light:"#FF9741", mid:"#DD6610", dark:"#7A2410", bg:"#FFF4EE", badge:"#FFD4B8" },
  water:     { light:"#74BCFF", mid:"#2B7FE8", dark:"#0E3577", bg:"#EEF5FF", badge:"#C4DCFF" },
  earth:     { light:"#88DD44", mid:"#4A8C2A", dark:"#1E4010", bg:"#F2FAEE", badge:"#C8ECAA" },
  wind:      { light:"#AAC8FF", mid:"#6070C8", dark:"#283080", bg:"#F0F2FF", badge:"#C8D0F8" },
  shadow:    { light:"#CC88FF", mid:"#7038A8", dark:"#2A1040", bg:"#F4EEFF", badge:"#D4AAFF" },
  light:     { light:"#FFE066", mid:"#C89010", dark:"#6A4A00", bg:"#FFFBEE", badge:"#FFE8A0" },
  colorless: { light:"#C0B898", mid:"#807860", dark:"#403828", bg:"#F8F6F0", badge:"#D8D0B8" },
};

// ─── Type silhouette SVG paths ─────────────────────────────────
export const TYPE_SHAPES = {
  fire:      "M50,15 C45,25 55,35 45,50 C55,40 65,50 55,65 C65,55 70,65 60,75 C50,68 40,72 35,80 C30,65 38,55 30,45 C38,50 42,40 35,30 C42,35 48,25 50,15Z",
  water:     "M50,15 C60,25 70,35 72,50 C74,65 65,75 50,82 C35,75 26,65 28,50 C30,35 40,25 50,15Z",
  earth:     "M25,75 L50,20 L75,75 L60,75 L60,55 L40,55 L40,75Z",
  wind:      "M50,20 C65,30 75,45 70,60 C65,72 55,78 50,80 C45,78 35,72 30,60 C25,45 35,30 50,20Z M40,50 C42,42 50,38 58,42",
  shadow:    "M50,18 C58,28 70,28 75,38 C80,48 75,60 68,68 C60,76 52,80 50,82 C48,80 40,76 32,68 C25,60 20,48 25,38 C30,28 42,28 50,18Z",
  light:     "M50,15 L55,38 L78,38 L60,53 L67,76 L50,62 L33,76 L40,53 L22,38 L45,38Z",
  colorless: "M30,30 L70,30 L70,70 L30,70Z",
};

// ─── Rarity colours ────────────────────────────────────────────
export const RARITY_COLOR = {
  common:    "#807860",
  uncommon:  "#4080C0",
  rare:      "#A040D0",
  legendary: "#D09020",
};

// ─── Stat modifier (D&D-style) ─────────────────────────────────
// statMod(10) = 0, statMod(12) = +1, statMod(8) = -1, etc.
export function statMod(v) { return Math.floor(((v ?? 10) - 10) / 2); }

// ─── Card effective value helpers ─────────────────────────────
// These respect each card's scalingStat so values like
// still_waters (constitution heal) work correctly.
export function effectiveShield(card, creature) {
  if (!card?.shieldAmount) return 0;
  const stat = card.scalingStat ?? 'constitution';
  return card.shieldAmount + statMod(creature?.stats?.[stat]);
}

export function effectiveDamage(card, creature) {
  if (!card?.baseDamage) return 0;
  const stat = card.scalingStat ?? 'strength';
  return card.baseDamage + statMod(creature?.stats?.[stat]);
}

export function effectiveHeal(card, creature) {
  if (!card?.healAmount) return 0;
  const stat = card.scalingStat ?? 'wisdom';
  return card.healAmount + statMod(creature?.stats?.[stat]);
}

// ─── Live card description ─────────────────────────────────────
// Replaces stated base values in a card description with the
// stat-scaled effective values so the player always sees true numbers.
export function liveDesc(card, creature) {
  if (!card) return '';
  let d = card.description ?? '';
  if (!creature) return d;
  if (card.shieldAmount) {
    const eff = effectiveShield(card, creature);
    if (eff !== card.shieldAmount)
      d = d.replace(new RegExp(`\\b${card.shieldAmount}\\b(?=\\s*Shield)`, 'g'), String(eff));
  }
  if (card.baseDamage) {
    const eff = effectiveDamage(card, creature);
    if (eff !== card.baseDamage)
      d = d.replace(new RegExp(`\\b${card.baseDamage}\\b(?=\\s*damage)`, 'g'), String(eff));
  }
  if (card.healAmount) {
    const eff = effectiveHeal(card, creature);
    if (eff !== card.healAmount)
      d = d.replace(new RegExp(`\\b${card.healAmount}\\b(?=\\s*HP)`, 'g'), String(eff));
  }
  return d;
}

// ─── HP bar helpers ────────────────────────────────────────────
export function hpPercent(cur, max) { return Math.max(0, Math.min(100, (cur / max) * 100)); }
export function hpBarColor(pct) {
  if (pct > 50) return "#40C850";
  if (pct > 20) return "#F8D030";
  return "#F85840";
}

// ─── Array shuffle (Fisher-Yates) ─────────────────────────────
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
