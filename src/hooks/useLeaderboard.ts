import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../services/leaderboardService'

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
    staleTime: 1000 * 60 * 2,
  })
}
