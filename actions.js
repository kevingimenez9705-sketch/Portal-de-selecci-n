// ══════════════════════════════════════════════
//  ACTIONS.JS — altas, bajas y ediciones: todo lo que guarda algo en Supabase
//  (búsquedas, candidatos, psicotécnicos, verificaciones, archivos PDF).
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  UPDATE FIELD
// ══════════════════════════════════════════════
async function toggleHerramienta(id, herramienta, checked) {
    const b = busquedas.find(x => x.id === id) || {};
    let arr = (b.herramientas || '').split(',').map(s => s.trim()).filter(Boolean);
    if (checked) { if (!arr.includes(herramienta)) arr.push(herramienta); }
    else { arr = arr.filter(h => h !== herramienta); }
    const val = arr.join(', ');
    let { data, error } = await sb.from('busquedas').update({ herramientas: val }).eq('id', id).select();
    if (error && error.message && error.message.includes('herramientas')) {
        toast('Falta la columna "herramientas" en Supabase (ver SQL)', true); return;
    }
    if (error) { toast('Error al guardar: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se guardó (revisar policy UPDATE)', true); return; }
    await loadData(id); refreshView(); toast('Herramientas actualizadas ✓');
}

async function updateField(id, field, val) {
    if (!fechaValida(val)) { toast('Fecha inválida (año fuera de rango) — no se guardó', true); refreshView(); return; }
    if (field === 'ingreso' && val) {
        const msg = isAdmin()
            ? 'Vas a cargar la fecha de ingreso: esto cambia el Estado a "Cerrada" automáticamente. ¿Confirmás?'
            : 'Vas a cargar la fecha de ingreso: esto cierra automáticamente la búsqueda (Estado: Cerrada) y, al no ser admin, vos mismo/a vas a dejar de poder editarla después. ¿Confirmás?';
        if (!confirm(msg)) { refreshView(); return; }
    }
    const update = { [field]: val };
    if (field === 'ingreso' && val) update.status = 'Cerrada';
    const { data, error } = await sb.from('busquedas').update(update).eq('id', id).select();
    if (error) { toast('Error al guardar: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se guardó (revisar policy UPDATE en busquedas)', true); return; }
    await loadData(id); // ya incluye el chequeo de los 90 días hábiles (ver loadData)
    refreshView();
    const cerrandoSinIngreso = field === 'status' && (val === 'Cerrada' || val === 'Finalizada') && !data[0].ingreso;
    toast(cerrandoSinIngreso ? 'Guardado — ojo: se cerró sin cargar la fecha de ingreso' : 'Guardado ✓');
}

async function addEstadoEntry(id) {
    const input = document.getElementById('estado-input-' + id);
    const texto = input?.value.trim();
    if (!texto) return;
    const { error } = await sb.from('estado_log').insert({ busqueda_id: id, texto, fecha: today() });
    if (error) { toast('Error al guardar', true); return; }
    input.value = '';
    await loadData(id); refreshView(); toast('Comentario agregado ✓');
}

async function removeEstadoEntry(entryId) {
    if (!isAdmin()) { toast('Solo un administrador puede eliminar comentarios', true); return; }
    if (!confirm('¿Eliminar este comentario? Esta acción no se puede deshacer.')) return;
    const bid = findBusquedaId(b => (b.estado_busqueda || []).some(e => e.id === entryId));
    await sb.from('estado_log').delete().eq('id', entryId);
    await loadData(bid); refreshView(); toast('Eliminado');
}

function toggleCandModalFechas() {
    const estado = document.getElementById('cand-estado').value;
    document.getElementById('cand-grp-entrevista').classList.toggle('hidden', estado !== 'Entrevista');
    const grpRech = document.getElementById('cand-grp-rechazo');
    grpRech.classList.toggle('hidden', estado !== 'Rechazado' && estado !== 'Baja');
    const lbl = grpRech.querySelector('label');
    if (lbl) lbl.textContent = estado === 'Baja' ? 'Fecha en que se bajó' : 'Fecha de rechazo';
}

function openCandModal(id) {
    document.getElementById('cand-grp-busqueda').classList.add('hidden');
    document.getElementById('cand-grp-selector').classList.add('hidden');
    document.getElementById('cand-bid').value = id;
    document.getElementById('cand-nombre').value = '';
    document.getElementById('cand-estado').value = 'Enviado';
    document.getElementById('cand-fecha-envio').value = today();
    document.getElementById('cand-fecha-entrevista').value = '';
    document.getElementById('cand-fecha-rechazo').value = '';
    toggleCandModalFechas();
    openModal('modal-cand');
}

