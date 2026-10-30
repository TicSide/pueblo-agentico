/* Pueblo Agéntico — CEREBRO local.
 * Corre la simulación (la misma del wallpaper), habla con Ollama, guarda la memoria
 * y manda órdenes al wallpaper por WebSocket (ws://127.0.0.1:8787/ws).
 * Uso: node servidor.js   (o iniciar-cerebro.bat) — panel en http://127.0.0.1:8787 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const SimCore = require('../wallpaper/js/sim-core.js');
const DP = require('../wallpaper/js/datos-personajes.js');
const DM = require('../wallpaper/js/datos-mundo.js');
const { IA } = require('./ia.js');
const { Memoria } = require('./memoria.js');
const { Personalizados } = require('./personalizados.js');
const { execFile } = require('child_process');

function log(...a) { console.log(`[${new Date().toTimeString().slice(0, 8)}]`, ...a); }

const CFG = (() => {
  const base = { puerto: 8787, ollama: {}, charlaCada: [40, 90], pensamientoCada: [70, 160], probPensamientoIA: 0.5, maxCharlas: 1, suenoDesde: 0, suenoHasta: 7, pausarSinWallpaper: true };
  try { return Object.assign(base, JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'))); }
  catch (e) { log('⚠️ config.json no se pudo leer, uso valores por defecto:', e.message); return base; }
})();

const memoria = new Memoria(path.join(__dirname, 'datos', 'estado.json'));
const guardado = memoria.cargar();
// Preferencias que sobreviven a reinicios: IA encendida o apagada, y el clima elegido en el wallpaper
const prefs = new Memoria(path.join(__dirname, 'datos', 'preferencias.json'));
const PREF = Object.assign({ iaActiva: true, clima: null }, prefs.cargar() || {});
const guardarPref = () => { try { prefs.guardar(PREF); } catch (e) { log('no se pudo guardar preferencias:', e.message); } };
const historialUsuario = (guardado && guardado.usuario) || [];
const ia = new IA(CFG.ollama, log);
ia.activa = PREF.iaActiva !== false;
const clientes = new Set();
const editor = new Personalizados(DP, log);
let ultimoLatido = 0, seleccionado = null;

function difundir(m) {
  const s = JSON.stringify(m);
  for (const c of clientes) if (c.readyState === 1) c.send(s);
}

// ---------------- simulación ----------------
const sim = new SimCore.Simulacion({
  personajes: DP.personajes, mundo: DM, guardado, clima: PREF.clima || {},
  config: { charlaCada: CFG.charlaCada, pensamientoCada: CFG.pensamientoCada, maxCharlas: CFG.maxCharlas, suenoDesde: CFG.suenoDesde, suenoHasta: CFG.suenoHasta },
  alEvento: (e) => {
    difundir(e);
    if (e.t === 'decir') log(`${e.modo === 'piensa' ? '💭' : '💬'} ${sim.porId[e.id].corto}: ${e.texto}`);
  },
  generadorDialogo: (a, b, ctx) => ia.charla(a, b, ctx, sim),
  generadorPensamiento: (p, ctx) => (Math.random() < CFG.probPensamientoIA ? ia.pensamiento(p, ctx, sim) : null)
});
if (guardado) log(`📂 Memoria cargada (${guardado.guardado || 'sin fecha'})`);

const hayAudiencia = () => Date.now() - ultimoLatido < 25000 || [...clientes].some((c) => c.cliente === 'panel');
setInterval(() => {
  sim.pausaCharlas = CFG.pausarSinWallpaper && !hayAudiencia();
  try { sim.paso(); } catch (e) { log('error en la simulación:', e); }
}, 1000);
setInterval(() => difundir(instantanea()), 5000);
setInterval(guardar, 60000);
setInterval(() => { if (!ia.ocupado && ia.activa && ia.estado !== 'iniciando') ia.verificar(); }, 30000);

const estadoIA = () => ({ estado: ia.estado, modelo: ia.cfg.modelo, activa: ia.activa });
function instantanea() { return { t: 'estado', personajes: sim.instantanea(), ia: estadoIA(), hora: Date.now() }; }
async function cambiarIA(activa) {
  activa = !!activa;
  PREF.iaActiva = activa; guardarPref();
  if (activa) { if (!ia.activa || ia.estado === 'apagada' || ia.estado === 'offline') await ia.encender(); }
  else if (ia.activa || ia.estado !== 'apagada') await ia.apagar();
  sim.registrar(activa ? 'La IA local se encendió.' : 'La IA local se apagó: el pueblo sigue con frases pregrabadas.');
  difundir(Object.assign({ t: 'ia' }, estadoIA()));
}
function guardar() {
  try { memoria.guardar(Object.assign(sim.exportar(), { usuario: historialUsuario.slice(-12) })); }
  catch (e) { log('no se pudo guardar la memoria:', e.message); }
}
ia.alCambio = () => difundir(Object.assign({ t: 'ia' }, estadoIA()));

// ---------------- editor de personajes ----------------
// Después de cada cambio: se avisa al wallpaper y la simulación toma la lista nueva, sin reiniciar nada
function cambioPersonajes() {
  DP.personajes = DP.combinar(editor.datos);
  difundir({ t: 'personalizados', datos: editor.datos });
  sim.sincronizar(DP.personajes);
  guardar();
}
function abrirEditor(id) {
  const q = /^[a-z0-9_]{1,40}$/.test(id || '') ? '?id=' + id : '';
  execFile('cmd', ['/c', 'start', '', `http://127.0.0.1:${CFG.puerto}/editor${q}`], { windowsHide: true }, (e) => { if (e) log('no se pudo abrir el editor:', e.message); });
}
const TIPOS_WEB = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2' };
const CARPETAS_WEB = ['js', 'css', 'lib', 'fuentes', 'fotos', 'retratos'];
// Sirve solo los archivos del wallpaper que usa el editor (y sin caché: un personaje recién guardado debe verse)
function servirArchivo(res, pathname) {
  const partes = decodeURIComponent(pathname).split('/').filter(Boolean);
  const tipo = TIPOS_WEB[path.extname(pathname).toLowerCase()];
  if (!tipo || CARPETAS_WEB.indexOf(partes[0]) < 0 || partes.some((p) => p === '..' || p.indexOf('\\') >= 0)) return false;
  const ruta = path.join(__dirname, '..', 'wallpaper', ...partes);
  if (!fs.existsSync(ruta) || !fs.statSync(ruta).isFile()) return false;
  res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(ruta));
  return true;
}

// ---------------- el usuario habla ----------------
const normal = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function elegirObjetivos(texto, preferido) {
  const t = normal(texto);
  const encontrados = [];
  for (const d of DP.personajes) {
    for (const al of [d.id, ...(d.alias || [])].map(normal)) {
      if (al.length < 2) continue;
      const i = t.search(new RegExp('(^|[^a-z0-9])@?' + al.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])'));
      if (i >= 0) { encontrados.push({ id: d.id, i }); break; }
    }
  }
  encontrados.sort((a, b) => a.i - b.i);
  if (encontrados.length) return [...new Set(encontrados.map((e) => e.id))].slice(0, 2);
  if (preferido && sim.estado[preferido]) return [preferido];
  const despiertos = Object.values(sim.estado).filter((p) => p.d.tipo !== 'gato' && sim.despierto(p));
  const lista = despiertos.length ? despiertos : Object.values(sim.estado);
  const uno = lista.sort((a, b) => (b.d.rasgos.social || 0.5) * Math.random() - (a.d.rasgos.social || 0.5) * Math.random())[0];
  const todos = /\b(todos|pueblo|chicos|gente|alguien)\b/.test(t);
  if (todos) return [...new Set(['ollama', uno.id])];
  return [uno.id];
}

// Órdenes claras del usuario ("ve a comer", "a dormir"...) aunque la IA no las marque
const ORDENES = [[/\b(come|comer|cena|cenar|almuerza|almorzar|desayuna|desayunar)\b/, 'comer'], [/\b(duerme|dormir|descansa|descansar|a la cama|siesta)\b/, 'dormir'],
  [/\b(juega|jugar|videojuegos?|arcade)\b/, 'jugar'], [/\b(baila|bailar)\b/, 'bailar'], [/\b(entrena|entrenar|ejercicio|gimnasio)\b/, 'entrenar'],
  [/\b(relajate|relajarte|relajarse|medita|meditar|pesca|pescar)\b/, 'relajarse'], [/\b(toca|tocar|canta|cantar|musica)\b/, 'musica'],
  [/\b(trabaja|trabajar|programa|programar|investiga|investigar)\b/, 'trabajar'], [/\b(pasea|pasear|camina|caminar)\b/, 'pasear']];
function ordenDe(texto) {
  const t = normal(texto);
  const pide = /\b(ve|vete|anda|vayan|vamos|ponte|puedes|podrias|quiero que)\b/.test(t) ||
    /(^|[,.!¡¿?]\s*)(a\s+)?(come|comer|duerme|dormir|juega|jugar|baila|bailar|entrena|entrenar|relajate|medita|toca|canta|trabaja|programa|pasea)\b/.test(t);
  if (!pide) return null;
  for (const [re, accion] of ORDENES) if (re.test(t)) return accion;
  return null;
}

async function responderA(id, mensaje, prioridad, opc) {
  const p = sim.estado[id];
  if (!p) return;
  opc = opc || {};
  const desperto = !sim.despierto(p);
  if (desperto) p.hasta = Date.now();
  difundir({ t: 'atender', id, dur: 10 });
  try {
    const r = await ia.responder(p, mensaje, sim, { historial: historialUsuario.slice(0, -1), desperto, prioridad });
    if (!r.texto) throw new Error('respuesta vacía');
    sim.decir(id, r.texto, r.emocion);
    sim.recordar(id, (opc.recuerdo || 'El usuario me dijo algo') + `; le respondí: "${r.texto.slice(0, 90)}"`);
    const accion = opc.permitirAccion ? ((r.accion && r.accion !== 'ninguna') ? r.accion : opc.ordenTexto) : null;
    if (accion) { log(`➡️ ${p.d.corto} va a: ${accion}`); setTimeout(() => sim.ordenar(id, accion), 2500); }
  } catch (e) {
    log('⚠️ IA no respondió (' + e.message + '), uso frase pregrabada');
    sim.decir(id, opc.fallback || SimCore.elegir(p.d.frases || ['...']), 'sorprendido');
  }
}

async function mensajeUsuario(texto, preferido) {
  texto = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!texto) return;
  historialUsuario.push(texto);
  while (historialUsuario.length > 12) historialUsuario.shift();
  difundir({ t: 'usuario', texto });
  sim.registrar('👤 Tú: ' + texto);
  log('👤 Usuario:', texto);
  for (const id of elegirObjetivos(texto, preferido)) {
    await responderA(id, `El usuario te dice: "${texto}"`, 0, { permitirAccion: true, ordenTexto: ordenDe(texto), recuerdo: `El usuario me dijo: "${texto.slice(0, 120)}"` });
  }
}

const INTER = {
  saludar: ['El usuario te saluda con la mano desde fuera de la pantalla. Salúdalo.', '¡Hola! Te veo por ahí.'],
  comida: ['El usuario te acaba de regalar algo rico de comer. Reacciona.', '¡Gracias! ¡Qué rico!'],
  hablar: ['El usuario quiere oírte: comenta lo que estás haciendo o lo que piensas ahora mismo.', null],
  jugar: ['El usuario te mandó a jugar un rato. Reacciona.', '¡A jugar se ha dicho!'],
  dormir: ['El usuario te mandó a dormir. Reacciona.', 'Sí, me hace falta dormir...'],
  molestar: ['El usuario te picó con el cursor del mouse. Reacciona.', '¡Oye!']
};
function interaccion(id, accion) {
  if (accion === 'socializar') { sim.socializar(id); return; }
  if (!sim.estado[id] || !INTER[accion]) return;
  sim.interactuar(id, accion);
  const [msg, fb] = INTER[accion];
  responderA(id, msg, 1, { fallback: fb, recuerdo: `El usuario usó "${accion}" conmigo` });
}

// ---------------- servidor HTTP + WebSocket ----------------
const origenLocal = (o) => !o || o === 'null' || o.startsWith('file:') || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);
function leerCuerpo(req, tope) {
  return new Promise((ok, mal) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > (tope || 20000)) { mal(new Error('demasiado grande')); req.destroy(); } });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { mal(e); } });
  });
}
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const json = (o, code) => { res.writeHead(code || 200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
  if (!origenLocal(req.headers.origin)) return json({ error: 'origen no permitido' }, 403);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/panel')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'panel.html')));
    }
    if (req.method === 'GET' && url.pathname === '/api/estado') return json({ ia: Object.assign(estadoIA(), { stats: ia.stats }), clima: sim.cal, personajes: sim.instantanea(), diario: sim.diario.slice(-40) });
    if (req.method === 'POST' && url.pathname === '/api/ia') { const b = await leerCuerpo(req); cambiarIA(b.activa); return json({ ok: true }); }
    if (req.method === 'GET' && url.pathname === '/api/personajes') return json(DP.personajes.map((d) => ({ id: d.id, nombre: d.nombre, corto: d.corto, serie: d.serie })));
    if (req.method === 'POST' && url.pathname === '/api/mensaje') { const b = await leerCuerpo(req); mensajeUsuario(b.a ? '@' + b.a + ' ' + b.texto : b.texto, seleccionado); return json({ ok: true }); }
    if (req.method === 'POST' && url.pathname === '/api/interaccion') { const b = await leerCuerpo(req); interaccion(b.id, b.accion); return json({ ok: true }); }
    if (req.method === 'GET' && url.pathname === '/editor') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(path.join(__dirname, '..', 'wallpaper', 'editor.html')));
    }
    if (req.method === 'GET' && url.pathname === '/api/editor') return json({ datos: editor.datos });
    if (req.method === 'POST' && url.pathname.startsWith('/api/editor/')) {
      const b = await leerCuerpo(req, 6000000), accion = url.pathname.slice('/api/editor/'.length);
      if (accion === 'guardar') { const id = editor.guardar(b.d || {}, b.serieNueva); cambioPersonajes(); return json({ ok: true, id }); }
      if (accion === 'restaurar') { editor.restaurar(b.id); cambioPersonajes(); return json({ ok: true }); }
      if (accion === 'ocultar') { editor.ocultar(b.id, !!b.oculto); cambioPersonajes(); return json({ ok: true }); }
      if (accion === 'borrar') { editor.borrar(b.id); cambioPersonajes(); delete sim.ausentes[b.id]; guardar(); return json({ ok: true }); }
      if (accion === 'foto') return json({ ok: true, foto: editor.guardarFoto(b.id, b.png) });
      if (accion === 'ubicar') { difundir({ t: 'ubicar', id: b.id }); return json({ ok: true }); }
      return json({ error: 'acción desconocida' }, 404);
    }
    if (req.method === 'GET' && servirArchivo(res, url.pathname)) return;
    json({ error: 'no encontrado' }, 404);
  } catch (e) { json({ error: e.message }, 400); }
});

const wss = new WebSocketServer({ server: servidor, path: '/ws', maxPayload: 64 * 1024 });
wss.on('connection', (ws, req) => {
  if (!origenLocal(req.headers.origin)) { ws.close(1008, 'origen no permitido'); return; }
  ws.cliente = new URL(req.url, 'http://127.0.0.1').searchParams.get('cliente') || 'wallpaper';
  clientes.add(ws);
  log(`🔌 Conectado: ${ws.cliente} (${clientes.size} en total)`);
  ws.send(JSON.stringify(Object.assign({ t: 'ia' }, estadoIA())));
  ws.send(JSON.stringify(instantanea()));
  ws.send(JSON.stringify({ t: 'personalizados', datos: editor.datos }));
  if (ws.cliente === 'wallpaper') ultimoLatido = Date.now();
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    switch (m.t) {
      case 'latido': ultimoLatido = Date.now(); break;
      case 'mensaje': mensajeUsuario(m.texto, m.seleccionado || seleccionado); break;
      case 'interaccion': interaccion(m.id, m.accion); break;
      case 'seleccion': seleccionado = m.id || null; break;
      case 'ia_activa': cambiarIA(m.activa); break;
      case 'abrir_editor': abrirEditor(m.id); break;
      case 'clima': if (m.opc && typeof m.opc === 'object') { sim.ajustarClima(m.opc); PREF.clima = m.opc; guardarPref(); } break;
      case 'ficha': {
        const info = sim.describir(m.id);
        if (info) { info.nec = sim.estado[m.id].nec; ws.send(JSON.stringify({ t: 'ficha', id: m.id, info })); }
        if (sim.estado[m.id]) seleccionado = m.id;
        break;
      }
    }
  });
  ws.on('close', () => { clientes.delete(ws); log(`🔌 Desconectado: ${ws.cliente} (${clientes.size} quedan)`); });
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { log(`❌ El puerto ${CFG.puerto} ya está en uso. ¿Ya hay un cerebro corriendo?`); process.exit(1); }
  log('error del servidor:', e);
});
servidor.listen(CFG.puerto, '127.0.0.1', async () => {
  log(`🧠 Cerebro del Pueblo Agéntico listo en http://127.0.0.1:${CFG.puerto}  (${DP.personajes.length} personajes)`);
  if (!ia.activa) { ia.setEstado('apagada'); log('⏻ La IA está apagada (se enciende desde el interruptor del wallpaper o del panel).'); return; }
  // si Ollama no está abierto, el cerebro lo inicia solo (se puede desactivar con "iniciarOllama": false)
  if (CFG.iniciarOllama !== false && !(await ia.responde())) await ia.encender();
  const hay = await ia.verificar();
  if (ia.estado === 'offline') log('⚠️ Ollama no responde en ' + ia.cfg.url + '. Abre Ollama; mientras tanto se usan frases pregrabadas.');
  else if (!hay) {
    log(`⬇️ Falta el modelo ${ia.cfg.modelo}. Lo descargo con Ollama (puede tardar unos minutos)...`);
    fetch(ia.cfg.url + '/api/pull', { method: 'POST', body: JSON.stringify({ model: ia.cfg.modelo, stream: false }) })
      .then((r) => r.json()).then(() => { log('✅ Modelo descargado'); ia.verificar(); }).catch((e) => log('no se pudo descargar el modelo:', e.message));
  } else log(`✅ Ollama listo con ${ia.cfg.modelo}`);
});

function salir() { log('💾 Guardando memoria y saliendo...'); guardar(); process.exit(0); }
process.on('SIGINT', salir);
process.on('SIGTERM', salir);
