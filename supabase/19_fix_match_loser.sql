-- ============================================================
-- 19_fix_match_loser.sql
-- ============================================================
-- FIX: populate_knockout_matches() rellenaba prematuramente el
-- partido del 3er puesto (M103) cuando la semifinal fuente (M101/M102)
-- ya tenía equipos asignados pero AÚN NO se había jugado.
--
-- Causa: en la rama 'match_loser', la condición
--   WHEN winner_team_id = home_team_id THEN away_team_id ELSE home_team_id
-- caía al ELSE cuando winner_team_id IS NULL (semi sin jugar),
-- devolviendo home_team_id como si fuera el "perdedor". Así M103 se
-- poblaba con el LOCAL de la semi en lugar de quedar vacío hasta
-- conocer al perdedor real.
--
-- Solución: agregar el caso explícito winner_team_id IS NULL -> NULL,
-- de modo que el perdedor quede sin resolver (y el guard
-- IF v_team_id IS NOT NULL deje el slot vacío), igual que hace
-- 'match_winner' para la final (M104).
--
-- Ejecutar DESPUÉS de 16_rpc_authorization.sql (versión vigente).
-- Reemplaza la función completa (CREATE OR REPLACE), idéntica a la de
-- 16 salvo la rama 'match_loser' corregida.
-- ============================================================

CREATE OR REPLACE FUNCTION populate_knockout_matches()
RETURNS INTEGER AS $$
DECLARE
  v_rule       knockout_slot_rules%ROWTYPE;
  v_team_id    UUID;
  v_count      INTEGER := 0;
  v_comb_key   TEXT;
  v_home_group TEXT;
  v_rival_col  TEXT;
BEGIN
  PERFORM assert_admin_or_loader();

  -- Paso 1: Calcular clave de combinación (8 letras ordenadas de los mejores terceros)
  SELECT STRING_AGG(g.name, '' ORDER BY g.name)
  INTO v_comb_key
  FROM (
    SELECT btr.group_id
    FROM best_third_ranking btr
    ORDER BY btr.rank
    LIMIT 8
  ) top8
  JOIN groups g ON g.id = top8.group_id;

  FOR v_rule IN SELECT * FROM knockout_slot_rules ORDER BY match_id, slot LOOP
    v_team_id := NULL;

    IF v_rule.rule_type = 'group_position' THEN
      SELECT gs.team_id INTO v_team_id
      FROM group_standings gs
      WHERE gs.group_id = v_rule.source_group_id
        AND gs.position  = v_rule.position
      LIMIT 1;

    ELSIF v_rule.rule_type = 'best_third' THEN
      IF v_comb_key IS NOT NULL AND LENGTH(v_comb_key) = 8 THEN
        SELECT g.name INTO v_home_group
        FROM knockout_slot_rules ksr
        JOIN groups g ON g.id = ksr.source_group_id
        WHERE ksr.match_id = v_rule.match_id
          AND ksr.slot = 'home'
          AND ksr.rule_type = 'group_position'
        LIMIT 1;

        SELECT CASE v_home_group
          WHEN 'A' THEN c.rival_1a
          WHEN 'B' THEN c.rival_1b
          WHEN 'D' THEN c.rival_1d
          WHEN 'E' THEN c.rival_1e
          WHEN 'G' THEN c.rival_1g
          WHEN 'I' THEN c.rival_1i
          WHEN 'K' THEN c.rival_1k
          WHEN 'L' THEN c.rival_1l
          ELSE NULL
        END INTO v_rival_col
        FROM combinaciones c
        WHERE c.combinacion = v_comb_key;

        IF v_rival_col IS NOT NULL THEN
          SELECT gs.team_id INTO v_team_id
          FROM group_standings gs
          JOIN groups g ON g.id = gs.group_id
          WHERE g.name = SUBSTRING(v_rival_col FROM 2)
            AND gs.position = 3
          LIMIT 1;
        END IF;
      END IF;

    ELSIF v_rule.rule_type = 'match_winner' THEN
      SELECT winner_team_id INTO v_team_id
      FROM matches WHERE id = v_rule.source_match_id;

    ELSIF v_rule.rule_type = 'match_loser' THEN
      SELECT CASE
        WHEN winner_team_id IS NULL THEN NULL      -- semi sin jugar: perdedor aún desconocido
        WHEN winner_team_id = home_team_id THEN away_team_id
        ELSE home_team_id
      END INTO v_team_id
      FROM matches WHERE id = v_rule.source_match_id;
    END IF;

    IF v_team_id IS NOT NULL THEN
      IF v_rule.slot = 'home' THEN
        UPDATE matches SET home_team_id = v_team_id WHERE id = v_rule.match_id;
      ELSE
        UPDATE matches SET away_team_id = v_team_id WHERE id = v_rule.match_id;
      END IF;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Defensa en profundidad (coherente con 17_rpc_revoke.sql)
REVOKE EXECUTE ON FUNCTION public.populate_knockout_matches() FROM anon, public;
