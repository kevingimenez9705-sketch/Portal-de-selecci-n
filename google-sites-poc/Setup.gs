/**
 * Setup.gs — corré initializePortal() UNA sola vez, a mano, desde el editor de
 * Apps Script (▶ elegir la función en el dropdown de arriba y ejecutar).
 * Crea las pestañas que reemplazan a las tablas de Supabase, con sus columnas.
 * Si una pestaña ya existe no la toca — es seguro volver a correrlo.
 */
function initializePortal() {
  const schema = {
    'Busquedas': ['id', 'numero', 'puesto', 'selector', 'depto', 'sector', 'nivel', 'tipo', 'motivo',
      'sueldo', 'jornada', 'ubicacion', 'inicio', 'status', 'ingreso', 'ingreso_nombre',
      'categoria', 'herramientas', 'enviado_sector', 'decision_sector', 'reopened_from', 'created_at'],
    'Candidatos': ['id', 'busqueda_id', 'nombre', 'estado', 'selector', 'fecha_envio',
      'fecha_entrevista', 'fecha_rechazo', 'resultado_chofer', 'fecha_ingreso_chofer', 'created_at'],
    'Verificaciones': ['id', 'busqueda_id', 'tipo', 'resultado', 'selector_verif', 'observaciones',
      'fecha_inicio', 'fecha_fin', 'created_at'],
    'Psicotecnicos': ['id', 'busqueda_id', 'nombre', 'resultado', 'selector_psico', 'realizado_por',
      'auth_por', 'created_at'],
    'EstadoLog': ['id', 'busqueda_id', 'texto', 'fecha', 'created_at'],
    'Historial': ['id', 'busqueda_id', 'texto', 'fecha', 'created_at'],
    'Archivos': ['id', 'busqueda_id', 'nombre', 'drive_file_id', 'url', 'subido_por', 'created_at'],
    'Perfiles': ['id', 'selector', 'email'],
  };

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(schema).forEach(name => {
    let sh = spreadsheet.getSheetByName(name);
    if (!sh) {
      sh = spreadsheet.insertSheet(name);
      Logger.log('Creada pestaña: ' + name);
    }
    const headers = schema[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });

  // Borra la hoja "Hoja 1" / "Sheet1" default si quedó vacía y sin usar.
  const def = spreadsheet.getSheetByName('Hoja 1') || spreadsheet.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(def);
  }

  // Carpeta madre en Drive para los PDFs, una subcarpeta por búsqueda (ver Archivos.gs).
  const folders = DriveApp.getFoldersByName('Portal de Selección — PDFs');
  const rootFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Portal de Selección — PDFs');

  SpreadsheetApp.getUi().alert(
    'Listo. Pestañas creadas y carpeta de Drive lista: ' + rootFolder.getUrl() +
    '\n\nAhora: Implementar > Nueva implementación > Aplicación web, y pegá esa URL en Sites (Insertar > Insertar > Por URL).'
  );
}
