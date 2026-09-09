/**
 * Candidatos.gs — equivalente a saveCand/updateCandEstado de actions.js.
 */

function listCandidatosPorBusqueda_(busquedaId) {
  return sheetToObjects_('Candidatos').filter(c => c.busqueda_id === busquedaId);
}

function agregarCandidato_(selector, busquedaId, nombre) {
  assertBusquedaDeSelector_(selector, busquedaId);
  return appendRow_('Candidatos', {
    busqueda_id: busquedaId, nombre, selector, estado: 'Enviado', fecha_envio: todayISO_(),
  });
}

function actualizarEstadoCandidato_(selector, candId, estado) {
  const c = findById_('Candidatos', candId);
  if (!c) throw new Error('Candidato no encontrado');
  assertBusquedaDeSelector_(selector, c.busqueda_id);

  const patch = { estado };
  if (estado === 'Entrevista') patch.fecha_entrevista = c.fecha_entrevista || todayISO_();
  if (estado === 'Rechazado' || estado === 'Baja') patch.fecha_rechazo = todayISO_();
  updateById_('Candidatos', candId, patch);
  return true;
}

function assertBusquedaDeSelector_(selector, busquedaId) {
  const b = findById_('Busquedas', busquedaId);
  if (!b) throw new Error('Búsqueda no encontrada');
  if (b.selector !== selector) throw new Error('Esta búsqueda es de ' + b.selector + ', no tuya');
}
