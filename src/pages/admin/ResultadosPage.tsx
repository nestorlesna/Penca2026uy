import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RequireLoader } from '../../components/auth/AuthGuard'
import { ResultForm } from '../../components/admin/ResultForm'
import { MatchCard } from '../../components/matches/MatchCard'
import { useMatches } from '../../hooks/useMatches'
import { recalculateAll } from '../../services/adminService'
import type { MatchWithRelations } from '../../types/match'

const PHASES = [
  { label: 'Grupos',  order: 1 },
  { label: '16avos',  order: 2 },
  { label: '8vos',    order: 3 },
  { label: 'Cuartos', order: 4 },
  { label: 'Semi',    order: 5 },
  { label: '3er',     order: 6 },
  { label: 'Final',   order: 7 },
]

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

function MatchFooter({ match, onSelect }: { match: MatchWithRelations; onSelect: (m: MatchWithRelations) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {match.status === 'finished'
        ? <span className="badge bg-success/20 text-success text-[10px]">Finalizado</span>
        : <span className="badge bg-border text-text-muted text-[10px]">Pendiente</span>
      }
      <button
        className="btn-primary text-[11px] px-3 py-1"
        onClick={(e) => { e.stopPropagation(); onSelect(match) }}
      >
        Resultado
      </button>
    </div>
  )
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

        <div className="space-y-3">
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              footerContent={<MatchFooter match={match} onSelect={setSelected} />}
            />
          ))}
        </div>
      </div>

      <ResultForm match={selected} onClose={() => setSelected(null)} />
    </RequireLoader>
  )
}