// Muestra el selector de "Selector a cargo" solo cuando el postulante queda sin búsqueda vinculada.
function toggleCandSelectorGroup() {
    const sinBusqueda = !document.getElementById('cand-bid').value;
    document.getElementById('cand-grp-selector').classList.toggle('hidden', !sinBusqueda);
}

// ── Nuevo Postulante (desde la vista de Fichas / Choferes y Ayudantes) ──
// Por defecto queda SIN búsqueda asignada: se le puede igual asignar un selector a cargo,
// y un selector vincula la búsqueda después desde la ficha.
function openNuevoPostulanteModal() {
    const opts = busquedas.filter(b => catOf(b) === 'choferes');
    const selEl = document.getElementById('cand-busqueda-select');
    selEl.innerHTML = '<option value="">— Sin asignar (se vincula a una búsqueda después) —</option>'
        + opts.map(b => `<option value="${b.id}">${b.puesto} · ${b.selector} (${b.numero})</option>`).join('');
    document.getElementById('cand-selector').innerHTML = '<option value="">— Elegir selector —</option>'
        + SELECTORES.map(s => `<option>${s}</option>`).join('');
    document.getElementById('cand-grp-busqueda').classList.remove('hidden');
    document.getElementById('cand-bid').value = '';
    document.getElementById('cand-nombre').value = '';
    document.getElementById('cand-estado').value = 'Enviado';
    document.getElementById('cand-fecha-envio').value = today();
    document.getElementById('cand-fecha-entrevista').value = '';
    document.getElementById('cand-fecha-rechazo').value = '';
    toggleCandModalFechas();
    toggleCandSelectorGroup();
    openModal('modal-cand');
}

async function saveCand() {
    const bidRaw = document.getElementById('cand-bid').value;
    const id     = bidRaw ? +bidRaw : null;
    const nombre = document.getElementById('cand-nombre').value.trim();
    const estado = document.getElementById('cand-estado').value;
    if (!nombre) return;
    const fEnvio      = document.getElementById('cand-fecha-envio').value || today();
    const fEntrevista = document.getElementById('cand-fecha-entrevista').value;
    const fRechazo    = document.getElementById('cand-fecha-rechazo').value;
    const selector    = id ? null : (document.getElementById('cand-selector').value || null);

    // ── FIX: construimos el row solo con columnas que existen ──
    const row = { busqueda_id: id, nombre, estado, fecha_envio: fEnvio };
    if (!id) row.selector = selector;
    if (estado === 'Entrevista' && fEntrevista) row.fecha_entrevista = fEntrevista;
    if ((estado === 'Rechazado' || estado === 'Baja') && fRechazo) row.fecha_rechazo = fRechazo;

    const { error } = await sb.from('candidatos').insert(row);
    if (error) {
        console.error('saveCand error:', error, 'ROW:', row);
        toast('Error: ' + (error.message || error.details || error.hint || error.code || 'desconocido'), true);
        return;
    }
    closeModal('modal-cand'); await loadData(id); refreshView(); toast('Candidato agregado ✓');
}

async function removeCand(candId) {
    if (!confirm('¿Eliminar este candidato? Esta acción no se puede deshacer.')) return;
    const bid = busquedaIdDeCandidato(candId);
    await sb.from('candidatos').delete().eq('id', candId);
    if (bid) await loadData(bid); else { unassignedCandidatos = unassignedCandidatos.filter(c => c.id !== candId); }
    refreshView(); toast('Candidato eliminado');
}

