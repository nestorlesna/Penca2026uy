-- ============================================================
-- 11_LOADER_ROLE.SQL — Rol "Cargador"
-- Agrega el rol is_loader a profiles y actualiza la RLS de
-- matches para permitir que los cargadores carguen resultados.
-- Ejecutar DESPUÉS de 02_auth_rls.sql
-- ============================================================

-- ── Columna en profiles ───────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_loader BOOLEAN NOT NULL DEFAULT false;

-- ── RLS: matches UPDATE ───────────────────────────────────────────────────────
-- Reemplaza la política admin-only de UPDATE por una que admite
-- también a usuarios con is_loader = true.

DROP POLICY IF EXISTS "Admin can update matches" ON matches;

CREATE POLICY "Admin or loader can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (is_admin = true OR is_loader = true)
    )
  );
