import { useQuery } from '@tanstack/react-query'
import { fetchUserPredictions } from '../services/predictionService'
import { fetchBonusPoints } from '../services/bonusService'

/**
 * Predicciones de un usuario cualquiera.
 * RLS solo devuelve predicciones de partidos ya comenzados (match_datetime <= now()),
 * por lo que nunca expone apuestas de partidos futuros.
 */
export function useUserPredictions(userId?: string) {
  return useQuery({
    queryKey: ['user-predictions', userId],
    queryFn: () => fetchUserPredictions(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Puntos de +Punto (bonus) de un usuario cualquiera.
 * Requiere la policy bonus_pts_active_read (18_bonus_points_read.sql).
 */
export function useUserBonusPoints(userId?: string) {
  return useQuery({
    queryKey: ['user-bonus-points', userId],
    queryFn: () => fetchBonusPoints(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}
