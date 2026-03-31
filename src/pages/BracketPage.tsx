import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { MatchWithRelations } from '../types/match'

// ── Layout constants ──────────────────────────────────────────────────────────
const UNIT    = 64   // px height per R32 slot
const CARD_W  = 144  // px width of each match card
const CONN_W  = 20   // px width of SVG connector
const TOTAL_H = 8 * UNIT  // 512px total bracket height
const STROKE  = '#2E3A4D'

// ── Bracket match ordering (top→bottom) ──────────────────────────────────────
// Left half feeds → SF M101 → Final M104
const L_R32 = [74, 77, 73, 75, 83, 84, 81, 82]
const L_R16 = [89, 90, 93, 94]
const L_QF  = [97, 98]
const L_SF  = [101]

// Right half feeds → SF M102 → Final M104
const R_R32 = [76, 78, 79, 80, 86, 88, 85, 87]
const R_R16 = [91, 92, 95, 96]
const R_QF  = [99, 100]
const R_SF  = [102]

const FINAL = 104
const THIRD = 103

// ── SVG connector paths ───────────────────────────────────────────────────────
// Centers: R32=[32,96,160,224,288,352,416,480], R16=[64,192,320,448], QF=[128,384], SF=[256]
const W = CONN_W, M = CONN_W / 2

const CONN_PATHS: Record<string, string[]> = {
  'r32-r16': [
    `M0,32 H${M} V64 H${W}`,   `M0,96 H${M} V64`,
    `M0,160 H${M} V192 H${W}`, `M0,224 H${M} V192`,
    `M0,288 H${M} V320 H${W}`, `M0,352 H${M} V320`,
    `M0,416 H${M} V448 H${W}`, `M0,480 H${M} V448`,
  ],
  'r16-qf': [
    `M0,64 H${M} V128 H${W}`,  `M0,192 H${M} V128`,
    `M0,320 H${M} V384 H${W}`, `M0,448 H${M} V384`,
  ],
  'qf-sf': [
    `M0,128 H${M} V256 H${W}`, `M0,384 H${M} V256`,
  ],
  'sf-fin': [`M0,256 H${W}`],
}

// ── Types ─────────────────────────────────────────────────────────────────────
type MatchMap = Map<number, MatchWithRelations>

// ── Data fetching ─────────────────────────────────────────────────────────────
const MATCH_SELECT = `
  id, match_number, match_datetime, status,
  home_slot_label, away_slot_label,
  home_score_90, away_score_90,
  home_score_et, away_score_et,
  home_score_pk, away_score_pk,
  winner_team_id,
  phase:phases(id, name, order, has_extra_time, has_penalties),
  group:groups(id, name),
  stadium:stadiums(id, name, city, country, timezone),
  home_team:teams!home_team_id(id, name, abbreviation, flag_url, is_confirmed, placeholder_name),
  away_team:teams!away_team_id(id, name, abbreviation, flag_url, is_confirmed, placeholder_name)
` as const

async function fetchKnockout(): Promise<MatchMap> {
  const { data: phases } = await supabase.from('phases').select('id, order')
  const ids = (phases as Array<{ id: string; order: number }> | null)
    ?.filter(p => p.order >= 2).map(p => p.id) ?? []

  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .in('phase_id', ids)
    .order('match_number')

  if (error) throw error
  const matches = (data ?? []) as unknown as MatchWithRelations[]
  return new Map(matches.map(m => [m.match_number, m]))
}

