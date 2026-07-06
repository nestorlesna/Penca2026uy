import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Trophy, Star, Gift } from 'lucide-react'
import { TeamFlag } from '../components/ui/TeamFlag'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useUserPredictions, useUserBonusPoints } from '../hooks/useUserDetail'
import { formatMatchTime } from '../utils/datetime'
import type { PredictionWithMatch } from '../services/predictionService'

// Etiquetas legibles de cada tipo de bonus (+Punto)
const BONUS_LABELS: Record<string, string> = {
  podio_exacto:    'Podio — posición exacta',
  podio_presencia: 'Podio — equipo presente',
  empates_grupos:  'Empates en fase de grupos',
  rango_goles:     'Rango de goles del torneo',
  final_cero:      'Final sin goles en 90 min',
  top_scorer_team: 'Equipo goleador del torneo',
  top_group_goals: 'Grupo con más goles',
}

function fmtBetDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + formatMatchTime(iso)
}

// Abreviatura del equipo por id (para el ganador de penales)
function teamAbbrById(m: PredictionWithMatch['match'], id: string | null): string {
  if (!id) return ''
  if (m.home_team?.id === id) return m.home_team.abbreviation
  if (m.away_team?.id === id) return m.away_team.abbreviation
  return ''
}

// Resultado real del partido (90' + ET/PK si aplica), una línea por capa
function realLines(m: PredictionWithMatch['match']): string[] {
  const lines = [`${m.home_score_90}–${m.away_score_90}`]
  if (m.home_score_et !== null && m.away_score_et !== null) {
    lines.push(`ET ${m.home_score_et}–${m.away_score_et}`)
  }
  if (m.home_score_pk !== null && m.away_score_pk !== null) {
    const winnerId = m.home_score_pk > m.away_score_pk ? m.home_team?.id : m.away_team?.id
    const abbr = teamAbbrById(m, winnerId ?? null)
    lines.push(`Pen ${abbr || `${m.home_score_pk}–${m.away_score_pk}`}`)
  }
  return lines
}

// Apuesta del usuario (90' + ET + ganador de penales si la hizo)
function predLines(p: PredictionWithMatch): string[] {
  const lines = [`${p.home_score}–${p.away_score}`]
  if (p.home_score_et !== null && p.away_score_et !== null) {
    lines.push(`ET ${p.home_score_et}–${p.away_score_et}`)
  }
  const abbr = teamAbbrById(p.match, p.predicted_pk_winner_id)
  if (abbr) lines.push(`Pen ${abbr}`)
  return lines
}

function MatchRow({ pred }: { pred: PredictionWithMatch }) {
  const m = pred.match
  return (
    <div className="card p-3 flex items-center gap-3">
      {/* Número + fase/grupo */}
      <div className="flex-shrink-0 w-10 text-center">
        <p className="text-[11px] text-text-muted">#{m.match_number}</p>
        {m.group ? (
          <span className="badge-primary text-[9px]">G{m.group.name}</span>
        ) : (
          <span className="badge bg-accent/20 text-accent text-[9px]">
            {m.phase.name.substring(0, 3)}
          </span>
        )}
      </div>

      {/* Equipos + resultados */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <TeamFlag team={m.home_team} slotLabel={m.home_slot_label} size="sm" align="left" abbrev />
          </div>
          <span className="text-text-muted text-xs">vs</span>
          <div className="flex-1 min-w-0 flex justify-end">
            <TeamFlag team={m.away_team} slotLabel={m.away_slot_label} size="sm" align="right" abbrev />
          </div>
        </div>
        <div className="flex items-start justify-between gap-2 text-[11px]">
          <div className="text-text-primary font-semibold tabular-nums leading-tight">
            {realLines(m).map((l, i) => (
              <span key={i} className={i === 0 ? '' : 'block'}>
                {i === 0 && <span className="text-text-muted font-normal">Real: </span>}
                {l}
              </span>
            ))}
          </div>
          <div className="text-text-muted tabular-nums leading-tight text-right">
            {predLines(pred).map((l, i) => (
              <span key={i} className={i === 0 ? '' : 'block'}>
                {i === 0 && <span>Apuesta: </span>}
                {l}
              </span>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-text-muted">
          Apostado: {fmtBetDate(pred.updated_at)}
        </p>
      </div>

      {/* Puntos */}
      <div className="flex-shrink-0">
        <span className="badge bg-primary/20 text-primary text-[11px] font-semibold">
          +{pred.points_earned} pts
        </span>
      </div>
    </div>
  )
}

export function RankingUsuarioPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const { data: entries = [] } = useLeaderboard()
  const { data: preds = [], isLoading: loadingPreds } = useUserPredictions(userId)
  const { data: bonusMap = {}, isLoading: loadingBonus } = useUserBonusPoints(userId)

  const entry = entries.find(e => e.user_id === userId)

  // Solo partidos ya jugados donde obtuvo puntos (> 0), más recientes primero
  const scoredMatches = useMemo(
    () => preds
      .filter(p => (p.points_earned ?? 0) > 0)
      .sort((a, b) =>
        new Date(b.match.match_datetime).getTime() - new Date(a.match.match_datetime).getTime()
      ),
    [preds]
  )

  // Bonus con puntos obtenidos (> 0)
  const scoredBonus = useMemo(
    () => Object.values(bonusMap).filter(b => b.points_earned > 0),
    [bonusMap]
  )

  const matchPoints = scoredMatches.reduce((s, p) => s + (p.points_earned ?? 0), 0)
  const bonusPoints = scoredBonus.reduce((s, b) => s + b.points_earned, 0)

  const isLoading = loadingPreds || loadingBonus

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Volver */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al ranking
      </button>

      {/* Cabecera del usuario */}
      <div className="card p-4 flex items-center gap-3">
        {entry?.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold">
              {(entry?.display_name || entry?.username || '?')[0].toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-text-primary truncate">
            {entry?.display_name ?? 'Usuario'}
          </p>
          {entry && (
            <p className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
              <Trophy size={12} className="text-accent" />
              Puesto #{entry.rank}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-primary leading-none">
            {entry?.total_points ?? '—'}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">pts totales</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Partidos con puntos */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Star size={15} className="text-accent" />
                Partidos con puntos
              </h2>
              <span className="text-xs text-text-muted tabular-nums">{matchPoints} pts</span>
            </div>
            {scoredMatches.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-6">
                Todavía no obtuvo puntos en partidos.
              </p>
            ) : (
              scoredMatches.map(p => <MatchRow key={p.id} pred={p} />)
            )}
          </section>

          {/* Bonus (+Punto) */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Gift size={15} className="text-accent" />
                +Punto (bonus)
              </h2>
              <span className="text-xs text-text-muted tabular-nums">{bonusPoints} pts</span>
            </div>
            {scoredBonus.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-6">
                Todavía no obtuvo puntos de +Punto.
              </p>
            ) : (
              scoredBonus.map(b => (
                <div key={b.bonus_type} className="card p-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-text-primary">
                    {BONUS_LABELS[b.bonus_type] ?? b.bonus_type}
                  </span>
                  <span className="badge bg-primary/20 text-primary text-[11px] font-semibold flex-shrink-0">
                    +{b.points_earned} pts
                  </span>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}
