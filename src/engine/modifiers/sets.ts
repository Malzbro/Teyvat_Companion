// Hand-written artifact set effects beyond the stat-screen 2pc (those are parsed in ../setBonus).
// Numbers are from each set's in-game text (genshin-db) and were approved in Step 8.

import type { Condition, ModifierContext, ModifierSet, Modifier, Note } from './types'
import { emptyModifierSet } from './types'

interface SetEffect {
  /** Damage-type 2pc bonuses (plain stat 2pcs are handled by the stat engine). */
  twoPiece?: (ctx: ModifierContext) => Partial<ModifierSet>
  fourPiece?: (ctx: ModifierContext) => Partial<ModifierSet>
}

const toggle = (id: string, source: string, label: string, on = true): Condition => ({
  id,
  source,
  label,
  kind: 'toggle',
  default: on ? 1 : 0,
})
const stacks = (
  id: string,
  source: string,
  label: string,
  max: number,
  start: number,
): Condition => ({
  id,
  source,
  label,
  kind: 'stacks',
  max,
  default: start,
})
const mod = (
  id: string,
  source: string,
  stat: Modifier['stat'],
  value: number,
  extra: Partial<Modifier> = {},
): Modifier => ({
  id,
  source,
  stat,
  value,
  ...extra,
})
const note = (source: string, text: string): Note => ({ source, text })

