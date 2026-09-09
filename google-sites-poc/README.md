# Portal de Selección — POC en Google (Sheets + Apps Script + Sites)

Prueba de concepto **separada del panel actual** (Supabase/Vercel no se toca).
Replica las funciones centrales del pipeline: alta y reapertura de búsquedas,
cambio de estado, candidatos, comentarios de seguimiento y PDFs — sin el
diseño visual actual, con la navegación acordada:

- **Vistazo de inicio**: todas las búsquedas, solo lectura, para cualquiera.
- **Un botón por selector** (Silvina, Romina, Claudia, Soledad, Juan Pablo,
  Angel, Noelia, Milagros): cada uno edita únicamente sus propias búsquedas.
  El chequeo se hace en el servidor (`assertBusquedaDeSelector_` en
  `Busquedas.gs`/`Candidatos.gs`), no solo ocultando botones — así dos
  selectores nunca escriben la misma fila por accidente.

No reemplaza la app actual: es la base para probar Fase 1-2 del plan de
migración con una sola pestaña (acá se hizo con `Busquedas` completa) antes
de comprometer las 8 tablas.

## Qué falta a propósito (fuera de este POC)

Verificaciones, psicotécnicos e historial ya tienen su pestaña creada por
`initializePortal()`, pero no tienen pantalla propia todavía — se agregan
con el mismo patrón que `EstadoLog.gs` (leer/agregar por `busqueda_id`).
Tampoco hay login por email todavía: el selector se elige por URL
(`?selector=Romina`), no por quién inició sesión — ver "Siguiente paso" abajo.

## Cómo levantarlo (10-15 min)

1. **Crear el Sheet**: Google Sheets → hoja nueva, nombrala "Portal de
   Selección — Datos".
2. **Abrir el editor**: Extensiones → Apps Script.
3. **Pegar el código**: en el editor, creá un archivo de script por cada
   `.gs` de esta carpeta (`Data`, `Setup`, `Busquedas`, `Candidatos`,
   `EstadoLog`, `Archivos`, `Code`) y un archivo HTML por cada `.html`
   (`Index`, `SelectorView`, `Styles`) — mismo nombre, pegando el contenido
   tal cual. Reemplazá el `appsscript.json` del proyecto por el de acá
   (ícono de engranaje → "Mostrar archivo de manifiesto").
4. **Inicializar las pestañas**: elegí `initializePortal` en el dropdown de
   funciones (arriba) y ejecutá (▶). La primera vez pide autorizar permisos
   (Sheets + Drive) — es tu propio script, es esperable.
5. **Publicar como Web App**: Implementar → Nueva implementación → tipo
   "Aplicación web". "Ejecutar como": tu cuenta. "Quién tiene acceso":
   Cualquier usuario (con cuenta Gmail, ya que no hay Workspace). Copiá la
   URL que te da.
6. **Embeber en Sites**: en la página de Sites, Insertar → Insertar →
   "Por URL", pegá la URL del Web App.

## Si cambiás algo en el código luego de publicar

Apps Script no actualiza el Web App solo: Implementar → Administrar
implementaciones → ✎ en la implementación activa → "Nueva versión" → Implementar.

## Siguiente paso natural

Reemplazar `?selector=Romina` por identificación real: `Session.getActiveUser().getEmail()`
contra la pestaña `Perfiles` (email ↔ selector), para que nadie pueda entrar
al botón de otro cambiando la URL a mano. Requiere que el acceso al Web App
esté restringido a cuentas con sesión iniciada (no "Anyone, anonymous").
