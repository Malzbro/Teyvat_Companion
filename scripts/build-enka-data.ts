// Builds src/data/generated/enka.json: which Enka skill id is Normal Attack / Skill / Burst
// for each character (Enka's store/gi/avatars.json "SkillOrder"). Run with: npm run build:enka-data

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL_ = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/gi/avatars.json'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const res = await fetch(URL_)
if (!res.ok) throw new Error(`${res.status} fetching ${URL_}`)
const avatars = (await res.json()) as Record<string, { SkillOrder?: number[] }>

const characters = JSON.parse(
  readFileSync(join(root, 'src/data/generated/characters.json'), 'utf8'),
) as { key: string; id: number; name: string }[]

const skillOrder: Record<string, [number, number, number]> = {}
const missing: string[] = []
for (const c of characters) {
  const order = avatars[String(c.id)]?.SkillOrder
  if (order?.length === 3) skillOrder[c.key] = order as [number, number, number]
  else missing.push(c.name)
}

writeFileSync(
  join(root, 'src/data/generated/enka.json'),
  JSON.stringify({ source: URL_, skillOrder }) + '\n',
)
console.log(
  `Enka skill order for ${Object.keys(skillOrder).length} characters; missing: ${missing.join(', ') || 'none'}`,
)
