/**
 * EstadoLog.gs — comentarios de seguimiento por búsqueda (equivalente a
 * addEstadoEntry en actions.js).
 */

function listComentarios_(busquedaId) {
  return sheetToObjects_('EstadoLog')
    .filter(e => e.busqueda_id === busquedaId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function agregarComentario_(selector, busquedaId, texto) {
  assertBusquedaDeSelector_(selector, busquedaId);
  if (!texto || !texto.trim()) throw new Error('El comentario no puede estar vacío');
  return appendRow_('EstadoLog', { busqueda_id: busquedaId, texto: texto.trim(), fecha: todayISO_() });
}
