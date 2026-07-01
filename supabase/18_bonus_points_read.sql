-- 18_bonus_points_read.sql
-- Permite que cualquier usuario activo lea los bonus_points de todos los usuarios,
-- para poder mostrar el detalle de +Punto de otro usuario desde el ranking.
--
-- Seguridad: una fila en bonus_points solo existe cuando el bonus ya fue calculado
-- (fin de fase de grupos o fin del torneo), por lo que su mera existencia implica
-- que el evento ya ocurrió. No expone apuestas "en vivo".
-- Esto refleja el mismo criterio que predictions_select (públicas tras iniciar el partido).
--
-- Las políticas SELECT permisivas se combinan con OR: esta se suma a bonus_pts_own_read.

DROP POLICY IF EXISTS "bonus_pts_active_read" ON bonus_points;
CREATE POLICY "bonus_pts_active_read" ON bonus_points FOR SELECT
  USING (is_active_user());
