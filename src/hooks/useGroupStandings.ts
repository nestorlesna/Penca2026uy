import { useQuery } from '@tanstack/react-query'
import { fetchGroupStandings, fetchGroups } from '../services/groupService'

export function useGroupStandings(groupName?: string) {
  return useQuery({
    queryKey: ['group_standings', groupName],
    queryFn: () => fetchGroupStandings(groupName),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    staleTime: Infinity,
  })
}
