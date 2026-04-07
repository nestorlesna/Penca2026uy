import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { MatchCard } from '../components/matches/MatchCard'
import { StadiumModal } from '../components/ui/StadiumModal'
import { PredictionsSummaryModal } from '../components/ui/PredictionsSummaryModal'
import { useMatches } from '../hooks/useMatches'
import { fetchStadium } from '../services/matchService'
import { fetchMatchPredictionsSummary } from '../services/predictionService'
import { matchDateKey, formatMatchDayFull } from '../utils/datetime'
import { GROUPS } from '../utils/constants'
import type { PredictionSummary } from '../services/predictionService'

interface StadiumModalData {
  id: string
  name: string
  city: string
  country: string
  address: string | null
  capacity: number | null
  photo_urls: string[]
  latitude: number | null
  longitude: number | null
  timezone: string
}

// Fases disponibles en el selector
const PHASE_TABS = [
  { label: 'Todos',   phaseOrder: undefined },
  { label: 'Grupos',  phaseOrder: 1 },
  { label: '16avos',  phaseOrder: 2 },
  { label: '8vos',    phaseOrder: 3 },
  { label: 'Cuartos', phaseOrder: 4 },
  { label: 'Semi',    phaseOrder: 5 },
  { label: '3er',     phaseOrder: 6 },
  { label: 'Final',   phaseOrder: 7 },
]

export function FixturePage() {
  const [phaseOrder, setPhaseOrder] = useState<number | undefined>(undefined)
  const [groupName, setGroupName] = useState<string | undefined>(undefined)
  const [stadiumModalOpen, setStadiumModalOpen] = useState(false)
  const [selectedStadium, setSelectedStadium] = useState<StadiumModalData | null>(null)
  const [predictionsModalOpen, setPredictionsModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<{
    id: string
    homeTeam: string
    awayTeam: string
    homeScore: number | null
    awayScore: number | null
    summary: PredictionSummary[]
    totalPredictions: number
  } | null>(null)

  const { data: matches, isLoading, error } = useMatches(
    { phaseOrder, groupName }
  )

  const handleStadiumClick = async (stadiumId: string) => {
    const stadium = await fetchStadium(stadiumId)
    if (stadium) {
      setSelectedStadium(stadium)
      setStadiumModalOpen(true)
    }
  }

  const handlePredictionsClick = async (matchId: string) => {
    const match = matches?.find(m => m.id === matchId)
    if (!match) return
    const { summary, totalPredictions } = await fetchMatchPredictionsSummary(matchId)
    setSelectedMatch({
      id: matchId,
      homeTeam: match.home_team?.name ?? match.home_slot_label ?? '?',
      awayTeam: match.away_team?.name ?? match.away_slot_label ?? '?',
      homeScore: match.home_score_90,
      awayScore: match.away_score_90,
      summary,
      totalPredictions,
    })
    setPredictionsModalOpen(true)
  }

  // Agrupar partidos por fecha
  const groupedByDate = useMemo(() => {
    if (!matches) return []
    const map = new Map<string, typeof matches>()
    for (const m of matches) {
      const key = matchDateKey(m.match_datetime)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return Array.from(map.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: formatMatchDayFull(items[0].match_datetime),
      matches: items,
    }))
  }, [matches])

  const showGroupFilter = phaseOrder === 1 || phaseOrder === undefined

  return (
    <div>
      {/* Título */}
      <h1 className="text-xl font-bold text-text-primary mb-4">Fixture</h1>

      {/* Tabs de fase — scrollable horizontal en mobile */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-3 scrollbar-hide -mx-4 px-4">
        {PHASE_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => {
              setPhaseOrder(tab.phaseOrder)
              if (tab.phaseOrder !== 1 && tab.phaseOrder !== undefined) {
                setGroupName(undefined)
              }
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              phaseOrder === tab.phaseOrder
                ? 'bg-primary text-white'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtro de grupo (solo en fase grupos o "todos") */}
      {showGroupFilter && (
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setGroupName(undefined)}
            className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              !groupName
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Todos
          </button>
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => {
                setGroupName(g)
                setPhaseOrder(1)
              }}
              className={`flex-shrink-0 px-2 h-7 rounded text-xs font-bold transition-colors ${
                groupName === g
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              G. {g}
            </button>
          ))}
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {error && (
        <div className="card p-4 text-error text-sm text-center">
          Error cargando los partidos. Verificá la conexión a Supabase.
        </div>
      )}

      {/* Lista de partidos agrupados por fecha */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {groupedByDate.length === 0 && (
            <p className="text-text-muted text-sm text-center py-8">
              No hay partidos para mostrar.
            </p>
          )}

          {groupedByDate.map(({ dateKey, label, matches: dayMatches }) => (
            <section key={dateKey}>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2 capitalize">
                {label}
              </h2>
              <div className="space-y-3">
                {dayMatches.map((match) => (
                  <MatchCard key={match.id} match={match} onStadiumClick={handleStadiumClick} onPredictionsClick={handlePredictionsClick} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <StadiumModal
        open={stadiumModalOpen}
        onClose={() => setStadiumModalOpen(false)}
        stadium={selectedStadium}
      />

      {selectedMatch && (
        <PredictionsSummaryModal
          open={predictionsModalOpen}
          onClose={() => setPredictionsModalOpen(false)}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
          homeScore={selectedMatch.homeScore}
          awayScore={selectedMatch.awayScore}
          summary={selectedMatch.summary}
          totalPredictions={selectedMatch.totalPredictions}
        />
      )}
    </div>
  )
}