// ── FIX PRINCIPAL: updateCandEstado ya no manda fecha_rechazo=null cuando no existe la col ──
async function updateCandEstado(candId, estado) {
    const hoy = today();
    const update = { estado };
    const bid = busquedaIdDeCandidato(candId);
    const c = busquedas.flatMap(b => b.candidatos).find(x => x.id === candId) || {};

    if (estado === 'Entrevista') {
        update.fecha_entrevista = c.fecha_entrevista || hoy;
        // Solo nullificamos fecha_rechazo si la columna existe (ya corriste el ALTER TABLE)
        update.fecha_rechazo = null;
    }
    if (estado === 'Rechazado') {
        update.fecha_rechazo = c.fecha_rechazo || hoy;
    }
    if (estado === 'Baja') {
        update.fecha_rechazo = c.fecha_rechazo || hoy;
    }
    if (estado === 'Enviado') {
        update.fecha_entrevista = null;
        update.fecha_rechazo = null;
    }
    if (estado === 'Oferta') {
        update.fecha_rechazo = null;
    }

    const { data, error } = await sb.from('candidatos').update(update).eq('id', candId).select();
    if (error) {
        // Si el error es por fecha_rechazo inexistente, reintentamos SIN esa columna
        if (error.message && error.message.includes('fecha_rechazo')) {
            const updateSinRechazo = { estado };
            if (estado === 'Entrevista') updateSinRechazo.fecha_entrevista = c.fecha_entrevista || hoy;
            if (estado === 'Enviado')    updateSinRechazo.fecha_entrevista = null;
            const { data: d2, error: e2 } = await sb.from('candidatos').update(updateSinRechazo).eq('id', candId).select();
            if (e2) { toast('Error: ' + (e2.message || e2.code), true); return; }
            if (!d2 || d2.length === 0) { toast('No se actualizó (revisar policy UPDATE en candidatos)', true); return; }
            await loadData(bid); refreshView(); toast('Estado actualizado ✓');
            return;
        }
        toast('Error: ' + (error.message || error.code), true);
        return;
    }
    if (!data || data.length === 0) { toast('No se actualizó (revisar policy UPDATE en candidatos)', true); return; }
    await loadData(bid); refreshView(); toast('Estado actualizado ✓');
}

async function updateCandFecha(candId, field, val) {
    if (!fechaValida(val)) { toast('Fecha inválida (año fuera de rango) — no se guardó', true); refreshView(); return; }
    const { data, error } = await sb.from('candidatos').update({ [field]: val || null }).eq('id', candId).select();
    if (error) { toast('Error al guardar fecha: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se guardó (revisar policy UPDATE en candidatos)', true); return; }
    await loadData(busquedaIdDeCandidato(candId)); refreshView(); toast('Fecha actualizada ✓');
}

// ── Choferes y Ayudantes: estado de ingreso por postulante ──
async function updateCandChoferResultado(candId, resultado) {
    const update = { resultado_chofer: resultado };
    if (resultado !== 'Para ingresar') update.fecha_ingreso_chofer = null;
    let { data, error } = await sb.from('candidatos').update(update).eq('id', candId).select();
    if (error && error.message && /resultado_chofer|fecha_ingreso_chofer/.test(error.message)) {
        toast('Falta agregar las columnas "resultado_chofer" y "fecha_ingreso_chofer" en la tabla candidatos (Supabase)', true);
        return;
    }
    if (error) { toast('Error: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se actualizó (revisar policy UPDATE en candidatos)', true); return; }
    await loadData(busquedaIdDeCandidato(candId)); refreshView(); toast('Estado actualizado ✓');
}

async function updateCandChoferFecha(candId, val) {
    if (!fechaValida(val)) { toast('Fecha inválida (año fuera de rango) — no se guardó', true); refreshView(); return; }
    const { data, error } = await sb.from('candidatos').update({ fecha_ingreso_chofer: val || null }).eq('id', candId).select();
    if (error && error.message && error.message.includes('fecha_ingreso_chofer')) {
        toast('Falta agregar la columna "fecha_ingreso_chofer" en la tabla candidatos (Supabase)', true);
        return;
    }
    if (error) { toast('Error al guardar fecha: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se guardó (revisar policy UPDATE en candidatos)', true); return; }
    await loadData(busquedaIdDeCandidato(candId)); refreshView(); toast('Fecha actualizada ✓');
}

// ══════════════════════════════════════════════
//  FICHA COMPLETA DEL POSTULANTE — modal (opcional, uso puntual)
// ══════════════════════════════════════════════
function openFichaModal(candId) {
    document.getElementById('ficha-cand-id').value = candId;
    renderFichaModalContent(candId);
    openModal('modal-ficha');
}

