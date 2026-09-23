// Team comps from the KQM (keqingmains.com) quick guides for her characters, read 2026-09-23.
// Each slot lists the guide's first pick, then its alternatives ("Xilonen / Zhongli").
// Only teams with at least one of her characters were copied. Travelers are left out.

export interface GuideTeam {
  name: string
  /** Four slots; each is [first pick, ...alternatives] as character keys. */
  slots: string[][]
  /** Guide the team came from. */
  guide: string
  url: string
}

const KQM = (who: string) => `https://keqingmains.com/q/${who}-quickguide/`

const t = (guide: string, url: string, name: string, ...slots: string[]): GuideTeam => ({
  name,
  slots: slots.map((s) => s.split('/').map((k) => k.trim())),
  guide,
  url,
})

const from =
  (who: string, label: string) =>
  (name: string, ...slots: string[]) =>
    t(`KQM ${label} guide`, KQM(who), name, ...slots)

const yelan = from('yelan', 'Yelan')
const furina = from('furina', 'Furina')
const navia = from('navia', 'Navia')
const skirk = from('skirk', 'Skirk')
const yae = from('yae', 'Yae Miko')
const clorinde = from('clorinde', 'Clorinde')
const xiangling = from('xiangling', 'Xiangling')
const sandrone = from('sandrone', 'Sandrone')
const varka = from('varka', 'Varka')
const odette = from('odette', 'Odette')
const durin = from('durin', 'Durin')
const citlali = from('citlali', 'Citlali')

