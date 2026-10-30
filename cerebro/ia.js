/* Cerebro — conversación con el modelo local (Ollama).
 * Una sola petición a la vez, con prioridades: usuario > interacción > charla > pensamiento. */
'use strict';
const SimCore = require('../wallpaper/js/sim-core.js');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

const EMOCIONES = SimCore.EMOCIONES;
const ACCIONES = ['ninguna', 'comer', 'dormir', 'jugar', 'musica', 'bailar', 'entrenar', 'relajarse', 'trabajar', 'pasear'];

const SISTEMA = `Eres el guionista de "Pueblo Agéntico", un pueblito isométrico con vida propia donde conviven personajes de series, películas y videojuegos junto con asistentes de inteligencia artificial y un gato. Escribes diálogos breves, naturales y con humor, fieles a la personalidad, muletillas y forma de hablar de cada personaje. Pueden mencionar su propia historia y lo que están haciendo en el pueblo.
Reglas:
- Español latino neutro. Cada línea tiene una o dos frases cortas (máximo 22 palabras).
- Solo diálogo: sin narración, sin acotaciones, sin asteriscos y sin poner el nombre de quien habla dentro del texto.
- Nada de violencia gráfica ni contenido adulto; nadie muere.
- Si un personaje es el gato, solo maúlla y pone entre paréntesis lo que piensa.
- Responde únicamente con el JSON pedido.`;

const TEMAS = ['las islas nuevas (el Mega Mall, la Avenida de la Comida con Popeyes y Pizza Hut, el Parque de Diversiones, Japón y el Súper Parque)', 'las islas del pueblo (el Distrito Tecnológico, la Ciudad del Cine, la Isla Festival, el Bosque Mágico, el Parque Deportivo, el Barrio Residencial, Raccoon City y la Playa del Sol)', 'la Mansión Spencer de Raccoon City', 'un día en la Playa del Sol', 'Omar, el creador del pueblo', 'el clima de hoy', 'la comida del pueblo', 'algo gracioso que pasó hoy en el pueblo', 'su actividad favorita aquí', 'un recuerdo de su propio mundo', 'el gato Rubius', 'el Trono de Hierro de la fortaleza',
  'la persona que los mira desde la pantalla de la computadora', 'la inteligencia artificial', 'la música del estudio', 'un reto o competencia entre ellos', 'sus planes para esta noche',
  'un rumor extraño sobre una carita sonriente roja pintada en una pared', 'los sueños que tuvieron', 'un consejo', 'una broma o burla amistosa', 'qué harían en un apocalipsis zombi', 'el clima', 'quién es el mejor del pueblo en algo'];
const TEMA_ACT = { comer: 'la comida', banquete: 'el banquete', tomar_te: 'lo que están tomando', jugar_consola: 'el videojuego que juegan', arcade: 'los récords del arcade', fogata: 'una historia para contar junto al fuego', pingpong: 'quién va ganando', ajedrez: 'la partida de ajedrez', bailar: 'la música y sus pasos de baile', publico: 'el concierto', reunion: 'un caso misterioso', podcast: 'el tema del pódcast', ver_pelicula: 'la película que están viendo', trabajar_hq: 'el trabajo en la empresa', futbol: 'el partido de fútbol', basquet: 'el partido de básquet', voley: 'el partido de vóley playa', investigar: 'el caso de la escena del crimen', explorar: 'lo que encontraron explorando', surf: 'las olas', tomar_sol: 'el sol y la playa', ajedrez_gigante: 'la partida de ajedrez gigante', visitar_tumbas: 'las leyendas del cementerio', ver_partido: 'quién va ganando el partido', comprar: 'las compras del día', jugar_perro: 'el perro' };

function hhmm(h) { const H = Math.floor(h), M = Math.floor((h - H) * 60); return ('0' + H).slice(-2) + ':' + ('0' + M).slice(-2); }
function relTxt(v) { return v > 50 ? 'son muy cercanos' : v > 15 ? 'son amigos' : v < -40 ? 'son enemigos o grandes rivales' : v < -10 ? 'no se caen muy bien' : 'se conocen poco'; }