function renderFichaModalContent(candId) {
    const b = busquedas.find(bb => (bb.candidatos || []).some(cc => cc.id === candId));
    const c = b ? b.candidatos.find(cc => cc.id === candId) : null;
    const box = document.getElementById('ficha-content');
    if (!c || !b) { box.innerHTML = '<span class="tip">No se encontró el candidato</span>'; return; }
    box.innerHTML = `<div style="overflow-x:auto">${buildFichaTableHtml(c, b)}</div>
    <div class="tip" style="margin-top:10px;display:block">
        <i class="fas fa-info-circle"></i> Si algún campo no se guarda, es probable que falte agregar la columna correspondiente en la tabla <strong>candidatos</strong> de Supabase (ver aviso emergente al guardar).
    </div>`;
}

async function updateFichaField(candId, field, val) {
    if (!fechaValida(val)) { toast('Fecha inválida (año fuera de rango) — no se guardó', true); refreshView(); return; }
    const { data, error } = await sb.from('candidatos').update({ [field]: val || null }).eq('id', candId).select();
    if (error) {
        toast('Falta la columna "' + field + '" en la tabla candidatos (Supabase)', true);
        return;
    }
    if (!data || data.length === 0) { toast('No se guardó (revisar policy UPDATE en candidatos)', true); return; }
    await loadData(busquedaIdDeCandidato(candId));
    refreshView();
    if (document.getElementById('ficha-cand-id')?.value == candId && !document.getElementById('modal-ficha').classList.contains('hidden')) {
        renderFichaModalContent(candId);
    }
    toast('Guardado ✓');
}

