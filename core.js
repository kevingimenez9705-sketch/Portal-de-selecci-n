// ══════════════════════════════════════════════
//  CORE.JS — estado global, sesión/login, carga de datos desde Supabase,
//  alcance por selector y utilidades de fechas/días hábiles.
// ══════════════════════════════════════════════


// Búsqueda en Proceso con al menos un candidato "Enviado al área" hace 3+ días hábiles sin respuesta
// (descontando los días hábiles justificados que no dependen del equipo).
function alertaSectorVencido(b) {
    if (b.status !== 'Proceso') return false;
    return (b.candidatos || []).some(c => {
        if (c.estado !== 'Enviado' || !c.fecha_envio) return false;
        const d = Math.max(0, daysDiff(c.fecha_envio) - (c.demora_descuento_dias || 0));
        return d >= ALERTA_SECTOR_LIMITE_HD;
    });
}

// Búsquedas con datos que ensucian el informe: se cerraron sin fecha de ingreso, o tienen un
// candidato con oferta pero la búsqueda todavía no tiene "Decisión del sector" cargada.
function datosIncompletos(b) {
    if ((b.status === 'Cerrada' || b.status === 'Finalizada') && !b.ingreso) return true;
    if ((b.candidatos || []).some(c => c.estado === 'Oferta') && !b.decision_sector) return true;
    return false;
}
function verifEnCurso(r) { return VERIF_EN_CURSO.includes(r); }
let busquedas = [];
let unassignedCandidatos = [];
let filteredIds = null;
let currentCategoria = 'general';
let currentProfile = null;
let nroSeq = 1;
// Selector activo en el filtro de la barra (los chips clickeables), o '' = "Todos".
// Es un filtro más, como el de estado o departamento — no identifica quién usa
// el panel (todo el equipo entra con la misma cuenta), solo acota qué se ve.
let selectorFiltroActivo = '';

// true cuando se entró "aislado" a la info de un solo selector (clic en su
// foto en la landing). Todo el equipo comparte el mismo login — esto no es un
// permiso por persona, es solo un modo de pantalla: mientras está activo se
// ve nada más lo de ese selector y se ocultan los chips de los demás y el
// panel general (Estadísticas/Gráficos/Análisis/Informe). Se sale con el
// botón "Ver panel general" y vuelve todo a la vista de siempre, sin filtrar.
let vistaAislada = false;

function isAdmin() { return currentProfile?.rol === 'admin'; }
function today() { return new Date().toISOString().slice(0, 10); }

// Soledad (jefa de Selección Staff) ve su Pipeline/Fichas igual que cualquier
// selector (acotado a lo suyo), pero además es la única que puede ver los
// totales del equipo (Estadísticas/Gráficos/Informe) aunque esté en vista
// aislada — el resto del equipo solo ve esos paneles generales fuera de la
// vista aislada.
function esVistaSoledad() { return vistaAislada && selectorFiltroActivo === 'Soledad'; }

// Muestra/oculta los chips, el botón de salida y las pestañas de panel general
// según el modo actual. Se llama al entrar al dashboard, al entrar/salir de
// la vista aislada, y al loguearse (por si cambió el rol admin).
function aplicarVisibilidadPanelGeneral() {
    const esAdmin = isAdmin();
    const esSoledad = esVistaSoledad();
    const chipsBox = document.getElementById('selector-chips');
    const salirBtn = document.getElementById('salir-vista-aislada');
    if (chipsBox) chipsBox.classList.toggle('hidden', vistaAislada);
    if (salirBtn) salirBtn.classList.toggle('hidden', !vistaAislada);
    // Estadísticas y Gráficos ya eran solo-admin de antes; acá se agrega la
    // excepción de Soledad, que los ve también en su vista aislada.
    ['nav-stats', 'nav-charts'].forEach(id => {
        document.getElementById(id)?.classList.toggle('hidden', (vistaAislada && !esSoledad) || !esAdmin);
    });
    // Análisis por Selector queda afuera de la excepción: es el detalle de
    // rendimiento de cada selector, no un total, y no fue pedido para Soledad.
    document.getElementById('nav-analisis')?.classList.toggle('hidden', vistaAislada || !esAdmin);
    // Informe (resumen + descarga CSV de todas las búsquedas) no es solo-admin,
    // pero también se abre para Soledad en su vista aislada.
    document.getElementById('nav-informe')?.classList.toggle('hidden', vistaAislada && !esSoledad);
}

