// Personal touches for her. Edit freely.

/** Featured on the Home screen (her favourite: Yelan C6). */
export const FEATURED_CHARACTER = 'yelan'

/**
 * Sets listed first in the set picker. Proposed from her characters' usual builds
 * (Step 5); confirmed/extended in Step 8. Sets for Sandrone, Odette, Varka and
 * Durin still to be added.
 */
export const FARMED_SETS = [
  'emblemofseveredfate', // Yelan, Xiangling
  'goldentroupe', // Furina, Yae Miko
  'nighttimewhispersintheechoingwoods', // Navia
  'scrolloftheheroofcindercity', // Xilonen, Citlali
  'finaleofthedeepgalleries', // Skirk
  'fragmentofharmonicwhimsy', // Clorinde
  'noblesseoblige', // Bennett
  'oceanhuedclam', // Qiqi
]

/** Her server: sets the daily reset (04:00 server time) for domain schedules. */
export const SERVER_REGION = 'Europe' as const

/** Resin she spends a day (she uses all of it: 1 per 8 min = 180). */
export const RESIN_PER_DAY = 180

/**
 * Her World Level. Drop data only goes to WL 8, so WL 9 uses WL 8 rates
 * (a safe, slightly pessimistic estimate).
 */
export const WORLD_LEVEL = 9

/** Her UID, prefilled for importing her in-game showcase from Enka.Network. */
export const ENKA_UID = '725282297'
