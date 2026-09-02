// ══════════════════════════════════════════════
//  DATA.JS — configuración y datos de referencia
//  (conexión a Supabase + listas/constantes fijas que usan core.js/render.js/etc.)
// ══════════════════════════════════════════════
const SUPABASE_URL = 'https://nhlkndwwsuybnejbyigk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obGtuZHd3c3V5Ym5lamJ5aWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzY5ODYsImV4cCI6MjA5Mzc1Mjk4Nn0.Xdli4VzqAKuYLkU5q8m8G6UTNda_BAaJlibROm9tGhw';

// Si el script de Supabase no llegó a cargar (red lenta, bloqueador de contenido, CDN caído),
// sin esto la página queda muerta sin ningún aviso: ningún botón responde y no se ve el motivo.
// Mejor mostrar un mensaje claro y frenar acá, antes de que el resto de los scripts fallen en cadena.
if (!window.supabase) {
    document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:sans-serif;background:#12161f;color:#fff">
            <div>
                <h2 style="margin-bottom:10px">No se pudo cargar la página</h2>
                <p style="opacity:.8;max-width:420px;margin:0 auto 18px">Falló la conexión con un recurso necesario (Supabase). Revisá tu internet o un bloqueador de contenido y volvé a intentar.</p>
                <button onclick="location.reload()" style="padding:10px 22px;border:none;border-radius:8px;background:#3654ea;color:#fff;font-weight:700;cursor:pointer">Reintentar</button>
            </div>
        </div>`;
    throw new Error('window.supabase no está disponible — data.js no puede continuar');
}
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SELECTORES = ['Silvina','Romina','Claudia','Soledad','Juan Pablo','Angel','Noelia','Milagros'];
// Mismo color que la tarjeta de cada uno en la landing ("Nuestro equipo"), para que
// los chips de filtro se distingan del fondo y entre sí de un vistazo. Angel no tiene
// tarjeta en la landing, así que tiene un color propio elegido acá.
const SELECTOR_COLORS = {
    'Silvina':     '#6a4c93',
    'Romina':      '#9b2226', // var(--red)
    'Claudia':     '#ca6702', // var(--orange)
    'Soledad':     '#3654ea', // var(--accent)
    'Juan Pablo':  '#b5a300', // var(--yellow)
    'Angel':       '#be185d',
    'Noelia':      '#005f73', // var(--blue)
    'Milagros':    '#2d6a4f', // var(--green)
};
const DEMORA_LIMITE = { 'Gerente/Director': 45, 'Jefe/Encargado': 30, 'Otros': 15 };
const ALERTA_SECTOR_LIMITE_HD = 3; // 72hs hábiles sin respuesta del sector desde "Enviado al sector"
const VERIF_EN_CURSO = ['Pendiente','En proceso'];
const HERRAMIENTAS = ['PC', 'Celular', 'Notebook', 'Línea de teléfono'];
const FICHA_SIMPLE_OPTS = ['Pendiente', 'OK', 'Observado', 'No Apto'];
const FICHA_PSICO_OPTS  = ['Pendiente', 'Apto', 'Apto con observaciones', 'Apto con reservas', 'No Apto'];