class IA {
  constructor(cfg, log) {
    this.cfg = Object.assign({ url: 'http://127.0.0.1:11434', modelo: 'gemma3:4b', temperatura: 0.9, keep_alive: '10m', num_ctx: 2048, timeout: 90 }, cfg || {});
    this.log = log || console.log;
    this.estado = 'offline';
    this.cola = [];
    this.ocupado = false;
    this.alCambio = () => {};
    this.stats = { ok: 0, fallos: 0, ms: 0 };
    this.activa = true;
  }

  setEstado(e) { if (e !== this.estado) { this.estado = e; this.alCambio(e); } }

  // ---------- encender y apagar (apagar también cierra Ollama para liberar la memoria y la GPU) ----------
  exeOllama() {
    const local = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe') : '';
    return local && fs.existsSync(local) ? local : 'ollama';
  }
  async apagar() {
    this.activa = false;
    if (this.actual) this.actual.ctrl.abort();
    for (const t of this.cola.splice(0)) t.reject(new Error('IA apagada'));
    this.setEstado('apagada');
    // 1) descargar el modelo de la memoria; 2) cerrar Ollama (servidor y app de la bandeja)
    try { await fetch(this.cfg.url + '/api/generate', { method: 'POST', body: JSON.stringify({ model: this.cfg.modelo, keep_alive: 0 }), signal: AbortSignal.timeout(4000) }); } catch (e) { /* ya estaba cerrado */ }
    await new Promise((ok) => {
      if (process.platform === 'win32') execFile('taskkill', ['/F', '/IM', 'ollama app.exe', '/IM', 'ollama.exe'], { windowsHide: true }, () => ok());
      else execFile('pkill', ['-f', 'ollama'], () => ok());
    });
    this.log('⏻ IA apagada: Ollama cerrado y memoria liberada');
  }
  async encender() {
    this.activa = true;
    this.setEstado('iniciando');
    if (!(await this.responde())) {
      try {
        const h = spawn(this.exeOllama(), ['serve'], { detached: true, stdio: 'ignore', windowsHide: true });
        h.on('error', (e) => this.log('no se pudo iniciar Ollama:', e.message));
        h.unref();
        this.log('⏻ Iniciando Ollama...');
      } catch (e) { this.log('no se pudo iniciar Ollama:', e.message); }
      for (let k = 0; k < 30 && this.activa && !(await this.responde()); k++) await espera(1000);
    }
    if (!this.activa) return false;
    const hay = await this.verificar();
    if (hay) { this.log(`⏻ IA encendida con ${this.cfg.modelo}`); this.precalentar(); }
    return hay;
  }
  async responde() { try { const r = await fetch(this.cfg.url + '/api/tags', { signal: AbortSignal.timeout(2500) }); return r.ok; } catch (e) { return false; } }
  // carga el modelo en memoria para que la primera respuesta no tarde
  precalentar() { fetch(this.cfg.url + '/api/generate', { method: 'POST', body: JSON.stringify({ model: this.cfg.modelo, prompt: '', keep_alive: this.cfg.keep_alive }) }).catch(() => {}); }

