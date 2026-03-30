import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GroupTable } from '../components/groups/GroupTable'
import { useGroupStandings } from '../hooks/useGroupStandings'
import type { GroupStanding } from '../types'
import { GROUPS } from '../utils/constants'

// Agrupa las posiciones planas en un mapa grupo → standings[]
function byGroup(standings: GroupStanding[]): Map<string, GroupStanding[]> {
  const map = new Map<string, GroupStanding[]>()
  for (const s of standings) {
    if (!map.has(s.group_name)) map.set(s.group_name, [])
    map.get(s.group_name)!.push(s)
  }
  return map
}

export function GruposPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const navigate = useNavigate()
  const { data: standings, isLoading, error } = useGroupStandings()

  const groupMap = standings ? byGroup(standings) : new Map()

  // Grupos a mostrar: todos o solo el seleccionado
  const visibleGroups = selected ? [selected] : GROUPS

  return (
    <div>
      <h1 className="text-xl font-bold text-text-primary mb-4">Grupos</h1>

      {/* Selector de grupo */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-hide -mx-4 px-4">
        <button
          onClick={() => setSelected(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selected
              ? 'bg-primary text-white'
              : 'bg-surface-2 text-text-secondary hover:text-text-primary'
          }`}
        >
          Todos
        </button>
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setSelected(selected === g ? null : g)}
            className={`flex-shrink-0 w-9 h-8 rounded-full text-xs font-bold transition-colors ${
              selected === g
                ? 'bg-primary text-white'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <div className="card p-4 text-error text-sm text-center">
          Error cargando posiciones. Verificá la conexión a Supabase.
        </div>
      )}

      {!isLoading && !error && (
        <div className={`grid gap-4 ${selected ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {visibleGroups.map((g) => {
            const rows = groupMap.get(g) ?? []
            return (
              <div key={g} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                      {g}
                    </span>
                    Grupo {g}
                  </h2>
                  <button
                    onClick={() => navigate(`/grupos/${g}`)}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver detalle →
                  </button>
                </div>
                <GroupTable
                  standings={rows}
                  compact={!selected}
                  onTeamClick={(teamId) => navigate(`/equipos/${teamId}`)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
