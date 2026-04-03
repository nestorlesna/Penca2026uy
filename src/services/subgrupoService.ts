import { supabase } from '../lib/supabase'
import type { Subgrupo, SubgrupoRankingEntry } from '../types'

export async function fetchMySubgrupos(userId: string): Promise<Subgrupo[]> {
  const { data, error } = await supabase
    .from('subgrupo_members')
    .select('subgrupos(id, name, creator_id, is_active, created_at)')
    .eq('user_id', userId)
  if (error) throw error
  const subgrupos = (data ?? []).map((d: any) => d.subgrupos) as Subgrupo[]
  return subgrupos.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchSubgrupoDetail(id: string): Promise<Subgrupo | null> {
  const { data, error } = await supabase
    .from('subgrupos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Subgrupo
}

export async function fetchSubgrupoRanking(subgrupoId: string): Promise<SubgrupoRankingEntry[]> {
  const { data, error } = await supabase
    .from('subgrupo_ranking')
    .select('*')
    .eq('subgrupo_id', subgrupoId)
    .order('subgrupo_rank')
  if (error) throw error
  return (data ?? []) as SubgrupoRankingEntry[]
}

export async function fetchSubgrupoMembers(subgrupoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('subgrupo_members')
    .select('user_id')
    .eq('subgrupo_id', subgrupoId)
  if (error) throw error
  return (data ?? []).map((d: any) => d.user_id) as string[]
}

export async function fetchAllProfiles(): Promise<{ id: string; username: string; display_name: string; avatar_url: string | null }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('is_active', true)
    .order('display_name')
  if (error) throw error
  return data ?? []
}

export async function createSubgrupo(name: string, creatorId: string): Promise<Subgrupo> {
  const { data, error } = await supabase.rpc('create_subgrupo_with_creator', {
    p_name: name,
    p_creator_id: creatorId,
  })
  if (error) throw error
  return data as Subgrupo
}

export async function addMemberToSubgrupo(subgrupoId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('subgrupo_members')
    .insert({ subgrupo_id: subgrupoId, user_id: userId })
  if (error) throw error
}

export async function leaveSubgrupo(subgrupoId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('subgrupo_members')
    .delete()
    .match({ subgrupo_id: subgrupoId, user_id: userId })
  if (error) throw error
}

export async function removeMemberFromSubgrupo(subgrupoId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('subgrupo_members')
    .delete()
    .match({ subgrupo_id: subgrupoId, user_id: userId })
  if (error) throw error
}

export async function deleteSubgrupo(id: string): Promise<void> {
  const { error } = await supabase
    .from('subgrupos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function toggleSubgrupoActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('subgrupos')
    .update({ is_active })
    .eq('id', id)
  if (error) throw error
}

export async function fetchAllSubgrupos(): Promise<(Subgrupo & { member_count: number })[]> {
  const { data, error } = await supabase
    .from('subgrupos')
    .select('*, subgrupo_members(count)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    creator_id: d.creator_id,
    is_active: d.is_active,
    created_at: d.created_at,
    member_count: d.subgrupo_members?.[0]?.count ?? 0,
  }))
}

export async function getUserSubgrupoCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('subgrupos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId)
  if (error) throw error
  return count ?? 0
}
