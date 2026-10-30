/* Pueblo Agéntico — mapa del mundo (compartido con el cerebro).
 * Archipiélago: el pueblo central (76x76) y trece islas temáticas unidas por puentes con carretera:
 * Distrito Tecnológico, Ciudad del Cine, Isla Festival y Bosque Mágico; en el anillo exterior Parque Deportivo,
 * Barrio Residencial, Raccoon City y Playa del Sol; y abajo Mega Mall, Avenida de la Comida,
 * Parque de Diversiones, Japón y Súper Parque (van en la punta de abajo del rombo: no achican el encuadre).
 * Coordenadas en "baldosas". La cámara mira desde (+x,+z): r = hacia dónde mira, en grados
 * (0 = +z, 90 = +x, 180 = -z, 270 = -x); r entre 0 y 90 deja ver la cara.
 * Las zonas del pueblo se diseñan en su propia celda y se escalan (F); las islas usan coordenadas
 * locales de su bloque central (bloque()). */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.DATOS_MUNDO = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const M = 49, N = 234, F = 1.125;          // M = origen del pueblo central; N = cuadrícula total
  const ORIG_V = [1, 19, 37], ORIG_N = [M + 3, M + 29, M + 55];
  const R1 = M + 25, R2 = M + 51;            // ejes de las calles del pueblo
  const CALLE = { asfalto: 2.2, vereda: 0.8 }; // 6 de ancho: 4.4 de asfalto y veredas de 0.8
  const zonas = [], props = [], spots = [], muros = [], arboles = [], agua = [], caminable = [];
  const cuenta = {};
  let T = { ox: 0, oz: 0, nx: 0, nz: 0, f: 1 };
  function celda(c, r) { T = { ox: ORIG_V[c], oz: ORIG_V[r], nx: ORIG_N[c], nz: ORIG_N[r], f: F }; }
  function absoluto() { T = { ox: 0, oz: 0, nx: 0, nz: 0, f: 1 }; }
  function bloque(x0, z0) { T = { ox: 0, oz: 0, nx: x0, nz: z0, f: 1 }; }
  const tx = (x) => T.nx + (x - T.ox) * T.f, tz = (z) => T.nz + (z - T.oz) * T.f;
  const ESCALAN = ['tarima', 'alfombra', 'pista_baile', 'escenario', 'telon', 'tapete', 'deck', 'jardin_zen', 'muelle', 'ring', 'truss'];

  function zona(id, nombre, x0, z0, x1, z1, piso, extra) {
    const zn = Object.assign({ id, nombre, x0: tx(x0), z0: tz(z0), x1: tx(x1), z1: tz(z1), piso }, extra || {});
    if (zn.letrero) zn.letrero = [tx(zn.letrero[0]), tz(zn.letrero[1]), zn.letrero[2]];
    zonas.push(zn);
  }
  function P(t, x, z, r, extra) {
    const p = Object.assign({ t, x: tx(x), z: tz(z), r: r || 0 }, extra || {});
    if (T.f !== 1 && ESCALAN.indexOf(t) >= 0) { if (p.w) p.w *= T.f; if (p.d) p.d *= T.f; }
    if (p.xs) p.xs = p.xs.map(tx);
    if (p.pts) p.pts = p.pts.map(([a, b]) => [tx(a), tz(b)]);
    props.push(p);
  }
  function S(zonaId, act, x, z, r, pose, y, extra) {
    const k = zonaId + '-' + act;
    cuenta[k] = (cuenta[k] || 0) + 1;
    spots.push(Object.assign({ id: k + '-' + cuenta[k], zona: zonaId, act, x: +tx(x).toFixed(3), z: +tz(z).toFixed(3), r: r || 0, pose: pose || 'parado', y: y || 0 }, extra || {}));
  }
  function muro(zonaId, x0, z0, x1, z1, h, c, extra) { muros.push(Object.assign({ zona: zonaId, x0: tx(x0), z0: tz(z0), x1: tx(x1), z1: tz(z1), h, c }, extra || {})); }
  function mirar(x, z, ax, az) { return Math.round(Math.atan2(ax - x, az - z) * 180 / Math.PI + 360) % 360; }
  function arbol(t, x, z, s) { arboles.push({ t, x: tx(x), z: tz(z), s: s || 1 }); }

  // =================== Fortaleza del Trono (Juego de Tronos) ===================
  celda(0, 0);
  zona('fortaleza', 'Fortaleza del Trono', 1, 1, 17, 17, 'piedra', { letrero: [16.2, 16.5, 45] });
  muro('fortaleza', 1, 1, 17, 1, 2.3, '#8b8680', { almenas: true });
  muro('fortaleza', 1, 1, 1, 17, 2.3, '#8b8680', { almenas: true });
  P('torre', 1.7, 1.7, 0, { h: 5.2 }); P('torre', 16.3, 1.7, 0, { h: 3.8 }); P('torre', 1.7, 16.3, 0, { h: 3.8 });
  P('tarima', 9, 3.4, 0, { w: 5, d: 3.2, h: 0.3 });
  P('trono', 9, 2.9, 0, { y: 0.3 });
  P('estandarte', 5, 1, 0, { c: '#9aa3a8', c2: '#f2f2f2', pared: true });
  P('estandarte', 13, 1, 0, { c: '#a8232b', c2: '#e8b83a', pared: true });
  P('estandarte', 3.2, 1, 0, { c: '#1d1b1e', c2: '#c0262d', pared: true });
  P('estandarte', 14.8, 1, 0, { c: '#1d1b1e', c2: '#c0262d', pared: true });
  P('antorcha', 7, 1, 0, { pared: true }); P('antorcha', 11, 1, 0, { pared: true }); P('antorcha', 1, 6, 90, { pared: true }); P('antorcha', 1, 12, 90, { pared: true });
  P('brasero', 6, 5.3); P('brasero', 12, 5.3);
  P('alfombra', 9, 7.6, 0, { w: 1.6, d: 5, c: '#8e1d24' });
  P('mesa_larga', 9, 11, 0, { w: 6.4, d: 1.3 });
  P('banco_largo', 9, 9.95, 0, { w: 6.2 }); P('banco_largo', 9, 12.05, 0, { w: 6.2 });
  P('muneco', 3.5, 14.3); P('muneco', 14.5, 14.3);
  P('armero', 2.1, 9.5, 90);
  P('roca_dragon', 14.6, 5.4);
  P('calavera_dragon', 4.0, 4.4, 30);
  P('pozo', 14.6, 9.6); P('barril', 4.7, 15.9); P('barril', 5.4, 16.3); P('barril', 15.7, 11.6); P('heno', 16.0, 13.0, 20); P('caja_madera', 2.3, 12.2, 10);
  S('fortaleza', 'trono', 9, 3.0, 0, 'sentado', 0.78);
  for (const x of [7, 9, 11]) { S('fortaleza', 'banquete', x, 9.95, 0, 'sentado', 0.45, { item: 'comida' }); S('fortaleza', 'banquete', x, 12.05, 180, 'sentado', 0.45, { item: 'comida' }); }
  S('fortaleza', 'espada', 3.5, 13.2, 0, 'parado', 0, { item: 'espada' });
  S('fortaleza', 'espada', 14.5, 13.2, 0, 'parado', 0, { item: 'espada' });
  S('fortaleza', 'brasero', 6, 6.35, 180); S('fortaleza', 'brasero', 12, 6.35, 180);
  S('fortaleza', 'vigilar', 2.8, 6.0, 90); S('fortaleza', 'vigilar', 15.8, 8.0, 270);

  // =================== Dormitorios ===================
  celda(1, 0);
  zona('dormitorio', 'Dormitorios', 19, 1, 35, 10, 'madera', { letrero: [34.4, 9.6, 90] });
  muro('dormitorio', 19, 1, 35, 1, 2.0, '#e9d8b9', { ventanas: true });
  muro('dormitorio', 19, 1, 19, 10, 2.0, '#e9d8b9', { ventanas: true });
  for (let i = 0; i < 7; i++) {
    const x = 20.4 + i * 2.15;
    P('litera', x, 2.4, 0, { c: ['#4f7cac', '#c0504d', '#6aa86b', '#d9a441', '#8e6bb8', '#4fa3a5', '#d97a4a'][i] });
    S('dormitorio', 'dormir', x, 2.4, 0, 'acostado', 0.46);
    S('dormitorio', 'dormir', x, 2.4, 0, 'acostado', 1.46);
  }
  for (let i = 0; i < 6; i++) {
    const x = 20.6 + i * 2.6;
    P('cama', x, 6.1, 0, { c: ['#e07b67', '#6b9bd1', '#f2c14e', '#7fbf7f', '#c98bd6', '#5ab3b0'][i] });
    S('dormitorio', 'dormir', x, 6.1, 0, 'acostado', 0.46);
    if (i < 5) P('mesita', x + 1.3, 5.4, 0);
  }
  P('alfombra', 27, 4.2, 0, { w: 13, d: 1.1, c: '#b5805a' });
  P('armario', 19.45, 8.3, 90);
  P('cuadro', 19, 4.6, 90, { pared: true, c: '#5a8fbf' });
  P('planta', 34.4, 1.8);
  P('cama_gato', 33.6, 8.6, 0);
  S('dormitorio', 'dormir_gato', 33.6, 8.6, 0, 'acostado', 0.12, { solo: ['gato'] });

  // =================== Oficina de Casos (Mentes Criminales / El Mentalista) ===================
  zona('oficina', 'Oficina de Casos', 19, 10, 35, 17, 'alfombra', { letrero: [34.4, 16.5, 90] });
  muro('oficina', 19, 10, 35, 10, 1.35, '#c7c0b4');
  muro('oficina', 19, 10, 19, 17, 2.0, '#c7c0b4');
  P('redjohn', 23, 10, 0, { pared: true, y: 0.35 });
  P('sofa_cuero', 23, 11.1, 0, { w: 2.3 });
  S('oficina', 'sofa_jane', 23, 11.1, 90, 'acostado', 0.5);
  P('tablero', 19, 13.3, 90, { pared: true });
  P('placa_bau', 30.5, 10, 0, { pared: true });
  S('oficina', 'investigar', 20.35, 12.7, 270); S('oficina', 'investigar', 20.35, 13.95, 270);
  for (const [x, z] of [[28, 12.7], [32, 12.7], [28, 15.5], [32, 15.5]]) {
    P('escritorio', x, z, 0, { monitor: 'oficina' });
    P('silla', x, z - 0.8, 0, { c: '#2f3440' });
    S('oficina', 'papeleo', x, z - 0.8, 0, 'sentado', 0.45);
  }
  P('mesa_redonda', 23.6, 15.0, 0);
  for (const [x, z, r] of [[23.6, 14.05, 0], [23.6, 15.95, 180], [22.65, 15.0, 90], [24.55, 15.0, 270]]) {
    P('silla', x, z, r, { c: '#5a4636' });
    S('oficina', 'reunion', x, z, r, 'sentado', 0.45);
  }
  P('estanteria', 33.0, 10.35, 0, { w: 2.6, h: 1.25 });
  P('archivero', 26.6, 10.5, 0); P('archivero', 27.4, 10.5, 0);
  P('sillon', 34.3, 12.4, 270, { c: '#7a3b2e' }); S('oficina', 'leer', 34.3, 12.4, 270, 'sentado', 0.42, { item: 'libro' });
  P('sillon', 34.3, 14.6, 270, { c: '#3b5a7a' }); S('oficina', 'leer', 34.3, 14.6, 270, 'sentado', 0.42, { item: 'libro' });
  P('caja_carton', 25.6, 11.0, 0);
  S('oficina', 'dormir_gato', 25.6, 11.0, 0, 'acostado', 0.2, { solo: ['gato'] });
  P('planta', 34.4, 16.4); P('planta', 19.6, 16.4); P('cafetera', 20.0, 16.0, 90); P('bebedero', 20.0, 11.0, 90);

  // =================== Laboratorio de IA ===================
  celda(2, 0);
  zona('laboratorio', 'Laboratorio de IA', 37, 1, 53, 10, 'metal', { letrero: [52.4, 9.6, 90] });
  muro('laboratorio', 37, 1, 53, 1, 2.0, '#283650', { neon: '#3fd0ff' });
  muro('laboratorio', 37, 1, 37, 10, 2.0, '#283650', { neon: '#3fd0ff' });
  for (let i = 0; i < 10; i++) P('rack', 39.6 + i * 1.25, 1.55, 0);
  S('laboratorio', 'servidores', 42.1, 2.8, 180); S('laboratorio', 'servidores', 47.1, 2.8, 180);
  for (const z of [3.4, 5.0, 6.6, 8.2]) { P('capsula', 37.65, z, 90); S('laboratorio', 'recargar', 37.7, z, 90, 'parado', 0.12); }
  for (const z of [4.6, 7.9]) for (const x of [41.5, 45.0, 48.5]) {
    P('escritorio', x, z, 0, { monitor: 'codigo', monitores: 2 });
    P('silla', x, z - 0.8, 0, { c: '#1e2230', gamer: true });
    S('laboratorio', 'programar', x, z - 0.8, 0, 'sentado', 0.45);
  }
  S('laboratorio', 'molestar', 45.35, 4.45, 20, 'sentado', 0.79, { solo: ['gato'] });
  P('holograma', 51.4, 6.2, 0);
  P('nevera_bebidas', 52.4, 1.6, 0);
  P('cables', 44.5, 9.3, 0); P('planta', 52.4, 9.2);

  // =================== Estudio de Creadores (YouTube) ===================
  zona('estudio', 'Estudio de Creadores', 37, 10, 53, 17, 'alfombra_oscura', { letrero: [52.4, 16.5, 90] });
  muro('estudio', 37, 10, 53, 10, 1.35, '#3b2f47');
  muro('estudio', 37, 10, 37, 17, 2.0, '#3b2f47', { espuma: true });
  P('letrero_youtube', 37, 12.6, 90, { pared: true, y: 0.6 });
  P('placas_youtube', 37, 15.2, 90, { pared: true, y: 0.9 });
  P('escritorio', 41.5, 10.75, 0, { w: 3.2, monitor: 'edicion', monitores: 3, invertido: true });
  P('silla', 40.6, 11.75, 180, { c: '#202020', gamer: true }); P('silla', 42.4, 11.75, 180, { c: '#202020', gamer: true });
  S('estudio', 'editar_video', 40.6, 11.75, 180, 'sentado', 0.45); S('estudio', 'editar_video', 42.4, 11.75, 180, 'sentado', 0.45);
  P('pantalla_verde', 46.5, 10, 0, { w: 2.6, pared: true });
  P('taburete', 46.5, 12.4, 0);
  S('estudio', 'grabar', 46.5, 12.4, 0, 'sentado', 0.55);
  P('camara', 46.5, 15.4, 180); P('aro_luz', 47.5, 15.2, 200);
  P('mesa_redonda', 51.0, 14.0, 0, { mics: true });
  P('silla', 50.05, 14.0, 90, { c: '#444' }); P('silla', 51.95, 14.0, 270, { c: '#444' });
  S('estudio', 'podcast', 50.05, 14.0, 90, 'sentado', 0.45); S('estudio', 'podcast', 51.95, 14.0, 270, 'sentado', 0.45);
  P('sofa', 41.0, 15.9, 180, { w: 2.0, c: '#5b4a7a' });
  S('estudio', 'siesta', 41.0, 15.9, 180, 'sentado', 0.45);
  P('planta', 52.4, 10.6); P('planta', 37.6, 16.4);

  // =================== Campamento del Bosque ===================
  celda(0, 1);
  zona('campamento', 'Campamento del Bosque', 1, 19, 17, 35, 'cesped', { letrero: [16.3, 34.5, 45], abierta: true });
  P('fogata', 9, 27);
  P('tronco', 9, 24.85, 0); P('tronco', 9, 29.15, 0); P('tronco', 6.85, 27, 90); P('tronco', 11.15, 27, 90);
  for (const x of [8.4, 9.6]) { S('campamento', 'fogata', x, 24.9, 0, 'sentado', 0.34); S('campamento', 'fogata', x, 29.1, 180, 'sentado', 0.34); }
  for (const z of [26.4, 27.6]) { S('campamento', 'fogata', 6.9, z, 90, 'sentado', 0.34); S('campamento', 'fogata', 11.1, z, 270, 'sentado', 0.34); }
  P('tocon', 12.4, 25.0, 0, { sinHacha: true });
  S('campamento', 'guitarra', 12.4, 25.0, mirar(12.4, 25.0, 9, 27), 'sentado', 0.45, { item: 'guitarra' });
  for (const [x, z, c] of [[3.8, 21.9, '#d9792b'], [7.9, 21.3, '#4d8a55'], [13.8, 21.9, '#3f6fa8']]) {
    P('tienda', x, z, 0, { c });
    S('campamento', 'dormir', x - 0.42, z, 0, 'acostado', 0.08);
    S('campamento', 'dormir', x + 0.42, z, 0, 'acostado', 0.08);
  }
  P('moto', 14.6, 30.8, 300, { vehiculo: 'deacon' });
  S('campamento', 'reparar_moto', 13.4, 31.6, mirar(13.4, 31.6, 14.6, 30.8), 'agachado', 0, { item: 'llave' });
  S('campamento', 'pasear_moto', 15.7, 32.0, 330, 'parado', 0, { solo: ['deacon', 'claire'] });
  P('tocon', 4.2, 31.6, 0);
  S('campamento', 'cortar_lena', 4.2, 30.6, 0, 'parado', 0, { item: 'hacha' });
  P('lena', 2.6, 29.0, 20); P('mochila', 11.8, 23.0, 30); P('caja_madera', 15.6, 26.0, 10);
  P('farol_poste', 5.5, 24.5); P('farol_poste', 12.8, 29.6); P('canoa', 13.6, 33.6, 80); P('olla', 9.9, 26.2);
  for (const [x, z] of [[2.5, 23.5], [6.2, 33.4], [15.9, 23.6], [11.0, 33.9]]) P('hongos', x, z);
  S('campamento', 'dormir_gato', 10.5, 28.6, 300, 'acostado', 0.05, { solo: ['gato'] });
  for (let i = 0; i < 9; i++) arbol('pino', 1.6 + (i % 3) * 0.2, 20 + i * 1.6, 0.9 + (i % 3) * 0.15);
  for (let i = 0; i < 7; i++) arbol('pino', 3.6 + i * 1.9, 19.8 + (i % 2) * 0.3, 0.85 + (i % 2) * 0.2);
  for (const [x, z, s] of [[2.2, 34.4, 1], [4.8, 33.9, 0.8], [16.1, 23.8, 0.9], [16.3, 28.2, 0.8], [1.8, 25.5, 1.1], [3.0, 27.2, 0.8], [16.4, 33.6, 0.9]]) arbol('pino', x, z, s);

  // =================== Plaza Central ===================
  celda(1, 1);
  zona('plaza', 'Plaza Central', 19, 19, 35, 35, 'baldosa', { letrero: [19.8, 19.6, 45], abierta: true });
  P('fuente', 27, 27);
  for (const [x, z, r] of [[27, 22.2, 0], [27, 31.8, 180], [22.2, 27, 90], [31.8, 27, 270]]) {
    P('banca', x, z, r);
    const ox = Math.cos(r * Math.PI / 180) * 0.5, oz = -Math.sin(r * Math.PI / 180) * 0.5;
    S('plaza', 'banca', x + ox, z + oz, r, 'sentado', 0.42);
    S('plaza', 'banca', x - ox, z - oz, r, 'sentado', 0.42);
  }
  S('plaza', 'fuente', 24.9, 24.9, 45); S('plaza', 'fuente', 29.1, 24.9, 315); S('plaza', 'fuente', 24.9, 29.1, 135);
  S('plaza', 'mirar', 28.75, 28.75, 315, 'sentado', 0.5, { solo: ['gato'] });
  P('pista_baile', 32.4, 32.4, 0, { w: 4, d: 4 });
  for (const [x, z] of [[31.3, 31.3], [33.5, 31.3], [32.4, 32.4], [31.3, 33.5], [33.5, 33.5]]) S('plaza', 'bailar', x, z, 45);
  for (const z of [21.6, 24.8]) {
    P('mesa_ajedrez', 21.6, z, 0);
    S('plaza', 'ajedrez', 20.85, z, 90, 'sentado', 0.42); S('plaza', 'ajedrez', 22.35, z, 270, 'sentado', 0.42);
  }
  P('carrito_helados', 32.9, 21.4, 270);
  S('plaza', 'helado', 31.5, 20.8, 90, 'parado', 0, { item: 'helado' }); S('plaza', 'helado', 31.5, 22.0, 90, 'parado', 0, { item: 'helado' });
  P('tablon', 19.8, 30.5, 90);
  P('ovillo', 24.2, 32.8, 0);
  S('plaza', 'jugar_gato', 24.2, 32.4, 0, 'parado', 0, { solo: ['gato'] });
  for (const [x, z] of [[23.2, 23.2], [30.8, 23.2], [23.2, 30.8]]) P('farola', x, z);
  P('maceta', 34.3, 19.7); P('maceta', 19.7, 34.3); P('maceta', 29.0, 19.7); P('maceta', 34.4, 28.6);
  P('guirnaldas', 27, 27, 0, { pts: [[23.2, 23.2], [30.8, 23.2], [30.8, 30.8], [23.2, 30.8]] });
  P('kiosko', 33.2, 25.4, 270);
  P('bicicletas', 21.2, 32.4, 90);

  // =================== Restaurante y Tetería ===================
  celda(2, 1);
  zona('restaurante', 'Restaurante y Tetería', 37, 19, 53, 35, 'ajedrezado', { letrero: [52.4, 34.5, 90] });
  muro('restaurante', 37, 19, 53, 19, 1.6, '#efe0c6', { franja: '#b8423a', ventanas: true });
  muro('restaurante', 37, 19, 37, 31, 1.6, '#efe0c6', { franja: '#b8423a' });
  P('encimera', 45.6, 19.45, 0, { w: 12.6 });
  P('nevera', 38.1, 19.55, 0); P('horno_pizza', 52.0, 19.75, 0);
  P('isla_cocina', 45, 22.2, 0, { w: 6 });
  for (const x of [43, 45, 47]) S('restaurante', 'cocinar', x, 21.35, 0, 'parado', 0, { item: 'sarten' });
  P('barra_te', 49.6, 25.7, 0, { w: 5 });
  for (const x of [47.9, 49.1, 50.3, 51.5]) { P('taburete', x, 24.85, 0, { alto: true }); S('restaurante', 'tomar_te', x, 24.85, 0, 'sentado', 0.66, { item: 'taza' }); }
  for (const [tx2, tz2] of [[40.5, 26.5], [40.5, 31.5], [45.6, 30.6], [50.6, 30.6]]) {
    P('mesa', tx2, tz2, 0, { mantel: '#d64541' });
    P('lampara_colgante', tx2, tz2, 0);
    for (const [dx, dz, r] of [[0, -1, 0], [0, 1, 180], [-1, 0, 90], [1, 0, 270]]) {
      P('silla', tx2 + dx, tz2 + dz, r, { c: '#8a5a3b' });
      S('restaurante', 'comer', tx2 + dx, tz2 + dz, r, 'sentado', 0.45, { item: 'comida' });
    }
  }
  P('plato_gato', 52.3, 33.2, 0);
  S('restaurante', 'comer_gato', 52.3, 32.75, 0, 'parado', 0, { solo: ['gato'] });
  P('maceta', 37.7, 34.3); P('pizarra_menu', 37, 24.0, 90, { pared: true });
  P('neon_pizza', 45.6, 19.08, 0, { y: 1.6 });
  P('botellero', 37, 28.5, 90, { pared: true });

  // =================== Jardín Zen y Lago ===================
  celda(0, 2);
  zona('jardin', 'Jardín Zen y Lago', 1, 37, 17, 53, 'cesped', { letrero: [16.3, 37.6, 45], abierta: true });
  agua.push({ x0: tx(2.2), z0: tz(42.2), x1: tx(9.4), z1: tz(50.2), radio: 2.4 });
  P('muelle', 8.05, 46.2, 90, { w: 1.3, d: 2.9 });
  caminable.push({ x0: tx(6.6), z0: tz(45.6), x1: tx(9.6), z1: tz(46.8) });
  S('jardin', 'pescar', 6.95, 45.85, 270, 'sentado', 0.22, { item: 'cana' });
  S('jardin', 'pescar', 6.95, 46.6, 270, 'sentado', 0.22, { item: 'cana' });
  P('nenufares', 5.0, 44.5); P('nenufares', 4.0, 48.4); P('koi', 5.8, 46.2);
  P('puente_rojo', 5.8, 50.6, 90);
  P('deck', 13.8, 41.2, 0, { w: 3.4, d: 3.4 });
  for (const [x, z] of [[13.0, 40.6], [14.6, 40.6], [13.8, 41.9]]) { P('cojin', x, z, 0, { y: 0.15 }); S('jardin', 'meditar', x, z, 45, 'meditar', 0.24); }
  for (const z of [45.6, 48.1, 50.6]) { P('hamaca', 14.2, z, 90); S('jardin', 'hamaca', 14.2, z, 90, 'acostado', 0.62); }
  P('banca', 4.6, 39.1, 0); P('banca', 8.1, 39.1, 0);
  for (const x of [4.1, 5.1, 7.6, 8.6]) S('jardin', 'banca', x, 39.1, 0, 'sentado', 0.42);
  P('flores', 11.0, 44.2, 0, { w: 2.2, d: 1.0 }); P('flores', 11.0, 51.8, 0, { w: 2.2, d: 1.0 });
  S('jardin', 'jardineria', 11.0, 43.35, 0, 'agachado', 0, { item: 'regadera' });
  S('jardin', 'jardineria', 11.0, 50.95, 0, 'agachado', 0, { item: 'regadera' });
  S('jardin', 'observar_aves', 15.9, 52.3, 225, 'parado', 0, { item: 'binoculares' });
  P('torii', 16.2, 44.0, 90);
  P('linterna_piedra', 10.2, 41.4); P('linterna_piedra', 10.2, 48.6); P('linterna_piedra', 16.3, 41.2); P('linterna_piedra', 16.3, 46.8);
  P('jardin_zen', 3.8, 52.0, 0, { w: 3.2, d: 1.6 });
  P('bambu', 2.0, 40.2); P('bambu', 2.2, 52.4); P('bambu', 12.6, 52.6); P('bonsai', 13.8, 38.5);
  P('roca', 9.9, 43.0, 0, { s: 0.6 }); P('roca', 2.4, 41.4, 0, { s: 0.5 }); P('roca', 6.0, 51.4, 0, { s: 0.45 });
  P('piedras_paso', 12.6, 44.6, 0);
  for (const [x, z, s] of [[11.6, 38.6, 1.1], [3.6, 52.6, 0.8], [15.6, 50.0, 0.7], [9.6, 53.1, 0.8]]) arbol('cerezo', x, z, s);
  for (const [x, z, s] of [[6.3, 38.2, 0.7], [16.2, 44.6, 0.6], [1.7, 46.0, 0.8]]) arbol('redondo', x, z, s);

  // =================== Gimnasio y Campo de Entrenamiento ===================
  celda(1, 2);
  zona('gimnasio', 'Gimnasio y Entrenamiento', 19, 37, 35, 53, 'tierra', { letrero: [34.4, 37.6, 90], abierta: true });
  P('tapete', 25.2, 41.0, 0, { w: 11.6, d: 7.4 });
  P('estructura_sacos', 24.6, 39.8, 0, { xs: [21.8, 24.6, 27.4] });
  for (const x of [20.9, 23.7, 26.5]) S('gimnasio', 'boxeo', x, 39.8, 90);
  P('banco_pesas', 30.5, 39.6, 0); P('banco_pesas', 33.0, 39.6, 0);
  S('gimnasio', 'pesas', 30.5, 39.6, 0, 'sentado', 0.45, { item: 'mancuernas' });
  S('gimnasio', 'pesas', 33.0, 39.6, 0, 'sentado', 0.45, { item: 'mancuernas' });
  P('cinta', 30.5, 43.2, 0); P('cinta', 33.0, 43.2, 0);
  S('gimnasio', 'correr', 30.5, 43.2, 0, 'parado', 0.16); S('gimnasio', 'correr', 33.0, 43.2, 0, 'parado', 0.16);
  P('ring', 26.6, 45.4, 0, { w: 3.0, d: 3.0 });
  S('gimnasio', 'boxeo', 25.9, 45.4, 90, 'parado', 0.26); S('gimnasio', 'boxeo', 27.3, 45.4, 270, 'parado', 0.26);
  P('roca_grande', 22.4, 47.2, 0);
  S('gimnasio', 'roca', 20.9, 46.1, mirar(20.9, 46.1, 22.4, 47.2));
  for (const x of [25.5, 28.3, 31.1]) { P('diana', x, 52.3, 180); S('gimnasio', 'tiro_arco', x, 48.6, 0, 'parado', 0, { item: 'arco' }); }
  for (const z of [46.0, 49.0]) { P('muneco', 34.1, z); S('gimnasio', 'espada', 33.1, z, 90, 'parado', 0, { item: 'espada' }); }
  P('bebedero', 19.7, 45.0, 90); P('llantas', 20.4, 50.8); P('pesas_rack', 34.4, 41.6, 270);

  // =================== Sala Gamer ===================
  celda(2, 2);
  zona('gamer', 'Sala Gamer', 37, 37, 53, 45, 'alfombra_morada', { letrero: [52.4, 44.6, 90] });
  muro('gamer', 37, 37, 53, 37, 1.25, '#2b2840', { pacman: true });
  muro('gamer', 37, 37, 37, 42, 1.25, '#2b2840', { pacman: true });
  P('tele', 42.0, 37.3, 0, { w: 2.8 });
  P('alfombra_loading', 42.0, 40.0, 0, { w: 4.4, d: 2.6 });
  P('sofa', 42.0, 40.7, 180, { w: 2.7, c: '#3f4a5c' });
  for (const x of [41.15, 42.0, 42.85]) S('gamer', 'jugar_consola', x, 40.7, 180, 'sentado', 0.45, { item: 'control' });
  P('puf', 39.6, 39.9, 0, { c: '#e04f5f' }); P('puf', 44.4, 39.9, 0, { c: '#3cc0e0' });
  S('gamer', 'jugar_consola', 39.6, 39.9, mirar(39.6, 39.9, 42, 37.3), 'sentado', 0.3, { item: 'control' });
  S('gamer', 'jugar_consola', 44.4, 39.9, mirar(44.4, 39.9, 42, 37.3), 'sentado', 0.3, { item: 'control' });
  for (const [x, c] of [[47.2, '#e8473f'], [48.7, '#3f7ee8'], [50.2, '#f2c230']]) { P('arcade', x, 37.6, 0, { c }); S('gamer', 'arcade', x, 38.65, 180); }
  P('maquina_peluches', 52.3, 38.2, 270); S('gamer', 'arcade', 51.3, 38.2, 90);
  P('pingpong', 49.0, 42.3, 0);
  S('gamer', 'pingpong', 46.85, 42.3, 90, 'parado', 0, { item: 'raqueta' });
  S('gamer', 'pingpong', 51.15, 42.3, 270, 'parado', 0, { item: 'raqueta' });
  P('fantasmas', 38.0, 44.2, 0);
  P('neon_gameon', 37, 39.6, 90, { pared: true });

  // =================== Estudio de Música ===================
  zona('musica', 'Estudio de Música', 37, 45, 53, 53, 'madera_oscura', { letrero: [52.4, 52.6, 90], abierta: true });
  P('escenario', 45, 48.4, 0, { w: 9, d: 3.6, h: 0.35 });
  P('telon', 45, 46.55, 0, { w: 9.4 });
  P('truss', 45, 48.4, 0, { w: 9.4 });
  P('bateria', 45, 47.75, 0, { y: 0.35 });
  S('musica', 'bateria', 45, 47.05, 0, 'sentado', 0.8, { item: 'baquetas' });
  S('musica', 'guitarra', 42.1, 48.7, 25, 'parado', 0.35, { item: 'guitarra' });
  S('musica', 'guitarra', 47.9, 48.9, 55, 'parado', 0.35, { item: 'bajo' });
  P('teclado_musical', 49.0, 47.65, 0, { y: 0.35 });
  S('musica', 'teclado', 49.0, 47.05, 0, 'parado', 0.35);
  P('microfono', 45, 49.75, 0, { y: 0.35 });
  S('musica', 'cantar', 45, 49.2, 0, 'parado', 0.35);
  P('ampli', 41.0, 47.2, 20, { y: 0.35 }); P('ampli', 49.8, 49.6, 340, { y: 0.35 });
  P('foco_escenario', 40.4, 51.0, 30); P('foco_escenario', 49.6, 51.0, 330);
  P('bafles', 39.6, 48.2, 30); P('bafles', 50.4, 48.2, 330);
  for (const [x, z] of [[42.8, 51.7], [45.0, 52.1], [47.2, 51.7]]) S('musica', 'publico', x, z, 180);


  // =================== Calles del pueblo central, veredas y decoración entre zonas ===================
  absoluto();
  const CELDAS = [M + 2, M + 28, M + 54];
  const islas = [{ id: 'pueblo', nombre: 'el Pueblo Central', x0: M, z0: M, x1: M + 76, z1: M + 76, centro: true }];
  const puentes = [];
  // Calles del pueblo: las cuatro siguen por un puente hasta el anillo de una isla, o terminan en un mirador
  const calles = [
    { dir: 'z', c: R1, a: M + 0.6, b: 132 + 3.5 },   // x=R1: del mirador norte al Bosque Mágico
    { dir: 'z', c: R2, a: 42 - 3.5, b: 140 + 3.5 },  // x=R2: del Distrito Tecnológico al Mega Mall
    { dir: 'x', c: R1, a: 42 - 3.5, b: 132 + 3.5 },  // z=R1: de Raccoon City a la Ciudad del Cine
    { dir: 'x', c: R2, a: 42 - 3.5, b: 132 + 3.5 }   // z=R2: de la Isla Festival a la Playa del Sol
  ];
  puentes.push({ dir: 'z', c: R2, a: 42, b: M, isla: 'tec' }, { dir: 'x', c: R1, a: M + 76, b: 132, isla: 'cine' },
    { dir: 'x', c: R2, a: 42, b: M, isla: 'festival' }, { dir: 'z', c: R1, a: M + 76, b: 132, isla: 'bosque' },
    { dir: 'x', c: R1, a: 42, b: M, isla: 'raccoon' }, { dir: 'x', c: R2, a: M + 76, b: 132, isla: 'playa' },
    { dir: 'z', c: R2, a: M + 76, b: 140, isla: 'mall' });

  // Paseos (puntos libres para caminar) en los bordes de las celdas, nunca en el asfalto ni en los setos
  const paseos = [];
  for (const c of [R1, R2]) for (const k0 of CELDAS) paseos.push([c + 3.6, k0 + 3], [c + 3.6, k0 + 14], [k0 + 4, c + 3.6], [k0 + 16.5, c + 3.6]);
  paseos.forEach(([x, z], i) => S('paseo', 'pasear', x, z, (i * 97 + 20) % 360));
  celda(1, 1); S('paseo', 'pasear', 20.6, 33.4, 45); S('paseo', 'pasear', 33.6, 20.4, 200);
  celda(0, 1); S('paseo', 'pasear', 12.5, 33.0, 30); S('paseo', 'pasear', 6.0, 33.0, 60);
  celda(0, 2); S('paseo', 'pasear', 12.2, 47.4, 90);
  celda(1, 2); S('paseo', 'pasear', 29.2, 46.2, 10);
  absoluto();
  zonas.push({ id: 'paseo', nombre: 'las calles del pueblo', x0: 0, z0: 0, x1: 0, z1: 0, virtual: true });

  // Farolas en las veredas (alternadas) y en las esquinas de los cruces
  for (const c of [R1, R2]) for (let t = M + 6; t < M + 74; t += 9) {
    if (Math.abs(t - R1) < 4.8 || Math.abs(t - R2) < 4.8) continue;
    const lado = (Math.floor((t - M) / 9) % 2) ? 1 : -1;
    P('farola', c + lado * 2.6, t); P('farola', t, c - lado * 2.6);
  }
  // Semáforos solo en dos cruces (los otros dos tienen señal de pare)
  const SEMAFOROS = [[R1, R1], [R2, R2]];
  for (const cx of [R1, R2]) for (const cz of [R1, R2]) { if (SEMAFOROS.some(([a, b]) => a === cx && b === cz)) continue; P('farola', cx + 2.6, cz + 3.7); P('farola', cx - 2.6, cz - 3.7); }
  // Mobiliario urbano
  P('parada_bus', R1 + 3.4, R1 + 15, 270); P('buzon', R1 + 3.3, R1 - 6); P('hidrante', R1 - 3.3, R1 + 12); P('hidrante', R2 + 3.3, R2 - 6);
  P('basurero', R1 + 3.4, R1 - 4.6); P('basurero', R2 - 4.6, R1 + 3.4); P('basurero', R1 + 6.2, R2 + 3.4); P('basurero', R2 + 3.4, R1 - 4.6);
  P('senal', R1 - 2.6, R2 + 4.6, 45, { tipo: 'pare' }); P('senal', R2 + 2.6, R1 - 5.6, 45, { tipo: 'pare' }); P('senal', R1 + 2.6, R2 - 4.6, 45, { tipo: 'pueblo' });
  // Mirador en la calle que termina en el borde (las otras siguen por un puente)
  P('mirador', R1, M + 0.9, 180);

  // Setos, árboles y flores en los bordes de cada celda (dejando entradas en el centro de cada lado)
  for (const cx of CELDAS) for (const cz of CELDAS) {
    const x0 = cx, z0 = cz, x1 = cx + 20, z1 = cz + 20;
    for (const [ax, az] of [[x0 + 0.5, z0 + 0.5], [x1 - 0.5, z0 + 0.5], [x0 + 0.5, z1 - 0.5], [x1 - 0.5, z1 - 0.5]]) arbol('redondo', ax, az, 0.75);
    for (const [a, b, fijo, eje] of [[x0 + 1.4, x0 + 5.5, z1 - 0.5, 'x'], [x1 - 5.5, x1 - 1.4, z1 - 0.5, 'x'], [z0 + 1.4, z0 + 5.5, x1 - 0.5, 'z'], [z1 - 5.5, z1 - 1.4, x1 - 0.5, 'z']]) {
      P('seto', eje === 'x' ? (a + b) / 2 : fijo, eje === 'x' ? fijo : (a + b) / 2, eje === 'x' ? 0 : 90, { w: b - a });
    }
    P('flores', x0 + 0.55, (z0 + z1) / 2 - 3, 90, { w: 2.2, d: 0.7 });
    P('flores', (x0 + x1) / 2 + 3, z0 + 0.55, 0, { w: 2.2, d: 0.7 });
  }

  // Borde del pueblo: árboles atrás (no tapan), arbustos, rocas y flores adelante, y una cerca baja
  const enCalle = (t) => Math.abs(t - R1) < 3.6 || Math.abs(t - R2) < 3.6;
  const xCascada = ORIG_N[0] + (5.8 - ORIG_V[0]) * F;
  for (let t = M + 1.6; t < M + 75; t += 2.3) {
    if (enCalle(t)) continue;
    const k = Math.floor(t * 7) % 4;
    for (const [x, z] of [[t, M + 0.8], [M + 0.8, t]]) { if (k === 0 || k === 2) arbol('pino', x, z, 0.75 + (k ? 0.15 : 0)); else arbol('redondo', x, z, 0.7); }
    for (const [x, z, sur] of [[t, M + 75.2, true], [M + 75.2, t, false]]) {
      if (sur && Math.abs(t - xCascada) < 1.6) continue;
      if (k === 1) P('roca', x, z, 0, { s: 0.42 }); else if (k === 3) P('flores', x, z, 0, { w: 1.0, d: 0.6 }); else arbol('arbusto', x, z, 0.62);
    }
  }
  const tramos = [[M + 1.5, R1 - 3.4], [R1 + 3.4, R2 - 3.4], [R2 + 3.4, M + 74.5]];
  for (const [a, b] of tramos) P('cerca', M + 75.75, (a + b) / 2, 90, { w: b - a });
  for (const [a, b] of [[M + 1.5, xCascada - 1.1], [xCascada + 1.1, R1 - 3.4], [R1 + 3.4, R2 - 3.4], [R2 + 3.4, M + 74.5]]) P('cerca', (a + b) / 2, M + 75.75, 0, { w: b - a });
  // El lago del jardín desborda por el borde sur del pueblo
  const cascada = { x: xCascada, z0: ORIG_N[2] + (50.0 - ORIG_V[2]) * F, z1: M + 76, ancho: 1.6 };

  // Decoración de eventos en el pueblo (solo se ven durante el evento)
  celda(1, 1);
  for (const [x, z] of [[24.6, 22.4], [29.4, 22.4], [22.4, 29.4], [31.6, 24.6]]) P('calabaza', x, z, 30, { evento: 'halloween' });
  celda(0, 0); P('telarana', 1.2, 1.2, 45, { evento: 'halloween', y: 1.2 }); P('calabaza', 8.0, 14.6, 10, { evento: 'halloween' }); P('calabaza', 10.0, 14.6, 340, { evento: 'halloween' });
  celda(0, 1); P('fantasma', 4.5, 26.5, 0, { evento: 'halloween', y: 1.2 }); P('calabaza', 11.8, 29.8, 0, { evento: 'halloween' });
  absoluto();
  for (const cx of [R1, R2]) for (const cz of [R1, R2]) P('calabaza', cx + 4.6, cz + 3.3, 45, { evento: 'halloween' });

  // =================== Islas temáticas ===================
  // Cada isla es un cuadrado de 40 con un anillo de calle a 3.5 del borde y un bloque central de 27x27.
  function satelite(id, nombre, x0, z0, extra) {
    const I = Object.assign({ id, nombre, x0, z0, x1: x0 + 40, z1: z0 + 40 }, extra || {});
    islas.push(I);
    const a = 3.5;
    calles.push({ dir: 'x', c: z0 + a, a: x0 + a, b: x0 + 40 - a, anillo: id }, { dir: 'x', c: z0 + 40 - a, a: x0 + a, b: x0 + 40 - a, anillo: id },
      { dir: 'z', c: x0 + a, a: z0 + a, b: z0 + 40 - a, anillo: id }, { dir: 'z', c: x0 + 40 - a, a: z0 + a, b: z0 + 40 - a, anillo: id });
    return I;
  }
  const areaAbs = (u0, v0, u1, v1) => [tx(u0), tz(v0), tx(u1), tz(v1)];
  const animales = [];

  // ---------- Distrito Tecnológico (arriba a la derecha) ----------
  satelite('tec', 'el Distrito Tecnológico', 80, 2, { tema: 'tec' });
  absoluto(); P('arco_isla', R2, 42.7, 0, { texto: 'DISTRITO TECNOLÓGICO', c: '#2f8fe0', c2: '#e9f4ff' });
  bloque(86.5, 8.5);
  zona('tec', 'el Distrito Tecnológico', 0, 0, 27, 27, 'cesped', { abierta: true });
  const EMPRESAS = [
    // id, letrero, nombre de la zona, u, v, alto, color, color 2, quiénes trabajan ahí, giro
    ['cyberlife', 'CYBERLIFE', 'la Torre CyberLife', 2.8, 2.8, 24, '#e9eef3', '#2f8fe0', ['connor', 'markus', 'kara', 'diana', 'kamski', 'chloe'], 0],
    ['openai', 'OPENAI', 'la Torre OpenAI', 8.2, 2.8, 20, '#2a2b31', '#f2f2f2', ['chatgpt', 'codex'], 0],
    ['anthropic', 'ANTHROPIC', 'la Torre Anthropic', 13.6, 2.8, 22, '#d9a27e', '#f6efe4', ['claude'], 0],
    ['google', 'GOOGLE', 'la Torre Google', 19.0, 2.8, 18, '#f1f3f6', '#4285f4', ['gemini'], 0],
    ['microsoft', 'MICROSOFT', 'la Torre Microsoft', 24.4, 2.8, 15, '#c7ccd4', '#00a4ef', ['copilot'], 0],
    ['deepseek', 'DEEPSEEK', 'la Torre DeepSeek', 2.8, 9.6, 16, '#2c48b5', '#86a2ff', ['deepseek'], 90],
    ['qwen', 'QWEN', 'la Torre Qwen', 2.8, 15.0, 13, '#5b3fd2', '#ff9a3c', ['qwen'], 90],
    ['umbrella', 'UMBRELLA CORP', 'Umbrella Corporation', 2.8, 20.4, 11, '#ebe7e2', '#c8202a', ['wesker', 'ada', 'chris', 'jill'], 90]
  ];
  for (const [id, texto, nombre, u, v, h, c, c2, quienes, r] of EMPRESAS) {
    zona('hq_' + id, nombre, u - 2.4, v - 2.4, u + 2.4, v + 2.4, 'concreto');
    P('torre_empresa', u, v, r, { w: 4.8, d: 4.8, h, c, c2, marca: id, texto });
    const pu = r ? [u + 3.1, v] : [u, v + 3.1];
    S('hq_' + id, 'trabajar_hq', pu[0], pu[1], r ? 270 : 180, 'dentro', 0, { solo: quienes, lugar: nombre });
  }
  zona('hq_ollama', 'la casita de Ollama', 1.0, 23.4, 5.0, 26.8, 'concreto');
  P('edificio_ollama', 3.0, 25.1, 90);
  S('hq_ollama', 'trabajar_hq', 5.6, 25.1, 270, 'dentro', 0, { solo: ['ollama'], lugar: 'la casita de Ollama' });
  // Centro de datos (abierto por delante para ver los racks)
  zona('tec_datos', 'el Centro de Datos', 7.6, 7.8, 16.4, 13.6, 'metal');
  muro('tec_datos', 7.6, 7.8, 16.4, 7.8, 2.2, '#26304a', { neon: '#3fd0ff' });
  muro('tec_datos', 7.6, 7.8, 7.6, 13.6, 2.2, '#26304a', { neon: '#3fd0ff' });
  for (let i = 0; i < 7; i++) P('rack', 8.6 + i * 1.22, 8.35, 0);
  for (const u of [9.8, 12.2, 14.6]) S('tec_datos', 'servidores', u, 9.6, 180);
  for (const u of [11.0, 14.2]) {
    P('escritorio', u, 12.6, 0, { monitor: 'codigo', monitores: 2 });
    P('silla', u, 11.8, 0, { c: '#1e2230', gamer: true });
    S('tec_datos', 'programar', u, 11.8, 0, 'sentado', 0.45);
  }
  P('holograma', 8.8, 12.6, 0);
  // Terraza de coworking
  zona('tec_cowork', 'la Terraza Coworking', 17.6, 7.8, 26.8, 14.2, 'madera_clara', { abierta: true });
  for (const u of [19.2, 22.0, 24.8]) {
    P('mesa_laptop', u, 9.4, 0);
    P('silla', u, 8.65, 0, { c: '#e8e2d8' });
    S('tec_cowork', 'programar', u, 8.65, 0, 'sentado', 0.45);
  }
  P('mesa_redonda', 21.0, 12.4, 0);
  for (const [x, z, r] of [[21.0, 11.45, 0], [21.0, 13.35, 180], [20.05, 12.4, 90], [21.95, 12.4, 270]]) { P('silla', x, z, r, { c: '#e8e2d8' }); S('tec_cowork', 'reunion', x, z, r, 'sentado', 0.45); }
  P('sombrilla', 24.6, 12.6, 0, { c: '#2f8fe0' }); P('planta', 26.3, 8.2); P('planta', 18.1, 13.8);
  // Plaza tecnológica
  zona('tec_plaza', 'la Plaza Tecnológica', 7.6, 14.8, 27, 27, 'concreto', { abierta: true });
  P('fuente_holo', 17.0, 20.5);
  for (const [x, z] of [[14.6, 18.1], [19.4, 18.1], [14.6, 22.9]]) S('tec_plaza', 'fuente', x, z, mirar(x, z, 17, 20.5));
  for (const [x, z, r] of [[12.4, 20.5, 90], [21.6, 20.5, 270], [17.0, 24.8, 180]]) {
    P('banca', x, z, r);
    const ox = Math.cos(r * Math.PI / 180) * 0.5, oz = -Math.sin(r * Math.PI / 180) * 0.5;
    S('tec_plaza', 'banca', x + ox, z + oz, r, 'sentado', 0.42); S('tec_plaza', 'banca', x - ox, z - oz, r, 'sentado', 0.42);
  }
  P('food_truck', 25.4, 18.4, 270, { tipo: 'cafe', c: '#33363e', texto: 'CAFÉ' });
  S('tec_plaza', 'tomar_te', 23.4, 17.8, 90, 'parado', 0, { item: 'taza' }); S('tec_plaza', 'tomar_te', 23.4, 19.0, 90, 'parado', 0, { item: 'taza' });
  for (const u of [8.4, 9.9, 11.4]) { P('capsula', u, 25.7, 0); S('tec_plaza', 'recargar', u, 25.75, 0, 'parado', 0.12); }
  P('letras_ia', 10.4, 17.0, 45);
  for (const [x, z] of [[8.6, 15.6], [26.0, 15.4], [26.2, 26.2], [16.6, 26.4]]) P('farola_moderna', x, z);
  arbol('redondo', 8.4, 21.4, 0.8); arbol('redondo', 25.8, 22.8, 0.75); arbol('redondo', 14.0, 26.2, 0.7); arbol('redondo', 20.8, 26.2, 0.7);
  absoluto(); P('calabaza', R2 - 2.2, 41.2, 20, { evento: 'halloween' }); P('calabaza', R2 + 2.2, 41.2, 340, { evento: 'halloween' });
  bloque(86.5, 8.5);
  animales.push({ tipo: 'perro_robot', n: 1, area: areaAbs(8.5, 15.5, 26.5, 26.5) }, { tipo: 'dron', n: 3, area: areaAbs(1, 1, 26, 26), vuela: true });

  // ---------- Ciudad del Cine (abajo a la derecha) ----------
  satelite('cine', 'la Ciudad del Cine', 132, 54, { tema: 'cine' });
  absoluto(); P('arco_isla', 131.3, R1, 270, { texto: 'CIUDAD DEL CINE', c: '#c8202a', c2: '#ffe7a8' });
  bloque(138.5, 60.5);
  zona('cine', 'la Ciudad del Cine', 0, 0, 27, 27, 'cesped', { abierta: true });
  // Autocine
  zona('cine_auto', 'el Autocine', 0.5, 0.5, 13.8, 10.5, 'cesped', { abierta: true });
  P('pantalla_autocine', 7.0, 1.3, 0, { w: 11, h: 5.2 });
  const PUFS = ['#e04f5f', '#3cc0e0', '#f2c230', '#7fbf7f'];
  [5.2, 7.4].forEach((v, f) => [3.2, 5.6, 8.0, 10.4].forEach((u, k) => { P('puf', u, v, 0, { c: PUFS[(k + f) % 4] }); S('cine_auto', 'ver_pelicula', u, v, 180, 'sentado', 0.3); }));
  P('auto_clasico', 2.6, 9.4, 180, { c: '#d64541' }); P('auto_clasico', 11.2, 9.4, 180, { c: '#3a8fd8' });
  P('carrito_palomitas', 13.0, 6.8, 270);
  S('cine_auto', 'snack', 11.9, 6.2, 90, 'parado', 0, { item: 'palomitas' }); S('cine_auto', 'snack', 11.9, 7.4, 90, 'parado', 0, { item: 'palomitas' });
  // Set de rodaje
  zona('cine_set', 'el Set de Rodaje', 14.6, 0.5, 26.6, 10.5, 'concreto', { abierta: true });
  P('fondo_verde', 20.2, 1.1, 0, { w: 9, h: 4 });
  S('cine_set', 'actuar', 18.8, 3.6, 0); S('cine_set', 'actuar', 21.4, 3.6, 0);
  P('grua_camara', 23.4, 7.6, mirar(23.4, 7.6, 20.2, 3.6));
  S('cine_set', 'grabar', 19.8, 7.4, 180);
  P('silla_director', 25.2, 9.0, mirar(25.2, 9.0, 20.2, 3.6)); S('cine_set', 'dirigir', 25.2, 9.0, mirar(25.2, 9.0, 20.2, 3.6), 'sentado', 0.55);
  P('foco_estudio', 15.8, 6.2, mirar(15.8, 6.2, 20, 3.6)); P('foco_estudio', 25.6, 3.4, mirar(25.6, 3.4, 20, 3.6));
  P('claqueta', 17.0, 8.8, 30); P('caja_equipo', 15.4, 9.4, 10); P('caja_equipo', 16.3, 9.7, 80);
  // Paseo de la Fama
  zona('cine_paseo', 'el Paseo de la Fama', 0, 11, 27, 16, 'baldosa', { abierta: true });
  for (let k = 0; k < 9; k++) P('estrella_fama', 1.6 + k * 2.95, 12.3 + (k % 2) * 2.3, 0);
  for (const u of [3.2, 10.0, 17.0, 24.0]) { arbol('palmera', u, 11.2, 0.95); arbol('palmera', u + 3.4, 15.8, 0.9); }
  P('rollo_pelicula', 16.0, 13.5, 45);
  for (const [x, z, r] of [[6.0, 15.6, 180], [21.4, 15.6, 180]]) {
    P('banca', x, z, r);
    S('cine_paseo', 'banca', x + 0.5, z, r, 'sentado', 0.42); S('cine_paseo', 'banca', x - 0.5, z, r, 'sentado', 0.42);
  }
  // Estudio de edición (abierto por delante)
  zona('cine_edicion', 'el Estudio de Edición', 1.0, 17.0, 12.6, 26.6, 'alfombra_oscura');
  muro('cine_edicion', 1.0, 17.0, 12.6, 17.0, 2.0, '#3b2f47', { espuma: true });
  muro('cine_edicion', 1.0, 17.0, 1.0, 26.6, 2.0, '#3b2f47');
  P('letrero_youtube', 6.8, 17.0, 0, { pared: true, y: 0.7 });
  for (const u of [3.9, 9.4]) {
    P('escritorio', u, 18.0, 0, { w: 3.2, monitor: 'edicion', monitores: 3, invertido: true });
    for (const d of [-0.9, 0.9]) { P('silla', u + d, 19.0, 180, { c: '#202020', gamer: true }); S('cine_edicion', 'editar_video', u + d, 19.0, 180, 'sentado', 0.45); }
  }
  P('mesa_redonda', 9.4, 23.4, 0, { mics: true });
  P('silla', 8.45, 23.4, 90, { c: '#444' }); P('silla', 10.35, 23.4, 270, { c: '#444' });
  S('cine_edicion', 'podcast', 8.45, 23.4, 90, 'sentado', 0.45); S('cine_edicion', 'podcast', 10.35, 23.4, 270, 'sentado', 0.45);
  P('sofa', 2.3, 23.2, 90, { w: 2.2, c: '#5b4a7a' }); S('cine_edicion', 'siesta', 2.3, 23.2, 90, 'sentado', 0.45);
  P('neon_texto', 1.0, 20.6, 90, { pared: true, texto: 'EDICIÓN', c: '#ff3ad0', y: 1.0 });
  P('planta', 12.0, 26.0); P('planta', 1.6, 26.0);
  // Cine
  zona('cine_sala', 'el Cine', 15.0, 17.4, 25.0, 25.6, 'concreto');
  P('cine', 20.0, 21.5, 0, { w: 10, d: 8, h: 4.6, texto: 'CINE PUEBLO' });
  S('cine_sala', 'ver_pelicula', 19.0, 26.3, 180, 'dentro', 0, { lugar: 'el Cine' }); S('cine_sala', 'ver_pelicula', 21.0, 26.3, 180, 'dentro', 0, { lugar: 'el Cine' });
  // Evento de Red John: la carita aparece en la pared del cine y el CBI investiga
  P('redjohn_grande', 25.0, 21.5, 90, { pared: true, y: 1.0, evento: 'red_john' });
  S('cine_sala', 'investigar', 26.1, 20.6, 270, 'parado', 0, { solo: ['jane', 'lisbon', 'cho'], evento: 'red_john' });
  S('cine_sala', 'investigar', 26.1, 22.4, 270, 'parado', 0, { solo: ['jane', 'lisbon', 'cho'], evento: 'red_john' });
  S('cine_sala', 'investigar', 26.2, 23.9, 300, 'parado', 0, { solo: ['jane', 'lisbon', 'cho'], evento: 'red_john' });
  P('arbol_navidad', 8.0, 13.6, 0, { evento: 'navidad' }); P('muneco_nieve', 11.4, 14.2, 300, { evento: 'navidad' });
  P('calabaza', 1.2, 12.0, 60, { evento: 'halloween' }); P('calabaza', 1.2, 15.0, 120, { evento: 'halloween' });
  animales.push({ tipo: 'perro', n: 1, area: areaAbs(0.5, 11, 26.5, 16) });

  // ---------- Isla Festival (arriba a la izquierda) ----------
  satelite('festival', 'la Isla Festival', 2, 80, { tema: 'festival' });
  absoluto(); P('arco_isla', 42.7, R2, 90, { texto: 'ISLA FESTIVAL', c: '#ff3ad0', c2: '#fff0fb' });
  bloque(8.5, 86.5);
  zona('festival', 'la Isla Festival', 0, 0, 27, 27, 'cesped', { abierta: true });
  // Escenario principal girado hacia la cámara
  const ESC = [7.5, 7.5, 45];
  const enEsc = (lx, lz) => { const a = ESC[2] * Math.PI / 180; return [ESC[0] + lx * Math.cos(a) + lz * Math.sin(a), ESC[1] - lx * Math.sin(a) + lz * Math.cos(a)]; };
  zona('fest_escenario', 'el Escenario Principal', 0.5, 0.5, 17.5, 17.5, 'cesped', { abierta: true });
  P('escenario_grande', ESC[0], ESC[1], ESC[2], { w: 12, d: 6.5, h: 0.7 });
  const Y = 0.7;
  let q = enEsc(0, -1.0); P('bateria', q[0], q[1], ESC[2], { y: Y });
  q = enEsc(0, -1.7); S('fest_escenario', 'bateria', q[0], q[1], ESC[2], 'sentado', Y + 0.45, { item: 'baquetas' });
  q = enEsc(-4.4, -0.6); P('teclado_musical', q[0], q[1], ESC[2], { y: Y });
  q = enEsc(-4.4, -1.2); S('fest_escenario', 'teclado', q[0], q[1], ESC[2], 'parado', Y);
  q = enEsc(0, 2.3); P('microfono', q[0], q[1], ESC[2], { y: Y });
  q = enEsc(0, 1.75); S('fest_escenario', 'cantar', q[0], q[1], ESC[2], 'parado', Y);
  q = enEsc(-2.9, 0.6); S('fest_escenario', 'guitarra', q[0], q[1], ESC[2] - 20, 'parado', Y, { item: 'guitarra' });
  q = enEsc(2.9, 0.6); S('fest_escenario', 'guitarra', q[0], q[1], ESC[2] + 20, 'parado', Y, { item: 'bajo' });
  for (const lz of [5.4, 7.2, 9.0]) for (const lx of [-3.6, -1.2, 1.2, 3.6]) { q = enEsc(lx + (lz === 7.2 ? 0.6 : 0), lz); S('fest_escenario', 'publico', q[0], q[1], ESC[2] + 180 + lx * 3); }
  // DJ y pista de baile
  zona('fest_dj', 'la Cabina del DJ', 17.6, 0.5, 26.6, 10.6, 'cesped', { abierta: true });
  P('cabina_dj', 21.6, 2.4, 0);
  S('fest_dj', 'dj', 21.6, 1.75, 0, 'parado', 0.5);
  P('pista_baile', 21.6, 7.4, 0, { w: 6, d: 5 });
  for (const [x, z] of [[19.8, 6.2], [23.4, 6.2], [21.6, 7.4], [19.8, 8.7], [23.4, 8.7]]) S('fest_dj', 'bailar', x, z, 45);
  P('torre_luces', 18.0, 1.0, 0); P('torre_luces', 25.8, 1.0, 0);
  // Bar karaoke (abierto por delante)
  zona('fest_karaoke', 'el Bar Karaoke', 0.8, 17.6, 11.0, 26.6, 'madera_oscura');
  muro('fest_karaoke', 0.8, 17.6, 11.0, 17.6, 2.0, '#4a2a4a', { franja: '#ff3ad0' });
  muro('fest_karaoke', 0.8, 17.6, 0.8, 26.6, 2.0, '#4a2a4a');
  P('neon_texto', 7.8, 17.6, 0, { pared: true, texto: 'KARAOKE', c: '#ff3ad0', y: 1.05 });
  P('tarima', 3.4, 19.3, 0, { w: 3.6, d: 2.0, h: 0.25 });
  P('pantalla_karaoke', 3.4, 17.6, 0, { pared: true, y: 0.75 });
  P('microfono', 2.8, 19.8, 0, { y: 0.25 }); P('microfono', 4.0, 19.8, 0, { y: 0.25 });
  S('fest_karaoke', 'karaoke', 2.8, 19.3, 0, 'parado', 0.25); S('fest_karaoke', 'karaoke', 4.0, 19.3, 0, 'parado', 0.25);
  P('barra_te', 8.2, 22.6, 0, { w: 4.4 });
  for (const u of [6.7, 7.9, 9.1]) { P('taburete', u, 21.75, 0, { alto: true }); S('fest_karaoke', 'tomar_te', u, 21.75, 0, 'sentado', 0.66, { item: 'taza' }); }
  P('sofa', 2.2, 24.4, 90, { w: 2.2, c: '#7a3b6e' });
  S('fest_karaoke', 'banca', 2.2, 23.9, 90, 'sentado', 0.45); S('fest_karaoke', 'banca', 2.2, 24.9, 90, 'sentado', 0.45);
  P('bola_disco', 6.0, 21.0, 0, { y: 2.5 });
  // Tienda de música
  zona('fest_tienda', 'la Tienda de Música', 13.0, 19.6, 21.0, 26.6, 'madera');
  muro('fest_tienda', 13.0, 19.6, 21.0, 19.6, 1.8, '#e9d8b9');
  muro('fest_tienda', 13.0, 19.6, 13.0, 26.6, 1.8, '#e9d8b9');
  P('estante_guitarras', 17.0, 19.6, 0, { pared: true });
  P('piano', 17.4, 23.4, 270); S('fest_tienda', 'teclado', 16.6, 23.4, 90, 'sentado', 0.45);
  P('taburete', 19.6, 21.8, 0); S('fest_tienda', 'guitarra', 19.6, 21.8, 45, 'sentado', 0.55, { item: 'guitarra' });
  P('planta', 20.4, 26.0);
  // Comida
  zona('fest_comida', 'el Patio de Comidas', 21.5, 12.0, 27, 27, 'cesped', { abierta: true });
  P('food_truck', 25.4, 15.0, 270, { tipo: 'tacos', c: '#e8a82a', texto: 'TACOS' });
  P('food_truck', 25.4, 20.6, 270, { tipo: 'hamburguesas', c: '#d64541', texto: 'BURGERS' });
  for (const z of [14.4, 15.6, 20.0, 21.2]) S('fest_comida', 'comer', 23.4, z, 90, 'parado', 0, { item: 'comida' });
  P('mesa_picnic', 23.0, 25.0, 0);
  for (const [x, z, r] of [[22.2, 24.3, 0], [23.8, 24.3, 0], [22.2, 25.7, 180], [23.8, 25.7, 180]]) S('fest_comida', 'comer', x, z, r, 'sentado', 0.42, { item: 'comida' });
  P('guitarra_gigante', 17.2, 16.2, 45);
  P('guirnaldas', 0, 0, 0, { pts: [[2.0, 16.4], [16.4, 2.0], [19.0, 14.0], [14.0, 19.0]] });
  for (const [x, z] of [[0.9, 0.9], [26.2, 11.4], [12.2, 26.2], [0.9, 16.8]]) arbol('redondo', x, z, 0.8);
  P('arbol_navidad', 20.4, 13.4, 0, { evento: 'navidad' });
  P('calabaza', 26.0, 12.4, 40, { evento: 'halloween' }); P('calabaza', 26.0, 14.8, 70, { evento: 'halloween' });

  // ---------- Bosque Mágico (abajo a la izquierda) ----------
  satelite('bosque', 'el Bosque Mágico', 54, 132, { tema: 'bosque' });
  absoluto(); P('arco_isla', R1, 131.3, 180, { texto: 'BOSQUE MÁGICO', c: '#7a4fd8', c2: '#e8dcff' });
  bloque(60.5, 138.5);
  zona('bosque', 'el Bosque Mágico', 0, 0, 27, 27, 'musgo', { abierta: true });
  // Torre del mago
  zona('bosque_torre', 'la Torre del Mago', 0.5, 0.5, 9, 8.6, 'musgo', { abierta: true });
  P('torre_mago', 3.2, 3.6, 45, { h: 11 });
  S('bosque_torre', 'estudiar_magia', 5.1, 5.5, 225, 'dentro', 0, { solo: ['gandalf'], lugar: 'la Torre del Mago' });
  P('mesa_magia', 7.2, 6.0, 0);
  P('taburete', 7.2, 5.25, 0); P('taburete', 7.2, 6.75, 0);
  S('bosque_torre', 'estudiar_magia', 7.2, 5.25, 0, 'sentado', 0.55, { item: 'libro' }); S('bosque_torre', 'estudiar_magia', 7.2, 6.75, 180, 'sentado', 0.55, { item: 'libro' });
  // Ruinas antiguas y el portal
  zona('bosque_ruinas', 'las Ruinas Antiguas', 18, 0.5, 26.6, 8.6, 'piedra_antigua', { abierta: true });
  P('portal', 22.2, 3.4, 0);
  P('ruinas', 22.2, 3.4, 0);
  S('bosque_ruinas', 'explorar', 20.4, 6.4, 160); S('bosque_ruinas', 'explorar', 24.2, 6.8, 210); S('bosque_ruinas', 'explorar', 25.6, 1.6, 270, 'agachado', 0, { item: 'antorcha' });
  // Árbol ancestral
  zona('bosque_arbol', 'el Árbol Ancestral', 9, 8.6, 18, 17.6, 'musgo', { abierta: true });
  P('arbol_ancestral', 13.5, 12.6, 0);
  for (const a of [45, 135, 225, 315]) {
    const x = 13.5 + Math.sin(a * Math.PI / 180) * 3.5, z = 12.6 + Math.cos(a * Math.PI / 180) * 3.5;
    P('cojin', x, z, 0, { y: 0.15, c: '#7a4fd8' }); S('bosque_arbol', 'meditar', x, z, mirar(x, z, 13.5, 12.6), 'meditar', 0.24);
  }
  // Círculo de piedras
  P('circulo_piedras', 4.4, 14.2, 0);
  S('bosque', 'meditar', 4.4, 14.2, 45, 'meditar', 0.12);
  S('bosque', 'observar_aves', 6.8, 16.6, 315, 'parado', 0, { item: 'binoculares' });
  // Choza de pociones
  zona('bosque_pociones', 'la Choza de Pociones', 18, 10.4, 26.6, 17.6, 'musgo', { abierta: true });
  P('choza_bruja', 23.0, 14.0, 270);
  P('caldero', 19.9, 14.0, 0);
  S('bosque_pociones', 'pociones', 19.9, 12.85, 0); S('bosque_pociones', 'pociones', 18.75, 14.0, 90);
  // Fogata de fuego azul
  P('fogata', 13.5, 21.0, 0, { azul: true });
  P('tronco', 13.5, 18.85, 0); P('tronco', 13.5, 23.15, 0); P('tronco', 11.35, 21.0, 90); P('tronco', 15.65, 21.0, 90);
  for (const x of [12.9, 14.1]) { S('bosque', 'fogata', x, 18.9, 0, 'sentado', 0.34); S('bosque', 'fogata', x, 23.1, 180, 'sentado', 0.34); }
  S('bosque', 'fogata', 11.4, 21.0, 90, 'sentado', 0.34); S('bosque', 'fogata', 15.6, 21.0, 270, 'sentado', 0.34);
  // Lago encantado
  zona('bosque_lago', 'el Lago Encantado', 16.6, 18.8, 27, 27, 'musgo', { abierta: true });
  agua.push({ x0: tx(17.4), z0: tz(19.6), x1: tx(25.8), z1: tz(26.2), radio: 2.6, magica: true });
  P('muelle', 17.3, 22.8, 90, { w: 1.2, d: 2.6 });
  caminable.push({ x0: tx(16.0), z0: tz(22.2), x1: tx(18.6), z1: tz(23.4) });
  S('bosque_lago', 'pescar', 18.2, 22.45, 90, 'sentado', 0.22, { item: 'cana' }); S('bosque_lago', 'pescar', 18.2, 23.15, 90, 'sentado', 0.22, { item: 'cana' });
  P('nenufares', 21.0, 21.2, 0, { brillo: true }); P('nenufares', 23.8, 24.4, 0, { brillo: true }); P('nenufares', 20.0, 25.0, 0, { brillo: true });
  // Cristales y tiro con arco élfico
  P('cristales', 4.2, 21.0, 0);
  S('bosque', 'recolectar', 2.6, 19.4, mirar(2.6, 19.4, 4.2, 21.0), 'agachado'); S('bosque', 'recolectar', 5.9, 19.3, mirar(5.9, 19.3, 4.2, 21.0), 'agachado');
  for (const u of [8.4, 10.6]) { P('diana', u, 26.3, 180); S('bosque', 'tiro_arco', u, 22.8, 0, 'parado', 0, { item: 'arco' }); }
  // Casitas de hongo, hongos gigantes, faroles de hada y senderos que brillan
  P('casa_hongo', 9.8, 2.4, 20, { c: '#d6453f' });
  S('bosque', 'dormir', 10.6, 4.0, 20, 'dentro', 0, { solo: ['silva'], lugar: 'su casita de hongo' }); P('casa_hongo', 17.2, 2.6, 330, { c: '#7a4fd8' }); P('casa_hongo', 1.8, 25.4, 40, { c: '#3fb8d6' });
  for (const [u, v, s, c] of [[8.4, 9.8, 1.2, '#ff6ad5'], [18.6, 8.6, 0.9, '#6ae0ff'], [1.4, 9.4, 1.4, '#b06aff'], [26.0, 9.6, 1.0, '#6affb0'], [7.4, 17.2, 0.8, '#ffb06a'], [16.8, 17.4, 0.7, '#ff6ad5'], [26.2, 17.6, 0.9, '#6ae0ff'], [12.4, 26.2, 1.0, '#b06aff'], [1.0, 19.0, 0.7, '#6affb0'], [6.4, 26.2, 0.8, '#ff6ad5']]) P('hongo_gigante', u, v, (u * 37) % 360, { s, c });
  for (const v of [1.2, 3.2, 5.2, 7.0]) P('piedras_brillo', 13.5 + Math.sin(v) * 0.4, v, 0);
  for (const [u, v] of [[11.8, 4.6], [15.2, 6.6], [10.0, 16.0], [17.0, 10.0], [8.6, 21.0], [16.8, 26.4]]) P('farol_hada', u, v);
  for (const [u, v] of [[6.2, 11.4], [10.4, 7.6], [19.6, 18.0], [3.2, 7.6], [24.2, 9.0], [11.0, 24.4], [15.4, 25.8]]) P('flores_brillo', u, v, (u * 53) % 360);
  for (const [u, v, s] of [[0.8, 0.8, 1.0], [5.6, 0.8, 0.8], [25.4, 0.9, 0.9], [0.8, 11.0, 0.9], [0.8, 16.8, 0.8], [26.2, 11.8, 0.8], [20.2, 9.2, 0.7], [10.6, 18.0, 0.7], [26.2, 26.2, 0.8], [0.9, 22.6, 0.8]]) arbol('magico', u, v, s);
  for (const [u, v, s] of [[2.0, 0.9, 0.9], [7.4, 1.0, 0.8], [26.2, 3.6, 0.9], [26.3, 7.0, 0.7], [0.9, 13.4, 0.8]]) arbol('pino', u, v, s);
  P('calabaza', 12.0, 1.0, 0, { evento: 'halloween' }); P('calabaza', 15.0, 1.0, 0, { evento: 'halloween' }); P('fantasma', 21.0, 18.0, 0, { evento: 'halloween', y: 1.4 }); P('calabaza', 11.4, 19.0, 0, { evento: 'halloween' });
  P('muneco_nieve', 24.6, 10.6, 300, { evento: 'navidad' });
  animales.push(
    { tipo: 'ciervo', n: 3, area: areaAbs(1, 8, 26, 18.5) }, { tipo: 'conejo', n: 5, area: areaAbs(1, 1, 26, 26) }, { tipo: 'zorro', n: 2, area: areaAbs(1, 8, 16, 26) },
    { tipo: 'unicornio', n: 1, area: areaAbs(3, 8, 24, 18) }, { tipo: 'buho', n: 2, area: areaAbs(9, 8.6, 18, 17.6), vuela: true }, { tipo: 'fuego_fatuo', n: 8, area: areaAbs(0, 0, 27, 27), vuela: true }
  );

  // =================== Anillo exterior: cuatro islas más ===================
  // Parque Deportivo (derecha) y Barrio Residencial (izquierda) en las esquinas libres; Raccoon City (arriba)
  // y la Playa del Sol (abajo) al final de las calles z=R1 y z=R2. Calles cortas con puente las unen a sus vecinas.
  function enlace(dir, c, a, b, pa, pb, isla) { calles.push({ dir, c, a, b }); puentes.push({ dir, c, a: pa, b: pb, isla }); }
  const mesaPicnic = (zonaId, u, v) => { P('mesa_picnic', u, v, 0); for (const [x, z, r] of [[u - 0.8, v - 0.7, 0], [u + 0.8, v - 0.7, 0], [u - 0.8, v + 0.7, 180], [u + 0.8, v + 0.7, 180]]) S(zonaId, 'comer', x, z, r, 'sentado', 0.42, { item: 'comida' }); };
  const mesaRedonda = (zonaId, u, v, c, act) => { P('mesa_redonda', u, v, 0); for (const [x, z, r] of [[u, v - 0.95, 0], [u, v + 0.95, 180]]) { P('silla', x, z, r, { c }); S(zonaId, act || 'comer', x, z, r, 'sentado', 0.45, { item: act === 'tomar_te' ? 'taza' : 'comida' }); } };
  const casa = (zonaId, nombre, quien, u, v, ext) => {
    P('casa', u, v, 0, Object.assign({ w: 5, d: 4.2, h: 2.4 }, ext));
    const lugar = quien.length === 1 ? 'su casa' : nombre;
    quien.forEach((q, k) => S(zonaId, 'dormir', u - 0.9 + k * 0.5, v + 2.6, 180, 'dentro', 0, { solo: [q], lugar }));
    S(zonaId, 'en_casa', u + 0.8, v + 2.6, 180, 'dentro', 0, { solo: quien, lugar });
  };

  // ---------- Parque Deportivo (a la derecha, entre Tecnología y Cine) ----------
  satelite('deportes', 'el Parque Deportivo', 132, 2, { tema: 'deportes' });
  enlace('x', 22, 116.5, 135.5, 120, 132, 'deportes');
  enlace('z', 152, 38.5, 57.5, 42, 54, 'deportes');
  absoluto(); P('arco_isla', 131.3, 22, 270, { texto: 'PARQUE DEPORTIVO', c: '#2f9a52', c2: '#eaffe8' });
  bloque(138.5, 8.5);
  zona('deportes', 'el Parque Deportivo', 0, 0, 27, 27, 'cesped', { abierta: true });
  // Cancha de fútbol con gradas
  zona('dep_futbol', 'la Cancha de Fútbol', 0.5, 0.5, 16.6, 12.4, 'cesped', { abierta: true });
  P('gradas', 8.5, 1.6, 0, { w: 12.8 });
  for (let k = 0; k < 6; k++) S('dep_futbol', 'ver_partido', 3.5 + k * 2.0, k % 2 ? 1.6 : 2.4, 0, 'sentado', k % 2 ? 0.9 : 0.45);
  P('cancha_futbol', 8.5, 7.9, 0, { w: 14.6, d: 7.6 });
  for (const [x, z, r] of [[2.6, 7.9, 90], [5.4, 6.0, 90], [5.4, 9.8, 90], [7.4, 7.9, 90], [14.4, 7.9, 270], [11.6, 6.0, 270], [11.6, 9.8, 270], [9.6, 7.9, 270]]) S('dep_futbol', 'futbol', x, z, r);
  // Cancha de básquet
  zona('dep_basquet', 'la Cancha de Básquet', 17.6, 0.5, 26.6, 10.6, 'cancha', { abierta: true });
  P('cancha_basquet', 22.1, 5.5, 0, { w: 8.0, d: 9.0 });
  for (const [x, z, r] of [[21.0, 3.2, 180], [23.2, 4.1, 180], [21.2, 7.0, 0], [23.0, 7.8, 0]]) S('dep_basquet', 'basquet', x, z, r);
  // Gimnasio al aire libre
  zona('dep_gym', 'el Gimnasio al Aire Libre', 0.5, 13.4, 10.2, 22.4, 'caucho', { abierta: true });
  P('barras', 3.0, 14.4, 0, { w: 3.4 });
  S('dep_gym', 'calistenia', 2.2, 15.1, 0); S('dep_gym', 'calistenia', 3.8, 15.1, 0);
  for (const u of [6.6, 8.7]) { P('banco_pesas', u, 15.8, 0); S('dep_gym', 'pesas', u, 15.8, 0, 'sentado', 0.45, { item: 'mancuernas' }); }
  P('estructura_sacos', 3.2, 19.0, 0, { xs: [2.0, 4.4] });
  S('dep_gym', 'boxeo', 1.1, 19.0, 90); S('dep_gym', 'boxeo', 3.5, 19.0, 90);
  P('tapete', 7.7, 20.0, 0, { w: 3.6, d: 3.2 });
  for (const [x, z] of [[6.8, 19.3], [8.6, 19.3], [7.7, 20.9]]) S('dep_gym', 'meditar', x, z, 45, 'meditar', 0.05);
  P('bebedero', 9.7, 13.9, 270);
  // Piscina
  zona('dep_piscina', 'la Piscina', 11.0, 13.4, 26.6, 22.6, 'baldosa_piscina');
  agua.push({ x0: tx(13.0), z0: tz(14.8), x1: tx(24.2), z1: tz(19.8), radio: 0.35, piscina: true });
  P('trampolin', 24.9, 17.3, 270);
  for (const [x, z, r] of [[15.2, 16.0, 90], [18.6, 17.3, 270], [21.4, 18.6, 90]]) S('dep_piscina', 'nadar', x, z, r, 'nadar', 0);
  ['#e04a5a', '#3ab0e0', '#f2c230', '#5aa046'].forEach((c, k) => { const u = 13.6 + k * 2.2; P('tumbona', u, 21.5, 0, { c }); S('dep_piscina', 'tomar_sol', u, 21.5, 0, 'acostado', 0.36); });
  P('sombrilla', 14.7, 20.7, 0, { c: '#2f9a52' }); P('sombrilla', 19.1, 20.7, 0, { c: '#f2a83a' });
  // Taller de bicis, jugos y helados
  zona('dep_bicis', 'el Taller de Bicis', 0.5, 23.0, 10.2, 26.6, 'concreto');
  P('tienda_local', 3.3, 24.2, 0, { w: 4.8, d: 2.4, h: 2.3, c: '#e9efe6', c2: '#2f9a52', texto: 'TALLER DE BICIS', cc: '#2f9a52', ct: '#ffffff' });
  P('bici_taller', 7.2, 25.4, 90);
  S('dep_bicis', 'reparar_bici', 7.2, 24.4, 0, 'agachado', 0, { item: 'llave' });
  ['valeria', 'rafa', 'nico'].forEach((q, k) => S('dep_bicis', 'dormir', 2.5 + k * 0.7, 25.8, 180, 'dentro', 0, { solo: [q], lugar: 'su departamento sobre el taller' }));
  P('bicicletas', 9.4, 25.6, 90);
  P('carrito_helados', 12.6, 25.6, 180);
  S('deportes', 'helado', 12.0, 24.2, 0, 'parado', 0, { item: 'helado' }); S('deportes', 'helado', 13.2, 24.2, 0, 'parado', 0, { item: 'helado' });
  P('food_truck', 17.0, 25.3, 180, { tipo: 'cafe', c: '#f28a2a', texto: 'JUGOS NATURALES' });
  S('deportes', 'tomar_te', 16.4, 23.3, 0, 'parado', 0, { item: 'taza' }); S('deportes', 'tomar_te', 17.6, 23.3, 0, 'parado', 0, { item: 'taza' });
  mesaPicnic('deportes', 22.4, 24.8);
  for (const [x, z] of [[10.6, 12.9], [17.2, 12.9], [26.2, 12.9], [0.9, 22.8], [26.2, 23.2], [10.6, 22.9]]) P('farola', x, z);
  for (const [x, z, s] of [[26.2, 11.0, 0.8], [0.9, 12.6, 0.7], [17.2, 11.4, 0.7], [26.2, 26.2, 0.75], [0.9, 26.2, 0.7]]) arbol('redondo', x, z, s);
  P('calabaza', 10.2, 26.2, 0, { evento: 'halloween' }); P('arbol_navidad', 25.2, 11.4, 0, { evento: 'navidad' });
  animales.push({ tipo: 'perro', n: 1, area: areaAbs(0.5, 12.6, 26.5, 26.5) });

  // ---------- Barrio Residencial (a la izquierda, entre Festival y Bosque): las casas de Omar, Luis, Melisa y Diego ----------
  satelite('barrio', 'el Barrio Residencial', 2, 132, { tema: 'barrio' });
  enlace('z', 22, 116.5, 135.5, 120, 132, 'barrio');
  enlace('x', 152, 38.5, 57.5, 42, 54, 'barrio');
  absoluto(); P('arco_isla', 22, 131.3, 180, { texto: 'BARRIO RESIDENCIAL', c: '#d9773a', c2: '#fff1dc' });
  bloque(8.5, 138.5);
  zona('barrio', 'el Barrio Residencial', 0, 0, 27, 27, 'cesped', { abierta: true });
  const CARTEL = { cc: '#5a3a22', ct: '#ffe7c8' };
  // Melisa: programa en el porche y escucha electrónica en casa
  zona('casa_melisa', 'la casa de Melisa', 0.5, 0.5, 6.4, 8.4, 'cesped');
  casa('casa_melisa', 'la casa de Melisa', ['melisa'], 3.2, 3.4, Object.assign({ c: '#f4c7d4', c2: '#8a4a6a', texto: 'MELISA' }, CARTEL));
  P('mesa_laptop', 1.8, 7.35, 0); P('silla', 1.8, 6.6, 0, { c: '#e8e2d8' });
  S('casa_melisa', 'programar', 1.8, 6.6, 0, 'sentado', 0.45, { solo: ['melisa'] });
  P('maceta', 5.6, 6.9); P('buzon', 6.0, 8.0, 0);
  // Diego: ajedrez en el porche y videojuegos adentro
  zona('casa_diego', 'la casa de Diego', 6.6, 0.5, 12.6, 8.4, 'cesped');
  casa('casa_diego', 'la casa de Diego', ['diego'], 9.6, 3.4, Object.assign({ c: '#cfdce8', c2: '#3a4a6a', texto: 'DIEGO' }, CARTEL));
  S('casa_diego', 'jugar_consola', 9.6, 6.0, 180, 'dentro', 0, { solo: ['diego'], lugar: 'su casa' });
  P('mesa_ajedrez', 9.6, 7.3, 0);
  S('casa_diego', 'ajedrez', 8.85, 7.3, 90, 'sentado', 0.42); S('casa_diego', 'ajedrez', 10.35, 7.3, 270, 'sentado', 0.42);
  P('buzon', 12.3, 8.0, 0);
  // Omar: su setup en el porche, series y juegos adentro; Rubius duerme en su porche
  zona('casa_omar', 'la casa de Omar', 12.8, 0.5, 19.0, 8.4, 'cesped');
  casa('casa_omar', 'la casa de Omar', ['omar'], 16.0, 3.4, Object.assign({ c: '#d9e6c9', c2: '#3f5a3a', texto: 'OMAR' }, CARTEL));
  S('casa_omar', 'ver_series', 16.0, 6.0, 180, 'dentro', 0, { solo: ['omar'], lugar: 'su casa' });
  S('casa_omar', 'jugar_consola', 16.4, 6.0, 180, 'dentro', 0, { solo: ['omar'], lugar: 'su casa' });
  P('mesa_laptop', 17.6, 7.35, 0); P('silla', 17.6, 6.6, 0, { c: '#1e2230', gamer: true });
  S('casa_omar', 'programar', 17.6, 6.6, 0, 'sentado', 0.45, { solo: ['omar'] });
  P('cama_gato', 14.2, 7.4, 0); S('casa_omar', 'dormir_gato', 14.2, 7.4, 0, 'acostado', 0.12, { solo: ['gato'] });
  P('buzon', 18.7, 8.0, 0);
  // Luis: su auto blanco y su bici en la entrada, y la casita de su perro
  zona('casa_luis', 'la casa de Luis', 19.2, 0.5, 26.8, 8.4, 'cesped');
  casa('casa_luis', 'la casa de Luis', ['luis'], 21.6, 3.4, Object.assign({ w: 4.6, c: '#f2e2c4', c2: '#8a3a2a', texto: 'LUIS' }, CARTEL));
  zona('casa_luis_cochera', 'la casa de Luis', 24.4, 0.5, 26.8, 8.4, 'concreto');
  P('auto', 25.7, 3.0, 180, { vehiculo: 'auto_luis', c: '#f4f4f2' });
  P('bici', 25.7, 6.6, 180, { vehiculo: 'bici_luis' });
  S('casa_luis_cochera', 'manejar', 24.8, 4.6, 90, 'parado', 0, { solo: ['luis'], vehiculo: 'auto_luis' });
  S('casa_luis_cochera', 'pasear_bici', 24.8, 7.6, 90, 'parado', 0, { solo: ['luis'], vehiculo: 'bici_luis' });
  P('caseta_perro', 19.9, 7.2, 0);
  S('casa_luis', 'jugar_perro', 22.0, 7.3, 0, 'parado', 0, { solo: ['luis'], lugar: 'su casa' });
  // Parque del barrio: ajedrez gigante, mesas de ajedrez, columpios y un parque para perros
  zona('barrio_parque', 'el Parque del Barrio', 0.5, 9.0, 26.6, 18.8, 'cesped', { abierta: true });
  P('ajedrez_gigante', 4.6, 13.9, 0, { w: 5.6 });
  S('barrio_parque', 'ajedrez_gigante', 1.1, 13.9, 90); S('barrio_parque', 'ajedrez_gigante', 8.1, 13.9, 270);
  for (const v of [11.0, 14.4]) { P('mesa_ajedrez', 11.0, v, 0); S('barrio_parque', 'ajedrez', 10.25, v, 90, 'sentado', 0.42); S('barrio_parque', 'ajedrez', 11.75, v, 270, 'sentado', 0.42); }
  P('columpios', 16.6, 11.6, 0, { w: 3.2 });
  S('barrio_parque', 'columpiarse', 15.9, 11.6, 0, 'sentado', 0.55); S('barrio_parque', 'columpiarse', 17.3, 11.6, 0, 'sentado', 0.55);
  P('tobogan', 20.0, 11.4, 90);
  for (const [x, z, r] of [[14.4, 17.6, 0], [18.6, 17.6, 0]]) { P('banca', x, z, r); S('barrio_parque', 'banca', x - 0.5, z, r, 'sentado', 0.42); S('barrio_parque', 'banca', x + 0.5, z, r, 'sentado', 0.42); }
  P('cerca', 24.4, 12.4, 0, { w: 4.2, c: '#f4f4f0' }); P('cerca', 22.3, 15.6, 90, { w: 6.0, c: '#f4f4f0' });
  P('caseta_perro', 25.6, 13.6, 270);
  S('barrio_parque', 'jugar_perro', 23.8, 16.4, 0);
  arbol('redondo', 13.0, 15.6, 1.15); arbol('cerezo', 6.6, 17.8, 0.9); arbol('cerezo', 21.0, 16.0, 0.85);
  // Minimarket, pizzería y dos casas de vecinos
  zona('barrio_tiendas', 'las tiendas del barrio', 0.5, 19.4, 13.6, 26.6, 'baldosa');
  P('tienda_local', 3.4, 21.6, 0, { w: 5.6, d: 3.0, h: 2.3, c: '#e9eef2', c2: '#2f8f5a', texto: 'MINIMARKET', cc: '#2f8f5a', ct: '#ffffff' });
  S('barrio_tiendas', 'comprar', 2.6, 23.4, 180, 'dentro', 0, { lugar: 'el minimarket' }); S('barrio_tiendas', 'comprar', 4.2, 23.4, 180, 'dentro', 0, { lugar: 'el minimarket' });
  P('puesto_frutas', 6.9, 24.4, 0);
  P('tienda_local', 10.4, 21.6, 0, { w: 5.0, d: 3.0, h: 2.3, c: '#f4e2c4', c2: '#c0392b', texto: 'PIZZERÍA', cc: '#c0392b', ct: '#fff4d6' });
  S('barrio_tiendas', 'cocinar', 10.4, 23.4, 180, 'dentro', 0, { solo: ['carla'], lugar: 'la pizzería' });
  mesaRedonda('barrio_tiendas', 9.0, 25.0, '#c0392b'); mesaRedonda('barrio_tiendas', 12.0, 25.0, '#c0392b');
  zona('casa_vecinos', 'la casa de Doña Rosa', 14.2, 19.4, 20.0, 26.6, 'cesped');
  casa('casa_vecinos', 'la casa de Doña Rosa', ['rosa', 'mateo'], 17.1, 21.6, { w: 4.6, d: 3.8, c: '#e8d8f0', c2: '#5a4a7a' });
  P('flores', 15.4, 25.4, 0, { w: 2.4, d: 0.7 }); P('flores', 18.8, 25.4, 0, { w: 2.0, d: 0.7 });
  S('casa_vecinos', 'jardineria', 17.1, 25.4, 180, 'parado', 0, { item: 'regadera' });
  zona('casa_vecinos2', 'la casa de Pedro y Carla', 20.4, 19.4, 26.6, 26.6, 'cesped');
  casa('casa_vecinos2', 'la casa de Pedro y Carla', ['pedro', 'carla'], 23.4, 21.6, { w: 4.6, d: 3.8, c: '#d8eef0', c2: '#2a6a7a' });
  P('auto_clasico', 25.4, 25.2, 90, { c: '#3a6ea5' });
  for (const [x, z] of [[0.9, 8.8], [13.4, 8.8], [26.2, 8.8], [0.9, 18.9], [13.4, 18.9], [26.2, 18.9]]) P('farola', x, z);
  for (const [x, z, s] of [[0.8, 26.3, 0.7], [13.9, 26.3, 0.6], [20.2, 26.3, 0.6]]) arbol('arbusto', x, z, s);
  P('calabaza', 2.6, 8.2, 0, { evento: 'halloween' }); P('calabaza', 15.0, 8.2, 20, { evento: 'halloween' }); P('calabaza', 21.0, 8.2, 340, { evento: 'halloween' });
  P('arbol_navidad', 13.4, 12.6, 0, { evento: 'navidad' }); P('muneco_nieve', 20.4, 14.6, 200, { evento: 'navidad' });
  animales.push({ tipo: 'perro', n: 2, area: areaAbs(22.6, 12.8, 26.4, 18.6) });

  // ---------- Raccoon City (arriba, al final de la calle z=R1): comisaría, mansión, cementerio y escena del crimen ----------
  satelite('raccoon', 'Raccoon City', 2, 37.5, { tema: 'raccoon', piso: 'pasto_seco' });
  enlace('z', 22, 74, 83.5, 77.5, 80, 'raccoon');
  absoluto(); P('arco_isla', 42.7, R1, 90, { texto: 'RACCOON CITY', c: '#6a2a2a', c2: '#f0e0c8' });
  bloque(8.5, 44);
  zona('raccoon', 'Raccoon City', 0, 0, 27, 27, 'pasto_seco', { abierta: true });
  const RPD = ['leon', 'claire', 'jill', 'chris', 'barry', 'rebecca', 'marvin'];
  zona('rc_rpd', 'la Comisaría R.P.D.', 0.5, 0.5, 13.2, 10.4, 'concreto');
  P('comisaria', 6.6, 4.0, 0, { w: 10.4, d: 5.6, h: 4.0, texto: 'R.P.D.', cc: '#1e2a3a', ct: '#e8d8a8' });
  S('rc_rpd', 'trabajar_hq', 5.6, 7.6, 180, 'dentro', 0, { solo: RPD, lugar: 'la Comisaría R.P.D.' });
  S('rc_rpd', 'trabajar_hq', 7.6, 7.6, 180, 'dentro', 0, { solo: RPD, lugar: 'la Comisaría R.P.D.' });
  P('patrulla', 2.2, 9.0, 90); P('patrulla', 11.2, 9.0, 270);
  ['marvin', 'barry', 'rebecca'].forEach((q, k) => S('rc_rpd', 'dormir', 4.8 + k * 0.8, 7.9, 180, 'dentro', 0, { solo: [q], lugar: 'la Comisaría R.P.D.' }));
  S('rc_rpd', 'vigilar', 9.4, 9.4, 0, 'parado', 0, { solo: ['marvin', 'barry', 'chris'], lugar: 'la Comisaría R.P.D.' });
  zona('rc_mansion', 'la Mansión Spencer', 14.0, 0.5, 26.6, 11.2, 'piedra');
  P('mansion', 20.3, 4.2, 0, { w: 11.2, d: 6.2, h: 5.0 });
  S('rc_mansion', 'explorar', 19.4, 8.0, 180, 'dentro', 0, { lugar: 'la Mansión Spencer' }); S('rc_mansion', 'explorar', 21.2, 8.0, 180, 'dentro', 0, { lugar: 'la Mansión Spencer' });
  P('reja', 17.0, 10.8, 0, { w: 5.6 }); P('reja', 24.6, 10.8, 0, { w: 3.6 });
  S('rc_mansion', 'explorar', 16.0, 9.6, 200, 'parado', 0, { item: 'antorcha', lugar: 'la Mansión Spencer' });
  for (const u of [15.2, 25.4]) P('farol_poste', u, 9.4);
  // Cementerio
  zona('rc_cementerio', 'el Cementerio', 0.5, 11.6, 12.6, 26.6, 'pasto_seco', { abierta: true });
  P('reja', 3.5, 11.9, 0, { w: 5.8 }); P('reja', 10.6, 11.9, 0, { w: 3.6 }); P('reja', 0.7, 19.2, 90, { w: 14.4 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) P('lapida', 2.8 + i * 2.4, 15.0 + j * 2.8, 0, { v: (i + j * 2) % 3 });
  P('cripta', 9.8, 24.0, 0);
  for (const [x, z] of [[4.0, 16.0], [6.4, 18.8], [8.8, 21.6]]) S('rc_cementerio', 'visitar_tumbas', x, z, 180);
  arbol('seco', 1.8, 13.2, 1.0); arbol('seco', 11.8, 14.6, 0.85); arbol('seco', 2.2, 25.4, 1.1); arbol('seco', 6.0, 25.8, 0.8);
  // Escena del crimen (la Unidad de Análisis de Conducta y el CBI investigan)
  zona('rc_crimen', 'la Escena del Crimen', 13.6, 11.8, 26.6, 19.4, 'asfalto_viejo', { abierta: true });
  P('cinta_policial', 19.8, 15.4, 0, { w: 6.0, d: 4.2 });
  P('silueta', 19.8, 15.4, 20);
  P('patrulla', 25.2, 17.8, 0, { sirena: true });
  for (const [x, z, r] of [[16.0, 14.2, 90], [16.0, 16.8, 90], [19.8, 18.4, 180], [23.6, 15.0, 270]]) S('rc_crimen', 'investigar', x, z, r, 'parado', 0, { lugar: 'la Escena del Crimen' });
  // Raccoon Diner
  zona('rc_diner', 'el Raccoon Diner', 13.6, 19.8, 26.6, 26.6, 'ajedrezado', { abierta: true });
  P('tienda_local', 20.0, 21.4, 0, { w: 6.4, d: 2.8, h: 2.4, c: '#c8d8e0', c2: '#c8202a', texto: 'RACCOON DINER', cc: '#1e1e22', ct: '#ff6a6a' });
  S('rc_diner', 'comer', 19.0, 23.2, 180, 'dentro', 0, { lugar: 'el Raccoon Diner' }); S('rc_diner', 'comer', 21.0, 23.2, 180, 'dentro', 0, { lugar: 'el Raccoon Diner' });
  mesaRedonda('rc_diner', 15.6, 24.8, '#c8202a'); mesaRedonda('rc_diner', 24.4, 24.8, '#c8202a', 'tomar_te');
  for (const [x, z] of [[13.4, 11.4], [0.9, 10.9], [26.2, 19.6], [13.2, 26.2], [26.2, 11.4]]) P('farol_poste', x, z);
  P('auto_clasico', 13.0, 20.8, 20, { c: '#5a4a3a' }); P('barril', 12.6, 9.9); P('barril', 13.2, 10.3); P('hidrante', 26.2, 22.4); P('basurero', 17.0, 23.0);
  for (const [x, z] of [[3.0, 10.6], [8.6, 26.0], [17.8, 10.0], [23.0, 19.4]]) P('calabaza', x, z, (x * 37) % 360, { evento: 'halloween' });
  P('fantasma', 6.0, 20.0, 0, { evento: 'halloween', y: 1.3 }); P('fantasma', 20.3, 9.0, 0, { evento: 'halloween', y: 2.4 }); P('telarana', 14.8, 1.8, 30, { evento: 'halloween', y: 2.0 });
  animales.push({ tipo: 'cuervo', n: 4, area: areaAbs(0.5, 11.6, 12.6, 26.6), vuela: true });

  // ---------- Playa del Sol (abajo, al final de la calle z=R2) ----------
  satelite('playa', 'la Playa del Sol', 132, 96.5, { tema: 'playa', piso: 'arena' });
  enlace('z', 152, 90.5, 100, 94, 96.5, 'playa');
  absoluto(); P('arco_isla', 131.3, R2, 270, { texto: 'PLAYA DEL SOL', c: '#f2a83a', c2: '#fff6dd' });
  bloque(138.5, 103);
  zona('playa', 'la Playa del Sol', 0, 0, 27, 27, 'arena', { abierta: true });
  agua.push({ x0: tx(12.0), z0: tz(11.0), x1: tx(26.6), z1: tz(26.6), radio: 4.0, mar: true });
  zona('playa_mar', 'el Mar', 12.0, 11.0, 26.6, 26.6, 'arena', { abierta: true });
  P('muelle', 14.5, 18.8, 90, { w: 1.2, d: 5.0 });
  caminable.push({ x0: tx(11.2), z0: tz(18.2), x1: tx(17.0), z1: tz(19.4) });
  S('playa_mar', 'pescar', 16.4, 18.45, 90, 'sentado', 0.22, { item: 'cana' }); S('playa_mar', 'pescar', 16.4, 19.15, 90, 'sentado', 0.22, { item: 'cana' });
  P('barco', 21.6, 22.2, 60);
  for (const [x, z] of [[19.6, 13.8], [23.4, 16.6]]) { P('tabla_surf', x, z, 315, { flota: true }); S('playa_mar', 'surf', x, z, 45, 'parado', 0.1); }
  S('playa_mar', 'nadar', 17.6, 24.2, 90, 'nadar', 0); S('playa_mar', 'nadar', 14.4, 22.8, 45, 'nadar', 0);
  // Arena: tumbonas, sombrillas, toallas, castillo y fogata
  zona('playa_arena', 'la Playa del Sol', 0.5, 11.4, 11.8, 26.6, 'arena', { abierta: true });
  const SOMB = ['#e04a5a', '#3ab0e0', '#f2c230', '#5aa046', '#c06ad8', '#f28a2a'];
  [[2.2, 14.0], [5.0, 14.0], [7.8, 14.0], [2.2, 18.4], [5.0, 18.4], [7.8, 18.4]].forEach(([u, v], k) => {
    P('tumbona', u, v, 90, { c: SOMB[k] }); S('playa_arena', 'tomar_sol', u, v, 90, 'acostado', 0.36);
    if (k % 2 === 0) P('sombrilla', u - 0.6, v - 1.0, 0, { c: SOMB[(k + 2) % 6] });
  });
  P('toalla', 10.2, 21.6, 70, { c: '#3ab0e0' }); S('playa_arena', 'tomar_sol', 10.2, 21.6, 70, 'acostado', 0.04);
  P('castillo_arena', 7.6, 22.2, 0); S('playa_arena', 'castillo', 6.6, 22.8, mirar(6.6, 22.8, 7.6, 22.2), 'agachado');
  P('fogata', 3.6, 23.4);
  P('tronco', 3.6, 21.25, 0); P('tronco', 1.45, 23.4, 90); P('tronco', 5.75, 23.4, 90);
  S('playa_arena', 'fogata', 3.0, 21.3, 0, 'sentado', 0.34); S('playa_arena', 'fogata', 4.2, 21.3, 0, 'sentado', 0.34);
  S('playa_arena', 'fogata', 1.5, 23.4, 90, 'sentado', 0.34); S('playa_arena', 'fogata', 5.7, 23.4, 270, 'sentado', 0.34);
  P('torre_salvavidas', 11.0, 11.0, 45);
  S('playa', 'salvavidas', 11.0, 11.0, 45, 'sentado', 1.72, { item: 'binoculares' });
  // Vóley playa
  zona('playa_voley', 'la Cancha de Vóley', 0.5, 0.5, 11.2, 10.8, 'arena', { abierta: true });
  P('red_voley', 5.8, 5.6, 0, { w: 6.4 });
  for (const [x, z, r] of [[4.2, 3.6, 0], [7.4, 3.6, 0], [4.2, 7.6, 180], [7.4, 7.6, 180]]) S('playa_voley', 'voley', x, z, r);
  // Chiringuito
  zona('playa_bar', 'el Chiringuito', 12.0, 0.5, 26.6, 10.6, 'madera_clara', { abierta: true });
  P('chiringuito', 18.4, 2.6, 0, { w: 5.6, d: 2.6 });
  ['marina', 'kai', 'lucia', 'tomas'].forEach((q, k) => S('playa_bar', 'dormir', 16.9 + k * 1.0, 4.5, 180, 'dentro', 0, { solo: [q], lugar: 'la cabaña de la playa' }));
  S('playa_bar', 'cocinar', 18.4, 7.0, 180, 'parado', 0, { solo: ['lucia'], lugar: 'el Chiringuito' });
  P('barra_te', 18.4, 6.2, 0, { w: 4.4 });
  for (const u of [16.9, 18.1, 19.3]) { P('taburete', u, 5.35, 0, { alto: true }); S('playa_bar', 'tomar_te', u, 5.35, 0, 'sentado', 0.66, { item: 'taza' }); }
  mesaPicnic('playa_bar', 14.2, 8.8); mesaPicnic('playa_bar', 21.4, 8.8);
  P('sombrilla', 14.2, 8.8, 0, { c: '#f2a83a' }); P('sombrilla', 21.4, 8.8, 0, { c: '#3ab0e0' });
  P('carrito_helados', 25.4, 3.2, 270);
  S('playa_bar', 'helado', 24.0, 2.6, 90, 'parado', 0, { item: 'helado' }); S('playa_bar', 'helado', 24.0, 3.8, 90, 'parado', 0, { item: 'helado' });
  P('faro', 25.2, 9.4, 0);
  for (const [x, z, s] of [[0.9, 11.6, 0.95], [11.6, 13.8, 0.85], [0.9, 26.0, 0.9], [11.0, 26.2, 0.8], [12.6, 0.9, 0.9], [26.2, 0.9, 0.85], [0.9, 0.9, 0.8], [11.4, 0.9, 0.9]]) arbol('palmera', x, z, s);
  for (const [x, z] of [[11.8, 7.6], [0.9, 21.0], [26.2, 6.0]]) P('farol_poste', x, z);
  P('calabaza', 9.6, 12.2, 0, { evento: 'halloween' }); P('calabaza', 23.2, 7.6, 30, { evento: 'halloween' });
  animales.push({ tipo: 'gaviota', n: 5, area: areaAbs(0, 0, 27, 27), vuela: true }, { tipo: 'cangrejo', n: 3, area: areaAbs(1, 11.6, 11.4, 26.4) });
  // =================== Cinco islas más (abajo y a la derecha) ===================
  // Mega Mall y Avenida de la Comida continúan la calle x=R2; Japón sigue a la Playa del Sol, el Parque de Diversiones
  // sigue al Bosque Mágico y el Súper Parque une ese parque con el mall.
  const mesaSombrilla = (zonaId, u, v, c, lugar) => {
    P('mesa_picnic', u, v, 0); P('sombrilla', u, v, 0, { c });
    for (const [x, z, r] of [[u - 0.8, v - 0.7, 0], [u + 0.8, v - 0.7, 0], [u - 0.8, v + 0.7, 180], [u + 0.8, v + 0.7, 180]]) S(zonaId, 'comer', x, z, r, 'sentado', 0.42, { item: 'comida', lugar });
  };

  // ---------- Mega Mall (al final de la calle x=R2) ----------
  satelite('mall', 'el Mega Mall', 96.5, 140, { tema: 'mall' });
  absoluto(); P('arco_isla', R2, 139.3, 0, { texto: 'MEGA MALL', c: '#e0457b', c2: '#fff0f6' });
  bloque(103, 146.5);
  zona('mall', 'el Mega Mall', 0, 0, 27, 27, 'concreto', { abierta: true });
  zona('mall_edificio', 'el Mega Mall', 0.5, 0.5, 26.5, 12.6, 'baldosa');
  P('mall_edificio', 13.5, 6.0, 0, { w: 25, d: 10.6, h: 7.2, texto: 'MEGA MALL', cc: '#e0457b', ct: '#ffffff' });
  const EN_MALL = 'el Mega Mall';
  for (const u of [11.6, 13.0, 14.4, 15.8]) S('mall_edificio', 'comprar', u, 12.0, 180, 'dentro', 0, { lugar: EN_MALL });
  for (const u of [4.0, 6.4, 8.8]) S('mall_edificio', 'vitrinear', u, 12.0, 180, 'parado', 0, { lugar: EN_MALL });
  for (const u of [18.2, 20.6, 23.0]) S('mall_edificio', 'vitrinear', u, 12.0, 180, 'parado', 0, { lugar: EN_MALL });
  for (const u of [12.0, 15.0]) S('mall_edificio', 'probar_ropa', u, 11.6, 180, 'dentro', 0, { lugar: 'una tienda de ropa' });
  for (const u of [12.4, 14.6]) S('mall_edificio', 'ver_pelicula', u, 11.4, 180, 'dentro', 0, { lugar: 'los cines del mall' });
  for (const u of [11.2, 16.0]) S('mall_edificio', 'arcade', u, 11.2, 180, 'dentro', 0);
  for (const u of [13.0, 14.0]) S('mall_edificio', 'comer', u, 11.0, 180, 'dentro', 0, { lugar: 'el patio de comidas del mall', item: 'comida' });
  S('mall_edificio', 'atender', 9.6, 12.2, 0, 'parado', 0, { solo: ['jazmin'], lugar: 'su tienda de ropa' });
  S('mall_edificio', 'atender', 17.6, 12.2, 0, 'parado', 0, { solo: ['bruno_tec'], lugar: 'la tienda de tecnología' });
  S('mall_edificio', 'vigilar', 13.5, 12.3, 0, 'parado', 0, { solo: ['region:mall'], lugar: 'la entrada del mall' });
  zona('mall_plaza', 'la Plaza del Mall', 0.5, 13.4, 13.4, 26.6, 'baldosa', { abierta: true });
  P('fuente', 6.5, 19.6);
  for (const [x, z] of [[4.3, 17.4], [8.7, 17.4], [4.3, 21.8], [8.7, 21.8]]) S('mall_plaza', 'fuente', x, z, mirar(x, z, 6.5, 19.6));
  for (const [x, z, r] of [[1.6, 19.6, 90], [11.4, 19.6, 270], [6.5, 25.4, 180]]) {
    P('banca', x, z, r);
    const ox = Math.cos(r * Math.PI / 180) * 0.5, oz = -Math.sin(r * Math.PI / 180) * 0.5;
    S('mall_plaza', 'banca', x + ox, z + oz, r, 'sentado', 0.42); S('mall_plaza', 'banca', x - ox, z - oz, r, 'sentado', 0.42);
  }
  P('carrito_helados', 2.0, 14.8, 90); S('mall_plaza', 'helado', 3.4, 14.4, 270, 'parado', 0, { item: 'helado' }); S('mall_plaza', 'helado', 3.4, 15.6, 270, 'parado', 0, { item: 'helado' });
  S('mall_plaza', 'atender', 0.9, 14.8, 90, 'parado', 0, { solo: ['nati'], lugar: 'el carrito de helados' });
  P('carrito_palomitas', 11.4, 14.8, 270); S('mall_plaza', 'snack', 10.0, 14.3, 90, 'parado', 0, { item: 'palomitas' }); S('mall_plaza', 'snack', 10.0, 15.5, 90, 'parado', 0, { item: 'palomitas' });
  for (const [u, v] of [[1.0, 13.8], [12.9, 13.8], [1.0, 26.2], [12.9, 26.2]]) P('farola_moderna', u, v);
  zona('mall_parqueo', 'el estacionamiento del mall', 14.0, 13.4, 26.6, 26.6, 'asfalto_viejo', { abierta: true });
  P('parqueo', 20.3, 20.0, 0, { w: 12, d: 12.6 });
  [['#d64541', 16.0, 15.6, 0], ['#3a8fd8', 18.9, 15.6, 0], ['#f2c230', 24.7, 15.6, 0], ['#f4f4f0', 16.0, 24.3, 180], ['#5aa046', 21.8, 24.3, 180], ['#2a2a30', 24.7, 24.3, 180]].forEach(([c, u, v, r]) => P('auto_clasico', u, v, r, { c }));
  P('poste_precio', 13.8, 13.6, 0, { texto: 'OFERTAS 3X2', cc: '#e0457b', ct: '#ffffff' });
  P('arbol_navidad', 6.5, 14.4, 0, { evento: 'navidad' }); P('calabaza', 11.4, 17.0, 20, { evento: 'halloween' }); P('calabaza', 1.6, 17.0, 300, { evento: 'halloween' });
  animales.push({ tipo: 'perro', n: 1, area: areaAbs(0.8, 13.6, 13.2, 26.4) });

  // ---------- Avenida de la Comida (al lado del mall, debajo de la playa) ----------
  satelite('comida', 'la Avenida de la Comida', 140, 140, { tema: 'comida' });
  enlace('x', 160, 133, 143.5, 136.5, 140, 'comida');
  enlace('z', 160, 133, 143.5, 136.5, 140, 'comida');
  absoluto(); P('arco_isla', 160, 139.3, 0, { texto: 'AVENIDA DE LA COMIDA', c: '#e8862a', c2: '#fff4dd' });
  bloque(146.5, 146.5);
  zona('comida', 'la Avenida de la Comida', 0, 0, 27, 27, 'baldosa', { abierta: true });
  const LOCALES = [
    // id, letrero, nombre, u, v, marca, color de pared, color de techo, colores del letrero, quién atiende, sombrillas
    ['popeyes', 'POPEYES', 'Popeyes', 4.4, 3.6, 'popeyes', '#f6e3c8', '#e8622a', '#e8622a', '#fff6e0', ['chabe', 'nestor'], '#e8622a'],
    ['pizzahut', 'PIZZA HUT', 'Pizza Hut', 13.5, 3.6, 'pizzahut', '#b5533a', '#c8202a', '#c8202a', '#ffffff', ['gino', 'rocio'], '#c8202a'],
    ['mcdonalds', "McDONALD'S", "McDonald's", 22.6, 3.6, 'mcdonalds', '#f2efe6', '#c8202a', '#c8202a', '#ffc82a', ['ronny'], '#ffc82a'],
    ['kfc', 'KFC', 'KFC', 4.4, 16.0, 'kfc', '#f4f4f0', '#c8202a', '#c8202a', '#ffffff', ['marcos'], '#c8202a'],
    ['burger', 'BURGER KING', 'Burger King', 13.5, 16.0, 'burger', '#f0d8a8', '#2a62c0', '#d8622a', '#fff0d0', ['lety'], '#2a62c0'],
    ['starbucks', 'STARBUCKS', 'Starbucks', 22.6, 16.0, 'starbucks', '#e8e2d4', '#0f6a42', '#0f6a42', '#ffffff', ['amaya'], '#0f6a42']
  ];
  for (const [id, texto, nombre, u, v, marca, c, c2, cc, ct, quien, somb] of LOCALES) {
    const zid = 'local_' + id;
    zona(zid, nombre, u - 4.2, v - 3.2, u + 4.2, v + 8.2, 'baldosa');
    P('restaurante', u, v, 0, { w: 7.4, d: 5.6, h: 3.0, marca, c, c2, texto, cc, ct });
    const fp = v + 3.1, act = marca === 'starbucks' ? 'tomar_te' : 'comer', item = marca === 'starbucks' ? 'taza' : 'comida';
    for (const d of [-1.2, 0, 1.2]) S(zid, act, u + d, fp, 180, 'dentro', 0, { lugar: nombre, item });
    quien.forEach((q, k) => S(zid, 'atender', u - 2.9 + k * 5.8, fp + 0.4, 0, 'parado', 0, { solo: [q], lugar: nombre }));
    mesaSombrilla(zid, u - 1.9, v + 5.8, somb, nombre); mesaSombrilla(zid, u + 1.9, v + 5.8, somb, nombre);
  }
  S('local_pizzahut', 'cocinar', 13.5 + 2.6, 6.7, 180, 'dentro', 0, { solo: ['gino', 'rocio'], lugar: 'la cocina de Pizza Hut' });
  S('local_popeyes', 'cocinar', 4.4 + 2.6, 6.7, 180, 'dentro', 0, { solo: ['chabe', 'nestor'], lugar: 'la freidora de Popeyes' });
  zona('comida_truck', 'los food trucks', 0.4, 24.6, 26.6, 27, 'concreto', { abierta: true });
  P('food_truck', 7.4, 25.6, 0, { tipo: 'tacos', c: '#3aa86a', texto: 'CEVICHE' }); P('food_truck', 19.8, 25.6, 0, { tipo: 'cafe', c: '#d9574a', texto: 'ANTICUCHOS' });
  for (const u of [13.5, 12.2, 2.6, 24.4]) S('comida_truck', 'comer', u, 25.6, 180, 'parado', 0, { item: 'comida', lugar: 'los food trucks' });
  for (const [u, v] of [[9.0, 8.0], [18.0, 8.0], [9.0, 20.6], [18.0, 20.6], [0.8, 13.0], [26.2, 13.0]]) P('farola_moderna', u, v);
  P('calabaza', 9.0, 13.0, 40, { evento: 'halloween' }); P('calabaza', 18.0, 13.0, 300, { evento: 'halloween' }); P('arbol_navidad', 13.5, 12.8, 0, { evento: 'navidad' });

  // ---------- Parque de Diversiones (abajo a la izquierda, sigue al Bosque Mágico) ----------
  satelite('diversiones', 'el Parque de Diversiones', 54, 184, { tema: 'diversiones' });
  enlace('z', R1, 168.5, 187.5, 172, 184, 'diversiones');
  absoluto(); P('arco_isla', R1, 183.3, 0, { texto: 'PARQUE DE DIVERSIONES', c: '#2fb0a8', c2: '#e8fffb' });
  bloque(60.5, 190.5);
  zona('diversiones', 'el Parque de Diversiones', 0, 0, 27, 27, 'baldosa', { abierta: true });
  zona('div_rueda', 'la Rueda de la Fortuna', 0.5, 0.5, 11.0, 11.0, 'cesped', { abierta: true });
  P('rueda_fortuna', 5.7, 3.4, 0, { radio: 4.6 });
  for (const u of [3.7, 5.7, 7.7]) S('div_rueda', 'subir_juego', u, 6.2, 180, 'dentro', 0, { lugar: 'la Rueda de la Fortuna' });
  S('div_rueda', 'atender', 9.6, 5.6, 270, 'parado', 0, { solo: ['lucho'], lugar: 'la Rueda de la Fortuna' });
  zona('div_rusa', 'la Montaña Rusa', 11.4, 0.5, 26.6, 11.0, 'cesped', { abierta: true });
  P('montana_rusa', 19.0, 5.6, 0);
  for (const u of [16.0, 18.0, 20.0, 22.0]) S('div_rusa', 'subir_juego', u, 10.6, 180, 'dentro', 0, { lugar: 'la Montaña Rusa' });
  zona('div_carrusel', 'el Carrusel', 0.5, 11.4, 9.6, 20.0, 'baldosa', { abierta: true });
  P('carrusel', 5.0, 15.6, 0);
  for (const [x, z] of [[5.0, 19.0], [8.4, 15.6], [1.6, 15.6]]) S('div_carrusel', 'subir_juego', x, z, mirar(x, z, 5, 15.6), 'dentro', 0, { lugar: 'el Carrusel' });
  zona('div_choques', 'los Autos Chocones', 10.0, 13.4, 19.4, 20.4, 'caucho', { abierta: true });
  P('chocones', 14.7, 16.9, 0, { w: 8.2, d: 5.6 });
  for (const u of [12.0, 14.0, 16.0, 17.4]) S('div_choques', 'subir_juego', u, 20.0, 180, 'dentro', 0, { lugar: 'los Autos Chocones' });
  zona('div_torre', 'la Torre de Caída', 20.0, 13.4, 26.6, 20.4, 'baldosa', { abierta: true });
  P('torre_caida', 23.2, 16.6, 0, { h: 13 });
  for (const [x, z] of [[21.0, 19.6], [23.2, 19.8], [25.4, 19.6]]) S('div_torre', 'subir_juego', x, z, 180, 'dentro', 0, { lugar: 'la Torre de Caída' });
  zona('div_feria', 'los puestos de la feria', 0.5, 20.8, 26.6, 26.6, 'baldosa', { abierta: true });
  [['ALGODÓN DE AZÚCAR', 3.4, '#ff8ac0', 'snack'], ['TIRO AL BLANCO', 9.8, '#3ab0e0', 'tiro_feria'], ['ARO Y BOTELLA', 16.2, '#f2c230', 'tiro_feria'], ['PELUCHES', 22.6, '#7fbf4a', 'tiro_feria']].forEach(([texto, u, c, act]) => {
    P('puesto_feria', u, 22.2, 0, { c, texto, cc: '#2a2a30', ct: '#ffffff' });
    for (const d of [-0.9, 0.9]) S('div_feria', act, u + d, 24.2, 180, 'parado', 0, act === 'snack' ? { item: 'palomitas', lugar: 'el puesto de algodón' } : { lugar: 'la feria' });
  });
  S('div_feria', 'atender', 1.5, 23.6, 0, 'parado', 0, { solo: ['dulce'], lugar: 'el puesto de algodón' });
  S('div_feria', 'atender', 14.3, 23.6, 0, 'parado', 0, { solo: ['fito'], lugar: 'el puesto de aros' });
  S('div_feria', 'atender', 7.9, 23.6, 0, 'parado', 0, { solo: ['paya'], lugar: 'el tiro al blanco' });
  // filas para subirse a los juegos
  for (const [x, z, r] of [[1.4, 7.4, 90], [1.4, 8.4, 90], [1.4, 9.4, 90]]) S('div_rueda', 'hacer_fila', x, z, r, 'parado', 0, { lugar: 'la Rueda de la Fortuna' });
  for (const u of [12.6, 13.6, 14.6]) S('div_rusa', 'hacer_fila', u, 11.2, 90, 'parado', 0, { lugar: 'la Montaña Rusa' });
  for (const u of [10.6, 11.2]) S('div_choques', 'hacer_fila', u, 20.6, 90, 'parado', 0, { lugar: 'los Autos Chocones' });
  for (const z of [14.4, 15.4]) S('div_torre', 'hacer_fila', 20.6, z, 90, 'parado', 0, { lugar: 'la Torre de Caída' });
  for (const [x, z] of [[8.8, 18.2], [8.0, 19.2], [1.4, 12.6]]) S('div_carrusel', 'hacer_fila', x, z, 315, 'parado', 0, { lugar: 'el Carrusel' });
  for (const [u, v] of [[9.8, 12.8], [19.6, 12.8], [0.9, 20.4], [26.3, 20.6]]) P('farola_moderna', u, v);
  P('calabaza', 10.2, 12.0, 0, { evento: 'halloween' }); P('calabaza', 19.0, 12.0, 30, { evento: 'halloween' }); P('arbol_navidad', 13.8, 12.2, 0, { evento: 'navidad' });

  // ---------- Japón (a la derecha, sigue a la Playa del Sol) ----------
  satelite('japon', 'Japón', 184, 106, { tema: 'japon' });
  enlace('x', 120, 168.5, 187.5, 172, 184, 'japon');
  absoluto(); P('arco_isla', 183.3, 120, 270, { texto: 'JAPÓN', c: '#c8202a', c2: '#fff0f0' });
  bloque(190.5, 112.5);
  zona('japon', 'Japón', 0, 0, 27, 27, 'baldosa', { abierta: true });
  zona('jp_fuji', 'el Monte Fuji', 0.5, 0.5, 13.0, 10.4, 'cesped', { abierta: true });
  P('monte_fuji', 6.4, 4.8, 0, { radio: 5.0, h: 8.4 });
  S('jp_fuji', 'observar_aves', 12.2, 9.0, 300, 'parado', 0, { item: 'binoculares' }); S('jp_fuji', 'observar_aves', 11.8, 2.4, 270, 'parado', 0, { item: 'binoculares' });
  zona('jp_templo', 'el Templo del Sol Naciente', 13.2, 0.5, 26.6, 10.4, 'piedra_antigua', { abierta: true });
  P('pagoda', 20.0, 3.4, 0);
  P('torii', 20.0, 8.4, 0);
  for (const [x, z] of [[16.4, 7.0], [23.6, 7.0], [15.0, 9.2]]) { P('cojin', x, z, 0, { y: 0.15, c: '#c8202a' }); S('jp_templo', 'meditar', x, z, 180, 'meditar', 0.24); }
  P('linterna_piedra', 14.4, 5.4); P('linterna_piedra', 25.6, 5.4); P('linterna_piedra', 18.0, 9.6); P('linterna_piedra', 22.0, 9.6);
  P('maneki', 25.4, 8.6, 315);
  S('jp_templo', 'admirar', 24.2, 9.8, 135, 'parado', 0, { lugar: 'el gato de la suerte' });
  P('shinkansen', 13.5, 11.2, 0, { w: 27 });
  zona('jp_akiba', 'Akihabara', 0.5, 12.2, 9.4, 19.6, 'baldosa');
  P('tienda_local', 4.8, 14.0, 0, { w: 7.2, d: 3.4, h: 2.8, c: '#2a2a3a', c2: '#e0457b', texto: 'MANGA Y ARCADE', cc: '#e0457b', ct: '#ffffff' });
  for (const u of [3.4, 4.8, 6.2]) S('jp_akiba', 'leer_manga', u, 16.1, 180, 'dentro', 0, { lugar: 'Akihabara', item: 'libro' });
  for (const u of [5.4, 7.0]) S('jp_akiba', 'arcade', u, 16.1, 180, 'dentro', 0);
  S('jp_akiba', 'atender', 1.6, 16.6, 0, 'parado', 0, { solo: ['otaku'], lugar: 'la tienda de Akihabara' });
  P('expendedora', 1.4, 18.6, 0, { c: '#d9473b' }); P('expendedora', 2.4, 18.6, 0, { c: '#3a8ae0' }); P('expendedora', 3.4, 18.6, 0, { c: '#f2c230' });
  zona('jp_ramen', 'Ramen Ichiban', 10.4, 12.2, 19.0, 19.6, 'madera');
  P('tienda_local', 14.7, 14.0, 0, { w: 7.8, d: 3.4, h: 2.5, c: '#e8d4a8', c2: '#c8202a', texto: 'RAMEN ICHIBAN', cc: '#2a1a12', ct: '#ffc23a' });
  for (const u of [13.2, 14.6, 16.0]) S('jp_ramen', 'comer', u, 16.1, 180, 'dentro', 0, { lugar: 'Ramen Ichiban', item: 'comida' });
  S('jp_ramen', 'cocinar', 11.8, 16.1, 180, 'dentro', 0, { solo: ['kenji'], lugar: 'Ramen Ichiban' });
  mesaRedonda('jp_ramen', 12.4, 18.2, '#c8202a'); mesaRedonda('jp_ramen', 16.8, 18.2, '#c8202a');
  zona('jp_sushi', 'el Sushi de Hiro', 19.6, 12.2, 26.6, 19.6, 'madera_clara');
  P('tienda_local', 23.1, 14.0, 0, { w: 6.6, d: 3.4, h: 2.5, c: '#f4efe4', c2: '#2a3a6a', texto: 'SUSHI HIRO', cc: '#2a3a6a', ct: '#ffffff' });
  for (const u of [22.0, 23.4, 24.8]) S('jp_sushi', 'comer', u, 16.1, 180, 'dentro', 0, { lugar: 'el Sushi de Hiro', item: 'comida' });
  S('jp_sushi', 'cocinar', 20.8, 16.1, 180, 'dentro', 0, { solo: ['hiro'], lugar: 'el Sushi de Hiro' });
  mesaRedonda('jp_sushi', 23.1, 18.2, '#2a3a6a', 'tomar_te');
  zona('jp_onsen', 'el Onsen', 0.5, 20.0, 9.4, 26.6, 'piedra_antigua', { abierta: true });
  agua.push({ x0: tx(1.4), z0: tz(20.8), x1: tx(8.6), z1: tz(25.8), radio: 1.6 });
  for (const [x, z, r] of [[3.0, 22.4, 45], [6.8, 22.4, 315], [3.0, 24.4, 135], [6.8, 24.4, 225]]) S('jp_onsen', 'onsen', x, z, r, 'meditar', -0.2);
  P('vapor', 4.9, 23.4, 0);
  S('jp_onsen', 'atender', 0.9, 23.2, 90, 'parado', 0, { solo: ['mika'], lugar: 'el Onsen' });
  zona('jp_sumo', 'el Dohyo', 9.8, 20.0, 18.6, 26.6, 'madera_clara', { abierta: true });
  P('dohyo', 14.2, 23.2, 0);
  S('jp_sumo', 'sumo', 13.4, 23.2, 90, 'parado', 0.5, { solo: ['ryu', 'kenji', 'shun', 'region:japon', 'kratos', 'gimli', 'toro'] }); S('jp_sumo', 'sumo', 15.0, 23.2, 270, 'parado', 0.5, { solo: ['ryu', 'kenji', 'shun', 'region:japon', 'kratos', 'gimli', 'toro'] });
  for (const [x, z, r] of [[10.6, 21.2, 90], [10.6, 25.2, 90], [17.8, 21.2, 270], [17.8, 25.2, 270], [14.2, 26.3, 180]]) S('jp_sumo', 'ver_partido', x, z, r, 'parado', 0);
  zona('jp_plaza', 'la Plaza de Tokio', 18.8, 20.0, 26.6, 26.6, 'baldosa', { abierta: true });
  P('torre_tokio', 22.8, 23.2, 0, { h: 14 });
  for (const [x, z] of [[19.6, 21.0], [19.6, 25.4], [26.0, 21.0]]) S('jp_plaza', 'admirar', x, z, mirar(x, z, 22.8, 23.2), 'parado', 0, { lugar: 'la Tokyo Tower' });
  for (const [u, v, s] of [[13.4, 1.0, 1.0], [26.0, 1.0, 1.0], [13.4, 4.0, 0.9], [26.2, 3.2, 0.8], [9.8, 26.2, 0.8], [18.6, 26.2, 0.8], [26.3, 26.2, 0.8], [9.7, 12.4, 0.7], [0.9, 19.9, 0.7], [9.7, 19.9, 0.7]]) arbol('cerezo', u, v, s);
  P('calabaza', 17.0, 9.8, 0, { evento: 'halloween' }); P('muneco_nieve', 24.0, 9.0, 300, { evento: 'navidad' });
  animales.push({ tipo: 'conejo', n: 2, area: areaAbs(13.4, 0.8, 26.4, 10.2) });

  // ---------- Súper Parque (abajo, sigue al Mega Mall y al Parque de Diversiones) ----------
  satelite('superparque', 'el Súper Parque', 106, 192, { tema: 'superparque' });
  enlace('z', 126, 176.5, 195.5, 180, 192, 'superparque');
  enlace('x', 208, 90.5, 109.5, 94, 106, 'superparque');
  absoluto(); P('arco_isla', 126, 191.3, 0, { texto: 'SÚPER PARQUE', c: '#3a5ae0', c2: '#ffe680' });
  bloque(112.5, 198.5);
  zona('superparque', 'el Súper Parque', 0, 0, 27, 27, 'baldosa', { abierta: true });
  zona('sp_castillo', 'el Castillo Encantado', 5.6, 0.5, 21.4, 10.4, 'baldosa');
  P('castillo_fantasia', 13.5, 4.4, 0);
  for (const [x, z] of [[9.6, 9.8], [11.6, 10.1], [15.4, 10.1], [17.4, 9.8]]) S('sp_castillo', 'admirar', x, z, 180, 'parado', 0, { lugar: 'el Castillo Encantado' });
  for (const u of [12.8, 14.2]) S('sp_castillo', 'subir_juego', u, 9.2, 180, 'dentro', 0, { lugar: 'el Castillo Encantado' });
  S('sp_castillo', 'atender', 11.4, 9.0, 0, 'parado', 0, { solo: ['lia'], lugar: 'la puerta del castillo' });
  S('sp_paseo', 'atender', 13.6, 16.6, 0, 'parado', 0, { solo: ['bombon'], lugar: 'el Paseo del Parque' });
  for (const u of [11.6, 12.6, 13.6]) S('sp_rusa', 'hacer_fila', u - 1.2, 11.0, 90, 'parado', 0, { lugar: 'la Mega Montaña Rusa' });
  for (const z of [11.2, 12.2]) S('sp_sillas', 'hacer_fila', 16.8, z, 90, 'parado', 0, { lugar: 'las Sillas Voladoras' });
  for (const u of [1.8, 2.8]) S('sp_barco', 'hacer_fila', u, 25.6, 90, 'parado', 0, { lugar: 'el Barco Pirata' });
  S('sp_castillo', 'vigilar', 15.6, 9.0, 0, 'parado', 0, { solo: ['tadeo'], lugar: 'la puerta del castillo' });
  zona('sp_rusa', 'la Mega Montaña Rusa', 0.5, 10.6, 11.0, 19.6, 'cesped', { abierta: true });
  P('montana_rusa', 5.7, 14.6, 0, { escala: 0.8, alto: 1.5 });
  for (const u of [3.4, 5.0, 6.6, 8.2]) S('sp_rusa', 'subir_juego', u, 19.2, 180, 'dentro', 0, { lugar: 'la Mega Montaña Rusa' });
  zona('sp_sillas', 'las Sillas Voladoras', 16.2, 10.6, 26.6, 19.0, 'cesped', { abierta: true });
  P('sillas_voladoras', 21.4, 14.6, 0);
  for (const [x, z] of [[17.0, 14.6], [21.4, 18.4], [25.8, 14.6]]) S('sp_sillas', 'subir_juego', x, z, mirar(x, z, 21.4, 14.6), 'dentro', 0, { lugar: 'las Sillas Voladoras' });
  zona('sp_paseo', 'el Paseo del Parque', 11.2, 10.6, 16.0, 19.6, 'baldosa', { abierta: true });
  P('carrito_helados', 12.0, 12.0, 90); S('sp_paseo', 'helado', 13.4, 11.6, 270, 'parado', 0, { item: 'helado' }); S('sp_paseo', 'helado', 13.4, 12.8, 270, 'parado', 0, { item: 'helado' });
  P('banca', 15.4, 15.6, 270); S('sp_paseo', 'banca', 15.4, 15.1, 270, 'sentado', 0.42); S('sp_paseo', 'banca', 15.4, 16.1, 270, 'sentado', 0.42);
  P('banca', 11.6, 17.6, 90); S('sp_paseo', 'banca', 11.6, 17.1, 90, 'sentado', 0.42); S('sp_paseo', 'banca', 11.6, 18.1, 90, 'sentado', 0.42);
  zona('sp_barco', 'el Barco Pirata', 0.5, 19.8, 12.6, 26.6, 'madera_clara', { abierta: true });
  P('barco_pirata', 6.4, 22.8, 0);
  for (const u of [3.6, 5.6, 7.6, 9.2]) S('sp_barco', 'subir_juego', u, 25.6, 180, 'dentro', 0, { lugar: 'el Barco Pirata' });
  S('sp_barco', 'atender', 11.6, 22.8, 270, 'parado', 0, { solo: ['morgana'], lugar: 'el Barco Pirata' });
  zona('sp_agua', 'el Parque Acuático', 13.0, 19.4, 26.6, 26.6, 'baldosa_piscina');
  agua.push({ x0: tx(14.0), z0: tz(20.4), x1: tx(23.0), z1: tz(25.8), radio: 0.6, piscina: true });
  P('tobogan_agua', 24.8, 21.6, 0);
  for (const [x, z, r] of [[15.6, 22.0, 90], [18.6, 23.8, 270], [21.0, 22.0, 90]]) S('sp_agua', 'nadar', x, z, r, 'nadar', 0);
  for (const u of [24.2, 25.6]) S('sp_agua', 'subir_juego', u, 24.6, 0, 'dentro', 0, { lugar: 'los toboganes' });
  S('sp_agua', 'salvavidas', 23.6, 26.2, 315, 'parado', 0, { solo: ['gael'], item: 'binoculares' });
  P('puesto_feria', 2.9, 3.4, 0, { c: '#3a5ae0', texto: 'RECUERDOS', cc: '#2a2a30', ct: '#ffffff' });
  for (const d of [-0.9, 0.9]) S('superparque', 'comprar', 2.9 + d, 5.4, 180, 'parado', 0, { lugar: 'la tienda de recuerdos' });
  P('puesto_feria', 24.1, 3.4, 0, { c: '#f2a83a', texto: 'CHURROS', cc: '#2a2a30', ct: '#ffffff' });
  for (const d of [-0.9, 0.9]) S('superparque', 'snack', 24.1 + d, 5.4, 180, 'parado', 0, { item: 'palomitas', lugar: 'el puesto de churros' });
  S('superparque', 'bailar', 3.2, 8.6, 45); S('superparque', 'bailar', 23.6, 8.6, 315);
  for (const [u, v] of [[5.4, 10.4], [21.6, 10.4], [11.1, 19.8], [16.1, 19.8], [0.9, 26.2]]) P('farola_moderna', u, v);
  for (const [u, v, s] of [[0.9, 0.9, 0.8], [26.2, 0.9, 0.8], [0.9, 9.6, 0.7], [26.2, 9.6, 0.7]]) arbol('redondo', u, v, s);
  P('calabaza', 8.4, 10.2, 0, { evento: 'halloween' }); P('calabaza', 18.6, 10.2, 330, { evento: 'halloween' }); P('arbol_navidad', 13.5, 14.6, 0, { evento: 'navidad' });

  // Animales del pueblo
  absoluto();
  animales.push({ tipo: 'perro', n: 2, area: [ORIG_N[1] - 1, ORIG_N[1] - 1, ORIG_N[1] + 19, ORIG_N[1] + 19] }, { tipo: 'pato', n: 3, agua: 0 });

  // =================== Regiones de los lugareños ===================
  // Un lugareño vive en una región (una isla, una zona del pueblo o varias) y la simulación no lo deja salir:
  // allí trabaja, ronda (pasear) y de noche entra a su casa (los del pueblo duermen en el dormitorio).
  const regiones = {};
  const centroEn = (I, z) => { const x = (z.x0 + z.x1) / 2, y = (z.z0 + z.z1) / 2; return x >= I.x0 && x <= I.x1 && y >= I.z0 && y <= I.z1; };
  for (const I of islas) if (!I.centro) regiones[I.id] = zonas.filter((z) => !z.virtual && centroEn(I, z)).map((z) => z.id);
  for (const id of ['restaurante', 'plaza', 'gimnasio', 'fortaleza', 'jardin']) regiones[id] = [id, 'dormitorio'];
  regiones.gamer = ['gamer', 'dormitorio']; regiones.musica = ['musica', 'dormitorio'];
  regiones.campamento = ['campamento'];
  regiones.casos = ['oficina', 'dormitorio', 'rc_crimen'];
  for (const [id, v] of [['mall', 4.0], ['comida', 3.6], ['japon', 4.0], ['diversiones', 5.2], ['superparque', 3.8]]) for (const z of zonas) if (regiones[id].indexOf(z.id) >= 0) z.atractivo = v;
  // Puntos para rondar dentro de cada isla (pasear), cuatro más en la vereda interior del anillo y la puerta de la casa de sus lugareños
  const VEREDA = [[13.5, -0.4], [27.4, 13.5], [13.5, 27.4], [-0.4, 13.5]];
  const RONDAR = {
    tec: [86.5, 8.5, [[10.2, 22.4], [25.2, 21.6], [16.2, 15.4]]], cine: [138.5, 60.5, [[11.2, 13.4], [21.6, 13.6], [25.6, 13.2]]],
    festival: [8.5, 86.5, [[14.6, 14.0], [19.5, 12.0], [12.0, 18.6]]], bosque: [60.5, 138.5, [[12.0, 7.6], [16.0, 8.0], [14.6, 24.6]]],
    deportes: [138.5, 8.5, [[11.8, 12.6], [20.4, 12.2], [9.6, 22.8]]], barrio: [8.5, 138.5, [[9.0, 18.6], [21.0, 18.6], [12.2, 8.7]]],
    raccoon: [8.5, 44, [[13.2, 17.0], [6.6, 11.0], [20.8, 11.4]]], playa: [138.5, 103, [[6.0, 11.2], [9.6, 16.2], [13.0, 10.2]]],
    mall: [103, 146.5, [[13.6, 14.0], [3.2, 24.6], [13.2, 22.4]]], comida: [146.5, 146.5, [[0.8, 8.6], [9.0, 13.6], [18.0, 13.6]]],
    diversiones: [60.5, 190.5, [[11.2, 12.4], [13.6, 26.4], [20.0, 12.4]]],
    japon: [190.5, 112.5, [[9.9, 15.5], [13.6, 19.8], [19.3, 19.8]]], superparque: [112.5, 198.5, [[13.5, 12.0], [13.5, 18.6], [12.8, 26.4]]]
  };
  const HOGAR = { tec: [102.8, 14.6], cine: [156.0, 86.6], festival: [13.45, 91.45], bosque: [77.1, 142.2], deportes: [143.6, 34.3], barrio: [27.1, 162.7], raccoon: [16.9, 51.9], playa: [159.5, 107.5], mall: [107.0, 159.0], comida: [167.6, 160.0], diversiones: [64.6, 214.8], japon: [195.3, 128.7], superparque: [126.0, 208.6] };
  for (const id in RONDAR) {
    const [x0, z0, pts] = RONDAR[id];
    bloque(x0, z0);
    pts.concat(VEREDA).forEach(([u, v], k) => S(id, 'pasear', u, v, (k * 120 + 45) % 360));
    absoluto();
    const [hx, hz] = HOGAR[id];
    for (let k = 0; k < 12; k++) S(id, 'dormir', hx + ((k % 4) - 1.5) * 0.45, hz, 180, 'dentro', 0, { solo: ['region:' + id], lugar: 'su casa' });
  }
  // Más sitios en las islas para que los lugareños no se amontonen (y puestos donde atienden los vendedores)
  bloque(86.5, 8.5); // Distrito Tecnológico
  S('tec_plaza', 'vigilar', 25.6, 25.2, 315, 'parado', 0, { solo: ['region:tec'], lugar: 'el Distrito Tecnológico' });
  S('tec_plaza', 'tomar_te', 23.4, 20.2, 90, 'parado', 0, { item: 'taza' });
  mesaRedonda('tec_plaza', 23.0, 24.0, '#e8e2d8', 'tomar_te'); mesaRedonda('tec_plaza', 12.6, 23.6, '#e8e2d8', 'tomar_te');
  S('tec_datos', 'servidores', 8.6, 9.6, 180);
  bloque(138.5, 60.5); // Ciudad del Cine
  S('cine_set', 'grabar', 17.6, 6.6, mirar(17.6, 6.6, 20.1, 3.6)); S('cine_set', 'actuar', 20.1, 2.6, 0);
  mesaRedonda('cine_paseo', 8.4, 13.4, '#c8202a'); mesaRedonda('cine_paseo', 18.8, 13.4, '#c8202a');
  S('cine_auto', 'atender', 13.9, 6.8, 270, 'parado', 0, { solo: ['paco'], lugar: 'el carrito de palomitas' });
  bloque(8.5, 86.5); // Isla Festival
  for (const [x, z] of [[21.6, 9.5], [21.6, 5.3]]) S('fest_dj', 'bailar', x, z, 45);
  q = enEsc(6.6, 3.4); S('fest_escenario', 'vigilar', q[0], q[1], ESC[2] + 180, 'parado', 0, { solo: ['region:festival'], lugar: 'el Escenario Principal' });
  S('fest_tienda', 'atender', 14.6, 21.2, 135, 'parado', 0, { solo: ['momo'], lugar: 'la Tienda de Música' });
  bloque(60.5, 138.5); // Bosque Mágico
  S('bosque_lago', 'pescar', 23.4, 19.0, 0, 'parado', 0, { item: 'cana' });
  S('bosque', 'recolectar', 7.4, 11.0, mirar(7.4, 11.0, 8.4, 9.8), 'agachado');
  S('bosque', 'observar_aves', 16.4, 7.6, 45, 'parado', 0, { item: 'binoculares' });
  mesaPicnic('bosque', 4.6, 11.0);
  bloque(138.5, 8.5); // Parque Deportivo
  for (const z of [4.0, 7.0]) S('dep_basquet', 'ver_partido', 17.9, z, 90);
  mesaPicnic('dep_piscina', 24.4, 21.4);
  S('deportes', 'atender', 12.6, 26.5, 180, 'parado', 0, { solo: ['lupe'], lugar: 'el carrito de helados' });
  bloque(8.5, 138.5); // Barrio Residencial
  P('banca', 9.0, 17.9, 0); S('barrio_parque', 'banca', 8.5, 17.9, 0, 'sentado', 0.42); S('barrio_parque', 'banca', 9.5, 17.9, 0, 'sentado', 0.42);
  for (const [x, z] of [[25.0, 17.8], [23.6, 13.6]]) S('barrio_parque', 'jugar_perro', x, z, 0);
  S('barrio_tiendas', 'atender', 6.9, 23.55, 0, 'parado', 0, { solo: ['hugo'], lugar: 'el puesto de frutas' });
  S('barrio_tiendas', 'comprar', 6.9, 25.3, 180, 'parado', 0, { lugar: 'el puesto de frutas' });
  bloque(8.5, 44); // Raccoon City
  S('rc_rpd', 'vigilar', 4.4, 9.6, 0, 'parado', 0, { solo: ['region:raccoon'], lugar: 'la Comisaría R.P.D.' });
  for (const [x, z] of [[8.8, 16.2], [4.0, 19.2]]) S('rc_cementerio', 'visitar_tumbas', x, z, 180);
  S('rc_cementerio', 'jardineria', 6.4, 23.6, 90, 'parado', 0, { item: 'regadera', lugar: 'el Cementerio' });
  P('banca', 25.2, 13.4, 270); S('rc_crimen', 'banca', 25.2, 12.9, 270, 'sentado', 0.42); S('rc_crimen', 'banca', 25.2, 13.9, 270, 'sentado', 0.42);
  S('rc_crimen', 'investigar', 17.4, 18.6, 160, 'parado', 0, { lugar: 'la Escena del Crimen' });
  S('rc_mansion', 'explorar', 23.6, 9.2, 200, 'parado', 0, { item: 'antorcha', lugar: 'la Mansión Spencer' });
  S('rc_diner', 'atender', 17.8, 24.6, 270, 'parado', 0, { solo: ['doris'], lugar: 'el Raccoon Diner' });
  bloque(138.5, 103); // Playa del Sol
  S('playa_bar', 'atender', 26.3, 3.2, 270, 'parado', 0, { solo: ['coco', 'lito'], lugar: 'el carrito de helados' });
  P('puesto_frutas', 14.2, 4.2, 0);
  S('playa_bar', 'atender', 14.2, 3.35, 0, 'parado', 0, { solo: ['paz'], lugar: 'el puesto de frutas' });
  for (const u of [13.6, 14.8]) S('playa_bar', 'comprar', u, 5.1, 180, 'parado', 0, { lugar: 'el puesto de frutas' });
  P('toalla', 10.0, 16.2, 80, { c: '#f2c230' }); S('playa_arena', 'tomar_sol', 10.0, 16.2, 80, 'acostado', 0.04);
  P('tapete', 2.4, 16.2, 0, { w: 1.2, d: 1.8 }); S('playa_arena', 'meditar', 2.4, 16.2, 90, 'meditar', 0.05);
  absoluto();

  // =================== Red de calles para el tránsito ===================
  // Nodos en cada cruce (también esquinas de los anillos y entradas en T) y al final de las calles sin salida.
  function crearRed() {
    const nodos = [], porClave = {}, FIN = 5.2;
    const nodo = (x, z, tipo) => {
      const k = x.toFixed(1) + ',' + z.toFixed(1);
      if (porClave[k]) return porClave[k];
      const n = { id: nodos.length, x, z, tipo, vec: [] };
      nodos.push(n); porClave[k] = n;
      return n;
    };
    const dentro = (v, a, b) => v >= a - 0.01 && v <= b + 0.01;
    const lista = calles.map(() => []);
    calles.forEach((k, i) => calles.forEach((o, j) => {
      if (j <= i || o.dir === k.dir) return;
      const kz = k.dir === 'z' ? k : o, kx = k.dir === 'z' ? o : k;
      // (dos calles en línea, como un anillo y la calle que lo continúa, comparten el mismo cruce)
      if (dentro(kz.c, kx.a, kx.b) && dentro(kx.c, kz.a, kz.b)) { const n = nodo(kz.c, kx.c, 'cruce'); for (const l of [lista[i], lista[j]]) if (l.indexOf(n) < 0) l.push(n); }
    }));
    calles.forEach((k, i) => {
      const u = (n) => (k.dir === 'z' ? n.z : n.x), L = lista[i];
      const hay = (v) => L.some((n) => Math.abs(u(n) - v) < 0.05);
      if (!hay(k.a)) L.push(k.dir === 'z' ? nodo(k.c, k.a + FIN, 'fin') : nodo(k.a + FIN, k.c, 'fin'));
      if (!hay(k.b)) L.push(k.dir === 'z' ? nodo(k.c, k.b - FIN, 'fin') : nodo(k.b - FIN, k.c, 'fin'));
      L.sort((p, s) => u(p) - u(s));
      for (let t = 0; t + 1 < L.length; t++) { L[t].vec.push(L[t + 1].id); L[t + 1].vec.push(L[t].id); }
      k.cruces = L.filter((n) => n.tipo === 'cruce').map((n) => u(n));
    });
    return { nodos };
  }
  const red = crearRed();
  // Rectángulos de calle (asfalto + veredas) para no poner pasto encima
  const ANCHO = CALLE.asfalto + CALLE.vereda;
  const caminos = calles.map((k) => (k.dir === 'z' ? { x0: k.c - ANCHO, z0: k.a - ANCHO, x1: k.c + ANCHO, z1: k.b + ANCHO, calle: k } : { x0: k.a - ANCHO, z0: k.c - ANCHO, x1: k.b + ANCHO, z1: k.c + ANCHO, calle: k }));
  const limites = { x0: 2, z0: 2, x1: 224, z1: 232 };

  return { N, M, R1, R2, CALLE, zonas, props, spots, muros, arboles, caminos, calles, agua, caminable, cascada, celdas: CELDAS, islas, puentes, red, animales, limites, semaforos: SEMAFOROS, regiones };
});
