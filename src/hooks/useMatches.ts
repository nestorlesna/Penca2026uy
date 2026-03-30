import { useQuery } from '@tanstack/react-query'
import { fetchMatches, fetchMatchByNumber } from '../services/matchService'

export function useMatches(filters?: { phaseOrder?: number; groupName?: string }) {
  return useQuery({
    queryKey: ['matches', filters],
    queryFn: () => fetchMatches(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useMatch(matchNumber: number) {
  return useQuery({
    queryKey: ['match', matchNumber],
    queryFn: () => fetchMatchByNumber(matchNumber),
    enabled: matchNumber > 0,
  })
}
