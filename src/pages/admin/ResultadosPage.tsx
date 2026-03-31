import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RequireAdmin } from '../../components/auth/AuthGuard'
import { ResultForm } from '../../components/admin/ResultForm'
import { TeamFlag } from '../../components/ui/TeamFlag'
import { useMatches } from '../../hooks/useMatches'
import { setMatchStatus, populateKnockoutMatches } from '../../services/adminService'
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

function StatusBadge({ status }: { status: MatchWithRelations['status'] }) {
  if (status === 'finished') return <span className="badge bg-success/20 text-success text-[10px]">Finalizado</span>
  if (status === 'live') return <span className="badge bg-error/20 text-error text-[10px] animate-pulse">En vivo</span>
  return <span className="badge bg-border text-text-muted text-[10px]">Programado</span>
}

export function ResultadosPage() {
  const [phaseOrder, setPhaseOrder] = useState(1)
  const [selected, setSelected] = useState<MatchWithRelations | null>(null)
  const { data: matches = [], isLoading } = useMatches({ phaseOrder })
  const qc = useQueryClient()
  const [populating, setPopulating] = useState(false)

  async function handleStatusToggle(match: MatchWithRelations) {
    const next = match.status === 'scheduled' ? 'live'
      : match.status === 'live' ? 'finished'
      : 'scheduled'
    try {
      await setMatchStatus(match.id, next)
      qc.invalidateQueries({ queryKey: ['matches'] })
      toast.success(`Estado → ${next}`)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
  }

  async function handlePopulate() {
    setPopulating(true)
    try {
      const n = await populateKnockoutMatches()
      qc.invalidateQueries({ queryKey: ['matches'] })
      toast.success(`${n} partidos de fase eliminatoria actualizados`)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setPopulating(false)
    }
  }

  return (
    <RequireAdmin>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-text-primary">Resultados</h1>
          <button
            className="btn-secondary text-sm"
            onClick={handlePopulate}
            disabled={populating}
          >
            {populating ? 'Procesando...' : 'Poblar bracket'}
          </button>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {PHASES.map(p => (
            <button
              key={p.order}
              onClick={() => setPhaseOrder(p.order)}
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

        {isLoading && <p className="text-text-muted text-sm">Cargando...</p>}

        <div className="space-y-2">
          {matches.map(match => (
            <div key={match.id} className="card p-3 flex items-center gap-3">
              {/* Match number + status */}
              <div className="flex-shrink-0 w-8 text-center">
                <p className="text-[11px] text-text-muted">#{match.match_number}</p>
                <StatusBadge status={match.status} />
              </div>

              {/* Teams + score */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <TeamFlag team={match.home_team} slotLabel={match.home_slot_label} size="sm" align="left" />
                  </div>
                  <div className="flex-shrink-0 text-sm font-bold tabular-nums text-text-primary">
                    {match.home_score_90 !== null
                      ? `${match.home_score_90} - ${match.away_score_90}`
                      : 'vs'}
                  </div>
                  <div className="flex-1 min-w-0 flex justify-end">
                    <TeamFlag team={match.away_team} slotLabel={match.away_slot_label} size="sm" align="right" />
                  </div>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  {formatMatchDay(match.match_datetime)} · {formatMatchTime(match.match_datetime)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex flex-col gap-1.5">
                <button
                  className="btn-primary text-[11px] px-2 py-1"
                  onClick={() => setSelected(match)}
                >
                  Resultado
                </button>
                <button
                  className="btn-ghost text-[11px] px-2 py-1 border border-border"
                  onClick={() => handleStatusToggle(match)}
                >
                  Estado ↻
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ResultForm match={selected} onClose={() => setSelected(null)} />
    </RequireAdmin>
  )
}
