import type { TeamInfo } from '../../types/match'

interface Props {
  team: TeamInfo | null
  slotLabel?: string | null
  size?: 'sm' | 'md' | 'lg'
  align?: 'left' | 'right'
}

const sizes = {
  sm: { flag: 'w-5 h-5', text: 'text-xs' },
  md: { flag: 'w-7 h-7', text: 'text-sm' },
  lg: { flag: 'w-9 h-9', text: 'text-base font-medium' },
}

export function TeamFlag({ team, slotLabel, size = 'md', align = 'left' }: Props) {
  const s = sizes[size]
  const name = team
    ? (team.is_confirmed ? team.name : team.placeholder_name ?? team.name)
    : (slotLabel ?? '?')

  const isRight = align === 'right'

  return (
    <div className={`flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
      {/* Bandera o placeholder */}
      {team?.flag_url ? (
        <img
          src={team.flag_url}
          alt={team.abbreviation}
          className={`${s.flag} rounded-sm object-cover flex-shrink-0`}
          loading="lazy"
        />
      ) : (
        <div className={`${s.flag} rounded-sm bg-border flex items-center justify-center flex-shrink-0`}>
          <span className="text-text-muted text-[9px] font-bold">
            {team?.abbreviation ?? '?'}
          </span>
        </div>
      )}

      {/* Nombre */}
      <span className={`${s.text} text-text-primary leading-tight ${isRight ? 'text-right' : ''}`}>
        {name}
      </span>
    </div>
  )
}
