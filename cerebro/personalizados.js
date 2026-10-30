/* Cerebro — guarda lo que hace el editor de personajes en wallpaper/js/personalizados.js.
 * Ese archivo lo lee también el wallpaper, así que los personajes siguen ahí aunque el cerebro esté apagado.
 * De los personajes originales solo se guarda lo que cambió: "restaurar" es borrar ese cambio. */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR_W = path.join(__dirname, '..', 'wallpaper');
const RUTA = path.join(DIR_W, 'js', 'personalizados.js');
const DIR_FOTOS = path.join(DIR_W, 'fotos', 'usuario');
const CABEZA = `/* Pueblo Agéntico — personajes creados o cambiados con el editor. Lo escribe el cerebro: no hace falta tocarlo a mano. */
(function (raiz, datos) { if (typeof module === 'object' && module.exports) module.exports = datos; else raiz.PERSONALIZADOS = datos; })(typeof self !== 'undefined' ? self : this,
`;
const CAMPOS = ['nombre', 'corto', 'serie', 'grupo', 'tipo', 'alias', 'region', 'ap', 'personalidad', 'estilo', 'gustos', 'zonas', 'rasgos', 'emoBase', 'bebida', 'frases', 'relaciones', 'foto', 'permitidas'];
const TIPOS = ['humano', 'ia', 'androide', 'gato'];
const COLOR = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9_]{1,40}$/;

const txt = (v, n) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
const lista = (v, n, largo) => (Array.isArray(v) ? v : []).map((x) => txt(x, largo)).filter(Boolean).slice(0, n);
const limite = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
function pesos(o, a, b) {
  const r = {};
  for (const k of Object.keys(o || {}).slice(0, 80)) if (ID.test(k) && Number(o[k])) r[k] = limite(o[k], a, b);
  return r;
}
function slug(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'vecino';
}