export const GUIDE_TEAMS: GuideTeam[] = [
  // Yelan
  yelan('Mono Hydro', 'yelan', 'furina', 'sangonomiyakokomi', 'xingqiu'),
  yelan('Mono Hydro', 'yelan', 'furina', 'kamisatoayato', 'xilonen'),
  yelan('Double Hydro Reverse Vape', 'yelan', 'furina', 'hutao', 'xianyun'),
  yelan('Reverse Vape', 'yelan', 'arlecchino', 'bennett', 'xilonen/kaedeharakazuha/sucrose'),
  yelan('Reverse Vape', 'yelan', 'raidenshogun', 'xiangling', 'bennett'),
  // Furina
  furina('Hypercarry', 'furina', 'neuvillette', 'kaedeharakazuha', 'xilonen/zhongli'),
  furina('Navia Hypercarry', 'furina', 'bennett', 'navia', 'zhongli/xilonen'),
  furina('Vaporize', 'furina', 'bennett', 'xiangling', 'xingqiu'),
  furina('Freeze', 'furina', 'skirk', 'shenhe/yelan/xingqiu', 'escoffier'),
  furina('Electro-Charged', 'furina', 'clorinde', 'ororon', 'xilonen/kaedeharakazuha'),
  // Navia
  navia('Geo Hypercarry', 'navia', 'xilonen/zhongli', 'furina', 'bennett'),
  navia('Double Hydro', 'navia', 'xilonen', 'furina', 'yelan'),
  navia('Double Pyro', 'navia', 'xilonen', 'mavuika', 'bennett'),
  navia('Double Pyro', 'navia', 'kachina', 'xiangling', 'bennett'),
  // Skirk
  skirk('Freeze', 'skirk', 'furina', 'escoffier', 'shenhe/citlali'),
  skirk('Freeze', 'skirk', 'furina', 'escoffier', 'dahlia/yelan'),
  skirk('Freeze', 'skirk', 'yelan', 'escoffier', 'shenhe/xingqiu'),
  skirk('Double Hydro', 'skirk', 'yelan', 'xingqiu', 'citlali'),
  skirk('Triple Hydro', 'skirk', 'furina', 'yelan', 'mika/charlotte'),
  // Yae Miko
  yae('Stellar-Conduct', 'yaemiko', 'sandrone', 'odette', 'qiqi/alyosha'),
  yae('Overloaded', 'yaemiko', 'chevreuse', 'durin', 'nicole/fischl'),
  yae('Quickburn', 'yaemiko', 'emilie', 'durin', 'fischl'),
  yae('Aggravate', 'yaemiko', 'fischl', 'kirara', 'sucrose'),
  // Clorinde
  clorinde('Aggravate', 'clorinde', 'fischl', 'nahida', 'kaedeharakazuha'),
  clorinde('Quickbloom', 'clorinde', 'fischl', 'nahida', 'furina/yelan'),
  clorinde('Electro-Charged', 'clorinde', 'furina', 'kaedeharakazuha', 'ororon/fischl'),
  clorinde('Electro-Charged', 'clorinde', 'furina', 'xilonen', 'ororon/kujousara'),
  clorinde('Overloaded', 'clorinde', 'chevreuse', 'fischl', 'mavuika/xiangling'),
  // Xiangling
  xiangling('Reverse Vape', 'xiangling', 'bennett', 'xingqiu', 'yelan'),
  xiangling('Reverse Vape', 'xiangling', 'bennett', 'furina', 'wriothesley'),
  xiangling('Mono Pyro', 'xiangling', 'bennett', 'yoimiya', 'furina'),
  xiangling('Double Pyro', 'xiangling', 'bennett', 'navia', 'zhongli'),
  // Sandrone
  sandrone('Stellar-Conduct', 'sandrone', 'yaemiko', 'odette', 'escoffier/qiqi/alyosha/sucrose'),
  sandrone('Stellar-Conduct', 'sandrone', 'yaemiko', 'qiqi', 'escoffier/nicole/beidou/diona'),
  sandrone('Stellar-Conduct', 'sandrone', 'yaemiko', 'escoffier', 'nicole'),
  // Varka
  varka('Double Pyro', 'varka', 'venti', 'bennett', 'durin'),
  varka('Double Pyro', 'varka', 'faruzan/sucrose/kaedeharakazuha', 'bennett', 'durin'),
  varka('Double Pyro', 'varka', 'venti', 'bennett', 'xiangling/thoma'),
  varka('Double Hydro', 'varka', 'jean', 'furina', 'yelan/mona'),
  varka('Double Hydro', 'varka', 'venti', 'furina', 'sigewinne'),
  // Odette
  odette('Stellar-Conduct', 'odette', 'cyno', 'yaemiko', 'qiqi/alyosha'),
  // Durin
  durin('Anemo DPS support', 'durin', 'varka', 'nicole', 'venti/prune'),
  durin('Vaporize', 'durin', 'furina', 'mona', 'bennett/xilonen'),
  durin('Dual-carry Vape', 'durin', 'neuvillette', 'xilonen/albedo', 'furina'),
  durin('Overvape', 'durin', 'furina', 'fischl', 'bennett'),
  // Citlali
  citlali('Melt', 'citlali', 'mavuika', 'bennett', 'sucrose/kaedeharakazuha/xilonen'),
  citlali('Melt', 'citlali', 'arlecchino', 'bennett', 'sucrose/kaedeharakazuha/xilonen'),
  citlali('Vapemelt', 'citlali', 'hutao', 'yelan', 'xingqiu'),
  citlali('Freeze', 'citlali', 'neuvillette', 'lynette/kaedeharakazuha', 'furina'),
]

/** The guide team with each slot filled by the first pick she owns (or the first pick). */
export function resolveGuideTeam(team: GuideTeam, owned: Set<string>) {
  const members: string[] = []
  for (const alts of team.slots)
    members.push(alts.find((k) => owned.has(k) && !members.includes(k)) ?? alts[0])
  return { members, ownedCount: members.filter((k) => owned.has(k)).length }
}

/**
 * Suggestions for her roster: each distinct party once, most-owned first.
 * Only teams where she owns at least `minOwned` members.
 */
export function suggestTeams(owned: Set<string>, minOwned = 3) {
  const seen = new Set<string>()
  return GUIDE_TEAMS.map((team) => ({ team, ...resolveGuideTeam(team, owned) }))
    .filter(({ members, ownedCount }) => {
      const id = [...members].sort().join('|')
      if (ownedCount < minOwned || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .sort((a, b) => b.ownedCount - a.ownedCount)
}
