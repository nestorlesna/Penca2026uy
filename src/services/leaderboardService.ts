import { supabase } from '../lib/supabase'
import type { LeaderboardEntry } from '../types'

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank')
  if (error) throw error
  return (data ?? []) as LeaderboardEntry[]
}
