import { Loader2, Trophy, Target, Check } from 'lucide-react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../hooks/useAuth'
import type { LeaderboardEntry } from '../types'

function MedalOrRank({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-accent text-lg">🥇</span>
  if (rank === 2) return <span className="text-accent text-lg">🥈</span>
  if (rank === 3) return <span className="text-accent text-lg">🥉</span>
  return (
    <span className="text-sm font-bold tabular-nums text-text-muted w-6 text-center">
      {rank}
    </span>
  )
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  const initials = (entry.display_name || entry.username)[0].toUpperCase()
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt=""
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
      <span className="text-primary font-bold text-sm">{initials}</span>
    </div>
  )
}

function LeaderboardRow({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry
  isMe: boolean
}) {
  return (
    <div
      className={`card p-3 flex items-center gap-3 transition-colors ${
        isMe ? 'border-primary/40 bg-primary/5' : ''
      }`}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 flex justify-center">
        <MedalOrRank rank={entry.rank} />
      </div>

      {/* Avatar */}
      <Avatar entry={entry} />

      {/* Name + stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-text-primary truncate">
            {entry.display_name}
          </span>
          {isMe && (
            <span className="badge bg-primary/20 text-primary text-[10px]">Yo</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-text-muted">
            <Check size={11} className="text-primary" />
            {entry.predictions_count} pred.
          </span>
          <span className="flex items-center gap-1 text-[11px] text-text-muted">
            <Target size={11} className="text-accent" />
            {entry.exact_scores} exactos
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xl font-bold tabular-nums text-primary leading-none">
          {entry.total_points}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">pts</p>
      </div>
    </div>
  )
}

function TopThree({ entries, myId }: { entries: LeaderboardEntry[]; myId?: string }) {
  const [first, second, third] = entries

  function PodiumCard({ entry, height }: { entry: LeaderboardEntry; height: string }) {
    const isMe = entry.user_id === myId
    return (
      <div className="flex flex-col items-center gap-2">
        <Avatar entry={entry} />
        <p className={`text-xs font-medium text-center truncate max-w-[80px] ${isMe ? 'text-primary' : 'text-text-primary'}`}>
          {entry.display_name}
        </p>
        <div
          className={`w-full flex flex-col items-center justify-end rounded-t-lg ${height} ${
            entry.rank === 1
              ? 'bg-accent/20 border border-accent/30'
              : 'bg-surface-2 border border-border'
          }`}
        >
          <MedalOrRank rank={entry.rank} />
          <p className="text-sm font-bold text-primary tabular-nums pb-2">
            {entry.total_points}
          </p>
        </div>
      </div>
    )
  }

  if (!first) return null

  return (
    <div className="grid grid-cols-3 gap-2 items-end mb-6">
      {second ? (
        <PodiumCard entry={second} height="h-20" />
      ) : (
        <div />
      )}
      <PodiumCard entry={first} height="h-28" />
      {third ? (
        <PodiumCard entry={third} height="h-16" />
      ) : (
        <div />
      )}
    </div>
  )
}

export function RankingPage() {
  const { data: entries = [], isLoading, error } = useLeaderboard()
  const { user } = useAuth()

  const myId = user?.id
  const myEntry = entries.find(e => e.user_id === myId)
  const hasMore = entries.length > 3

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Trophy size={20} className="text-accent" />
        <h1 className="text-xl font-bold text-text-primary">Ranking</h1>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <div className="card p-4 text-sm text-center text-text-muted">
          Error cargando el ranking. Verificá la conexión a Supabase.
        </div>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <div className="card p-8 text-center">
          <Trophy size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">
            Aún no hay puntos registrados. ¡El torneo empieza el 11 de junio!
          </p>
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <>
          {/* Podio top 3 */}
          <TopThree entries={entries.slice(0, 3)} myId={myId} />

          {/* Mi posición fijada (si no estoy en top 3 y estoy logueado) */}
          {myEntry && myEntry.rank > 3 && (
            <div className="mb-3">
              <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">
                Tu posición
              </p>
              <LeaderboardRow entry={myEntry} isMe />
            </div>
          )}

          {/* Lista completa */}
          {hasMore && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">
                Tabla completa
              </p>
              {entries.map(entry => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  isMe={entry.user_id === myId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