// ── Team row ──────────────────────────────────────────────────────────────────
function TeamRow({
  team, label, score, suffix, winner, loser,
}: {
  team: MatchWithRelations['home_team']
  label: string
  score: number | null
  suffix?: string
  winner: boolean
  loser: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-[5px] ${winner ? 'bg-primary/10' : ''}`}>
      {team?.flag_url ? (
        <img src={team.flag_url} alt="" className="w-5 h-3.5 rounded-sm object-cover flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-5 h-3.5 rounded-sm bg-border flex-shrink-0" />
      )}
      <span className={`text-[11px] flex-1 font-medium truncate ${
        winner ? 'text-text-primary' : loser ? 'text-text-muted' : 'text-text-secondary'
      }`}>
        {label}
      </span>
      {score !== null && (
        <span className={`text-xs font-bold tabular-nums ${winner ? 'text-primary' : 'text-text-muted'}`}>
          {score}{suffix ?? ''}
        </span>
      )}
    </div>
  )
}

// ── Match card ────────────────────────────────────────────────────────────────
function MatchCard({ matchNum, matchMap }: { matchNum: number; matchMap: MatchMap }) {
  const m = matchMap.get(matchNum)
  const home = m?.home_team
  const away = m?.away_team
  const homeLabel = home?.is_confirmed ? home.abbreviation : (m?.home_slot_label ?? '?')
  const awayLabel = away?.is_confirmed ? away.abbreviation : (m?.away_slot_label ?? '?')

  const played   = m?.status === 'finished' || m?.status === 'live'
  const pkDecided = played && m?.home_score_pk !== null

  // Show cumulative score (90 + ET)
  const homeScore = played && m?.home_score_90 !== null
    ? m.home_score_90! + (m.home_score_et ?? 0)
    : null
  const awayScore = played && m?.away_score_90 !== null
    ? m.away_score_90! + (m.away_score_et ?? 0)
    : null

  const homeWin = m?.status === 'finished' && !!home && m?.winner_team_id === home.id
  const awayWin = m?.status === 'finished' && !!away && m?.winner_team_id === away.id

  // PK suffix shows on winning team
  const homeSuffix = pkDecided && homeWin ? 'P' : undefined
  const awaySuffix = pkDecided && awayWin ? 'P' : undefined

  return (
    <div className="rounded-lg overflow-hidden bg-surface border border-border" style={{ width: CARD_W }}>
      <div className="px-2 py-[2px] bg-surface-2 border-b border-border flex items-center justify-between">
        <span className="text-[9px] text-text-muted font-medium">M{matchNum}</span>
        {m?.status === 'live' && (
          <span className="text-[9px] font-bold text-error animate-pulse">EN VIVO</span>
        )}
      </div>
      <TeamRow team={home} label={homeLabel} score={homeScore} suffix={homeSuffix} winner={homeWin} loser={awayWin} />
      <div className="h-px bg-border" />
      <TeamRow team={away} label={awayLabel} score={awayScore} suffix={awaySuffix} winner={awayWin} loser={homeWin} />
    </div>
  )
}

// ── Bracket column ────────────────────────────────────────────────────────────
function BracketCol({ matchNums, matchMap }: { matchNums: number[]; matchMap: MatchMap }) {
  const slotH = TOTAL_H / matchNums.length
  return (
    <div style={{ height: TOTAL_H, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {matchNums.map(num => (
        <div key={num} style={{ height: slotH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MatchCard matchNum={num} matchMap={matchMap} />
        </div>
      ))}
    </div>
  )
}

// ── SVG connector ─────────────────────────────────────────────────────────────
function Connector({ type, mirror = false }: { type: string; mirror?: boolean }) {
  const paths = CONN_PATHS[type] ?? []
  return (
    <svg
      width={CONN_W} height={TOTAL_H}
      viewBox={`0 0 ${CONN_W} ${TOTAL_H}`}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <g transform={mirror ? `scale(-1,1) translate(-${CONN_W},0)` : undefined}>
        {paths.map((d, i) => (
          <path
            key={i} d={d} fill="none"
            stroke={STROKE} strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  )
}

// ── Phase header row ──────────────────────────────────────────────────────────
const LEFT_LABELS  = ['Diecis.', 'Octavos', 'Cuartos', 'Semis']
const RIGHT_LABELS = ['Semis', 'Cuartos', 'Octavos', 'Diecis.']
const hCls = 'text-[10px] font-semibold text-text-muted uppercase tracking-wide text-center py-2'

function PhaseHeaders() {
  const col = { width: CARD_W, flexShrink: 0 } as const
  const gap = { width: CONN_W, flexShrink: 0 } as const
  return (
    <div className="flex items-center">
      {LEFT_LABELS.map((h, i) => [
        <div key={`lh${i}`} style={col} className={hCls}>{h}</div>,
        <div key={`lg${i}`} style={gap} />,
      ])}
      <div style={col} className={`${hCls} text-accent`}>Final</div>
      {RIGHT_LABELS.map((h, i) => [
        <div key={`rg${i}`} style={gap} />,
        <div key={`rh${i}`} style={col} className={hCls}>{h}</div>,
      ])}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function BracketPage() {
  const { data: matchMap = new Map<number, MatchWithRelations>(), isLoading } = useQuery({
    queryKey: ['bracket'],
    queryFn: fetchKnockout,
    staleTime: 1000 * 60,
  })

  const totalW = 9 * CARD_W + 8 * CONN_W

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Cuadro del torneo</h1>
        <p className="text-xs text-text-muted mt-1">
          Fase eliminatoria · Dieciseisavos → Final
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div style={{ minWidth: totalW }}>
            <PhaseHeaders />

            {/* Bracket */}
            <div className="flex" style={{ height: TOTAL_H }}>
              {/* Left half: R32 → R16 → QF → SF */}
              <BracketCol matchNums={L_R32} matchMap={matchMap} />
              <Connector type="r32-r16" />
              <BracketCol matchNums={L_R16} matchMap={matchMap} />
              <Connector type="r16-qf" />
              <BracketCol matchNums={L_QF}  matchMap={matchMap} />
              <Connector type="qf-sf" />
              <BracketCol matchNums={L_SF}  matchMap={matchMap} />
              <Connector type="sf-fin" />

              {/* Final (center) */}
              <BracketCol matchNums={[FINAL]} matchMap={matchMap} />

              {/* Right half: SF → QF → R16 → R32 (mirrored) */}
              <Connector type="sf-fin" mirror />
              <BracketCol matchNums={R_SF}  matchMap={matchMap} />
              <Connector type="qf-sf"  mirror />
              <BracketCol matchNums={R_QF}  matchMap={matchMap} />
              <Connector type="r16-qf" mirror />
              <BracketCol matchNums={R_R16} matchMap={matchMap} />
              <Connector type="r32-r16" mirror />
              <BracketCol matchNums={R_R32} matchMap={matchMap} />
            </div>

            {/* Third-place match — centered under the Final */}
            <div
              className="flex flex-col items-center gap-2 mt-6 pt-4 border-t border-border"
              style={{ marginLeft: 4 * CARD_W + 4 * CONN_W, width: CARD_W }}
            >
              <span className="text-[10px] text-text-muted uppercase tracking-wide font-semibold">
                3° Puesto
              </span>
              <MatchCard matchNum={THIRD} matchMap={matchMap} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
