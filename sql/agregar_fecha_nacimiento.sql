-- ══════════════════════════════════════════════════════════════════════════
--  Columna "fecha_nacimiento" en candidatos
-- ──────────────────────────────────────────────────────────────────────────
--  La ficha de Choferes y Ayudantes (render.js) ya tiene el campo "Fecha
--  nacimiento" en pantalla y lo intenta guardar contra la columna
--  "fecha_nacimiento" de la tabla candidatos (actions.js: updateFichaField).
--  Si esa columna no existe, Supabase devuelve error y el campo no se
--  guarda (aparece el toast "Falta la columna fecha_nacimiento...").
--
--  CÓMO EJECUTAR:
--  1. Entrá al proyecto en https://supabase.com/dashboard → tu proyecto →
--     "SQL Editor".
--  2. Pegá y ejecutá este archivo una sola vez.
-- ══════════════════════════════════════════════════════════════════════════

alter table candidatos
    add column if not exists fecha_nacimiento date;
