// Rotations approved in Step 18 (2026-10-19). Hits per 20 s team cycle; multipliers are read from
// genshin-db at the character's own talent level (src/data/talents.ts), never typed in here.

import type { Hit, Rotation } from './types'

/** Hits of a Normal Attack combo (1-Hit … n-Hit), `times` combos. */
const combo = (hits: number, times: number, extra: Partial<Hit> = {}): Hit[] =>
  Array.from({ length: hits }, (_, i) => ({
    talent: 'normal' as const,
    label: `${i + 1}-Hit DMG`,
    count: times,
    type: 'normal' as const,
    ...extra,
  }))

const rotation = (key: string, hits: Hit[], note?: string): Rotation => ({ key, hits, note })

export const CYCLE_SECONDS = 20

export const ROTATIONS: Record<string, Rotation> = {
  // --- Damage dealers -----------------------------------------------------
  clorinde: rotation('clorinde', [
    { talent: 'burst', label: 'Skill DMG', count: 1, type: 'burst', name: 'Last Lightfall' },
    { talent: 'skill', label: 'Swift Hunt DMG', pick: 1, count: 4, type: 'normal' },
    {
      talent: 'skill',
      label: 'Impale the Night DMG',
      pick: 2,
      count: 3,
      type: 'normal',
      name: 'Impale the Night: Pact',
    },
    ...combo(5, 2, { element: 'Physical' }),
  ]),
  // Your rotation: E → CA → Windborne Lv1 → CA → Lv2 → CA → Lv3 → Q → Lv3.
  vesna: rotation(
    'vesna',
    [
      { talent: 'skill', label: 'Skill DMG', count: 1, type: 'skill', name: 'The Art of Victory' },
      { talent: 'normal', label: 'Charged Attack DMG', count: 3, type: 'charged' },
      { talent: 'skill', label: 'Wind Pinion DMG', count: 3, type: 'skill' },
      { talent: 'skill', label: 'Windborne Sword Lv. 1 DMG', count: 1, type: 'skill' },
      { talent: 'skill', label: 'Windborne Sword Lv. 2 DMG', count: 1, type: 'skill' },
      {
        talent: 'skill',
        label: 'Windborne Sword Lv. 2 Spirit Blade DMG',
        stellarLabel: 'Windborne Sword Lv. 2 Spirit Blade Stellar Swirl DMG',
        count: 1,
        type: 'skill',
        vesnaStacks: 2,
      },
      // Lv. 3 has no sword hit of its own: its damage is the Spirit Blades.
      ...[3, 5].flatMap((stacks, i): Hit[] => [
        {
          talent: 'skill',
          label: 'Windborne Sword Lv. 3 Spirit Blade DMG',
          stellarLabel: 'Windborne Sword Lv. 3 Spirit Blade Stellar Swirl DMG',
          count: 1,
          type: 'skill',
          vesnaStacks: stacks,
          name: `Lv. 3 Spirit Blades ×4 (${i ? 'after Q' : 'first'})`,
        },
        {
          talent: 'skill',
          label: 'Windborne Sword Lv. 3 Spirit Blade Final Hit DMG',
          stellarLabel: 'Windborne Sword Lv. 3 Spirit Blade Final Hit Stellar Swirl DMG',
          count: 1,
          type: 'skill',
          vesnaStacks: stacks,
          name: `Lv. 3 Spirit Blade final hit (${i ? 'after Q' : 'first'})`,
        },
      ]),
      {
        talent: 'burst',
        label: 'Spirit Blade DMG',
        stellarLabel: 'Spirit Blade Stellar Swirl DMG',
        count: 1,
        type: 'burst',
        name: 'For the Tsaritsa!',
        vesnaStacks: 4,
      },
    ],
    'With a Cryo teammate to swirl, Spirit Blades are Stellar Swirl DMG (Radiance).',
  ),
  fischl: rotation('fischl', [
    { talent: 'skill', label: 'Summoning DMG', count: 1, type: 'skill' },
    { talent: 'skill', label: "Oz's ATK DMG", count: 20, type: 'skill', name: 'Oz' },
    { talent: 'burst', label: 'Falling Thunder DMG', count: 1, type: 'burst' },
  ]),
  xiangling: rotation('xiangling', [
    { talent: 'burst', label: '1-Hit Swing DMG', count: 1, type: 'burst' },
    { talent: 'burst', label: '2-Hit Swing DMG', count: 1, type: 'burst' },
    { talent: 'burst', label: '3-Hit Swing DMG', count: 1, type: 'burst' },
    { talent: 'burst', label: 'Pyronado DMG', count: 12, type: 'burst' },
    { talent: 'skill', label: 'Flame DMG', count: 4, type: 'skill', name: 'Guoba' },
  ]),
  kaeya: rotation('kaeya', [
    { talent: 'skill', label: 'Skill DMG', count: 3, type: 'skill', name: 'Frostgnaw' },
    { talent: 'burst', label: 'Skill DMG', count: 12, type: 'burst', name: 'Glacial Waltz icicle' },
    ...combo(5, 1, { element: 'Physical' }),
  ]),
  noelle: rotation('noelle', [
    { talent: 'burst', label: 'Burst DMG', count: 1, type: 'burst', noelleBurstAtk: true },
    { talent: 'burst', label: 'Skill DMG', count: 1, type: 'burst', noelleBurstAtk: true },
    { talent: 'skill', label: 'Skill DMG', count: 1, type: 'skill', name: 'Breastplate' },
    ...combo(4, 4, { noelleBurstAtk: true }),
  ]),
  nefer: rotation(
    'nefer',
    [
      { talent: 'skill', label: 'Skill DMG', count: 2, type: 'skill', name: 'Senet Strategy' },
      ...['1-Hit', '2-Hit'].map((h): Hit => ({
        talent: 'skill',
        label: `Phantasm Performance ${h} DMG (Nefer)`,
        count: 6,
        type: 'charged',
        phantasm: true,
      })),
      ...['1-Hit', '2-Hit', '3-Hit'].map((h): Hit => ({
        talent: 'skill',
        label: `Phantasm Performance ${h} DMG (Shades)`,
        count: 6,
        type: 'charged',
        phantasm: true,
        lunar: true,
      })),
      { talent: 'burst', label: '1-Hit DMG', count: 1, type: 'burst' },
      { talent: 'burst', label: '2-Hit DMG', count: 1, type: 'burst' },
    ],
    'Shades deal Lunar-Bloom DMG. Veils of Falsehood need Ascendant Gleam (two Moonsign characters).',
  ),
  lisa: rotation('lisa', [
    { talent: 'burst', label: 'Discharge DMG', count: 29, type: 'burst', name: 'Lightning Rose' },
    { talent: 'skill', label: 'Press DMG', count: 2, type: 'skill', name: 'Violet Arc (press)' },
  ]),
  travelercryo: rotation('travelercryo', [
    { talent: 'skill', label: 'Skill DMG', count: 1, type: 'skill', name: 'Ice Fog Piercer' },
    { talent: 'skill', label: 'Ice Crystal DMG', count: 6, type: 'skill' },
    {
      talent: 'burst',
      label: 'Ice Javelin DMG',
      stellarLabel: 'Stellar Swirl Ice Javelin Single Strike DMG',
      stellarResist: 'Cryo',
      addMult: {
        label: 'Frostglow DMG Bonus',
        stellarLabel: 'Stellar Swirl Frostglow DMG Bonus',
        times: 8,
      },
      count: 5,
      type: 'burst',
      name: 'Ice Javelin (8 Frostglow)',
    },
  ]),

  // --- Supports' own damage -------------------------------------------------
  collei: rotation('collei', [
    {
      talent: 'skill',
      label: 'Skill DMG',
      count: 2,
      type: 'skill',
      name: 'Floral Ring (out and back)',
    },
    { talent: 'burst', label: 'Explosion DMG', count: 1, type: 'burst' },
    { talent: 'burst', label: 'Leap DMG', count: 12, type: 'burst', name: 'Cuilein-Anbar leap' },
  ]),
  faruzan: rotation('faruzan', [
    { talent: 'skill', label: 'Skill DMG', count: 1, type: 'skill' },
    { talent: 'skill', label: 'Pressurized Collapse Vortex DMG', count: 1, type: 'skill' },
    {
      talent: 'burst',
      label: 'Skill DMG',
      count: 1,
      type: 'burst',
      name: "The Wind's Secret Ways",
    },
  ]),
  lynette: rotation(
    'lynette',
    [
      { talent: 'skill', label: 'Enigma Thrust DMG', count: 1, type: 'skill' },
      { talent: 'burst', label: 'Skill DMG', count: 1, type: 'burst', name: 'Magic Trick' },
      { talent: 'burst', label: 'Bogglecat Box DMG', count: 8, type: 'burst' },
    ],
    'Vivid Shots take the element the box absorbs; added with reactions in Step 19.',
  ),
  bennett: rotation('bennett', [
    { talent: 'skill', label: 'Press DMG', count: 1, type: 'skill', name: 'Passion Overload' },
    { talent: 'burst', label: 'Skill DMG', count: 1, type: 'burst', name: 'Fantastic Voyage' },
  ]),
  jean: rotation('jean', [
    { talent: 'skill', label: 'Skill DMG', count: 1, type: 'skill', name: 'Gale Blade' },
    { talent: 'burst', label: 'Burst DMG', count: 1, type: 'burst', name: 'Dandelion Breeze' },
  ]),
  candace: rotation('candace', [
    { talent: 'skill', label: 'Basic DMG', count: 1, type: 'skill', name: "Heron's Sanctum" },
    { talent: 'burst', label: 'Skill DMG', count: 1, type: 'burst', name: "Wagtail's Tide" },
  ]),
  dahlia: rotation('dahlia', [
    { talent: 'skill', label: 'Skill DMG', count: 1, type: 'skill' },
    { talent: 'burst', label: 'Skill DMG', count: 1, type: 'burst', name: 'Radiant Psalter' },
  ]),
  aino: rotation('aino', [
    { talent: 'skill', label: 'Stage 1 DMG', count: 1, type: 'skill' },
    { talent: 'skill', label: 'Stage 2 DMG', count: 1, type: 'skill' },
    { talent: 'burst', label: 'Water Ball DMG', count: 10, type: 'burst' },
  ]),
  charlotte: rotation('charlotte', [
    { talent: 'skill', label: 'Photo DMG (Press)', count: 1, type: 'skill' },
    { talent: 'burst', label: 'Skill DMG', count: 1, type: 'burst', name: 'Still Photo' },
    { talent: 'burst', label: 'Kamera DMG', count: 6, type: 'burst' },
  ]),
  qiqi: rotation('qiqi', [
    { talent: 'skill', label: 'Skill DMG', count: 1, type: 'skill' },
    { talent: 'skill', label: 'Herald of Frost DMG', count: 7, type: 'skill' },
    {
      talent: 'burst',
      label: 'Skill DMG',
      count: 1,
      type: 'burst',
      name: 'Fortune-Preserving Talisman',
    },
  ]),
}
