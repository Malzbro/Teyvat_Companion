// Weapon rankings from the KQM (keqingmains.com) quick guides for her characters, read 2026-09-23.
// Best first. An entry with several weapons means the guide ranks them together ("5★ CRIT Swords").
// Notes are short paraphrases of the guide.

export interface WeaponPick {
  /** Weapon keys from game data; one, or a group the guide ranks together. */
  weapons: string[]
  note: string
}

export interface WeaponGuide {
  url: string
  picks: WeaponPick[]
}

const KQM = (who: string) => `https://keqingmains.com/q/${who}-quickguide/`
const p = (weapons: string, note: string): WeaponPick => ({ weapons: weapons.split(' '), note })

export const WEAPON_GUIDES: Record<string, WeaponGuide> = {
  yelan: {
    url: KQM('yelan'),
    picks: [
      p('aquasimulacra', 'Her strongest for personal damage; needs ER from artifacts.'),
      p('elegyfortheend', 'Less personal damage, but buffs the team with EM and ATK%.'),
      p('favoniuswarbow', 'Best 4★: covers her ER and helps the team’s energy.'),
      p(
        'silvershowerheartstrings hunterspath astralvulturescrimsonplumage polarstar skywardharp thunderingpulse thefirstgreatmagic',
        '5★ crit bows: all similar when ER needs are low.',
      ),
      p('slingshot', 'Strong free option at low ER needs.'),
      p('mouunsmoon', 'Matches Slingshot at R3+, better at R5.'),
      p('thestringless', 'At R5, about the same as Slingshot.'),
      p('recurvebow', 'Good free option at low ER, better with more crit.'),
      p('fadingtwilight', 'Slightly better than Slingshot when ER needs are high.'),
      p('sacrificialbow', 'Energy option, less consistent than Favonius.'),
    ],
  },
  furina: {
    url: KQM('furina'),
    picks: [
      p('splendoroftranquilwaters', 'Signature: most personal damage if ER needs are met.'),
      p('urakumisugiri', 'Great Crit DMG and Skill DMG when ER is covered.'),
      p('primordialjadecutter', 'Crit Rate and HP%: solid personal damage.'),
      p('keyofkhajnisut', 'HP% plus a big team EM buff.'),
      p('freedomsworn', 'For teams with ATK-scaling damage dealers.'),
      p('favoniussword', 'Reliable ER, but much less personal damage.'),
      p('serenityscall', 'Good with high ER needs.'),
      p('festeringdesire', 'Skill buffs with ER.'),
      p('fleuvecendreferryman', 'Solid free option (Fontaine fishing).'),
      p(
        'lightoffoliarincision harangeppakufutsu mistsplitterreforged',
        'Crit stat sticks: fine at lower ER needs.',
      ),
      p('harbingerofdawn', 'Budget crit option; passive needs lots of team healing.'),
    ],
  },
  navia: {
    url: KQM('navia'),
    picks: [
      p('verdict', 'Signature: ATK% and Skill DMG, not far ahead of the rest.'),
      p('athousandblazingsuns', 'About equal to Verdict with full uptime.'),
      p('serpentspine', 'Excellent 4★; at R5 can beat Verdict.'),
      p('beaconofthereedsea', 'Crit Rate stat; performs very well.'),
      p('redhornstonethresher', 'Big Crit DMG.'),
      p('fangofthemountainking', 'High base ATK.'),
      p('theunforged wolfsgravestone', 'Lots of ATK%.'),
      p('skywardpride', 'High base ATK with ER.'),
      p('talkingstick', 'Decent with Bennett.'),
      p('ultimateoverlordsmegamagicsword', 'Event weapon with ER.'),
      p('tidalshadow', 'Best craftable if she gets healed.'),
      p('earthshaker', 'Craftable; good with a Pyro teammate.'),
      p('prototypearchaic', 'Simple, decent option.'),
      p('katsuragikirinagamasa', 'ER helps in high-energy teams.'),
    ],
  },
  skirk: {
    url: KQM('skirk'),
    picks: [
      p('azurelight', 'Signature: roughly 20% ahead of everything else.'),
      p(
        'primordialjadecutter harangeppakufutsu mistsplitterreforged',
        'Close to each other; lots of Crit Rate.',
      ),
      p('calamityofeshu', 'Event 4★: on par with the 5★s when its passive is active (shield).'),
      p('finaleofthedeep', 'Best 4★ by far for quickswap Skirk.'),
      p(
        'absolution lightoffoliarincision urakumisugiri splendoroftranquilwaters',
        'Other 5★ crit swords: slightly below R5 Finale.',
      ),
      p('theblacksword kagotsurubeisshin', 'Placeholders.'),
    ],
  },
  yaemiko: {
    url: KQM('yae'),
    picks: [
      p('kagurasverity', 'Her best weapon in every playstyle.'),
      p('reliquaryoftruth', 'Lots of crit, strong even without the full passive.'),
      p('vividnotions', 'Unconditional stats.'),
      p('echoesoftheheart', 'Best 4★ (craftable) for Stellar-Conduct.'),
      p(
        'cashflowsupervision tulaytullahsremembrance tomeoftheeternalflow surfsup nocturnescurtaincall angelosheptades skywardatlas',
        'Other 5★ catalysts: similar.',
      ),
      p('athousandfloatingdreams', 'Big EM plus team buffs.'),
      p('thewidsith', 'Decent placeholder.'),
      p('wanderingevenstar', 'Better for buffing teammates.'),
    ],
  },
  clorinde: {
    url: KQM('clorinde'),
    picks: [
      p('absolution', 'Signature: buffs all her damage.'),
      p('harangeppakufutsu', 'Great for her Normal Attacks (don’t overcap Crit Rate).'),
      p('urakumisugiri mistsplitterreforged', 'Solid 5★ Crit DMG swords.'),
      p('theblacksword', 'Strong 4★ with ATK buffers (Sara, Iansan, Bennett).'),
      p('finaleofthedeep', 'Best free weapon; fits her kit.'),
      p('calamityofeshu', 'Very strong when she has a shield.'),
      p('harbingerofdawn', 'Strong 3★ if the passive stays up.'),
    ],
  },
  xiangling: {
    url: KQM('xiangling'),
    picks: [
      p('staffofthescarletsands', 'Best in almost all her teams.'),
      p('thecatch', 'R5 free weapon with ER; competes with 5★s.'),
      p('favoniuslance', 'Great when teammates need energy.'),
      p('engulfinglightning', 'Best without Bennett; lots of ER.'),
      p('kitaincrossspear', 'R5: good for high ER needs.'),
      p('balladofthefjords', 'Strong in Vape teams with 3+ elements.'),
      p('wavebreakersfin', 'Better at R5, with high-cost Burst teammates.'),
      p('staffofhoma', 'Good stat stick.'),
      p('dragonsbane', 'EM stat; good in Reverse Vape and Burgeon.'),
      p('deathmatch', 'Solid in Chevreuse/Raiden teams.'),
    ],
  },
  sandrone: {
    url: KQM('sandrone'),
    picks: [
      p('ateaspoonoftranscendence', 'Best in slot, made for her.'),
      p('athousandblazingsuns', 'Second best; lots of stats.'),
      p(
        'wolfsgravestone redhornstonethresher verdict beaconofthereedsea theunforged',
        'Other 5★ claymores: better than R5 Tidal Shadow.',
      ),
      p('forgedbythegoldenmelody', 'Battle Pass; R1 ≈ R5 Tidal Shadow.'),
      p('bladeofatonement', 'Craftable; R5 is the second-best 4★ for Stellar-Conduct.'),
      p('tidalshadow', 'R5 is the best 4★ with a healer.'),
      p('mailedflower', 'R5 ≈ Tidal Shadow; better without a healer.'),
      p('blackcliffslasher serpentspine', 'Viable, below R5 Tidal Shadow.'),
    ],
  },
  varka: {
    url: KQM('varka'),
    picks: [
      p('gestofthemightywolf', 'Signature and best in slot.'),
      p('athousandblazingsuns beaconofthereedsea redhornstonethresher', 'Second-best 5★s.'),
      p('serpentspine', 'Best 4★; at high refinement competes with 5★s.'),
      p('theunforged wolfsgravestone fangofthemountainking', 'Good ATK% 5★s, no crit.'),
      p('talkingstick', 'Crit Rate plus a buff from enemy auras.'),
      p('tidalshadow', 'Best free option if he gets healed.'),
      p('blackcliffslasher', 'Reliable crit stat stick.'),
      p('ultimateoverlordsmegamagicsword', 'Solid generalist.'),
      p('earthshaker', 'Craftable; passive helps in Double Pyro.'),
      p('prototypearchaic', 'Fallback.'),
    ],
  },
  odette: {
    url: KQM('odette'),
    picks: [
      p('whitelakefrostfeather', 'Signature: buffs Stellar Glimmer and refunds energy.'),
      p('azurelight absolution primordialjadecutter', '5★ crit swords: valuable stats.'),
      p('exaiphanesblade', 'Good stat stick if nobody else uses it.'),
      p('aquilafavonia', 'High base ATK and ATK%.'),
      p('finaleofthedeep', 'Best 4★ if she can clear her Bond of Life.'),
      p('emberwell', 'Only if Bond of Life stays and the passive is active.'),
      p('hereticsmoltenblade', 'Decent: her Skill teleports her to the enemy.'),
    ],
  },
  durin: {
    url: KQM('durin'),
    picks: [
      p('athameartis', 'Best in slot, support or DPS.'),
      p('freedomsworn', 'Support: buffs ATK-scaling attack DPS.'),
      p(
        'primordialjadecutter mistsplitterreforged harangeppakufutsu azurelight absolution whitelakefrostfeather exaiphanesblade',
        'DPS: other 5★ crit swords.',
      ),
      p('favoniussword', 'Support: helps the team’s energy.'),
      p('wolffang', 'DPS: best 4★; R5 competes with 5★s.'),
      p('xiphosmoonlight', 'Support: more personal damage than Favonius; needs EM.'),
      p('moonweaversdawn', 'DPS: free at R1.'),
      p('lionsroar', 'DPS: R5, in Overloaded and Burning teams.'),
      p('finaleofthedeep', 'DPS: R5, in teams that enable its passive.'),
    ],
  },
  citlali: {
    url: KQM('citlali'),
    picks: [
      p('starcallerswatch', 'Best: high EM and a DMG buff for the on-fielder.'),
      p('thrillingtalesofdragonslayers', 'Best after Starcaller’s: big ATK% buff for ATK DPS.'),
      p('wanderingevenstar', 'EM with team ATK; usually below TTDS.'),
      p('athousandfloatingdreams', 'High EM and a small team EM buff.'),
      p('favoniuscodex', 'Only if the team has no ATK scalers.'),
      p('mappamare sacrificialfragments magicguide', 'EM stat sticks.'),
    ],
  },
  xilonen: {
    url: KQM('xilonen'),
    picks: [
      p('peakpatrolsong', 'Signature and best in slot.'),
      p('favoniussword', 'Second best: energy for the team.'),
      p('freedomsworn', 'For Normal/Charged/Plunge teams.'),
      p('xiphosmoonlight', 'EM build support.'),
      p(
        'skywardblade sacrificialsword sapwoodblade cinnabarspindle festeringdesire fleuvecendreferryman',
        'Any levelled ER/DEF% sword.',
      ),
      p('skyridersword', 'Budget: solid ER.'),
      p('fluteofezpitzal', 'Free DEF% sword, works unlevelled.'),
    ],
  },
  bennett: {
    url: KQM('bennett'),
    picks: [
      p('mistsplitterreforged', 'Highest base ATK: biggest ATK buff.'),
      p('azurelight', 'Top base ATK with Crit Rate.'),
      p('absolution', 'Top base ATK with Crit DMG.'),
      p('aquilafavonia', 'Top base ATK.'),
      p('skywardblade', 'When energy needs are high.'),
      p('freedomsworn', 'In reaction-heavy teams.'),
      p('peakpatrolsong', 'Team DMG bonus; better at high refinement.'),
      p('thealleyflash', 'Highest 4★ base ATK.'),
      p('sapwoodblade', 'Best free option.'),
      p('favoniussword', 'For teams with extreme energy needs.'),
    ],
  },
  qiqi: {
    url: KQM('qiqi'),
    picks: [
      p('favoniussword', 'Best: lowers her and the team’s ER needs.'),
      p('freedomsworn', 'Team Normal/Charged/Plunge DMG and ATK%.'),
      p('keyofkhajnisut', 'Big team EM buff, great for Melt.'),
      p('peakpatrolsong', 'Elemental DMG% from DEF.'),
      p('finaleofthedeep', 'Craftable; at R5 rivals 5★s.'),
      p('azurelight summitshaper aquilafavonia', 'High-ATK 5★s.'),
      p('xiphosmoonlight', 'Team ER from her EM.'),
      p('sacrificialsword', 'No longer needed.'),
    ],
  },
}
