/**
 * Archivos.gs — reemplaza a Supabase Storage. Los PDFs van a una subcarpeta de
 * Drive por búsqueda, dentro de "Portal de Selección — PDFs" (creada por
 * initializePortal() en Setup.gs).
 */

function carpetaRaiz_() {
  const it = DriveApp.getFoldersByName('Portal de Selección — PDFs');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Portal de Selección — PDFs');
}

function carpetaDeBusqueda_(busquedaId) {
  const raiz = carpetaRaiz_();
  const it = raiz.getFoldersByName(busquedaId);
  if (it.hasNext()) return it.next();
  return raiz.createFolder(busquedaId);
}

function listArchivos_(busquedaId) {
  return sheetToObjects_('Archivos').filter(a => a.busqueda_id === busquedaId);
}

/**
 * `base64` viene del <input type="file"> convertido en el cliente (ver
 * SelectorView.html) — Apps Script no puede leer el disco del usuario directo.
 */
function subirPDF_(selector, busquedaId, nombreArchivo, base64, mimeType) {
  assertBusquedaDeSelector_(selector, busquedaId);
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/pdf', nombreArchivo);
  const file = carpetaDeBusqueda_(busquedaId).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return appendRow_('Archivos', {
    busqueda_id: busquedaId, nombre: nombreArchivo, drive_file_id: file.getId(),
    url: file.getUrl(), subido_por: selector,
  });
}

function eliminarPDF_(selector, archivoId) {
  const a = findById_('Archivos', archivoId);
  if (!a) throw new Error('Archivo no encontrado');
  assertBusquedaDeSelector_(selector, a.busqueda_id);
  if (a.drive_file_id) {
    try { DriveApp.getFileById(a.drive_file_id).setTrashed(true); } catch (e) { /* ya no existe */ }
  }
  return withLock_(() => {
    const sh = sheet_('Archivos');
    const values = sh.getDataRange().getValues();
    const idCol = headers_(sh).indexOf('id');
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idCol]) === String(archivoId)) { sh.deleteRow(r + 1); return true; }
    }
    return false;
  });
}
