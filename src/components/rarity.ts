/** Soft backdrop colour for an item of this rarity. */
function rarityTint(rarity: number) {
  return rarity >= 5 ? 'var(--geo)' : rarity === 4 ? 'var(--electro)' : 'var(--hydro)'
}

/** Backdrop gradient for an item of this rarity. */
export function rarityBackground(rarity: number) {
  const tint = rarityTint(rarity)
  return `linear-gradient(160deg, color-mix(in srgb, ${tint} 30%, transparent), color-mix(in srgb, ${tint} 6%, transparent))`
}
