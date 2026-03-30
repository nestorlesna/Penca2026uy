import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUserPredictions, fetchUserPredictionsMap } from '../services/predictionService'
import { useAuth } from './useAuth'

export function useMyPredictions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['predictions', user?.id],
    queryFn: () => fetchUserPredictions(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  })
}

export function useMyPredictionsMap() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['predictions_map', user?.id],
    queryFn: () => fetchUserPredictionsMap(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  })
}

export function useInvalidatePredictions() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return () => {
    qc.invalidateQueries({ queryKey: ['predictions', user?.id] })
    qc.invalidateQueries({ queryKey: ['predictions_map', user?.id] })
  }
}
