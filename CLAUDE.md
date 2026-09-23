# Genshin Companion App — Build Plan for Claude Code

This file is the project plan **and** the working instructions for Claude Code.
Keep it in the project root. Claude Code reads it at the start of every session.

The app is a surprise gift for one player (my girlfriend). It answers one question:
**"Given what I own, what should I do next?"**

---

## How to work with me (read this first, Claude)

1. **One step at a time.** I'll say things like "do step 4" or "continue". Only work on that step.
2. **Ask before guessing.** Every step has an **Ask first** list. Ask those questions *before* writing code, all at once, and wait for my answers. If anything else comes up that you can't reasonably infer, stop and ask. Never invent game numbers (set bonuses, stat values, costs); ask me or read them from genshin-db.
3. **Finish the step properly.** Meet every item under **Done when**, run the tests and the build, and fix anything broken.
4. **Update this file** at the end of each step:
   - Tick the step in the Progress table.
   - Add my answers and any decisions to the **Decisions log**.
5. **Commit** with a message like `step 4: roster screen`.
6. **Report back briefly:** what you built, how I can check it (`npm run dev` + what to click), and what the next step will ask me.
7. **Keep it simple.** This is a gift for one person. No accounts, no backend beyond Step 13, no features not in this plan unless I ask.
8. **Design matters.** She'll use it because it looks nice. Every screen should feel polished on a phone first.

---

## Progress

| Step | Name | Status |
| --- | --- | --- |
| 0 | Project setup | [x] |
| 1 | Game data layer | [x] |
| 2 | Data model & local storage | [x] |
| 3 | Design system & app shell | [x] |
| 4 | Roster | [x] |
| 5 | Artifact inventory & quick-add | [x] |
| 6 | Materials planner | [x] |
| 7 | Stat calculator | [x] |
| 8 | Modifier system (sets, resonance, weapons) | [x] |
| 9 | Character profiles | [x] |
| 10 | Build optimizer | [x] |
| 11 | Character page | [x] |
| 12 | Home screen & farming plan | [x] |
| 13 | UID import via Enka (optional) | [~] built + tested with a fixture; **live import of her UID pending** (Enka returned 424 maintenance on 2026-09-23) |
| 14 | Polish, PWA & deploy | [x] |
| 15 | Gift prep | [~] built; **awaiting your test of the full flow on your phone** |

---

## Tech stack (fixed unless I say otherwise)

- **React + TypeScript + Vite**
- **Tailwind CSS** for styling
- **Dexie** (IndexedDB) for local storage, plus JSON export/import for backups
- **genshin-db** for game data, trimmed into a JSON snapshot at build time
- **Vitest** for tests
- **Vercel** for hosting (free tier), installable as a PWA
- Heavy calculations (the optimizer) run in a **Web Worker** so the UI never freezes

---

## Step 0 — Project setup

**Ask first**
- Project/app name?
- Is Node.js installed? Which version? (`node -v`)
- Should I initialise git here?

**Tasks**
- Scaffold Vite + React + TS, add Tailwind, Vitest, ESLint, Prettier.
- Folder structure: `src/data`, `src/db`, `src/engine`, `src/components`, `src/screens`, `scripts/`.
- Add `npm run dev`, `build`, `test`, `lint` scripts.

**Done when**
- `npm run dev` shows a placeholder page; `npm test` passes one sample test; first commit made.

---

## Step 1 — Game data layer

