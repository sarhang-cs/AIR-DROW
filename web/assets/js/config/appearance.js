/**
 * AIR-DROW visual-system configuration.
 * Keeps the supported premium skins and storage compatibility in one place.
 */
export const SKIN_IDS = Object.freeze([
  "violet",
  "pink",
  "sapphire",
  "obsidian",
  "silver",
  "gold"
]);

const LEGACY_SKIN_ALIASES = Object.freeze({
  ocean: "sapphire",
  emerald: "sapphire",
  rose: "pink",
  sunset: "gold"
});

export function normalizeSkin(value) {
  const requested = String(value || "").trim().toLowerCase();
  const skin = LEGACY_SKIN_ALIASES[requested] || requested;
  return SKIN_IDS.includes(skin) ? skin : "violet";
}
