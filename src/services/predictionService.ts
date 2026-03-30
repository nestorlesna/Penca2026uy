import { supabase } from '../lib/supabase'

export interface PredictionInput {
  matchId: string
  homeScore: number
  awayScore: number
  homeScoreEt?: number | null
  awayScoreEt?: number | null
  predictedPkWinnerId?: string | null
}

const PREDICTION_SELECT = `
  id, match_id, home_score, away_score,
  home_score_et, away_score_et,
  predicted_pk_winner_id, points_earned,
  created_at, updated_at,
  match:matches(
    id, match_number, match_datetime, status,
    home_score_90, away_score_90,
    home_score_et, away_score_et,
    home_score_pk, away_score_pk,
    winner_team_id,
    home_slot_label, away_slot_label,
    phase:phases(id, name, order, has_extra_time, has_penalties),
    group:groups(id, name),
    stadium:stadiums(name, city),
    home_team:teams!home_team_id(id, name, abbreviation, flag_url, is_confirmed, placeholder_name),
    away_team:teams!away_team_id(id, name, abbreviation, flag_url, is_confirmed, placeholder_name)
  )
` as const

export async function upsertPrediction(userId: string, input: PredictionInput) {
  const { error } = await supabase.from('predictions').upsert(
    {
      user_id: userId,
      match_id: input.matchId,
      home_score: input.homeScore,
      away_score: input.awayScore,
      home_score_et: input.homeScoreEt ?? null,
      away_score_et: input.awayScoreEt ?? null,
      predicted_pk_winner_id: input.predictedPkWinnerId ?? null,
    },
    { onConflict: 'user_id,match_id' }
  )
  if (error) throw error
}

export async function deletePrediction(predictionId: string) {
  const { error } = await supabase.from('predictions').delete().eq('id', predictionId)
  if (error) throw error
}

export async function fetchUserPredictions(userId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select(PREDICTION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as PredictionWithMatch[]
}

export async function fetchUserPredictionsMap(userId: string): Promise<Map<string, PredictionWithMatch>> {
  const preds = await fetchUserPredictions(userId)
  return new Map(preds.map(p => [p.match_id, p]))
}

// Tipo enriquecido
export interface PredictionWithMatch {
  id: string
  match_id: string
  home_score: number
  away_score: number
  home_score_et: number | null
  away_score_et: number | null
  predicted_pk_winner_id: string | null
  points_earned: number | null
  created_at: string
  updated_at: string
  match: {
    id: string
    match_number: number
    match_datetime: string
    status: 'scheduled' | 'live' | 'finished'
    home_score_90: number | null
    away_score_90: number | null
    home_score_et: number | null
    away_score_et: number | null
    home_score_pk: number | null
    away_score_pk: number | null
    winner_team_id: string | null
    home_slot_label: string | null
    away_slot_label: string | null
    phase: { id: string; name: string; order: number; has_extra_time: boolean; has_penalties: boolean }
    group: { id: string; name: string } | null
    stadium: { name: string; city: string }
    home_team: { id: string; name: string; abbreviation: string; flag_url: string | null; is_confirmed: boolean; placeholder_name: string | null } | null
    away_team: { id: string; name: string; abbreviation: string; flag_url: string | null; is_confirmed: boolean; placeholder_name: string | null } | null
  }
}
