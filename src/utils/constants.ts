export const PHASE_NAMES: Record<number, string> = {
  1: 'Fase de Grupos',
  2: 'Dieciseisavos',
  3: 'Octavos de Final',
  4: 'Cuartos de Final',
  5: 'Semifinales',
  6: 'Tercer Puesto',
  7: 'Final',
}

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export const COUNTRIES = ['Estados Unidos', 'México', 'Canadá']

export const DEFAULT_SCORING: Record<string, number> = {
  exact_score_points: 3,
  correct_winner_points: 1,
  correct_draw_points: 1,
  knockout_exact_score_bonus: 2,
  correct_et_result_points: 1,
  correct_pk_winner_points: 1,
}