function sanearAp(ap) {
  const r = {};
  for (const k of Object.keys(ap || {}).slice(0, 40)) {
    if (!/^[a-zA-Z0-9_]{1,20}$/.test(k)) continue;
    const v = ap[k];
    if (k === 'extras') r.extras = lista(v, 16, 40).filter((e) => /^[a-z_0-9]+(:#[0-9a-fA-F]{6})?$/.test(e));
    else if (typeof v === 'number') r[k] = limite(v, 0.3, 2.5);
    else if (v === true) r[k] = true;
    else if (typeof v === 'string' && v && (COLOR.test(v) || /^[a-z_0-9]{1,24}$/.test(v))) r[k] = v;
  }
  return r;
}

function sanear(d, LLAMA) {
  const r = {
    nombre: txt(d.nombre, 40), corto: txt(d.corto || d.nombre, 16), serie: txt(d.serie, 60) || 'Vecino del pueblo', grupo: ID.test(d.grupo || '') ? d.grupo : 'vecinos',
    tipo: TIPOS.indexOf(d.tipo) >= 0 ? d.tipo : 'humano', alias: lista(d.alias, 8, 24).map((a) => a.toLowerCase()), ap: sanearAp(d.ap),
    personalidad: txt(d.personalidad, 600), estilo: txt(d.estilo, 300), gustos: pesos(d.gustos, -3, 7), zonas: pesos(d.zonas, -3, 5), emoBase: ID.test(d.emoBase || '') ? d.emoBase : 'contento',
    bebida: ID.test(d.bebida || '') ? d.bebida : 'cafe', frases: lista(d.frases, 24, 160), relaciones: pesos(d.relaciones, -100, 100)
  };
  const ra = d.rasgos || {};
  r.rasgos = {};
  for (const k of ['social', 'apetito', 'sueno', 'inquieto', 'estres']) if (ra[k] !== undefined && ra[k] !== '') r.rasgos[k] = limite(ra[k], 0.1, 2);
  for (const k of ['nocturno', 'dormilon', 'irritable']) if (ra[k]) r.rasgos[k] = true;
  if (d.region && ID.test(d.region)) r.region = d.region;
  if (d.foto && /^fotos\/usuario\/[a-z0-9_]+\.png(\?\d+)?$/.test(d.foto)) r.foto = d.foto;
  // el cuerpo manda sobre el tipo: el gato y la llama solo hacen lo que su modelo sabe animar
  if (r.ap.cuerpo === 'gato') r.tipo = 'gato';
  if (r.ap.cuerpo === 'llama') { r.tipo = r.tipo === 'gato' ? 'ia' : r.tipo; r.permitidas = LLAMA; }
  return r;
}

class Personalizados {
  constructor(DP, log) {
    this.DP = DP; this.log = log || (() => {});
    this.datos = this.leer();
  }
  leer() {
    const vacio = { nuevos: [], cambios: {}, ocultos: [], series: {} };
    try {
      delete require.cache[require.resolve(RUTA)];
      return Object.assign(vacio, require(RUTA));
    } catch (e) { this.log('⚠️ personalizados.js no se pudo leer:', e.message); return vacio; }
  }
  escribir() {
    const tmp = RUTA + '.tmp';
    fs.writeFileSync(tmp, CABEZA + JSON.stringify(this.datos) + '\n);\n');
    fs.renameSync(tmp, RUTA);
  }
  original(id) { return this.DP.base.find((d) => d.id === id) || null; }
  idLibre(nombre) {
    const usado = (i) => this.original(i) || this.datos.nuevos.some((d) => d.id === i);
    const base = slug(nombre);
    let id = base, k = 2;
    while (usado(id)) id = base.slice(0, 27) + '_' + k++;
    return id;
  }
  // d.id presente = editar; sin id = personaje nuevo. serieNueva: { id, nombre, color } crea un grupo
  guardar(d, serieNueva) {
    const limpio = sanear(d, this.DP.LLAMA_PUEDE);
    if (!limpio.nombre) throw new Error('Falta el nombre');
    if (serieNueva && ID.test(serieNueva.id || '') && COLOR.test(serieNueva.color || '')) {
      this.datos.series[serieNueva.id] = { nombre: txt(serieNueva.nombre, 40), color: serieNueva.color };
      limpio.grupo = serieNueva.id;
    }
    const id = d.id && ID.test(d.id) ? d.id : this.idLibre(limpio.nombre);
    const base = this.original(id);
    if (base) {
      // de un original solo se anota lo distinto
      const cambio = {};
      for (const k of CAMPOS) if (JSON.stringify(limpio[k]) !== JSON.stringify(base[k]) && !(limpio[k] === undefined && base[k] === undefined)) cambio[k] = limpio[k] === undefined ? null : limpio[k];
      if (Object.keys(cambio).length) this.datos.cambios[id] = cambio; else delete this.datos.cambios[id];
    } else {
      const i = this.datos.nuevos.findIndex((x) => x.id === id);
      const nuevo = Object.assign({ id }, limpio);
      if (nuevo.alias.indexOf(id) < 0) nuevo.alias.push(id);
      if (i >= 0) this.datos.nuevos[i] = nuevo; else this.datos.nuevos.push(nuevo);
    }
    this.escribir();
    return id;
  }
  restaurar(id) {
    const c = this.datos.cambios[id];
    delete this.datos.cambios[id];
    this.datos.ocultos = this.datos.ocultos.filter((x) => x !== id);
    if (c && c.foto) this.borrarFoto(id);
    this.escribir();
  }
  ocultar(id, oculto) {
    if (!this.original(id)) throw new Error('Solo se ocultan personajes originales');
    this.datos.ocultos = this.datos.ocultos.filter((x) => x !== id);
    if (oculto) this.datos.ocultos.push(id);
    this.escribir();
  }
  borrar(id) {
    const n = this.datos.nuevos.length;
    this.datos.nuevos = this.datos.nuevos.filter((x) => x.id !== id);
    if (n === this.datos.nuevos.length) throw new Error('Ese personaje no es de los creados');
    this.borrarFoto(id);
    this.escribir();
  }
  // data:image/png;base64,... → fotos/usuario/<id>.png (las fotos originales no se pisan)
  guardarFoto(id, dataUrl) {
    if (!ID.test(id || '')) throw new Error('id no válido');
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!m) throw new Error('La foto debe ser PNG');
    fs.mkdirSync(DIR_FOTOS, { recursive: true });
    fs.writeFileSync(path.join(DIR_FOTOS, id + '.png'), Buffer.from(m[1], 'base64'));
    return `fotos/usuario/${id}.png?${Date.now()}`;
  }
  borrarFoto(id) { try { fs.unlinkSync(path.join(DIR_FOTOS, id + '.png')); } catch (e) { /* no tenía */ } }
}

module.exports = { Personalizados, sanear, slug };
