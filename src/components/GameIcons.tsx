import { Star } from 'lucide-react'
import type { CharacterData, WeaponData } from '../data'
import { iconUrl } from '../data'
import { cn } from './cn'
import { elementColor } from './element'

/** Square character portrait on a soft element-tinted backdrop. */
export function CharacterAvatar({
  character,
  size = 64,
  className,
}: {
  character: CharacterData
  size?: number
  className?: string
}) {
  const color = elementColor(character.element)
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-2xl', className)}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 35%, transparent), color-mix(in srgb, ${color} 8%, transparent))`,
      }}
    >
      <img
        src={iconUrl(character.icons.icon)}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        width={size}
        height={size}
      />
    </div>
  )
}

/** Weapon icon on a backdrop tinted by rarity. */
export function WeaponIcon({
  weapon,
  size = 56,
  className,
}: {
  weapon: WeaponData
  size?: number
  className?: string
}) {
  const tint =
    weapon.rarity >= 5 ? 'var(--geo)' : weapon.rarity === 4 ? 'var(--electro)' : 'var(--hydro)'
  return (
    <div
      className={cn('shrink-0 overflow-hidden rounded-2xl', className)}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(160deg, color-mix(in srgb, ${tint} 30%, transparent), color-mix(in srgb, ${tint} 6%, transparent))`,
      }}
    >
      <img
        src={iconUrl(weapon.icons.icon)}
        alt=""
        loading="lazy"
        className="h-full w-full object-contain p-1"
        width={size}
        height={size}
      />
    </div>
  )
}

export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('inline-flex text-geo', className)} aria-label={`${count} stars`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  )
}
