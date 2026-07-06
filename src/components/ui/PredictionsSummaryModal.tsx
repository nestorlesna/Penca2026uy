import { Users, Check, Trophy } from 'lucide-react'
import { Modal } from './Modal'
import type { PredictionSummary, MatchUserPrediction } from '../../services/predictionService'

interface Props {
  open: boolean
  onClose: () => void
  homeTeam: string
  awayTeam: string
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeScore: number | null
  awayScore: number | null
  homeScoreEt?: number | null
  awayScoreEt?: number | null
  homeScorePk?: number | null
  awayScorePk?: number | null
  resultLoaded: boolean
  summary: PredictionSummary[]
  totalPredictions: number
  topPredictions: MatchUserPrediction[]
}

export function PredictionsSummaryModal({
  open,
  onClose,
  homeTeam,
  awayTeam,
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  homeScoreEt,
  awayScoreEt,
  homeScorePk,
  awayScorePk,
  resultLoaded,
  summary,
  totalPredictions,
  topPredictions,
}: Props) {
  // Nada para mostrar (no empezó o sin apuestas)
  if (!resultLoaded && topPredictions.length === 0) return null
  if (resultLoaded && summary.length === 0 && topPredictions.length === 0) return null

  const maxCount = summary[0]?.count ?? 0

  const realHasEt = homeScoreEt != null && awayScoreEt != null
  const realHasPk = homeScorePk != null && awayScorePk != null

  // Etiqueta corta del ganador por penales apostado
  const pkWinnerLabel = (id: string | null): string | null => {
    if (!id) return null
    if (id === homeTeamId) return homeTeam
    if (id === awayTeamId) return awayTeam
    return null
  }

  return (
    <Modal open={open} onClose={onClose} title="Predicciones" size="md">
      <div className="space-y-4">
        {/* ── Resumen: solo cuando el admin ya cargó el resultado ── */}
        {resultLoaded && (
          <>
            {/* Resultado real */}
            {homeScore !== null && awayScore !== null && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">Resultado</p>
                <p className="text-lg font-bold text-text-primary">
                  {homeTeam} <span className="text-primary">{homeScore}</span> - <span className="text-primary">{awayScore}</span> {awayTeam}
                </p>
                {(realHasEt || realHasPk) && (
                  <p className="text-xs text-text-secondary mt-1 tabular-nums">
                    {realHasEt && <span>ET {homeScoreEt}:{awayScoreEt}</span>}
                    {realHasEt && realHasPk && <span> · </span>}
                    {realHasPk && <span>Penales {homeScorePk}:{awayScorePk}</span>}
                  </p>
                )}
              </div>
            )}

            {/* Total */}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Users size={14} />
              <span>{totalPredictions} predicciones</span>
            </div>

            {/* Lista de resultados — 1 columna con scroll propio */}
            <div className="space-y-2 max-h-[26vh] overflow-y-auto pr-1 -mr-1">
              {summary.map((item) => {
                const isExact = homeScore === item.home_score && awayScore === item.away_score
                const pct = totalPredictions > 0 ? Math.round((item.count / totalPredictions) * 100) : 0
                const barWidth = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0

                const hasEt = item.home_score_et != null && item.away_score_et != null
                const pkWinner = pkWinnerLabel(item.predicted_pk_winner_id)

                return (
                  <div
                    key={`${item.home_score}-${item.away_score}-${item.home_score_et ?? ''}-${item.away_score_et ?? ''}-${item.predicted_pk_winner_id ?? ''}`}
                    className={`relative rounded-lg p-3 border transition-colors ${
                      isExact
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-surface-2 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base font-bold text-text-primary tabular-nums">
                          {item.home_score} - {item.away_score}
                        </span>
                        {isExact ? (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide whitespace-nowrap">
                            <Check size={10} />
                            Ex {item.points_earned}p
                          </span>
                        ) : item.points_earned > 0 ? (
                          <span className="text-[10px] font-semibold text-accent whitespace-nowrap">
                            +{item.points_earned}p
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-text-secondary">{pct}%</span>
                        <span className="badge-primary text-[10px] font-semibold">
                          {item.count}
                        </span>
                      </div>
                    </div>

                    {/* Alargue (ET) y penales apostados */}
                    {(hasEt || pkWinner) && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {hasEt && (
                          <span className="badge bg-accent/20 text-accent text-[10px] font-semibold tabular-nums">
                            ET {item.home_score_et}:{item.away_score_et}
                          </span>
                        )}
                        {pkWinner && (
                          <span className="badge bg-surface-2 border border-border text-text-secondary text-[10px] font-medium truncate max-w-full">
                            Penales: {pkWinner}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Barra de progreso */}
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isExact ? 'bg-primary' : 'bg-text-muted'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Partido empezó pero aún no hay resultado cargado: cabezal sin goles + aviso */}
        {!resultLoaded && (
          <>
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-text-secondary mb-1">Resultado</p>
              <p className="text-lg font-bold text-text-primary">
                {homeTeam} <span className="text-text-muted">-</span> {awayTeam}
              </p>
            </div>
            <div className="bg-surface-2 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-text-secondary">
                El partido comenzó. Cuando el admin cargue el resultado vas a ver el marcador y el
                detalle de todas las apuestas.
              </p>
            </div>
          </>
        )}

        {/* ── Top 10 del ranking: siempre que el partido haya empezado ── */}
        {topPredictions.length > 0 && (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              <Trophy size={14} className="text-accent" />
              Apuestas del Top 10
            </h3>
            <div className={`space-y-1.5 overflow-y-auto pr-1 -mr-1 ${resultLoaded ? 'max-h-[22vh]' : 'max-h-[50vh]'}`}>
              {topPredictions.map((p) => {
                const hasEt = p.home_score_et != null && p.away_score_et != null
                const pkWinner = pkWinnerLabel(p.predicted_pk_winner_id)
                return (
                  <div
                    key={p.user_id}
                    className="flex items-center gap-2 rounded-lg bg-surface-2 border border-border p-2"
                  >
                    {/* Avatar / inicial */}
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-[11px]">
                          {p.display_name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Nombre */}
                    <span className="flex-1 min-w-0 text-sm text-text-primary truncate">
                      {p.display_name}
                    </span>

                    {/* Resultado apostado */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasEt && (
                        <span className="badge bg-accent/20 text-accent text-[10px] font-semibold tabular-nums">
                          ET {p.home_score_et}:{p.away_score_et}
                        </span>
                      )}
                      {pkWinner && (
                        <span className="badge bg-surface border border-border text-text-secondary text-[10px] font-medium max-w-[80px] truncate">
                          pen {pkWinner}
                        </span>
                      )}
                      <span className="text-sm font-bold text-text-primary tabular-nums">
                        {p.home_score}-{p.away_score}
                      </span>
                      {resultLoaded && (p.points_earned ?? 0) > 0 && (
                        <span className="badge-primary text-[10px] font-semibold">
                          +{p.points_earned}p
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
