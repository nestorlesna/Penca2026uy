import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RequireAdmin } from '../../components/auth/AuthGuard'
import { fetchScoringConfig, updateScoringConfig } from '../../services/adminService'

type ConfigRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  [key: string]: unknown
}

const SCORE_KEYS = [
  { key: 'pts_exact_score', label: 'Resultado exacto' },
  { key: 'pts_correct_winner', label: 'Ganador correcto' },
  { key: 'pts_correct_goals_home', label: 'Goles local correctos' },
  { key: 'pts_correct_goals_away', label: 'Goles visitante correctos' },
  { key: 'pts_correct_et', label: 'Resultado ET exacto' },
  { key: 'pts_correct_pk_winner', label: 'Ganador penales correcto' },
]

export function ConfigPage() {
  const qc = useQueryClient()
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['scoring_config'],
    queryFn: fetchScoringConfig,
  })

  const active = (configs as ConfigRow[]).find(c => c.is_active)
  const [editing, setEditing] = useState<Record<string, string>>({})

  function startEdit(cfg: ConfigRow) {
    const vals: Record<string, string> = {}
    SCORE_KEYS.forEach(({ key }) => { vals[key] = String(cfg[key] ?? 0) })
    setEditing(vals)
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!active) return
      const values: Record<string, number> = {}
      SCORE_KEYS.forEach(({ key }) => {
        values[key] = parseInt(editing[key] ?? '0', 10)
      })
      await updateScoringConfig(active.id, values)
    },
    onSuccess: () => {
      toast.success('Configuración actualizada')
      qc.invalidateQueries({ queryKey: ['scoring_config'] })
      setEditing({})
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const isEditing = Object.keys(editing).length > 0

  return (
    <RequireAdmin>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold text-text-primary">Configuración de puntaje</h1>

        {isLoading && <p className="text-text-muted text-sm">Cargando...</p>}

        {active && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{active.name}</p>
                {active.description && (
                  <p className="text-xs text-text-muted mt-0.5">{active.description as string}</p>
                )}
              </div>
              <span className="badge-primary text-[10px]">Activa</span>
            </div>

            <div className="space-y-3">
              {SCORE_KEYS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">{label}</span>
                  {isEditing ? (
                    <input
                      type="number" min={0} max={99}
                      value={editing[key] ?? ''}
                      onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value }))}
                      className="input w-20 text-center"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {String(active[key] ?? 0)} pts
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              {isEditing ? (
                <>
                  <button className="btn-primary flex-1" onClick={() => mutate()} disabled={isPending}>
                    {isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="btn-ghost flex-1 border border-border" onClick={() => setEditing({})}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button className="btn-secondary w-full" onClick={() => startEdit(active)}>
                  Editar puntajes
                </button>
              )}
            </div>
          </div>
        )}

        {/* Historial de configs inactivas */}
        {(configs as ConfigRow[]).filter(c => !c.is_active).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-text-muted uppercase tracking-wide">Configuraciones anteriores</p>
            {(configs as ConfigRow[]).filter(c => !c.is_active).map(cfg => (
              <div key={cfg.id} className="card p-3 opacity-60">
                <p className="text-sm text-text-secondary">{cfg.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </RequireAdmin>
  )
}
