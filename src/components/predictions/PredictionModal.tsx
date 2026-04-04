import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Minus, Plus } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { TeamFlag } from '../ui/TeamFlag'
import { upsertPrediction, deletePrediction } from '../../services/predictionService'
import { useAuth } from '../../hooks/useAuth'
import { useInvalidatePredictions } from '../../hooks/usePredictions'
import type { MatchWithRelations } from '../../types/match'
import type { PredictionWithMatch } from '../../services/predictionService'

interface Props {
  match: MatchWithRelations | null
  existing: PredictionWithMatch | null
  onClose: () => void
}

interface FormState {
  homeScore: number
  awayScore: number
  homeScoreEt: number
  awayScoreEt: number
  pkWinnerId: string
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="w-9 h-9 rounded-lg bg-surface-2 border border-border text-text-primary flex items-center justify-center hover:border-primary/50 transition-colors"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus size={14} />
      </button>
      <span className="w-10 text-center text-2xl font-bold tabular-nums text-text-primary">
        {value}
      </span>
      <button
        type="button"
        className="w-9 h-9 rounded-lg bg-surface-2 border border-border text-text-primary flex items-center justify-center hover:border-primary/50 transition-colors"
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export function PredictionModal({ match, existing, onClose }: Props) {
  const { user } = useAuth()
  const invalidate = useInvalidatePredictions()

  const [form, setForm] = useState<FormState>({
    homeScore: 0, awayScore: 0,
    homeScoreEt: 0, awayScoreEt: 0,
    pkWinnerId: '',
  })

  useEffect(() => {
    if (!match) return
    if (existing) {
      setForm({
        homeScore: existing.home_score,
        awayScore: existing.away_score,
        homeScoreEt: existing.home_score_et ?? 0,
        awayScoreEt: existing.away_score_et ?? 0,
        pkWinnerId: existing.predicted_pk_winner_id ?? '',
      })
    } else {
      setForm({ homeScore: 0, awayScore: 0, homeScoreEt: 0, awayScoreEt: 0, pkWinnerId: '' })
    }
  }, [match, existing])

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!user || !match) return
      const isKnockout = match.phase.has_extra_time
      const draw90 = form.homeScore === form.awayScore
      const showEt = isKnockout && draw90
      const drawEt = showEt && form.homeScoreEt === form.awayScoreEt
      const showPk = showEt && drawEt
      const teamsConfirmed = !!(match.home_team && match.away_team)

      if (isKnockout && draw90 && (form.homeScoreEt === undefined)) {
        throw new Error('Ingresá el resultado en tiempo extra')
      }
      if (showPk && teamsConfirmed && !form.pkWinnerId) {
        throw new Error('Seleccioná el ganador en penales')
      }

      // Solo guardar pk winner si es un ID real de equipo (equipos confirmados)
      const pkWinnerId = showPk && teamsConfirmed && form.pkWinnerId ? form.pkWinnerId : null

      await upsertPrediction(user.id, {
        matchId: match.id,
        homeScore: form.homeScore,
        awayScore: form.awayScore,
        homeScoreEt: showEt ? form.homeScoreEt : null,
        awayScoreEt: showEt ? form.awayScoreEt : null,
        predictedPkWinnerId: pkWinnerId,
      })
    },
    onSuccess: () => {
      toast.success('Predicción guardada')
      invalidate()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: async () => {
      if (!existing) return
      await deletePrediction(existing.id)
    },
    onSuccess: () => {
      toast.success('Predicción eliminada')
      invalidate()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!match) return null

  const isKnockout = match.phase.has_extra_time
  const draw90 = form.homeScore === form.awayScore
  const showEt = isKnockout && draw90
  const drawEt = showEt && form.homeScoreEt === form.awayScoreEt
  const showPk = showEt && drawEt

  return (
    <Modal
      open={!!match}
      onClose={onClose}
      title={`Partido #${match.match_number}`}
      size="sm"
    >
      <div className="space-y-5">
        {/* 90 minutos */}
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-wide mb-3 text-center">90 minutos</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamFlag team={match.home_team} slotLabel={match.home_slot_label} size="sm" align="left" />
              <ScoreInput value={form.homeScore} onChange={v => setForm(f => ({ ...f, homeScore: v }))} />
            </div>
            <span className="text-text-muted text-lg font-light mb-1">-</span>
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamFlag team={match.away_team} slotLabel={match.away_slot_label} size="sm" align="right" />
              <ScoreInput value={form.awayScore} onChange={v => setForm(f => ({ ...f, awayScore: v }))} />
            </div>
          </div>
        </div>

        {/* Tiempo extra */}
        {isKnockout && (
          <div className={`transition-opacity ${showEt ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <p className="text-[11px] text-text-muted uppercase tracking-wide mb-3 text-center">
              Tiempo extra {!showEt && '(solo si hay empate a 90)'}
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 flex justify-center">
                <ScoreInput value={form.homeScoreEt} onChange={v => setForm(f => ({ ...f, homeScoreEt: v }))} />
              </div>
              <span className="text-text-muted text-lg font-light">-</span>
              <div className="flex-1 flex justify-center">
                <ScoreInput value={form.awayScoreEt} onChange={v => setForm(f => ({ ...f, awayScoreEt: v }))} />
              </div>
            </div>
          </div>
        )}

        {/* Penales */}
        {isKnockout && (() => {
          const teamsConfirmed = !!(match.home_team && match.away_team)
          const pkCandidates = [
            { id: match.home_team?.id ?? 'home', label: match.home_team?.abbreviation ?? match.home_slot_label ?? 'Local' },
            { id: match.away_team?.id ?? 'away', label: match.away_team?.abbreviation ?? match.away_slot_label ?? 'Visit.' },
          ]
          return (
            <div className={`transition-opacity ${showPk ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <p className="text-[11px] text-text-muted uppercase tracking-wide mb-3 text-center">
                Ganador en penales {!showPk && '(solo si hay empate en ET)'}
              </p>
              {!teamsConfirmed && showPk && (
                <p className="text-[11px] text-text-muted text-center mb-2">
                  Se podrá guardar cuando los equipos sean confirmados
                </p>
              )}
              <div className="flex gap-2">
                {pkCandidates.map(candidate => {
                  const isSelected = form.pkWinnerId === candidate.id
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border bg-surface-2 text-text-secondary hover:border-primary/40'
                      }`}
                      onClick={() => setForm(f => ({ ...f, pkWinnerId: candidate.id }))}
                      disabled={!showPk}
                    >
                      {candidate.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            className="btn-primary flex-1"
            onClick={() => save()}
            disabled={saving || removing}
          >
            {saving ? 'Guardando...' : existing ? 'Actualizar' : 'Guardar'}
          </button>
          {existing && (
            <button
              className="btn-ghost px-3 border border-border text-error hover:bg-error/10"
              onClick={() => remove()}
              disabled={saving || removing}
            >
              {removing ? '...' : 'Borrar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
