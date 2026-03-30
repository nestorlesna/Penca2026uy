import { supabase } from '../lib/supabase'
import type { GroupStanding } from '../types'

export async function fetchGroupStandings(groupName?: string): Promise<GroupStanding[]> {
  let query = supabase
    .from('group_standings')
    .select('*')
    .order('group_order')
    .order('position')

  if (groupName) {
    query = query.eq('group_name', groupName)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as GroupStanding[]
}

export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('order')
  if (error) throw error
  return data ?? []
}
