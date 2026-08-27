// ══════════════════════════════════════════════
//  STATS-CHARTS.JS — pestañas de Estadísticas y Gráficos (solo admin).
// ══════════════════════════════════════════════
// ── STATS ──
function switchStatsTab(tab, btn) {
    document.querySelectorAll('#view-stats .page-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); renderStats(tab);
}
function renderStats(tab) {
    const subset = tab === 'general' ? busquedas : busquedas.filter(b => b.tipo === (tab === 'staff' ? 'Staff' : 'Fábrica'));
    const total = subset.length || 1;
    const bySelector = {};
    subset.forEach(b => {
        if (!bySelector[b.selector]) bySelector[b.selector] = { total: 0, cerradas: 0, dias: [] };
        bySelector[b.selector].total++;
        if (b.status === 'Cerrada' || b.status === 'Finalizada') bySelector[b.selector].cerradas++;
        bySelector[b.selector].dias.push(b.cp ? daysDiff(b.inicio, b.cp) : (b.ingreso ? daysDiff(b.inicio, b.ingreso) : daysDiff(b.inicio)));
    });
    const byDepto  = {}; subset.forEach(b => { byDepto[b.depto]   = (byDepto[b.depto]   || 0) + 1; });
    const byStatus = {}; subset.forEach(b => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
    const psicoBySelector = {};
    subset.forEach(b => b.psicotecnicos.forEach(p => {
        const k = p.selector_psico || '(sin asignar)';
        if (!psicoBySelector[k]) psicoBySelector[k] = { total: 0, apto: 0, noApto: 0 };
        psicoBySelector[k].total++;
        if (p.resultado === 'Apto') psicoBySelector[k].apto++;
        if (p.resultado === 'No Apto') psicoBySelector[k].noApto++;
    }));
    const totalPsicoSub = subset.reduce((a, b) => a + b.psicotecnicos.length, 0);
    const selectorHtml = Object.entries(bySelector).map(([name, d]) => {
        const p   = Math.round((d.cerradas / Math.max(d.total, 1)) * 100);
        const avg = d.dias.length ? Math.round(d.dias.reduce((a, b) => a + b, 0) / d.dias.length) : 0;
        return `<div class="bar-row"><div class="bar-row-top"><span>${name}</span><span>${d.cerradas}/${d.total} cerradas · ⌀ ${avg}hd</span></div><div class="bar-track"><div class="bar-fill ${tab === 'staff' ? 'bar-fill-staff' : tab === 'fabrica' ? 'bar-fill-fab' : ''}" style="width:${p}%"></div></div></div>`;
    }).join('');
    const deptoHtml = Object.entries(byDepto).map(([name, c]) => {
        const p = Math.round((c / total) * 100);
        return `<div class="bar-row"><div class="bar-row-top"><span>${name}</span><span>${c} (${p}%)</span></div><div class="bar-track"><div class="bar-fill" style="width:${p}%"></div></div></div>`;
    }).join('');
    const statusHtml = Object.entries(byStatus).map(([s, c]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px">
            <span class="tag ${tagClass(s)}">${s}</span>
            <span style="font-family:'DM Mono',monospace;font-weight:600;font-size:15px">${c}</span>
        </div>`).join('');
    const psicoSelHtml = Object.entries(psicoBySelector).length > 0
        ? Object.entries(psicoBySelector).sort((a, b) => b[1].total - a[1].total).map(([sel, d]) => {
            const p = Math.round((d.total / Math.max(totalPsicoSub, 1)) * 100);
            return `<div class="bar-row"><div class="bar-row-top"><span>${sel}</span><span>${d.total} psico · ${d.apto} aptos · ${d.noApto} no aptos</span></div><div class="bar-track"><div class="bar-fill bar-fill-staff" style="width:${p}%"></div></div></div>`;
        }).join('')
        : '<span class="tip">Sin datos de psicotécnicos asignados</span>';
    document.getElementById('stats-content').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-card-title">Rendimiento por Selector</div>${selectorHtml || '<span class="tip">Sin datos</span>'}</div>
            <div class="stat-card"><div class="stat-card-title">Por Departamento</div>${deptoHtml || '<span class="tip">Sin datos</span>'}</div>
            <div class="stat-card"><div class="stat-card-title">Por Estado</div>${statusHtml || '<span class="tip">Sin datos</span>'}</div>
            <div class="stat-card"><div class="stat-card-title"><i class="fas fa-brain" style="margin-right:5px;color:var(--blue)"></i>Psicotécnicos por Selector</div>${psicoSelHtml}</div>
            <div class="stat-card"><div class="stat-card-title">Resumen General</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div style="text-align:center;padding:14px;background:var(--bg);border-radius:8px"><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800">${subset.length}</div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-top:2px">Búsquedas</div></div>
                    <div style="text-align:center;padding:14px;background:var(--bg);border-radius:8px"><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--green)">${subset.filter(b => b.status === 'Cerrada' || b.status === 'Finalizada').length}</div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-top:2px">Cerradas/Fin.</div></div>
                    <div style="text-align:center;padding:14px;background:var(--bg);border-radius:8px"><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--blue)">${subset.filter(b => b.status === 'Proceso').length}</div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-top:2px">En Proceso</div></div>
                    <div style="text-align:center;padding:14px;background:var(--bg);border-radius:8px"><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--orange)">${subset.reduce((a, b) => a + b.candidatos.length, 0)}</div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-top:2px">Candidatos</div></div>
                    <div style="text-align:center;padding:14px;background:var(--bg);border-radius:8px"><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--blue)">${subset.reduce((a, b) => a + b.psicotecnicos.length, 0)}</div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-top:2px">Psicotécnicos</div></div>
                </div>
            </div>
        </div>`;
}

// ── GRÁFICOS ──
let chartInstances = {};
function destroyCharts() { Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch (e) {} }); chartInstances = {}; }
function switchChartsTab(tab, btn) { document.querySelectorAll('#view-charts .page-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderCharts(tab); }
function renderCharts(tab) { destroyCharts(); if (tab === 'general') renderChartsGeneral(); else if (tab === 'tiempo') renderChartsTiempo(); else if (tab === 'selectores') renderChartsSelectores(); }

function renderChartsGeneral() {
    const cerradas    = busquedas.filter(b => b.status === 'Cerrada' || b.status === 'Finalizada').length;
    const proceso     = busquedas.filter(b => b.status === 'Proceso').length;
    const pausadas    = busquedas.filter(b => b.status === 'Pausada').length;
    const finalizadas = busquedas.filter(b => b.status === 'Finalizada').length;
    const tasaCierre  = Math.round((cerradas / Math.max(busquedas.length, 1)) * 100);
    const totalCands  = busquedas.reduce((a, b) => a + b.candidatos.length, 0);
    const byStatus    = {}; busquedas.forEach(b => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
    const staff       = busquedas.filter(b => b.tipo === 'Staff').length;
    const fabrica     = busquedas.filter(b => b.tipo === 'Fábrica').length;
    const byMotivo    = {}; busquedas.forEach(b => { byMotivo[b.motivo] = (byMotivo[b.motivo] || 0) + 1; });
    const byDepto     = {}; busquedas.forEach(b => { byDepto[b.depto]   = (byDepto[b.depto]   || 0) + 1; });
    const byNivel     = {}; busquedas.forEach(b => { byNivel[b.nivel]   = (byNivel[b.nivel]   || 0) + 1; });
    const permData    = busquedas.filter(b => b.ingreso).map(b => ({
        nombre: (b.ingreso_nombre && b.ingreso_nombre.trim()) ? b.ingreso_nombre : (b.puesto || '(sin nombre)'),
        dias: daysDiff(b.ingreso, b.fecha_baja || null), puesto: b.puesto
    })).sort((a, b) => b.dias - a.dias);

    // ── Tasa de cobertura (búsquedas cerradas/finalizadas sobre el total) — Staff = personal de Oficina ──
    const coberturaStaff   = staff   ? Math.round((busquedas.filter(b => b.tipo === 'Staff'   && (b.status === 'Cerrada' || b.status === 'Finalizada')).length / staff)   * 100) : 0;
    const coberturaFabrica = fabrica ? Math.round((busquedas.filter(b => b.tipo === 'Fábrica' && (b.status === 'Cerrada' || b.status === 'Finalizada')).length / fabrica) * 100) : 0;

    // ── Tasa de permanencia: % de ingresados que llegaron a los 90 días hábiles en la empresa ──
    const conIngreso    = busquedas.filter(b => b.ingreso).length;
    const retenidos90   = busquedas.filter(b => b.ingreso && daysDiff(b.ingreso, b.fecha_baja || null) >= 90).length;
    const tasaPermanencia = conIngreso ? Math.round((retenidos90 / conIngreso) * 100) : 0;

    // ── Demora promedio por nivel (Otros / Jefe-Encargado / Gerente-Director) ──
    const NIVELES = ['Otros', 'Jefe/Encargado', 'Gerente/Director'];
    const demoraPorNivel = NIVELES.map(n => {
        const items = busquedas.filter(b => (b.nivel || 'Otros') === n);
        const dl = items.map(b => b.cp ? daysDiff(b.inicio, b.cp) : (b.ingreso ? daysDiff(b.inicio, b.ingreso) : daysDiff(b.inicio)));
        const avg = dl.length ? Math.round(dl.reduce((a, c) => a + c, 0) / dl.length) : 0;
        return { nivel: n, avg, limite: DEMORA_LIMITE[n] || 15, count: items.length };
    });

    document.getElementById('charts-content').innerHTML = `
    <div class="mini-kpi-row">
        <div class="mini-kpi"><div class="mini-kpi-num">${busquedas.length}</div><div class="mini-kpi-lbl">Total</div><div class="mini-kpi-sub">${proceso} en curso · ${pausadas} pausadas</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--green)">${tasaCierre}%</div><div class="mini-kpi-lbl">Tasa de Cierre</div><div class="mini-kpi-sub">${cerradas} de ${busquedas.length}</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--orange)">${totalCands}</div><div class="mini-kpi-lbl">Candidatos</div><div class="mini-kpi-sub">⌀ ${(totalCands / Math.max(busquedas.length, 1)).toFixed(1)} por búsqueda</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:#92400e">${finalizadas}</div><div class="mini-kpi-lbl">Finalizadas</div><div class="mini-kpi-sub">≥ 90 días háb. en empresa</div></div>
    </div>
    <div style="margin-top:20px">
        <div class="chart-card">
            <div class="chart-card-title"><i class="fas fa-bullseye"></i> Cobertura y Permanencia</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;flex-wrap:wrap">
                <div>
                    <div class="section-hdr" style="margin-bottom:8px">Tasa de cobertura (cerradas/finalizadas sobre el total)</div>
                    <div class="bar-row"><div class="bar-row-top"><span>Total</span><span>${tasaCierre}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${tasaCierre}%"></div></div></div>
                    <div class="bar-row"><div class="bar-row-top"><span>Staff (Oficina)</span><span>${coberturaStaff}%</span></div><div class="bar-track"><div class="bar-fill bar-fill-staff" style="width:${coberturaStaff}%"></div></div></div>
                    <div class="bar-row"><div class="bar-row-top"><span>Fábrica</span><span>${coberturaFabrica}%</span></div><div class="bar-track"><div class="bar-fill bar-fill-fab" style="width:${coberturaFabrica}%"></div></div></div>
                </div>
                <div style="text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center">
                    <div style="font-family:'Syne',sans-serif;font-size:38px;font-weight:800;color:var(--accent-dark)">${tasaPermanencia}%</div>
                    <div class="mini-kpi-lbl" style="margin-top:4px">Tasa de Permanencia</div>
                    <div class="mini-kpi-sub">${retenidos90} de ${conIngreso} ingresos llegaron a 90 días háb.</div>
                </div>
            </div>
        </div>
    </div>
    <div class="charts-grid-2" style="margin-top:20px">
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-tag"></i> Por Motivo</div><div class="chart-wrap-sm"><canvas id="ch-motivo"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-layer-group"></i> Por Nivel</div><div class="chart-wrap-sm"><canvas id="ch-nivel"></canvas></div></div>
    </div>
    <div style="margin-top:20px">
        <div class="chart-card">
            <div class="chart-card-title"><i class="fas fa-stopwatch"></i> Demora Promedio por Nivel del Puesto (días hábiles)</div>
            <div class="chart-wrap"><canvas id="ch-demora-nivel"></canvas></div>
        </div>
    </div>
    <div style="margin-top:20px">
        <div class="chart-card">
            <details id="perm-details" ${permData.length > 0 && permData.length <= 8 ? 'open' : ''} ontoggle="if(this.open && chartInstances['perm']) setTimeout(()=>chartInstances['perm'].resize(),50)">
                <summary style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">
                    <i class="fas fa-chevron-right"></i> <i class="fas fa-user-clock"></i> Permanencia por Persona (días hábiles en empresa) · ${permData.length} ingresos
                </summary>
                <div style="margin-top:14px">
                ${permData.length > 0
                    ? `<div style="position:relative;height:${Math.max(180, permData.length * 28)}px"><canvas id="ch-perm"></canvas></div>`
                    : `<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Sin ingresos registrados aún</div>`}
                </div>
            </details>
        </div>
    </div>`;

    const palette = ['#161b24','#005f73','#2d6a4f','#ca6702','#9b2226','#b5a300','#4a1272','#0a367a'];
    const cd = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 }, color: '#161b24' } } } };
    const MOTIVO_COLORS = { 'Expansión': '#cfe2ff', 'Rotación': '#ffd6a5', 'SOV': '#e2d6f5', 'Reemplazo': '#d8f3dc' };
    chartInstances['motivo'] = new Chart(document.getElementById('ch-motivo'), { type: 'doughnut', data: { labels: Object.keys(byMotivo), datasets: [{ data: Object.values(byMotivo), backgroundColor: Object.keys(byMotivo).map(m => MOTIVO_COLORS[m] || '#d8f3dc'), borderWidth: 2 }] }, options: { ...cd, cutout: '55%' } });
    chartInstances['nivel']  = new Chart(document.getElementById('ch-nivel'),  { type: 'bar', data: { labels: Object.keys(byNivel), datasets: [{ label: 'Cantidad', data: Object.values(byNivel), backgroundColor: ['#ca6702cc','#005f73cc','#9b2226cc'], borderRadius: 6 }] }, options: { ...cd, plugins: { legend: { display: false } }, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } } });
    chartInstances['demoraNivel'] = new Chart(document.getElementById('ch-demora-nivel'), { type: 'bar', data: { labels: demoraPorNivel.map(d => `${d.nivel} (${d.count})`), datasets: [
        { label: 'Demora promedio (hd)', data: demoraPorNivel.map(d => d.avg), backgroundColor: demoraPorNivel.map(d => d.avg > d.limite ? '#9b2226cc' : '#2d6a4fcc'), borderColor: demoraPorNivel.map(d => d.avg > d.limite ? '#9b2226' : '#2d6a4f'), borderWidth: 2, borderRadius: 6 },
        { label: 'Límite (hd)', data: demoraPorNivel.map(d => d.limite), backgroundColor: '#7a716633', borderColor: '#7a7166', borderWidth: 2, borderRadius: 6 }
    ] }, options: { ...cd, plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
    if (permData.length > 0) {
        const permColors = permData.map(p => p.dias >= 130 ? '#2d6a4f' : p.dias >= 65 ? '#005f73' : p.dias >= 22 ? '#ca6702' : '#9b2226');
        chartInstances['perm'] = new Chart(document.getElementById('ch-perm'), { type: 'bar', data: { labels: permData.map(p => p.nombre), datasets: [{ label: 'Días hábiles en empresa', data: permData.map(p => p.dias), backgroundColor: permColors.map(c => c + 'cc'), borderColor: permColors, borderWidth: 2, borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => { const p = permData[ctx.dataIndex]; const m = p.dias >= 130 ? ' 🏆 6m+' : p.dias >= 65 ? ' ✓ 3m+' : p.dias >= 22 ? ' 1m+' : ''; return ` ${p.dias} días háb. en empresa${m}`; }, afterLabel: ctx => ` Puesto: ${permData[ctx.dataIndex].puesto}` } } }, scales: { x: { beginAtZero: true, ticks: { precision: 0, font: { family: 'DM Mono', size: 10 } }, grid: { color: '#e5e0d8' } }, y: { ticks: { font: { family: 'DM Sans', size: 11 } }, grid: { display: false } } } } });
    }
}

function renderChartsTiempo() {
    const cerradas = busquedas.filter(b => (b.status === 'Cerrada' || b.status === 'Finalizada') && b.ingreso);
    const diasList = cerradas.map(b => daysDiff(b.inicio, b.ingreso));
    const avgDias  = diasList.length ? Math.round(diasList.reduce((a, c) => a + c, 0) / diasList.length) : 0;
    const minDias  = diasList.length ? Math.min(...diasList) : 0;
    const maxDias  = diasList.length ? Math.max(...diasList) : 0;
    const rangos   = { '0–7hd': 0, '8–14hd': 0, '15–22hd': 0, '23–30hd': 0, '+30hd': 0 };
    diasList.forEach(d => { if (d <= 7) rangos['0–7hd']++; else if (d <= 14) rangos['8–14hd']++; else if (d <= 22) rangos['15–22hd']++; else if (d <= 30) rangos['23–30hd']++; else rangos['+30hd']++; });
    const bySel = {};
    cerradas.forEach(b => { if (!bySel[b.selector]) bySel[b.selector] = []; bySel[b.selector].push(daysDiff(b.inicio, b.ingreso)); });
    const selAvg = Object.entries(bySel).map(([s, d]) => ({ sel: s, avg: Math.round(d.reduce((a, c) => a + c, 0) / d.length) })).sort((a, b) => a.avg - b.avg);
    const byNivel = {};
    cerradas.forEach(b => { if (!byNivel[b.nivel]) byNivel[b.nivel] = []; byNivel[b.nivel].push(daysDiff(b.inicio, b.ingreso)); });
    const nivelAvg = Object.entries(byNivel).map(([n, d]) => ({ nivel: n, avg: Math.round(d.reduce((a, c) => a + c, 0) / d.length), limite: DEMORA_LIMITE[n] || 15 }));

    // ── % de búsquedas cerradas dentro de plazo vs excedidas ──
    const enTiempo    = cerradas.filter(b => daysDiff(b.inicio, b.ingreso) <= (DEMORA_LIMITE[b.nivel] || 15)).length;
    const excedidas   = cerradas.length - enTiempo;
    const pctEnTiempo = cerradas.length ? Math.round((enTiempo / cerradas.length) * 100) : 0;

    // ── Demora: cuánto tardó el equipo de Selección (envío al sector) vs el cliente interno (decisión del sector), por selector ──
    const bySelDemora = {};
    busquedas.forEach(b => {
        const t = tramosDemora(b);
        if (t.t2NA) return;
        if (!bySelDemora[b.selector]) bySelDemora[b.selector] = { t1: [], t2: [] };
        if (!t.t1Run) bySelDemora[b.selector].t1.push(t.t1);
        if (!t.t2Run) bySelDemora[b.selector].t2.push(t.t2);
    });
    const demoraEquipoCliente = Object.entries(bySelDemora).map(([sel, d]) => ({
        sel,
        equipo:  d.t1.length ? Math.round(d.t1.reduce((a, c) => a + c, 0) / d.t1.length) : 0,
        cliente: d.t2.length ? Math.round(d.t2.reduce((a, c) => a + c, 0) / d.t2.length) : 0
    }));

    document.getElementById('charts-content').innerHTML = `
    <div class="mini-kpi-row">
        <div class="mini-kpi"><div class="mini-kpi-num">${avgDias}hd</div><div class="mini-kpi-lbl">Tiempo promedio</div><div class="mini-kpi-sub">${cerradas.length} búsquedas cerradas</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--green)">${minDias}hd</div><div class="mini-kpi-lbl">Más rápida</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--red)">${maxDias}hd</div><div class="mini-kpi-lbl">Más lenta</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--orange)">${busquedas.filter(b => { const d = daysDiff(b.inicio); return d > (DEMORA_LIMITE[b.nivel] || 15) && b.status === 'Proceso'; }).length}</div><div class="mini-kpi-lbl">Fuera de plazo</div></div>
        <div class="mini-kpi"><div class="mini-kpi-num" style="color:var(--green)">${pctEnTiempo}%</div><div class="mini-kpi-lbl">Cerradas en tiempo</div><div class="mini-kpi-sub">${enTiempo} en tiempo · ${excedidas} excedidas</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px;padding:6px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;display:inline-block">
        <i class="fas fa-info-circle"></i> Todos los tiempos expresados en <strong>días hábiles (hd)</strong> — lunes a viernes
    </div>
    <div class="charts-grid">
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-clock"></i> Distribución de Tiempos de Cierre (días hábiles)</div><div class="chart-wrap"><canvas id="ch-dist"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-user-clock"></i> Tiempo Prom. por Selector (días hábiles)</div><div class="chart-wrap"><canvas id="ch-seltime"></canvas></div></div>
        <div class="chart-card full"><div class="chart-card-title"><i class="fas fa-layer-group"></i> Tiempo Real vs Límite por Nivel (días hábiles)</div><div class="chart-wrap"><canvas id="ch-nivellib"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-check-double"></i> % En Tiempo vs Excedidas</div><div class="chart-wrap-sm"><canvas id="ch-entiempo"></canvas></div></div>
        <div class="chart-card full"><div class="chart-card-title"><i class="fas fa-people-arrows"></i> Demora: Equipo (envío al sector) vs Cliente Interno (decisión del sector)</div><div class="chart-wrap"><canvas id="ch-equipocliente"></canvas></div></div>
    </div>
    <div style="margin-top:20px"><div class="chart-card"><div class="chart-card-title"><i class="fas fa-list-ol"></i> Ranking más rápidas</div>
    <div>${cerradas.sort((a, b) => daysDiff(a.inicio, a.ingreso) - daysDiff(b.inicio, b.ingreso)).slice(0, 6).map((b, i) => { const d = daysDiff(b.inicio, b.ingreso); const lim = DEMORA_LIMITE[b.nivel] || 15; return `<div class="rank-row"><span class="rank-pos">#${i + 1}</span><span class="rank-name">${b.puesto} <span style="font-size:11px;color:var(--muted)">· ${b.selector}</span></span><span class="rank-stat" style="color:${d <= lim ? 'var(--green)' : 'var(--red)'}">${d}hd</span><span style="font-size:11px;color:var(--muted);margin-left:6px">lim. ${lim}hd</span></div>`; }).join('')}</div>
    </div></div>`;
    chartInstances['dist']     = new Chart(document.getElementById('ch-dist'),     { type: 'bar', data: { labels: Object.keys(rangos), datasets: [{ label: 'Búsquedas', data: Object.values(rangos), backgroundColor: ['#d1e7dd','#cfe2ff','#fff3cd','#ffd6a5','#f8d7da'], borderColor: ['#0a3622','#0a367a','#664d03','#7c3d00','#721c24'], borderWidth: 2, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
    chartInstances['seltime']  = new Chart(document.getElementById('ch-seltime'),  { type: 'bar', data: { labels: selAvg.map(s => s.sel), datasets: [{ label: 'Días háb. promedio', data: selAvg.map(s => s.avg), backgroundColor: selAvg.map(s => s.avg > 14 ? '#f8d7da' : '#d1e7dd'), borderColor: selAvg.map(s => s.avg > 14 ? '#721c24' : '#0a3622'), borderWidth: 2, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
    chartInstances['nivellib'] = new Chart(document.getElementById('ch-nivellib'), { type: 'bar', data: { labels: nivelAvg.map(n => n.nivel), datasets: [{ label: 'Tiempo real (hd)', data: nivelAvg.map(n => n.avg), backgroundColor: '#005f73cc', borderRadius: 4 }, { label: 'Límite establecido (hd)', data: nivelAvg.map(n => n.limite), backgroundColor: '#9b222633', borderColor: '#9b2226', borderWidth: 2, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
    chartInstances['entiempo'] = new Chart(document.getElementById('ch-entiempo'), { type: 'doughnut', data: { labels: ['En tiempo', 'Excedidas'], datasets: [{ data: [enTiempo, excedidas], backgroundColor: ['#2d6a4fcc', '#9b2226cc'], borderColor: ['#2d6a4f', '#9b2226'], borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 } } } } } });
    chartInstances['equipocliente'] = new Chart(document.getElementById('ch-equipocliente'), { type: 'bar', data: { labels: demoraEquipoCliente.map(d => d.sel), datasets: [
        { label: 'Equipo (envío al sector)', data: demoraEquipoCliente.map(d => d.equipo), backgroundColor: '#005f73cc', borderColor: '#005f73', borderWidth: 2, borderRadius: 6 },
        { label: 'Cliente interno (decisión del sector)', data: demoraEquipoCliente.map(d => d.cliente), backgroundColor: '#ca6702cc', borderColor: '#ca6702', borderWidth: 2, borderRadius: 6 }
    ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
}

function renderChartsSelectores() {
    const data = {};
    SELECTORES.forEach(s => { data[s] = { total: 0, cerradas: 0, proceso: 0, candidatos: 0, psico: 0, psico_realizado: 0, dias: [] }; });
    busquedas.forEach(b => {
        if (!data[b.selector]) return;
        data[b.selector].total++;
        if (b.status === 'Cerrada' || b.status === 'Finalizada') { data[b.selector].cerradas++; if (b.ingreso) data[b.selector].dias.push(daysDiff(b.inicio, b.ingreso)); }
        if (b.status === 'Proceso') data[b.selector].proceso++;
        data[b.selector].candidatos += b.candidatos.length;
        data[b.selector].psico += b.psicotecnicos.length;
        b.psicotecnicos.forEach(p => { if (p.selector_psico && data[p.selector_psico]) data[p.selector_psico].psico_realizado++; });
    });
    const activos      = SELECTORES.filter(s => data[s].total > 0);
    const avgDiasPerSel = activos.map(s => data[s].dias.length ? Math.round(data[s].dias.reduce((a, c) => a + c, 0) / data[s].dias.length) : 0);
    document.getElementById('charts-content').innerHTML = `
    <div class="mini-kpi-row">${activos.map(s => `<div class="mini-kpi"><div class="mini-kpi-num">${data[s].total}</div><div class="mini-kpi-lbl">${s}</div><div class="mini-kpi-sub">${data[s].cerradas} cerradas · ${data[s].proceso} en curso</div></div>`).join('')}</div>
    <div class="charts-grid">
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-briefcase"></i> Búsquedas por Selector</div><div class="chart-wrap"><canvas id="ch-seltotal"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-check-circle"></i> Tasa de Cierre</div><div class="chart-wrap"><canvas id="ch-seltasa"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-users"></i> Candidatos enviados</div><div class="chart-wrap"><canvas id="ch-selcand"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-brain"></i> Psicotécnicos realizados</div><div class="chart-wrap"><canvas id="ch-selpsico"></canvas></div></div>
    </div>
    <div style="margin-top:20px"><div class="chart-card full"><div class="chart-card-title"><i class="fas fa-table"></i> Panel comparativo</div>
        <div style="overflow-x:auto"><table style="width:100%;min-width:700px;border-collapse:collapse">
            <thead><tr>${['Selector','Total','Cerradas','En proceso','Candidatos','Psico en búsqueda','Psico realizados','⌀ días háb. cierre'].map(h => `<th style="padding:10px 14px;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);text-align:left">${h}</th>`).join('')}</tr></thead>
            <tbody>${activos.map((s, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg)' : 'transparent'}">
                <td style="padding:10px 14px;font-weight:700">${s}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace">${data[s].total}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:var(--green);font-weight:700">${data[s].cerradas}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:var(--blue)">${data[s].proceso}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:var(--orange)">${data[s].candidatos}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:var(--blue)">${data[s].psico}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:var(--blue);font-weight:700">${data[s].psico_realizado || '—'}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:${avgDiasPerSel[i] > 20 ? 'var(--red)' : 'var(--green)'};font-weight:700">${avgDiasPerSel[i] || '—'}hd</td>
            </tr>`).join('')}</tbody>
        </table></div>
    </div></div>`;
    const colors = ['#161b24','#005f73','#2d6a4f','#ca6702','#9b2226'];
    const cOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'DM Mono', size: 10 } }, grid: { color: '#e5e0d8' } }, x: { ticks: { font: { family: 'DM Sans', size: 11 } }, grid: { display: false } } } };
    chartInstances['seltotal'] = new Chart(document.getElementById('ch-seltotal'), { type: 'bar', data: { labels: activos, datasets: [{ label: 'Total',          data: activos.map(s => data[s].total),          backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 2, borderRadius: 6 }] }, options: cOpts });
    chartInstances['seltasa']  = new Chart(document.getElementById('ch-seltasa'),  { type: 'bar', data: { labels: activos, datasets: [{ label: 'Tasa %',         data: activos.map(s => Math.round((data[s].cerradas / Math.max(data[s].total, 1)) * 100)), backgroundColor: activos.map(s => Math.round((data[s].cerradas / Math.max(data[s].total, 1)) * 100) > 50 ? '#d1e7ddcc' : '#fff3cdcc'), borderColor: activos.map(s => Math.round((data[s].cerradas / Math.max(data[s].total, 1)) * 100) > 50 ? '#0a3622' : '#664d03'), borderWidth: 2, borderRadius: 6 }] }, options: { ...cOpts, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, max: 100 } } } });
    chartInstances['selcand']  = new Chart(document.getElementById('ch-selcand'),  { type: 'bar', data: { labels: activos, datasets: [{ label: 'Candidatos',     data: activos.map(s => data[s].candidatos),     backgroundColor: '#ca6702cc', borderColor: '#ca6702', borderWidth: 2, borderRadius: 6 }] }, options: cOpts });
    chartInstances['selpsico'] = new Chart(document.getElementById('ch-selpsico'), { type: 'bar', data: { labels: activos, datasets: [{ label: 'Psico realizados', data: activos.map(s => data[s].psico_realizado), backgroundColor: '#005f73cc', borderColor: '#005f73', borderWidth: 2, borderRadius: 6 }] }, options: cOpts });
}

