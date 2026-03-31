import { supabase } from '../lib/supabase'

export interface MatchResultInput {
  homeScore90: number
  awayScore90: number
  homeScoreEt?: number | null
  awayScoreEt?: number | null
  homeScorePk?: number | null
  awayScorePk?: number | null
}

export async function setMatchResult(matchId: string, result: MatchResultInput) {
  const { error } = await supabase
    .from('matches')
    .update({
      status: 'finished',
      home_score_90: result.homeScore90,
      away_score_90: result.awayScore90,
      home_score_et: result.homeScoreEt ?? null,
      away_score_et: result.awayScoreEt ?? null,
      home_score_pk: result.homeScorePk ?? null,
      away_score_pk: result.awayScorePk ?? null,
    })
    .eq('id', matchId)
  if (error) throw error
}

export async function setMatchStatus(matchId: string, status: 'scheduled' | 'live' | 'finished') {
  const { error } = await supabase.from('matches').update({ status }).eq('id', matchId)
  if (error) throw error
}

export async function calculateMatchPoints(matchId: string): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_match_points', { p_match_id: matchId })
  if (error) throw error
  // También recalcula bonus (idempotente — verifica condiciones internamente)
  await supabase.rpc('calculate_bonus_points').throwOnError()
  return data as number
}

export async function populateKnockoutMatches(): Promise<number> {
  const { data, error } = await supabase.rpc('populate_knockout_matches')
  if (error) throw error
  return data as number
}

export async function fetchScoringConfig() {
  const { data, error } = await supabase
    .from('scoring_config')
    .select('*')
    .order('is_active', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateScoringConfig(id: string, values: Record<string, number>) {
  const { error } = await supabase.from('scoring_config').update(values).eq('id', id)
  if (error) throw error
}
