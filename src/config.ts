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

/** Shown once on the welcome screen, and as a little line on Home. Edit freely. */
export const WELCOME_MESSAGE = {
  title: 'Hello, my love ♡',
  body: 'I made this little companion just for you, so every adventure in Teyvat is a bit easier (and a bit prettier). It knows your characters and tells you what to do next. I love you so much.',
  home: 'Made with love, just for you ♡',
}

/** Her characters, added on first open (editable defaults; Yelan is her C6 favourite). */
export const SEED_CHARACTERS = [
  'sandrone',
  'odette',
  'qiqi',
  'yaemiko',
  'yelan',
  'furina',
  'navia',
  'skirk',
  'citlali',
  'xilonen',
  'xiangling',
  'bennett',
  'varka',
  'durin',
  'clorinde',
]

/**
 * Artifact farming (Step 21, your answers): resin a day spent in artifact domains, and the average
 * number of 5★ artifacts per 20-resin domain run (≈1.07 at World Level 8+, from the Genshin wiki's
 * community drop data; genshin-db, Genshin Optimizer and paimon.moe don't have it).
 */
export const ARTIFACT_RESIN_PER_DAY = 120
export const FIVE_STARS_PER_DOMAIN_RUN = 1.07
export const RESIN_PER_DOMAIN_RUN = 20