// ══════════════════════════════════════════════
//  CHIPS DE SELECTOR — filtro por nombre con un clic, directo en la barra
// ══════════════════════════════════════════════
// Dibuja "Todos" + un botón por cada SELECTORES en la barra de filtros. Un
// solo lugar de origen de la lista (antes estaba repetida a mano en varios
// <select> del HTML).
function renderSelectorChips() {
    const box = document.getElementById('selector-chips');
    if (!box) return;
    box.innerHTML = ['', ...SELECTORES].map(s => {
        const activo = s === selectorFiltroActivo;
        // "Todos" queda con el estilo neutro por defecto (ver .selector-chip en el CSS);
        // cada selector usa el mismo color que su tarjeta en la landing (SELECTOR_COLORS),
        // así se distingue del fondo, del resto de los filtros y de los demás selectores.
        const color = s ? SELECTOR_COLORS[s] : null;
        // Sin color (chip "Todos") no se pone el atributo style: así el CSS puede
        // distinguir con :not([style]) el chip neutro de los que tienen color propio.
        const styleAttr = color
            ? ` style="${activo ? `background:${color};border-color:${color};color:#fff;`
                                 : `background:${color}1a;border-color:${color}66;color:${color};`}"`
            : '';
        return `<button class="selector-chip${activo ? ' active' : ''}"${styleAttr} onclick="filtrarPorSelector('${s}')">${s || 'Todos'}</button>`;
    }).join('');
}
// Filtra el Pipeline (y las fichas de Choferes/Ayudantes) por selector con un
// clic — se comporta exactamente igual que cualquier otro filtro de la barra.
// (Los chips están ocultos en vista aislada, pero el guard queda por las dudas.)
function filtrarPorSelector(nombre) {
    if (vistaAislada) return;
    selectorFiltroActivo = nombre;
    renderSelectorChips();
    applyFilters(); // ya llama refreshView()
}
renderSelectorChips(); // los chips no dependen de datos: se dibujan apenas carga el script

// Entra a la vista aislada de un selector (clic en su foto en la landing):
// deja el Pipeline/Fichas fijos en su nombre y oculta chips + panel general.
function entrarVistaAislada(nombre) {
    vistaAislada = true;
    selectorFiltroActivo = nombre;
    aplicarVisibilidadPanelGeneral();
    applyFilters();
}

// Botón "Volver a selección": sale de la vista aislada y vuelve a la landing
// (elegir selector), en vez de quedarse adentro con todo sin filtrar.
function salirVistaAislada() {
    vistaAislada = false;
    selectorFiltroActivo = '';
    showHome();
}

// Evita que el scroll del mouse sobre un input de fecha/número (foco activo) modifique
// su valor "de arriba" sin que el usuario se dé cuenta (ej: año 2026 -> 0202 al scrollear).
document.addEventListener('wheel', function (e) {
    const el = e.target;
    if (el && el.tagName === 'INPUT' && (el.type === 'date' || el.type === 'number') && document.activeElement === el) {
        e.preventDefault();
    }
}, { passive: false });

// Chequeo de sanidad para no guardar fechas con año inválido (ej: incompletas por scroll
// accidental o edición a medio terminar del input nativo de fecha).
function fechaValida(val) {
    if (!val) return true;
    const m = /^(\d{4})-\d{2}-\d{2}$/.exec(val);
    if (!m) return true; // no tiene forma de fecha ISO, se deja pasar (no es este chequeo)
    const anio = +m[1];
    return anio >= 2000 && anio <= 2100;
}

let toastTimer;
function toast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.className = '', isError ? 6000 : 3000);
}

// ══════════════════════════════════════════════
//  DÍAS HÁBILES
// ══════════════════════════════════════════════
function workingDaysDiff(from, to = null) {
    if (!from || !fechaValida(from) || (to && !fechaValida(to))) return 0;
    const start = new Date(from + 'T00:00:00');
    const end   = to ? new Date(to + 'T00:00:00') : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    // Cálculo directo (sin iterar día por día): una fecha con año corrupto puede colar
    // como Date válida aunque el salto sea de miles de años — iterar uno por uno ahí
    // cuelga la pestaña entera (justo lo que pasaba). Con esta cuenta es siempre O(1).
    const MS_DIA = 86400000;
    const totalDias = Math.round((end - start) / MS_DIA);
    if (totalDias > 200000) return 0; // ~550 años: dato corrupto, no una demora real
    const count = Math.floor(totalDias / 7) * 5;
    let dow = (start.getDay() + 1) % 7; // primer día después de "start"
    let extra = 0;
    for (let i = 0; i < totalDias % 7; i++) {
        if (dow !== 0 && dow !== 6) extra++;
        dow = (dow + 1) % 7;
    }
    return count + extra;
}
function daysDiff(from, to = null) { return workingDaysDiff(from, to); }