export const SET_EFFECTS: Record<string, SetEffect> = {
  emblemofseveredfate: {
    fourPiece: () => ({
      modifiers: [
        mod('emblem-4', 'Emblem of Severed Fate 4pc', 'burst_dmg_', 0, {
          fromStats: (s) => Math.min(0.75, 0.25 * s.enerRech_),
        }),
      ],
    }),
  },

  goldentroupe: {
    twoPiece: () => ({ modifiers: [mod('troupe-2', 'Golden Troupe 2pc', 'skill_dmg_', 0.2)] }),
    fourPiece: () => ({
      modifiers: [
        mod('troupe-4', 'Golden Troupe 4pc', 'skill_dmg_', 0.25),
        mod('troupe-4-off', 'Golden Troupe 4pc', 'skill_dmg_', 0.25, {
          condition: 'troupe-offfield',
        }),
      ],
      conditions: [
        toggle('troupe-offfield', 'Golden Troupe 4pc', 'Off-field: Skill DMG +25% more'),
      ],
    }),
  },

  nighttimewhispersintheechoingwoods: {
    fourPiece: () => ({
      modifiers: [
        mod('whispers-4', 'Nighttime Whispers 4pc', 'geo_dmg_', 0.2, {
          condition: 'whispers-skill',
        }),
        // "increased by 150%" of the 20% → +30% more.
        mod('whispers-4-shield', 'Nighttime Whispers 4pc', 'geo_dmg_', 0.3, {
          condition: 'whispers-crystallize',
          requires: ['whispers-skill'],
        }),
      ],
      conditions: [
        toggle('whispers-skill', 'Nighttime Whispers 4pc', 'After Skill: Geo DMG +20%'),
        toggle(
          'whispers-crystallize',
          'Nighttime Whispers 4pc',
          'Crystallize shield: +150% of that',
          false,
        ),
      ],
    }),
  },

  finaleofthedeepgalleries: {
    fourPiece: () => ({
      modifiers: [
        mod('finale-4-na', 'Finale of the Deep Galleries 4pc', 'normal_dmg_', 0.6, {
          condition: 'finale-zero',
        }),
        mod('finale-4-burst', 'Finale of the Deep Galleries 4pc', 'burst_dmg_', 0.6, {
          condition: 'finale-zero',
        }),
      ],
      conditions: [
        toggle(
          'finale-zero',
          'Finale of the Deep Galleries 4pc',
          'At 0 Energy: Normal Attack and Burst DMG +60%',
        ),
      ],
      notes: [
        note(
          'Finale of the Deep Galleries 4pc',
          'Dealing Normal Attack DMG pauses the Burst bonus for 6s, and vice versa.',
        ),
      ],
    }),
  },

  fragmentofharmonicwhimsy: {
    fourPiece: () => ({
      modifiers: [
        mod('whimsy-4', 'Fragment of Harmonic Whimsy 4pc', 'dmg_', 0.18, {
          condition: 'whimsy-stacks',
        }),
      ],
      conditions: [
        stacks(
          'whimsy-stacks',
          'Fragment of Harmonic Whimsy 4pc',
          'Bond of Life changes: DMG +18% each',
          3,
          3,
        ),
      ],
    }),
  },

  marechausseehunter: {
    twoPiece: () => ({
      modifiers: [
        mod('mh-2-na', 'Marechaussee Hunter 2pc', 'normal_dmg_', 0.15),
        mod('mh-2-ca', 'Marechaussee Hunter 2pc', 'charged_dmg_', 0.15),
      ],
    }),
    fourPiece: () => ({
      modifiers: [
        mod('mh-4', 'Marechaussee Hunter 4pc', 'critRate_', 0.12, { condition: 'mh-stacks' }),
      ],
      conditions: [
        stacks('mh-stacks', 'Marechaussee Hunter 4pc', 'HP changes: CRIT Rate +12% each', 3, 3),
      ],
    }),
  },

  heartofdepth: {
    fourPiece: () => ({
      modifiers: [
        mod('hod-4-na', 'Heart of Depth 4pc', 'normal_dmg_', 0.3, { condition: 'hod-skill' }),
        mod('hod-4-ca', 'Heart of Depth 4pc', 'charged_dmg_', 0.3, { condition: 'hod-skill' }),
      ],
      conditions: [
        toggle('hod-skill', 'Heart of Depth 4pc', 'After Skill: Normal/Charged DMG +30%'),
      ],
    }),
  },

  blizzardstrayer: {
    fourPiece: () => ({
      modifiers: [
        mod('blizzard-4', 'Blizzard Strayer 4pc', 'critRate_', 0.2, { condition: 'blizzard-cryo' }),
        mod('blizzard-4-frozen', 'Blizzard Strayer 4pc', 'critRate_', 0.2, {
          condition: 'blizzard-frozen',
          requires: ['blizzard-cryo'],
        }),
      ],
      conditions: [
        toggle('blizzard-cryo', 'Blizzard Strayer 4pc', 'Enemy affected by Cryo: CRIT Rate +20%'),
        toggle('blizzard-frozen', 'Blizzard Strayer 4pc', 'Enemy Frozen: +20% more', false),
      ],
    }),
  },

  crimsonwitchofflames: {
    fourPiece: () => ({
      modifiers: [
        mod('cw-4-amp', 'Crimson Witch 4pc', 'amplify_dmg_', 0.15),
        mod('cw-4-trans', 'Crimson Witch 4pc', 'transformative_dmg_', 0.4),
        // "increases the 2-Piece Set Bonus by 50% of its starting value" → +7.5% Pyro per stack.
        mod('cw-4-stacks', 'Crimson Witch 4pc', 'pyro_dmg_', 0.075, { condition: 'cw-stacks' }),
      ],
      conditions: [
        stacks('cw-stacks', 'Crimson Witch 4pc', 'Skill uses: Pyro DMG +7.5% each', 3, 1),
      ],
    }),
  },

  gildeddreams: {
    fourPiece: ({ character, teammates }) => {
      const team = teammates.slice(0, 3)
      const same = team.filter((t) => t.element === character.element).length
      const different = team.length - same
      return {
        modifiers: [
          mod('gilded-4-atk', 'Gilded Dreams 4pc', 'atk_', 0.14 * same, {
            condition: 'gilded-reaction',
          }),
          mod('gilded-4-em', 'Gilded Dreams 4pc', 'eleMas', 50 * different, {
            condition: 'gilded-reaction',
          }),
        ],
        conditions: [
          toggle(
            'gilded-reaction',
            'Gilded Dreams 4pc',
            `After a reaction: ATK +${14 * same}%, EM +${50 * different} (from team)`,
          ),
        ],
      }
    },
  },

  obsidiancodex: {
    twoPiece: () => ({
      modifiers: [
        mod('codex-2', 'Obsidian Codex 2pc', 'dmg_', 0.15, { condition: 'codex-blessing' }),
      ],
      conditions: [
        toggle(
          'codex-blessing',
          'Obsidian Codex 2pc',
          "On field in Nightsoul's Blessing: DMG +15%",
        ),
      ],
    }),
    fourPiece: () => ({
      modifiers: [
        mod('codex-4', 'Obsidian Codex 4pc', 'critRate_', 0.4, { condition: 'codex-consume' }),
      ],
      conditions: [
        toggle('codex-consume', 'Obsidian Codex 4pc', 'After using Nightsoul: CRIT Rate +40%'),
      ],
    }),
  },

  noblesseoblige: {
    twoPiece: () => ({ modifiers: [mod('no-2', 'Noblesse Oblige 2pc', 'burst_dmg_', 0.2)] }),
    fourPiece: () => ({
      modifiers: [mod('no-4', 'Noblesse Oblige 4pc', 'atk_', 0.2, { condition: 'no-burst' })],
      conditions: [toggle('no-burst', 'Noblesse Oblige 4pc', 'After Burst: ATK +20%')],
      notes: [
        note('Noblesse Oblige 4pc', 'Also gives the whole party ATK +20% for 12s after a Burst.'),
      ],
    }),
  },

  tenacityofthemillelith: {
    fourPiece: () => ({
      modifiers: [
        mod('tom-4', 'Tenacity of the Millelith 4pc', 'atk_', 0.2, { condition: 'tom-skill' }),
      ],
      conditions: [toggle('tom-skill', 'Tenacity of the Millelith 4pc', 'Skill hit: ATK +20%')],
      notes: [
        note(
          'Tenacity of the Millelith 4pc',
          'Also gives the party ATK +20% and Shield Strength +30% for 3s on Skill hit.',
        ),
      ],
    }),
  },

  scrolloftheheroofcindercity: {
    twoPiece: () => ({
      notes: [
        note(
          'Scroll of the Hero of Cinder City 2pc',
          'Regenerates 6 Energy when a party member triggers a Nightsoul Burst.',
        ),
      ],
    }),
    fourPiece: () => ({
      notes: [
        note(
          'Scroll of the Hero of Cinder City 4pc',
          "Party buff: +12% DMG for the elements in her reactions (+28% more in Nightsoul's Blessing). Helps teammates; not counted here.",
        ),
      ],
    }),
  },

  oceanhuedclam: {
    fourPiece: () => ({
      notes: [
        note(
          'Ocean-Hued Clam 4pc',
          'Healing builds up a bubble that bursts for 90% of the healing done (up to 30,000). Not counted here.',
        ),
      ],
    }),
  },
}

/** Set modifiers for the equipped pieces: 2pc from 2 pieces, 4pc from 4. */
export function setModifiers(ctx: ModifierContext): ModifierSet {
  const out = emptyModifierSet()
  for (const [key, count] of Object.entries(ctx.setCounts)) {
    const effect = SET_EFFECTS[key]
    const parts = [count >= 2 && effect?.twoPiece?.(ctx), count >= 4 && effect?.fourPiece?.(ctx)]
    for (const p of parts) {
      if (!p) continue
      out.modifiers.push(...(p.modifiers ?? []))
      out.conditions.push(...(p.conditions ?? []))
      out.notes.push(...(p.notes ?? []))
    }
    if (count >= 4 && !effect?.fourPiece)
      out.notes.push(note('4-piece set', 'This set’s 4pc effect isn’t modelled yet.'))
  }
  return out
}
