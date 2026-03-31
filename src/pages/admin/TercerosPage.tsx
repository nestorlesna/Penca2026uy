import { useQuery } from '@tanstack/react-query'
import { Loader2, Info } from 'lucide-react'
import { RequireAdmin } from '../../components/auth/AuthGuard'
import { supabase } from '../../lib/supabase'
import type { BestThirdRanking } from '../../types/database'

async function fetchBestThirds(): Promise<BestThirdRanking[]> {
  const { data, error } = await supabase
    .from('best_third_ranking')
    .select('*')
    .order('rank')
  if (error) throw error
  return (data ?? []) as BestThirdRanking[]
}

function QualifyBadge({ rank }: { rank: number }) {
  if (rank <= 8) {
    return (
      <span className="badge bg-primary/20 text-primary text-[9px] font-semibold whitespace-nowrap">
        Clasifica
      </span>
    )
  }
  return (
    <span className="badge bg-border text-text-muted text-[9px]">
      Eliminado
    </span>
  )
}

export function TercerosPage() {
  const { data: thirds = [], isLoading } = useQuery({
    queryKey: ['best_third_ranking'],
    queryFn: fetchBestThirds,
    staleTime: 1000 * 30, // refresca frecuente — cambia al cargar resultados
  })

  const qualified   = thirds.filter(t => t.rank <= 8)
  const eliminated  = thirds.filter(t => t.rank > 8)
  const totalGroups = thirds.length

  return (
    <RequireAdmin>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-text-primary">Ranking de terceros</h1>
          <p className="text-xs text-text-muted mt-1">
            Los 8 mejores terceros de 12 grupos clasifican a dieciseisavos.
            Criterio FIFA: puntos → diferencia de goles → goles a favor → fair play.
          </p>
        </div>

        {/* Info de avance */}
        {totalGroups < 12 && (
          <div className="flex items-start gap-2 bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
            <Info size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-accent">
              {totalGroups === 0
                ? 'Aún no hay resultados de fase de grupos cargados.'
                : `${totalGroups} de 12 grupos con resultados. El ranking se actualiza automáticamente.`
              }
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        )}

        {!isLoading && thirds.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50">
                    <th className="text-left px-3 py-2.5 text-[11px] text-text-muted font-medium w-8">#</th>
                    <th className="text-left px-3 py-2.5 text-[11px] text-text-muted font-medium">Equipo</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">Grp</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">PJ</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">PG</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">PE</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">PP</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">GF</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">GC</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-medium">GD</th>
                    <th className="text-center px-2 py-2.5 text-[11px] text-text-muted font-bold text-text-secondary">PTS</th>
                    <th className="text-center px-3 py-2.5 text-[11px] text-text-muted font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {thirds.map((row, idx) => {
                    const isLast8     = row.rank === 8
                    const isFirst9    = row.rank === 9
                    const rowBorder   = isLast8 ? 'border-b-2 border-b-primary/40' : 'border-b border-border'

                    return (
                      <tr
                        key={row.team_id}
                        className={`${rowBorder} transition-colors hover:bg-surface-2/50 ${
                          row.rank <= 8 ? '' : 'opacity-60'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-bold tabular-nums ${
                            row.rank <= 8 ? 'text-primary' : 'text-text-muted'
                          }`}>
                            {row.rank}
                          </span>
                        </td>

                        {/* Equipo */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {row.team_flag_url ? (
                              <img
                                src={row.team_flag_url}
                                alt={row.team_name}
                                className="w-5 h-4 rounded-sm object-cover flex-shrink-0"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-5 h-4 rounded-sm bg-border flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium text-text-primary truncate max-w-[120px]">
                              {row.team_name}
                            </span>
                          </div>
                        </td>

                        {/* Grupo */}
                        <td className="px-2 py-2.5 text-center">
                          <span className="badge-primary text-[9px]">{row.group_name}</span>
                        </td>

                        {/* Stats */}
                        <td className="px-2 py-2.5 text-center text-xs text-text-secondary tabular-nums">{row.pj}</td>
                        <td className="px-2 py-2.5 text-center text-xs text-text-secondary tabular-nums">{row.pg}</td>
                        <td className="px-2 py-2.5 text-center text-xs text-text-secondary tabular-nums">{row.pe}</td>
                        <td className="px-2 py-2.5 text-center text-xs text-text-secondary tabular-nums">{row.pp}</td>
                        <td className="px-2 py-2.5 text-center text-xs text-text-secondary tabular-nums">{row.gf}</td>
                        <td className="px-2 py-2.5 text-center text-xs text-text-secondary tabular-nums">{row.gc}</td>
                        <td className="px-2 py-2.5 text-center text-xs tabular-nums">
                          <span className={row.gd > 0 ? 'text-primary' : row.gd < 0 ? 'text-error' : 'text-text-secondary'}>
                            {row.gd > 0 ? `+${row.gd}` : row.gd}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center text-xs font-bold text-text-primary tabular-nums">
                          {row.pts}
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-2.5 text-center">
                          <QualifyBadge rank={row.rank} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-4 px-4 py-3 border-t border-border text-[10px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                Top 8 clasifican a dieciseisavos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-px bg-primary/40 inline-block border-t-2 border-primary/40" />
                Línea de corte
              </span>
            </div>
          </div>
        )}

        {/* Resumen rápido */}
        {!isLoading && qualified.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-2">Clasificados ({qualified.length}/8)</p>
              <div className="space-y-1.5">
                {qualified.map(t => (
                  <div key={t.team_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.team_flag_url && (
                        <img src={t.team_flag_url} className="w-4 h-3 rounded-sm object-cover" alt="" />
                      )}
                      <span className="text-xs text-text-primary">{t.team_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">Grp {t.group_name}</span>
                      <span className="text-xs font-bold text-primary">{t.pts} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <p className="text-xs text-text-muted mb-2">Eliminados ({eliminated.length})</p>
              <div className="space-y-1.5">
                {eliminated.map(t => (
                  <div key={t.team_id} className="flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-2">
                      {t.team_flag_url && (
                        <img src={t.team_flag_url} className="w-4 h-3 rounded-sm object-cover" alt="" />
                      )}
                      <span className="text-xs text-text-primary">{t.team_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted">Grp {t.group_name}</span>
                      <span className="text-xs font-bold text-text-muted">{t.pts} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAdmin>
  )
}