// ══════════════════════════════════════════════
//  TRAMOS DE DEMORA (en días hábiles)
//  T1 · Selección : apertura (inicio) → enviado al sector (cp)
//                   ↳ el contador principal (badge) se FRENA en este punto
//  T2 · Sector    : enviado al sector (cp) → cierre/ingreso (o corriendo)
//  Total = T1 + T2  (demora real de punta a punta)
// ══════════════════════════════════════════════
function tramosDemora(b) {
    let t1, t1Run = false;
    let t2 = 0, t2Run = false, t2NA = false;
    let t3 = 0, t3Run = false, t3NA = false;
    const t1From = b.inicio;
    let t1To = null, t2From = b.cp || null, t2To = null, t3From = b.decision_sector || null, t3To = null;

    // ── Tramo 1: cuánto tardó Selección en enviar el perfil al sector ──
    if (b.cp) {
        t1 = daysDiff(b.inicio, b.cp);          // frenado: ya se envió al sector
        t1To = b.cp;
    } else if (b.ingreso) {
        t1 = daysDiff(b.inicio, b.ingreso);     // se cerró sin registrar el envío
        t1To = b.ingreso;
    } else {
        t1 = daysDiff(b.inicio);                // sigue corriendo: todavía no se envió
        t1Run = true;
    }

    // ── Tramo 2: cuánto tardó el sector en decidir (aprobar o rechazar) el perfil ──
    if (b.cp) {
        if (b.decision_sector) {
            t2 = daysDiff(b.cp, b.decision_sector);   // frenado: el sector ya decidió
            t2To = b.decision_sector;
        } else if (b.ingreso) {
            t2 = daysDiff(b.cp, b.ingreso);            // compatibilidad: sin fecha de decisión cargada, se usa el ingreso
            t2To = b.ingreso;
        } else {
            t2 = daysDiff(b.cp);                        // sigue corriendo: el sector evalúa
            t2Run = true;
        }
    } else {
        t2NA = true;                                    // todavía no se envió al sector
    }

    // ── Tramo 3: espera entre la decisión del sector y el inicio real de tareas (ingreso) ──
    if (b.decision_sector) {
        if (b.ingreso) {
            t3 = daysDiff(b.decision_sector, b.ingreso); // frenado: ya ingresó
            t3To = b.ingreso;
        } else {
            t3 = daysDiff(b.decision_sector);            // sigue corriendo: esperando el inicio
            t3Run = true;
        }
    } else {
        t3NA = true;                                     // todavía no se registró la decisión del sector
    }

    return { t1, t1Run, t1From, t1To, t2, t2Run, t2NA, t2From, t2To, t3, t3Run, t3NA, t3From, t3To, total: (t1 || 0) + (t2 || 0) + (t3 || 0) };
}

// Muestra de qué fecha a qué fecha se está contando, para que el "Xhd" se entienda de un vistazo.
function fmtRango(from, to, running) {
    if (!from) return '';
    const f = fmtFechaCorta(from);
    if (running) return `${f} → hoy`;
    if (!to) return f;
    return `${f} → ${fmtFechaCorta(to)}`;
}

// Suma los días hábiles justificados (descontados) de todos los candidatos de la búsqueda.
function descuentoJustificadoTotal(b) {
    return (b.candidatos || []).reduce((a, c) => a + (c.demora_descuento_dias || 0), 0);
}

