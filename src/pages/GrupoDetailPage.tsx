import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { GroupTable } from '../components/groups/GroupTable'
import { MatchCard } from '../components/matches/MatchCard'
import { useGroupStandings } from '../hooks/useGroupStandings'
import { useMatches } from '../hooks/useMatches'
import { GROUPS } from '../utils/constants'

export function GrupoDetailPage() {
  const { grupo } = useParams<{ grupo: string }>()
  const navigate = useNavigate()

  const groupName = grupo?.toUpperCase() ?? ''
  const isValid = GROUPS.includes(groupName)

  const { data: standings = [], isLoading: loadingStandings } = useGroupStandings(groupName)
  const { data: matches = [], isLoading: loadingMatches } = useMatches({
    phaseOrder: 1,
    groupName,
  })

  if (!isValid) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted mb-4">Grupo "{grupo}" no existe.</p>
        <Link to="/grupos" className="btn-primary text-sm">
          Ver todos los grupos
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/grupos')}
        className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-4 transition-colors"
      >
        <ArrowLeft size={15} />
        Grupos
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <span className="text-lg font-bold text-primary">{groupName}</span>
        </div>
        <h1 className="text-xl font-bold text-text-primary">Grupo {groupName}</h1>
      </div>

      {/* Tabla de posiciones */}
      <section className="card p-4 mb-5">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          Posiciones
        </h2>
        {loadingStandings ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-primary" size={22} />
          </div>
        ) : (
          <GroupTable
            standings={standings}
            compact={false}
            onTeamClick={(teamId) => navigate(`/equipos/${teamId}`)}
          />
        )}
      </section>

      {/* Partidos del grupo */}
      <section>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          Partidos
        </h2>
        {loadingMatches ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-primary" size={22} />
          </div>
        ) : matches.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">
            Sin partidos cargados.
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