**Ask first**
- Which characters does she own? (A rough list is fine; we'll refine in Step 4.)
- Any very new characters she owns that might be missing from genshin-db?

**Tasks**
- Install `genshin-db`. Write `scripts/build-game-data.ts` that outputs a trimmed JSON snapshot to `src/data/generated/`:
  - Characters: name, element, weapon type, rarity, base stats per level, ascension stat, level-up and talent material costs, icon URL if available.
  - Weapons: base ATK and substat per level, passive text, material costs.
  - Artifact sets: name, 2pc and 4pc text, icon.
  - Materials: name, type, source, domain weekdays for talent/weapon books.
- Print a summary: counts, game data version, and any owned characters that are missing.
- Typed loaders in `src/data/index.ts`.

**Done when**
- Snapshot generated and committed; loaders are typed; a test checks one known character's base stats load correctly.
- You've told me which game version the data covers and listed anything missing.

---

## Step 2 — Data model & local storage

**Ask first**
- Nothing, unless something in Step 1 changed the plan.

**Tasks**
- TypeScript types in `src/db/types.ts`:
  - `OwnedCharacter` (id, level, ascension, constellation, talent levels, equipped weapon id, equipped artifact ids, locked flag, favourite flag)
  - `OwnedWeapon` (id, key, level, ascension, refinement)
  - `Artifact` (id, set, slot, rarity, level, main stat, up to 4 substats with values)
  - `MaterialCount` (key, count)
  - `Goal` (character, target level/talents, created date)
  - `Team` (character + up to 3 teammates)
- Dexie database with those tables.
- Export all data to a JSON file and import it back (for backups).

**Done when**
- Round-trip test: save sample data → export → wipe → import → identical.

---

## Step 3 — Design system & app shell

**Ask first**
- What vibe should it have? (e.g. dreamy/soft, sleek/dark, cosy)
- Her favourite colour(s) and favourite element?
- Her favourite character (featured on the home screen)?
- Should the app have a name or a small personal message shown somewhere?

**Tasks**
- Colour tokens: base palette, accent, the seven element colours; dark mode default with a light option.
- Components: `Card`, `Button`, `Chip`, `Stepper` (+/−), `ProgressBar`, `Sheet` (bottom sheet), `ElementBadge`, `ScoreBadge`, `EmptyState`.
- App shell: bottom tab bar (Home, Roster, Artifacts, Materials), page transitions, safe-area padding for phones.
- A `/styleguide` route showing every component.

**Done when**
- I've seen the styleguide on my phone (via `npm run dev -- --host`) and approved it. **Ask me to review before marking done.**

---

## Step 4 — Roster

**Ask first**
- The characters she plays most (start with 5–10), with level, constellation and talent levels if I know them. Otherwise leave editable defaults.
- Which weapons they currently use?

**Tasks**
- Roster grid: portrait cards coloured by element; filters by element and weapon type; favourites pinned.
- Add-character flow: search → select → set level/ascension/constellation/talents with steppers.
- Weapon inventory and equip flow (only matching weapon types).

**Done when**
- I can add, edit and remove characters and weapons on my phone; data survives a refresh.

---

## Step 5 — Artifact inventory & quick-add

**Ask first**
- Roughly how many artifacts will she enter? (Affects grid design.)
- Which artifact sets does she mainly farm?

**Tasks**
- Quick-add bottom sheet: set icon → slot icon → main stat chip → up to 4 substat chips → values. Remember the last-used set and rarity.
- Validation: main stat allowed for the slot, substats unique and not equal to the main stat, values within real roll ranges (read from data; ask me if unsure).
- Inventory grid with filters (set, slot, main stat) and equip/unequip to a character.
- Edit and delete (delete needs a confirm).

**Done when**
- Adding one artifact takes under ~15 seconds; invalid artifacts are blocked with a friendly message; tests cover validation.

---

## Step 6 — Materials planner

**Ask first**
- Which materials does she want to track: everything, or only ones for her goals? (Recommend: only goal materials.)

**Tasks**
- Goal creation: pick a character, current → target level, current → target talents (and optionally a weapon).
- Calculate required materials from Step 1 cost data; show have / need bars.
- Edit owned counts with steppers; "enough" turns green.
- Tests: known level-up cost totals match data.

**Done when**
- A goal like "Level 80 → 90" shows correct totals and updates live as counts change.

---

## Step 7 — Stat calculator

**Ask first**
- **Please give me one real character's in-game stat screen** (level, weapon, artifacts, and final ATK/HP/DEF/EM/CR/CD/ER/DMG%). I'll use it to verify the maths.

**Tasks**
- `src/engine/stats.ts`: final stats = character base + ascension stat + weapon base/substat + artifact main/substats + always-on 2pc bonuses.
- Handle flat vs % correctly (e.g. ATK% applies to character base ATK + weapon base ATK only).
- Unit tests, including the real character above (within rounding).

**Done when**
- Calculated stats match the in-game screen within ±1 for flat stats and ±0.1% for percentages.

---

## Step 8 — Modifier system (sets, resonance, weapon passives)

**Ask first**
- Confirm the 10–15 artifact sets to support first (list from her characters' needs).
- For each set's conditional 4pc effect, I'll show you my proposed numbers and conditions. **Confirm them before I commit.**
- Which weapon passives to model first (only her equipped/owned good weapons)?

**Tasks**
- A `Modifier` type: `{ source, stat, value, condition?, stacks? }`.
- `src/engine/modifiers/sets.ts`, `resonance.ts`, `weapons.ts`: hand-written tables.
- Resonance from a team: Pyro +25% ATK, Hydro +25% HP, Cryo +15% CR (conditional), Dendro +50 EM (+ conditional extra), Geo +15% DMG while shielded (conditional). Electro/Anemo/Protective Canopy have no damage stat and are shown as info only.
- Conditional modifiers have an id so the UI can toggle them.
- Team-only effects (buffs to others, enemy RES shred) are listed as notes, not calculated, in v1.

**Done when**
- Tests: adding a Pyro teammate raises ATK by 25% of base ATK; each supported set's 2pc/4pc applies only when enough pieces are equipped.

---

## Step 9 — Character profiles

**Ask first**
- For each of her main characters, confirm my proposed profile (below). **Don't guess silently; show me the table and wait.**

**Tasks**
- `src/engine/profiles.ts`, one profile per character:
  - Scaling stat (ATK / HP / DEF / EM)
  - Main damage type (e.g. Normal Attack, Skill, Burst) and element
  - Allowed Sands / Goblet / Circlet main stats
  - Candidate sets (4pc options and 2+2 pairs)
  - Typical reaction and a simple reaction multiplier (none / vaporize / melt / aggravate etc.)
  - Minimum Energy Recharge target, if any
- Present all profiles as a table for my approval.

**Done when**
- I've approved each profile.

---

## Step 10 — Build optimizer

**Ask first**
- Should characters "lock" their gear so the optimizer can't take it for someone else? (Recommend: yes, with a lock toggle.)

**Tasks**
- Score function:
  `Score = ScalingStat × (1 + DMG%) × (1 + min(CR,1) × CD) × ReactionMult`
  Skip enemy DEF/RES, since they don't change the ranking.
- Search, in a Web Worker:
  1. Filter inventory by allowed main stats; exclude gear locked to other characters.
  2. Keep the top 6–8 pieces per slot by a rough score.
  3. Try 4pc of each candidate set, 2+2 pairs, and 4pc + best off-piece.
  4. Apply stats, set bonuses, resonance and weapon passive (Steps 7–8).
  5. Return the top 3 builds with the % difference vs current and a one-line reason each.
- Respect Energy Recharge minimums from the profile.
- Tests: the optimizer picks an obviously better piece; the 4pc vs 2+2 comparison behaves sensibly; runtime under 1 second on a realistic inventory.

**Done when**
- Tests pass and a benchmark with ~300 artifacts finishes in under 1 second.

---

## Step 11 — Character page

**Ask first**
- Any extra info she'd like on this page?

**Tasks**
- Header: portrait, element, level, constellation, talents.
- Team picker (3 slots) with a resonance badge that lights up.
- Toggles for conditional effects (set 4pc, resonance conditions), sensible defaults.
- Current build: stats and build score.
- Best builds (top 3): "% better than current", which pieces to swap, and an **Equip** button.
- Material needs for this character's goal.

**Done when**
- Changing a teammate or toggle instantly re-ranks the builds; equipping a suggested build works.

---

## Step 12 — Home screen & farming plan

**Ask first**
- Her server region (Europe / America / Asia / TW-HK-MO)? This sets the daily reset time for domain schedules.
- Does she usually use all her resin daily?

**Tasks**
- Home: greeting (personal message from Step 3), featured character, active goals with progress bars.
- **Today's farming:** which talent/weapon domains are open today (by weekday and reset time) that help her goals; boss materials needed.
- Resin-days estimate per goal (use average drop rates; show as "about N days").

**Done when**
- The home screen shows correct domains for today in her region and useful tasks for her goals.

---

## Step 13 — UID import via Enka (optional)

**Ask first**
- Do we want this? If yes: her UID, and do I have a Vercel account? (**I'll log in myself; don't handle my passwords.**)

**Tasks**
- Vercel serverless function `/api/enka/[uid]` that calls the Enka.Network API, caches for the returned `ttl`, and sets a descriptive User-Agent.
- Map Enka IDs to our data; import showcase characters, weapons and their equipped artifacts.
- Merge UI: show what's new or changed, and let her choose what to import. Never silently overwrite.

**Done when**
- Importing her UID adds her showcase characters correctly and nothing is overwritten without confirmation.

---

## Step 14 — Polish, PWA & deploy

**Ask first**
- App icon idea? (Something original. Don't copy official game art for the icon.)
- Vercel project name / URL?

**Tasks**
- PWA manifest, icons, offline support, "Add to Home Screen".
- Empty states, loading states, small animations, haptic-feeling button presses.
- Accessibility pass: contrast, tap target sizes, labels.
- Settings: export/import backup, reset data, theme.
- Deploy to Vercel (I'll do the account login).

**Done when**
- The app installs to a phone home screen, works offline, and a Lighthouse PWA check passes.

---

## Step 15 — Gift prep

**Ask first**
- Should I pre-fill any data for her so it isn't empty on first open?
- Any final personal touches (message, hidden easter egg, favourite character theme)?

**Tasks**
- Optional first-run welcome flow with the personal message.
- Seed data if requested.
- Final bug sweep on a real phone.
- A short "how to use" card inside the app.

**Done when**
- I've tested the full flow on my phone and I'm happy to give it to her. 🎁

---

## Decisions log

*(Claude: add answers and decisions here as we go, newest first.)*

| Date | Step | Decision / answer |
| --- | --- | --- |
| 2026-09-23 | Fixes | **Her feedback round 1** (texts + voice notes): (1) weapons can be equipped from the weapon's own sheet ("Wielded by" → pick a character of that weapon type; replaces their current weapon). (2) Artifacts are **grouped by set** (set headings, A→Z; inside a set by slot, rarity, level). (3) **C3/C5 talent boosts**: which talent each boosts is read from genshin-db constellation text (`talentBoosts` in `characters.json`; e.g. Yelan C3 = Burst, C5 = Skill). Stored talents stay 1–10 (materials use them); boosted levels show like the game, in blue, up to 13 (`src/engine/talents.ts`). |
| 2026-09-23 | Fixes | **Supports aren't scored like DPS** (Qiqi was being told to build crit). Support profiles (Citlali, Xilonen, Bennett, Qiqi) score = scaling stat × (1 + Healing Bonus, healers only: Bennett, Qiqi) × set weight; crit, DMG% and reactions ignored. Set weight is **a ranking weight, not a game number**: ×1.25 wearing a candidate 4pc (e.g. Noblesse, Ocean-Hued Clam), ×1.1 a candidate 2+2, so their team-buff sets win over slightly better loose pieces. ER minimums still apply. |
| 2026-09-23 | Fixes | **Teams tab** (5th tab: Home · Roster · Teams · Artifacts · Materials). A team = name + up to 4 characters + which **saved build** each uses (or "Equipped gear"); the same character can be in any number of teams. "Use this team" equips every member's build and sets each one's teammates on their character page. Warns when two members' builds share gear. **Builds** = named loadouts (weapon + 5 artifact ids), shared pieces allowed; on the character page: save current gear, Equip, rename, replace with current, delete; optimizer suggestions have "Save". Dexie v2 adds `builds` + `teamComps`; backup format v2 (v1 files still import). |
| 2026-09-23 | Fixes | **Guide teams** ("From guides" on the Teams tab): 50 teams copied from the KQM quick guides (keqingmains.com) for Yelan, Furina, Navia, Skirk, Yae, Clorinde, Xiangling, Sandrone, Varka, Odette, Durin, Citlali — `src/data/teamGuides.ts`, with a link to each guide. Where a slot lists options, the one she owns is used; identical parties listed once; default filter "You own 3+" (or Show all). One tap copies a team into hers. |
| 2026-09-23 | 15 | Seed: **her 15 characters + Yelan's real build** (C6, favourite, Lv 90, Aqua Simulacra R4, the 5 artifacts from her screen; talents left 1/1/1 since the screen didn't show them — Enka import will fill them). Runs once per device (`seeded-v1` in localStorage), atomically, never over existing data (`src/seed.ts`). |
| 2026-09-23 | 15 | Personal touch: **"Hello, my love ♡ … I love you so much."** on a one-time welcome screen (with a 4-line tour), plus "Made with love, just for you ♡" under the Home title. Text lives in `src/config.ts` (`WELCOME_MESSAGE`) — edit freely. Dismissible "How to use" card on Home. |
| 2026-09-23 | 15 | Bug sweep fixes: optimizer never suggests an empty slot (falls back to her best pieces when a set has none in a slot); the character page hides alternatives worse than the current build. |
| 2026-09-23 | 14 | **Live: https://teyvat-companion.vercel.app** (Vercel project `teyvat-companion`, scope malzbros-projects; you logged in, deploy approved). Redeploy: `npx vercel deploy --prod`. `vercel.json`: SPA rewrite for everything except `/api/`. |
| 2026-09-23 | 14 | Icon: **original crescent moon** (pink→white) with a mint sparkle and stars on the night-sky plum — `public/icon.svg`, rendered to 192/512/maskable/apple-touch PNGs by `npm run build:icons`. |
| 2026-09-23 | 14 | PWA via vite-plugin-pwa: manifest (standalone, portrait, theme #13101f), auto-updating service worker, whole app + game data + fonts precached (~3 MB) → works offline (checked: server stopped, routes still load); game icons from Enka/yatta cached on first view (CacheFirst, 90 days). Current Lighthouse (v12+) has no PWA category, so installability was checked directly (manifest, icons, SW, offline, HTTPS). |
| 2026-09-23 | 14 | Settings (`/settings`, gear on Home): light/dark theme, save backup, restore backup (confirm), reset everything (confirm), data credits, styleguide link. Accessibility: contrast checked for every text colour pair (all ≥ 4.5:1); light-theme pink/mint deepened to #b83f73/#217a58; faint text lightened in dark mode. |
| 2026-09-23 | 13 | **Yes to Enka import.** Her UID **725282297** (prefilled; `ENKA_UID` in `src/config.ts`). You have a Vercel account and will log in yourself. |
| 2026-09-23 | 13 | `api/enka/[uid].ts` (Vercel function, Web `GET` handler): validates UID, calls `https://enka.network/api/uid/<uid>` with a descriptive User-Agent, caches per UID for Enka's `ttl` (in memory + `s-maxage`). In dev, a Vite proxy stands in for it. Parser `src/engine/enka.ts`: character by genshin-db id, level/ascension from propMap 4001/1002, constellation = talentIdList length, base talent levels via Enka's `SkillOrder` (`npm run build:enka-data` → `enka.json`), weapon by id (affixMap+1 = refinement), artifacts: set id from the icon name, slot from equipType, level 1–21 → 0–20, % values ÷ 100. Traveler is skipped (and said so). |
| 2026-09-23 | 13 | Merge rules: Import button on Roster → UID → review list (New / Changed with plain-word differences / Up to date; new+changed pre-ticked) → only ticked ones are written. Keeps favourite, lock and team; reuses her existing identical artifacts/weapons (no duplicates on re-import); slots empty in the showcase are left alone; imported artifacts skip validation (game data is trusted). |
| 2026-09-23 | 12 | Her server: **Europe** (reset 04:00 UTC+1; the game day changes then, not at midnight). She uses **all 180 resin** a day. **World Level 9** — drop data only goes to WL 8, so WL 9 uses WL 8 rates (safe, slightly pessimistic). Settings in `src/config.ts` (`SERVER_REGION`, `RESIN_PER_DAY`, `WORLD_LEVEL`). |
| 2026-09-23 | 12 | Drop rates from **paimon.moe** (`npm run build:drop-data` → `drops.json`): Domain IV averages for talent books/weapon mats, world boss averages by WL. Resin: 20 per domain run, 40 per world boss. Materials counted in 2★ equivalents (3:1 crafting). "About N days" = domain + world-boss resin ÷ 180; weekly bosses and EXP/Mora (ley lines) are listed but not counted. |
| 2026-09-23 | 12 | Home: greeting by time of day (no personal message yet), featured Yelan card, "Today · <weekday>" domains that help her goals (with who needs them; Sunday = all open), boss materials (world/weekly), goals with progress and day estimate. |
| 2026-09-23 | 12 | Some item icons are missing on Enka's CDN (e.g. 113056/113057); a global image-error handler retries from Project Amber (`gi.yatta.moe/assets/UI/`). |
| 2026-09-23 | 11 | No extras: "just the plan". Route `/character/:key`; tapping a roster card opens it (Roster tab stays highlighted); the old edit sheet is behind "Edit". Sections: header (portrait, element, Lv/C/talents, weapon), Team (3 slots, all resonances shown, active ones lit), "Effects in play" (toggles/stack steppers, saved per character in `settings` as `conditions:<key>`), Current build (stats, equipped tiles, notes), Best builds (top 3, % vs current, pieces to swap and from whom, Equip), Materials (goal progress + top missing, or "Set a goal"). |
| 2026-09-23 | 11 | **Build score** (0–100) = current build's score as a % of the best build the optimizer finds from her artifacts (100 = nothing better possible). Worse alternatives show "−x%" muted with a secondary Equip; the current build shows "Already equipped". Optimizer re-runs in the Web Worker whenever team, toggles, gear or levels change. |
| 2026-09-23 | 11 | Perf note for Step 14: the worker bundle is ~950 KB (it includes the game data). |
| 2026-09-23 | 10 | **Gear lock: yes.** A "Lock gear" toggle on each character (Roster sheet); a locked character's equipped artifacts are excluded when optimizing anyone else (`lockedArtifactIds`). |
| 2026-09-23 | 10 | Optimizer (`src/engine/optimizer/`): score = scaling stat × (1 + element + all + damage-type DMG%) × (1 + min(CR,1)·CD) × reaction mult. Candidate pruning: top 6 per slot overall (+2 highest-ER pieces when a profile has an ER minimum), top 5 per slot per 4pc set, top 4 for 2+2 and the "best mix" search. Tries 4pc (all 5 or any off-piece), every 2+2 layout, and best mix. Builds under the ER minimum are only shown if nothing meets it (flagged). Returns top 3 distinct builds with % vs current, swaps and a one-line reason ("4pc Golden Troupe · more HP"). |
| 2026-09-23 | 10 | Speed: a fast evaluator (typed arrays, cached set effects) scores combinations and is tested to match `computeBuild` exactly. Benchmark: 300 artifacts ≈ 200 ms in tests; ≈ 185 ms inside the real Web Worker in the browser (~33k combos). UI uses `optimizeInBackground()` (Web Worker; falls back to direct call in tests). |
| 2026-09-23 | 9 | **Approved profiles** (`src/engine/profiles.ts`): Yelan HP/Burst/Hydro, sands HP%/ER, Emblem or HoD+Tenacity, ER 140%. Furina HP/Skill, goblet Hydro or HP%, Golden Troupe or HoD+Tenacity, ER 150%. Navia ATK/Skill/Geo, Nighttime Whispers, ER 120%. Skirk ATK/NA/Cryo, Finale or Blizzard, no ER min. Yae ATK/Skill/Electro, Golden Troupe or Gilded, ER 120%. Clorinde ATK/NA/Electro, Fragment of Harmonic Whimsy. Xiangling ATK/Burst/Pyro, sands ER/ATK%/EM, Emblem or Crimson Witch, **Vaporize ×1.5**, ER 170%. Supports: Citlali EM (Scroll, ER 140%), Xilonen DEF (Scroll, ER 130%), Bennett HP (Noblesse, healing circlet, ER 200%), Qiqi ATK (Ocean-Hued Clam or Noblesse+Tenacity, healing circlet, ER 130%). Crit circlet = CR or CD. |
| 2026-09-23 | 9 | Sandrone, Odette, Varka, Durin (and anyone added later) use a **generic profile by element**: ATK, Skill, ATK% / element DMG / crit, no sets, no ER min — flagged `generic` so the UI can say so. Reaction multiplier approved: base ×1.5 or ×2.0 × (1 + 2.78·EM/(EM+1400) + reaction bonus). |
| 2026-09-23 | 8 | **Approved set table** (numbers from each set's in-game text): Emblem (Burst DMG = 25% ER, max 75%), Golden Troupe (2pc Skill +20%; 4pc +25%, +25% off-field toggle on), Nighttime Whispers (Geo +20% after Skill on; +150% of that under Crystallize off), Finale of the Deep Galleries (0 Energy: NA/Burst +60% on), Fragment of Harmonic Whimsy (DMG +18%/stack, 3), Marechaussee (2pc NA/CA +15%; CR +12%/stack, 3), Heart of Depth (NA/CA +30% on), Blizzard (CR +20% on; Frozen +20% off), Crimson Witch (Vaporize/Melt +15%, transformative +40%, Pyro +7.5%/stack, 1), Gilded Dreams (ATK +14% per same-element / EM +50 per other-element teammate, on), Obsidian Codex (2pc DMG +15% on; 4pc CR +40% on), Noblesse (2pc Burst +20%; ATK +20% on), Tenacity (ATK +20% on). Scroll of Cinder City & Ocean-Hued Clam are notes only. Code: `src/engine/modifiers/`. |
| 2026-09-23 | 8 | Resonance needs a full party of 4 with 2+ of an element: Pyro ATK +25%, Hydro HP +25%, Cryo CR +15% (toggle on), Geo DMG +15% shielded (toggle on; enemy RES shred as note), Dendro EM +50 plus +30 (Burning/Quicken/Bloom) and +20 (Aggravate/Spread/Hyperbloom/Burgeon) toggles, on — text confirmed by her. Electro/Anemo/Protective Canopy: info only. |
| 2026-09-23 | 8 | Sets for **Sandrone, Odette, Varka, Durin: skipped for now**. Weapon passives: **later, once she enters weapons** — but the always-on first sentence of a passive (e.g. Aqua Simulacra "HP is increased by 28%") is counted automatically, since her real Yelan HP needs it; everything else in the passive is shown as a note. Damage-type bonuses (Skill/Burst/NA DMG, all DMG, Vaporize/Melt) live in a separate `dmg` block, not on the stat screen. |
| 2026-09-23 | 7 | **Verified against her real Yelan screen** (akasha.cv/Enka card: Lv 90, C6, Aqua Simulacra R4, 4pc Emblem): HP 33,229 / ATK 1,097 / DEF 637 / EM 21 exact; CR 91.0 vs 91.1, CD 234.7 vs 234.6, ER 155.7 vs 155.6 (substat display rounding, within ±0.1%). HP only matches with Aqua Simulacra R4 always-on HP +28% → weapon always-on passives matter (Step 8). Kept as a regression test in `src/engine/stats.test.ts`. `computeStats` takes `extra` bonuses for Step 8 modifiers. Screenshots live in `screenshots/` (git-ignored: contains her UID). |
| 2026-09-23 | 7 | Always-on 2pc bonuses are **parsed from genshin-db's 2pc text** (`src/engine/setBonus.ts`), not hand-typed: ATK/HP/DEF%, EM, ER, CRIT Rate, Healing, elemental/Physical DMG. Damage-type 2pcs (Skill/Burst/Normal DMG), shield and RES bonuses are left for Step 8. Base ER 100%, base crit 5%/50%. % stats scale only the white base (character + weapon base ATK). |
| 2026-09-23 | 6 | Track **only goal materials**: the Materials tab lists just what active goals need, grouped (Mora & EXP, talent books, gems, boss drops, specialties, common drops, weapon mats), each with have/need bar + counter (tap the number to type; turns mint when enough). One goal per character. |
| 2026-09-23 | 6 | Level-up EXP from **paimon.moe** (`npm run build:exp-data` → `exp.json`, cumulative EXP to Lv 90 for characters and 3/4/5★ weapons). Mora for levelling = EXP ÷ 5 (characters), ÷ 10 (weapons), as paimon.moe's calculator does. EXP book/ore values (20k/5k/1k, 10k/2k/400) parsed from genshin-db item text; the six items were added to the materials snapshot. EXP need is one bar; her books count by EXP value, with "about N more Hero's Wit". |
| 2026-09-23 | 6 | **Goals cap at Lv 90** (no cost data for 91–100). Current levels come from the Roster; target talents can't go below current. Optional weapon goal uses the equipped weapon. Verified: Furina 80 → 90 = ascension 6 mats + 3,423,125 EXP + 804,625 Mora (120,000 + EXP ÷ 5). |
| 2026-09-23 | 5 | She'll enter **200+ artifacts** → dense 4-column tile grid (5 on wider phones), filters: set (picker sheet), slot, main stat (from what's in inventory), "Not equipped". |
| 2026-09-23 | 5 | Artifact numbers come from **Genshin Optimizer** (my choice when asked; genshin-db has none): `npm run build:artifact-data` → `src/data/generated/artifact-stats.json` (main stat by rarity/level, substat roll tiers, every displayable substat value + fewest rolls, slot main-stat lists, max level, starting substat counts). Supported rarities 3–5★. |
| 2026-09-23 | 5 | Validation (friendly messages, tests in `src/engine/artifact.test.ts`): set/rarity match, level ≤ max, main stat allowed for slot, ≤4 unique substats ≠ main, each value must be one the game can show (with "Closest: x or y" hint), total rolls ≤ starting max + one per 4 levels, and at least `low + upgrades` substats (so a +20 5★ needs 4). |
| 2026-09-23 | 5 | Quick-add: one-screen sheet; remembers last set + rarity (`settings` table); flower/plume main stat automatic; main stat value shown; tapping a substat chip focuses its value box (decimal keyboard); "Save & next" keeps set/rarity/level and advances to the next slot. Equip/unequip from the artifact's edit sheet (moves from previous wearer, replaces that slot). Delete asks to confirm. |
| 2026-09-23 | 5 | "Sets she farms" derived from her characters and kept in `src/config.ts` `FARMED_SETS` (listed first in the picker): Emblem, Golden Troupe, Nighttime Whispers, Scroll of Cinder City, Finale of the Deep Galleries, Fragment of Harmonic Whimsy, Noblesse, Ocean-Hued Clam. **Sandrone, Odette, Varka, Durin's sets not guessed** — to confirm in Step 8. Featured character also moved to `src/config.ts`. |
| 2026-09-23 | 4 | No pre-filled roster or weapons: she adds her own. New characters default to **Lv 90/90, C0, talents 1/1/1**; new weapons default to their max level, R1. |
| 2026-09-23 | 4 | Roster tab has Characters / Weapons segments, element + weapon-type filter chips, favourites pinned first (then rarity, name). Tap a card → bottom sheet to edit; removing asks for confirmation and also drops that character's team and goals (weapon/artifacts stay). Level field: stepper + quick picks + an "Ascended" toggle at caps (e.g. 80/80 vs 80/90); characters go to Lv 100, costs still stop at 90. |
| 2026-09-23 | 4 | Equip flow lives in the character sheet: pick from owned weapons of the matching type (shows who holds it; equipping moves it), or "Add a new <type>" which creates and equips it in one go. Weapon search hides 1–2★ weapons. `cn()` now uses tailwind-merge so later classes override earlier ones. |
| 2026-09-23 | 3 | Vibe: **dreamy / soft**. Her colours: **pink and green**; favourite element **Cryo**; favourite character **Yelan (C6)**, featured on Home. App name stays **Teyvat Companion**, no personal message yet (revisit in Step 15). Styleguide approved on phone. |
| 2026-09-23 | 3 | Design: dark "night sky" default (plum `#13101f`, soft pink/mint glows, faint stars) + light theme. Accent pink `--accent`, secondary mint `--mint` (also the "enough/complete" colour). Fonts self-hosted (offline-ready): Nunito (UI) + Fraunces (display). Tokens are CSS vars in `src/index.css`, exposed to Tailwind via `@theme inline` (`bg-surface`, `text-muted`, `text-accent`, `border-line`…). Element glyphs are original simple SVGs (no game art). |
| 2026-09-23 | 3 | Theme stored in `localStorage` (not Dexie) so `index.html` applies it before first paint. Routing: `react-router` v8, routes in `src/routes.tsx`. Character images come from Enka's CDN (splash used on the Home card). |
| 2026-09-23 | 3 | Known: bundle is ~1.2 MB (222 KB gzip) because game data loads eagerly; revisit code-splitting in Step 14. |
| 2026-09-23 | 2 | Nothing to ask. Equipment is stored only on the character (`weaponId`, `artifactIds` per slot), so there's one source of truth; "who has this equipped" is derived. `OwnedCharacter` keyed by character key (one per character); weapons/artifacts/goals use `crypto.randomUUID()`. `Team` keyed by main character. Added a small `settings` key/value table (theme, last-used set for Step 5), included in backups. |
| 2026-09-23 | 2 | Backup format `{ app: 'teyvat-companion', formatVersion: 1, exportedAt, data }`. Import **replaces** all data (in one transaction) and rejects wrong/newer files with a friendly message. Tests use `fake-indexeddb`. |
| 2026-09-23 | 1 | Data: genshin-db 5.2.14, game data up to **v7.1**. Snapshot: 120 characters, 255 weapons, 59 artifact sets, 504 materials (only materials used in a cost). Regenerate with `npm run build:data`. |
| 2026-09-23 | 1 | Her characters (all found in data): Sandrone, Odette, Qiqi, Yae Miko, Yelan, Furina, Navia, Skirk, Citlali, Xilonen, Xiangling, Bennett, Varka, Durin, Clorinde. Kept in `scripts/owned-characters.json`. Nothing she owns is newer than 7.1. |
| 2026-09-23 | 1 | All characters are snapshotted (not only hers) so she can add new ones later. Travelers (Aether/Lumine/Manekin/Manekina) are skipped in v1: they have no fixed element and per-element talents. |
| 2026-09-23 | 1 | Stats are stored compactly: base values + curve names + ascension table + a shared curve table (levels 1–100). Stat keys use GOOD format (`atk_`, `critRate_`…) and genshin-db numeric ids are kept, for Enka/GOOD import later. Ids/keys: genshin-db lowercase filename (e.g. `furina`); materials keyed by numeric id. |
| 2026-09-23 | 1 | Limitation: stats go to Lv 100 but genshin-db has **no ascension/material costs beyond Lv 90**, and no character/weapon EXP (Hero's Wit) cost tables. Must be resolved before Step 6 (ask, don't invent). |
| 2026-09-23 | 1 | Icons are filenames; URLs are built from Enka's CDN `https://enka.network/ui/<file>.png`. 1-piece "Prayers" sets are skipped. |
| 2026-09-23 | 0 | Stack as scaffolded: Vite 8, React 19, TS 6, Tailwind v4 (via `@tailwindcss/vite`, no config file), Vitest 5 + jsdom + Testing Library, ESLint 10 flat config + Prettier (no semicolons, single quotes, width 100). The Vite template shipped oxlint; replaced with ESLint per plan. |
| 2026-09-23 | 0 | App/package name: `teyvat-companion`. Node v24.16.0 / npm 11.13.0. Git initialised; commit after each step. |

---

## Reference

- Game data: https://github.com/theBowja/genshin-db
- Enka.Network API docs: https://github.com/EnkaNetwork/API-docs/blob/master/api.md
- Genshin Optimizer (formula reference, GOOD format): https://github.com/frzyc/genshin-optimizer
- Rotation simulation (not in scope, link only): GCSim