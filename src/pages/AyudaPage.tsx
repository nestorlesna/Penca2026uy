import { useQuery } from '@tanstack/react-query'
import { Loader2, HelpCircle, Target, Trophy, Zap, Clock, Shield } from 'lucide-react'
import { fetchScoringConfig } from '../services/adminService'

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

    </div>
  )
}
