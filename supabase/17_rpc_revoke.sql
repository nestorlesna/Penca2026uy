-- ============================================================
-- 17_RPC_REVOKE.SQL — PencaLes 2026
-- Defensa en profundidad (Capa 1) sobre las RPCs que mutan datos.
--
-- 16_rpc_authorization.sql ya añadió el guard interno
-- (assert_admin_or_loader) a estas funciones, por lo que un anónimo
-- recibe 'Access denied'. Este script agrega la capa de permisos de
-- PostgreSQL: revoca EXECUTE a anon/authenticated/PUBLIC para que ni
-- siquiera puedan entrar al cuerpo de la función (corta el vector de
-- DoS por invocación repetida antes de que corra cualquier lógica).
--
-- El flujo legítimo de carga de resultados se ejecuta desde el cliente
-- con la sesión del admin/cargador, así que las RPCs invocadas por la
-- UI (calculate_match_points, populate_knockout_matches,
-- calculate_bonus_points, recalculate_all) NO se revocan a
-- authenticated: el guard interno ya filtra por rol. Solo se revoca a
-- anon y PUBLIC.
--
-- admin_get_user_details / admin_get_group_predictions ya filtran por
-- admin internamente; se les revoca anon igualmente.
--
-- Idempotente. Ejecutar DESPUÉS de 16_rpc_authorization.sql.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.recalculate_all()           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.populate_knockout_matches() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.calculate_bonus_points()    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.calculate_match_points(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_group_predictions() FROM anon, public;

-- El helper de autorización no debe ser invocable directamente por nadie
-- salvo las funciones SECURITY DEFINER que lo usan internamente.
REVOKE EXECUTE ON FUNCTION public.assert_admin_or_loader()    FROM anon, authenticated, public;

-- authenticated conserva EXECUTE en las RPCs del flujo de carga porque
-- el guard interno (assert_admin_or_loader) ya rechaza a quien no sea
-- admin/cargador. Si se prefiere cortar también a authenticated y mover
-- todo el flujo a un backend con service_role, descomentar:
-- REVOKE EXECUTE ON FUNCTION public.recalculate_all()           FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.populate_knockout_matches() FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.calculate_bonus_points()    FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.calculate_match_points(uuid) FROM authenticated;
