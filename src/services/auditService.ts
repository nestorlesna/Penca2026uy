import { supabase } from '../lib/supabase'

export interface AuditFilters {
  userId?: string
  matchNumber?: number
  action?: 'INSERT' | 'UPDATE' | 'DELETE'
  fromDate?: string   // ISO date string YYYY-MM-DD
  toDate?: string     // ISO date string YYYY-MM-DD
  page?: number
  pageSize?: number
}

export interface AuditEntry {
  id: string
  changed_at: string        // UTC ISO — hora del servidor
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  user: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
  match: {
    id: string
    match_number: number
    match_datetime: string
    home_slot_label: string | null
    away_slot_label: string | null
    home_team: { id: string; name: string; abbreviation: string } | null
    away_team: { id: string; name: string; abbreviation: string } | null
    group:  { name: string } | null
    phase:  { name: string; order: number }
  }
  old_home_score:    number | null
  old_away_score:    number | null
  old_home_score_et: number | null
  old_away_score_et: number | null
  old_pk_winner:     { id: string; name: string; abbreviation: string } | null
  new_home_score:    number | null
  new_away_score:    number | null
  new_home_score_et: number | null
  new_away_score_et: number | null
  new_pk_winner:     { id: string; name: string; abbreviation: string } | null
}

const AUDIT_SELECT = `
  id, changed_at, action,
  user:profiles!user_id(id, username, display_name, avatar_url),
  match:matches!match_id(
    id, match_number, match_datetime,
    home_slot_label, away_slot_label,
    home_team:teams!home_team_id(id, name, abbreviation),
    away_team:teams!away_team_id(id, name, abbreviation),
    group:groups(name),
    phase:phases(name, order)
  ),
  old_home_score, old_away_score, old_home_score_et, old_away_score_et,
  old_pk_winner:teams!old_pk_winner_id(id, name, abbreviation),
  new_home_score, new_away_score, new_home_score_et, new_away_score_et,
  new_pk_winner:teams!new_pk_winner_id(id, name, abbreviation)
` as const

export async function fetchAuditLog(filters: AuditFilters = {}): Promise<{
  data: AuditEntry[]
  count: number
}> {
  const page     = filters.page     ?? 0
  const pageSize = filters.pageSize ?? 50
  const from     = page * pageSize
  const to       = from + pageSize - 1

  let query = supabase
    .from('predictions_audit')
    .select(AUDIT_SELECT, { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range(from, to)

  if (filters.userId)  query = query.eq('user_id', filters.userId)
  if (filters.action)  query = query.eq('action', filters.action)

  if (filters.fromDate) {
    query = query.gte('changed_at', `${filters.fromDate}T00:00:00Z`)
  }
  if (filters.toDate) {
    query = query.lte('changed_at', `${filters.toDate}T23:59:59Z`)
  }

  // Filtrar por match_number requiere resolver el match_id primero
  if (filters.matchNumber) {
    const { data: m } = await supabase
      .from('matches')
      .select('id')
      .eq('match_number', filters.matchNumber)
      .single()
    if (m) {
      query = query.eq('match_id', (m as { id: string }).id)
    } else {
      return { data: [], count: 0 }
    }
  }

  const { data, error, count } = await query
  if (error) throw error
  return {
    data: (data ?? []) as unknown as AuditEntry[],
    count: count ?? 0,
  }
}

export async function fetchAuditUsers(): Promise<{ id: string; username: string; display_name: string }[]> {
  // Trae solo los usuarios que tienen al menos un registro de audit
  const { data, error } = await supabase
    .from('predictions_audit')
    .select('user:profiles!user_id(id, username, display_name)')
  if (error) throw error
  // Deduplica por user.id
  const seen = new Set<string>()
  const users: { id: string; username: string; display_name: string }[] = []
  for (const row of (data ?? []) as unknown as { user: { id: string; username: string; display_name: string } }[]) {
    if (row.user && !seen.has(row.user.id)) {
      seen.add(row.user.id)
      users.push(row.user)
    }
  }
  return users.sort((a, b) => a.display_name.localeCompare(b.display_name))
}
