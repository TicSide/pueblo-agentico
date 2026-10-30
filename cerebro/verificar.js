/* Revisa que los datos del pueblo sean coherentes (npm test): sirve antes de publicar o después de agregar
 * islas y vecinos. No hace falta el cerebro encendido. */
'use strict';
const SimCore = require('../wallpaper/js/sim-core.js');
const DM = require('../wallpaper/js/datos-mundo.js');
const DP = require('../wallpaper/js/datos-personajes.js');
const Idiomas = require('../wallpaper/js/idiomas.js');
require('../wallpaper/js/idioma-en.js');

const errores = [];
const mal = (m) => errores.push(m);

const ids = new Set();
for (const d of DP.personajes) {
  if (ids.has(d.id)) mal(`personaje repetido: ${d.id}`);
  ids.add(d.id);
  if (d.region && !DM.regiones[d.region]) mal(`${d.id} vive en una región que no existe: ${d.region}`);
  for (const k of Object.keys(d.gustos || {})) if (!SimCore.ACT[k]) mal(`${d.id} tiene un gusto desconocido: ${k}`);
  for (const k of Object.keys(d.relaciones || {})) if (!DP.base.some((o) => o.id === k) && !ids.has(k)) mal(`${d.id} se relaciona con alguien que no existe: ${k}`);
  if (!DP.SERIES[d.grupo]) mal(`${d.id} está en un grupo que no existe: ${d.grupo}`);
}

const zonas = new Set(DM.zonas.map((z) => z.id));
const grupos = ['gato', 'humano', 'ia', 'androide'];
for (const s of DM.spots) {
  if (!SimCore.ACT[s.act]) mal(`${s.id}: actividad desconocida`);
  if (!zonas.has(s.zona)) mal(`${s.id}: zona desconocida`);
  for (const q of s.solo || []) if (!q.startsWith('region:') && grupos.indexOf(q) < 0 && !DP.base.some((d) => d.id === q)) mal(`${s.id}: solo para alguien que no existe (${q})`);
}

DM.islas.forEach((a, i) => DM.islas.slice(i + 1).forEach((b) => {
  if (a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1) mal(`las islas ${a.id} y ${b.id} se pisan`);
}));
for (const I of DM.islas) if (I.x1 > DM.N || I.z1 > DM.N) mal(`la isla ${I.id} se sale de la cuadrícula`);

const vistos = new Set([0]), cola = [0];
while (cola.length) for (const m of DM.red.nodos[cola.pop()].vec) if (!vistos.has(m)) { vistos.add(m); cola.push(m); }
if (vistos.size !== DM.red.nodos.length) mal(`la red de calles está cortada: ${vistos.size} de ${DM.red.nodos.length} cruces conectados`);

// traducciones: las listas de cada idioma y el contenido en inglés deben cubrir todo
for (const e of Idiomas.comprobar()) mal('idioma ' + e);
const EN = Idiomas.contenido('en');
for (const k in SimCore.ACT) {
  if (Idiomas.ACTOS.indexOf(k) < 0) mal(`actividad sin traducir: ${k}`);
  if (SimCore.ACT[k].txtEn && !EN.actEn[k]) mal(`actividad sin plantilla en inglés: ${k}`);
}
for (const n of [...DM.zonas.map((z) => z.nombre), ...DM.spots.map((s) => s.lugar).filter(Boolean)]) if (!EN.lugares[n]) mal(`lugar sin traducir: ${n}`);
for (const d of DP.base) {
  const x = EN.personajes[d.id];
  if (!x) mal(`${d.id} no tiene texto en inglés`);
  else if (x.length - 1 !== d.frases.length) mal(`${d.id}: ${x.length - 1} frases en inglés y ${d.frases.length} en español`);
}
for (const k in SimCore.COMENTARIOS) if (!EN.comentarios[k]) mal(`comentarios sin traducir: ${k}`);
for (const k in SimCore.INTER_PAR) if (!EN.par[k]) mal(`interacción sin traducir: ${k}`);
for (const v of [...Object.values(SimCore.TXT), ...Object.values(SimCore.EVENTOS)]) if (Idiomas.CLAVES.indexOf(v) < 0) mal(`texto sin clave de idioma: ${v}`);

// un rato de simulación, para que aparezca lo que solo falla al correr
let t = new Date('2026-06-15T08:00:00').getTime();
const sim = new SimCore.Simulacion({ personajes: DP.personajes, mundo: DM, reloj: () => t, alEvento() {} });
for (let k = 0; k < 900; k++) { t += 4000; sim.paso(); }
for (const id in sim.estado) {
  const p = sim.estado[id], s = sim.spotPorId[p.spot], z = sim.zonasRegion[id];
  if (!s) mal(`${id} quedó sin actividad`);
  else if (z && !z.has(s.zona)) mal(`${id} salió de su región`);
}

if (errores.length) {
  console.error(`${errores.length} problema(s):\n- ` + errores.join('\n- '));
  process.exit(1);
}
console.log(`Todo en orden: ${DP.personajes.length} personajes, ${DM.islas.length - 1} islas, ${DM.spots.length} sitios y ${DM.red.nodos.length} cruces.`);
