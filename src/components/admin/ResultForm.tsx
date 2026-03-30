import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Modal } from '../ui/Modal'
import { TeamFlag } from '../ui/TeamFlag'
import { setMatchResult, calculateMatchPoints } from '../../services/adminService'
import type { MatchWithRelations } from '../../types/match'

interface Props {
  match: MatchWithRelations | null
  onClose: () => void
}

interface FormState {
  homeScore90: string
  awayScore90: string
  homeScoreEt: string
  awayScoreEt: string
  homeScorePk: string
  awayScorePk: string
}

const empty: FormState = {
  homeScore90: '', awayScore90: '',
  homeScoreEt: '', awayScoreEt: '',
  homeScorePk: '', awayScorePk: '',
}

function numOrNull(v: string): number | null {
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

export function ResultForm({ match, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(empty)

  // Inicializar con valores existentes al abrir
  useEffect(() => {
    if (!match) return
    setForm({
      homeScore90: match.home_score_90 !== null ? String(match.home_score_90) : '',
      awayScore90: match.away_score_90 !== null ? String(match.away_score_90) : '',
      homeScoreEt: match.home_score_et !== null ? String(match.home_score_et) : '',
      awayScoreEt: match.away_score_et !== null ? String(match.away_score_et) : '',
      homeScorePk: match.home_score_pk !== null ? String(match.home_score_pk) : '',
      awayScorePk: match.away_score_pk !== null ? String(match.away_score_pk) : '',
    })
  }, [match])

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!match) return
      const h90 = numOrNull(String(form.homeScore90))
      const a90 = numOrNull(String(form.awayScore90))
      if (h90 === null || a90 === null) throw new Error('Ingresá los goles a 90 min')

      const isKnockout = match.phase.has_extra_time
      const drawAt90 = h90 === a90

      await setMatchResult(match.id, {
        homeScore90: h90,
        awayScore90: a90,
        homeScoreEt: isKnockout && drawAt90 ? numOrNull(String(form.homeScoreEt)) : null,
        awayScoreEt: isKnockout && drawAt90 ? numOrNull(String(form.awayScoreEt)) : null,
        homeScorePk: isKnockout && drawAt90 ? numOrNull(String(form.homeScorePk)) : null,
        awayScorePk: isKnockout && drawAt90 ? numOrNull(String(form.awayScorePk)) : null,
      })

      const count = await calculateMatchPoints(match.id)
      return count
    },
    onSuccess: (count) => {
      toast.success(`Resultado guardado · ${count} predicciones calculadas`)
      qc.invalidateQueries({ queryKey: ['matches'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!match) return null

  const isKnockout = match.phase.has_extra_time
  const h90 = numOrNull(String(form.homeScore90))
  const a90 = numOrNull(String(form.awayScore90))
  const drawAt90 = h90 !== null && a90 !== null && h90 === a90
  const showEt = isKnockout && drawAt90

  const hEt = numOrNull(String(form.homeScoreEt))
  const aEt = numOrNull(String(form.awayScoreEt))
  const drawAtEt = hEt !== null && aEt !== null && hEt === aEt
  const showPk = showEt && drawAtEt

  function set(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  return (
    <Modal open={!!match} onClose={onClose} title={`Partido #${match.match_number}`} size="sm">
      <div className="space-y-5">
        {/* Equipos */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <TeamFlag team={match.home_team} slotLabel={match.home_slot_label} size="sm" align="left" />
          </div>
          <span className="text-text-muted text-sm font-medium">vs</span>
          <div className="flex-1 flex justify-end">
            <TeamFlag team={match.away_team} slotLabel={match.away_slot_label} size="sm" align="right" />
          </div>
        </div>

        {/* 90 minutos */}
        <div>
          <p className="text-[11px] text-text-muted uppercase tracking-wide mb-2">90 minutos</p>
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={99}
              value={form.homeScore90}
              onChange={e => set('homeScore90', e.target.value)}
              className="input w-full text-center text-xl font-bold"
              placeholder="0"
            />
            <span className="text-text-muted font-bold">-</span>
            <input
              type="number" min={0} max={99}
              value={form.awayScore90}
              onChange={e => set('awayScore90', e.target.value)}
              className="input w-full text-center text-xl font-bold"
              placeholder="0"
            />
          </div>
        </div>

        {/* Tiempo extra (solo knockout + empate) */}
        {isKnockout && (
          <div className={showEt ? '' : 'opacity-40 pointer-events-none'}>
            <p className="text-[11px] text-text-muted uppercase tracking-wide mb-2">Tiempo extra</p>
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} max={99}
                value={form.homeScoreEt}
                onChange={e => set('homeScoreEt', e.target.value)}
                className="input w-full text-center text-lg font-bold"
                placeholder="0"
                disabled={!showEt}
              />
              <span className="text-text-muted font-bold">-</span>
              <input
                type="number" min={0} max={99}
                value={form.awayScoreEt}
                onChange={e => set('awayScoreEt', e.target.value)}
                className="input w-full text-center text-lg font-bold"
                placeholder="0"
                disabled={!showEt}
              />
            </div>
          </div>
        )}

        {/* Penales (solo knockout + empate en ET) */}
        {isKnockout && (
          <div className={showPk ? '' : 'opacity-40 pointer-events-none'}>
            <p className="text-[11px] text-text-muted uppercase tracking-wide mb-2">Penales</p>
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} max={99}
                value={form.homeScorePk}
                onChange={e => set('homeScorePk', e.target.value)}
                className="input w-full text-center text-lg font-bold"
                placeholder="0"
                disabled={!showPk}
              />
              <span className="text-text-muted font-bold">-</span>
              <input
                type="number" min={0} max={99}
                value={form.awayScorePk}
                onChange={e => set('awayScorePk', e.target.value)}
                className="input w-full text-center text-lg font-bold"
                placeholder="0"
                disabled={!showPk}
              />
            </div>
          </div>
        )}

        <button
          className="btn-primary w-full"
          onClick={() => mutate()}
          disabled={isPending}
        >
          {isPending ? 'Guardando...' : 'Guardar resultado'}
        </button>
      </div>
    </Modal>
  )
}
