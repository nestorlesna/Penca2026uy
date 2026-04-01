import { supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BonusConfig {
  bonus_type: string
  points: number
  is_active: boolean
}

export interface BonusPrediction {
  id?: string
  user_id: string
  podio_1st_id:       string | null
  podio_2nd_id:       string | null
  podio_3rd_id:       string | null
  podio_4th_id:       string | null
  empates_grupos:     number | null
  rango_goles:        string | null
  final_cero:         boolean | null
  top_scorer_team_id: string | null
  top_group_id:       string | null
  created_at?: string
  updated_at?: string
}

export interface BonusPoints {
  bonus_type:    string
  points_earned: number
  detail:        Record<string, unknown> | null
  calculated_at: string
}

export interface TeamOption {
  id:           string
  name:         string
  abbreviation: string
  flag_url:     string | null
  group_name:   string
}

export interface GroupOption {
  id:   string
  name: string
}

export const GOAL_RANGES = [
  '1-20','21-40','41-60','61-80','81-100','101-120','121-140','141-160',
  '161-180','181-200','201-220','221-240','241-260','261-280','281-300',
  '301-320','321-340','341+',
] as const

export type GoalRange = typeof GOAL_RANGES[number]

// ── Data fetching ─────────────────────────────────────────────────────────────

export async function fetchBonusConfig(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('bonus_config')
    .select('bonus_type, points')
    .eq('is_active', true)
  if (error) throw error
  return Object.fromEntries((data ?? []).map(r => [r.bonus_type, r.points]))
}

export async function updateBonusConfig(values: Record<string, number>): Promise<void> {
  const rows = Object.entries(values).map(([bonus_type, points]) => ({ bonus_type, points }))
  for (const row of rows) {
    const { error } = await supabase
      .from('bonus_config')
      .update({ points: row.points })
      .eq('bonus_type', row.bonus_type)
      .eq('is_active', true)
    if (error) throw error
  }
}

export async function fetchBonusPrediction(userId: string): Promise<BonusPrediction | null> {
  const { data, error } = await supabase
    .from('bonus_predictions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as BonusPrediction | null
}

export async function fetchBonusPoints(userId: string): Promise<Record<string, BonusPoints>> {
  const { data, error } = await supabase
    .from('bonus_points')
    .select('bonus_type, points_earned, detail, calculated_at')
    .eq('user_id', userId)
  if (error) throw error
  return Object.fromEntries((data ?? []).map(r => [r.bonus_type, r as BonusPoints]))
}

export async function fetchTeamOptions(): Promise<TeamOption[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, abbreviation, flag_url, groups!inner(name)')
    .eq('is_confirmed', true)
    .order('name')
  if (error) throw error
  return (data ?? []).map((t: Record<string, unknown>) => ({
    id:           t.id as string,
    name:         t.name as string,
    abbreviation: t.abbreviation as string,
    flag_url:     t.flag_url as string | null,
    group_name:   (t.groups as { name: string }).name,
  }))
}

export async function fetchGroupOptions(): Promise<GroupOption[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name')
    .order('order')
  if (error) throw error
  return (data ?? []) as GroupOption[]
}

/** Devuelve true si el torneo ya empezó (la fecha del primer partido ya pasó) */
export async function isTournamentStarted(): Promise<boolean> {
  const { data } = await supabase
    .from('matches')
    .select('match_datetime')
    .order('match_datetime', { ascending: true })
    .limit(1)
    .single()
  if (!data?.match_datetime) return false
  return new Date(data.match_datetime) <= new Date()
}

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveBonusPrediction(
  userId: string,
  patch: Partial<Omit<BonusPrediction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<void> {
  const { error } = await supabase
    .from('bonus_predictions')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
  if (error) throw error
}

// ── Trigger bonus calculation (calls DB function) ─────────────────────────────
export async function calculateBonusPoints(): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_bonus_points')
  if (error) throw error
  return data as number
}
