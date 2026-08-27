// ══════════════════════════════════════════════
//  RENDER.JS — todo lo que dibuja pantalla a partir de `busquedas`:
//  tabla del Pipeline, tarjetas de Choferes y Ayudantes, KPIs y filtros.
// ══════════════════════════════════════════════
function demoraClass(dias, nivel) {
    const lim = DEMORA_LIMITE[nivel] || 15;
    if (dias <= lim * 0.6) return 'demora-ok';
    if (dias <= lim) return 'demora-warn';
    return 'demora-danger';
}
function motivoClass(m) {
    if (m === 'Expansión') return 'motivo-expansion';
    if (m === 'Rotación') return 'motivo-rotacion';
    if (m === 'SOV') return 'motivo-sov';
    return 'motivo-pdf';
}
function psicoClass(r) {
    if (r === 'Apto') return 'res-apto';
    if (r === 'Apto con observaciones') return 'res-obs';
    if (r === 'Apto con reservas') return 'res-reservas';
    return 'res-noapto';
}
function verifClass(r) {
    if (r === 'OK' || r === 'Apto') return 'res-apto';
    if (r === 'Observado') return 'res-reservas';
    if (r === 'No Apto' || r === 'Rechazado') return 'res-noapto';
    return 'res-obs';
}

// Bloque de psicotécnicos, reutilizado en la tabla Pipeline y en la ficha de Choferes/Ayudantes.
function renderPsicoBlock(b, isLocked) {
    const psicoHtml = b.psicotecnicos.length > 0
        ? b.psicotecnicos.map(p => `
            <div class="psico-item">
                <span class="psico-nombre">${p.nombre}</span>
                <span>
                    <span class="psico-result ${psicoClass(p.resultado)}">${p.resultado}</span>
                    ${p.selector_psico ? `<span class="psico-quien"><i class="fas fa-user" style="font-size:8px"></i> Realizó: <strong>${p.selector_psico}</strong></span>` : ''}
                    ${p.realizado_por ? `<span class="psico-quien">Evaluador: ${p.realizado_por}</span>` : ''}
                    ${p.auth ? `<span class="psico-quien">Auth: ${p.auth}</span>` : ''}
                    ${!isLocked ? `<button onclick="removePsico(${p.id})" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:9px">✕</button>` : ''}
                </span>
            </div>`).join('')
        : `<span class="tip">Sin psicotécnicos</span>`;
    return `
    <details>
        <summary><i class="fas fa-chevron-right"></i> Psicotécnicos (${b.psicotecnicos.length})</summary>
        <div style="padding-top:5px" class="cell-scroll">
            ${psicoHtml}
            ${!isLocked ? `<button class="btn-sm" style="margin-top:5px" onclick="openPsicoModal(${b.id})"><i class="fas fa-plus" style="font-size:8px"></i> Agregar</button>` : ''}
        </div>
    </details>`;
}

// Bloque de verificaciones (incluye Nosis), reutilizado en la tabla Pipeline y en la ficha de Choferes/Ayudantes.
function renderVerifBlock(b, isLocked) {
    const verifHtml = b.verificaciones.length > 0
        ? b.verificaciones.map(v => {
            const enCurso = verifEnCurso(v.resultado);
            let counterHtml = '';
            if (v.fecha_inicio) {
                const d = enCurso ? daysDiff(v.fecha_inicio) : daysDiff(v.fecha_inicio, v.fecha_fin || null);
                counterHtml = `<span class="verif-counter ${enCurso ? 'verif-counter-run' : 'verif-counter-done'}" title="${enCurso ? 'En curso desde ' + v.fecha_inicio : 'Resuelto en ' + d + ' días háb. (' + v.fecha_inicio + ' → ' + (v.fecha_fin || '—') + ')'}">
                    <i class="fas fa-${enCurso ? 'hourglass-half' : 'flag-checkered'}" style="font-size:8px"></i> ${d}hd
                </span>`;
            }
            return `
            <div class="psico-item">
                <span class="psico-nombre">${v.tipo}</span>
                <span style="text-align:right">
                    ${isLocked
                        ? `<span class="psico-result ${verifClass(v.resultado)}">${v.resultado}</span>`
                        : `<select class="inline-select" style="font-size:11px" onchange="updateVerifEstado(${v.id},this.value)">
                            ${['Pendiente','En proceso','OK','Observado','No Apto'].map(o => `<option value="${o}" ${v.resultado === o ? 'selected' : ''}>${o === 'OK' ? 'OK / Apto' : o}</option>`).join('')}
                           </select>`}
                    ${counterHtml ? `<span style="display:block">${counterHtml}</span>` : ''}
                    ${v.selector_verif ? `<span class="psico-quien"><i class="fas fa-user" style="font-size:8px"></i> Realizó: <strong>${v.selector_verif}</strong></span>` : ''}
                    ${v.observaciones ? `<span class="psico-quien">Obs: ${v.observaciones}</span>` : ''}
                    ${!isLocked ? `<button onclick="removeVerif(${v.id})" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:9px">✕</button>` : ''}
                </span>
            </div>`;
        }).join('')
        : `<span class="tip">Sin verificaciones</span>`;
    return `
    <details>
        <summary><i class="fas fa-chevron-right"></i> Verificaciones / Nosis (${b.verificaciones.length})</summary>
        <div style="padding-top:5px" class="cell-scroll">
            ${verifHtml}
            ${!isLocked ? `<button class="btn-sm" style="margin-top:5px" onclick="openVerifModal(${b.id})"><i class="fas fa-plus" style="font-size:8px"></i> Agregar</button>` : ''}
        </div>
    </details>`;
}
function tagClass(s) {
    if (s === 'Proceso') return 'tag-proceso';
    if (s === 'Cerrada') return 'tag-cerrada';
    if (s === 'Sustituida') return 'tag-sustituida';
    if (s === 'Finalizada') return 'tag-finalizada';
    return 'tag-pausada';
}
function fmtMoney(n) {
    if (!n || n === 0) return '$ —';
    return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

// ══════════════════════════════════════════════
//  CATEGORÍA: explícita (columna) o inferida por el puesto
//  (chofer / ayudante caen en la pestaña "Choferes y Ayudantes")
// ══════════════════════════════════════════════
function catOf(b) {
    if (b.categoria === 'choferes' || b.categoria === 'general') return b.categoria;
    const p = (b.puesto || '').toLowerCase();
    if (/chofer|ayudante/.test(p)) return 'choferes';
    return 'general';
}

// ══════════════════════════════════════════════
//  ¿La búsqueda pertenece a la vista actual?
//  Pipeline (currentCategoria === 'general') muestra TODAS las búsquedas.
//  Choferes y Ayudantes muestra solo las de esa categoría.
// ══════════════════════════════════════════════
function inCategoria(b) {
    if (currentCategoria === 'general') return true;
    return catOf(b) === currentCategoria;
}

// ══════════════════════════════════════════════
//  RENDER DISPATCH: pipeline (tabla) vs choferes (fichas)
// ══════════════════════════════════════════════
function refreshView() {
    if (currentCategoria === 'choferes') { renderFichas(); }
    else { renderTable(); }
}

// ══════════════════════════════════════════════
//  RENDER TABLE
// ══════════════════════════════════════════════
function renderTable() {
    const body = document.getElementById('table-body');
    const base = busquedas.filter(inCategoria);
    const list = filteredIds ? base.filter(b => filteredIds.includes(b.id)) : base;
    const locked = (b) => (b.status === 'Cerrada' || b.status === 'Finalizada' || b.status === 'Sustituida') && !isAdmin();

    body.innerHTML = list.map(b => {
        const isLocked = locked(b);
        const diasEnEmpresa = b.ingreso ? daysDiff(b.ingreso, b.fecha_baja || null) : 0;
        const cantComentarios = (b.estado_busqueda || []).length;

        // CANDIDATOS
        const candHtml = b.candidatos.length > 0
            ? b.candidatos.map(c => {
                let tlHtml = '';
                if (c.fecha_envio) {
                    if (c.estado === 'Enviado') {
                        const dRaw = daysDiff(c.fecha_envio);
                        const descuento = c.demora_descuento_dias || 0;
                        const d = Math.max(0, dRaw - descuento);
                        const vencido = d >= ALERTA_SECTOR_LIMITE_HD;
                        tlHtml = `<div class="cand-timeline">
                            <span class="cand-tl-dot cand-tl-dot-blue"></span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-badge ${vencido ? 'cand-tl-badge-alerta' : 'cand-tl-badge-wait'}">${vencido ? '⚠' : '⏳'} ${d === 0 ? 'Hoy' : d + 'hd esperando'}${descuento > 0 ? ` <span class="cand-tl-desc" title="${(c.demora_descuento_motivo || '').replace(/"/g, '&quot;')}">(-${descuento}hd descontado)</span>` : ''}</span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-dot cand-tl-dot-green" style="opacity:.3"></span>
                        </div>
                        ${vencido && !isLocked ? `<button class="btn-sm" style="margin-top:4px" onclick="reabrirPorDemora(${b.id})" title="Pasaron ${d}hd desde que se envió al área sin respuesta"><i class="fas fa-redo" style="font-size:8px"></i> +${ALERTA_SECTOR_LIMITE_HD}hd sin respuesta · Reabrir con contador en 0</button>` : ''}
                        ${!isLocked ? `
                        <details class="cand-justificar">
                            <summary><i class="fas fa-comment-medical" style="font-size:9px"></i> ${descuento > 0 ? `Demora justificada: -${descuento}hd` : 'Justificar demora (descontar días que no dependen del equipo)'}</summary>
                            <div style="display:flex;gap:4px;align-items:center;margin-top:5px;flex-wrap:wrap">
                                <input type="number" min="0" class="inline-input" style="width:50px;border:1px solid var(--border);background:#fff" id="justif-dias-${c.id}" value="${descuento || 0}">
                                <span style="font-size:10px;color:var(--muted)">hd a descontar</span>
                            </div>
                            <input type="text" class="inline-input" style="border:1px solid var(--border);background:#fff;margin-top:4px;width:100%" id="justif-motivo-${c.id}" placeholder="Motivo (ej: candidato de licencia, feriado)" value="${(c.demora_descuento_motivo || '').replace(/"/g, '&quot;')}">
                            <button class="btn-sm" style="margin-top:5px" onclick="guardarJustificacion(${c.id})">Guardar</button>
                        </details>` : (descuento > 0 ? `<div class="tip" style="font-size:10px;margin-top:3px">Demora justificada: -${descuento}hd (${c.demora_descuento_motivo || 'sin motivo'})</div>` : '')}`;
                    } else if (c.estado === 'Entrevista' && c.fecha_entrevista) {
                        const d = daysDiff(c.fecha_envio, c.fecha_entrevista);
                        tlHtml = `<div class="cand-timeline">
                            <span class="cand-tl-dot cand-tl-dot-blue"></span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-badge cand-tl-badge-done">✓ ${d === 0 ? 'mismo día' : d + 'hd hasta entrevista'}</span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-dot cand-tl-dot-green"></span>
                        </div>`;
                    } else if (c.estado === 'Rechazado' && c.fecha_rechazo) {
                        const d = daysDiff(c.fecha_envio, c.fecha_rechazo);
                        tlHtml = `<div class="cand-timeline">
                            <span class="cand-tl-dot cand-tl-dot-blue"></span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-badge cand-tl-badge-rejected">✗ ${d === 0 ? 'mismo día' : d + 'hd hasta rechazo'}</span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-dot cand-tl-dot-red"></span>
                        </div>`;
                    } else if (c.estado === 'Baja' && c.fecha_rechazo) {
                        const d = daysDiff(c.fecha_envio, c.fecha_rechazo);
                        tlHtml = `<div class="cand-timeline">
                            <span class="cand-tl-dot cand-tl-dot-blue"></span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-badge" style="background:#fef3c7;color:#92400e">↩ ${d === 0 ? 'mismo día' : d + 'hd hasta baja'}</span>
                            <div class="cand-tl-line"></div>
                            <span class="cand-tl-dot" style="background:#f59e0b"></span>
                        </div>`;
                    }
                }

                let fechasHtml = '';
                if (!isLocked) {
                    fechasHtml = `
                    <div class="cand-fecha-row">
                        <span class="cand-fecha-lbl">Enviado</span>
                        <input type="date" class="inline-input" style="font-size:11px" value="${c.fecha_envio || ''}" onchange="updateCandFecha(${c.id},'fecha_envio',this.value)">
                    </div>`;
                    if (c.estado === 'Entrevista') {
                        fechasHtml += `
                        <div class="cand-fecha-row">
                            <span class="cand-fecha-lbl">Entrevistado</span>
                            <input type="date" class="inline-input" style="font-size:11px" value="${c.fecha_entrevista || ''}" onchange="updateCandFecha(${c.id},'fecha_entrevista',this.value)">
                        </div>`;
                    }
                    if (c.estado === 'Rechazado') {
                        fechasHtml += `
                        <div class="cand-fecha-row">
                            <span class="cand-fecha-lbl">Rechazado</span>
                            <input type="date" class="inline-input" style="font-size:11px" value="${c.fecha_rechazo || ''}" onchange="updateCandFecha(${c.id},'fecha_rechazo',this.value)">
                        </div>`;
                    }
                    if (c.estado === 'Baja') {
                        fechasHtml += `
                        <div class="cand-fecha-row">
                            <span class="cand-fecha-lbl">Se bajó</span>
                            <input type="date" class="inline-input" style="font-size:11px" value="${c.fecha_rechazo || ''}" onchange="updateCandFecha(${c.id},'fecha_rechazo',this.value)">
                        </div>`;
                    }
                    if (c.estado === 'Oferta') {
                        fechasHtml += b.decision_sector
                            ? `<div class="cand-fecha-row"><span class="cand-fecha-lbl" style="color:var(--green)"><i class="fas fa-check"></i> Decisión del sector: ${fmtFechaCorta(b.decision_sector)}</span></div>`
                            : `<button class="btn-sm" style="margin-top:4px" onclick="updateField(${b.id},'decision_sector','${today()}')" title="Marca hoy como la fecha de 'Decisión del sector' de la búsqueda, para que el contador de demora la use"><i class="fas fa-check" style="font-size:8px"></i> Cerrado (marcar decisión del sector)</button>`;
                    }
                }

                return `<div class="cand-item">
                    <div class="cand-nombre">${c.nombre}</div>
                    ${isLocked ? `<div style="font-size:11px;color:var(--muted)">${c.estado}</div>` : `
                    <select class="inline-select" style="margin-top:3px;font-size:12px" onchange="updateCandEstado(${c.id},this.value)">
                        <option value="Enviado" ${c.estado === 'Enviado' ? 'selected' : ''}>✉ Enviado al área</option>
                        <option value="Entrevista" ${c.estado === 'Entrevista' ? 'selected' : ''}>🤝 En entrevista</option>
                        <option value="Oferta" ${c.estado === 'Oferta' ? 'selected' : ''}>📄 Con oferta</option>
                        <option value="Baja" ${c.estado === 'Baja' ? 'selected' : ''}>↩ Se bajó</option>
                        <option value="Rechazado" ${c.estado === 'Rechazado' ? 'selected' : ''}>✗ Rechazado</option>
                    </select>
                    <button onclick="removeCand(${c.id})" style="position:absolute;top:4px;right:6px;background:none;border:none;cursor:pointer;color:#bbb;font-size:11px">✕</button>`}
                    ${fechasHtml}
                    ${tlHtml}
                </div>`;
            }).join('')
            : `<span class="tip">Sin candidatos enviados</span>`;

        // ARCHIVOS
        const archivosHtml = b.archivos.length > 0
            ? b.archivos.map(a => `
                <div class="pdf-item">
                    <span class="pdf-item-name" onclick="abrirPDF('${a.url}')"><i class="fas fa-file-pdf" style="font-size:10px"></i> ${a.nombre}</span>
                    ${!isLocked ? `<button onclick="eliminarPDF(${a.id},'${a.url}')" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:10px">✕</button>` : ''}
                </div>`).join('')
            : `<span class="tip">Sin archivos</span>`;

        // PERMANENCIA
        let permHtml = '';
        if (b.ingreso) {
            const milestone = diasEnEmpresa >= 130 ? '🏆 6 meses' : diasEnEmpresa >= 65 ? '✓ 3 meses' : diasEnEmpresa >= 22 ? '📌 1 mes' : '';
            permHtml = `<div class="perm-box">
                <div class="perm-box-num">${diasEnEmpresa}</div>
                <div class="perm-box-lbl">${b.fecha_baja ? 'Días háb. hasta la baja' : 'Días háb. trabajando en empresa'}</div>
                ${milestone ? `<div class="perm-box-milestone">${milestone}</div>` : ''}
            </div>`;
        }

        // ESTADO DE BÚSQUEDA
        const estadoEntriesHtml = (b.estado_busqueda || []).length === 0
            ? `<span class="tip">Sin comentarios</span>`
            : b.estado_busqueda.map((e, idx) => `
                <div class="estado-entry">
                    <span class="d-badge">D${idx + 1}</span>
                    <div class="estado-entry-body">
                        <div class="estado-entry-text">${e.texto}</div>
                        <div class="estado-entry-meta">
                            <i class="fas fa-clock" style="font-size:9px"></i>
                            ${daysDiff(e.fecha) === 0 ? 'Hoy' : 'hace ' + daysDiff(e.fecha) + 'hd'} · ${e.fecha}
                            ${isAdmin() ? `<button onclick="removeEstadoEntry(${e.id})" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:10px;margin-left:4px" title="Solo admin">✕</button>` : ''}
                        </div>
                    </div>
                </div>`).join('');

        const estadoHtml = `
            <div class="section-hdr">Estado de búsqueda</div>
            ${cantComentarios > 0 ? `
            <button class="estado-toggle" onclick="toggleComentarios(${b.id}, this)">
                <i class="fas fa-chevron-right" id="est-icon-${b.id}" style="font-size:8px;transition:transform .2s"></i>
                ${cantComentarios} comentario${cantComentarios !== 1 ? 's' : ''}
            </button>
            <div class="estado-log cell-scroll" id="est-log-${b.id}" style="max-height:130px;display:none;margin-top:5px">
                ${estadoEntriesHtml}
            </div>` : `<span class="tip" style="font-size:11px">Sin comentarios aún</span>`}
            ${!isLocked ? `
            <div class="estado-add-row">
                <input class="estado-add-input" id="estado-input-${b.id}" placeholder="Agregar comentario…" onkeydown="if(event.key==='Enter')addEstadoEntry(${b.id})">
                <button class="estado-add-btn" onclick="addEstadoEntry(${b.id})"><i class="fas fa-plus" style="font-size:10px"></i></button>
            </div>` : ''}`;

        const reopenedTag = b.reopened_from
            ? `<div style="margin-top:3px;font-size:10px;color:var(--blue);font-weight:600"><i class="fas fa-redo" style="font-size:8px"></i> Reapertura de ${b.reopened_from}</div>`
            : '';
        const reabiertaBadge = b.reopened_from
            ? `<span class="tag tag-reabierta" title="Esta búsqueda reemplaza a ${b.reopened_from}"><i class="fas fa-redo" style="font-size:9px"></i> Reabierta</span>`
            : '';

        return `
        <tr id="row-${b.id}" class="${isLocked ? 'row-locked' : ''} ${b.reopened_from ? 'row-reabierta' : ''}">
            <td>
                <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:500;color:var(--muted)">${b.numero}</div>
                <span class="motivo-chip ${motivoClass(b.motivo)}">${b.motivo}</span>
                <div style="margin-top:5px;display:flex;align-items:center;gap:5px;flex-wrap:wrap">
                    <span class="tag ${tagClass(b.status)}">${b.status}</span>
                    ${reabiertaBadge}
                </div>
                <div style="margin-top:4px;font-size:11px;color:var(--muted)">Inicio: ${b.inicio}</div>
                <div style="margin-top:3px;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px">
                    <span style="font-weight:700">Enviado al sector:</span>
                    ${isLocked
                        ? `<strong>${b.cp || '—'}</strong>`
                        : `<input type="date" class="inline-input" value="${b.cp || ''}" onchange="updateField(${b.id},'enviado_sector',this.value)" style="font-size:11px;width:auto" title="Al completar esta fecha se frena el contador principal">`}
                </div>
                <div style="margin-top:3px;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px">
                    <span style="font-weight:700">Decisión del sector:</span>
                    ${isLocked
                        ? `<strong>${b.decision_sector || '—'}</strong>`
                        : `<input type="date" class="inline-input" value="${b.decision_sector || ''}" onchange="updateField(${b.id},'decision_sector',this.value)" style="font-size:11px;width:auto" title="Fecha en que el sector decidió (aprobó/rechazó), distinta de la fecha de ingreso">`}
                </div>
                ${reopenedTag}
            </td>
            <td>
                ${isLocked
                    ? `<div style="font-weight:700;font-size:13px">${b.puesto}</div>`
                    : `<input class="inline-input" value="${b.puesto || ''}" placeholder="Puesto/Cargo" onchange="updateField(${b.id},'puesto',this.value)" style="font-weight:700;font-size:13px;width:100%">`}
                <div style="font-size:11px;color:var(--muted);margin-top:2px">${b.depto} · <span style="padding:1px 5px;border-radius:3px;background:${b.tipo === 'Staff' ? '#cfe2ff' : '#d1e7dd'};color:${b.tipo === 'Staff' ? '#0a367a' : '#0a3622'};font-weight:700">${b.tipo}</span></div>
                <div style="margin-top:6px;font-size:12px">
                    Selector:
                    ${isLocked ? `<strong>${b.selector}</strong>` : `<select class="inline-select" onchange="updateField(${b.id},'selector',this.value)">${SELECTORES.map(s => `<option ${b.selector === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`}
                </div>
                <div style="margin-top:4px;font-size:12px;display:flex;align-items:center;gap:4px">
                    <span style="color:var(--muted)">Nivel:</span>
                    ${isLocked
                        ? `<strong>${b.nivel}</strong>`
                        : `<input class="inline-input" value="${b.nivel || ''}" placeholder="Nivel del cargo…" list="nivel-datalist-inline" onchange="updateField(${b.id},'nivel',this.value)" style="font-size:12px;font-weight:600;flex:1">
                           <datalist id="nivel-datalist-inline"><option>Otros</option><option>Jefe/Encargado</option><option>Gerente/Director</option></datalist>`}
                </div>
                <div style="margin-top:6px;font-size:12px">
                    <span style="color:var(--muted)">Herramientas:</span>
                    ${(() => {
                        const sel = (b.herramientas || '').split(',').map(s => s.trim()).filter(Boolean);
                        if (isLocked) {
                            return sel.length ? `<div style="margin-top:3px;display:flex;gap:4px;flex-wrap:wrap">${sel.map(h => `<span class="ubic-pill">${h}</span>`).join('')}</div>` : `<span class="tip" style="font-size:11px"> ninguna</span>`;
                        }
                        return `<div style="margin-top:3px;display:flex;gap:8px;flex-wrap:wrap">${HERRAMIENTAS.map(h => `<label style="display:inline-flex;align-items:center;gap:3px;font-size:11px;cursor:pointer"><input type="checkbox" ${sel.includes(h) ? 'checked' : ''} onchange="toggleHerramienta(${b.id},'${h}',this.checked)">${h}</label>`).join('')}</div>`;
                    })()}
                </div>
            </td>
            <td>
                ${isLocked
                    ? `<div style="font-weight:700;font-size:13px;color:var(--green)">${fmtMoney(b.sueldo)}</div>`
                    : `<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px">
                           <span style="font-weight:700;font-size:13px;color:var(--green);flex-shrink:0">$</span>
                           <input class="inline-input" type="number" value="${b.sueldo || ''}" placeholder="Monto ARS…" onchange="updateField(${b.id},'sueldo',parseFloat(this.value)||0)" style="font-weight:700;font-size:13px;color:var(--green);width:100%">
                       </div>`}
                ${isLocked
                    ? `<div style="font-size:11px;font-weight:700;background:#ece9e3;border-radius:4px;padding:2px 6px;display:inline-block;margin-top:2px">${b.jornada || '—'}</div>`
                    : `<input class="inline-input" value="${b.jornada || ''}" placeholder="Jornada…" onchange="updateField(${b.id},'jornada',this.value)" style="font-size:12px;font-weight:700;background:#ece9e3;border-radius:4px;padding:2px 6px;width:100%;margin-top:2px">`}
                <div><span class="ubic-pill">📍 ${b.ubicacion}</span></div>
            </td>
            <td>
                ${estadoHtml}
                <div class="sep"></div>
                ${renderPsicoBlock(b, isLocked)}
                ${renderVerifBlock(b, isLocked)}
            </td>
            <td>
                <div class="section-hdr">Candidatos enviados al área</div>
                <div class="cand-count" style="margin-bottom:5px">Total: <strong>${b.candidatos.length}</strong></div>
                <div class="cell-scroll">${candHtml}</div>
                ${!isLocked ? `<button class="btn-sm" style="margin-top:6px" onclick="openCandModal(${b.id})"><i class="fas fa-user-plus" style="font-size:8px"></i> Agregar</button>` : ''}
            </td>
            <td>
                <div class="section-hdr" style="margin-bottom:3px">Archivos PDF</div>
                <div class="cell-scroll" style="max-height:44px">${archivosHtml}</div>
                ${!isLocked ? `
                <label class="pdf-upload-btn">
                    <i class="fas fa-upload" style="font-size:10px"></i> Subir PDF
                    <input type="file" accept=".pdf,.doc,.docx" class="pdf-file-input" onchange="subirPDF(${b.id},this)">
                </label>` : ''}
            </td>
            <td>
                <div class="section-hdr">Candidato que ingresó</div>
                ${isLocked
                    ? `<div style="font-weight:700;color:var(--green)">${b.ingreso_nombre || '—'}</div><div style="font-size:11px;color:var(--muted)">${b.ingreso || ''}</div>`
                    : `<input class="inline-input" value="${b.ingreso_nombre || ''}" placeholder="Nombre del ingresado" onchange="updateField(${b.id},'ingreso_nombre',this.value)" style="font-weight:700;color:var(--green)">
                    <div style="margin-top:5px">
                        <label style="font-size:11px;color:var(--muted)">Fecha de ingreso</label>
                        <input type="date" class="inline-input" value="${b.ingreso || ''}" onchange="updateField(${b.id},'ingreso',this.value)">
                    </div>
                    <div style="margin-top:5px">
                        <label style="font-size:11px;color:var(--muted)">Fecha de baja <span style="font-style:italic">(si dejó la empresa)</span></label>
                        <input type="date" class="inline-input" value="${b.fecha_baja || ''}" onchange="updateField(${b.id},'fecha_baja',this.value)">
                    </div>`}
                ${permHtml}
            </td>
            <td style="vertical-align:middle">
                ${renderDemoraBreakdown(b)}
                <div class="sep" style="margin:8px 0"></div>
                <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
                    ${isLocked
                        ? `<span class="tag ${tagClass(b.status)}">${b.status}</span>`
                        : `<select class="inline-select" onchange="updateField(${b.id},'status',this.value)">
                            ${['Proceso', 'Cerrada', 'Pausada', 'Finalizada', 'Sustituida'].map(s => `<option ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                           </select>`}
                    ${(b.status === 'Cerrada' || b.status === 'Finalizada') ? `<button class="btn-sm" style="font-size:11px" onclick="reabrir(${b.id})"><i class="fas fa-redo" style="font-size:8px"></i> Reabrir</button>` : ''}
                    ${b.status === 'Proceso' ? `<button class="btn-sm" style="font-size:11px" onclick="reabrirContinuarConteo(${b.id})" title="Crea una búsqueda nueva pero mantiene la fecha de inicio, así el Total Proceso sigue sumando"><i class="fas fa-redo" style="font-size:8px"></i> Reabrir (sigue el conteo)</button>` : ''}
                    ${isAdmin() ? `<button class="btn-sm btn-danger" onclick="eliminar(${b.id})"><i class="fas fa-trash" style="font-size:8px"></i></button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
    renderKPIs();
    updateDeptoFilter();
}

// ══════════════════════════════════════════════
//  RENDER FICHAS (Choferes y Ayudantes) — tarjetas
// ══════════════════════════════════════════════
function fmtFechaCorta(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}`;
}

function buildFichaTableHtml(c, b) {
    const isLocked = (b.status === 'Cerrada' || b.status === 'Finalizada' || b.status === 'Sustituida') && !isAdmin();
    const inp = (field, val, type = 'text', ph = '') => isLocked
        ? `<span>${val || '—'}</span>`
        : `<input class="ficha-input" type="${type}" value="${val || ''}" placeholder="${ph}" onchange="updateFichaField(${c.id},'${field}',this.value)">`;
    const sel = (field, val, opts) => isLocked
        ? `<span>${val || 'Pendiente'}</span>`
        : `<select class="ficha-input" onchange="updateFichaField(${c.id},'${field}',this.value)">${opts.map(o => `<option value="${o}" ${(val || 'Pendiente') === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;

    const resChofer = c.resultado_chofer || 'Pendiente';
    const estadoClass = resChofer === 'No apto' ? 'estado-noapto' : resChofer === 'Pendiente' ? 'estado-pendiente' : '';
    const estadoTexto = resChofer === 'Para ingresar'
        ? `Para ingresar${c.fecha_ingreso_chofer ? ' ' + fmtFechaCorta(c.fecha_ingreso_chofer) : ''}`
        : resChofer;

    return `
    <table class="ficha-table">
        <thead>
            <tr>
                <th style="min-width:100px">ÁREA:</th>
                <th style="min-width:120px">${inp('area', c.area, 'text', 'Ej: Logística')}</th>
                <th colspan="3">AMBIENTALES</th>
                <th colspan="2">PSICOTÉCNICO</th>
                <th colspan="2">PREOCUPACIONAL</th>
                <th style="min-width:100px">ANTECEDENTES<br>PENALES</th>
                <th style="min-width:110px">MANIPULACIÓN<br>DE ALIMENTOS</th>
                <th style="min-width:90px">NOSIS</th>
            </tr>
            <tr class="ficha-subhdr">
                <th></th><th></th>
                <th>Fecha de envío</th><th>Fecha estimada</th><th>Resultados</th>
                <th>Fecha Adm.</th><th>Resultado</th>
                <th>Fecha</th><th>Resultado</th>
                <th></th><th></th><th></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="ficha-lbl">NOMBRE</td>
                <td class="ficha-val">${inp('nombre', c.nombre)}</td>
                <td>${inp('amb_fecha_envio', c.amb_fecha_envio, 'date')}</td>
                <td>${inp('amb_fecha_estimada', c.amb_fecha_estimada, 'date')}</td>
                <td>${sel('amb_resultado', c.amb_resultado, FICHA_SIMPLE_OPTS)}</td>
                <td>${inp('psico_fecha', c.psico_fecha, 'date')}</td>
                <td>${sel('psico_resultado', c.psico_resultado, FICHA_PSICO_OPTS)}</td>
                <td>${inp('preocup_fecha', c.preocup_fecha, 'date')}</td>
                <td>${sel('preocup_resultado', c.preocup_resultado, FICHA_SIMPLE_OPTS)}</td>
                <td>${sel('antecedentes_resultado', c.antecedentes_resultado, FICHA_SIMPLE_OPTS)}</td>
                <td>${sel('manipulacion_resultado', c.manipulacion_resultado, FICHA_SIMPLE_OPTS)}</td>
                <td>${sel('nosis_resultado', c.nosis_resultado, FICHA_SIMPLE_OPTS)}</td>
            </tr>
            <tr><td class="ficha-lbl">APELLIDO</td><td class="ficha-val" colspan="11">${inp('apellido', c.apellido)}</td></tr>
            <tr><td class="ficha-lbl">DNI</td><td class="ficha-val" colspan="11">${inp('dni', c.dni)}</td></tr>
            <tr><td class="ficha-lbl">CUIL</td><td class="ficha-val" colspan="11">${inp('cuil', c.cuil)}</td></tr>
            <tr><td class="ficha-lbl">Fecha nacimiento</td><td class="ficha-val" colspan="11">${inp('fecha_nacimiento', c.fecha_nacimiento, 'date')}</td></tr>
            <tr><td class="ficha-lbl">CEL</td><td class="ficha-val" colspan="11">${inp('celular', c.celular)}</td></tr>
            <tr><td class="ficha-lbl">DOMICILIO</td><td class="ficha-val" colspan="11">${inp('domicilio', c.domicilio)}</td></tr>
            <tr><td class="ficha-lbl">PUESTO</td><td class="ficha-val" colspan="11">${inp('puesto_candidato', c.puesto_candidato || b.puesto)}</td></tr>
            <tr><td class="ficha-lbl">RAZÓN SOCIAL</td><td class="ficha-val" colspan="11">${inp('razon_social', c.razon_social)}</td></tr>
            <tr class="ficha-estado-row ${estadoClass}">
                <td colspan="12">
                    <div class="ficha-estado-inner">
                        <span style="font-weight:800;text-transform:uppercase;letter-spacing:.5px;font-size:11px">Estado:</span>
                        ${isLocked ? `<strong>${estadoTexto}</strong>` : `
                            <select class="ficha-input" style="width:auto;font-weight:700" onchange="updateCandChoferResultado(${c.id},this.value)">
                                <option value="Pendiente" ${resChofer === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="Para ingresar" ${resChofer === 'Para ingresar' ? 'selected' : ''}>Para ingresar</option>
                                <option value="No apto" ${resChofer === 'No apto' ? 'selected' : ''}>No apto</option>
                            </select>
                            ${resChofer === 'Para ingresar' ? `<input type="date" class="ficha-input" style="width:auto" value="${c.fecha_ingreso_chofer || ''}" onchange="updateCandChoferFecha(${c.id},this.value)">` : ''}
                        `}
                    </div>
                </td>
            </tr>
        </tbody>
    </table>`;
}

// b === null ⇒ postulante todavía sin búsqueda asignada
function renderFichaCard(c, b) {
    const isLocked = !!b && (b.status === 'Cerrada' || b.status === 'Finalizada' || b.status === 'Sustituida') && !isAdmin();

    if (!b) {
        return `
        <div class="ficha-card ficha-card-unassigned" id="ficha-card-${c.id}">
            <div class="ficha-card-hdr">
                <div>
                    <div class="ficha-card-puesto">
                        <i class="fas fa-user-clock" style="font-size:11px;color:var(--orange)"></i> Postulante sin búsqueda
                        <span class="tag tag-sin-asignar">Sin asignar</span>
                    </div>
                    <div class="ficha-card-meta">Todavía no está vinculado a ninguna búsqueda de Choferes/Ayudantes</div>
                    <div class="ficha-card-meta">Selector a cargo:
                        <select class="inline-select" style="width:auto" onchange="updateCandSelector(${c.id},this.value)">
                            <option value="">— Sin asignar —</option>
                            ${SELECTORES.map(s => `<option ${c.selector === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="ficha-card-actions">
                    <button class="btn-sm btn-danger" onclick="removeCand(${c.id})" title="Eliminar postulante"><i class="fas fa-trash" style="font-size:10px"></i></button>
                </div>
            </div>
            ${renderAsignarBusquedaBox(c.id)}
            <div style="overflow-x:auto">${buildFichaTableHtml(c, {})}</div>
        </div>`;
    }

    const archivosHtml = (b.archivos || []).length > 0
        ? b.archivos.map(a => `
            <div class="pdf-item">
                <span class="pdf-item-name" onclick="abrirPDF('${a.url}')"><i class="fas fa-file-pdf" style="font-size:10px"></i> ${a.nombre}</span>
                ${!isLocked ? `<button onclick="eliminarPDF(${a.id},'${a.url}')" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:10px">✕</button>` : ''}
            </div>`).join('')
        : `<span class="tip" style="font-size:11px">Sin archivos PDF de esta búsqueda</span>`;

    return `
    <div class="ficha-card" id="ficha-card-${c.id}">
        <div class="ficha-card-hdr">
            <div>
                <div class="ficha-card-puesto">
                    <i class="fas fa-truck" style="font-size:11px;color:var(--muted)"></i> ${b.puesto}
                    <span class="tag ${tagClass(b.status)}">${b.status}</span>
                </div>
                <div class="ficha-card-meta">${b.numero} · Selector: <strong>${b.selector}</strong> · <span class="motivo-chip ${motivoClass(b.motivo)}">${b.motivo}</span></div>
            </div>
            <div class="ficha-card-actions">
                ${!isLocked ? `<button class="btn-sm btn-danger" onclick="removeCand(${c.id})" title="Eliminar postulante"><i class="fas fa-trash" style="font-size:10px"></i></button>` : ''}
            </div>
        </div>
        <div style="overflow-x:auto">${buildFichaTableHtml(c, b)}</div>
        <div class="ficha-card-files">
            <div class="section-hdr" style="margin-bottom:3px">Archivos PDF (de la búsqueda)</div>
            <div class="cell-scroll" style="max-height:44px">${archivosHtml}</div>
            ${!isLocked ? `
            <label class="pdf-upload-btn">
                <i class="fas fa-upload" style="font-size:10px"></i> Subir PDF
                <input type="file" accept=".pdf,.doc,.docx" class="pdf-file-input" onchange="subirPDF(${b.id},this)">
            </label>` : ''}
        </div>
    </div>`;
}

function renderAsignarBusquedaBox(candId) {
    const opts = busquedas.filter(b => catOf(b) === 'choferes' && b.status !== 'Finalizada');
    if (opts.length === 0) {
        return `<div class="tip" style="display:block;margin:8px 0">No hay búsquedas de Choferes/Ayudantes abiertas todavía para asignar. Creá una con "Nueva Búsqueda".</div>`;
    }
    return `
    <div class="ficha-asignar-box">
        <span style="font-size:11px;font-weight:700;color:#7c3d00;white-space:nowrap">Asignar a búsqueda:</span>
        <select class="inline-select" id="asignar-sel-${candId}">
            ${opts.map(b => `<option value="${b.id}">${b.puesto} · ${b.selector} (${b.numero})</option>`).join('')}
        </select>
        <button class="btn-sm" onclick="asignarCandidatoABusqueda(${candId})"><i class="fas fa-link" style="font-size:9px"></i> Asignar</button>
    </div>`;
}

async function asignarCandidatoABusqueda(candId) {
    const sel = document.getElementById('asignar-sel-' + candId);
    const bid = +(sel?.value || 0);
    if (!bid) return;
    const { data, error } = await sb.from('candidatos').update({ busqueda_id: bid }).eq('id', candId).select();
    if (error) { toast('Error al asignar: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se asignó (revisar policy UPDATE en candidatos)', true); return; }
    unassignedCandidatos = unassignedCandidatos.filter(c => c.id !== candId); // ya no está "sin asignar"
    await loadData(bid); refreshView(); toast('Postulante asignado a la búsqueda ✓');
}

async function updateCandSelector(candId, selector) {
    const { data, error } = await sb.from('candidatos').update({ selector: selector || null }).eq('id', candId).select();
    if (error) { toast('Error al asignar selector: ' + (error.message || error.code), true); return; }
    if (!data || data.length === 0) { toast('No se asignó (revisar policy UPDATE en candidatos)', true); return; }
    await loadData(); refreshView(); toast('Selector asignado ✓');
}

// Descuenta días hábiles del conteo de espera de un candidato que no dependen del equipo (ej: candidato de licencia, feriado del sector).
async function guardarJustificacion(candId) {
    const dias   = Math.max(0, parseInt(document.getElementById('justif-dias-' + candId).value) || 0);
    const motivo = document.getElementById('justif-motivo-' + candId).value.trim();
    const { data, error } = await sb.from('candidatos').update({ demora_descuento_dias: dias, demora_descuento_motivo: motivo || null }).eq('id', candId).select();
    if (error) { toast('Falta la columna "demora_descuento_dias"/"demora_descuento_motivo" en candidatos (Supabase)', true); return; }
    if (!data || data.length === 0) { toast('No se guardó (revisar policy UPDATE en candidatos)', true); return; }
    await loadData(busquedaIdDeCandidato(candId)); refreshView(); toast('Demora justificada ✓');
}

function renderFichas() {
    const base = busquedas.filter(b => catOf(b) === 'choferes');
    const list = filteredIds ? base.filter(b => filteredIds.includes(b.id)) : base;
    const choferRes = document.getElementById('f-chofer-resultado')?.value || '';

    let cards = [];
    list.forEach(b => (b.candidatos || []).forEach(c => cards.push({ c, b })));
    // Los postulantes sin búsqueda no heredan el filtro de "list" (no tienen b.selector):
    // si hay un chip de selector activo, se filtran por el "selector a cargo" del postulante.
    unassignedCandidatos
        .filter(c => !selectorFiltroActivo || c.selector === selectorFiltroActivo)
        .forEach(c => cards.push({ c, b: null }));
    if (choferRes) cards = cards.filter(({ c }) => (c.resultado_chofer || 'Pendiente') === choferRes);

    const order = { 'Pendiente': 0, 'Para ingresar': 1, 'No apto': 2 };
    // Los sin asignar van primero para que un selector los vea y los vincule.
    cards.sort((x, y) => (x.b ? 1 : 0) - (y.b ? 1 : 0)
        || (order[x.c.resultado_chofer || 'Pendiente'] - order[y.c.resultado_chofer || 'Pendiente'])
        || (y.c.id - x.c.id));

    const totalPost    = cards.length;
    const sinAsignar   = cards.filter(x => !x.b).length;
    const pendientes   = cards.filter(x => (x.c.resultado_chofer || 'Pendiente') === 'Pendiente').length;
    const paraIngresar = cards.filter(x => x.c.resultado_chofer === 'Para ingresar').length;
    const noApto       = cards.filter(x => x.c.resultado_chofer === 'No apto').length;
    document.getElementById('kpi-row-fichas').innerHTML = `
        <div class="kpi"><div class="kpi-num">${totalPost}</div><div class="kpi-lbl">Postulantes</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--orange)">${sinAsignar}</div><div class="kpi-lbl">Sin asignar</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--orange)">${pendientes}</div><div class="kpi-lbl">Pendientes</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--green)">${paraIngresar}</div><div class="kpi-lbl">Para ingresar</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--red)">${noApto}</div><div class="kpi-lbl">No aptos</div></div>`;

    const grid = document.getElementById('fichas-grid');
    grid.innerHTML = cards.length > 0
        ? cards.map(({ c, b }) => renderFichaCard(c, b)).join('')
        : `<span class="tip">No hay postulantes cargados todavía. Usá "Nuevo Postulante" para cargar uno (podés asignarlo a una búsqueda más adelante).</span>`;

    updateDeptoFilter();
}

function toggleComentarios(id, btn) {
    const log = document.getElementById('est-log-' + id);
    const icon = document.getElementById('est-icon-' + id);
    const isVisible = log.style.display !== 'none';
    log.style.display = isVisible ? 'none' : 'flex';
    log.style.flexDirection = 'column';
    icon.style.transform = isVisible ? '' : 'rotate(90deg)';
}

function renderKPIs() {
    // Los KPI respetan el chip de selector activo (si hay uno, se ven SUS números),
    // pero ignoran a propósito el resto de los filtros de paso (estado, depto,
    // búsqueda de texto) — aunque estés mirando solo "Proceso", acá se ve el total.
    const cat = busquedas.filter(inCategoria).filter(b => !selectorFiltroActivo || b.selector === selectorFiltroActivo);
    const total       = cat.length;
    const activas     = cat.filter(b => b.status === 'Proceso').length;
    const reabiertas  = cat.filter(b => b.reopened_from).length;
    // "En proceso" = activas + reabiertas (suma real, no reparto del mismo total:
    // reabiertas cuenta TODAS las reaperturas, estén o no en curso ahora mismo).
    const proceso     = activas + reabiertas;
    const cerradas    = cat.filter(b => b.status === 'Cerrada').length;
    const finalizadas = cat.filter(b => b.status === 'Finalizada').length;
    const vencidas    = cat.filter(b => { const d = daysDiff(b.inicio); return d > (DEMORA_LIMITE[b.nivel] || 15) && b.status === 'Proceso'; }).length;
    const alertas72   = cat.filter(alertaSectorVencido).length;
    document.getElementById('kpi-row').innerHTML = `
        <div class="kpi"><div class="kpi-num">${total}</div><div class="kpi-lbl">Total búsquedas</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--blue)">${proceso}</div><div class="kpi-lbl">En proceso</div><div class="kpi-sub">${activas} activas + ${reabiertas} reabiertas</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--green)">${cerradas}</div><div class="kpi-lbl">Cerradas</div></div>
        <div class="kpi"><div class="kpi-num" style="color:#92400e">${finalizadas}</div><div class="kpi-lbl">Finalizadas</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--red)">${vencidas}</div><div class="kpi-lbl">Fuera de plazo</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--blue)">${reabiertas}</div><div class="kpi-lbl">Reabiertas</div></div>
        <div class="kpi"><div class="kpi-num" style="color:var(--red)">${alertas72}</div><div class="kpi-lbl">Alertas 72hs sector</div></div>`;
}

// El buscador de texto usa oninput (dispara en cada tecla): con muchas búsquedas cargadas,
// recalcular filtros y re-renderizar toda la tabla en cada letra se siente lento al tipear.
// Con este pequeño debounce solo se re-renderiza ~200ms después de la última tecla.
let _applyFiltersTimer = null;
function applyFiltersDebounced() {
    clearTimeout(_applyFiltersTimer);
    _applyFiltersTimer = setTimeout(applyFilters, 200);
}

function applyFilters() {
    const sel    = selectorFiltroActivo;
    const tipo   = document.getElementById('f-tipo').value;
    const depto  = document.getElementById('f-depto').value;
    const status = document.getElementById('f-status').value;
    const reab   = document.getElementById('f-reabierta').value;
    const alerta72 = document.getElementById('f-alerta72').value;
    const search = (document.getElementById('f-search').value || '').trim().toLowerCase();
    filteredIds = busquedas
        .filter(inCategoria)
        .filter(b => {
            if (sel    && (b.selector || '') !== sel)  return false;
            if (tipo   && (b.tipo || '') !== tipo)     return false;
            if (depto  && (b.depto || '') !== depto)   return false;
            if (status && (b.status || '') !== status) return false;
            if (reab === 'si' && !b.reopened_from)     return false;
            if (reab === 'no' && b.reopened_from)      return false;
            if (alerta72 === 'si' && !alertaSectorVencido(b)) return false;
            if (search) {
                const hay = ((b.puesto || '') + ' ' + (b.depto || '') + ' ' + (b.selector || '')).toLowerCase();
                if (!hay.includes(search)) return false;
            }
            return true;
        }).map(b => b.id);
    refreshView();
}

function updateDeptoFilter() {
    const deptos = [...new Set(busquedas
        .filter(inCategoria)
        .map(b => b.depto).filter(Boolean))];
    const sel = document.getElementById('f-depto');
    const cur = sel.value;
    sel.innerHTML = '<option value="">Todos los dptos.</option>' + deptos.map(d => `<option ${d === cur ? 'selected' : ''}>${d}</option>`).join('');
}

