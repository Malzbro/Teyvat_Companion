import type { ArtifactSetData, CharacterData } from '../data'
import { iconUrl } from '../data'
import { STAT_SHORT } from '../data/stats'
import type { Artifact } from '../db/types'
import { cn } from './cn'
import { CharacterAvatar } from './GameIcons'
import { rarityBackground } from './rarity'

interface ArtifactTileProps {
  artifact: Artifact
  set: ArtifactSetData
  /** Who wears it, shown as a small badge. */
  wearer?: CharacterData
  onClick?: () => void
  className?: string
}

/** Compact square tile for dense artifact grids. */
export function ArtifactTile({ artifact, set, wearer, onClick, className }: ArtifactTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${set.name} ${artifact.slot}, +${artifact.level}, ${STAT_SHORT[artifact.mainStat]}${wearer ? `, on ${wearer.name}` : ''}`}
      className={cn(
        'relative flex flex-col items-center rounded-2xl border border-line bg-surface p-1.5 pb-2 text-center transition active:scale-95',
        className,
      )}
    >
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl"
        style={{ background: rarityBackground(artifact.rarity) }}
      >
        <img
          src={iconUrl(set.icons[artifact.slot])}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain p-1"
        />
        <span className="absolute bottom-0.5 left-0.5 rounded-md bg-black/45 px-1 text-[10px] font-bold text-white tabular-nums">
          +{artifact.level}
        </span>
      </div>
      <span className="mt-1 w-full truncate text-[11px] leading-tight font-bold">
        {STAT_SHORT[artifact.mainStat]}
      </span>
      {wearer && (
        <CharacterAvatar
          character={wearer}
          size={22}
          className="absolute -top-1 -right-1 rounded-full ring-2 ring-bg"
        />
      )}
    </button>
  )
}
