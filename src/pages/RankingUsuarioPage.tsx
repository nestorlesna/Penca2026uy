import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Trophy, Star, Gift, Check } from 'lucide-react'
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

type TeamLite = PredictionWithMatch['match']['home_team']

// Encabezado de columna de equipo: abreviatura + bandera
function TeamHead({ team, slot }: { team: TeamLite; slot: string | null }) {
  const abbr = team?.abbreviation ?? slot ?? '?'
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="text-[11px] font-semibold text-text-secondary">{abbr}</span>
      {team?.flag_url ? (
        <img src={team.flag_url} alt="" className="w-4 h-4 rounded-sm object-cover flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-4 h-4 rounded-sm bg-border flex-shrink-0" />
      )}
    </div>
  )
}

// Casilla de marcador (un valor por equipo)
function ScoreBox({ value }: { value: number | null }) {
  return (
    <div className="mx-auto w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center">
      <span className="text-sm font-bold tabular-nums text-text-primary">
        {value ?? '–'}
      </span>
    </div>
  )
}

// Casilla de penales: check verde en el ganador
function PenBox({ won }: { won: boolean }) {
  return (
    <div className="mx-auto w-8 h-8 flex items-center justify-center">
      {won
        ? <Check size={18} className="text-primary" strokeWidth={3} />
        : <span className="text-text-muted text-sm">·</span>}
    </div>
  )
}

function MatchRow({ pred }: { pred: PredictionWithMatch }) {
  const m = pred.match

  // ¿Qué filas mostrar? 90' siempre; 30' (T.E.) y Pen solo si hay datos.
  const showEt = m.home_score_et !== null || pred.home_score_et !== null
  const showPen = m.home_score_pk !== null || pred.predicted_pk_winner_id !== null

  // Ganadores de penales (real y apuesta) por columna
  const realPenHome = m.home_score_pk !== null && m.away_score_pk !== null && m.home_score_pk > m.away_score_pk
  const realPenAway = m.home_score_pk !== null && m.away_score_pk !== null && m.away_score_pk > m.home_score_pk
  const betPenHome = pred.predicted_pk_winner_id !== null && pred.predicted_pk_winner_id === m.home_team?.id
  const betPenAway = pred.predicted_pk_winner_id !== null && pred.predicted_pk_winner_id === m.away_team?.id

  const divider = 'border-l border-border'

  return (
    <div className="card p-3 space-y-3">
      {/* Cabecera: número · fase · última actualización · puntos */}
      <div className="flex items-center gap-2 text-[11px] text-text-muted">
        <span className="font-medium">#{m.match_number}</span>
        {m.group ? (
          <span className="badge-primary text-[9px]">G{m.group.name}</span>
        ) : (
          <span className="badge bg-accent/20 text-accent text-[9px]">
            {m.phase.name.substring(0, 3)}
          </span>
        )}
        <span className="truncate">Ult. Act. {fmtBetDate(pred.updated_at)}</span>
        <span className="ml-auto badge bg-primary/20 text-primary text-[11px] font-semibold flex-shrink-0">
          +{pred.points_earned} pts
        </span>
      </div>

      {/* Tabla Real / Apuesta */}
      <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr] items-center gap-x-1">
        {/* Títulos de grupo */}
        <div />
        <div className="col-span-2 text-center text-[11px] font-semibold text-text-secondary pb-1.5">
          Real
        </div>
        <div className={`col-span-2 text-center text-[11px] font-semibold text-text-secondary pb-1.5 ${divider}`}>
          Apuesta
        </div>

        {/* Banderas */}
        <div />
        <div className="pb-2"><TeamHead team={m.home_team} slot={m.home_slot_label} /></div>
        <div className="pb-2"><TeamHead team={m.away_team} slot={m.away_slot_label} /></div>
        <div className={`pb-2 ${divider}`}><TeamHead team={m.home_team} slot={m.home_slot_label} /></div>
        <div className="pb-2"><TeamHead team={m.away_team} slot={m.away_slot_label} /></div>

        {/* 90' */}
        <div className="text-right text-[11px] text-text-muted pr-2 py-1">90'</div>
        <div className="py-1"><ScoreBox value={m.home_score_90} /></div>
        <div className="py-1"><ScoreBox value={m.away_score_90} /></div>
        <div className={`py-1 ${divider}`}><ScoreBox value={pred.home_score} /></div>
        <div className="py-1"><ScoreBox value={pred.away_score} /></div>

        {/* 30' (tiempo extra) */}
        {showEt && (
          <>
            <div className="text-right text-[11px] text-text-muted pr-2 py-1">30'</div>
            <div className="py-1"><ScoreBox value={m.home_score_et} /></div>
            <div className="py-1"><ScoreBox value={m.away_score_et} /></div>
            <div className={`py-1 ${divider}`}><ScoreBox value={pred.home_score_et} /></div>
            <div className="py-1"><ScoreBox value={pred.away_score_et} /></div>
          </>
        )}

        {/* Penales */}
        {showPen && (
          <>
            <div className="text-right text-[11px] text-text-muted pr-2 py-1">Pen</div>
            <div className="py-1"><PenBox won={realPenHome} /></div>
            <div className="py-1"><PenBox won={realPenAway} /></div>
            <div className={`py-1 ${divider}`}><PenBox won={betPenHome} /></div>
            <div className="py-1"><PenBox won={betPenAway} /></div>
          </>
        )}
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
