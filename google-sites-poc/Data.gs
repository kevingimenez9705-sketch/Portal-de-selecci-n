/**
 * Data.gs — capa genérica de acceso a las pestañas del Sheet.
 * Reemplaza al cliente de Supabase (data.js/sb.from(...)) de la versión web.
 * Cada pestaña se trata como una "tabla": fila 1 = encabezados = nombres de columna.
 */

const SELECTORES = ['Silvina', 'Romina', 'Claudia', 'Soledad', 'Juan Pablo', 'Angel', 'Noelia', 'Milagros'];

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Falta la pestaña "' + name + '" — corré initializePortal() desde Setup.gs primero.');
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

/** Lee toda la pestaña como array de objetos {columna: valor}. */
function sheetToObjects_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[r][i]; });
    obj._row = r + 1; // fila real en el sheet, 1-indexed — útil para updates puntuales
    out.push(obj);
  }
  return out;
}

/** Agrega una fila nueva. Genera id y created_at si no vienen. */
function appendRow_(name, obj) {
  return withLock_(() => {
    const sh = sheet_(name);
    const headers = headers_(sh);
    if (!obj.id) obj.id = Utilities.getUuid();
    if (!obj.created_at) obj.created_at = new Date().toISOString();
    const row = headers.map(h => (obj[h] !== undefined && obj[h] !== null) ? obj[h] : '');
    sh.appendRow(row);
    return obj;
  });
}

/** Actualiza por id las columnas presentes en patch. Devuelve false si no encontró la fila. */
function updateById_(name, id, patch) {
  return withLock_(() => {
    const sh = sheet_(name);
    const values = sh.getDataRange().getValues();
    const headers = values[0];
    const idCol = headers.indexOf('id');
    if (idCol === -1) throw new Error('La pestaña "' + name + '" no tiene columna "id"');
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idCol]) === String(id)) {
        Object.keys(patch).forEach(k => {
          const c = headers.indexOf(k);
          if (c > -1) sh.getRange(r + 1, c + 1).setValue(patch[k]);
        });
        return true;
      }
    }
    return false;
  });
}

function findById_(name, id) {
  return sheetToObjects_(name).find(o => String(o.id) === String(id));
}

/**
 * Bloqueo puntual para el único caso de escritura realmente compartida
 * (reasignar una búsqueda de un selector a otro). El resto de las escrituras
 * ya está separado por selector, así que casi nunca compiten por la misma fila.
 */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function todayISO_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Igual al workingDaysDiff() de core.js (versión O(1), ya arreglada — ver el
 * commit "Arreglar el cuelgue real" en el repo original): días hábiles entre
 * dos fechas, sin iterar día por día.
 */
function workingDaysDiff_(fromISO, toISO) {
  if (!fromISO) return 0;
  const start = new Date(fromISO + 'T00:00:00');
  const end = toISO ? new Date(toISO + 'T00:00:00') : new Date();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  const MS_DIA = 86400000;
  const totalDias = Math.round((end - start) / MS_DIA);
  if (totalDias > 200000) return 0; // fecha corrupta, no una demora real
  const count = Math.floor(totalDias / 7) * 5;
  let dow = (start.getDay() + 1) % 7;
  let extra = 0;
  for (let i = 0; i < totalDias % 7; i++) {
    if (dow !== 0 && dow !== 6) extra++;
    dow = (dow + 1) % 7;
  }
  return count + extra;
}
