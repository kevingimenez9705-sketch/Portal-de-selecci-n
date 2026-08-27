-- ══════════════════════════════════════════════════════════════════════════
--  Finalización automática por 90 días hábiles trabajados
-- ──────────────────────────────────────────────────────────────────────────
--  Hasta ahora, el pasaje de "Cerrada" a "Finalizada" a los 90 días hábiles
--  solo ocurría del lado del cliente (checkAndFinalizeSearches() en core.js),
--  y por lo tanto dependía de que alguien tuviera la app abierta o guardara
--  algo para que el chequeo corriera. Este script lo mueve a la base con
--  pg_cron, para que corra SOLO, todos los días, sin depender del panel.
--
--  Reproduce exactamente la misma regla que usa el frontend
--  (workingDaysDiff en core.js): días hábiles (lun-vie) transcurridos desde
--  el día siguiente a "ingreso" hasta "fecha_baja" (si la hay) o hasta hoy.
--
--  CÓMO EJECUTAR:
--  1. Entrá al proyecto en https://supabase.com/dashboard → tu proyecto
--     (nhlkndwwsuybnejbyigk) → "SQL Editor".
--  2. Pegá y ejecutá TODO este archivo una sola vez.
--  3. Con eso: (a) se crea la función de días hábiles, (b) se hace un
--     backfill inmediato de todo lo que YA pasó los 90 días hábiles, y
--     (c) queda programado un job diario que repite el chequeo solo.
--  4. Para confirmar que el job quedó activo: SELECT * FROM cron.job;
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Habilitar pg_cron (una sola vez por proyecto; no hace nada si ya está)
create extension if not exists pg_cron;

-- 2) Función de días hábiles entre dos fechas — mismo criterio que
--    workingDaysDiff() en core.js: cuenta lun-vie desde (d_from, d_to].
create or replace function business_days_diff(d_from date, d_to date)
returns integer
language sql
immutable
as $$
    select case
        when d_to is null or d_from is null or d_to <= d_from then 0
        else (
            select count(*)::int
            from generate_series(d_from + 1, d_to, interval '1 day') as gs
            where extract(isodow from gs) < 6  -- 1=lunes … 5=viernes, 6=sábado, 7=domingo
        )
    end
$$;

-- 3) Backfill: marca ya mismo como "Finalizada" todo lo que corresponde
--    (mismo criterio que checkAndFinalizeSearches en core.js).
update busquedas
set status = 'Finalizada'
where status = 'Cerrada'
  and ingreso is not null
  and business_days_diff(ingreso, coalesce(fecha_baja, current_date)) >= 90;

-- 4) Job diario: repite el chequeo todos los días a las 06:00 UTC
--    (ajustar la hora si se prefiere otro horario — formato cron estándar).
select cron.schedule(
    'finalizar-90-dias-habiles',
    '0 6 * * *',
    $cron$
    update busquedas
    set status = 'Finalizada'
    where status = 'Cerrada'
      and ingreso is not null
      and business_days_diff(ingreso, coalesce(fecha_baja, current_date)) >= 90;
    $cron$
);

-- Para desactivar el job más adelante, si hiciera falta:
--   select cron.unschedule('finalizar-90-dias-habiles');