function renderDemoraBreakdown(b) {
    const t = tramosDemora(b);
    const live = run => run ? `<i class="fas fa-circle dm-live"></i>` : '';
    const t2val = t.t2NA ? '—' : t.t2;
    const t3val = t.t3NA ? '—' : t.t3;
    const descuentoTotal = descuentoJustificadoTotal(b);
    const totalAjustado = Math.max(0, t.total - descuentoTotal);
    // Compatibilidad: si no se cargó "Decisión del sector" pero sí hay ingreso, el tramo 2 usa el ingreso como aproximación.
    const t2Aprox = !b.decision_sector && b.cp && b.ingreso;
    const rango1 = fmtRango(t.t1From, t.t1To, t.t1Run);
    const rango2raw = t.t2NA ? 'Sin enviar al sector todavía' : fmtRango(t.t2From, t.t2To, t.t2Run);
    const rango2 = t2Aprox ? `${rango2raw} (aprox., sin fecha de decisión cargada)` : rango2raw;
    const rango3 = t.t3NA
        ? (b.ingreso ? `Ingresó el ${fmtFechaCorta(b.ingreso)} — cargá "Decisión del sector" para medir esta espera` : 'Sin fecha de decisión del sector todavía')
        : fmtRango(t.t3From, t.t3To, t.t3Run);
    return `
    <div class="demora-bd">
        <div class="dm-row" title="Días hábiles desde la apertura hasta enviar el perfil al sector${t.t1Run ? ' (en curso · aún sin enviar)' : ''}">
            <span class="dm-ico" style="color:var(--blue)"><i class="fas fa-paper-plane"></i></span>
            <div class="dm-body">
                <span class="dm-val">${t.t1}<span class="dm-u">hd</span>${live(t.t1Run)}</span>
                <span class="dm-lbl">Envío al sector</span>
                ${rango1 ? `<span class="dm-rango">${rango1}</span>` : ''}
            </div>
        </div>
        <div class="dm-row" title="${t.t2NA ? 'Aún no se envió el perfil al sector' : (t2Aprox ? 'No se cargó la fecha de "Decisión del sector": se usa la fecha de ingreso como aproximación' : 'Días hábiles que tardó el sector en decidir (aprobar o rechazar) el perfil' + (t.t2Run ? ' (en curso)' : ''))}">
            <span class="dm-ico" style="color:var(--orange)"><i class="fas fa-building"></i></span>
            <div class="dm-body">
                <span class="dm-val">${t2val}<span class="dm-u">hd</span>${live(t.t2Run)}</span>
                <span class="dm-lbl">Decisión del sector${t2Aprox ? ' (aprox.)' : ''}</span>
                ${rango2 ? `<span class="dm-rango">${rango2}</span>` : ''}
            </div>
        </div>
        <div class="dm-row" title="${t.t3NA ? 'No se puede medir sin la fecha de "Decisión del sector"' : 'Días hábiles entre la decisión del sector y el inicio real de tareas' + (t.t3Run ? ' (en curso)' : '')}">
            <span class="dm-ico" style="color:var(--green)"><i class="fas fa-hourglass-half"></i></span>
            <div class="dm-body">
                <span class="dm-val">${t3val}<span class="dm-u">hd</span>${live(t.t3Run)}</span>
                <span class="dm-lbl">Espera de inicio</span>
                ${rango3 ? `<span class="dm-rango">${rango3}</span>` : ''}
            </div>
        </div>
        <div class="dm-row dm-total" title="Demora total del proceso: envío al sector + decisión del sector + espera de inicio (días hábiles)${descuentoTotal > 0 ? '. Se descontaron ' + descuentoTotal + 'hd justificados de candidatos (motivos ajenos al equipo).' : ''}">
            <span class="dm-ico"><i class="fas fa-equals"></i></span>
            <div class="dm-body">
                <span class="dm-val">${t.total}<span class="dm-u">hd</span></span>
                <span class="dm-lbl">Total proceso</span>
                ${b.inicio ? `<span class="dm-rango">${fmtRango(b.inicio, b.ingreso, !b.ingreso)}</span>` : ''}
            </div>
        </div>
        ${descuentoTotal > 0 ? `
        <div class="dm-row dm-ajustado" title="Total proceso menos los días hábiles justificados de candidatos (motivos que no dependen del equipo)">
            <span class="dm-ico" style="color:var(--green)"><i class="fas fa-check-double"></i></span>
            <div class="dm-body">
                <span class="dm-val">${totalAjustado}<span class="dm-u">hd</span></span>
                <span class="dm-lbl">Total ajustado</span>
                <span class="dm-rango">${t.total}hd − ${descuentoTotal}hd justificados</span>
            </div>
        </div>` : ''}
    </div>`;
}

function showHome() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('landing-screen').classList.remove('hidden');
}

