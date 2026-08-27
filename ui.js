// ══════════════════════════════════════════════
//  UI.JS — exportar el informe CSV, navegación entre vistas y modales.
// ══════════════════════════════════════════════
// ── INFORME ──
function renderInforme() {
    const total       = busquedas.length;
    const cerradas    = busquedas.filter(b => b.status === 'Cerrada' || b.status === 'Finalizada').length;
    const staff       = busquedas.filter(b => b.tipo === 'Staff').length;
    const fabrica     = busquedas.filter(b => b.tipo === 'Fábrica').length;
    const coberturaStaff   = staff   ? Math.round((busquedas.filter(b => b.tipo === 'Staff'   && (b.status === 'Cerrada' || b.status === 'Finalizada')).length / staff)   * 100) : 0;
    const coberturaFabrica = fabrica ? Math.round((busquedas.filter(b => b.tipo === 'Fábrica' && (b.status === 'Cerrada' || b.status === 'Finalizada')).length / fabrica) * 100) : 0;
    const conIngreso  = busquedas.filter(b => b.ingreso).length;
    const retenidos90 = busquedas.filter(b => b.ingreso && daysDiff(b.ingreso, b.fecha_baja || null) >= 90).length;
    const tasaPermanencia = conIngreso ? Math.round((retenidos90 / conIngreso) * 100) : 0;
    const alertas72   = busquedas.filter(alertaSectorVencido).length;

    // ── Antigüedad de búsquedas abiertas: de más vieja a más nueva, para saber dónde mirar primero
    //    (a diferencia de "Fuera de plazo" que es binario, esto ordena TODO lo abierto por urgencia) ──
    const abiertas = busquedas
        .filter(b => b.status === 'Proceso')
        .map(b => ({ b, dias: daysDiff(b.inicio), lim: DEMORA_LIMITE[b.nivel] || 15 }))
        .sort((a, c) => c.dias - a.dias);

    // ── Ofertas sin decisión del sector: cuello de botella real que el código ya detecta
    //    (datosIncompletos) pero que hasta ahora no se mostraba en ningún lado ──
    const ofertasSinDecision = busquedas.filter(b => (b.candidatos || []).some(c => c.estado === 'Oferta') && !b.decision_sector);

    document.getElementById('informe-content').innerHTML = `
    <div class="mini-kpi-row">
        <div class="mini-kpi"><div class="mini-kpi-num">${total}</div><div class="mini-kpi-lbl">Total búsquedas</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--green)">${cerradas}</div><div class="mini-kpi-lbl">Cerradas / Finalizadas</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--blue)">${coberturaStaff}%</div><div class="mini-kpi-lbl">Cobertura Staff (Oficina)</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--green)">${coberturaFabrica}%</div><div class="mini-kpi-lbl">Cobertura Fábrica</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--accent-dark)">${tasaPermanencia}%</div><div class="mini-kpi-lbl">Tasa de Permanencia</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--red)">${alertas72}</div><div class="mini-kpi-lbl">Alertas 72hs sector</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:${ofertasSinDecision.length ? 'var(--red)' : 'var(--green)'}">${ofertasSinDecision.length}</div><div class="mini-kpi-lbl">Ofertas sin Decisión</div></div>
    </div>
    <div class="charts-grid-2" style="margin-top:20px">
        <div class="chart-card">
            <div class="chart-card-title"><i class="fas fa-hourglass-half"></i> Antigüedad de Búsquedas Abiertas</div>
            ${abiertas.length ? `
            <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
                <thead><tr>${['N°', 'Puesto', 'Selector', 'Días háb.', 'Límite'].map(h => `<th style="padding:8px 10px;font-family:'DM Mono',monospace;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);text-align:left">${h}</th>`).join('')}</tr></thead>
                <tbody>${abiertas.slice(0, 10).map(({ b, dias, lim }, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg)' : 'transparent'}">
                    <td style="padding:8px 10px;font-family:'DM Mono',monospace">${b.numero}</td>
                    <td style="padding:8px 10px">${b.puesto}</td>
                    <td style="padding:8px 10px;color:var(--muted)">${b.selector}</td>
                    <td style="padding:8px 10px;font-family:'DM Mono',monospace;font-weight:700;color:${dias > lim ? 'var(--red)' : 'var(--text)'}">${dias}hd</td>
                    <td style="padding:8px 10px;font-family:'DM Mono',monospace;color:var(--muted)">${lim}hd</td>
                </tr>`).join('')}</tbody>
            </table></div>
            ${abiertas.length > 10 ? `<div style="font-size:11px;color:var(--muted);margin-top:8px">+ ${abiertas.length - 10} más — descargá el CSV para verlas todas</div>` : ''}
            ` : `<span class="tip">No hay búsquedas en proceso</span>`}
        </div>
        <div class="chart-card">
            <div class="chart-card-title"><i class="fas fa-file-signature"></i> Ofertas sin Decisión del Sector</div>
            ${ofertasSinDecision.length ? `
            <div>${ofertasSinDecision.map(b => `<div class="bar-row"><div class="bar-row-top"><span>${b.puesto} <span style="font-size:11px;color:var(--muted)">· ${b.selector}</span></span><span style="font-size:11px;color:var(--muted)">${b.numero}</span></div></div>`).join('')}</div>
            ` : `<span class="tip">Sin ofertas pendientes de decisión</span>`}
        </div>
    </div>`;
}

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function descargarInformeCSV() {
    // Filtro opcional por selector (dropdown al lado del botón) — para exportar solo lo de
    // una persona sin tener que filtrar en Excel después de descargar todo.
    const selectorFiltro = document.getElementById('informe-selector-filter')?.value || '';
    const base = selectorFiltro ? busquedas.filter(b => b.selector === selectorFiltro) : busquedas;
    const headers = ['Número','Puesto','Departamento','Tipo','Selector','Motivo','Nivel','Estado',
        'Fecha Apertura','Enviado al Sector','Decisión del Sector','Fecha Ingreso','Ingresado','Fecha Baja',
        'Total Proceso (hd)','Total Ajustado (hd)','Candidatos Enviados','Reabierta','Alerta 72hs','Datos Incompletos'];
    const rows = base.map(b => {
        const t = tramosDemora(b);
        const ajustado = Math.max(0, t.total - descuentoJustificadoTotal(b));
        return [
            b.numero, b.puesto, b.depto, b.tipo, b.selector, b.motivo, b.nivel, b.status,
            b.inicio || '', b.cp || '', b.decision_sector || '', b.ingreso || '', b.ingreso_nombre || '', b.fecha_baja || '',
            t.total, ajustado, (b.candidatos || []).length,
            b.reopened_from ? 'Sí' : 'No', alertaSectorVencido(b) ? 'Sí' : 'No', datosIncompletos(b) ? 'Sí' : 'No'
        ];
    });
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_selecciones${selectorFiltro ? '_' + selectorFiltro.toLowerCase().replace(/\s+/g, '-') : ''}_${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Informe descargado ✓');
}

function showView(v, btn) {
    if ((v === 'stats' || v === 'charts' || v === 'analisis') && !isAdmin()) { toast('Acceso restringido a administradores', true); return; }
    // 'pipeline' usa #view-pipeline (tabla); 'choferes' usa #view-fichas (tarjetas)
    const domView = (v === 'choferes') ? 'fichas' : v;
    ['pipeline', 'fichas', 'stats', 'charts', 'analisis', 'informe'].forEach(id => document.getElementById('view-' + id).classList.toggle('hidden', id !== domView));
    document.querySelectorAll('.inline-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const titles = {
        pipeline: ['Pipeline de Selección', 'Control de búsquedas, seguimiento y feedback'],
        choferes: ['Choferes y Ayudantes', 'Fichas de postulantes a chofer y ayudante'],
        stats:    ['Estadísticas', 'Análisis de rendimiento y métricas'],
        charts:   ['Gráficos', 'Visualizaciones interactivas del pipeline'],
        analisis: ['Análisis por Selector', 'Conversión, retención, reaperturas, plazos y evolución mensual'],
        informe:  ['Informe', 'Resumen y exportación de datos para reportes']
    };
    document.getElementById('main-title').textContent = titles[v][0];
    document.getElementById('main-sub').textContent   = titles[v][1];
    const fChoferSel = document.getElementById('f-chofer-resultado');
    if (fChoferSel) fChoferSel.classList.toggle('hidden', v !== 'choferes');
    if (v === 'informe') renderInforme();
    if (v === 'pipeline' || v === 'choferes') {
        currentCategoria = (v === 'choferes') ? 'choferes' : 'general';
        filteredIds = null;
        selectorFiltroActivo = '';
        renderSelectorChips();
        ['f-tipo','f-depto','f-status','f-reabierta','f-alerta72','f-search','f-chofer-resultado'].forEach(fid => { const el = document.getElementById(fid); if (el) el.value = ''; });
        refreshView();
    }
    if (v === 'stats')    renderStats('general');
    if (v === 'charts')   { destroyCharts(); renderCharts('general'); }
    if (v === 'analisis') { destroyCharts(); renderAnalisis(); }
}
function openModal(id = 'modal-nueva') {
    document.getElementById(id).classList.remove('hidden');
}
function closeModal(id = 'modal-nueva') { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-bg').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }));

