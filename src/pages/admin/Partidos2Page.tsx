import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, AlertTriangle, Check, AlertCircle } from 'lucide-react'
import { RequireAdmin } from '../../components/auth/AuthGuard'
import { TeamFlag } from '../../components/ui/TeamFlag'
import { useMatches } from '../../hooks/useMatches'
import type { MatchWithRelations } from '../../types/match'
import type { WCMatch, WCMatchesData } from '../../components/api/WCVisuals'
import { isWCMatchesData } from '../../components/api/WCVisuals'
import { formatMatchDay, formatMatchTime } from '../../utils/datetime'

// ── Fetch API pública (mismo endpoint que ApiPage) ───────────────────────────
async function fetchApiMatches(): Promise<WCMatchesData> {
  const res = await fetch(
    `/api/football-data-pub?path=${encodeURIComponent('/competitions/WC/matches')}`,
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  if (!isWCMatchesData(data)) throw new Error('Respuesta inesperada de la API')
  return data
}

// ── Mapeo fase local (order) ↔ stage de la API ───────────────────────────────
const STAGE_MAP: { order: number; apiStage: string; label: string }[] = [
  { order: 1, apiStage: 'GROUP_STAGE',    label: 'Grupos' },
  { order: 2, apiStage: 'LAST_32',        label: 'Dieciseisavos' },
  { order: 3, apiStage: 'LAST_16',        label: 'Octavos' },
  { order: 4, apiStage: 'QUARTER_FINALS', label: 'Cuartos' },
  { order: 5, apiStage: 'SEMI_FINALS',    label: 'Semifinales' },
  { order: 6, apiStage: 'THIRD_PLACE',    label: '3.er puesto' },
  { order: 7, apiStage: 'FINAL',          label: 'Final' },
]

// ── Helpers de comparación ───────────────────────────────────────────────────
const norm = (s: string | null | undefined) => (s ?? '').trim().toUpperCase()

/** ¿La misma fecha y hora (al minuto) entre el partido local y el de la API? */
function sameDateTime(localIso: string, apiIso: string): boolean {
  return new Date(localIso).getTime() === new Date(apiIso).getTime()
}

/** ¿Los dos equipos (por código) coinciden, sin importar el orden local/visitante? */
function teamsMatch(local: MatchWithRelations, api: WCMatch): 'match' | 'diff' | 'unknown' {
  const lh = norm(local.home_team?.abbreviation)
  const la = norm(local.away_team?.abbreviation)
  const ah = norm(api.homeTeam.tla)
  const aa = norm(api.awayTeam.tla)
  // Si en cualquiera de los dos lados falta algún equipo, no podemos afirmar nada
  if (!lh || !la || !ah || !aa) return 'unknown'
  const localSet = [lh, la].sort().join('|')
  const apiSet = [ah, aa].sort().join('|')
  return localSet === apiSet ? 'match' : 'diff'
}

// ── Celda partido local ──────────────────────────────────────────────────────
function LocalCell({ match }: { match: MatchWithRelations | null }) {
  if (!match) {
    return (
      <div className="flex items-center justify-center h-full min-h-[58px] text-text-muted text-xs">
        — sin partido local —
      </div>
    )
  }
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {match.group
          ? <span className="badge-primary text-[10px] font-semibold uppercase tracking-wide">Grupo {match.group.name}</span>
          : <span className="badge bg-accent/20 text-accent text-[10px] font-semibold uppercase tracking-wide">{match.phase.name}</span>
        }
        <span className="text-text-muted text-[11px]">#{match.match_number}</span>
        <span className="text-text-muted text-[11px]">·</span>
        <span className="text-text-secondary text-[11px]">{formatMatchDay(match.match_datetime)}</span>
        <span className="text-text-muted text-[11px]">·</span>
        <span className="text-text-secondary text-[11px] font-medium">{formatMatchTime(match.match_datetime)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <TeamFlag team={match.home_team} slotLabel={match.home_slot_label} size="sm" align="left" />
        </div>
        <span className="text-text-muted text-sm font-light flex-shrink-0">vs</span>
        <div className="flex-1 min-w-0 flex justify-end">
          <TeamFlag team={match.away_team} slotLabel={match.away_slot_label} size="sm" align="right" />
        </div>
      </div>
    </div>
  )
}

// ── Celda partido API ────────────────────────────────────────────────────────
function ApiTeamSide({ name, code, crest, align }: {
  name: string; code: string; crest: string | null; align: 'left' | 'right'
}) {
  const isRight = align === 'right'
  return (
    <div className={`flex items-center gap-2 min-w-0 ${isRight ? 'flex-row-reverse' : ''}`}>
      {crest
        ? <img src={crest} alt={code} className="w-5 h-5 object-contain flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        : <span className="w-5 h-5 rounded-sm bg-border flex-shrink-0" />
      }
      <span className={`text-xs text-text-primary leading-tight truncate ${isRight ? 'text-right' : ''}`}>{name}</span>
    </div>
  )
}

function ApiCell({ match }: { match: WCMatch | null }) {
  if (!match) {
    return (
      <div className="flex items-center justify-center h-full min-h-[58px] text-text-muted text-xs">
        — sin partido en API —
      </div>
    )
  }
  const h = match.homeTeam
  const a = match.awayTeam
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {match.group
          ? <span className="badge bg-blue-900/40 text-blue-300 text-[10px] font-semibold uppercase tracking-wide">{match.group.replace('GROUP_', 'Grupo ')}</span>
          : <span className="badge bg-blue-900/40 text-blue-300 text-[10px] font-semibold uppercase tracking-wide">{match.stage}</span>
        }
        <span className="text-text-secondary text-[11px]">{formatMatchDay(match.utcDate)}</span>
        <span className="text-text-muted text-[11px]">·</span>
        <span className="text-text-secondary text-[11px] font-medium">{formatMatchTime(match.utcDate)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <ApiTeamSide name={h.shortName ?? h.name ?? 'Por definir'} code={h.tla ?? ''} crest={h.crest} align="left" />
        </div>
        <span className="text-text-muted text-sm font-light flex-shrink-0">vs</span>
        <div className="flex-1 min-w-0 flex justify-end">
          <ApiTeamSide name={a.shortName ?? a.name ?? 'Por definir'} code={a.tla ?? ''} crest={a.crest} align="right" />
        </div>
      </div>
    </div>
  )
}

// ── Fila comparativa (local + API en la misma línea) ─────────────────────────
function CompareRow({ local, api }: { local: MatchWithRelations | null; api: WCMatch | null }) {
  let teamStatus: 'match' | 'diff' | 'unknown' = 'unknown'
  let dateOk = true
  if (local && api) {
    teamStatus = teamsMatch(local, api)
    dateOk = sameDateTime(local.match_datetime, api.utcDate)
  }

  // Color del borde según comparación de cruces
  const borderClass =
    !local || !api ? 'border-amber-700/40'
    : teamStatus === 'match' ? 'border-success/40'
    : teamStatus === 'diff'  ? 'border-red-700/50'
    : 'border-border'

  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-stretch gap-0 rounded-xl border ${borderClass} overflow-hidden bg-surface`}>
      <div className="p-2.5">
        <LocalCell match={local} />
      </div>

      {/* Separador con indicador */}
      <div className="flex flex-col items-center justify-center px-2 bg-background/40 border-x border-border">
        {!local || !api ? (
          <AlertTriangle size={14} className="text-accent" />
        ) : teamStatus === 'match' ? (
          <Check size={15} className="text-success" />
        ) : teamStatus === 'diff' ? (
          <AlertCircle size={15} className="text-red-400" />
        ) : (
          <span className="text-text-muted text-[10px]">?</span>
        )}
        {local && api && !dateOk && (
          <span className="text-[9px] text-accent mt-0.5 text-center leading-tight" title="La fecha/hora no coincide">⏱≠</span>
        )}
      </div>

      <div className="p-2.5">
        <ApiCell match={api} />
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────
export function Partidos2Page() {
  const { data: localMatches = [], isLoading: loadingLocal } = useMatches()
  const {
    data: apiData,
    isLoading: loadingApi,
    error: apiError,
  } = useQuery({
    queryKey: ['api_wc_matches'],
    queryFn: fetchApiMatches,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const apiMatches = apiData?.matches ?? []

  // Para cada etapa: listas ordenadas por fecha y alineadas por posición
  const sections = useMemo(() => {
    return STAGE_MAP.map(stage => {
      const local = localMatches
        .filter(m => m.phase.order === stage.order)
        .sort((a, b) => new Date(a.match_datetime).getTime() - new Date(b.match_datetime).getTime())
      const api = apiMatches
        .filter(m => m.stage === stage.apiStage)
        .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())

      const rowCount = Math.max(local.length, api.length)
      const rows = Array.from({ length: rowCount }, (_, i) => ({
        local: local[i] ?? null,
        api: api[i] ?? null,
      }))

      const diffs = rows.filter(
        r => r.local && r.api && teamsMatch(r.local, r.api) === 'diff',
      ).length

      return { ...stage, rows, localCount: local.length, apiCount: api.length, diffs }
    }).filter(s => s.rows.length > 0)
  }, [localMatches, apiMatches])

  const isLoading = loadingLocal || loadingApi

  return (
    <RequireAdmin>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Partidos · Comparación con API</h1>
          <p className="text-text-muted text-sm mt-1">
            Cruces calculados localmente (izquierda) vs. partidos de la API pública (derecha), alineados por fecha dentro de cada ronda.
          </p>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1"><Check size={13} className="text-success" /> Equipos coinciden</span>
          <span className="flex items-center gap-1"><AlertCircle size={13} className="text-red-400" /> Cruce distinto</span>
          <span className="flex items-center gap-1"><AlertTriangle size={13} className="text-accent" /> Falta de un lado</span>
          <span className="flex items-center gap-1"><span className="text-accent">⏱≠</span> Fecha/hora distinta</span>
        </div>

        {apiError && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span>No se pudo cargar la API: {apiError instanceof Error ? apiError.message : 'error desconocido'}</span>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        )}

        {!isLoading && sections.map(section => (
          <section key={section.order} className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">{section.label}</h2>
              <span className="text-[11px] text-text-muted">
                Local: {section.localCount} · API: {section.apiCount}
              </span>
              {section.diffs > 0 && (
                <span className="badge bg-red-900/30 text-red-400 text-[10px] font-semibold">
                  {section.diffs} {section.diffs === 1 ? 'cruce distinto' : 'cruces distintos'}
                </span>
              )}
            </div>

            {/* Cabecera de columnas */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-0 px-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Local (calculado)</span>
              <span className="px-2" />
              <span className="text-[10px] text-text-muted uppercase tracking-wider text-right">API (programado)</span>
            </div>

            <div className="space-y-1.5">
              {section.rows.map((row, i) => (
                <CompareRow key={i} local={row.local} api={row.api} />
              ))}
            </div>
          </section>
        ))}

        {!isLoading && sections.length === 0 && !apiError && (
          <p className="text-text-muted text-sm text-center py-8">No hay partidos para comparar.</p>
        )}
      </div>
    </RequireAdmin>
  )
}
