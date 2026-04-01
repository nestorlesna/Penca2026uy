import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { MatchWithRelations } from '../types/match'

// ── Layout constants ──────────────────────────────────────────────────────────
const UNIT    = 88    // px height per R32 slot
const CARD_W  = 144   // px width of each match card
const CONN_W  = 20    // px width of SVG connector
const TOTAL_H = 16 * UNIT  // 1024px — fits all 16 R32 matches
const STROKE  = '#2E3A4D'
const MID     = CONN_W / 2

// ── Match orderings (top → bottom) ───────────────────────────────────────────
// Pairs: R32[0,1]→R16[0], R32[2,3]→R16[1], ... R16[0,1]→QF[0], etc.
const ALL_R32 = [73, 74, 75, 77, 81, 82, 83, 84, 76, 78, 79, 80, 85, 86, 87, 88]
const ALL_R16 = [89, 90, 93, 94, 91, 92, 95, 96]
const ALL_QF  = [97, 98, 99, 100]
const ALL_SF  = [101, 102]
const FINAL   = 104
const THIRD   = 103

// ── Connector path generation ─────────────────────────────────────────────────
// Each level groups pairs of input slots into one output slot at their midpoint.
// slotH = height of each slot in the INPUT column
function makePairPaths(count: number, slotH: number, topOffset: number): string[] {
  const paths: string[] = []
  for (let i = 0; i < count; i++) {
    const yTop = topOffset + i * slotH * 2
    const yBot = yTop + slotH
    const yMid = yTop + slotH / 2
    paths.push(`M0,${yTop} H${MID} V${yMid} H${CONN_W}`)
    paths.push(`M0,${yBot} H${MID} V${yMid}`)
  }
  return paths
}

// R32 slot height = UNIT (64px), first center at UNIT/2 (32px)
const R32_R16 = makePairPaths(8,  UNIT,      UNIT / 2)
// R16 slot height = 2*UNIT (128px), first center at UNIT (64px)
const R16_QF  = makePairPaths(4,  UNIT * 2,  UNIT)
// QF  slot height = 4*UNIT (256px), first center at 2*UNIT (128px)
const QF_SF   = makePairPaths(2,  UNIT * 4,  UNIT * 2)
// SF  slot height = 8*UNIT (512px), first center at 4*UNIT (256px)
const SF_FIN  = makePairPaths(1,  UNIT * 8,  UNIT * 4)

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
  team: MatchWithRelations['home_team'] | null
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
  const home = m?.home_team ?? null
  const away = m?.away_team ?? null
  const homeLabel = home?.is_confirmed ? home.abbreviation : (m?.home_slot_label ?? '?')
  const awayLabel = away?.is_confirmed ? away.abbreviation : (m?.away_slot_label ?? '?')

  const played    = m != null && m.home_score_90 !== null && m.away_score_90 !== null
  const pkDecided = played && m!.home_score_pk !== null

  const homeScore = played ? m!.home_score_90! + (m!.home_score_et ?? 0) : null
  const awayScore = played ? m!.away_score_90! + (m!.away_score_et ?? 0) : null

  const homeWin = played && !!home && m!.winner_team_id === home.id
  const awayWin = played && !!away && m!.winner_team_id === away.id

  const homeSuffix = pkDecided && homeWin ? 'P' : undefined
  const awaySuffix = pkDecided && awayWin ? 'P' : undefined

  return (
    <div className="rounded-lg overflow-hidden bg-surface border border-border" style={{ width: CARD_W }}>
      <div className="px-2 py-[2px] bg-surface-2 border-b border-border">
        <span className="text-[9px] text-text-muted font-medium">M{matchNum}</span>
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
function Connector({ paths }: { paths: string[] }) {
  return (
    <svg
      width={CONN_W} height={TOTAL_H}
      viewBox={`0 0 ${CONN_W} ${TOTAL_H}`}
      style={{ flexShrink: 0, display: 'block' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={STROKE} strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

// ── Phase header row ──────────────────────────────────────────────────────────
const PHASE_LABELS = ['Dieciseis.', 'Octavos', 'Cuartos', 'Semis', 'Final']
const hCls = 'text-[10px] font-semibold text-text-muted uppercase tracking-wide text-center py-2'

function PhaseHeaders() {
  const col = { width: CARD_W, flexShrink: 0 } as const
  const gap = { width: CONN_W, flexShrink: 0 } as const
  return (
    <div className="flex items-center">
      {PHASE_LABELS.map((label, i) => [
        i > 0 && <div key={`g${i}`} style={gap} />,
        <div key={label} style={col} className={`${hCls} ${label === 'Final' ? 'text-accent' : ''}`}>
          {label}
        </div>,
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

  const totalW = 5 * CARD_W + 4 * CONN_W  // 800px

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

            {/* Bracket: R32 → R16 → QF → SF → Final */}
            <div className="flex" style={{ height: TOTAL_H }}>
              <BracketCol matchNums={ALL_R32} matchMap={matchMap} />
              <Connector paths={R32_R16} />
              <BracketCol matchNums={ALL_R16} matchMap={matchMap} />
              <Connector paths={R16_QF} />
              <BracketCol matchNums={ALL_QF}  matchMap={matchMap} />
              <Connector paths={QF_SF} />
              <BracketCol matchNums={ALL_SF}  matchMap={matchMap} />
              <Connector paths={SF_FIN} />
              <BracketCol matchNums={[FINAL]} matchMap={matchMap} />
            </div>

            {/* Tercer puesto — centrado bajo la columna Final */}
            <div
              className="flex flex-col items-center gap-2 mt-6 pt-4 border-t border-border"
              style={{ marginLeft: 4 * (CARD_W + CONN_W), width: CARD_W }}
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