// ══════════════════════════════════════════════
//  ANÁLISIS POR SELECTOR — pestaña aparte de Gráficos/Informe para no mezclar:
//  conversión de candidatos, retención a 90 días hábiles, reaperturas, fuera
//  de plazo y alertas 72hs, todo desglosado por selector, más la evolución
//  mensual de aperturas vs ingresos efectivos.
// ══════════════════════════════════════════════
function renderAnalisis() {
    const data = {};
    SELECTORES.forEach(s => { data[s] = {
        total: 0, candidatos: 0, ofertas: 0,
        reaperturas: 0, conIngreso: 0, retenidos90: 0,
        vencidas: 0, alertas72: 0
    }; });
    busquedas.forEach(b => {
        if (!data[b.selector]) return;
        const d = data[b.selector];
        d.total++;
        d.candidatos += b.candidatos.length;
        d.ofertas += b.candidatos.filter(c => c.estado === 'Oferta').length;
        if (b.reopened_from) d.reaperturas++;
        if (b.ingreso) {
            d.conIngreso++;
            if (daysDiff(b.ingreso, b.fecha_baja || null) >= 90) d.retenidos90++;
        }
        if (b.status === 'Proceso' && daysDiff(b.inicio) > (DEMORA_LIMITE[b.nivel] || 15)) d.vencidas++;
        if (alertaSectorVencido(b)) d.alertas72++;
    });
    const activos     = SELECTORES.filter(s => data[s].total > 0);
    const conversion  = activos.map(s => data[s].candidatos ? Math.round((data[s].ofertas    / data[s].candidatos) * 100) : 0);
    const retencion   = activos.map(s => data[s].conIngreso ? Math.round((data[s].retenidos90 / data[s].conIngreso) * 100) : 0);

    // ── Evolución mensual: aperturas (inicio) vs ingresos efectivos (ingreso), últimos 12 meses ──
    const hoy = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        meses.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) });
    }
    const aperturasPorMes = {}; const ingresosPorMes = {};
    meses.forEach(m => { aperturasPorMes[m.key] = 0; ingresosPorMes[m.key] = 0; });
    busquedas.forEach(b => {
        if (b.inicio  && b.inicio.slice(0, 7)  in aperturasPorMes) aperturasPorMes[b.inicio.slice(0, 7)]++;
        if (b.ingreso && b.ingreso.slice(0, 7) in ingresosPorMes)  ingresosPorMes[b.ingreso.slice(0, 7)]++;
    });

    document.getElementById('analisis-content').innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:16px;padding:6px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;display:inline-block">
        <i class="fas fa-info-circle"></i> Conversión = candidatos con oferta / candidatos enviados. Retención = ingresos que llegaron a 90 días hábiles en la empresa. Fuera de plazo y Alertas 72hs son del momento actual.
    </div>
    <div class="charts-grid">
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-percentage"></i> Tasa de Conversión (Oferta / Candidatos enviados)</div><div class="chart-wrap"><canvas id="an-conversion"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-user-check"></i> Retención · 90 días hábiles en empresa</div><div class="chart-wrap"><canvas id="an-retencion"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-redo"></i> Reaperturas</div><div class="chart-wrap"><canvas id="an-reaperturas"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-hourglass-end"></i> Fuera de Plazo (actual)</div><div class="chart-wrap"><canvas id="an-vencidas"></canvas></div></div>
        <div class="chart-card"><div class="chart-card-title"><i class="fas fa-bell"></i> Alertas 72hs Sector</div><div class="chart-wrap"><canvas id="an-alertas"></canvas></div></div>
    </div>
    <div style="margin-top:20px"><div class="chart-card full">
        <div class="chart-card-title"><i class="fas fa-chart-line"></i> Evolución Mensual — Aperturas vs Ingresos efectivos (últimos 12 meses)</div>
        <div class="chart-wrap"><canvas id="an-evolucion"></canvas></div>
    </div></div>
    <div style="margin-top:20px"><div class="chart-card full"><div class="chart-card-title"><i class="fas fa-table"></i> Panel comparativo por Selector</div>
        <div style="overflow-x:auto"><table style="width:100%;min-width:760px;border-collapse:collapse">
            <thead><tr>${['Selector', 'Conversión', 'Retención 90d', 'Reaperturas', 'Fuera de plazo', 'Alertas 72hs'].map(h => `<th style="padding:10px 14px;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);text-align:left">${h}</th>`).join('')}</tr></thead>
            <tbody>${activos.map((s, i) => `<tr style="background:${i % 2 === 0 ? 'var(--bg)' : 'transparent'}">
                <td style="padding:10px 14px;font-weight:700">${s}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;font-weight:700;color:${!data[s].candidatos ? 'var(--muted)' : conversion[i] >= 30 ? 'var(--green)' : 'var(--red)'}">${data[s].candidatos ? conversion[i] + '%' : '—'}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;font-weight:700;color:${!data[s].conIngreso ? 'var(--muted)' : retencion[i] >= 70 ? 'var(--green)' : 'var(--red)'}">${data[s].conIngreso ? retencion[i] + '%' : '—'}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:${data[s].reaperturas > 0 ? 'var(--red)' : 'var(--muted)'}">${data[s].reaperturas}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:${data[s].vencidas > 0 ? 'var(--red)' : 'var(--muted)'}">${data[s].vencidas}</td>
                <td style="padding:10px 14px;font-family:'DM Mono',monospace;color:${data[s].alertas72 > 0 ? 'var(--red)' : 'var(--muted)'}">${data[s].alertas72}</td>
            </tr>`).join('')}</tbody>
        </table></div>
    </div></div>`;

    const cOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'DM Mono', size: 10 } }, grid: { color: '#e5e0d8' } }, x: { ticks: { font: { family: 'DM Sans', size: 11 } }, grid: { display: false } } } };
    chartInstances['anConversion']  = new Chart(document.getElementById('an-conversion'),  { type: 'bar', data: { labels: activos, datasets: [{ data: conversion, backgroundColor: conversion.map(v => v >= 30 ? '#d1e7ddcc' : '#f8d7dacc'), borderColor: conversion.map(v => v >= 30 ? '#0a3622' : '#721c24'), borderWidth: 2, borderRadius: 6 }] }, options: { ...cOpts, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, max: 100 } } } });
    chartInstances['anRetencion']   = new Chart(document.getElementById('an-retencion'),   { type: 'bar', data: { labels: activos, datasets: [{ data: retencion,  backgroundColor: retencion.map(v  => v >= 70 ? '#d1e7ddcc' : '#f8d7dacc'), borderColor: retencion.map(v  => v >= 70 ? '#0a3622' : '#721c24'), borderWidth: 2, borderRadius: 6 }] }, options: { ...cOpts, scales: { ...cOpts.scales, y: { ...cOpts.scales.y, max: 100 } } } });
    chartInstances['anReaperturas'] = new Chart(document.getElementById('an-reaperturas'), { type: 'bar', data: { labels: activos, datasets: [{ data: activos.map(s => data[s].reaperturas), backgroundColor: '#9b2226cc', borderColor: '#9b2226', borderWidth: 2, borderRadius: 6 }] }, options: cOpts });
    chartInstances['anVencidas']    = new Chart(document.getElementById('an-vencidas'),    { type: 'bar', data: { labels: activos, datasets: [{ data: activos.map(s => data[s].vencidas),    backgroundColor: '#ca6702cc', borderColor: '#ca6702', borderWidth: 2, borderRadius: 6 }] }, options: cOpts });
    chartInstances['anAlertas']     = new Chart(document.getElementById('an-alertas'),     { type: 'bar', data: { labels: activos, datasets: [{ data: activos.map(s => data[s].alertas72),   backgroundColor: '#9b2226cc', borderColor: '#9b2226', borderWidth: 2, borderRadius: 6 }] }, options: cOpts });
    chartInstances['anEvolucion']   = new Chart(document.getElementById('an-evolucion'),   { type: 'line', data: { labels: meses.map(m => m.label), datasets: [
        { label: 'Aperturas',                     data: meses.map(m => aperturasPorMes[m.key]), borderColor: '#005f73', backgroundColor: '#005f7333', borderWidth: 2, tension: 0.3, fill: true },
        { label: 'Ingresos (cierres efectivos)',  data: meses.map(m => ingresosPorMes[m.key]),  borderColor: '#2d6a4f', backgroundColor: '#2d6a4f33', borderWidth: 2, tension: 0.3, fill: true }
    ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'DM Sans', size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } } });
}
