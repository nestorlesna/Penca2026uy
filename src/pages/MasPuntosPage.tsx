import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Lock, Trophy, Star, CheckCircle2, Circle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  fetchBonusConfig, fetchBonusPrediction, fetchBonusPoints,
  fetchTeamOptions, fetchGroupOptions, isTournamentStarted,
  saveBonusPrediction, GOAL_RANGES,
  type BonusPrediction, type TeamOption, type GroupOption, type BonusPoints,
} from '../services/bonusService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pts(n: number) { return `${n} pt${n !== 1 ? 's' : ''}` }

function TeamSelect({
  value, onChange, teams, placeholder, disabled,
}: {
  value: string | null
  onChange: (v: string | null) => void
  teams: TeamOption[]
  placeholder: string
  disabled: boolean
}) {
  return (
    <select
      disabled={disabled}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className="input text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {teams.map(t => (
        <option key={t.id} value={t.id}>
          {t.name} ({t.group_name})
        </option>
      ))}
    </select>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function BonusSection({
  title, icon, pointsAvail, earnedPts, locked, children, defaultOpen = false,
}: {
  title: string
  icon: React.ReactNode
  pointsAvail: string
  earnedPts?: BonusPoints
  locked: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const calculated = earnedPts !== undefined
  const won = calculated && earnedPts.points_earned > 0

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg flex-shrink-0">{icon}</span>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{title}</p>
            <p className="text-[11px] text-text-muted">{pointsAvail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {locked && <Lock size={13} className="text-text-muted" />}
          {calculated && (
            <span className={`badge text-xs font-bold ${won ? 'bg-primary/20 text-primary' : 'bg-border text-text-muted'}`}>
              {won ? `+${earnedPts.points_earned} pts` : '0 pts'}
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {locked && (
            <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-2 rounded-lg px-3 py-2">
              <Lock size={12} />
              <span>El torneo ya comenzó · apuesta cerrada</span>
            </div>
          )}
          {calculated && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              won ? 'bg-primary/10 text-primary' : 'bg-border/50 text-text-muted'
            }`}>
              {won ? <Trophy size={13} /> : <Circle size={13} />}
              <span>{won ? `¡Ganaste ${earnedPts.points_earned} puntos en esta sección!` : 'No acertaste en esta sección'}</span>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

// ── Section: Podio ────────────────────────────────────────────────────────────

function PodioSection({
  pred, config, earned, teams, locked, onSave,
}: {
  pred: BonusPrediction | null
  config: Record<string, number>
  earned?: BonusPoints
  teams: TeamOption[]
  locked: boolean
  onSave: (patch: Partial<BonusPrediction>) => Promise<void>
}) {
  const [v1, setV1] = useState(pred?.podio_1st_id ?? null)
  const [v2, setV2] = useState(pred?.podio_2nd_id ?? null)
  const [v3, setV3] = useState(pred?.podio_3rd_id ?? null)
  const [v4, setV4] = useState(pred?.podio_4th_id ?? null)

  useEffect(() => {
    setV1(pred?.podio_1st_id ?? null)
    setV2(pred?.podio_2nd_id ?? null)
    setV3(pred?.podio_3rd_id ?? null)
    setV4(pred?.podio_4th_id ?? null)
  }, [pred])

  const exacto   = config['podio_exacto']    ?? 10
  const pres     = config['podio_presencia'] ?? 5
  const maxPts   = exacto * 4
  const descr    = `${pts(exacto)} por posición exacta · ${pts(pres)} si acierta el equipo en otro lugar · hasta ${pts(maxPts)}`

  const positions = [
    { label: '🥇 1° puesto (Campeón)',     val: v1, set: setV1 },
    { label: '🥈 2° puesto (Subcampeón)',  val: v2, set: setV2 },
    { label: '🥉 3° puesto',               val: v3, set: setV3 },
    { label: '4° puesto',                  val: v4, set: setV4 },
  ]

  return (
    <BonusSection
      title="Podio del torneo" icon="🏆"
      pointsAvail={descr} earned={earned} locked={locked} defaultOpen
    >
      <div className="space-y-3">
        {positions.map(({ label, val, set }) => (
          <div key={label}>
            <label className="block text-xs text-text-muted mb-1">{label}</label>
            <TeamSelect value={val} onChange={set} teams={teams} placeholder="Elegir equipo…" disabled={locked} />
          </div>
        ))}
      </div>
      {!locked && (
        <button
          className="btn-primary w-full mt-2"
          onClick={() => onSave({ podio_1st_id: v1, podio_2nd_id: v2, podio_3rd_id: v3, podio_4th_id: v4 })}
        >
          Guardar podio
        </button>
      )}
    </BonusSection>
  )
}

// ── Section: Empates ──────────────────────────────────────────────────────────

function EmpatesSection({
  pred, config, earned, locked, onSave,
}: {
  pred: BonusPrediction | null
  config: Record<string, number>
  earned?: BonusPoints
  locked: boolean
  onSave: (patch: Partial<BonusPrediction>) => Promise<void>
}) {
  const [val, setVal] = useState<string>(pred?.empates_grupos != null ? String(pred.empates_grupos) : '')

  useEffect(() => {
    setVal(pred?.empates_grupos != null ? String(pred.empates_grupos) : '')
  }, [pred])

  const puntos = config['empates_grupos'] ?? 15
  const actual = earned?.detail?.actual as number | undefined

  return (
    <BonusSection
      title="Empates en fase de grupos"
      icon="🤝"
      pointsAvail={`${pts(puntos)} si aciertas cuántos empates hay en los 72 partidos de grupos`}
      earned={earned}
      locked={locked}
    >
      <div className="space-y-3">
        <label className="block text-xs text-text-muted">¿Cuántos partidos terminarán empatados (0-72)?</label>
        <select
          disabled={locked}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="input text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">— sin respuesta —</option>
          {Array.from({ length: 73 }, (_, i) => (
            <option key={i} value={String(i)}>{i}</option>
          ))}
        </select>
        {earned && actual !== undefined && (
          <p className="text-xs text-text-muted">
            Empates reales: <span className="text-text-primary font-semibold">{actual}</span>
            {pred?.empates_grupos != null && ` · tu apuesta: ${pred.empates_grupos}`}
          </p>
        )}
      </div>
      {!locked && (
        <button
          className="btn-primary w-full mt-2"
          onClick={() => onSave({ empates_grupos: val !== '' ? Number(val) : null })}
        >
          Guardar
        </button>
      )}
    </BonusSection>
  )
}

// ── Section: Rango de goles ───────────────────────────────────────────────────

function RangoGolesSection({
  pred, config, earned, locked, onSave,
}: {
  pred: BonusPrediction | null
  config: Record<string, number>
  earned?: BonusPoints
  locked: boolean
  onSave: (patch: Partial<BonusPrediction>) => Promise<void>
}) {
  const [val, setVal] = useState(pred?.rango_goles ?? '')

  useEffect(() => { setVal(pred?.rango_goles ?? '') }, [pred])

  const puntos = config['rango_goles'] ?? 20
  const actual = earned?.detail?.actual as string | undefined
  const total  = earned?.detail?.total_goals as number | undefined

  return (
    <BonusSection
      title="Rango de goles del torneo"
      icon="⚽"
      pointsAvail={`${pts(puntos)} si aciertas el rango de goles totales (90' + tiempo extra, sin penales)`}
      earned={earned}
      locked={locked}
    >
      <div className="space-y-3">
        <label className="block text-xs text-text-muted">
          Goles totales en los 104 partidos (incluye tiempo extra, excluye penales)
        </label>
        <select
          disabled={locked}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="input text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">— sin respuesta —</option>
          {GOAL_RANGES.map(r => (
            <option key={r} value={r}>{r} goles</option>
          ))}
        </select>
        {earned && actual && (
          <p className="text-xs text-text-muted">
            Rango real: <span className="text-text-primary font-semibold">{actual}</span>
            {total !== undefined && ` (${total} goles en total)`}
            {pred?.rango_goles && ` · tu apuesta: ${pred.rango_goles}`}
          </p>
        )}
      </div>
      {!locked && (
        <button
          className="btn-primary w-full mt-2"
          onClick={() => onSave({ rango_goles: val || null })}
        >
          Guardar
        </button>
      )}
    </BonusSection>
  )
}

// ── Section: Final 0-0 ────────────────────────────────────────────────────────

function FinalCeroSection({
  pred, config, earned, locked, onSave,
}: {
  pred: BonusPrediction | null
  config: Record<string, number>
  earned?: BonusPoints
  locked: boolean
  onSave: (patch: Partial<BonusPrediction>) => Promise<void>
}) {
  // null = sin respuesta, true = Sí, false = No
  const [val, setVal] = useState<boolean | null>(pred?.final_cero ?? null)

  useEffect(() => { setVal(pred?.final_cero ?? null) }, [pred])

  const puntos = config['final_cero'] ?? 25
  const actual = earned?.detail?.actual as boolean | undefined

  const options: Array<{ label: string; value: boolean | null }> = [
    { label: '— sin respuesta —', value: null },
    { label: 'Sí, habrá 0-0',    value: true  },
    { label: 'No habrá 0-0',     value: false },
  ]

  return (
    <BonusSection
      title="¿Habrá 0-0 en la Final?"
      icon="🎯"
      pointsAvail={`${pts(puntos)} si aciertas si la Final termina 0-0 a los 90'`}
      earned={earned}
      locked={locked}
    >
      <div className="space-y-2">
        {options.map(({ label, value }) => {
          const selected = val === value
          return (
            <button
              key={String(value)}
              disabled={locked}
              onClick={() => !locked && setVal(value)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                selected
                  ? 'border-primary bg-primary/10 text-text-primary'
                  : 'border-border bg-surface-2/30 text-text-secondary hover:border-border/80'
              }`}
            >
              {selected
                ? <CheckCircle2 size={15} className="text-primary flex-shrink-0" />
                : <Circle      size={15} className="text-text-muted flex-shrink-0" />
              }
              <span className="text-sm">{label}</span>
            </button>
          )
        })}
        {earned && actual !== undefined && (
          <p className="text-xs text-text-muted pt-1">
            Resultado real: <span className="text-text-primary font-semibold">{actual ? 'Sí, fue 0-0' : 'No fue 0-0'}</span>
          </p>
        )}
      </div>
      {!locked && (
        <button
          className="btn-primary w-full mt-2"
          onClick={() => onSave({ final_cero: val })}
        >
          Guardar
        </button>
      )}
    </BonusSection>
  )
}

// ── Section: Equipo goleador ──────────────────────────────────────────────────

function TopScorerTeamSection({
  pred, config, earned, teams, locked, onSave,
}: {
  pred: BonusPrediction | null
  config: Record<string, number>
  earned?: BonusPoints
  teams: TeamOption[]
  locked: boolean
  onSave: (patch: Partial<BonusPrediction>) => Promise<void>
}) {
  const [val, setVal] = useState(pred?.top_scorer_team_id ?? null)

  useEffect(() => { setVal(pred?.top_scorer_team_id ?? null) }, [pred])

  const puntos = config['top_scorer_team'] ?? 20

  return (
    <BonusSection
      title="Equipo con más goles"
      icon="🔥"
      pointsAvail={`${pts(puntos)} si aciertas qué equipo hace más goles (90' + tiempo extra, sin penales)`}
      earned={earned}
      locked={locked}
    >
      <div className="space-y-3">
        <label className="block text-xs text-text-muted">Selecciona el equipo más goleador del torneo</label>
        <TeamSelect value={val} onChange={setVal} teams={teams} placeholder="Elegir equipo…" disabled={locked} />
      </div>
      {!locked && (
        <button
          className="btn-primary w-full mt-2"
          onClick={() => onSave({ top_scorer_team_id: val })}
        >
          Guardar
        </button>
      )}
    </BonusSection>
  )
}

// ── Section: Grupo goleador ───────────────────────────────────────────────────

function TopGroupSection({
  pred, config, earned, groups, locked, onSave,
}: {
  pred: BonusPrediction | null
  config: Record<string, number>
  earned?: BonusPoints
  groups: GroupOption[]
  locked: boolean
  onSave: (patch: Partial<BonusPrediction>) => Promise<void>
}) {
  const [val, setVal] = useState(pred?.top_group_id ?? null)

  useEffect(() => { setVal(pred?.top_group_id ?? null) }, [pred])

  const puntos = config['top_group_goals'] ?? 13

  return (
    <BonusSection
      title="Grupo con más goles"
      icon="📊"
      pointsAvail={`${pts(puntos)} si aciertas qué grupo hace más goles en la fase de grupos`}
      earned={earned}
      locked={locked}
    >
      <div className="space-y-3">
        <label className="block text-xs text-text-muted">¿Qué grupo marca más goles en los 6 partidos grupales?</label>
        <select
          disabled={locked}
          value={val ?? ''}
          onChange={e => setVal(e.target.value || null)}
          className="input text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">— sin respuesta —</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>Grupo {g.name}</option>
          ))}
        </select>
      </div>
      {!locked && (
        <button
          className="btn-primary w-full mt-2"
          onClick={() => onSave({ top_group_id: val })}
        >
          Guardar
        </button>
      )}
    </BonusSection>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MasPuntosPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data: config  = {} } = useQuery({ queryKey: ['bonus_config'],  queryFn: fetchBonusConfig,  staleTime: Infinity })
  const { data: teams   = [] } = useQuery({ queryKey: ['bonus_teams'],   queryFn: fetchTeamOptions,  staleTime: Infinity })
  const { data: groups  = [] } = useQuery({ queryKey: ['bonus_groups'],  queryFn: fetchGroupOptions, staleTime: Infinity })
  const { data: locked  = false } = useQuery({
    queryKey: ['tournament_started'],
    queryFn: isTournamentStarted,
    staleTime: 1000 * 60 * 5,
  })

  const { data: pred } = useQuery({
    queryKey: ['bonus_prediction', user?.id],
    queryFn: () => fetchBonusPrediction(user!.id),
    enabled: !!user,
    staleTime: 1000 * 30,
  })

  const { data: earnedMap = {} } = useQuery({
    queryKey: ['bonus_points', user?.id],
    queryFn: () => fetchBonusPoints(user!.id),
    enabled: !!user,
    staleTime: 1000 * 30,
  })

  const { mutateAsync: save } = useMutation({
    mutationFn: async (patch: Partial<BonusPrediction>) => {
      if (!user) throw new Error('Debes iniciar sesión')
      await saveBonusPrediction(user.id, patch)
    },
    onSuccess: () => {
      toast.success('Apuesta guardada')
      qc.invalidateQueries({ queryKey: ['bonus_prediction'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSave = useCallback(async (patch: Partial<BonusPrediction>) => {
    await save(patch)
  }, [save])

  // Puntos máximos posibles
  const maxPts = (
    (config['podio_exacto'] ?? 10) * 4 +
    (config['empates_grupos'] ?? 15) +
    (config['rango_goles']   ?? 20) +
    (config['final_cero']    ?? 25) +
    (config['top_scorer_team'] ?? 20) +
    (config['top_group_goals'] ?? 13)
  )

  // Total ganado
  const totalEarned = Object.values(earnedMap).reduce((s, b) => s + b.points_earned, 0)

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Star className="mx-auto mb-3 text-accent" size={32} />
        <h2 className="text-lg font-bold text-text-primary mb-2">Apuestas especiales</h2>
        <p className="text-sm text-text-muted">Debés iniciar sesión para participar.</p>
      </div>
    )
  }

  const commonProps = { pred: pred ?? null, config, locked, onSave }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Star className="text-accent" size={20} />
          + Puntos
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Apuestas especiales · deben hacerse antes que inicie el torneo
        </p>
      </div>

      {/* Resumen */}
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">Puntos especiales ganados</p>
          <p className="text-2xl font-bold text-accent tabular-nums mt-0.5">{totalEarned}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Máximo disponible</p>
          <p className="text-2xl font-bold text-text-muted tabular-nums mt-0.5">{maxPts}</p>
        </div>
      </div>

      {locked && (
        <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-2 rounded-xl px-4 py-2.5 border border-border">
          <Lock size={13} />
          <span>El torneo ya comenzó. Las apuestas están cerradas. Los puntos se calculan automáticamente al cargar resultados.</span>
        </div>
      )}

      {/* Sections */}
      <PodioSection {...commonProps} earned={earnedMap['podio']} teams={teams} />

      <EmpatesSection {...commonProps} earned={earnedMap['empates_grupos']} />

      <RangoGolesSection {...commonProps} earned={earnedMap['rango_goles']} />

      <FinalCeroSection {...commonProps} earned={earnedMap['final_cero']} />

      <TopScorerTeamSection {...commonProps} earned={earnedMap['top_scorer_team']} teams={teams} />

      <TopGroupSection {...commonProps} earned={earnedMap['top_group_goals']} groups={groups} />

    </div>
  )
}
