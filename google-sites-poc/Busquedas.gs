/**
 * Busquedas.gs — equivalente a las funciones de actions.js que tocan `busquedas`.
 * Toda escritura acá pasa por updateById_/appendRow_, que ya validan el selector
 * server-side (ver Code.gs) — el botón de cada selector no es solo un filtro visual.
 */

function listBusquedas_() {
  return sheetToObjects_('Busquedas');
}

function listBusquedasPorSelector_(selector) {
  return listBusquedas_().filter(b => b.selector === selector);
}

/** Para el vistazo de inicio: agrega días hábiles abiertos y alertas, sin exponer edición. */
function vistazoBusquedas_() {
  const hoy = todayISO_();
  return listBusquedas_().map(b => {
    const abierta = b.status !== 'Cerrada' && b.status !== 'Finalizada';
    const diasAbierta = b.inicio ? workingDaysDiff_(fmtDate_(b.inicio), hoy) : 0;
    const diasSector = b.enviado_sector && !b.decision_sector
      ? workingDaysDiff_(fmtDate_(b.enviado_sector), hoy)
      : 0;
    return {
      id: b.id, numero: b.numero, puesto: b.puesto, selector: b.selector,
      nivel: b.nivel, status: b.status, diasAbierta,
      alerta: abierta && diasSector >= 3,
    };
  }).sort((a, b) => (a.selector || '').localeCompare(b.selector || ''));
}

function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function nextNumero_() {
  const existentes = listBusquedas_().map(b => Number(b.numero) || 0);
  return existentes.length ? Math.max(...existentes) + 1 : 1;
}

/** Alta de una búsqueda nueva. `selector` viene del selector logueado, no del formulario. */
function crearBusqueda_(selector, data) {
  data.numero = nextNumero_();
  data.selector = selector;
  data.status = 'Proceso';
  data.inicio = data.inicio || todayISO_();
  const nueva = appendRow_('Busquedas', data);
  appendRow_('Historial', { busqueda_id: nueva.id, texto: 'Apertura de vacante', fecha: todayISO_() });
  return nueva;
}

/**
 * Cambia un campo de una búsqueda — SOLO si pertenece al selector que pide el cambio.
 * Este chequeo es la parte que de verdad reemplaza a las policies de Supabase.
 */
function actualizarCampoBusqueda_(selector, id, campo, valor) {
  const b = findById_('Busquedas', id);
  if (!b) throw new Error('Búsqueda no encontrada');
  if (b.selector !== selector) throw new Error('Esta búsqueda es de ' + b.selector + ', no tuya');
  const patch = {};
  patch[campo] = valor;
  if (campo === 'ingreso' && valor) patch.status = 'Cerrada';
  updateById_('Busquedas', id, patch);
  return true;
}

/** Reabre una búsqueda cerrada como una fila nueva (igual que reabrir() en actions.js). */
function reabrirBusqueda_(selector, id) {
  const orig = findById_('Busquedas', id);
  if (!orig) throw new Error('Búsqueda no encontrada');
  if (orig.selector !== selector) throw new Error('Esta búsqueda es de ' + orig.selector + ', no tuya');

  const nueva = appendRow_('Busquedas', {
    numero: nextNumero_(), puesto: orig.puesto, selector: orig.selector, depto: orig.depto,
    sector: orig.sector, tipo: orig.tipo, motivo: orig.motivo, nivel: orig.nivel, sueldo: orig.sueldo,
    jornada: orig.jornada, ubicacion: orig.ubicacion, inicio: todayISO_(), status: 'Proceso',
    categoria: orig.categoria || '', herramientas: orig.herramientas || '', reopened_from: orig.numero,
  });
  appendRow_('EstadoLog', { busqueda_id: nueva.id, texto: 'Reabierta desde búsqueda #' + orig.numero, fecha: todayISO_() });
  return nueva;
}