// ══════════════════════════════════════════════
//  LANDING CON VIDA — tilt 3D en las tarjetas del equipo (sigue al mouse),
//  se atenúan las demás al enfocar una, botón principal "imán" y saludo
//  según la hora. Todo progresivo: si algo falla, la landing sigue andando
//  igual que antes (nada de esto es necesario para navegar).
// ══════════════════════════════════════════════
function initLandingVida() {
    const sub = document.querySelector('.landing-hero-sub');
    if (sub) {
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
        sub.textContent = `${saludo} — acceso rápido a las búsquedas, postulantes y estadísticas del equipo.`;
    }

    document.querySelectorAll('.landing-team-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            const rx = (0.5 - py) * 14;
            const ry = (px - 0.5) * 14;
            card.style.transition = 'box-shadow .3s ease, opacity .25s ease';
            card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px) scale(1.03)`;
            card.style.boxShadow = `0 16px 28px rgba(22,27,36,.18), 0 0 0 1px ${getComputedStyle(card).borderTopColor}`;
        });
        card.addEventListener('mouseenter', () => {
            Array.from(card.parentElement.children).forEach(c => { if (c !== card) c.style.opacity = '.55'; });
        });
        card.addEventListener('mouseleave', () => {
            Array.from(card.parentElement.children).forEach(c => { c.style.opacity = '1'; });
            card.style.transition = 'transform .5s ease, box-shadow .3s ease, opacity .25s ease';
            card.style.transform = '';
            card.style.boxShadow = '';
        });
    });

    const btnPrincipal = document.querySelector('.landing-hero-btn:not(.secondary)');
    if (btnPrincipal) {
        btnPrincipal.addEventListener('mousemove', e => {
            const r = btnPrincipal.getBoundingClientRect();
            const x = (e.clientX - r.left - r.width / 2) * 0.3;
            const y = (e.clientY - r.top - r.height / 2) * 0.3;
            btnPrincipal.style.transition = 'none';
            btnPrincipal.style.transform = `translate(${x}px, ${y}px)`;
        });
        btnPrincipal.addEventListener('mouseleave', () => {
            btnPrincipal.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)';
            btnPrincipal.style.transform = 'translate(0,0)';
        });
    }
}
initLandingVida();

// Si se pasa un nombre (clic en la foto de un selector desde la landing), entra
// directo a la vista aislada de esa persona (ver entrarVistaAislada): solo su
// info, sin chips ni panel general, hasta que se toque "Ver panel general".
async function goToApp(selectorInicial) {
    document.getElementById('landing-screen').classList.add('hidden');
    await initDashboard();
    if (selectorInicial) entrarVistaAislada(selectorInicial);
    else showView('pipeline', document.getElementById('nav-pipeline'));
}

// Botón aparte de las fotos de selectores: entra directo al panel general en
// la vista de Gráficos (números totales del equipo), sin pasar por Pipeline.
async function verPanelGeneral() {
    document.getElementById('landing-screen').classList.add('hidden');
    await initDashboard();
    showView('charts', document.getElementById('nav-charts'));
}

async function login() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) { errEl.textContent = 'Email o contraseña incorrectos'; errEl.style.display = 'block'; return; }
    showHome();
}

async function logout() { await sb.auth.signOut(); location.reload(); }

async function loadProfile() {
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (error) { console.error('Error cargando perfil:', error); return; }
    currentProfile = data;
}

const BUSQUEDA_SELECT = '*, historial(*), estado_log(*), candidatos(*), psicotecnicos(*), verificaciones(*), archivos(*)';

// Trae TODAS las búsquedas (con sus datos anidados) desde Supabase. Es una consulta pesada
// (6 tablas relacionadas) — se usa para la carga inicial y para altas/bajas de búsquedas
// completas. Para editar un campo puntual de una búsqueda ya cargada, usar loadData(id).
async function loadDataFull() {
    const { data, error } = await sb
        .from('busquedas')
        .select(BUSQUEDA_SELECT)
        .order('id', { ascending: false });
    if (error) { console.error('Error cargando búsquedas:', error); toast('Error al cargar datos: ' + (error.message || error.code), true); return; }
    busquedas = (data || []).map(mapRow);
    const nums = busquedas.map(b => parseInt((b.numero || '').replace('SEL-', '')) || 0);
    nroSeq = nums.length ? Math.max(...nums) + 1 : 1;

    // Postulantes sin búsqueda asignada todavía (no vienen embebidos en "busquedas")
    const { data: sinAsignar, error: errSA } = await sb
        .from('candidatos')
        .select('*')
        .is('busqueda_id', null)
        .order('id', { ascending: false });
    if (errSA) console.error('Error cargando postulantes sin asignar:', errSA);
    unassignedCandidatos = errSA ? [] : (sinAsignar || []);
}

// Recarga los datos tras guardar un cambio. Si se pasa el id de una búsqueda puntual,
// solo se vuelve a pedir ESA fila (con sus candidatos/psicotécnicos/etc.) en vez de las
// 6 tablas relacionadas de TODAS las búsquedas — mucho más rápido para una edición suelta.
// Sin id (o si la búsqueda no se encuentra en memoria), recarga todo como antes.
async function loadData(scopeId = null) {
    if (!scopeId) { await loadDataFull(); return; }
    const idx = busquedas.findIndex(b => b.id === scopeId);
    if (idx === -1) { await loadDataFull(); return; }
    const { data, error } = await sb
        .from('busquedas')
        .select(BUSQUEDA_SELECT)
        .eq('id', scopeId)
        .maybeSingle();
    if (error) { console.error('Error recargando búsqueda:', error); toast('Error al recargar: ' + (error.message || error.code), true); return; }
    if (!data) { busquedas.splice(idx, 1); return; } // se borró entretanto
    busquedas[idx] = mapRow(data);
}

// Busca a qué búsqueda pertenece un candidato/psicotécnico/verificación/comentario/archivo
// ya cargado en memoria, para poder recargar solo esa búsqueda tras editar el hijo.
// Devuelve null si no se encuentra (ej: postulante todavía sin asignar) — loadData(null)
// hace el fallback seguro de recargar todo.
function findBusquedaId(predicate) {
    const b = busquedas.find(predicate);
    return b ? b.id : null;
}
function busquedaIdDeCandidato(candId) { return findBusquedaId(b => (b.candidatos || []).some(c => c.id === candId)); }

function mapRow(b) {
    return {
        ...b,
        cp:              b.enviado_sector,   // alias: la columna DB pasó a llamarse enviado_sector
        historial:       (b.historial   || []).sort((a,x) => a.id - x.id),
        estado_busqueda: (b.estado_log  || []).sort((a,x) => a.id - x.id),
        candidatos:      (b.candidatos  || []).sort((a,x) => a.id - x.id),
        psicotecnicos:   (b.psicotecnicos || []).map(p => ({...p, auth: p.auth_por})).sort((a,x) => a.id - x.id),
        verificaciones:  (b.verificaciones || []).sort((a,x) => a.id - x.id),
        archivos:        (b.archivos    || []).sort((a,x) => a.id - x.id),
    };
}

function nextNro() { return 'SEL-' + String(nroSeq++).padStart(3, '0'); }

async function checkAndFinalizeSearches() {
    // Días hábiles trabajados: desde el ingreso hasta la baja (si la hubo) o hasta hoy.
    // Si no se considera la baja, alguien que ingresó y se fue a los pocos días
    // igual se termina marcando Finalizada por el solo hecho de que pasó tiempo.
    const toFinalize = busquedas.filter(b =>
        b.status === 'Cerrada' && b.ingreso && daysDiff(b.ingreso, b.fecha_baja || null) >= 90
    );
    if (toFinalize.length === 0) return;
    for (const b of toFinalize) {
        const { error } = await sb.from('busquedas').update({ status: 'Finalizada' }).eq('id', b.id);
        if (!error) b.status = 'Finalizada';
    }
}

async function initDashboard() {
    document.getElementById('landing-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    await loadProfile();
    await loadData();
    await checkAndFinalizeSearches();
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    const esAdmin = isAdmin();
    const nombre = esAdmin ? '🔑 ' + (currentProfile?.nombre || 'Administrador') : '👤 ' + (currentProfile?.nombre || 'Selector');
    document.getElementById('topnav-nombre').textContent = nombre;
    document.getElementById('topnav-rol').textContent = esAdmin ? 'admin' : 'selector';
    // Solo reinicia el estado de filtros — todavía no renderiza ninguna vista.
    // Quien llama a initDashboard() decide qué mostrar primero (showView /
    // entrarVistaAislada / verPanelGeneral): así evitamos armar de arriba la
    // tabla completa del Pipeline con TODAS las búsquedas del equipo cuando
    // el destino real es otro (ej: entrar directo a Gráficos quedaba tildado
    // porque de paso se armaba el Pipeline entero, aunque no se llegara a ver).
    currentCategoria = 'general';
    filteredIds = null;
    vistaAislada = false;
    selectorFiltroActivo = '';
    renderSelectorChips();
    aplicarVisibilidadPanelGeneral();
}

async function initApp() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) showHome();
}
initApp();