  async verificar() {
    if (!this.activa) { this.setEstado('apagada'); return false; }
    try {
      const r = await fetch(this.cfg.url + '/api/tags', { signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      const nombres = (j.models || []).map((m) => m.name);
      const hay = nombres.some((n) => n === this.cfg.modelo || n === this.cfg.modelo + ':latest' || n.split(':')[0] === this.cfg.modelo);
      if (!this.ocupado) this.setEstado(hay ? 'listo' : 'sin_modelo');
      return hay;
    } catch (e) { this.setEstado('offline'); return false; }
  }

  // prioridad: 0 usuario, 1 interacción, 2 charla, 3 pensamiento
  encolar(prioridad, fn) {
    if (!this.activa || this.estado === 'offline' || this.estado === 'sin_modelo' || this.estado === 'apagada' || this.estado === 'iniciando') return Promise.reject(new Error('IA no disponible'));
    if (prioridad >= 2 && this.cola.filter((t) => t.p >= 2).length >= 2) return Promise.reject(new Error('cola llena'));
    // si el usuario habla mientras se genera una charla de fondo, se corta para responderle antes
    if (prioridad <= 1 && this.actual && this.actual.p >= 2) this.actual.ctrl.abort();
    return new Promise((resolve, reject) => {
      this.cola.push({ p: prioridad, fn, resolve, reject });
      this.cola.sort((a, b) => a.p - b.p);
      this.siguiente();
    });
  }
  async siguiente() {
    if (this.ocupado || !this.cola.length) return;
    const t = this.cola.shift();
    this.ocupado = true;
    this.actual = { p: t.p, ctrl: new AbortController() };
    this.setEstado('pensando');
    try { t.resolve(await t.fn()); } catch (e) { t.reject(e); }
    this.actual = null;
    this.ocupado = false;
    if (this.estado === 'pensando') this.setEstado('listo');
    this.siguiente();
  }

  async chat(usuario, esquema, opciones) {
    const inicio = Date.now();
    const cuerpo = {
      model: this.cfg.modelo, stream: false, format: esquema, keep_alive: this.cfg.keep_alive,
      messages: [{ role: 'system', content: (opciones && opciones.sistema) || SISTEMA }, { role: 'user', content: usuario }],
      options: { temperature: this.cfg.temperatura, top_p: 0.95, num_predict: (opciones && opciones.max) || 360, num_ctx: this.cfg.num_ctx }
    };
    if (this.cfg.think !== undefined) cuerpo.think = this.cfg.think;
    try {
      const senales = [AbortSignal.timeout(this.cfg.timeout * 1000)];
      if (this.actual) senales.push(this.actual.ctrl.signal);
      const r = await fetch(this.cfg.url + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.any(senales) });
      if (!r.ok) throw new Error('Ollama respondió ' + r.status + ': ' + (await r.text()).slice(0, 200));
      const j = await r.json();
      const texto = (j.message && j.message.content) || '';
      const obj = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1));
      this.stats.ok++; this.stats.ms = Date.now() - inicio;
      return obj;
    } catch (e) {
      this.stats.fallos++;
      if (/fetch failed|ECONNREFUSED/i.test(String(e.message || e))) this.setEstado('offline');
      throw e;
    }
  }

  // ---------- descripción de un personaje para el prompt ----------
  ficha(sim, p, extra) {
    const d = p.d, info = sim.describir(p.id) || {};
    const rec = info.recuerdos && info.recuerdos.length ? ` Recuerda: ${info.recuerdos.slice(-2).join(' / ')}.` : '';
    const gato = d.tipo === 'gato' ? ` ${d.corto} es un gato: sus líneas son "Miau", "Mrrr" o "Prrr" seguido de lo que piensa entre paréntesis, por ejemplo: Miau. (¿Y mi atún?)` : '';
    return `${d.nombre} (${d.serie}) está ${String(info.actividad || 'paseando').toLowerCase()}. Personalidad: ${d.personalidad} Forma de hablar: ${d.estilo} Ánimo: ${info.emocion || 'normal'}.${rec}${gato}${extra || ''}`;
  }

  charla(a, b, ctx, sim) {
    return this.encolar(2, async () => {
      const n = 2 + Math.floor(Math.random() * 3);
      const tema = TEMA_ACT[a.act] && Math.random() < 0.5 ? TEMA_ACT[a.act] : TEMAS[Math.floor(Math.random() * TEMAS.length)];
      const distinto = a.d.serie !== b.d.serie ? ' Vienen de mundos distintos.' : '';
      const prompt = `Lugar: ${ctx.zona}. Hora: ${hhmm(ctx.hora)} (${ctx.noche ? 'de noche' : 'de día'}).${ctx.clima ? ' Clima y temporada: ' + ctx.clima + '.' : ''}
${this.ficha(sim, a)}
${this.ficha(sim, b)}
Relación: ${relTxt((ctx.relAB + ctx.relBA) / 2)}.${distinto}
Tema sugerido: ${tema}.
Escribe una conversación de ${n} líneas que se alternan, empezando por ${a.d.corto}. En cada línea indica quién habla ("${a.id}" o "${b.id}"), el texto y su emoción. Al final, un resumen de 8 a 15 palabras de lo que pasó y la afinidad (-2 a 2) que ganó la relación.`;
      const esquema = {
        type: 'object', required: ['lineas', 'resumen', 'afinidad'],
        properties: {
          lineas: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'object', required: ['quien', 'texto', 'emocion'], properties: { quien: { type: 'string', enum: [a.id, b.id] }, texto: { type: 'string' }, emocion: { type: 'string', enum: EMOCIONES } } } },
          resumen: { type: 'string' }, afinidad: { type: 'integer', minimum: -2, maximum: 2 }
        }
      };
      const r = await this.chat(prompt, esquema);
      r.lineas = (r.lineas || []).map((l) => ({ quien: l.quien, texto: limpiar(l.texto, [a.d, b.d]), emocion: l.emocion })).filter((l) => l.texto);
      this.log(`💬 ${a.d.corto} ↔ ${b.d.corto} (${tema}) en ${this.stats.ms} ms`);
      return r;
    });
  }

  pensamiento(p, ctx, sim) {
    return this.encolar(3, async () => {
      const prompt = `${this.ficha(sim, p)} Lugar: ${ctx.zona}. Hora: ${hhmm(ctx.hora)}. Clima y temporada: ${sim.textoClima()}.
Escribe UN pensamiento corto (máximo 18 palabras) que pasa ahora por su cabeza, en primera persona y fiel a su personaje.`;
      const r = await this.chat(prompt, { type: 'object', required: ['texto', 'emocion'], properties: { texto: { type: 'string' }, emocion: { type: 'string', enum: EMOCIONES } } }, { max: 120 });
      r.texto = limpiar(r.texto, [p.d]);
      return r;
    });
  }

  // El usuario le habla a un personaje (o lo saluda, le da comida, etc.)
  responder(p, mensaje, sim, contexto) {
    return this.encolar(contexto.prioridad === undefined ? 0 : contexto.prioridad, async () => {
      const info = sim.describir(p.id) || {};
      const d = p.d;
      const antes = contexto.historial && contexto.historial.length ? `\nMensajes anteriores del usuario a otros personajes (solo contexto, no son para ti): ${contexto.historial.slice(-2).map((m) => '"' + m + '"').join(', ')}.` : '';
      const rec = info.recuerdos && info.recuerdos.length ? `\nTus recuerdos recientes: ${info.recuerdos.slice(-4).join(' / ')}.` : '';
      const prompt = `Eres ${d.nombre} de ${d.serie}. Personalidad: ${d.personalidad} Forma de hablar: ${d.estilo}
Ahora mismo estás ${String(info.actividad || 'paseando').toLowerCase()} en ${info.zona} (${hhmm(sim.hora())}; ${sim.textoClima()}). Ánimo: ${info.emocion}. Necesidades (0 a 100): ${info.necesidades}.${contexto.desperto ? ' Estabas durmiendo y te acaban de despertar.' : ''}
Tus relaciones: ${(info.relaciones || []).join(', ') || 'ninguna especial'}.${rec}${antes}
${mensaje}
Responde en personaje, en 1 o 2 frases (máximo 35 palabras), hablándole directamente al usuario.
En el campo "texto" va SOLO lo que dices en voz alta. En el campo "accion" pon lo que el usuario te pidió hacer (comer, dormir, jugar, musica, bailar, entrenar, relajarse, trabajar o pasear) o "ninguna" si no te pidió nada.`;
      const sistema = SISTEMA + '\nAhora un personaje le responde directamente al usuario: la persona dueña de esta computadora, que mira el pueblo desde su escritorio y les escribe. Los personajes saben que existe.';
      const esquema = { type: 'object', required: ['texto', 'emocion', 'accion'], properties: { texto: { type: 'string' }, emocion: { type: 'string', enum: EMOCIONES }, accion: { type: 'string', enum: ACCIONES } } };
      const r = await this.chat(prompt, esquema, { sistema, max: 200 });
      r.texto = limpiar(r.texto, [d]).replace(/\s*\b(ninguna|acci[oó]n:?\s*\w+)\.?\s*$/i, '').trim();
      this.log(`🗣️ ${d.corto} responde al usuario en ${this.stats.ms} ms`);
      return r;
    });
  }
}

// Quita comillas, nombres al inicio ("Jane: ...") y acotaciones
function limpiar(t, ds) {
  let s = String(t || '').trim().replace(/^["'«“]+|["'»”]+$/g, '').replace(/\s+/g, ' ');
  for (const d of ds) for (const n of [d.nombre, d.corto, d.id]) {
    const re = new RegExp('^' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*', 'i');
    s = s.replace(re, '');
  }
  if (!ds.some((d) => d.tipo === 'gato')) s = s.replace(/\*[^*]{1,80}\*/g, '').replace(/\s*\([^)]{2,120}\)[.!?…]*\s*$/g, '').trim();
  return s.slice(0, 260);
}

module.exports = { IA, ACCIONES };
