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
    document.getElementById('informe-content').innerHTML = `
    <div class="mini-kpi-row">
        <div class="mini-kpi"><div class="mini-kpi-num">${total}</div><div class="mini-kpi-lbl">Total búsquedas</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--green)">${cerradas}</div><div class="mini-kpi-lbl">Cerradas / Finalizadas</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--blue)">${coberturaStaff}%</div><div class="mini-kpi-lbl">Cobertura Staff (Oficina)</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--green)">${coberturaFabrica}%</div><div class="mini-kpi-lbl">Cobertura Fábrica</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--accent-dark)">${tasaPermanencia}%</div><div class="mini-kpi-lbl">Tasa de Permanencia</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--red)">${alertas72}</div><div class="mini-kpi-lbl">Alertas 72hs sector</div></div>
    </div>`;
}

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function descargarInformeCSV() {
    const headers = ['Número','Puesto','Departamento','Tipo','Selector','Motivo','Nivel','Estado',
        'Fecha Apertura','Enviado al Sector','Decisión del Sector','Fecha Ingreso','Ingresado','Fecha Baja',
        'Total Proceso (hd)','Total Ajustado (hd)','Candidatos Enviados','Reabierta','Alerta 72hs','Datos Incompletos'];
    const rows = busquedas.map(b => {
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
    a.download = `informe_selecciones_${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Informe descargado ✓');
}

function showView(v, btn) {
    if ((v === 'stats' || v === 'charts') && !isAdmin()) { toast('Acceso restringido a administradores', true); return; }
    // 'pipeline' usa #view-pipeline (tabla); 'choferes' usa #view-fichas (tarjetas)
    const domView = (v === 'choferes') ? 'fichas' : v;
    ['pipeline', 'fichas', 'stats', 'charts', 'informe'].forEach(id => document.getElementById('view-' + id).classList.toggle('hidden', id !== domView));
    document.querySelectorAll('.inline-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const titles = {
        pipeline: ['Pipeline de Selección', 'Control de búsquedas, seguimiento y feedback'],
        choferes: ['Choferes y Ayudantes', 'Fichas de postulantes a chofer y ayudante'],
        stats:    ['Estadísticas', 'Análisis de rendimiento y métricas'],
        charts:   ['Gráficos', 'Visualizaciones interactivas del pipeline'],
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
    if (v === 'stats')  renderStats('general');
    if (v === 'charts') { destroyCharts(); renderCharts('general'); }
}
function openModal(id = 'modal-nueva') {
    document.getElementById(id).classList.remove('hidden');
}
function closeModal(id = 'modal-nueva') { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-bg').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }));

