-- ══════════════════════════════════════════════════════════════════════════
--  Resumen liviano para Estadísticas / Gráficos / Análisis / Informe
-- ──────────────────────────────────────────────────────────────────────────
--  El Pipeline ahora carga solo las búsquedas activas y las de los últimos
--  meses (vista liviana). Para que los paneles generales sigan mostrando el
--  TOTAL histórico sin bajar todas las tablas relacionadas, esta función
--  devuelve todas las búsquedas con solo los campos que usan esos paneles:
--    - columnas de la búsqueda (sin tablas anidadas pesadas)
--    - candidatos: id, estado, fecha_envio, demora_descuento_dias
--    - psicotécnicos: id, selector_psico, resultado
--  Todo en UNA respuesta JSON (no aplica el tope de 1000 filas de Supabase).
--
--  Además crea índices en las columnas busqueda_id: Postgres no los crea solo
--  para las claves foráneas, y sin ellos cada consulta anidada recorre la
--  tabla entera (causa probable de los timeouts al cargar).
--
--  CÓMO EJECUTAR:
--  1. Supabase → tu proyecto → "SQL Editor".
--  2. Pegá y ejecutá TODO este archivo (se puede volver a correr sin problema).
--  3. Probar:  select jsonb_array_length(busquedas_resumen());
--
--  La función es SECURITY INVOKER: respeta las mismas policies (RLS) que ya
--  tienen las tablas, no abre datos a nadie que antes no los viera.
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Índices en las claves foráneas (no hacen nada si ya existen)
create index if not exists idx_candidatos_busqueda_id     on candidatos(busqueda_id);
create index if not exists idx_estado_log_busqueda_id     on estado_log(busqueda_id);
create index if not exists idx_psicotecnicos_busqueda_id  on psicotecnicos(busqueda_id);
create index if not exists idx_verificaciones_busqueda_id on verificaciones(busqueda_id);
create index if not exists idx_archivos_busqueda_id       on archivos(busqueda_id);
create index if not exists idx_historial_busqueda_id      on historial(busqueda_id);
-- Para el filtro de la vista liviana (status Proceso/Pausada o inicio reciente)
create index if not exists idx_busquedas_status           on busquedas(status);
create index if not exists idx_busquedas_inicio           on busquedas(inicio);

-- 2) Función de resumen
--    to_jsonb(...) -> 'columna' devuelve null si la columna no existe, así no
--    falla si alguna columna opcional (ej. demora_descuento_dias) no se creó.
create or replace function busquedas_resumen()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
    select coalesce(jsonb_agg(fila order by (fila->>'id')::bigint desc), '[]'::jsonb)
    from (
        select to_jsonb(b)
            || jsonb_build_object(
                'candidatos', coalesce((
                    select jsonb_agg(jsonb_build_object(
                        'id',                    c.id,
                        'estado',                c.estado,
                        'fecha_envio',           c.fecha_envio,
                        'demora_descuento_dias', to_jsonb(c) -> 'demora_descuento_dias'
                    ))
                    from candidatos c
                    where c.busqueda_id = b.id
                ), '[]'::jsonb),
                'psicotecnicos', coalesce((
                    select jsonb_agg(jsonb_build_object(
                        'id',             p.id,
                        'selector_psico', to_jsonb(p) -> 'selector_psico',
                        'resultado',      p.resultado
                    ))
                    from psicotecnicos p
                    where p.busqueda_id = b.id
                ), '[]'::jsonb)
            ) as fila
        from busquedas b
    ) t
$$;

grant execute on function busquedas_resumen() to authenticated;