function openPsicoModal(id) {
    document.getElementById('psico-bid').value = id;
    ['psico-nombre', 'psico-realizado', 'psico-auth'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('psico-selector').value = '';
    openModal('modal-psico');
}
async function savePsico() {
    const id           = +document.getElementById('psico-bid').value;
    const nombre       = document.getElementById('psico-nombre').value.trim();
    const resultado    = document.getElementById('psico-resultado').value;
    const selector_psico = document.getElementById('psico-selector').value;
    const realizado_por  = document.getElementById('psico-realizado').value.trim();
    const auth_por       = document.getElementById('psico-auth').value.trim();
    if (!nombre) return;
    const { error } = await sb.from('psicotecnicos').insert({ busqueda_id: id, nombre, resultado, selector_psico, realizado_por, auth_por });
    if (error) { toast('Error al guardar', true); return; }
    closeModal('modal-psico'); await loadData(id); refreshView(); toast('Psicotécnico agregado ✓');
}
async function removePsico(psicoId) {
    if (!confirm('¿Eliminar este psicotécnico? Esta acción no se puede deshacer.')) return;
    const bid = findBusquedaId(b => (b.psicotecnicos || []).some(p => p.id === psicoId));
    await sb.from('psicotecnicos').delete().eq('id', psicoId);
    await loadData(bid); refreshView(); toast('Eliminado');
}

function openVerifModal(id) {
    document.getElementById('verif-bid').value = id;
    document.getElementById('verif-tipo').value     = 'Nosis';
    document.getElementById('verif-resultado').value = 'Pendiente';
    document.getElementById('verif-selector').value  = '';
    document.getElementById('verif-obs').value       = '';
    openModal('modal-verif');
}
async function saveVerif() {
    const id           = +document.getElementById('verif-bid').value;
    const tipo         = document.getElementById('verif-tipo').value;
    const resultado    = document.getElementById('verif-resultado').value;
    const selector_verif = document.getElementById('verif-selector').value;
    const observaciones  = document.getElementById('verif-obs').value.trim();

    // ── Contador: fecha_inicio al crear; si nace ya resuelto, también fecha_fin ──
    const row = { busqueda_id: id, tipo, resultado, selector_verif, observaciones, fecha_inicio: today() };
    if (!verifEnCurso(resultado)) row.fecha_fin = today();

    let { error } = await sb.from('verificaciones').insert(row);
    // Fallback si todavía no corriste el ALTER TABLE (columnas fecha_inicio/fecha_fin)
    if (error && error.message && /fecha_(inicio|fin)/.test(error.message)) {
        ({ error } = await sb.from('verificaciones').insert({ busqueda_id: id, tipo, resultado, selector_verif, observaciones }));
    }
    if (error) { toast('Error al guardar: ' + (error.message || error.code), true); return; }
    closeModal('modal-verif'); await loadData(id); refreshView(); toast('Verificación agregada ✓');
}

// ── Editar estado inline + congelar/reactivar contador ──
async function updateVerifEstado(verifId, resultado) {
    const bid = findBusquedaId(b => (b.verificaciones || []).some(x => x.id === verifId));
    const v = busquedas.flatMap(b => b.verificaciones).find(x => x.id === verifId) || {};
    const update = { resultado };
    if (verifEnCurso(resultado)) {
        update.fecha_fin = null;                       // reabre → vuelve a correr el contador
    } else {
        update.fecha_fin = v.fecha_fin || today();     // resuelve → congela en la fecha del cambio
    }
    let { data, error } = await sb.from('verificaciones').update(update).eq('id', verifId).select();
    // Fallback si no existe fecha_fin todavía
    if (error && error.message && error.message.includes('fecha_fin')) {
        ({ data, error } = await sb.from('verificaciones').update({ resultado }).eq('id', verifId).select());
    }
    if (error) { toast('Error: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se actualizó (revisar policy UPDATE en verificaciones)', true); return; }
    await loadData(bid); refreshView(); toast('Estado actualizado ✓');
}

async function removeVerif(verifId) {
    if (!confirm('¿Eliminar esta verificación? Esta acción no se puede deshacer.')) return;
    const bid = findBusquedaId(b => (b.verificaciones || []).some(x => x.id === verifId));
    await sb.from('verificaciones').delete().eq('id', verifId);
    await loadData(bid); refreshView(); toast('Eliminado');
}

async function addNew() {
    const puesto = document.getElementById('n-puesto').value.trim();
    if (!puesto) { toast('Ingresá el puesto', true); return; }
    const nivel = document.getElementById('n-nivel').value.trim() || 'Otros';
    const row = {
        numero: nextNro(), puesto,
        selector:  document.getElementById('n-selector').value,
        depto:     document.getElementById('n-depto').value || 'Sin definir',
        tipo:      document.getElementById('n-tipo').value,
        motivo:    document.getElementById('n-motivo').value,
        nivel,
        sueldo:    parseFloat(document.getElementById('n-sueldo').value) || 0,
        jornada:   document.getElementById('n-jornada').value,
        ubicacion: document.getElementById('n-ubicacion').value,
        inicio:    document.getElementById('n-inicio').value || today(),
        status: 'Proceso', ingreso: null, ingreso_nombre: '',
        categoria: currentCategoria === 'choferes' ? 'choferes' : null
    };
    let { data, error } = await sb.from('busquedas').insert(row).select().single();
    // Fallback si todavía no corriste el ALTER TABLE (columna categoria)
    if (error && error.message && error.message.includes('categoria')) {
        delete row.categoria;
        ({ data, error } = await sb.from('busquedas').insert(row).select().single());
    }
    if (error) { toast('Error al crear búsqueda', true); return; }
    await sb.from('historial').insert({ busqueda_id: data.id, texto: 'Apertura de vacante', fecha: new Date().toISOString() });
    closeModal('modal-nueva'); await loadData(); refreshView(); toast('Búsqueda creada ✓');
}

async function reabrir(id) {
    const orig = busquedas.find(x => x.id === id);
    if (!orig) { toast('No se encontró la búsqueda', true); return; }
    if (!confirm('¿Reabrir búsqueda "' + orig.puesto + '"? Se creará una nueva entrada en Proceso.')) return;
    const nuevaRow = {
        numero: nextNro(), puesto: orig.puesto, selector: orig.selector,
        depto: orig.depto, tipo: orig.tipo, motivo: orig.motivo, nivel: orig.nivel,
        sueldo: orig.sueldo, jornada: orig.jornada, ubicacion: orig.ubicacion,
        inicio: today(), status: 'Proceso', ingreso: null, ingreso_nombre: '',
        categoria: orig.categoria || null, herramientas: orig.herramientas || null,
        reopened_from: orig.numero
    };
    let { data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single();
    if (errInsert && errInsert.message && /categoria|herramientas/.test(errInsert.message)) {
        delete nuevaRow.categoria; delete nuevaRow.herramientas;
        ({ data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single());
    }
    if (errInsert && errInsert.message && /reopened_from/.test(errInsert.message)) {
        delete nuevaRow.reopened_from;
        ({ data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single());
    }
    if (errInsert) { toast('Error al reabrir: ' + (errInsert.message || 'verificar permisos'), true); return; }
    const textoOrigen = `Reapertura de ${orig.numero} — "${orig.puesto}". Anterior ingresado: ${orig.ingreso_nombre || 'N/D'} (${orig.ingreso || 'sin fecha'})`;
    await sb.from('estado_log').insert({ busqueda_id: nueva.id, texto: textoOrigen, fecha: today() });
    try {
        const histEntries = [{ busqueda_id: nueva.id, texto: textoOrigen, fecha: new Date().toISOString() }];
        if (orig.historial && orig.historial.length > 0) {
            orig.historial.forEach(h => histEntries.push({ busqueda_id: nueva.id, texto: '[Historial copiado] ' + h.texto, fecha: new Date().toISOString() }));
        }
        await sb.from('historial').insert(histEntries);
    } catch (e) { console.warn('No se pudo copiar historial:', e); }
    let fechaBaja = prompt('Fecha de baja del que ingresó (AAAA-MM-DD). Dejá vacío si seguía hasta hoy:', today());
    const updOrig = { status: 'Cerrada' };
    if (fechaBaja && fechaBaja.trim()) {
        const f = fechaBaja.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(f) && fechaValida(f)) updOrig.fecha_baja = f;
        else toast('Fecha de baja inválida — se reabrió igual, pero sin guardar esa fecha', true);
    }
    await sb.from('busquedas').update(updOrig).eq('id', id);
    await loadData(); refreshView();
    toast('Búsqueda reabierta como ' + nueva.numero + ' ✓');
}

// Reapertura manual con el contador en 0 (por demora del sector, o por cualquier otro motivo mientras
// sigue "Proceso"): a diferencia de reabrir(), acá nadie ingresó todavía, así que no corresponde
// preguntar fecha de baja.
async function reabrirPorDemora(id) {
    const orig = busquedas.find(x => x.id === id);
    if (!orig) { toast('No se encontró la búsqueda', true); return; }
    if (!confirm('¿Reabrir "' + orig.puesto + '" con el contador en 0? Se marcará esta entrada como Sustituida y se creará una nueva con fecha de inicio hoy.')) return;
    const nuevaRow = {
        numero: nextNro(), puesto: orig.puesto, selector: orig.selector,
        depto: orig.depto, tipo: orig.tipo, motivo: orig.motivo, nivel: orig.nivel,
        sueldo: orig.sueldo, jornada: orig.jornada, ubicacion: orig.ubicacion,
        inicio: today(), status: 'Proceso', ingreso: null, ingreso_nombre: '',
        categoria: orig.categoria || null, herramientas: orig.herramientas || null,
        reopened_from: orig.numero
    };
    let { data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single();
    if (errInsert && errInsert.message && /categoria|herramientas/.test(errInsert.message)) {
        delete nuevaRow.categoria; delete nuevaRow.herramientas;
        ({ data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single());
    }
    if (errInsert && errInsert.message && /reopened_from/.test(errInsert.message)) {
        delete nuevaRow.reopened_from;
        ({ data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single());
    }
    if (errInsert) { toast('Error al reabrir: ' + (errInsert.message || 'verificar permisos'), true); return; }
    const textoOrigen = `Reapertura de ${orig.numero} — "${orig.puesto}" con el contador en 0 (nueva fecha de inicio: ${today()}).`;
    await sb.from('estado_log').insert({ busqueda_id: nueva.id, texto: textoOrigen, fecha: today() });
    try {
        await sb.from('historial').insert({ busqueda_id: nueva.id, texto: textoOrigen, fecha: new Date().toISOString() });
    } catch (e) { console.warn('No se pudo copiar historial:', e); }
    let { error: errUpd } = await sb.from('busquedas').update({ status: 'Sustituida' }).eq('id', id);
    if (errUpd) ({ error: errUpd } = await sb.from('busquedas').update({ status: 'Cerrada' }).eq('id', id));
    await loadData(); refreshView();
    toast('Búsqueda reabierta como ' + nueva.numero + ' ✓');
}

// Reapertura administrativa: crea un número de búsqueda nuevo pero mantiene la fecha de inicio
// (y "Enviado al sector"/"Decisión del sector" si ya estaban cargadas), así el Total Proceso
// sigue sumando en vez de arrancar en 0. Distinto de reabrirPorDemora(), que sí resetea el contador.
async function reabrirContinuarConteo(id) {
    const orig = busquedas.find(x => x.id === id);
    if (!orig) { toast('No se encontró la búsqueda', true); return; }
    const totalActual = tramosDemora(orig).total;
    if (!confirm('¿Reabrir "' + orig.puesto + '" continuando el conteo actual (Total Proceso: ' + totalActual + 'hd)? Se creará una búsqueda nueva con la misma fecha de inicio y se marcará esta como Sustituida.')) return;
    const nuevaRow = {
        numero: nextNro(), puesto: orig.puesto, selector: orig.selector,
        depto: orig.depto, tipo: orig.tipo, motivo: orig.motivo, nivel: orig.nivel,
        sueldo: orig.sueldo, jornada: orig.jornada, ubicacion: orig.ubicacion,
        inicio: orig.inicio, enviado_sector: orig.cp || null, decision_sector: orig.decision_sector || null,
        status: 'Proceso', ingreso: null, ingreso_nombre: '',
        categoria: orig.categoria || null, herramientas: orig.herramientas || null,
        reopened_from: orig.numero
    };
    let { data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single();
    if (errInsert && errInsert.message && /categoria|herramientas/.test(errInsert.message)) {
        delete nuevaRow.categoria; delete nuevaRow.herramientas;
        ({ data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single());
    }
    if (errInsert && errInsert.message && /decision_sector/.test(errInsert.message)) {
        delete nuevaRow.decision_sector;
        ({ data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single());
    }
    if (errInsert && errInsert.message && /reopened_from/.test(errInsert.message)) {
        delete nuevaRow.reopened_from;
        ({ data: nueva, error: errInsert } = await sb.from('busquedas').insert(nuevaRow).select().single());
    }
    if (errInsert) { toast('Error al reabrir: ' + (errInsert.message || 'verificar permisos'), true); return; }
    const textoOrigen = `Reapertura de ${orig.numero} — "${orig.puesto}" continuando el conteo (Total Proceso al reabrir: ${totalActual}hd, inicio original: ${orig.inicio}).`;
    await sb.from('estado_log').insert({ busqueda_id: nueva.id, texto: textoOrigen, fecha: today() });
    try {
        await sb.from('historial').insert({ busqueda_id: nueva.id, texto: textoOrigen, fecha: new Date().toISOString() });
    } catch (e) { console.warn('No se pudo copiar historial:', e); }
    let { error: errUpd } = await sb.from('busquedas').update({ status: 'Sustituida' }).eq('id', id);
    if (errUpd) ({ error: errUpd } = await sb.from('busquedas').update({ status: 'Cerrada' }).eq('id', id));
    await loadData(); refreshView();
    toast('Búsqueda reabierta como ' + nueva.numero + ' (conteo continuado) ✓');
}

async function eliminar(id) {
    if (!isAdmin()) { toast('Solo un administrador puede eliminar búsquedas', true); return; }
    if (!confirm('¿Eliminar esta búsqueda? Esta acción no se puede deshacer.')) return;
    await sb.from('busquedas').delete().eq('id', id);
    await loadData(); refreshView(); toast('Búsqueda eliminada');
}

async function subirPDF(busquedaId, input) {
    const file = input.files[0];
    if (!file) return;
    toast('Subiendo archivo...');
    const path = `${busquedaId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await sb.storage.from('Busquedas-pdfs').upload(path, file);
    if (upErr) { toast('Error al subir: ' + upErr.message, true); return; }
    const { data: { session } } = await sb.auth.getSession();
    await sb.from('archivos').insert({ busqueda_id: busquedaId, nombre: file.name, url: path, subido_por: session.user.id });
    await loadData(busquedaId); refreshView(); toast('PDF subido ✓');
    input.value = '';
}
async function abrirPDF(storagePath) {
    const { data, error } = await sb.storage.from('Busquedas-pdfs').createSignedUrl(storagePath, 3600);
    if (error || !data) { toast('No se pudo abrir el archivo', true); return; }
    window.open(data.signedUrl, '_blank');
}
async function eliminarPDF(archivoId, storagePath) {
    if (!confirm('¿Eliminar este archivo? Esta acción no se puede deshacer.')) return;
    const bid = findBusquedaId(b => (b.archivos || []).some(a => a.id === archivoId));
    await sb.storage.from('Busquedas-pdfs').remove([storagePath]);
    await sb.from('archivos').delete().eq('id', archivoId);
    await loadData(bid); refreshView(); toast('Archivo eliminado');
}

