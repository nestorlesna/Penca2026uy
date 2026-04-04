import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, HelpCircle, Target, Trophy, Zap, Clock, Shield, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchScoringConfig } from '../services/adminService'
import { fetchBonusConfig } from '../services/bonusService'

interface ScoringConfig {
  id: string
  name: string
  is_active: boolean
  exact_score_points: number
  correct_winner_points: number
  correct_draw_points: number
  knockout_exact_score_bonus: number
  correct_et_result_points: number
  correct_pk_winner_points: number
}

// ── Calculadora de puntos interactiva ────────────────────────────────────────
function ScoreCalculator({ cfg }: { cfg: ScoringConfig }) {
  const [isGroup, setIsGroup] = useState(true)
  const [predHome, setPredHome] = useState(2)
  const [predAway, setPredAway] = useState(1)
  const [realHome, setRealHome] = useState(2)
  const [realAway, setRealAway] = useState(1)
  const [predEtHome, setPredEtHome] = useState(0)
  const [predEtAway, setPredEtAway] = useState(0)
  const [realEtHome, setRealEtHome] = useState(0)
  const [realEtAway, setRealEtAway] = useState(0)
  const [predPkWinner, setPredPkWinner] = useState<'home' | 'away'>('home')
  const [realPkWinner, setRealPkWinner] = useState<'home' | 'away'>('home')

  const predDraw = predHome === predAway
  const realDraw = realHome === realAway
  const exactScore = predHome === realHome && predAway === realAway
  const correctWinner = (!predDraw && !realDraw &&
    ((predHome > predAway && realHome > realAway) ||
     (predHome < predAway && realHome < realAway)))
  const correctDraw = predDraw && realDraw

  let points = 0
  let breakdown: { label: string; pts: number }[] = []

  if (exactScore) {
    const pts = cfg.exact_score_points + (!isGroup ? cfg.knockout_exact_score_bonus : 0)
    points += pts
    breakdown.push({ label: `Resultado exacto${!isGroup ? ' + bonus eliminatoria' : ''}`, pts })
  } else if (correctWinner) {
    points += cfg.correct_winner_points
    breakdown.push({ label: 'Ganador correcto', pts: cfg.correct_winner_points })
  } else if (correctDraw) {
    points += cfg.correct_draw_points
    breakdown.push({ label: 'Empate correcto', pts: cfg.correct_draw_points })
  }

  if (!isGroup && (realHome === realAway)) {
    const etExact = predEtHome === realEtHome && predEtAway === realEtAway
    if (etExact) {
      points += cfg.correct_et_result_points
      breakdown.push({ label: 'Resultado exacto tiempo extra', pts: cfg.correct_et_result_points })
    }
    const pkCorrect = predPkWinner === realPkWinner
    if (pkCorrect) {
      points += cfg.correct_pk_winner_points
      breakdown.push({ label: 'Ganador en penales correcto', pts: cfg.correct_pk_winner_points })
    }
  }

  const isRealDraw = realHome === realAway
  const needsEt = !isGroup && isRealDraw

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
        <span className="w-5 h-px bg-border inline-block" />
        Calculadora de puntos
        <span className="flex-1 h-px bg-border inline-block" />
      </h2>

      <div className="card p-4 space-y-4">
        <p className="text-sm text-text-secondary leading-relaxed">
          Probá diferentes resultados para entender cómo se calculan los puntos.
          Configurá el resultado real y tu predicción, y mirá cuántos puntos ganarías.
        </p>

        {/* Toggle grupos / eliminatoria */}
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={() => setIsGroup(!isGroup)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white" />
          </label>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {isGroup ? 'Fase de grupos' : 'Fase eliminatoria'}
            </p>
            <p className="text-[11px] text-text-muted">
              {isGroup ? 'Solo 90 minutos' : '90 min + alargue + penales (si hay empate)'}
            </p>
          </div>
        </div>

        {/* Equipos */}
        <div className="flex items-center justify-between text-sm px-2">
          <span className="font-semibold text-text-primary w-20 truncate">Uruguay</span>
          <span className="text-xs text-text-muted">vs</span>
          <span className="font-semibold text-text-primary w-20 truncate text-right">Argentina</span>
        </div>

        {/* Resultado real */}
        <div className="bg-background rounded-lg p-3 space-y-2">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Resultado real</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] text-text-secondary">Goles Uruguay (90')</label>
              <input
                type="number"
                min={0}
                value={realHome}
                onChange={e => setRealHome(Math.max(0, Number(e.target.value)))}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <span className="text-lg font-bold text-text-muted pt-5">–</span>
            <div className="flex-1 space-y-1">
              <label className="text-[11px] text-text-secondary">Goles Argentina (90')</label>
              <input
                type="number"
                min={0}
                value={realAway}
                onChange={e => setRealAway(Math.max(0, Number(e.target.value)))}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Alargue real */}
          {needsEt && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-text-secondary">Goles URU (alargue)</label>
                <input
                  type="number"
                  min={0}
                  value={realEtHome}
                  onChange={e => setRealEtHome(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <span className="text-lg font-bold text-text-muted pt-5">–</span>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-text-secondary">Goles ARG (alargue)</label>
                <input
                  type="number"
                  min={0}
                  value={realEtAway}
                  onChange={e => setRealEtAway(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Penales reales */}
          {needsEt && (realEtHome === realEtAway) && (
            <div className="space-y-1 pt-1">
              <label className="text-[11px] text-text-secondary">Ganador penales</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRealPkWinner('home')}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                    realPkWinner === 'home'
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-secondary hover:border-primary'
                  }`}
                >
                  Uruguay
                </button>
                <button
                  onClick={() => setRealPkWinner('away')}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                    realPkWinner === 'away'
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-secondary hover:border-primary'
                  }`}
                >
                  Argentina
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tu predicción */}
        <div className="bg-background rounded-lg p-3 space-y-2">
          <p className="text-[10px] text-accent/80 uppercase tracking-wider">Tu predicción</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] text-text-secondary">Goles Uruguay (90')</label>
              <input
                type="number"
                min={0}
                value={predHome}
                onChange={e => setPredHome(Math.max(0, Number(e.target.value)))}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <span className="text-lg font-bold text-text-muted pt-5">–</span>
            <div className="flex-1 space-y-1">
              <label className="text-[11px] text-text-secondary">Goles Argentina (90')</label>
              <input
                type="number"
                min={0}
                value={predAway}
                onChange={e => setPredAway(Math.max(0, Number(e.target.value)))}
                className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Alargue predicho */}
          {needsEt && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-text-secondary">Goles URU (alargue)</label>
                <input
                  type="number"
                  min={0}
                  value={predEtHome}
                  onChange={e => setPredEtHome(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <span className="text-lg font-bold text-text-muted pt-5">–</span>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-text-secondary">Goles ARG (alargue)</label>
                <input
                  type="number"
                  min={0}
                  value={predEtAway}
                  onChange={e => setPredEtAway(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-surface border border-border rounded px-3 py-2 text-center text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          {/* Penales predichos */}
          {needsEt && (realEtHome === realEtAway) && (
            <div className="space-y-1 pt-1">
              <label className="text-[11px] text-text-secondary">Ganador penales</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPredPkWinner('home')}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                    predPkWinner === 'home'
                      ? 'bg-accent text-white'
                      : 'bg-surface border border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  Uruguay
                </button>
                <button
                  onClick={() => setPredPkWinner('away')}
                  className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                    predPkWinner === 'away'
                      ? 'bg-accent text-white'
                      : 'bg-surface border border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  Argentina
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resultado */}
        <div className="bg-surface rounded-lg p-4 space-y-2">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Puntos obtenidos</p>
          {breakdown.length > 0 ? (
            <div className="space-y-1.5">
              {breakdown.map(b => (
                <div key={b.label} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{b.label}</span>
                  <span className="font-bold text-primary">+{b.pts} pts</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">Total</span>
                <span className="text-xl font-bold text-primary">{points} pts</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-2">
              No acertaste ni el ganador ni el marcador. 0 pts.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Mini componente para mostrar un ejemplo de partido ──────────────────────
function MatchExample({
  home, away, homeScore, awayScore, predicted, label,
}: {
  home: string; away: string
  homeScore: number; awayScore: number
  predicted: string; label: string
}) {
  return (
    <div className="bg-background rounded-lg p-3 space-y-2">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-primary w-16 truncate">{home}</span>
        <span className="font-bold tabular-nums text-primary mx-2">
          {homeScore} – {awayScore}
        </span>
        <span className="font-medium text-text-primary w-16 truncate text-right">{away}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-text-muted">Tu predicción:</span>
        <span className="text-[11px] font-semibold text-accent">{predicted}</span>
      </div>
    </div>
  )
}

// ── Fila de puntos ──────────────────────────────────────────────────────────
function PtsRow({ label, pts, sub }: { label: string; pts: number; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-text-primary">{label}</p>
        {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
      </div>
      <span className="flex-shrink-0 text-base font-bold text-primary tabular-nums">
        +{pts} pts
      </span>
    </div>
  )
}

// ── Ejemplo de escenario completo ───────────────────────────────────────────
function Scenario({
  icon: Icon, color, title, children,
}: {
  icon: React.ElementType; color: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${color}`}>
          <Icon size={14} />
        </div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
      </div>
      {children}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export function AyudaPage() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['scoring_config'],
    queryFn: fetchScoringConfig,
    staleTime: 1000 * 60 * 5,
  })

  const { data: bonusCfg = {} } = useQuery({
    queryKey: ['bonus_config'],
    queryFn: fetchBonusConfig,
    staleTime: Infinity,
  })

  const cfg = (configs as ScoringConfig[]).find(c => c.is_active)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  if (!cfg) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm">
        No hay configuración de puntaje activa. Contactá al administrador.
      </div>
    )
  }

  // Máximos teóricos
  const maxGrupos = cfg.exact_score_points
  const maxElim = cfg.exact_score_points + cfg.knockout_exact_score_bonus
  const maxConPenales = maxElim + cfg.correct_et_result_points + cfg.correct_pk_winner_points

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <HelpCircle className="text-primary flex-shrink-0" size={24} />
        <div>
          <h1 className="text-xl font-bold text-text-primary">¿Cómo funciona la Penca?</h1>
          <p className="text-xs text-text-muted mt-0.5">Config activa: <span className="text-accent">{cfg.name}</span></p>
        </div>
      </div>

      {/* Intro */}
      <div className="card p-4 space-y-2">
        <p className="text-sm text-text-secondary leading-relaxed">
          Predecís el resultado de cada partido antes de que empiece. Cuanto más preciso, más puntos ganás.
          Al final del torneo, el jugador con más puntos gana la penca.
        </p>
        <p className="text-[12px] text-text-muted leading-relaxed">
          Las predicciones se bloquean automáticamente cuando el partido comienza. No podés modificarlas una vez que empieza.
        </p>
      </div>

      {/* ── FASE DE GRUPOS ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-5 h-px bg-border inline-block" />
          Fase de grupos
          <span className="flex-1 h-px bg-border inline-block" />
        </h2>

        <div className="card p-4">
          <p className="text-sm text-text-secondary mb-3">
            Predecís el marcador exacto a 90 minutos (sin tiempo extra ni penales). Los puntos se acumulan:
          </p>
          <PtsRow
            label="Resultado exacto"
            pts={cfg.exact_score_points}
            sub={`Acertaste el marcador preciso. Ej: predijiste 2–1 y fue 2–1`}
          />
          <PtsRow
            label="Ganador correcto"
            pts={cfg.correct_winner_points}
            sub={`Acertaste quién ganó pero no el marcador exacto`}
          />
          <PtsRow
            label="Empate correcto"
            pts={cfg.correct_draw_points}
            sub={`Predijiste empate y fue empate (aunque no sea el marcador exacto)`}
          />
        </div>

        {/* Ejemplos fase de grupos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <Scenario icon={Target} color="bg-primary/20 text-primary" title="Resultado exacto">
            <MatchExample home="Argentina" away="Brasil" homeScore={2} awayScore={1}
              predicted="2 – 1" label="Resultado real" />
            <div className="flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
              <span className="text-xs text-text-secondary">Acertaste el marcador exacto</span>
              <span className="text-sm font-bold text-primary">+{cfg.exact_score_points} pts</span>
            </div>
          </Scenario>

          <Scenario icon={Trophy} color="bg-accent/20 text-accent" title="Ganador correcto">
            <MatchExample home="Argentina" away="Brasil" homeScore={2} awayScore={1}
              predicted="3 – 0" label="Resultado real" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-accent/10 rounded-lg px-3 py-2">
                <span className="text-xs text-text-secondary">Acertaste que ganó Argentina</span>
                <span className="text-sm font-bold text-accent">+{cfg.correct_winner_points} pts</span>
              </div>
              <p className="text-[11px] text-text-muted px-1">
                No acertaste el marcador exacto, pero sí el equipo ganador.
              </p>
            </div>
          </Scenario>

          <Scenario icon={Shield} color="bg-blue-500/20 text-blue-400" title="Empate correcto">
            <MatchExample home="Francia" away="España" homeScore={1} awayScore={1}
              predicted="0 – 0" label="Resultado real" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-blue-500/10 rounded-lg px-3 py-2">
                <span className="text-xs text-text-secondary">Predijiste empate y fue empate</span>
                <span className="text-sm font-bold text-blue-400">+{cfg.correct_draw_points} pts</span>
              </div>
              <p className="text-[11px] text-text-muted px-1">
                El marcador no fue exacto (0–0 vs 1–1), pero acertaste el empate.
              </p>
            </div>
          </Scenario>

          <Scenario icon={Target} color="bg-error/20 text-error" title="Sin puntos">
            <MatchExample home="México" away="Uruguay" homeScore={0} awayScore={2}
              predicted="1 – 1" label="Resultado real" />
            <div className="bg-border/50 rounded-lg px-3 py-2">
              <p className="text-xs text-text-muted">
                Predijiste empate pero ganó Uruguay. No acertaste ni el ganador ni el marcador.
              </p>
              <span className="text-sm font-bold text-text-muted">0 pts</span>
            </div>
          </Scenario>
        </div>

        {/* Resumen máximo grupos */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
          <p className="text-xs text-text-secondary">Máximo por partido en fase de grupos</p>
          <span className="text-lg font-bold text-primary">{maxGrupos} pts</span>
        </div>
      </section>

      {/* ── FASE ELIMINATORIA ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-5 h-px bg-border inline-block" />
          Fase eliminatoria
          <span className="flex-1 h-px bg-border inline-block" />
        </h2>

        <div className="card p-4">
          <p className="text-sm text-text-secondary mb-3">
            En eliminatorias hay tiempo extra y penales. La predicción es progresiva: primero los 90 minutos,
            luego el tiempo extra si hay empate, y finalmente los penales si sigue empatado.
          </p>
          <PtsRow
            label="Resultado exacto (90 min)"
            pts={cfg.exact_score_points}
            sub="Igual que en grupos"
          />
          <PtsRow
            label="Bonus eliminatoria"
            pts={cfg.knockout_exact_score_bonus}
            sub={`Bonus adicional por acertar el marcador exacto en eliminatorias. Suma al resultado exacto → total ${maxElim} pts`}
          />
          <PtsRow
            label="Ganador correcto (90 min)"
            pts={cfg.correct_winner_points}
            sub="Sin bonus si no acertaste el marcador exacto"
          />
          <PtsRow
            label="Resultado exacto tiempo extra"
            pts={cfg.correct_et_result_points}
            sub="Acertaste los goles adicionales en el tiempo extra"
          />
          <PtsRow
            label="Ganador en penales"
            pts={cfg.correct_pk_winner_points}
            sub="Acertaste qué equipo ganó la tanda de penales"
          />
        </div>

        {/* Ejemplos eliminatoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <Scenario icon={Zap} color="bg-accent/20 text-accent" title={`Exacto en eliminatoria → ${maxElim} pts`}>
            <MatchExample home="Portugal" away="Alemania" homeScore={2} awayScore={1}
              predicted="2 – 1" label="Resultado a 90 min (real)" />
            <div className="space-y-1">
              <div className="flex justify-between px-3 py-1.5 bg-primary/10 rounded text-xs">
                <span className="text-text-secondary">Resultado exacto</span>
                <span className="font-bold text-primary">+{cfg.exact_score_points}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-accent/10 rounded text-xs">
                <span className="text-text-secondary">Bonus eliminatoria</span>
                <span className="font-bold text-accent">+{cfg.knockout_exact_score_bonus}</span>
              </div>
              <div className="flex justify-between px-3 py-2 bg-surface-2 rounded text-sm font-bold">
                <span className="text-text-primary">Total</span>
                <span className="text-primary">{maxElim} pts</span>
              </div>
            </div>
          </Scenario>

          <Scenario icon={Clock} color="bg-purple-500/20 text-purple-400" title="Con tiempo extra y penales">
            <MatchExample home="Brasil" away="Holanda" homeScore={1} awayScore={1}
              predicted="1 – 1" label="90 min (empate real)" />
            <div className="bg-background rounded-lg p-3 space-y-2">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Resultado completo del partido</p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary w-16 truncate">Brasil</span>
                <span className="font-bold tabular-nums text-text-muted mx-2">
                  1 – 1
                </span>
                <span className="font-medium text-text-primary w-16 truncate text-right">Holanda</span>
              </div>
              <p className="text-[11px] text-text-secondary">Tiempo extra: 0 – 0 (sin goles adicionales)</p>
              <p className="text-[11px] text-text-secondary">Penales: Brasil 4 – 3 Holanda</p>
              <p className="text-[11px] text-text-muted">Tu predicción: 1 – 1 · ET 0 – 0 · Ganador penales: Brasil</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between px-3 py-1.5 bg-primary/10 rounded text-xs">
                <span className="text-text-secondary">Exacto 90 min (1–1)</span>
                <span className="font-bold text-primary">+{cfg.exact_score_points}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-accent/10 rounded text-xs">
                <span className="text-text-secondary">Bonus eliminatoria</span>
                <span className="font-bold text-accent">+{cfg.knockout_exact_score_bonus}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-purple-500/10 rounded text-xs">
                <span className="text-text-secondary">Exacto ET (0–0 adicional)</span>
                <span className="font-bold text-purple-400">+{cfg.correct_et_result_points}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-blue-500/10 rounded text-xs">
                <span className="text-text-secondary">Ganador penales (Brasil)</span>
                <span className="font-bold text-blue-400">+{cfg.correct_pk_winner_points}</span>
              </div>
              <div className="flex justify-between px-3 py-2 bg-surface-2 rounded text-sm font-bold">
                <span className="text-text-primary">Total si todo correcto</span>
                <span className="text-primary">{maxConPenales} pts</span>
              </div>
            </div>
          </Scenario>
        </div>

        {/* Resumen máximo eliminatorias */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Máximo por partido eliminatorio con penales</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {cfg.exact_score_points} exacto + {cfg.knockout_exact_score_bonus} bonus + {cfg.correct_et_result_points} ET + {cfg.correct_pk_winner_points} penales
            </p>
          </div>
          <span className="text-lg font-bold text-accent">{maxConPenales} pts</span>
        </div>
      </section>

      {/* ── TABLA RESUMEN ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-5 h-px bg-border inline-block" />
          Resumen de puntos
          <span className="flex-1 h-px bg-border inline-block" />
        </h2>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Situación</th>
                <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Grupos</th>
                <th className="text-right px-4 py-3 text-xs text-text-muted font-medium">Eliminat.</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Marcador exacto',
                  grupos: cfg.exact_score_points,
                  elim: cfg.exact_score_points + cfg.knockout_exact_score_bonus,
                },
                {
                  label: 'Ganador correcto (sin exacto)',
                  grupos: cfg.correct_winner_points,
                  elim: cfg.correct_winner_points,
                },
                {
                  label: 'Empate correcto (sin exacto)',
                  grupos: cfg.correct_draw_points,
                  elim: cfg.correct_draw_points,
                },
                {
                  label: 'Resultado ET exacto',
                  grupos: null,
                  elim: cfg.correct_et_result_points,
                },
                {
                  label: 'Ganador en penales',
                  grupos: null,
                  elim: cfg.correct_pk_winner_points,
                },
              ].map(({ label, grupos, elim }) => (
                <tr key={label} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-secondary">{label}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {grupos !== null
                      ? <span className="text-primary">+{grupos}</span>
                      : <span className="text-text-muted">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    <span className="text-accent">+{elim}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── CALCULADORA DE PUNTOS ── */}
      <ScoreCalculator cfg={cfg} />

      {/* ── + PUNTOS (APUESTAS ESPECIALES) ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-5 h-px bg-border inline-block" />
          Apuestas especiales (+ Puntos)
          <span className="flex-1 h-px bg-border inline-block" />
        </h2>

        <div className="card p-4 space-y-2">
          <p className="text-sm text-text-secondary leading-relaxed">
            Además de predecir partidos, podés ganar puntos extra respondiendo preguntas especiales
            antes de que inicie el torneo. Se encuentran en la sección{' '}
            <Link to="/mas-puntos" className="text-accent underline font-medium">+ Puntos</Link>.
          </p>
        </div>

        <div className="card overflow-hidden">
          {[
            {
              icon: '🏆',
              title: 'Podio del torneo (top 4)',
              pts: `${bonusCfg['podio_exacto'] ?? 10} pts por posición exacta · ${bonusCfg['podio_presencia'] ?? 5} pts si el equipo queda en top 4 pero en otro lugar`,
              when: 'Al finalizar la Final (M104) y el 3er puesto (M103)',
              example: 'Si apostás a Brasil 1°, Argentina 2°, Francia 3°, Alemania 4°… y acertás a Brasil 1° y Argentina 2° → ganás ' + ((bonusCfg['podio_exacto'] ?? 10) * 2) + ' pts. Si Francia queda 4° (no 3°) → ganás ' + (bonusCfg['podio_presencia'] ?? 5) + ' pts de presencia.',
            },
            {
              icon: '🤝',
              title: 'Empates en fase de grupos',
              pts: `${bonusCfg['empates_grupos'] ?? 15} pts si acertás el número exacto`,
              when: 'Al finalizar todos los 72 partidos de la fase de grupos',
              example: 'Si predecís 18 empates y fueron exactamente 18 → ganás ' + (bonusCfg['empates_grupos'] ?? 15) + ' pts.',
            },
            {
              icon: '⚽',
              title: 'Rango de goles del torneo',
              pts: `${bonusCfg['rango_goles'] ?? 20} pts — rangos de 20 en 20 (1-20, 21-40 … 321-340, 341+)`,
              when: 'Al finalizar la Final',
              example: 'Cuenta todos los goles de 90\' + tiempo extra de los 104 partidos (sin contar penales). Si predecís 241-260 y fueron 247 → ganás ' + (bonusCfg['rango_goles'] ?? 20) + ' pts.',
            },
            {
              icon: '🎯',
              title: '¿Habrá 0-0 en la Final?',
              pts: `${bonusCfg['final_cero'] ?? 25} pts si acertás`,
              when: 'Al cargar el resultado de la Final',
              example: 'Respondés Sí o No. Si predecís No y la Final termina 1-0 → ganás ' + (bonusCfg['final_cero'] ?? 25) + ' pts.',
            },
            {
              icon: '🔥',
              title: 'Equipo con más goles',
              pts: `${bonusCfg['top_scorer_team'] ?? 20} pts si acertás`,
              when: 'Al finalizar la Final',
              example: 'Cuenta goles de 90\' + tiempo extra de todos los partidos en que participó el equipo (sin penales). Un equipo que llegue a la Final jugó al menos 7 partidos.',
            },
            {
              icon: '📊',
              title: 'Grupo con más goles',
              pts: `${bonusCfg['top_group_goals'] ?? 13} pts si acertás`,
              when: 'Al finalizar la fase de grupos',
              example: 'Cada grupo juega 6 partidos. Ganás si predecís correctamente qué grupo marcó más goles en esos 6 encuentros.',
            },
          ].map(({ icon, title, pts, when, example }) => (
            <div key={title} className="border-b border-border last:border-0 px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">
                  {icon} {title}
                </p>
                <span className="flex-shrink-0 text-xs font-bold text-accent bg-accent/10 rounded px-2 py-0.5">{pts}</span>
              </div>
              <p className="text-[11px] text-text-muted">⏱ {when}</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">Ej: {example}</p>
            </div>
          ))}
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary flex items-center gap-1.5">
              <Star size={12} className="text-accent" /> Máximo de puntos especiales
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Si acertás las 6 apuestas especiales (podio completo) podés sumar más de{' '}
              {(bonusCfg['podio_exacto'] ?? 10) * 4 + (bonusCfg['empates_grupos'] ?? 15) + (bonusCfg['rango_goles'] ?? 20) + (bonusCfg['final_cero'] ?? 25) + (bonusCfg['top_scorer_team'] ?? 20) + (bonusCfg['top_group_goals'] ?? 13)} pts extra.
            </p>
          </div>
          <Link to="/mas-puntos" className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
            Apostar →
          </Link>
        </div>
      </section>

      {/* ── CONSEJOS ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-5 h-px bg-border inline-block" />
          Consejos
          <span className="flex-1 h-px bg-border inline-block" />
        </h2>
        <div className="card p-4 space-y-3">
          {[
            {
              emoji: '⏰',
              tip: 'Predecí antes que empiece el partido',
              desc: 'Las predicciones se bloquean automáticamente al inicio de cada partido.',
            },
            {
              emoji: '🎯',
              tip: 'Vale la pena arriesgar el marcador exacto',
              desc: `Acertar el marcador exacto da ${cfg.exact_score_points} pts, contra ${cfg.correct_winner_points} pts por solo acertar el ganador. La diferencia es significativa.`,
            },
            {
              emoji: '⚡',
              tip: 'Las eliminatorias valen más',
              desc: `El bonus de ${cfg.knockout_exact_score_bonus} pts por exacto en eliminatorias puede cambiar el ranking de un día para el otro.`,
            },
            {
              emoji: '📊',
              tip: 'No abandones si vas abajo en el ranking',
              desc: 'Con 104 partidos hay mucho margen. Los últimos partidos del torneo tienen alto puntaje y pueden voltear el ranking.',
            },
          ].map(({ emoji, tip, desc }) => (
            <div key={tip} className="flex gap-3">
              <span className="text-lg flex-shrink-0">{emoji}</span>
              <div>
                <p className="text-sm font-medium text-text-primary">{tip}</p>
                <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SUBGRUPOS ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-5 h-px bg-border inline-block" />
          Subgrupos
          <span className="flex-1 h-px bg-border inline-block" />
        </h2>

        <div className="card p-4 space-y-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            Los subgrupos son agrupaciones que podés crear para competir con amigos dentro del ranking general.
            Cada subgrupo tiene su propio ranking basado en los puntos de sus miembros.
          </p>

          <div className="space-y-2">
            {[
              {
                icon: '👤',
                title: 'Crear un subgrupo',
                desc: 'Cualquier jugador puede crear hasta 3 subgrupos. Elegí un nombre y empezá a sumar gente.',
              },
              {
                icon: '👥',
                title: 'Agregar miembros',
                desc: 'Como creador, podés invitar a cualquier usuario activo desde el combo de búsqueda. Ellos verán el subgrupo en su lista.',
              },
              {
                icon: '📊',
                title: 'Ranking propio',
                desc: 'Cada subgrupo muestra el ranking de sus miembros ordenados por puntos totales. Se muestra también el ranking global de cada uno.',
              },
              {
                icon: '🚪',
                title: 'Salir de un subgrupo',
                desc: 'Si te agregaron a un subgrupo, podés salir cuando quieras. El creador también puede eliminarte.',
              },
              {
                icon: '🛡️',
                title: 'Moderación',
                desc: 'El administrador puede eliminar cualquier subgrupo que no respete las normas básicas de convivencia.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{title}</p>
                  <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link to="/subgrupos" className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 justify-center w-fit">
            <Users size={14} /> Ir a Subgrupos
          </Link>
        </div>
      </section>

    </div>
  )
}
