import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RequireLoader } from '../../components/auth/AuthGuard'
import { ResultForm } from '../../components/admin/ResultForm'
import { TeamFlag } from '../../components/ui/TeamFlag'
import { useMatches } from '../../hooks/useMatches'
import { recalculateAll } from '../../services/adminService'
import { formatMatchDay, formatMatchTime } from '../../utils/datetime'
import type { MatchWithRelations } from '../../types/match'

const PHASES = [
  { label: 'Grupos', order: 1 },
  { label: 'Dieciseisavos', order: 2 },
  { label: 'Octavos', order: 3 },
  { label: 'Cuartos', order: 4 },
  { label: 'Semifinales', order: 5 },
  { label: '3er Puesto', order: 6 },
  { label: 'Final', order: 7 },
]

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

function StatusBadge({ status }: { status: MatchWithRelations['status'] }) {
  if (status === 'finished') return <span className="badge bg-success/20 text-success text-[10px]">Finalizado</span>
  return <span className="badge bg-border text-text-muted text-[10px]">Pendiente</span>
}

export function ResultadosPage() {
  const [phaseOrder, setPhaseOrder] = useState(1)
  const [groupName, setGroupName] = useState<string | undefined>(undefined)
  const [selected, setSelected] = useState<MatchWithRelations | null>(null)
  const { data: matches = [], isLoading } = useMatches({ phaseOrder, groupName })

  function selectPhase(order: number) {
    setPhaseOrder(order)
    setGroupName(undefined)
  }
  const qc = useQueryClient()
  const [recalculating, setRecalculating] = useState(false)

  async function handleRecalculateAll() {
    setRecalculating(true)
    try {
      const r = await recalculateAll()
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['predictions'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      toast.success(
        `Recálculo completo · ${r.matches_processed} partidos · ${r.predictions_updated} predicciones · ${r.bonus_rows_updated} bonus`
      )
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <RequireLoader>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-xl font-bold text-text-primary">Resultados</h1>
            <button
              className="btn-secondary text-sm"
              onClick={handleRecalculateAll}
              disabled={recalculating}
            >
              {recalculating ? 'Procesando...' : 'Recalcular todo'}
            </button>
          </div>
          <p className="text-xs text-text-muted">
            "Recalcular todo" vuelve a calcular los puntos de cada partido finalizado, propaga los ganadores al cuadro eliminatorio y recalcula los +Puntos. Usalo si corregiste un resultado o si los puntos no se actualizaron correctamente.
          </p>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {PHASES.map(p => (
            <button
              key={p.order}
              onClick={() => selectPhase(p.order)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                phaseOrder === p.order
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Group tabs — solo visible en fase Grupos */}
        {phaseOrder === 1 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setGroupName(undefined)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                groupName === undefined
                  ? 'bg-accent text-white'
                  : 'bg-surface-2 text-text-secondary hover:text-text-primary'
              }`}
            >
              Todos
            </button>
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setGroupName(g)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  groupName === g
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-text-secondary hover:text-text-primary'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {isLoading && <p className="text-text-muted text-sm">Cargando...</p>}

        <div className="space-y-2">
          {matches.map(match => (
            <div key={match.id} className="card p-3 flex items-center gap-3">
              {/* Match number */}
              <div className="flex-shrink-0 w-8 text-center">
                <p className="text-[11px] text-text-muted">#{match.match_number}</p>
              </div>

              {/* Teams + score */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <TeamFlag team={match.home_team} slotLabel={match.home_slot_label} size="sm" align="left" />
                  </div>
                  <div className="flex-shrink-0 text-center">
                    {match.home_score_90 !== null ? (
                      <>
                        <div className="text-sm font-bold tabular-nums text-text-primary">
                          {match.home_score_90} - {match.away_score_90}
                        </div>
                        {match.home_score_et !== null && (
                          <div className="text-[10px] tabular-nums text-text-muted">
                            ET {match.home_score_et} - {match.away_score_et}
                          </div>
                        )}
                        {match.home_score_pk !== null && (
                          <div className="text-[10px] tabular-nums text-accent font-semibold">
                            P {match.home_score_pk} - {match.away_score_pk}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-bold text-text-primary">vs</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex justify-end">
                    <TeamFlag team={match.away_team} slotLabel={match.away_slot_label} size="sm" align="right" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={match.status} />
                  <p className="text-[11px] text-text-muted">
                    {formatMatchDay(match.match_datetime)} · {formatMatchTime(match.match_datetime)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                <button
                  className="btn-primary text-[11px] px-2 py-1"
                  onClick={() => setSelected(match)}
                >
                  Resultado
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ResultForm match={selected} onClose={() => setSelected(null)} />
    </RequireLoader>
  )
}
