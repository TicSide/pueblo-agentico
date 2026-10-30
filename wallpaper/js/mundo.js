/* Pueblo Agéntico — construcción del mundo 3D a partir de DATOS_MUNDO.
 * Lo estático se fusiona en pocas mallas. Devuelve la cuadrícula para caminar, las luces
 * nocturnas (halos y charcos de luz) y los objetos animados. */
window.PA = window.PA || {};
PA.Mundo = (function () {
  'use strict';
  const G = PA.Geo, MAT = G.MAT, rad = G.rad, hash = G.hash;
  const tono = (h, f) => PA.Caras.tono(h, f);
  const FUENTE = '"Silkscreen", "Pixelify Sans", monospace';

  const PISOS = {
    cesped: (i, j) => hash(i, j) > 0.93 ? '#6fb551' : (hash(j, i) > 0.5 ? '#7cc25c' : '#76bb56'),
    piedra: (i, j) => ((i + j) % 2 ? '#a7a29a' : '#9d978f'),
    madera: (i, j) => (j % 2 ? '#b98352' : '#ad7746'),
    madera_oscura: (i, j) => (j % 2 ? '#6e4a30' : '#634229'),
    alfombra: (i, j) => ((i + j) % 2 ? '#8a7d70' : '#857868'),
    alfombra_oscura: () => '#3c3448',
    alfombra_morada: (i, j) => ((i + j) % 2 ? '#4c3c6e' : '#47386a'),
    metal: (i, j) => ((i % 2) ? '#6b7686' : '#657080'),
    baldosa: (i, j) => ((i + j) % 2 ? '#d8ccb2' : '#e2d7c1'),
    ajedrezado: (i, j) => ((i + j) % 2 ? '#3b3b42' : '#efe9de'),
    tierra: (i, j) => (hash(i, j) > 0.5 ? '#bb8f5d' : '#b48857'),
    concreto: (i, j) => ((i + j) % 2 ? '#c9ccd1' : '#d2d5da'),
    madera_clara: (i, j) => (j % 2 ? '#d6b48a' : '#ccaa80'),
    musgo: (i, j) => (hash(i, j) > 0.9 ? '#3f8a6a' : (hash(j, i) > 0.5 ? '#4a9a72' : '#45936d')),
    piedra_antigua: (i, j) => (hash(i * 3, j) > 0.5 ? '#8f8a7e' : '#99948a'),
    arena: (i, j) => (hash(i, j) > 0.9 ? '#e6d29c' : (hash(j, i) > 0.5 ? '#efdcaa' : '#ebd7a4')),
    cancha: (i, j) => ((i + j) % 2 ? '#c8703a' : '#c26a36'),
    caucho: (i, j) => ((i + j) % 2 ? '#4a4f5a' : '#454a54'),
    baldosa_piscina: (i, j) => ((i + j) % 2 ? '#e8f2f4' : '#dceaee'),
    pasto_seco: (i, j) => (hash(i, j) > 0.9 ? '#7a7448' : (hash(j, i) > 0.5 ? '#868050' : '#807a4c')),
    asfalto_viejo: (i, j) => (hash(i * 7, j) > 0.85 ? '#5a5c62' : '#64666c')
  };

  function construir(escena, D) {
    const N = D.N;
    const raiz = new THREE.Group();
    raiz.name = 'mundo';
    escena.add(raiz);
    const bloq = new Uint8Array(N * N);
    const altura = new Float32Array(N * N);
    const ASF = D.CALLE.asfalto, VER = D.CALLE.vereda, ANCHO = ASF + VER;
    bloq.fill(1);
    for (const I of D.islas) for (let i = Math.floor(I.x0); i < Math.ceil(I.x1); i++) for (let j = Math.floor(I.z0); j < Math.ceil(I.z1); j++) bloq[i + j * N] = 0;
    for (const b of D.puentes) {
      const a0 = Math.min(b.a, b.b), a1 = Math.max(b.a, b.b);
      for (let u = Math.floor(a0); u < Math.ceil(a1); u++) for (let v = Math.floor(b.c - ANCHO + 0.5); v < Math.ceil(b.c + ANCHO - 0.5); v++) { const i = b.dir === 'z' ? v : u, j = b.dir === 'z' ? u : v; bloq[i + j * N] = 0; }
    }
    const animados = [];
    const luces = [];
    const nocturnos = [];   // materiales que solo se encienden de noche (ventanas de las torres)
    const balizas = [];     // luces rojas de aviso en las azoteas

    // Lp = pisos, Lg = pasto (cambia con las estaciones), Lv = follaje (cambia con las estaciones)
    const Lp = new G.Lote(), Lg = new G.Lote(), Lv = new G.Lote();
    // Los muebles de un evento (Halloween, Navidad...) van a su propio grupo, que se muestra solo durante el evento
    const BASE = { L: new G.Lote(), Lb: new G.Lote(), Ll: new G.Lote(), halos: [], charcos: [], grupo: raiz };
    let L, Lb, Ll, LOTES, halos, charcos, destino, sinBloqueo = false;
    function usar(o) { L = o.L; Lb = o.Lb; Ll = o.Ll; LOTES = [L, Lb, Ll]; halos = o.halos; charcos = o.charcos; destino = o.grupo; }
    usar(BASE);
    const EVENTOS_G = {};
    function lotesEvento(id) {
      if (!EVENTOS_G[id]) { const g = new THREE.Group(); g.name = 'evento-' + id; raiz.add(g); EVENTOS_G[id] = { L: new G.Lote(), Lb: new G.Lote(), Ll: new G.Lote(), halos: [], charcos: [], grupo: g }; }
      return EVENTOS_G[id];
    }
    const planos = {};
    let enCurso = null;
    const plan = (clave, mat) => {
      if (!planos[clave]) {
        const pp = new G.Planos();
        if (enCurso) pp.empujar(enCurso.x, enCurso.y, enCurso.z, enCurso.ry);
        planos[clave] = { p: pp, mat };
      }
      return planos[clave].p;
    };

    // ---------- cuadrícula ----------
    const celda = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i >= 0 && j >= 0 && i < N && j < N ? i + j * N : -1; };
    function bloquear(x, z, w, d, r) {
      if (sinBloqueo) return;
      const a = rad(r || 0), c = Math.cos(a), s = Math.sin(a);
      const rx = (Math.abs(w * c) + Math.abs(d * s)) / 2 + 0.5, rz = (Math.abs(w * s) + Math.abs(d * c)) / 2 + 0.5;
      for (let i = Math.floor(x - rx); i <= Math.floor(x + rx); i++) for (let j = Math.floor(z - rz); j <= Math.floor(z + rz); j++) {
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        const dx = i + 0.5 - x, dz = j + 0.5 - z;
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        if (Math.abs(lx) <= w / 2 + 0.15 && Math.abs(lz) <= d / 2 + 0.15) bloq[i + j * N] = 1;
      }
    }
    function bloquearCirculo(x, z, r) {
      if (sinBloqueo) return;
      for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) for (let j = Math.floor(z - r); j <= Math.floor(z + r); j++) {
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        if (Math.hypot(i + 0.5 - x, j + 0.5 - z) <= r) bloq[i + j * N] = 1;
      }
    }
    function elevar(x0, z0, x1, z1, h) {
      for (let i = Math.floor(x0); i < Math.ceil(x1); i++) for (let j = Math.floor(z0); j < Math.ceil(z1); j++) if (i >= 0 && j >= 0 && i < N && j < N) altura[i + j * N] = h;
    }
    // posición mundial de un punto local del mueble actual
    const local = (lx, ly, lz) => {
      const c = enCurso;
      const s = Math.sin(c.ry), co = Math.cos(c.ry);
      return { x: c.x + lx * co + lz * s, y: c.y + ly, z: c.z - lx * s + lz * co };
    };
    // halo de luz: siempre = pantallas/neones/fuego; si no, solo de noche (lámparas y ventanas)
    const halo = (lx, ly, lz, s, c, siempre) => { const p = local(lx, ly, lz); halos.push({ x: p.x, y: p.y, z: p.z, s, c, siempre: !!siempre }); };
    const charco = (lx, lz, s, c) => { const p = local(lx, 0, lz); charcos.push({ x: p.x, z: p.z, s, c }); };
    function en(p, fn) {
      const y = p.y || 0, ry = rad(p.r || 0);
      enCurso = { x: p.x, y, z: p.z, ry };
      for (const l of LOTES) l.empujar(p.x, y, p.z, ry);
      for (const k in planos) planos[k].p.empujar(p.x, y, p.z, ry);
      fn();
      for (const l of LOTES) l.soltar();
      for (const k in planos) planos[k].p.soltar();
      enCurso = null;
    }

    // ---------- texturas ----------
    const TEXS = [];
    function texDinamica(w, h, dibujar, cadaMs, pixel) {
      const cv = G.lienzo(w, h), ctx = cv.getContext('2d');
      const t = G.textura(cv, pixel);
      const o = { cv, ctx, t, dibujar, cada: cadaMs || 0, ultimo: -1e9 };
      dibujar(ctx, 0, w, h);
      t.needsUpdate = true;
      if (cadaMs) TEXS.push(o);
      return o;
    }
    const texto = (w, h, dibujar) => texDinamica(w, h, dibujar, 0, false);
    const matTex = (t, basico, extra) => basico ? new THREE.MeshBasicMaterial(Object.assign({ map: t }, extra || {})) : new THREE.MeshLambertMaterial(Object.assign({ map: t }, extra || {}));

    const TX = {};
    TX.codigo = texDinamica(64, 48, (x, t, w, h) => {
      x.fillStyle = '#0d1420'; x.fillRect(0, 0, w, h);
      const base = Math.floor(t / 400);
      const cols = ['#7fd4ff', '#c792ea', '#c3e88d', '#ffcb6b', '#f78c6c', '#89ddff'];
      for (let i = 0; i < 9; i++) {
        const k = base + i, ind = (k * 7) % 4, len = 10 + (k * 13) % 34;
        x.fillStyle = cols[k % cols.length]; x.fillRect(3 + ind * 4, 3 + i * 5, len, 2);
        if (k % 3 === 0) { x.fillStyle = cols[(k + 2) % cols.length]; x.fillRect(5 + ind * 4 + len, 3 + i * 5, 8, 2); }
      }
      if ((t / 500 | 0) % 2) { x.fillStyle = '#fff'; x.fillRect(4, 44, 3, 2); }
    }, 400, true);
    TX.oficina = texDinamica(32, 24, (x, t, w, h) => {
      x.fillStyle = '#dfe8f2'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a6ea5'; x.fillRect(0, 0, w, 3);
      for (let i = 0; i < 5; i++) { x.fillStyle = '#8aa0b8'; x.fillRect(3, 6 + i * 3.5, 12 + (i * 7) % 14, 1.5); }
      x.fillStyle = '#c0504d'; x.fillRect(22, 8, 6, 8);
    }, 0, true);
    TX.edicion = texDinamica(96, 40, (x, t, w, h) => {
      x.fillStyle = '#1b1d24'; x.fillRect(0, 0, w, h);
      const fase = (t / 60) % 360;
      const g = x.createLinearGradient(0, 0, 60, 0); g.addColorStop(0, `hsl(${fase},70%,55%)`); g.addColorStop(1, `hsl(${(fase + 90) % 360},70%,45%)`);
      x.fillStyle = g; x.fillRect(18, 3, 60, 22);
      const cols = ['#5b8def', '#e8b34a', '#5fc27e', '#d65a8a'];
      for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) { x.fillStyle = cols[(i + k) % 4]; x.fillRect(4 + k * 15, 28 + i * 3, 12, 2); }
      x.fillStyle = '#ff4040'; x.fillRect(4 + ((t / 30) % 88), 27, 1, 13);
    }, 250, true);
    TX.leds = texDinamica(16, 32, (x, t, w, h) => {
      x.fillStyle = '#151a24'; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        x.fillStyle = '#232a36'; x.fillRect(1, 1 + r * 4, 14, 3);
        for (let k = 0; k < 3; k++) { const on = hash(r * 5 + k, Math.floor(t / 300) + r) > 0.45; x.fillStyle = on ? ['#3fff8f', '#3fd0ff', '#ffb43f'][k] : '#1d3a2a'; x.fillRect(2 + k * 2, 2 + r * 4, 1, 1); }
        x.fillStyle = '#0c0f15'; x.fillRect(9, 2 + r * 4, 5, 1);
      }
    }, 300, true);
    TX.tele = texDinamica(64, 36, (x, t, w, h) => {
      x.fillStyle = '#14123a'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#2f5bff'; x.lineWidth = 2; x.strokeRect(3, 3, w - 6, h - 6); x.strokeRect(14, 12, 36, 12);
      const k = (t / 90) % 80, px = 4 + (k < 40 ? k : 80 - k) * 1.4;
      x.fillStyle = '#ffd400'; x.beginPath(); const boca = Math.abs(Math.sin(t / 120)) * 0.7; x.moveTo(px, 8); x.arc(px, 8, 3.5, boca + (k < 40 ? 0 : Math.PI), Math.PI * 2 - boca + (k < 40 ? 0 : Math.PI)); x.fill();
      for (let i = 0; i < 12; i++) if (6 + i * 5 > px + 3 || k >= 40) { x.fillStyle = '#ffe9b0'; x.fillRect(6 + i * 5, 7.5, 1, 1); }
      const fant = ['#ff4040', '#ffb8ff', '#40ffff', '#ffb840'];
      for (let i = 0; i < 4; i++) { x.fillStyle = fant[i]; const fx = 10 + ((t / 70 + i * 17) % 44); x.fillRect(fx, 27, 4, 4); x.fillStyle = '#fff'; x.fillRect(fx + 1, 28, 1, 1); }
    }, 90, true);
    TX.arcade = texDinamica(48, 16, (x, t, w, h) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
      const f = t / 100;
      x.fillStyle = '#3fff5f'; for (let i = 0; i < 5; i++) x.fillRect(1 + ((i * 3 + f) % 14), 2 + (i % 3) * 3, 2, 2);
      x.fillStyle = '#fff'; x.fillRect(6, 12, 4, 2);
      x.fillStyle = '#ff5f5f'; x.fillRect(18 + (f % 10), 4, 3, 3); x.fillStyle = '#5fafff'; x.fillRect(26 - (f % 8), 9, 3, 3);
      x.fillStyle = '#ffe04f'; x.fillRect(34, 3 + (f % 9), 2, 2); x.fillRect(40, 12 - (f % 8), 2, 2); x.fillStyle = '#ff7fff'; x.fillRect(37, 6, 3, 1);
    }, 120, true);
    TX.pista = texDinamica(8, 8, (x, t) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const hue = (i * 60 + j * 35 + t / 8) % 360, on = hash(i + Math.floor(t / 500), j) > 0.35;
        x.fillStyle = on ? `hsl(${hue},85%,58%)` : `hsl(${hue},50%,25%)`; x.fillRect(i * 2, j * 2, 2, 2);
      }
    }, 250, true);
    TX.holo = texDinamica(32, 32, (x, t) => {
      x.clearRect(0, 0, 32, 32);
      x.strokeStyle = 'rgba(120,230,255,0.9)'; x.lineWidth = 1;
      for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(16, 16, 4 + k * 3.5, (t / 600 + k) % 6.28, (t / 600 + k) % 6.28 + 4); x.stroke(); }
      x.fillStyle = 'rgba(180,250,255,0.95)'; for (let k = 0; k < 6; k++) x.fillRect(4 + ((k * 5 + t / 90) % 24), 26 - (k % 3) * 2, 2, 1);
    }, 120, true);

    // ---------- islas flotantes: capas, bordes rocosos, raíces y cristales; y los puentes ----------
    const Lsl = new G.Lote();
    const bordesIsla = [];
    function losa(I, sem) {
      const W = I.x1 - I.x0, Dd = I.z1 - I.z0, cx = (I.x0 + I.x1) / 2, cz = (I.z0 + I.z1) / 2, k0 = I.centro ? 1 : 0.8;
      const cris = I.tema === 'bosque' ? ['#c79bff', '#ff8ae8', '#7ff0ff'] : ['#7ff0ff', '#c79bff', '#7fffb0'];
      const ini = Lg.p.length / 3;
      Lg.cajaB(cx, -0.4, cz, W + 0.05, 0.4, Dd + 0.05, '#6aa94a');
      bordesIsla.push({ ini, n: Lg.p.length / 3 - ini });
      Lsl.cajaB(cx, -2.1, cz, W - 0.1, 1.72, Dd - 0.1, '#8a5a38');
      Lsl.cajaB(cx, -3.6, cz, W - 2.2, 1.5, Dd - 2.2, '#6a4530');
      Lsl.cajaB(cx, -4.8, cz, W - 6, 1.3, Dd - 6, '#5a3a28');
      const nc = Math.round(46 * W * Dd / 5776) + 6;
      for (let k = 0; k < nc; k++) {
        const x = I.x0 + 5 + hash(k, sem) * (W - 10), z = I.z0 + 5 + hash(sem, k) * (Dd - 10), r = (1.4 + hash(k, k + sem) * 3.4) * k0;
        Lsl.cono(x, -4.8 - r * 2.4, z, r, r * 2.4, hash(k, 3 + sem) > 0.5 ? '#5a3a28' : '#4e3324', 5, Math.PI);
        if (k % (I.tema === 'bosque' ? 2 : 4) === 0) Lb.cono(x + r * 0.5, -5.4 - r * 0.6, z, 0.28, 1.0, cris[k % 3], 4, Math.PI);
      }
      const nb = Math.round(120 * (W + Dd) / 152);
      for (let k = 0; k < nb; k++) {
        const lado = k % 2, t = (k / nb) * (lado ? W : Dd) + hash(k, 2 + sem) * 0.6;
        const yb = -0.6 - hash(k, 9 + sem) * 2.6, s2 = 0.35 + hash(k, 4 + sem) * 0.7;
        const c = hash(k, 6 + sem) > 0.5 ? '#7a5a40' : '#6a4a32';
        if (lado) Lsl.esfera(I.x0 + t, yb, I.z1 + 0.05, s2, c, 0, 1.3, 0.9, 0.5); else Lsl.esfera(I.x1 + 0.05, yb, I.z0 + t, s2, c, 0, 0.5, 0.9, 1.3);
        if (k % 3 === 0) {
          const largo = 0.6 + hash(k, 8 + sem) * 1.8, verde = hash(k, 11 + sem) > 0.45;
          const cc = verde ? (I.tema === 'bosque' ? '#3f9a7a' : '#4f8f3a') : '#5a3a22';
          if (lado) Lsl.cajaB(I.x0 + t + 0.3, -0.35 - largo, I.z1 + 0.06, 0.07, largo, 0.07, cc); else Lsl.cajaB(I.x1 + 0.06, -0.35 - largo, I.z0 + t + 0.3, 0.07, largo, 0.07, cc);
        }
      }
      for (let k = 0; k < Math.round(60 * (W + Dd) / 152); k++) {
        const lado = k % 2, t = hash(k, 21 + sem) * (lado ? W : Dd);
        if (lado) Lsl.cajaB(I.x0 + t, -0.42, I.z1 + 0.03, 0.5 + hash(k, 3) * 0.8, 0.12, 0.08, '#5e9e42'); else Lsl.cajaB(I.x1 + 0.03, -0.42, I.z0 + t, 0.08, 0.12, 0.5 + hash(k, 3) * 0.8, '#5e9e42');
      }
    }
    D.islas.forEach((I, k) => losa(I, k * 17));
    // Puentes: tablero de piedra, arco por debajo, barandas y faroles
    for (const b of D.puentes) {
      const a0 = Math.min(b.a, b.b), a1 = Math.max(b.a, b.b), len = a1 - a0, mid = (a0 + a1) / 2, Wp = 2 * ANCHO + 0.5;
      const H = b.dir === 'x';
      const caja = (u, y, v, lu, h, lv, c, lote) => (lote || Lsl).cajaB(H ? u : v, y, H ? v : u, H ? lu : lv, h, H ? lv : lu, c);
      caja(mid, -0.62, b.c, len + 1.4, 0.62, Wp, '#a39d93');
      caja(mid, -0.82, b.c, len + 1.4, 0.2, Wp - 0.5, '#8b857d');
      for (let k = 0; k < 10; k++) {
        const u0 = a0 + len * k / 10, u1 = a0 + len * (k + 1) / 10, m = (k + 0.5) / 10;
        const y = -0.9 - (1 - Math.sin(Math.PI * m)) * 2.8;
        caja((u0 + u1) / 2, y - 0.5, b.c, u1 - u0 + 0.05, 0.5 + (-0.9 - y), Wp - 1.0, k % 2 ? '#8b857d' : '#958f86');
      }
      for (const s of [-1, 1]) {
        const v = b.c + s * (Wp / 2 - 0.12);
        caja(mid, 0.0, v, len + 1.0, 0.18, 0.24, '#b8b2a8', L);
        for (let u = a0 - 0.4; u <= a1 + 0.41; u += 0.9) caja(u, 0.18, v, 0.14, 0.7, 0.14, '#c9c3b8', L);
        caja(mid, 0.86, v, len + 1.1, 0.1, 0.22, '#d8d2c6', L);
        const q = H ? { x: mid, z: v } : { x: v, z: mid };
        L.cil(q.x, 0, q.z, 0.09, 2.6, '#2e3a2e', 6); Ll.cajaB(q.x, 2.6, q.z, 0.26, 0.32, 0.26, '#ffe9a8'); L.cono(q.x, 2.92, q.z, 0.22, 0.2, '#2e3a2e', 4);
        halos.push({ x: q.x, y: 2.75, z: q.z, s: 1.6, c: 0xffd890 }); charcos.push({ x: q.x, z: q.z, s: 4.2, c: 0xffc878 });
      }
    }
    // userData.fija: geometría que no cambia; al subirla a la tarjeta de video se suelta su copia de JavaScript
    const fija = (m) => { m.userData.fija = true; return m; };
    const slab = fija(Lsl.malla(MAT.solido, false));
    slab.receiveShadow = true;
    raiz.add(slab);

    // ---------- pertenencia de cada celda ----------
    const zonaDe = new Array(N * N).fill(null);
    for (const zn of D.zonas) {
      if (zn.virtual) continue;
      for (let i = Math.floor(zn.x0); i < Math.ceil(zn.x1); i++) for (let j = Math.floor(zn.z0); j < Math.ceil(zn.z1); j++) {
        if (i + 0.5 > zn.x0 && i + 0.5 < zn.x1 && j + 0.5 > zn.z0 && j + 0.5 < zn.z1 && i < N && j < N) zonaDe[i + j * N] = zn;
      }
    }
    const enCalle = (x, z) => D.caminos.some((c) => x >= c.x0 && x < c.x1 && z >= c.z0 && z < c.z1);
    const aguaEn = (x, z) => D.agua.find((a) => {
      const r = a.radio || 0;
      const cx = Math.max(a.x0 + r, Math.min(x, a.x1 - r)), cz = Math.max(a.z0 + r, Math.min(z, a.z1 - r));
      return Math.hypot(x - cx, z - cz) <= r && x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1;
    });
    const cas = D.cascada;
    const enRio = (x, z) => cas && Math.abs(x - cas.x) < cas.ancho / 2 && z >= cas.z0 - 0.5 && z <= cas.z1;

    // ---------- calles: asfalto, veredas, líneas, pasos de cebra y barandas al borde de las islas ----------
    // Una vereda se corta donde llega otra calle por ese lado
    const corta = (k, s) => {
      const out = [];
      for (const o of D.calles) {
        if (o === k || o.dir === k.dir || o.c < k.a - 0.01 || o.c > k.b + 0.01 || k.c < o.a - 0.01 || k.c > o.b + 0.01) continue;
        if (s < 0 ? o.a < k.c - ASF : o.b > k.c + ASF) out.push([o.c - ANCHO, o.c + ANCHO]);
      }
      return out;
    };
    const restar = (a, b, cortes) => {
      let tr = [[a, b]];
      for (const [c0, c1] of cortes) tr = tr.flatMap(([u0, u1]) => (c1 <= u0 || c0 >= u1) ? [[u0, u1]] : [[u0, Math.max(u0, c0)], [Math.min(u1, c1), u1]].filter(([x0, x1]) => x1 - x0 > 0.05));
      return tr;
    };
    const pisables = [];   // [x0, z0, x1, z1, alto]
    const barandas = [];   // [x0, z0, x1, z1] de las barandas al borde de las islas
    for (const k of D.calles) {
      const H = k.dir === 'x', cr = k.cruces || [];
      const caja = (u0, u1, v, ancho, alto, color, y, lote) => { const cu = (u0 + u1) / 2, lu = u1 - u0; if (H) (lote || Lp).cajaB(cu, y || 0, v, lu, alto, ancho, color); else (lote || Lp).cajaB(v, y || 0, cu, ancho, alto, lu, color); };
      // lo que se pisa (asfalto, vereda, solera) queda anotado para que los personajes caminen encima y no se hundan
      const pisa = (u0, u1, v, ancho, alto) => pisables.push(H ? [u0, v - ancho / 2, u1, v + ancho / 2, alto] : [v - ancho / 2, u0, v + ancho / 2, u1, alto]);
      const enA = cr.some((u) => Math.abs(u - k.a) < 0.05), enB = cr.some((u) => Math.abs(u - k.b) < 0.05);
      caja(k.a - (enA ? ASF : 0), k.b + (enB ? ASF : 0), k.c, 2 * ASF, 0.012, '#4c4f57');
      pisa(k.a - (enA ? ASF : 0), k.b + (enB ? ASF : 0), k.c, 2 * ASF, 0.014);
      const ext = H ? ANCHO : ASF;
      for (const s of [-1, 1]) for (const [u0, u1] of restar(k.a - (enA ? ext : 0), k.b + (enB ? ext : 0), corta(k, s))) {
        caja(u0, u1, k.c + s * (ASF + VER / 2), VER, 0.07, '#cfc7b5'); caja(u0, u1, k.c + s * (ASF + 0.03), 0.06, 0.08, '#a9a293');
        pisa(u0, u1, k.c + s * (ASF + VER / 2), VER, 0.07); pisa(u0, u1, k.c + s * (ASF + 0.03), 0.06, 0.08);
      }
      for (let u = k.a + 0.6; u < k.b - 0.6; u += 1.2) { if (cr.some((c) => Math.abs(u - c) < ANCHO + 1.2)) continue; caja(u, u + 0.6, k.c, 0.1, 0.004, '#f2d65a', 0.013); }
      for (const s of [-1, 1]) for (const [u0, u1] of restar(k.a, k.b, cr.map((c) => [c - ASF - 0.1, c + ASF + 0.1]))) caja(u0, u1, k.c + s * (ASF - 0.15), 0.06, 0.004, '#e8e6e0', 0.013);
      for (const c of cr) for (const s of [-1, 1]) {
        const u = c + s * (ANCHO + 0.55);
        if (u < k.a || u > k.b) continue;
        for (let m = -ASF + 0.3; m <= ASF - 0.25; m += 0.55) caja(u - 0.38, u + 0.38, k.c + m, 0.28, 0.004, '#f4f4f0', 0.014);
      }
      if (k.anillo) {
        const I = D.islas.find((i) => i.id === k.anillo);
        const s = H ? (Math.abs(k.c - I.z0) < Math.abs(k.c - I.z1) ? -1 : 1) : (Math.abs(k.c - I.x0) < Math.abs(k.c - I.x1) ? -1 : 1);
        const v = k.c + s * (ANCHO + 0.12);
        for (const [u0, u1] of restar(k.a - (enA ? ANCHO + 0.12 : 0), k.b + (enB ? ANCHO + 0.12 : 0), corta(k, s))) {
          caja(u0, u1, v, 0.08, 0.06, '#d8dde3', 0.52, L); caja(u0, u1, v, 0.06, 0.05, '#d8dde3', 0.28, L);
          for (let u = u0; u <= u1 + 0.01; u += 1.1) caja(u - 0.04, u + 0.04, v, 0.08, 0.56, '#8a8f98', 0, L);
          barandas.push(H ? [u0, v, u1, v] : [v, u0, v, u1]);
        }
      }
    }
    for (const n of D.red.nodos) if (n.tipo === 'cruce') Lp.cajaB(n.x, 0, n.z, 2 * ASF + 0.04, 0.0135, 2 * ASF + 0.04, '#4c4f57');

    // ---------- texturas de las islas temáticas ----------
    TX.peli = texDinamica(96, 48, (x, t, w, h) => {
      const esc = Math.floor(t / 6000) % 4, f = (t % 6000) / 6000;
      const cielos = [['#1a2a5a', '#e87a4a'], ['#0a0a1a', '#3a1a4a'], ['#5aa8f0', '#d2ecff'], ['#2a1a0a', '#8a4a1a']];
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, cielos[esc][0]); g.addColorStop(1, cielos[esc][1]); x.fillStyle = g; x.fillRect(0, 0, w, h);
      if (esc === 0) { x.fillStyle = '#ffd27a'; x.beginPath(); x.arc(70, 30 + f * 10, 9, 0, 7); x.fill(); x.fillStyle = '#1a1a1a'; x.fillRect(0, 36, w, 12); x.fillRect(10 + f * 60, 27, 8, 4); x.fillRect(12 + f * 60, 23, 3, 5); }
      else if (esc === 1) { x.fillStyle = '#d0d8ff'; for (let k = 0; k < 20; k++) x.fillRect((k * 37) % w, (k * 13) % 30, 1, 1); x.strokeStyle = '#c0101a'; x.lineWidth = 2; x.beginPath(); x.arc(48, 24, 9 + f * 3, 0, 7); x.stroke(); x.fillStyle = '#c0101a'; x.fillRect(44, 20, 2, 3); x.fillRect(51, 20, 2, 3); x.beginPath(); x.arc(48, 25, 5, 0.2, 2.9); x.stroke(); }
      else if (esc === 2) { x.fillStyle = '#3a3a3a'; x.beginPath(); x.moveTo(14 + f * 50, 20); x.lineTo(40 + f * 50, 14 + Math.sin(t / 150) * 3); x.lineTo(28 + f * 50, 26); x.fill(); x.fillStyle = '#5a8a3a'; x.fillRect(0, 40, w, 8); }
      else { x.fillStyle = '#5a8a3a'; x.fillRect(0, 34, w, 14); x.fillStyle = '#2a2a2a'; x.fillRect(30 + Math.sin(t / 300) * 6, 22, 5, 12); x.fillRect(58 - Math.sin(t / 300) * 6, 22, 5, 12); x.fillStyle = '#c8c8d0'; x.fillRect(35 + Math.sin(t / 300) * 6, 25, 8, 1); }
      x.fillStyle = 'rgba(255,255,255,0.07)'; for (let k = 0; k < 5; k++) x.fillRect(Math.random() * w, 0, 1, h);
    }, 120, true);
    TX.marquesina = texDinamica(256, 32, (x, t, w, h) => {
      x.fillStyle = '#1a1214'; x.fillRect(0, 0, w, h);
      x.font = `bold 15px ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const titulos = ['HOY: EL MENTALISTA', 'ESTRENO: DAYS GONE', 'FUNCIÓN 22:00', 'GOD OF WAR', 'NOCHE DE TERROR'];
      x.fillStyle = '#ffe7a8'; x.fillText(titulos[Math.floor(t / 5000) % titulos.length], w / 2, h / 2 + 1);
      const fase = Math.floor(t / 180);
      for (let k = 0; k < 32; k++) { x.fillStyle = (k + fase) % 3 === 0 ? '#ffe680' : '#6a5a2a'; x.fillRect(k * 8 + 2, 1, 4, 3); x.fillRect(k * 8 + 2, h - 4, 4, 3); }
    }, 180, false);
    TX.afiches = texDinamica(96, 48, (x) => {
      [['#1a1a2a', '#c0101a', 'RED JOHN'], ['#0a1a2a', '#7ad0ff', 'INVIERNO'], ['#2a1a0a', '#ffb040', 'KRATOS']].forEach(([bg, c, s], k) => {
        x.fillStyle = bg; x.fillRect(k * 32, 0, 32, 48); x.fillStyle = c; x.fillRect(k * 32 + 6, 7, 20, 23);
        x.fillStyle = '#fff'; x.font = `6px ${FUENTE}`; x.textAlign = 'center'; x.fillText(s, k * 32 + 16, 40);
        x.strokeStyle = '#d4a83a'; x.lineWidth = 1; x.strokeRect(k * 32 + 0.5, 0.5, 31, 47);
      });
    }, 0, true);
    TX.estrella = texDinamica(32, 32, (x) => {
      x.clearRect(0, 0, 32, 32); x.fillStyle = '#c86a8a'; x.fillRect(1, 1, 30, 30); x.fillStyle = '#e8b84a';
      x.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 12, a = -Math.PI / 2 + k * Math.PI / 5; x.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); } x.closePath(); x.fill();
    }, 0, true);
    TX.visualizador = texDinamica(64, 32, (x, t, w, h) => {
      x.fillStyle = '#0a0612'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 16; k++) {
        const v = (Math.sin(t / 180 + k * 0.7) * 0.5 + 0.5) * (Math.sin(t / 470 + k * 1.3) * 0.3 + 0.7), hh = Math.round(v * (h - 4));
        x.fillStyle = `hsl(${(k * 20 + t / 20) % 360},90%,60%)`; x.fillRect(k * 4 + 1, h - 2 - hh, 3, hh);
      }
    }, 100, true);
    TX.karaoke = texDinamica(64, 36, (x, t, w, h) => {
      x.fillStyle = '#10204a'; x.fillRect(0, 0, w, h);
      const lineas = ['LA LA LA', 'OH OH OH', 'BAILA YA', 'CANTA YA'], k = Math.floor(t / 2400) % lineas.length, pr = (t % 2400) / 2400;
      x.font = `9px ${FUENTE}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = '#ffffff'; x.fillText(lineas[k], 6, 16);
      x.save(); x.beginPath(); x.rect(6, 6, (w - 12) * pr, 14); x.clip(); x.fillStyle = '#ff6ad5'; x.fillText(lineas[k], 6, 16); x.restore();
      x.fillStyle = '#8ab0ff'; x.fillText(lineas[(k + 1) % lineas.length], 6, 30);
    }, 150, true);
    TX.portal = texDinamica(64, 64, (x, t, w, h) => {
      x.clearRect(0, 0, w, h);
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(230,200,255,0.9)'); g.addColorStop(1, 'rgba(120,60,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
      for (let k = 0; k < 5; k++) { x.strokeStyle = `rgba(${160 + k * 15},${100 + k * 25},255,${0.85 - k * 0.12})`; x.lineWidth = 3; x.beginPath(); x.arc(32, 32, 6 + k * 5, t / 400 + k, t / 400 + k + 4.2); x.stroke(); }
    }, 80, false);

    // ---------- carteles con texto (arcos de las islas, food trucks, cine, neones) ----------
    const TEXTOS = [];
    for (const p of D.props) if (p.texto && p.t !== 'torre_empresa' && !TEXTOS.some((e) => e.texto === p.texto && e.t === p.t)) TEXTOS.push({ texto: p.texto, t: p.t, c: p.cc || p.c || '#333', c2: p.ct || p.c2 || '#fff' });
    const CW = 512, CH = 64;
    const atlasTxt = texDinamica(CW, CH * Math.max(1, TEXTOS.length), (x, t, w, h) => {
      x.clearRect(0, 0, w, h);
      TEXTOS.forEach((e, k) => {
        const y0 = k * CH;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        let fs = 34; x.font = `bold ${fs}px ${FUENTE}`;
        while (x.measureText(e.texto).width > CW - 48 && fs > 12) { fs--; x.font = `bold ${fs}px ${FUENTE}`; }
        if (e.t === 'neon_texto') { x.shadowColor = e.c; x.shadowBlur = 12; x.fillStyle = '#ffffff'; x.fillText(e.texto, CW / 2, y0 + CH / 2 + 2); x.shadowBlur = 0; x.lineWidth = 2; x.strokeStyle = e.c; x.strokeText(e.texto, CW / 2, y0 + CH / 2 + 2); }
        else if (e.t === 'cine') { x.fillStyle = '#1a1214'; x.fillRect(0, y0, CW, CH); x.fillStyle = '#ff4a5a'; x.fillText(e.texto, CW / 2, y0 + CH / 2 + 2); }
        else if (e.t === 'food_truck') { x.fillStyle = '#1e1e22'; x.fillRect(0, y0, CW, CH); x.fillStyle = '#ffe7a8'; x.fillText(e.texto, CW / 2, y0 + CH / 2 + 2); }
        else { x.fillStyle = e.c; x.fillRect(0, y0, CW, CH); x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(0, y0 + CH - 8, CW, 8); x.fillStyle = e.c2; x.fillText(e.texto, CW / 2, y0 + CH / 2); }
      });
    }, 0, false);
    const matCartel = matTex(atlasTxt.t, true);
    const matNeon = matTex(atlasTxt.t, true, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const uvTexto = (txt, t) => { const k = Math.max(0, TEXTOS.findIndex((e) => e.texto === txt && e.t === t)), n = Math.max(1, TEXTOS.length); return [0, 1 - (k + 1) / n, 1, 1 - k / n]; };

    // ---------- torres de empresas: fachadas con ventanas (de noche se encienden algunas) y letreros con logo ----------
    const FACHADAS = {}, MARCAS = {};
    function fachada(p, hb) {
      if (FACHADAS[p.marca]) return FACHADAS[p.marca];
      const cols = Math.max(4, Math.round(p.w / 0.8)), filas = Math.max(4, Math.round(hb / 0.75)), W = cols * 8, H = filas * 8;
      const oscuro = new THREE.Color(p.c).getHSL({}).l < 0.35;
      const dia = texDinamica(W, H, (x) => {
        x.fillStyle = tono(p.c, 0.92); x.fillRect(0, 0, W, H);
        for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
          const g = 0.35 + hash(c * 3 + f, f * 7 + p.h) * 0.25;
          x.fillStyle = oscuro ? `rgb(${30 + g * 50},${40 + g * 60},${60 + g * 70})` : `rgb(${80 + g * 70},${120 + g * 60},${160 + g * 50})`;
          x.fillRect(c * 8 + 1, f * 8 + 1, 6, 6);
          x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(c * 8 + 1, f * 8 + 1, 2, 6);
        }
      }, 0, true);
      const noche = texDinamica(W, H, (x) => {
        x.clearRect(0, 0, W, H);
        for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) {
          if (hash(c * 11 + p.w * 3, f * 13 + p.h * 5) < 0.5) continue;
          x.fillStyle = hash(c + p.h, f) > 0.7 ? '#cfe6ff' : '#ffd890'; x.fillRect(c * 8 + 1, f * 8 + 1, 6, 6);
        }
      }, 0, true);
      const mN = new THREE.MeshBasicMaterial({ map: noche.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      nocturnos.push(mN);
      FACHADAS[p.marca] = { dia: plan('fach_' + p.marca, matTex(dia.t, false)), noche: plan('fachN_' + p.marca, mN) };
      return FACHADAS[p.marca];
    }
    function dibujarLogo(x, m, cx, cy, r) {
      x.save(); x.translate(cx, cy);
      if (m === 'anthropic') { x.strokeStyle = '#d97757'; x.lineWidth = r * 0.3; x.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.stroke(); } }
      else if (m === 'openai') { x.strokeStyle = '#ffffff'; x.lineWidth = r * 0.17; for (let k = 0; k < 6; k++) { x.save(); x.rotate(k * Math.PI / 3); x.beginPath(); x.ellipse(0, -r * 0.42, r * 0.3, r * 0.52, 0, 0, Math.PI * 2); x.stroke(); x.restore(); } }
      else if (m === 'google') ['#4285f4', '#ea4335', '#fbbc05', '#34a853'].forEach((c, k) => { x.strokeStyle = c; x.lineWidth = r * 0.36; x.beginPath(); x.arc(0, 0, r * 0.7, k * Math.PI / 2 + 0.3, (k + 1) * Math.PI / 2 + 0.3); x.stroke(); });
      else if (m === 'microsoft') [['#f25022', -1, -1], ['#7fba00', 1, -1], ['#00a4ef', -1, 1], ['#ffb900', 1, 1]].forEach(([c, sx, sy]) => { x.fillStyle = c; x.fillRect(sx > 0 ? r * 0.06 : -r * 0.86, sy > 0 ? r * 0.06 : -r * 0.86, r * 0.8, r * 0.8); });
      else if (m === 'deepseek') { x.fillStyle = '#4d6bfe'; x.beginPath(); x.ellipse(-r * 0.1, r * 0.1, r * 0.8, r * 0.5, 0, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(r * 0.55, 0); x.lineTo(r * 1.0, -r * 0.55); x.lineTo(r * 0.95, r * 0.35); x.fill(); x.fillStyle = '#ffffff'; x.fillRect(-r * 0.5, -r * 0.05, r * 0.16, r * 0.16); }
      else if (m === 'qwen') { x.fillStyle = '#ff9a3c'; x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; x.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); } x.closePath(); x.fill(); x.fillStyle = '#5b3fd2'; x.beginPath(); x.arc(0, 0, r * 0.4, 0, Math.PI * 2); x.fill(); }
      else if (m === 'cyberlife') { x.fillStyle = '#2f8fe0'; x.beginPath(); x.moveTo(0, -r); x.lineTo(r * 0.95, r * 0.7); x.lineTo(-r * 0.95, r * 0.7); x.closePath(); x.fill(); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(0, -r * 0.3); x.lineTo(r * 0.4, r * 0.45); x.lineTo(-r * 0.4, r * 0.45); x.closePath(); x.fill(); }
      else if (m === 'umbrella') for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#ffffff' : '#c8202a'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, r, k * Math.PI / 4, (k + 1) * Math.PI / 4); x.closePath(); x.fill(); }
      else if (m === 'ollama') { x.fillStyle = '#1e1e22'; x.beginPath(); x.ellipse(0, r * 0.15, r * 0.55, r * 0.7, 0, 0, Math.PI * 2); x.fill(); x.fillRect(-r * 0.45, -r * 0.95, r * 0.2, r * 0.6); x.fillRect(r * 0.25, -r * 0.95, r * 0.2, r * 0.6); x.fillStyle = '#ffffff'; x.fillRect(-r * 0.25, 0, r * 0.13, r * 0.13); x.fillRect(r * 0.12, 0, r * 0.13, r * 0.13); }
      x.restore();
    }
    const ESTILO_MARCA = { anthropic: ['#f0e9de', '#1f1e1d'], google: ['#ffffff', '#3c4043'], microsoft: ['#ffffff', '#5e5e5e'], umbrella: ['#ffffff', '#c8202a'], ollama: ['#ffffff', '#1e1e22'] };
    function marca(p) {
      if (MARCAS[p.marca]) return MARCAS[p.marca];
      const [bg, fg] = ESTILO_MARCA[p.marca] || ['#14171c', '#ffffff'];
      const t = texto(256, 64, (x) => {
        x.fillStyle = bg; x.fillRect(0, 0, 256, 64);
        dibujarLogo(x, p.marca, 34, 32, 20);
        x.fillStyle = fg; x.textAlign = 'left'; x.textBaseline = 'middle';
        let fs = 26; x.font = `bold ${fs}px ${FUENTE}`;
        while (x.measureText(p.texto).width > 186 && fs > 10) { fs--; x.font = `bold ${fs}px ${FUENTE}`; }
        x.fillText(p.texto, 62, 34);
      });
      MARCAS[p.marca] = plan('marca_' + p.marca, matTex(t.t, true));
      return MARCAS[p.marca];
    }
    // neón con texto en una pared
    function neonTexto(p) {
      const w = 3.2;
      plan('neones', matNeon).agregar(0, 1.2 + (p.y || 0), 0.03, w, w / 8, uvTexto(p.texto, p.t), 0);
      halo(0, 1.2 + (p.y || 0), 0.25, 2.6, new THREE.Color(p.c).getHex(), true);
    }

    // ---------- paletas de las estaciones (pasto, follaje, borde de las islas) ----------
    const PAL = {
      primavera: { cesped: ['#86cc5e', '#80c65a', '#74bb52'], hoja: [['#7ccf5a', '#6cc04e', '#8ad868']], pino: ['#3f8a3f', '#357d3a'], cerezo: ['#f6a8c8', '#f2bcd4'], arbusto: ['#5fb04a', '#ff9ad0'], borde: '#74b852' },
      verano: { cesped: ['#76bb56', '#7cc25c', '#6fb551'], hoja: [['#5aa046', '#4f9440', '#66ae50']], pino: ['#2f6e35', '#3a7a3a'], cerezo: ['#f6a8c8', '#f2bcd4'], arbusto: ['#4f9a3f', '#5aa84a'], borde: '#6aa94a' },
      otono: { cesped: ['#a3b453', '#99ac4e', '#afb95a'], hoja: [['#e07b2a', '#d0661f', '#ec9a3a'], ['#d9a42a', '#c8902a', '#e8b43a'], ['#c0502a', '#a8402a', '#d06a3a'], ['#a0ac3a', '#8a983a', '#b0bc4a']], pino: ['#30623a', '#3a6e3a'], cerezo: ['#d2603a', '#e07a4a'], arbusto: ['#b8862a', '#c89a3a'], borde: '#9aa84e' },
      invierno: { cesped: ['#eef3f6', '#e4ecf1', '#f6f9fb'], hoja: [['#eef3f7', '#e2eaf0', '#f6f9fb']], pino: ['#3a6a4a', '#eef3f6'], cerezo: ['#eef3f7', '#e2eaf0'], arbusto: ['#e8eff3', '#dfe8ee'], borde: '#e8eef2' }
    };

    // ---------- catálogo de muebles ----------
    const C = { mad: '#a87445', madO: '#6e4a2c', madC: '#c8925a', pie: '#9a958e', pieO: '#6f6b66', met: '#5a6270', metO: '#2e333b', bla: '#f2f0ea', neg: '#1e1e22' };
    const silla = (c, gamer) => {
      L.cajaB(0, 0.4, 0, 0.46, 0.06, 0.46, c);
      if (gamer) { L.cajaB(0, 0.46, -0.2, 0.46, 0.65, 0.08, c); L.cajaB(0, 0.6, -0.15, 0.3, 0.4, 0.02, '#c0303a'); L.cil(0, 0.08, 0, 0.04, 0.33, C.metO, 6); L.cajaB(0, 0, 0, 0.5, 0.06, 0.08, C.metO); L.cajaB(0, 0, 0, 0.08, 0.06, 0.5, C.metO); }
      else { L.cajaB(0, 0.46, -0.21, 0.46, 0.5, 0.05, c); for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) L.cajaB(x, 0, z, 0.05, 0.4, 0.05, tono(c, 0.75)); }
    };
    const sofa = (w, c) => {
      L.cajaB(0, 0.12, 0, w, 0.3, 0.85, c);
      L.cajaB(0, 0.42, 0.05, w - 0.36, 0.08, 0.72, tono(c, 1.1));
      L.cajaB(0, 0.42, -0.33, w, 0.5, 0.2, tono(c, 0.92));
      for (const s of [-1, 1]) L.cajaB(s * (w / 2 - 0.1), 0.12, 0, 0.2, 0.5, 0.85, tono(c, 0.88));
      for (const s of [-1, 1]) L.cajaB(s * (w / 2 - 0.12), 0, 0.3, 0.07, 0.12, 0.07, C.neg);
    };
    const COLOR_FUEGO = { azul: [0x2a6aff, 0x9ad8ff, 0x5a9aff], verde: [0x2acf4a, 0xb0ff6a, 0x6aff6a] };
    const fuego = (x, y, z, s, tipo) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const cf = COLOR_FUEGO[tipo] || [0xff7a1a, 0xffd23a, 0xff9a3a];
      const m1 = new THREE.MeshBasicMaterial({ color: cf[0] }), m2 = new THREE.MeshBasicMaterial({ color: cf[1] });
      const llamas = [];
      for (let k = 0; k < 4; k++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 0.5 * s, 5), k % 2 ? m2 : m1);
        c.position.set((hash(k, 1) - 0.5) * 0.25 * s, 0.25 * s, (hash(1, k) - 0.5) * 0.25 * s);
        g.add(c); llamas.push(c);
      }
      halos.push({ x, y: y + 0.35 * s, z, s: 1.7 * s, c: cf[2], siempre: true });
      return { g, llamas };
    };
    // Una personita a bordo de un juego (va en el mismo lote que el juego: no agrega llamadas de dibujo)
    const ROPA = ['#d64541', '#3a7ad9', '#5aa046', '#f2c230', '#7a4fa8', '#2fb0a8', '#e0457b', '#f4f4f0'], PIELES = ['#f0c8a0', '#c99a72', '#8a5a3a', '#e0b090'];
    const pasajero = (Lt, x, y, z, k) => { Lt.cajaB(x, y, z, 0.2, 0.24, 0.16, ROPA[k % 8]); Lt.cajaB(x, y + 0.24, z, 0.25, 0.23, 0.23, PIELES[k % 4]); Lt.cajaB(x, y + 0.45, z, 0.27, 0.06, 0.25, ['#2a1c14', '#6a3a22', '#1a1410'][k % 3]); };
    const P = {
      torre(p) {
        L.cil(0, 0, 0, 1.25, p.h, C.pie, 8); L.cil(0, p.h - 0.05, 0, 1.38, 0.2, C.pieO, 8);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; L.cajaB(Math.cos(a) * 1.2, p.h + 0.15, Math.sin(a) * 1.2, 0.42, 0.38, 0.42, C.pie); }
        for (const y of [p.h * 0.45, p.h * 0.75]) { L.cajaB(0.85, y, 0.85, 0.16, 0.44, 0.16, '#2a2622', Math.PI / 4); Ll.cajaB(0.92, y + 0.06, 0.92, 0.06, 0.3, 0.06, '#ffc27a', Math.PI / 4); halo(0.95, y + 0.2, 0.95, 0.8, 0xffb060); }
        L.cono(0, p.h + 0.5, 0, 0.95, 1.4, '#6a3a3a', 8); L.cajaB(0, p.h + 1.85, 0, 0.04, 0.6, 0.04, '#3a2a1e'); L.cajaB(0.22, p.h + 2.2, 0, 0.42, 0.26, 0.02, '#b3242c');
        bloquearCirculo(p.x, p.z, 1.4);
      },
      tarima(p) { L.cajaB(0, 0, 0, p.w, p.h, p.d, '#8f8a83'); L.cajaB(0, 0, p.d / 2 + 0.25, p.w * 0.5, p.h * 0.5, 0.5, '#8f8a83'); bloquear(p.x, p.z, p.w, p.d, p.r); },
      trono() {
        L.cajaB(0, 0, 0, 1.3, 0.48, 1.0, '#3d3f44'); L.cajaB(0, 0.48, 0.05, 1.0, 0.06, 0.8, '#2b2d31');
        for (const s of [-1, 1]) L.cajaB(s * 0.55, 0.48, 0.05, 0.2, 0.32, 0.85, '#45474d');
        for (let k = 0; k < 17; k++) { const u = (k / 16 - 0.5); const h = 1.3 + (1 - Math.abs(u) * 1.6) * 1.2 + hash(k, 3) * 0.3; L.cajaB(u * 1.5, 0.5, -0.38 - hash(k, 1) * 0.12, 0.07, h, 0.04, k % 3 ? '#5c5f66' : '#6d7077', 0); L.cajaB(u * 1.5, 0.5 + h, -0.4, 0.04, 0.12, 0.03, '#8a8d93'); L.cajaB(u * 1.5, 0.42, -0.36, 0.16, 0.04, 0.05, '#b8963a'); }
        for (let k = 0; k < 8; k++) L.caja(-0.6 + k * 0.17, 0.25, 0.52, 0.04, 0.5, 0.04, '#55585e', 0.3, 0, (hash(k, 9) - 0.5) * 0.4);
      },
      estandarte(p) { L.cajaB(0, 0.4, 0.03, 0.95, 1.55, 0.04, p.c); L.cajaB(0, 1.95, 0.05, 1.1, 0.06, 0.08, '#3a2a1e'); L.caja(0, 1.25, 0.06, 0.34, 0.34, 0.02, p.c2, 0, 0, Math.PI / 4); L.caja(0, 0.38, 0.03, 0.4, 0.2, 0.04, p.c, 0, 0, Math.PI / 4); L.cajaB(0, 0.62, 0.052, 0.95, 0.05, 0.01, p.c2); },
      antorcha() { L.cajaB(0, 1.25, 0.06, 0.08, 0.08, 0.12, C.metO); L.caja(0, 1.42, 0.14, 0.06, 0.36, 0.06, '#5a3a22', -0.35); const pos = local(0, 1.62, 0.21); const f = fuego(pos.x, pos.y, pos.z, 0.45); raiz.add(f.g); animados.push({ fuego: f }); },
      brasero(p) {
        for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; L.caja(Math.cos(a) * 0.22, 0.35, Math.sin(a) * 0.22, 0.05, 0.75, 0.05, C.metO, 0, -a, 0.25); }
        L.cil(0, 0.72, 0, 0.42, 0.18, '#3a3a3e', 8); L.cil(0, 0.86, 0, 0.36, 0.04, '#ff8a2a', 8);
        const f = fuego(p.x, 0.88, p.z, 1.1); raiz.add(f.g); animados.push({ fuego: f });
        charco(0, 0, 3.5, 0xff8a3a);
        bloquear(p.x, p.z, 0.9, 0.9, 0);
      },
      alfombra(p) { L.cajaB(0, 0, 0, p.w, 0.02, p.d, tono(p.c, 0.85)); L.cajaB(0, 0.02, 0, p.w - 0.3, 0.012, p.d - 0.3, p.c); for (const s of [-1, 1]) L.cajaB(s * (p.w / 2 - 0.08), 0.02, 0, 0.04, 0.014, p.d - 0.1, '#e8c060'); },
      mesa_larga(p) {
        L.cajaB(0, 0.68, 0, p.w, 0.1, p.d, C.madO);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.cajaB(x * (p.w / 2 - 0.15), 0, z * (p.d / 2 - 0.15), 0.12, 0.68, 0.12, C.madO);
        L.cajaB(0, 0.78, 0, p.w - 0.3, 0.01, 0.5, '#8e1d24');
        for (let k = 0; k < 6; k++) { const x = -p.w / 2 + 0.6 + k * (p.w - 1.2) / 5; L.cil(x, 0.785, (k % 2 ? 0.3 : -0.3), 0.16, 0.03, '#d8d0c0', 8); L.cil(x + 0.25, 0.785, (k % 2 ? 0.25 : -0.25), 0.05, 0.16, '#c8a24a', 6); }
        L.esfera(0, 0.9, 0, 0.22, '#a8602a', 0, 1.3, 0.7, 1); L.cil(1.2, 0.785, 0, 0.25, 0.05, '#e8e0d0', 8); L.esfera(1.2, 0.87, 0, 0.14, '#d64541', 0); L.esfera(-1.3, 0.87, 0, 0.16, '#e8b84a', 0, 1, 0.6, 1);
        for (const x of [-2.4, 2.4]) { L.cil(x, 0.785, 0, 0.05, 0.25, '#c8a24a', 6); Ll.cil(x, 1.03, 0, 0.03, 0.08, '#ffd27a', 4); halo(x, 1.1, 0, 0.6, 0xffc070); }
        bloquear(p.x, p.z, p.w, p.d, p.r);
      },
      banco_largo(p) { L.cajaB(0, 0.38, 0, p.w, 0.08, 0.4, C.mad); for (const s of [-1, 0, 1]) L.cajaB(s * (p.w / 2 - 0.3), 0, 0, 0.12, 0.38, 0.32, C.madO); },
      muneco(p) { L.cajaB(0, 0, 0, 0.4, 0.08, 0.4, C.madO); L.cajaB(0, 0, 0, 0.1, 1.0, 0.1, C.madO); L.cajaB(0, 0.75, 0, 0.42, 0.6, 0.3, '#c9a65a'); L.esfera(0, 1.5, 0, 0.2, '#d8b86a', 0); L.cajaB(0, 1.15, 0, 0.9, 0.08, 0.08, C.madO); L.caja(0, 1.0, 0.16, 0.3, 0.06, 0.02, '#a83a2a', 0, 0, 0.3); bloquear(p.x, p.z, 0.7, 0.7, 0); },
      armero(p) { L.cajaB(0, 0, 0, 1.6, 0.1, 0.4, C.madO); L.cajaB(0, 1.1, -0.1, 1.6, 0.08, 0.1, C.madO); for (const s of [-1, 1]) L.cajaB(s * 0.75, 0, 0, 0.08, 1.3, 0.08, C.madO); for (let k = 0; k < 5; k++) { L.cajaB(-0.6 + k * 0.3, 0.1, 0, 0.04, 1.4, 0.04, k % 2 ? '#8a8d93' : C.madC); L.cajaB(-0.6 + k * 0.3, 1.45, 0, 0.08, 0.15, 0.03, '#a8acb2'); } bloquear(p.x, p.z, 1.6, 0.5, p.r); },
      roca_dragon(p) { L.esfera(0, 0.5, 0, 1.0, '#7d776f', 0, 1.1, 0.8, 1); L.esfera(0.3, 1.0, -0.2, 0.6, '#8b857d', 0); for (let k = 0; k < 5; k++) L.esfera(-0.8 + k * 0.4, 0.06, 0.9, 0.12, '#5aa046', 0); bloquearCirculo(p.x, p.z, 1.1); },
      calavera_dragon(p) {
        const h = '#ece4d2', o = '#cfc6b0';
        L.esfera(0, 0.55, 0, 0.6, h, 1, 1.1, 0.85, 1.25); L.cajaB(0, 0.1, 0.55, 0.62, 0.32, 0.9, h); L.cajaB(0, 0.02, 0.62, 0.56, 0.12, 0.8, o);
        for (const s of [-1, 1]) { L.cajaB(s * 0.24, 0.62, 0.3, 0.2, 0.2, 0.05, '#2a2420'); L.caja(s * 0.4, 1.0, -0.4, 0.14, 0.75, 0.14, o, -0.7, 0, s * 0.3); }
        for (let k = 0; k < 6; k++) L.cajaB(-0.22 + k * 0.09, 0.0, 1.0, 0.04, 0.12, 0.04, '#f8f4ea');
        bloquear(p.x, p.z, 1.4, 1.8, p.r);
      },
      pozo(p) { L.cil(0, 0, 0, 0.62, 0.7, C.pie, 10); L.cil(0, 0.68, 0, 0.5, 0.04, '#2a4a5a', 10); for (const s of [-1, 1]) L.cajaB(s * 0.55, 0.7, 0, 0.08, 1.0, 0.08, C.madO); L.cajaB(0, 1.66, 0, 1.3, 0.08, 0.12, C.madO); L.agregar('cono', 4, 0, 1.95, 0, 1.6, 0.55, 1.0, '#7a3a2a', 0, Math.PI / 4, 0); L.cilC(0, 1.42, 0, 0.06, 0.9, C.madC, 6, 0, 0, Math.PI / 2); L.cajaB(0.05, 0.98, 0, 0.18, 0.18, 0.18, '#7a5a3a'); bloquearCirculo(p.x, p.z, 0.7); },
      barril(p) { L.cil(0, 0, 0, 0.3, 0.7, '#8a5a34', 10); for (const y of [0.1, 0.55]) L.cil(0, y, 0, 0.31, 0.05, '#3a3a3e', 10); L.cil(0, 0.7, 0, 0.27, 0.01, '#6e4426', 10); bloquear(p.x, p.z, 0.6, 0.6, 0); },
      heno(p) { L.cajaB(0, 0, 0, 1.1, 0.55, 0.7, '#e0c060'); for (let k = 0; k < 3; k++) L.cajaB(-0.35 + k * 0.35, 0.55, 0, 0.02, 0.01, 0.7, '#b8962a'); L.cajaB(0.2, 0.55, 0.1, 0.7, 0.45, 0.6, '#d8b450'); bloquear(p.x, p.z, 1.1, 0.8, p.r); },
      litera(p) {
        const c = p.c;
        for (const [x, z] of [[-0.52, -1.0], [0.52, -1.0], [-0.52, 1.0], [0.52, 1.0]]) L.cajaB(x, 0, z, 0.08, 1.9, 0.08, C.madO);
        for (const y of [0.3, 1.3]) { L.cajaB(0, y, 0, 1.1, 0.1, 2.1, C.mad); L.cajaB(0, y + 0.1, 0, 1.0, 0.08, 2.0, C.bla); L.cajaB(0, y + 0.18, 0.25, 1.02, 0.04, 1.5, c); L.cajaB(0, y + 0.18, -0.75, 0.6, 0.08, 0.32, '#ffffff'); L.cajaB(0, y + 0.22, 0.4, 1.03, 0.01, 0.1, tono(c, 1.25)); }
        for (let k = 0; k < 4; k++) L.cajaB(0.56, 0.35 + k * 0.28, 0.65, 0.04, 0.04, 0.4, C.madO);
        L.cajaB(0, 1.42, -1.03, 1.1, 0.3, 0.06, C.madO);
        bloquear(p.x, p.z, 1.2, 2.2, p.r);
      },
      cama(p) { L.cajaB(0, 0, 0, 1.15, 0.3, 2.1, C.mad); L.cajaB(0, 0.3, 0, 1.05, 0.1, 2.0, C.bla); L.cajaB(0, 0.4, 0.25, 1.08, 0.05, 1.5, p.c); L.cajaB(0, 0.45, 0.4, 1.09, 0.01, 0.12, tono(p.c, 1.25)); L.cajaB(0, 0.4, -0.75, 0.62, 0.09, 0.34, '#ffffff'); L.cajaB(0, 0, -1.04, 1.15, 0.85, 0.08, C.madO); bloquear(p.x, p.z, 1.2, 2.2, p.r); },
      mesita(p) { L.cajaB(0, 0, 0, 0.45, 0.48, 0.42, C.madO); L.cajaB(0, 0.25, 0.212, 0.3, 0.02, 0.01, C.madC); L.cil(0, 0.48, 0, 0.05, 0.18, '#d8d0c0', 6); Ll.cil(0, 0.66, 0, 0.1, 0.14, '#ffe2a0', 6); halo(0, 0.75, 0, 0.7, 0xffd28a); bloquear(p.x, p.z, 0.5, 0.5, 0); },
      armario(p) { L.cajaB(0, 0, 0, 1.2, 1.8, 0.6, C.madO); L.cajaB(0, 0.1, 0.302, 0.02, 1.6, 0.01, '#4a3020'); for (const s of [-1, 1]) L.cajaB(s * 0.08, 0.9, 0.31, 0.03, 0.18, 0.02, '#d8b86a'); bloquear(p.x, p.z, 1.2, 0.7, p.r); },
      cuadro(p) { L.cajaB(0, 0.75, 0.02, 0.9, 0.62, 0.04, '#5a3a22'); L.cajaB(0, 0.8, 0.045, 0.78, 0.5, 0.01, p.c || '#5a8fbf'); L.cajaB(-0.15, 0.8, 0.052, 0.3, 0.22, 0.005, '#f2c14e'); L.cajaB(0.18, 0.8, 0.052, 0.36, 0.14, 0.005, '#3f7a4a'); },
      planta(p) { L.cil(0, 0, 0, 0.2, 0.32, '#b8623a', 8); L.cil(0, 0.3, 0, 0.18, 0.02, '#4a3020', 8); for (let k = 0; k < 6; k++) L.cono(Math.cos(k * 1.3) * 0.08, 0.3, Math.sin(k * 1.3) * 0.08, 0.1, 0.45 + hash(k, 2) * 0.2, k % 2 ? '#4f9a3f' : '#3f8a35', 4, (hash(k, 1) - 0.5) * 0.7, (hash(1, k) - 0.5) * 0.7); bloquear(p.x, p.z, 0.5, 0.5, 0); },
      cama_gato() { L.cil(0, 0, 0, 0.36, 0.1, '#c0504d', 10); L.cil(0, 0.1, 0, 0.28, 0.02, '#f2d0a0', 10); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; L.caja(Math.cos(a) * 0.32, 0.14, Math.sin(a) * 0.32, 0.12, 0.08, 0.1, '#c0504d', -a); } },
      redjohn(p) {
        const t = texto(64, 64, (x) => {
          x.clearRect(0, 0, 64, 64); x.strokeStyle = '#a8121a'; x.fillStyle = '#a8121a'; x.lineWidth = 4.5; x.lineCap = 'round';
          x.beginPath(); x.arc(32, 30, 22, 0, Math.PI * 2); x.stroke();
          x.beginPath(); x.ellipse(23, 24, 3, 5, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(41, 24, 3, 5, 0, 0, 7); x.fill();
          x.beginPath(); x.arc(32, 32, 12, 0.25 * Math.PI, 0.75 * Math.PI); x.stroke();
          x.lineWidth = 2; for (const [dx, l] of [[14, 14], [24, 22], [33, 10], [44, 18], [50, 12]]) { x.beginPath(); x.moveTo(dx, 46); x.lineTo(dx, 46 + l * 0.5); x.stroke(); }
        });
        plan('redjohn', matTex(t.t, false, { transparent: true, alphaTest: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })).agregar(0, 0.45, 0.012, 0.92, 0.92);
      },
      sofa_cuero(p) { sofa(p.w, '#6e3e22'); for (let k = 0; k < 3; k++) L.cajaB(-p.w / 2 + 0.45 + k * (p.w - 0.9) / 2, 0.5, 0.05, 0.03, 0.01, 0.7, '#5a3018'); bloquear(p.x, p.z, p.w, 0.9, p.r); },
      tablero() {
        const t = texDinamica(128, 64, (x) => {
          x.fillStyle = '#b8895a'; x.fillRect(0, 0, 128, 64);
          for (let k = 0; k < 40; k++) { x.fillStyle = hash(k, 3) > 0.5 ? '#a87c4e' : '#c49766'; x.fillRect(hash(k, 1) * 128, hash(1, k) * 64, 3, 2); }
          const fotos = [[12, 8], [40, 6], [70, 10], [98, 8], [22, 36], [56, 34], [88, 38], [110, 30]];
          x.strokeStyle = '#d4161e'; x.lineWidth = 1.2;
          for (let k = 0; k < fotos.length; k++) { const [a, b] = fotos[k], [c, d] = fotos[(k * 3 + 1) % fotos.length]; x.beginPath(); x.moveTo(a + 6, b + 7); x.lineTo(c + 6, d + 7); x.stroke(); }
          fotos.forEach(([a, b], k) => { x.fillStyle = '#f4f0e6'; x.fillRect(a, b, 13, 15); x.fillStyle = ['#5a6a7a', '#7a5a4a', '#4a5a4a', '#6a4a5a'][k % 4]; x.fillRect(a + 1.5, b + 1.5, 10, 9); x.fillStyle = '#e83a3a'; x.fillRect(a + 5, b - 1, 3, 3); });
          x.strokeStyle = '#b01018'; x.lineWidth = 2; x.beginPath(); x.arc(64, 54, 6, 0, 7); x.stroke(); x.fillStyle = '#b01018'; x.fillRect(61, 51, 1.5, 2); x.fillRect(66, 51, 1.5, 2); x.beginPath(); x.arc(64, 55, 3, 0.2, Math.PI - 0.2); x.stroke();
          x.fillStyle = '#fff6a8'; x.fillRect(4, 50, 20, 10); x.fillRect(100, 52, 22, 9);
        }, 0, true);
        L.cajaB(0, 0.52, 0.03, 2.7, 1.4, 0.06, C.madO);
        plan('tablero', matTex(t.t, false)).agregar(0, 1.22, 0.065, 2.56, 1.28);
      },
      placa_bau() {
        const t = texto(128, 48, (x) => { x.fillStyle = '#1e2a44'; x.fillRect(0, 0, 128, 48); x.strokeStyle = '#d8b84a'; x.lineWidth = 3; x.strokeRect(3, 3, 122, 42); x.fillStyle = '#f2e6c8'; x.font = `bold 15px ${FUENTE}`; x.textAlign = 'center'; x.fillText('FBI · BAU', 64, 22); x.font = `10px ${FUENTE}`; x.fillText('CBI SACRAMENTO', 64, 37); });
        L.cajaB(0, 0.62, 0.02, 1.22, 0.48, 0.04, '#3a2a1e');
        plan('placa_bau', matTex(t.t, false)).agregar(0, 0.86, 0.042, 1.16, 0.43);
      },
      escritorio(p) {
        const w = p.w || 1.4;
        L.cajaB(0, 0.72, 0, w, 0.06, 0.8, '#d9cbb0'); for (const s of [-1, 1]) L.cajaB(s * (w / 2 - 0.05), 0, 0, 0.06, 0.72, 0.74, '#8a8070');
        L.cajaB(0, 0.25, -0.35, w - 0.12, 0.45, 0.03, '#8a8070');
        const n = p.monitores || 1, inv = p.invertido;
        const tx = TX[p.monitor] || TX.oficina;
        const pm = plan('pant_' + (p.monitor || 'oficina'), matTex(tx.t, true));
        for (let k = 0; k < n; k++) {
          const x = (k - (n - 1) / 2) * (n === 3 ? 0.78 : 0.62), giro = n === 3 ? (k - 1) * -0.35 : 0;
          const zM = inv ? -0.15 : 0.15;
          L.cajaB(x, 0.78, zM, 0.18, 0.03, 0.14, C.neg); L.cajaB(x, 0.78, zM, 0.05, 0.22, 0.05, C.neg);
          L.caja(x, 1.13, zM, 0.62, 0.4, 0.04, C.neg, giro);
          pm.agregar(x, 1.13, zM + (inv ? 0.022 : -0.022), 0.56, 0.34, null, (inv ? 0 : Math.PI) + giro);
          halo(x, 1.13, zM + (inv ? 0.22 : -0.22), 0.8, p.monitor === 'codigo' ? 0x4ac8ff : p.monitor === 'edicion' ? 0xc070ff : 0xbfd8ff, true);
        }
        L.cajaB(0, 0.78, inv ? 0.2 : -0.2, 0.42, 0.02, 0.14, '#3a3a42');
        L.cil(w / 2 - 0.2, 0.78, 0.1, 0.05, 0.1, ['#e05a4a', '#4a8ae0', '#e0c04a'][Math.floor(hash(p.x, p.z) * 3)], 6);
        if (!inv && p.monitor === 'oficina') { L.cil(-w / 2 + 0.2, 0.78, 0.15, 0.06, 0.03, C.metO, 6); L.caja(-w / 2 + 0.24, 0.95, 0.12, 0.02, 0.35, 0.02, C.metO, 0.3); Ll.cajaB(-w / 2 + 0.3, 1.08, 0.05, 0.16, 0.06, 0.12, '#fff0c0'); halo(-w / 2 + 0.3, 1.0, 0.05, 0.6, 0xfff0c0); }
        bloquear(p.x, p.z, w, 0.8, p.r);
      },
      silla(p) { silla(p.c || C.madO, p.gamer); },
      mesa_redonda(p) {
        L.cil(0, 0.72, 0, 0.62, 0.06, C.madC, 10); L.cil(0, 0.05, 0, 0.06, 0.68, C.madO, 6); L.cil(0, 0, 0, 0.3, 0.05, C.madO, 8);
        if (p.mics) { for (const s of [-1, 1]) { L.cajaB(s * 0.25, 0.78, 0, 0.03, 0.3, 0.03, C.neg); L.cil(s * 0.25, 1.08, 0, 0.05, 0.12, '#3a3a3e', 8); } L.cajaB(0, 0.78, 0.2, 0.3, 0.04, 0.2, '#2a2a30'); Lb.cajaB(0, 0.82, 0.25, 0.1, 0.01, 0.05, '#ff3030'); }
        else { L.cil(0.15, 0.78, 0.1, 0.12, 0.02, '#f2f2f2', 8); L.cajaB(-0.2, 0.78, -0.1, 0.25, 0.03, 0.32, '#f4eedc'); L.cajaB(0.1, 0.78, -0.2, 0.2, 0.02, 0.26, '#d0c8a8'); }
        bloquearCirculo(p.x, p.z, 0.7);
      },
      estanteria(p) {
        const w = p.w, h = p.h;
        L.cajaB(0, 0, 0, w, h, 0.4, C.madO);
        const nf = Math.max(2, Math.round(h / 0.4));
        for (let f = 0; f < nf; f++) {
          const y = 0.08 + f * (h - 0.1) / nf;
          L.cajaB(0, y, 0.03, w - 0.08, 0.03, 0.36, C.mad);
          let x = -w / 2 + 0.1, k = 0;
          while (x < w / 2 - 0.15) { const bw = 0.06 + hash(k + f * 9, p.x) * 0.06, bh = 0.18 + hash(f, k) * 0.12; L.cajaB(x + bw / 2, y + 0.03, 0.06, bw, bh, 0.24, ['#8a2f2a', '#2f5a8a', '#3a7a4a', '#c8a24a', '#6a3a7a', '#d0d0c8'][(k * 7 + f) % 6]); x += bw + 0.01; k++; }
        }
        bloquear(p.x, p.z, w, 0.45, p.r);
      },
      archivero(p) { L.cajaB(0, 0, 0, 0.6, 1.15, 0.55, '#7a8290'); for (let k = 0; k < 3; k++) { L.cajaB(0, 0.08 + k * 0.36, 0.276, 0.52, 0.3, 0.01, '#8a92a0'); L.cajaB(0, 0.2 + k * 0.36, 0.285, 0.16, 0.03, 0.02, '#c8ccd2'); } L.cajaB(0.05, 1.15, 0, 0.3, 0.06, 0.24, '#d8c8a0'); bloquear(p.x, p.z, 0.6, 0.55, p.r); },
      sillon(p) { sofa(0.95, p.c); bloquear(p.x, p.z, 0.9, 0.9, p.r); },
      caja_carton() { L.cajaB(0, 0, 0, 0.6, 0.32, 0.5, '#c09a68'); L.cajaB(0, 0.02, 0, 0.52, 0.31, 0.42, '#8a6a42'); L.caja(-0.3, 0.38, 0, 0.02, 0.18, 0.5, '#c09a68', 0, 0, -0.5); L.caja(0.3, 0.38, 0, 0.02, 0.18, 0.5, '#c09a68', 0, 0, 0.5); },
      cafetera(p) { L.cajaB(0, 0, 0, 0.6, 0.85, 0.5, C.madO); L.cajaB(0, 0.85, 0, 0.3, 0.38, 0.3, C.neg); Lb.cajaB(0.08, 1.12, 0.151, 0.06, 0.04, 0.01, '#ff4040'); L.cil(-0.18, 0.85, 0.05, 0.05, 0.1, '#ffffff', 6); bloquear(p.x, p.z, 0.6, 0.5, p.r); },
      bebedero(p) { L.cajaB(0, 0, 0, 0.4, 0.9, 0.4, '#e8ecf0'); L.cil(0, 0.9, 0, 0.15, 0.4, '#7fc8ff', 8); bloquear(p.x, p.z, 0.4, 0.4, 0); },
      rack(p) {
        L.cajaB(0, 0, 0, 1.05, 1.82, 0.8, '#1c2230'); L.cajaB(0, 1.82, 0, 1.08, 0.05, 0.84, '#2a3244');
        plan('leds', matTex(TX.leds.t, true)).agregar(0, 0.92, 0.402, 0.9, 1.65);
        halo(0, 1.0, 0.55, 0.9, 0x3fd0ff, true);
        bloquear(p.x, p.z, 1.1, 0.9, p.r);
      },
      capsula(p) {
        L.cil(0, 0, 0, 0.48, 0.12, '#3a4256', 10); Lb.cil(0, 0.12, 0, 0.42, 0.02, '#3fe0ff', 10);
        L.cajaB(0, 0, -0.42, 0.9, 2.1, 0.14, '#2a3244'); Lb.cajaB(0, 0.3, -0.34, 0.08, 1.5, 0.02, '#3fe0ff');
        for (const s of [-1, 1]) { L.cajaB(s * 0.42, 0, -0.2, 0.1, 2.1, 0.12, '#3a4256'); Lb.cajaB(s * 0.42, 0.2, -0.13, 0.03, 1.7, 0.02, '#6ff0ff'); }
        L.cil(0, 2.05, -0.05, 0.5, 0.1, '#3a4256', 10); Lb.cil(0, 2.02, -0.05, 0.4, 0.03, '#3fe0ff', 10);
        halo(0, 1.0, 0, 1.2, 0x3fe0ff, true);
        bloquear(p.x, p.z, 1, 1, p.r);
      },
      holograma(p) {
        L.cil(0, 0, 0, 0.55, 0.5, '#2a3244', 10); Lb.cil(0, 0.5, 0, 0.45, 0.02, '#3fe0ff', 10);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: TX.holo.t, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.position.set(p.x, 1.15, p.z); raiz.add(m);
        const cono = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.9, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x3fd0ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        cono.position.set(p.x, 0.97, p.z); raiz.add(cono);
        animados.push({ act: (t) => { m.rotation.y = t / 1600; } });
        halo(0, 1.0, 0, 1.6, 0x3fd0ff, true);
        bloquearCirculo(p.x, p.z, 0.6);
      },
      nevera_bebidas(p) { L.cajaB(0, 0, 0, 0.8, 1.8, 0.7, '#d8dde4'); Lb.cajaB(0, 0.2, 0.352, 0.66, 1.4, 0.01, '#9fe7ff'); for (let f = 0; f < 4; f++) for (let k = 0; k < 4; k++) Lb.cajaB(-0.24 + k * 0.16, 0.25 + f * 0.34, 0.36, 0.08, 0.2, 0.01, ['#ff3a6a', '#3aff9a', '#ffd23a', '#3a9aff'][(f + k) % 4]); halo(0, 0.9, 0.5, 1.0, 0x9fe7ff, true); bloquear(p.x, p.z, 0.8, 0.7, p.r); },
      cables() { for (let k = 0; k < 5; k++) L.cajaB(-3 + k * 1.4, 0, (hash(k, 3) - 0.5) * 0.4, 1.3, 0.03, 0.05, ['#1a1a1e', '#2a3a5a', '#3a1a1a'][k % 3]); },
      letrero_youtube() {
        const t = texto(128, 96, (x) => {
          x.clearRect(0, 0, 128, 96);
          x.fillStyle = '#ff0033'; const r = 18; x.beginPath(); x.moveTo(14 + r, 6); x.arcTo(114, 6, 114, 72, r); x.arcTo(114, 72, 14, 72, r); x.arcTo(14, 72, 14, 6, r); x.arcTo(14, 6, 114, 6, r); x.fill();
          x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(54, 22); x.lineTo(82, 39); x.lineTo(54, 56); x.fill();
          x.font = `bold 14px ${FUENTE}`; x.textAlign = 'center'; x.fillStyle = '#ffffff'; x.fillText('YOUTUBE', 64, 92);
        });
        plan('youtube', matTex(t.t, true, { transparent: true, alphaTest: 0.1 })).agregar(0, 0.6, 0.02, 1.5, 1.12);
        halo(0, 0.6, 0.25, 2.2, 0xff2040, true);
      },
      placas_youtube() { for (let k = 0; k < 3; k++) { const c = ['#d8dde4', '#e8c04a', '#bfefff'][k]; L.cajaB(-0.55 + k * 0.55, 0, 0.02, 0.44, 0.5, 0.04, '#2a2a30'); L.cajaB(-0.55 + k * 0.55, 0.06, 0.045, 0.34, 0.36, 0.01, c); L.cajaB(-0.55 + k * 0.55, 0.2, 0.052, 0.12, 0.08, 0.005, '#ff2040'); } },
      pantalla_verde(p) { L.cajaB(0, 0, 0.03, p.w, 1.3, 0.04, '#3fbf4f'); L.cajaB(0, 0, 0.45, p.w, 0.02, 0.8, '#3fbf4f'); for (const s of [-1, 1]) L.cajaB(s * (p.w / 2 + 0.05), 0, 0.03, 0.06, 1.4, 0.06, C.metO); },
      taburete(p) { const h = p.alto ? 0.62 : 0.5; L.cil(0, h - 0.05, 0, 0.22, 0.06, p.alto ? '#c0392b' : '#2a2a30', 8); L.cil(0, 0, 0, 0.04, h - 0.05, C.metO, 6); L.cil(0, 0, 0, 0.18, 0.03, C.metO, 8); },
      camara() { for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; L.caja(Math.cos(a) * 0.15, 0.6, Math.sin(a) * 0.15, 0.03, 1.2, 0.03, C.neg, 0, -a, 0.2); } L.cajaB(0, 1.15, 0, 0.26, 0.2, 0.34, '#2a2a30'); L.cilC(0, 1.25, 0.24, 0.08, 0.16, '#1a1a1e', 8, Math.PI / 2); Lb.cajaB(0.08, 1.33, -0.05, 0.03, 0.03, 0.03, '#ff2020'); },
      aro_luz() { L.cajaB(0, 0, 0, 0.04, 1.3, 0.04, C.neg); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; Lb.caja(Math.cos(a) * 0.3, 1.55 + Math.sin(a) * 0.3, 0, 0.07, 0.17, 0.05, '#fffaf0', 0, 0, a); } halo(0, 1.55, 0.1, 1.4, 0xfff4e0, true); },
      sofa(p) { sofa(p.w, p.c); bloquear(p.x, p.z, p.w, 0.9, p.r); },
      fogata(p) {
        for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; L.esfera(Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55, 0.13, k % 2 ? '#8a8680' : '#6f6b66', 0, 1.2, 0.7, 1); }
        L.cilC(0, 0.1, 0, 0.07, 0.8, '#5a3a22', 6, 0, 0.5, Math.PI / 2); L.cilC(0, 0.12, 0, 0.07, 0.8, '#4a2e1a', 6, 0, -0.6, Math.PI / 2);
        Lb.cil(0, 0.02, 0, 0.32, 0.05, '#ff6a1a', 8);
        const f = fuego(p.x, 0.1, p.z, 1.5, p.azul ? 'azul' : null); destino.add(f.g); animados.push({ fuego: f });
        luces.push({ x: p.x, y: 1.2, z: p.z, color: p.azul ? 0x4a8aff : 0xff8a3a, i: 32, d: 12, parpadeo: true });
        charco(0, 0, 6, p.azul ? 0x4a8aff : 0xff8a3a);
        bloquearCirculo(p.x, p.z, 0.9);
      },
      tronco() { L.cilC(0, 0.2, 0, 0.2, 1.7, '#6b4426', 7, 0, 0, Math.PI / 2); for (const s of [-1, 1]) L.cilC(s * 0.85, 0.2, 0, 0.17, 0.02, '#c8925a', 7, 0, 0, Math.PI / 2); },
      tienda(p) {
        const c = p.c, h = 1.3;
        L.caja(-0.5, 0.62, 0, 0.06, 1.42, 2.2, c, 0, 0, -0.72); L.caja(0.5, 0.62, 0, 0.06, 1.42, 2.2, c, 0, 0, 0.72);
        L.cajaB(0, h - 0.17, 0, 0.12, 0.08, 2.32, tono(c, 0.7)); L.cajaB(0, 0.01, 0, 1.7, 0.03, 2.1, tono(c, 0.55));
        L.caja(0, 0.45, -1.08, 0.9, 0.9, 0.04, tono(c, 0.85)); L.caja(-0.32, 0.3, 1.1, 0.5, 0.6, 0.03, tono(c, 0.8), 0, 0.5, 0.4);
        for (const s of [-1, 1]) for (const z of [-1.15, 1.15]) L.cajaB(s * 0.95, 0, z, 0.04, 0.14, 0.04, '#d8d0c0');
        Ll.cajaB(0, h - 0.5, 0.6, 0.12, 0.16, 0.12, '#ffd88a'); halo(0, h - 0.45, 0.6, 0.9, 0xffc070);
        bloquear(p.x, p.z, 1.9, 2.3, p.r);
      },
      tocon(p) { L.cil(0, 0, 0, 0.36, 0.45, '#6b4426', 7); L.cil(0, 0.45, 0, 0.32, 0.02, '#c8925a', 7); if (!p.sinHacha) { L.caja(0.12, 0.62, 0, 0.04, 0.4, 0.04, '#5a3e26', 0, 0, -0.4); L.cajaB(0.02, 0.42, 0, 0.18, 0.12, 0.04, '#9aa0a8'); L.cilC(-0.45, 0.1, 0.2, 0.09, 0.3, '#c8925a', 6, 0, 0.5, Math.PI / 2); } bloquear(p.x, p.z, 0.7, 0.7, 0); },
      lena(p) { for (let f = 0; f < 3; f++) for (let k = 0; k < 4 - f; k++) L.cilC(-0.36 + k * 0.24 + f * 0.12, 0.1 + f * 0.19, 0, 0.1, 0.9, k % 2 ? '#7a4e2a' : '#6b4426', 6, Math.PI / 2); bloquear(p.x, p.z, 1.1, 0.7, p.r); },
      mochila() { L.cajaB(0, 0, 0, 0.4, 0.5, 0.25, '#5a6a3a'); L.cajaB(0, 0.1, 0.13, 0.3, 0.2, 0.06, '#4a5a2a'); L.cil(0, 0.5, -0.05, 0.08, 0.35, '#8a3a2a', 6, 0, Math.PI / 2); },
      caja_madera(p) { L.cajaB(0, 0, 0, 0.7, 0.6, 0.7, C.madC); for (const y of [0.15, 0.45]) L.cajaB(0, y, 0.352, 0.7, 0.06, 0.01, C.madO); bloquear(p.x, p.z, 0.7, 0.7, 0); },
      farol_poste(p) { L.cajaB(0, 0, 0, 0.1, 1.6, 0.1, '#5a3a22'); L.cajaB(0.15, 1.55, 0, 0.36, 0.06, 0.06, '#5a3a22'); L.cajaB(0.3, 1.2, 0, 0.18, 0.04, 0.18, C.metO); Ll.cajaB(0.3, 1.24, 0, 0.13, 0.22, 0.13, '#ffd27a'); L.cajaB(0.3, 1.46, 0, 0.18, 0.05, 0.18, C.metO); halo(0.3, 1.35, 0, 1.0, 0xffc070); charco(0.3, 0, 2.6, 0xffb060); bloquear(p.x, p.z, 0.3, 0.3, 0); },
      canoa(p) { L.cajaB(0, 0, 0, 0.7, 0.32, 2.4, '#b8562a'); L.cajaB(0, 0.08, 0, 0.56, 0.25, 2.2, '#7a3a1e'); L.caja(0.6, 0.1, 0.3, 0.06, 0.06, 1.6, '#c8925a', 0, 0.3); bloquear(p.x, p.z, 0.8, 2.6, p.r); },
      olla() { L.cil(0, 0.12, 0, 0.18, 0.2, '#2a2a2e', 8); L.cil(0, 0.31, 0, 0.16, 0.02, '#c86a3a', 8); for (const s of [-1, 1]) L.caja(s * 0.25, 0.4, 0, 0.03, 0.8, 0.03, '#5a3a22', 0, 0, s * 0.4); L.cajaB(0, 0.76, 0, 0.62, 0.03, 0.03, '#5a3a22'); },
      hongos(p) { for (let k = 0; k < 3; k++) { const x = (hash(k, p.x) - 0.5) * 0.5, z = (hash(p.z, k) - 0.5) * 0.5, s = 0.6 + hash(k, k) * 0.6; L.cajaB(x, 0, z, 0.05 * s, 0.14 * s, 0.05 * s, '#f2ead8'); L.esfera(x, 0.15 * s, z, 0.09 * s, k % 2 ? '#d8402a' : '#e8a03a', 0, 1, 0.55, 1); } },
      fuente(p) {
        L.cil(0, 0, 0, 2.05, 0.45, '#b9b2a6', 16); L.cil(0, 0.45, 0, 2.12, 0.09, '#cfc8bc', 16);
        L.cil(0, 0.1, 0, 0.42, 1.3, '#b9b2a6', 8); L.cil(0, 1.25, 0, 0.86, 0.16, '#c2bbb0', 12); L.cil(0, 1.4, 0, 0.2, 0.5, '#b9b2a6', 8); L.esfera(0, 1.98, 0, 0.2, '#cfc8bc', 1);
        const rip2 = texDinamica(32, 32, (x, t) => { x.fillStyle = '#4fb8e0'; x.fillRect(0, 0, 32, 32); x.strokeStyle = 'rgba(255,255,255,0.45)'; for (let k = 0; k < 3; k++) { const r = ((t / 60 + k * 10) % 30) / 2; x.beginPath(); x.arc(16, 16, r, 0, 7); x.stroke(); } }, 120, false);
        const agua = new THREE.MeshLambertMaterial({ map: rip2.t });
        const a1 = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.04, 20), agua); a1.position.set(p.x, 0.4, p.z); a1.receiveShadow = true; raiz.add(a1);
        const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.04, 14), agua); a2.position.set(p.x, 1.4, p.z); raiz.add(a2);
        const chorros = [];
        const matCh = new THREE.MeshBasicMaterial({ color: 0xcff2ff, transparent: true, opacity: 0.8, depthWrite: false });
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * Math.PI * 2;
          const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), matCh);
          c.position.set(p.x + Math.cos(a) * 0.8, 0.9, p.z + Math.sin(a) * 0.8); raiz.add(c); chorros.push(c);
        }
        const top = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 6), matCh); top.position.set(p.x, 2.35, p.z); raiz.add(top);
        animados.push({ act: (t) => { top.scale.y = 1 + Math.sin(t / 160) * 0.18; chorros.forEach((c, k) => { c.scale.y = 0.9 + Math.sin(t / 130 + k) * 0.08; }); } });
        luces.push({ x: p.x, y: 3.4, z: p.z, color: 0xffe2b0, i: 30, d: 15 });
        bloquearCirculo(p.x, p.z, 2.2);
      },
      banca(p) {
        for (let k = 0; k < 3; k++) L.cajaB(0, 0.38, -0.15 + k * 0.15, 1.8, 0.05, 0.12, C.madC);
        for (let k = 0; k < 2; k++) L.cajaB(0, 0.55 + k * 0.17, -0.28, 1.8, 0.1, 0.04, C.madC);
        for (const s of [-1, 1]) { L.cajaB(s * 0.75, 0, 0, 0.07, 0.38, 0.46, '#2e3a2e'); L.cajaB(s * 0.75, 0.38, -0.27, 0.06, 0.48, 0.06, '#2e3a2e'); }
        bloquear(p.x, p.z, 1.8, 0.55, p.r);
      },
      pista_baile(p) {
        L.cajaB(0, 0, 0, p.w + 0.2, 0.05, p.d + 0.2, '#2a2a30');
        plan('pista', matTex(TX.pista.t, true)).agregar(0, 0.056, 0, p.w, p.d, null, 0, -Math.PI / 2);
        elevar(p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2, 0.06);
        L.cajaB(-p.w / 2 - 0.05, 0, -p.d / 2 - 0.05, 0.08, 3.2, 0.08, C.metO);
        L.cajaB(-p.w / 4, 3.15, -p.d / 2 - 0.05, p.w / 2, 0.06, 0.06, C.metO);
        const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshLambertMaterial({ color: 0xdfe6ee, emissive: 0x334455, flatShading: true }));
        bola.position.set(p.x, 2.75, p.z - p.d / 2 - 0.05); raiz.add(bola);
        L.cajaB(0, 2.95, -p.d / 2 - 0.05, 0.02, 0.22, 0.02, '#aaa');
        animados.push({ act: (t) => { bola.rotation.y = t / 900; } });
        halo(0, 0.4, 0, 3.5, 0xc060ff, true);
      },
      mesa_ajedrez(p) {
        L.cil(0, 0, 0, 0.08, 0.7, C.pieO, 6); L.cajaB(0, 0.68, 0, 0.72, 0.05, 0.72, '#d8d0c0');
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) L.cajaB(-0.27 + i * 0.108, 0.731, -0.27 + j * 0.108, 0.108, 0.005, 0.108, '#3a3a40');
        for (let k = 0; k < 6; k++) { L.cil(-0.25 + k * 0.1, 0.73, -0.22, 0.03, 0.08 + (k === 2 ? 0.05 : 0), '#f4f0e6', 6); L.cil(-0.25 + k * 0.1, 0.73, 0.22, 0.03, 0.08 + (k === 3 ? 0.05 : 0), '#2a2a30', 6); }
        for (const s of [-1, 1]) L.cil(s * 0.75, 0, 0, 0.2, 0.4, C.pie, 8);
        bloquear(p.x, p.z, 0.75, 0.75, 0);
      },
      carrito_helados(p) {
        L.cajaB(0, 0.25, 0, 1.4, 0.7, 0.75, '#f6d6e0'); L.cajaB(0, 0.55, 0.376, 1.4, 0.12, 0.01, '#e86a9a');
        for (const s of [-1, 1]) L.cilC(s * 0.5, 0.22, 0.38, 0.2, 0.06, '#3a3a3e', 8, 0, 0, Math.PI / 2);
        L.cajaB(0, 0.95, 0, 1.4, 0.06, 0.75, '#ffffff');
        for (let k = 0; k < 4; k++) L.cil(-0.5 + k * 0.33, 0.98, 0, 0.12, 0.08, ['#ff9ec4', '#fff4d6', '#8a5a3a', '#9ae0b0'][k], 8);
        L.cajaB(0.55, 0.95, -0.25, 0.04, 1.3, 0.04, '#e0e0e0');
        L.cono(0.55, 2.1, -0.25, 0.8, 0.45, '#ff8ab0', 8); L.cono(0.55, 2.12, -0.25, 0.5, 0.42, '#ffffff', 8);
        bloquear(p.x, p.z, 1.5, 0.85, p.r);
      },
      tablon(p) { for (const s of [-1, 1]) L.cajaB(s * 0.6, 0, 0, 0.08, 1.6, 0.08, C.madO); L.cajaB(0, 0.75, 0, 1.3, 0.8, 0.06, '#b8895a'); L.cajaB(0, 1.55, 0, 1.45, 0.08, 0.14, C.madO); for (let k = 0; k < 6; k++) L.cajaB(-0.45 + (k % 3) * 0.42, 0.85 + Math.floor(k / 3) * 0.33, 0.035, 0.28, 0.24, 0.01, ['#fff6a8', '#ffffff', '#ffd0d0', '#d0f0ff'][k % 4]); bloquear(p.x, p.z, 1.3, 0.3, p.r); },
      ovillo() { L.esfera(0, 0.13, 0, 0.14, '#e04a5a', 1); L.cajaB(0.25, 0.005, 0.1, 0.4, 0.01, 0.015, '#e04a5a', 0.5); },
      farola(p) { L.cil(0, 0, 0, 0.12, 0.15, '#2e3a2e', 6); L.cil(0, 0.15, 0, 0.055, 2.3, '#2e3a2e', 6); L.cajaB(0, 2.42, 0, 0.32, 0.06, 0.32, '#2e3a2e'); Ll.cajaB(0, 2.48, 0, 0.24, 0.34, 0.24, '#ffe9a8'); L.cono(0, 2.82, 0, 0.24, 0.22, '#2e3a2e', 4); halo(0, 2.66, 0, 1.6, 0xffd890); charco(0, 0, 4.2, 0xffc878); bloquear(p.x, p.z, 0.35, 0.35, 0); },
      maceta(p) { L.cajaB(0, 0, 0, 0.7, 0.45, 0.7, '#b8784a'); L.cajaB(0, 0.43, 0, 0.74, 0.05, 0.74, '#a06a3e'); L.esfera(0, 0.95, 0, 0.42, '#4f9a3f', 0); L.esfera(0.15, 1.2, 0.1, 0.25, '#5aa84a', 0); L.cajaB(0, 0.45, 0, 0.08, 0.3, 0.08, '#6b4426'); bloquear(p.x, p.z, 0.7, 0.7, 0); },
      guirnaldas(p) {
        const pts = p.pts;
        for (let k = 0; k < pts.length; k++) {
          const [ax, az] = pts[k], [bx, bz] = pts[(k + 1) % pts.length];
          for (let u = 0; u <= 1.0001; u += 1 / 9) {
            const x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = 2.6 - Math.sin(u * Math.PI) * 0.55;
            const c = ['#ffd24a', '#ff6a6a', '#6ad0ff', '#9aff6a', '#ff9ae0'][Math.floor(u * 9 + k) % 5];
            Ll.esfera(x - p.x, y, z - p.z, 0.06, c, 0);
            if (Math.round(u * 9) % 2 === 0) halos.push({ x, y, z, s: 0.5, c: new THREE.Color(c).getHex() });
          }
          const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
          for (let s = 0; s < 6; s++) { const u = (s + 0.5) / 6; L.caja(ax + (bx - ax) * u - p.x, 2.6 - Math.sin(u * Math.PI) * 0.55 + 0.04, az + (bz - az) * u - p.z, 0.012, 0.012, len / 6 + 0.05, '#3a3a3a', ang); }
        }
      },
      kiosko(p) {
        L.cajaB(0, 0, 0, 1.5, 1.0, 1.1, '#2f6a4a'); L.cajaB(0, 1.0, 0.1, 1.5, 0.05, 1.3, '#e8e0d0');
        for (let k = 0; k < 5; k++) L.cajaB(-0.6 + k * 0.3, 1.05, 0.45, 0.24, 0.3, 0.02, ['#d64541', '#4a8ae0', '#f2c230', '#5aa046', '#e0e0e0'][k]);
        L.cajaB(0, 1.6, 0, 1.7, 0.08, 1.4, '#c0392b'); for (const s of [-1, 1]) L.cajaB(s * 0.7, 1.0, 0.6, 0.06, 0.6, 0.06, '#e8e0d0');
        const t = texto(64, 16, (x) => { x.fillStyle = '#c0392b'; x.fillRect(0, 0, 64, 16); x.fillStyle = '#fff6dd'; x.font = `9px ${FUENTE}`; x.textAlign = 'center'; x.fillText('DIARIO', 32, 12); });
        plan('kiosko', matTex(t.t, false)).agregar(0, 1.64, 0.705, 1.0, 0.24);
        bloquear(p.x, p.z, 1.5, 1.1, p.r);
      },
      bicicletas(p) {
        L.cajaB(0, 0, 0, 0.06, 0.5, 2.0, C.metO);
        for (let k = 0; k < 3; k++) {
          const z = -0.7 + k * 0.7, c = ['#d64541', '#4a8ae0', '#f2c230'][k];
          for (const dx of [-0.38, 0.38]) L.cilC(dx, 0.3, z, 0.28, 0.03, '#1e1e22', 10, 0, 0, Math.PI / 2);
          L.caja(0, 0.42, z, 0.68, 0.05, 0.05, c, 0, 0, 0.25); L.cajaB(0.2, 0.55, z, 0.06, 0.12, 0.2, '#2a2a2e');
        }
        bloquear(p.x, p.z, 0.9, 2.1, p.r);
      },
      encimera(p) {
        L.cajaB(0, 0, 0, p.w, 0.88, 0.62, '#e8e0d0'); L.cajaB(0, 0.88, 0, p.w, 0.05, 0.66, '#5a5a62');
        for (let k = 0; k < p.w / 0.7; k++) L.cajaB(-p.w / 2 + 0.35 + k * 0.7, 0.1, 0.312, 0.6, 0.66, 0.01, '#d8cfbe');
        L.cajaB(-2, 0.9, 0, 0.6, 0.05, 0.4, '#a8b0b8');
        for (let k = 0; k < 7; k++) { L.cajaB(-p.w / 2 + 1 + k * 1.6, 1.12, -0.18, 0.12, 0.25, 0.04, '#9aa0a8'); L.cil(-p.w / 2 + 1.5 + k * 1.6, 0.93, 0.05, 0.12, 0.18, ['#c0392b', '#a8b0b8', '#2a2a30'][k % 3], 8); }
        bloquear(p.x, p.z, p.w, 0.7, p.r);
      },
      nevera(p) { L.cajaB(0, 0, 0, 0.8, 1.5, 0.68, '#e8ecf0'); L.cajaB(0, 0.95, 0.342, 0.78, 0.02, 0.01, '#a8b0b8'); L.cajaB(0.3, 0.5, 0.35, 0.04, 0.35, 0.03, '#9aa0a8'); L.cajaB(0.3, 1.05, 0.35, 0.04, 0.3, 0.03, '#9aa0a8'); bloquear(p.x, p.z, 0.8, 0.7, p.r); },
      horno_pizza(p) { L.cajaB(0, 0, 0, 1.3, 0.75, 1.0, '#9a5a3a'); L.esfera(0, 0.75, 0, 0.62, '#b8623a', 0, 1, 0.75, 0.9); Lb.cajaB(0, 0.78, 0.46, 0.5, 0.3, 0.02, '#ff7a1a'); L.cajaB(0, 0.75, 0.47, 0.6, 0.06, 0.03, '#5a3020'); L.cil(0.35, 1.0, -0.25, 0.1, 0.7, '#6a4a3a', 6); halo(0, 0.9, 0.6, 1.2, 0xff8a2a, true); bloquear(p.x, p.z, 1.3, 1.1, p.r); },
      isla_cocina(p) {
        L.cajaB(0, 0, 0, p.w, 0.88, 0.95, '#d8cfbe'); L.cajaB(0, 0.88, 0, p.w + 0.05, 0.05, 1.0, '#e8e8ea');
        for (const x of [-2, 0, 2]) { L.cajaB(x, 0.93, -0.12, 0.72, 0.02, 0.55, '#1e1e22'); for (const [a, b] of [[-0.18, -0.12], [0.18, -0.12]]) Lb.cil(x + a, 0.94, b - 0.12, 0.1, 0.01, '#d23a1a', 8); L.cil(x - 0.18, 0.95, -0.24, 0.16, 0.18, x === 0 ? '#c0392b' : '#a8b0b8', 8); }
        bloquear(p.x, p.z, p.w, 1.0, p.r);
      },
      barra_te(p) {
        L.cajaB(0, 0, 0, p.w, 1.0, 0.72, '#7a4a2a'); L.cajaB(0, 1.0, 0, p.w + 0.1, 0.05, 0.8, '#a8703a');
        for (let k = 0; k < 4; k++) { L.cil(-p.w / 2 + 0.6 + k * 1.2, 1.05, 0.15, 0.12, 0.18, ['#3a7a5a', '#c0392b', '#e8e0d0', '#2a5a8a'][k], 8); L.cajaB(-p.w / 2 + 0.6 + k * 1.2 + 0.12, 1.12, 0.15, 0.08, 0.04, 0.03, '#3a2a1e'); }
        L.cajaB(1.6, 1.05, -0.2, 0.5, 0.45, 0.35, '#2a2a30'); Lb.cajaB(1.6, 1.35, -0.02, 0.2, 0.06, 0.01, '#3aff9a');
        for (let k = 0; k < 6; k++) L.cajaB(-p.w / 2 + 0.3 + k * 0.8, 0.1, 0.362, 0.6, 0.8, 0.01, '#6a3e22');
        bloquear(p.x, p.z, p.w, 0.8, p.r);
      },
      mesa(p) {
        L.cajaB(0, 0.72, 0, 1.1, 0.05, 1.1, C.mad); L.cajaB(0, 0.77, 0, 1.12, 0.01, 1.12, p.mantel || '#ffffff');
        for (let i = 0; i < 4; i++) L.cajaB(-0.42 + i * 0.28, 0.781, 0, 0.14, 0.003, 1.12, '#ffffff');
        L.cil(0, 0, 0, 0.07, 0.72, C.madO, 6); L.cil(0, 0, 0, 0.3, 0.04, C.madO, 8);
        for (const [x, z] of [[0, -0.32], [0, 0.32], [-0.32, 0], [0.32, 0]]) { L.cil(x, 0.785, z, 0.16, 0.02, '#f4f4f4', 10); L.esfera(x, 0.82, z, 0.07, ['#e8b84a', '#c0392b', '#7fbf4a', '#d8a05a'][Math.floor(hash(p.x + x, p.z + z) * 4)], 0, 1, 0.5, 1); }
        L.cil(0, 0.785, 0, 0.04, 0.12, '#f4f0e6', 6); Ll.cil(0, 0.9, 0, 0.025, 0.05, '#ffd27a', 4);
        bloquear(p.x, p.z, 1.1, 1.1, 0);
      },
      lampara_colgante() { L.cajaB(0, 1.9, 0, 0.012, 1.3, 0.012, '#2a2a2a'); L.cono(0, 1.62, 0, 0.32, 0.3, '#2f5a3a', 8); Ll.cil(0, 1.56, 0, 0.18, 0.06, '#ffe2a0', 8); halo(0, 1.5, 0, 1.2, 0xffd890); charco(0, 0, 2.2, 0xffd08a); },
      plato_gato() { L.cil(0, 0, 0, 0.18, 0.07, '#4a8ae0', 10); L.cil(0, 0.06, 0, 0.14, 0.02, '#a86a3a', 10); L.cil(0.4, 0, 0, 0.16, 0.06, '#e04a5a', 10); L.cil(0.4, 0.05, 0, 0.13, 0.01, '#9fd8ff', 10); },
      pizarra_menu() {
        const t = texto(64, 80, (x) => {
          x.fillStyle = '#26322c'; x.fillRect(0, 0, 64, 80); x.strokeStyle = '#a8703a'; x.lineWidth = 4; x.strokeRect(2, 2, 60, 76);
          x.fillStyle = '#f4f0e6'; x.font = `bold 9px ${FUENTE}`; x.textAlign = 'center'; x.fillText('MENU', 32, 14);
          x.font = '6px "Pixelify Sans", monospace'; x.textAlign = 'left';
          ['Pizza de Bruno', 'Ramen de Qwen', 'Papas de Sam', 'Lembas élficas', 'Té de Jane', 'Thirium azul', 'Café x7 azúcar', 'Pescado crudo*'].forEach((l, k) => x.fillText('· ' + l, 6, 26 + k * 7));
          x.font = '5px "Pixelify Sans", monospace'; x.fillText('*solo para Gollum', 10, 76);
        });
        L.cajaB(0, 0.6, 0.025, 0.9, 1.0, 0.05, '#5a3a22');
        plan('menu', matTex(t.t, false)).agregar(0, 1.1, 0.052, 0.8, 0.95);
      },
      neon_pizza() {
        const t = texto(96, 32, (x) => { x.clearRect(0, 0, 96, 32); x.font = `bold 20px ${FUENTE}`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = '#ff6a2a'; x.strokeText('PIZZA', 48, 24); x.fillStyle = '#ffe0a0'; x.fillText('PIZZA', 48, 24); });
        L.cajaB(-0.9, 0, 0, 0.05, 0.4, 0.05, C.metO); L.cajaB(0.9, 0, 0, 0.05, 0.4, 0.05, C.metO);
        plan('neonpizza', matTex(t.t, true, { transparent: true, alphaTest: 0.1 })).agregar(0, 0.55, 0.0, 2.2, 0.72);
        halo(0, 0.55, 0.2, 2.6, 0xff7a2a, true);
      },
      botellero() { L.cajaB(0, 0.2, 0.17, 1.0, 1.1, 0.32, '#5a3a22'); for (let f = 0; f < 4; f++) for (let k = 0; k < 5; k++) L.cilC(-0.38 + k * 0.19, 0.38 + f * 0.24, 0.2, 0.05, 0.3, ['#3a5a2a', '#6a1a2a', '#2a3a5a'][(f + k) % 3], 6, Math.PI / 2); },
      muelle(p) {
        for (let k = 0; k < p.d / 0.3; k++) L.cajaB(0, 0.16, -p.d / 2 + 0.15 + k * 0.3, p.w, 0.06, 0.26, k % 2 ? '#a87445' : '#9a6a3e');
        for (const s of [-1, 1]) for (const z of [-p.d / 2 + 0.2, 0, p.d / 2 - 0.2]) L.cajaB(s * (p.w / 2 - 0.05), -0.2, z, 0.1, 0.48, 0.1, '#6e4a2c');
        Ll.cajaB(p.w / 2 - 0.05, 0.28, -p.d / 2 + 0.2, 0.08, 0.12, 0.08, '#ffd88a'); halo(p.w / 2 - 0.05, 0.36, -p.d / 2 + 0.2, 0.8, 0xffc070);
        const a = rad(p.r || 0);
        const dx = Math.abs(Math.sin(a)) * p.d / 2 + Math.abs(Math.cos(a)) * p.w / 2, dz = Math.abs(Math.cos(a)) * p.d / 2 + Math.abs(Math.sin(a)) * p.w / 2;
        elevar(p.x - dx, p.z - dz, p.x + dx, p.z + dz, 0.2);
      },
      nenufares(p) { if (p.brillo) for (let k = 0; k < 3; k++) { const x = (hash(k, p.z) - 0.5) * 1.0, z = (hash(p.x, k) - 0.5) * 1.0; Lb.esfera(x, 0.12, z, 0.08, k % 2 ? '#ff8ae8' : '#7ff0ff', 0); halo(x, 0.2, z, 0.9, k % 2 ? 0xff8ae8 : 0x7ff0ff, true); } for (let k = 0; k < 4; k++) { const x = (hash(k, p.x) - 0.5) * 1.2, z = (hash(p.z, k) - 0.5) * 1.2; L.cil(x, 0.075, z, 0.16 + hash(k, k) * 0.08, 0.01, '#3f9a3a', 7); if (k === 1) L.esfera(x, 0.11, z, 0.06, '#ffb0d0', 0); } },
      koi(p) {
        const peces = [];
        for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.3), new THREE.MeshLambertMaterial({ color: [0xff7a2a, 0xffffff, 0xe84a2a, 0xffd24a][k] })); raiz.add(m); peces.push({ m, r: 0.8 + k * 0.45, v: 0.3 + hash(k, 5) * 0.3, f: k * 1.7 }); }
        animados.push({ act: (t) => peces.forEach((pz) => { const a = t / 1000 * pz.v + pz.f; pz.m.position.set(p.x + Math.cos(a) * pz.r, 0.06, p.z + Math.sin(a) * pz.r * 0.8); pz.m.rotation.y = -a; }) });
      },
      puente_rojo(p) {
        for (let k = 0; k < 7; k++) { const u = k / 6 - 0.5, y = 0.32 - u * u * 0.9; L.cajaB(0, y, u * 2.4, 1.1, 0.06, 0.36, '#a8703a'); }
        for (const s of [-1, 1]) { for (let k = 0; k < 5; k++) { const u = k / 4 - 0.5; L.cajaB(s * 0.5, 0.3 - u * u * 0.9, u * 2.3, 0.06, 0.45, 0.06, '#c0262d'); } L.caja(s * 0.5, 0.62, 0, 0.06, 0.06, 2.4, '#c0262d'); }
      },
      deck(p) { L.cajaB(0, 0, 0, p.w, 0.14, p.d, '#b98352'); for (let k = 0; k < p.w / 0.35; k++) L.cajaB(-p.w / 2 + 0.17 + k * 0.35, 0.14, 0, 0.02, 0.005, p.d, '#9a6a3e'); elevar(p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2, 0.14); },
      cojin(p) { L.cil(0, 0, 0, 0.3, 0.1, ['#8a4ae0', '#e08a3a', '#3ab0a0'][Math.floor(hash(p.x, p.z) * 3)], 8); },
      hamaca(p) {
        for (const s of [-1, 1]) { L.cajaB(0, 0, s * 1.3, 0.12, 1.25, 0.12, '#6e4a2c'); L.caja(0, 1.0, s * 1.05, 0.03, 0.03, 0.5, '#d8c8a0', s * 0.6); }
        const c = ['#e04a5a', '#3ab0e0', '#f2c230'][Math.floor(hash(p.x, p.z) * 3)];
        L.caja(0, 0.62, -0.6, 0.75, 0.04, 0.7, c, 0.18); L.caja(0, 0.56, 0, 0.78, 0.04, 0.6, c); L.caja(0, 0.62, 0.6, 0.75, 0.04, 0.7, c, -0.18);
        for (let k = 0; k < 3; k++) L.cajaB(-0.3 + k * 0.3, 0.58, 0, 0.04, 0.005, 1.6, '#ffffff');
        bloquear(p.x, p.z, 0.8, 2.8, p.r);
      },
      flores(p) {
        L.cajaB(0, 0, 0, p.w, 0.2, p.d, '#6a4a30'); L.cajaB(0, 0.2, 0, p.w - 0.1, 0.02, p.d - 0.1, '#4a3020');
        for (let k = 0; k < p.w * p.d * 9; k++) { const x = (hash(k, 1 + p.x) - 0.5) * (p.w - 0.2), z = (hash(1 + p.z, k) - 0.5) * (p.d - 0.2); L.cajaB(x, 0.2, z, 0.02, 0.15, 0.02, '#3a8a35'); L.esfera(x, 0.37, z, 0.06, ['#ff5a7a', '#ffd23a', '#ffffff', '#c86aff', '#ff8a3a'][k % 5], 0); }
        bloquear(p.x, p.z, p.w, p.d, p.r);
      },
      torii(p) {
        const r = '#c0262d', o = '#2a1e1a';
        for (const s of [-1, 1]) { L.cajaB(s * 1.1, 0, 0, 0.2, 2.5, 0.2, r); L.cajaB(s * 1.1, 0, 0, 0.26, 0.2, 0.26, o); }
        L.cajaB(0, 2.0, 0, 2.6, 0.16, 0.18, r); L.caja(0, 2.62, 0, 3.0, 0.16, 0.26, o); L.caja(0, 2.5, 0, 2.8, 0.1, 0.22, r);
        L.cajaB(0, 2.16, 0, 0.14, 0.34, 0.16, r);
        for (const s of [-1, 1]) { const q = local(s * 1.1, 0, 0); bloquear(q.x, q.z, 0.3, 0.3, 0); }
      },
      linterna_piedra(p) { L.cajaB(0, 0, 0, 0.5, 0.12, 0.5, C.pie); L.cajaB(0, 0.12, 0, 0.16, 0.55, 0.16, C.pie); L.cajaB(0, 0.67, 0, 0.42, 0.06, 0.42, C.pie); Ll.cajaB(0, 0.73, 0, 0.3, 0.28, 0.3, '#ffd88a'); L.cono(0, 1.01, 0, 0.42, 0.3, C.pieO, 4); L.esfera(0, 1.36, 0, 0.07, C.pie, 0); halo(0, 0.87, 0, 1.0, 0xffc878); charco(0, 0, 2.4, 0xffb868); bloquear(p.x, p.z, 0.5, 0.5, 0); },
      jardin_zen(p) { L.cajaB(0, 0, 0, p.w, 0.06, p.d, '#e8e0cc'); for (let k = 0; k < 6; k++) L.cajaB(0, 0.062, -p.d / 2 + 0.15 + k * (p.d - 0.3) / 5, p.w - 0.2, 0.004, 0.03, '#cfc6b0'); L.esfera(-0.6, 0.15, 0, 0.25, '#7a766e', 0, 1.2, 0.8, 1); L.esfera(0.7, 0.1, 0.2, 0.16, '#8a867e', 0); bloquear(p.x, p.z, p.w, p.d, p.r); },
      bambu(p) { for (let k = 0; k < 7; k++) { const x = (hash(k, p.x) - 0.5) * 0.7, z = (hash(p.z, k) - 0.5) * 0.7, h = 1.8 + hash(k, 3) * 1.4; L.cajaB(x, 0, z, 0.07, h, 0.07, k % 2 ? '#7fb84a' : '#6aa83a'); for (let n = 1; n < 4; n++) L.cajaB(x, h * n / 4, z, 0.09, 0.03, 0.09, '#5a8a2a'); L.caja(x + 0.12, h - 0.2, z, 0.28, 0.02, 0.08, '#5aa046', 0, k, 0.5); } bloquearCirculo(p.x, p.z, 0.5); },
      bonsai(p) { L.cajaB(0, 0, 0, 0.6, 0.18, 0.4, '#3a3a40'); L.caja(0, 0.34, 0, 0.06, 0.34, 0.06, '#6b4426', 0, 0, 0.4); L.caja(0.1, 0.5, 0, 0.3, 0.05, 0.05, '#6b4426'); L.esfera(0.2, 0.62, 0, 0.18, '#3f8a35', 0, 1.4, 0.7, 1); L.esfera(-0.12, 0.55, 0.05, 0.14, '#4f9a3f', 0, 1.3, 0.7, 1); bloquear(p.x, p.z, 0.6, 0.4, 0); },
      roca(p) { const s = p.s || 1; L.esfera(0, 0.3 * s, 0, 0.6 * s, '#8f8b84', 0, 1.2, 0.8, 1); L.esfera(0.35 * s, 0.15 * s, 0.2 * s, 0.3 * s, '#9a968e', 0); bloquear(p.x, p.z, 1.2 * s, 1.2 * s, 0); },
      piedras_paso() { for (let k = 0; k < 5; k++) L.cil(k * 0.55 - 1.1, 0, Math.sin(k) * 0.3, 0.22, 0.04, '#b8b2a6', 7); },
      tapete(p) { Lp.cajaB(p.x, 0, p.z, p.w, 0.025, p.d, '#3a4656'); Lp.cajaB(p.x, 0.025, p.z, p.w - 0.3, 0.004, p.d - 0.3, '#43516a'); },
      estructura_sacos(p) {
        const xs = p.xs.map((x) => x - p.x), x0 = Math.min(...xs) - 0.7, x1 = Math.max(...xs) + 0.7;
        for (const x of [x0, x1]) L.cajaB(x, 0, 0, 0.12, 2.15, 0.12, C.metO);
        L.cajaB((x0 + x1) / 2, 2.05, 0, x1 - x0 + 0.1, 0.1, 0.12, C.metO);
        const sacos = [];
        for (const x of xs) {
          L.cajaB(x, 1.75, 0, 0.02, 0.3, 0.02, '#888');
          const g = new THREE.Group(); g.position.set(p.x + x, 1.78, p.z);
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.95, 8), new THREE.MeshLambertMaterial({ color: x === xs[1] ? 0x2a2a30 : 0xc0262d }));
          m.position.y = -0.5; m.castShadow = true; g.add(m); raiz.add(g); sacos.push(g);
          bloquear(p.x + x, p.z, 0.5, 0.5, 0);
        }
        animados.push({ act: (t) => sacos.forEach((g, k) => { g.rotation.z = Math.sin(t / 260 + k * 2) * 0.12; g.rotation.x = Math.sin(t / 330 + k) * 0.06; }) });
      },
      banco_pesas(p) { L.cajaB(0, 0.36, 0, 0.42, 0.08, 1.2, '#2a2a30'); for (const z of [-0.45, 0.45]) L.cajaB(0, 0, z, 0.36, 0.36, 0.08, C.metO); for (const s of [-1, 1]) L.cajaB(s * 0.45, 0, -0.45, 0.06, 1.0, 0.06, C.metO); L.cajaB(0, 0.95, -0.45, 1.4, 0.04, 0.04, '#a8acb2'); for (const s of [-1, 1]) L.cilC(s * 0.62, 0.97, -0.45, 0.2, 0.06, '#1e1e22', 10, 0, 0, Math.PI / 2); bloquear(p.x, p.z, 0.6, 1.3, p.r); },
      cinta(p) { L.cajaB(0, 0, 0, 0.8, 0.14, 1.6, '#3a3a42'); L.cajaB(0, 0.14, 0, 0.6, 0.01, 1.4, '#1a1a1e'); for (const s of [-1, 1]) L.cajaB(s * 0.37, 0.14, 0.6, 0.05, 1.0, 0.05, '#5a5a62'); L.cajaB(0, 1.1, 0.62, 0.8, 0.22, 0.12, '#3a3a42'); Lb.cajaB(0, 1.15, 0.555, 0.4, 0.12, 0.01, '#3aff9a'); bloquear(p.x, p.z, 0.8, 1.6, p.r); },
      ring(p) {
        const w = p.w, d = p.d;
        L.cajaB(0, 0, 0, w, 0.25, d, '#2a3a6a'); L.cajaB(0, 0.25, 0, w - 0.2, 0.01, d - 0.2, '#e8e4dc'); L.cajaB(0, 0.26, 0, w - 0.9, 0.004, d - 0.9, '#d63a3a');
        for (const [sx, sz, c] of [[-1, -1, '#d63a3a'], [1, -1, '#3a6ad6'], [-1, 1, '#e8e8e8'], [1, 1, '#e8e8e8']]) L.cajaB(sx * (w / 2 - 0.08), 0.25, sz * (d / 2 - 0.08), 0.1, 0.9, 0.1, c);
        for (const y of [0.55, 0.78, 1.0]) for (const s of [-1, 1]) { L.cajaB(0, y, s * (d / 2 - 0.08), w - 0.16, 0.025, 0.025, '#f2f2f2'); L.cajaB(s * (w / 2 - 0.08), y, 0, 0.025, 0.025, d - 0.16, '#f2f2f2'); }
        elevar(p.x - w / 2, p.z - d / 2, p.x + w / 2, p.z + d / 2, 0.25);
      },
      roca_grande(p) { L.esfera(0, 0.75, 0, 1.15, '#8a7d6a', 0, 1.1, 0.95, 1); L.esfera(0.4, 0.35, 0.5, 0.5, '#7a6e5c', 0); L.esfera(-0.3, 1.5, 0.2, 0.3, '#9a8d7a', 0); bloquearCirculo(p.x, p.z, 1.25); },
      diana(p) { for (const s of [-1, 1]) L.caja(s * 0.3, 0.55, -0.15, 0.06, 1.2, 0.06, C.madO, 0.25); ['#f4f4f4', '#1e1e22', '#3a7ae0', '#e03a3a', '#f2d23a'].forEach((c, k) => L.cilC(0, 1.0, 0.02 + k * 0.012, 0.45 - k * 0.085, 0.04, c, 12, Math.PI / 2)); bloquear(p.x, p.z, 1.0, 0.5, p.r); },
      llantas(p) { for (let k = 0; k < 4; k++) L.cil((k % 2) * 0.7 - 0.35, k > 1 ? 0.22 : 0, (k % 2 ? 0.15 : -0.1), 0.34, 0.22, '#1e1e22', 10); bloquear(p.x, p.z, 1.3, 0.9, 0); },
      pesas_rack(p) { L.cajaB(0, 0, 0, 1.4, 0.06, 0.4, C.metO); for (const s of [-1, 1]) L.cajaB(s * 0.65, 0, 0, 0.06, 0.8, 0.06, C.metO); for (const y of [0.3, 0.65]) { L.cajaB(0, y, 0, 1.4, 0.04, 0.3, C.metO); for (let k = 0; k < 5; k++) L.cilC(-0.5 + k * 0.25, y + 0.1, 0, 0.07 + k * 0.01, 0.2, '#2a2a2e', 8, 0, 0, Math.PI / 2); } bloquear(p.x, p.z, 1.4, 0.45, p.r); },
      tele(p) {
        const w = p.w, h = w * 0.56;
        L.cajaB(0, 0, 0.12, w * 0.85, 0.45, 0.45, '#2a2a30'); L.cajaB(0.5, 0.45, 0.2, 0.42, 0.08, 0.3, '#f2f2f2'); Lb.cajaB(0.5, 0.48, 0.352, 0.08, 0.01, 0.01, '#3fa7ff');
        L.cajaB(0, 0.5, 0.02, w + 0.1, h + 0.1, 0.07, C.neg);
        plan('tele', matTex(TX.tele.t, true)).agregar(0, 0.5 + (h + 0.1) / 2, 0.06, w, h);
        luces.push({ x: p.x, y: 1.4, z: p.z + 1.6, color: 0x7a6aff, i: 16, d: 9 });
        halo(0, 0.5 + (h + 0.1) / 2, 0.3, 3.0, 0x6a6aff, true);
        bloquear(p.x, p.z, w, 0.6, p.r);
      },
      alfombra_loading(p) {
        const t = texto(128, 64, (x) => {
          x.fillStyle = '#26262c'; x.fillRect(0, 0, 128, 64); x.strokeStyle = '#4a4a54'; x.lineWidth = 3; x.strokeRect(3, 3, 122, 58);
          x.fillStyle = '#f4f4f4'; x.font = `bold 17px ${FUENTE}`; x.textAlign = 'center'; x.fillText('LOADING', 64, 40);
          x.fillStyle = '#ffd400'; x.beginPath(); x.moveTo(14, 18); x.arc(14, 18, 7, 0.6, Math.PI * 2 - 0.6); x.fill();
          ['#ff4040', '#ffb8ff', '#40e0ff', '#ffb840'].forEach((c, k) => { x.fillStyle = c; x.fillRect(28 + k * 12, 12, 9, 10); x.fillStyle = '#fff'; x.fillRect(30 + k * 12, 15, 2, 2); x.fillRect(34 + k * 12, 15, 2, 2); });
          for (let k = 0; k < 8; k++) { x.fillStyle = '#ffe9b0'; x.fillRect(80 + k * 5, 17, 2, 2); }
        });
        plan('loading', matTex(t.t, false)).agregar(0, 0.018, 0, p.w, p.d, null, 0, -Math.PI / 2);
      },
      puf(p) { L.esfera(0, 0.2, 0, 0.42, p.c, 1, 1, 0.55, 1); },
      arcade(p) {
        L.cajaB(0, 0, 0, 0.78, 1.75, 0.75, C.neg); L.cajaB(0, 0, 0.385, 0.78, 1.75, 0.01, p.c);
        L.caja(0, 1.0, 0.3, 0.7, 0.1, 0.35, '#2a2a30', -0.35); for (let k = 0; k < 3; k++) Lb.cil(-0.15 + k * 0.12, 1.06, 0.38, 0.03, 0.03, ['#ff3a3a', '#3aff6a', '#3a8aff'][k], 6); L.cil(0.2, 1.05, 0.35, 0.02, 0.12, '#1a1a1a', 4);
        L.caja(0, 1.4, 0.36, 0.62, 0.5, 0.04, '#111', -0.15);
        const i = Math.floor(hash(p.x, 7) * 3);
        plan('arcade', matTex(TX.arcade.t, true)).agregar(0, 1.4, 0.385, 0.54, 0.42, [i / 3, 0, (i + 1) / 3, 1], 0, -0.15);
        Lb.cajaB(0, 1.6, 0.38, 0.7, 0.14, 0.02, p.c);
        halo(0, 1.4, 0.6, 1.2, new THREE.Color(p.c).getHex(), true);
        bloquear(p.x, p.z, 0.85, 0.85, p.r);
      },
      maquina_peluches(p) {
        L.cajaB(0, 0, 0, 0.9, 0.9, 0.9, '#e8473f'); L.cajaB(0, 0.9, 0, 0.9, 0.9, 0.9, '#cfe8ff'); L.cajaB(0, 1.8, 0, 0.94, 0.25, 0.94, '#e8473f');
        for (let k = 0; k < 6; k++) L.esfera((hash(k, 1) - 0.5) * 0.6, 1.0, (hash(1, k) - 0.5) * 0.6, 0.12, ['#ffd24a', '#7ae07a', '#7ab8ff', '#ff9ae0', '#ffffff', '#c08a5a'][k], 0);
        L.cajaB(0, 1.55, 0, 0.04, 0.25, 0.04, C.metO); L.cajaB(0, 1.5, 0, 0.16, 0.05, 0.16, '#d8dde4');
        Lb.cajaB(0, 1.85, 0.475, 0.7, 0.14, 0.01, '#ffe04a'); halo(0, 1.3, 0.6, 1.4, 0xffc0e0, true);
        bloquear(p.x, p.z, 0.95, 0.95, p.r);
      },
      pingpong(p) {
        L.cajaB(0, 0.72, 0, 2.4, 0.06, 1.3, '#2f7d4f'); L.cajaB(0, 0.781, 0, 0.02, 0.002, 1.3, '#ffffff'); L.cajaB(0, 0.781, 0, 2.4, 0.002, 0.02, '#ffffff');
        L.cajaB(0, 0.78, 0, 0.02, 0.15, 1.4, '#f4f4f4');
        for (const [x, z] of [[-1, -0.55], [1, -0.55], [-1, 0.55], [1, 0.55]]) L.cajaB(x, 0, z, 0.06, 0.72, 0.06, C.metO);
        const bola = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff6e0 }));
        raiz.add(bola);
        animados.push({ act: (t) => { const k = Math.sin(t / 380); bola.position.set(p.x + k * 1.0, 0.85 + Math.abs(Math.cos(t / 190)) * 0.25, p.z + Math.sin(t / 700) * 0.3); } });
        bloquear(p.x, p.z, 2.4, 1.3, p.r);
      },
      fantasmas() {
        L.esfera(0, 0.32, 0, 0.3, '#ffd400', 0, 1, 1, 0.8);
        ['#ff4040', '#ffb8ff', '#40e0ff'].forEach((c, k) => { const x = 0.7 + k * 0.5; L.cajaB(x, 0, 0, 0.32, 0.42, 0.3, c); L.esfera(x, 0.42, 0, 0.16, c, 0, 1, 0.8, 0.95); L.cajaB(x - 0.07, 0.36, 0.151, 0.08, 0.1, 0.01, '#fff'); L.cajaB(x + 0.07, 0.36, 0.151, 0.08, 0.1, 0.01, '#fff'); L.cajaB(x - 0.06, 0.35, 0.156, 0.04, 0.05, 0.01, '#1a3aff'); L.cajaB(x + 0.08, 0.35, 0.156, 0.04, 0.05, 0.01, '#1a3aff'); });
      },
      neon_gameon() {
        const t = texto(128, 40, (x) => { x.clearRect(0, 0, 128, 40); x.font = `bold 18px ${FUENTE}`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = '#ff3ad0'; x.strokeText('GAME ON', 64, 27); x.fillStyle = '#ffe6fb'; x.fillText('GAME ON', 64, 27); });
        plan('gameon', matTex(t.t, true, { transparent: true, alphaTest: 0.1 })).agregar(0, 0.8, 0.02, 1.9, 0.6);
        halo(0, 0.8, 0.25, 2.4, 0xff3ad0, true);
      },
      escenario(p) {
        L.cajaB(0, 0, 0, p.w, p.h, p.d, '#3a2a22'); L.cajaB(0, p.h - 0.02, 0, p.w + 0.05, 0.04, p.d + 0.05, '#5a3e2e');
        for (let k = 0; k < p.w / 0.5; k++) Lb.cajaB(-p.w / 2 + 0.25 + k * 0.5, p.h * 0.4, p.d / 2 + 0.006, 0.1, 0.06, 0.01, ['#ff3a8a', '#3a9aff', '#ffd23a'][k % 3]);
        elevar(p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2, p.h);
        luces.push({ x: p.x, y: 2.6, z: p.z + 1.4, color: 0xff4ab0, i: 24, d: 11, color2: 0x4a8aff });
      },
      telon(p) { L.cajaB(0, 0, 0, p.w, 2.0, 0.15, '#22202a'); for (let u = 0.3; u < p.w - 0.2; u += 0.4) for (let y = 0.5; y < 1.9; y += 0.4) L.cajaB(-p.w / 2 + u, y, 0.08, 0.32, 0.32, 0.04, (Math.floor(u * 2.5) + Math.floor(y * 2.5)) % 2 ? '#2e2a38' : '#26232f'); Lb.cajaB(0, 1.75, 0.11, p.w * 0.5, 0.05, 0.01, '#ff3a8a'); bloquear(p.x, p.z, p.w, 0.3, p.r); },
      truss(p) {
        const w = p.w;
        for (const s of [-1, 1]) { L.cajaB(s * w / 2, 0, -1.6, 0.12, 3.2, 0.12, '#3a3a40'); L.cajaB(s * w / 2, 0, 1.9, 0.12, 3.2, 0.12, '#3a3a40'); }
        for (const z of [-1.6, 1.9]) L.cajaB(0, 3.15, z, w + 0.12, 0.12, 0.12, '#3a3a40');
        for (let k = 0; k < 6; k++) {
          const x = -w / 2 + 0.8 + k * (w - 1.6) / 5, c = ['#ff3a8a', '#3a9aff', '#ffd23a', '#7aff6a', '#ff7a3a', '#c06aff'][k];
          L.cajaB(x, 2.85, 1.9, 0.2, 0.28, 0.24, '#1e1e22'); Lb.cajaB(x, 2.88, 2.03, 0.14, 0.14, 0.01, c); halo(x, 2.9, 2.2, 1.0, new THREE.Color(c).getHex());
        }
        for (const s of [-1, 1]) for (const z of [-1.6, 1.9]) { const q = local(s * w / 2, 0, z); bloquear(q.x, q.z, 0.3, 0.3, 0); }
      },
      bateria(p) {
        L.cilC(0, 0.28, 0.1, 0.3, 0.25, '#c0262d', 12, Math.PI / 2); L.cilC(0, 0.28, 0.23, 0.26, 0.01, '#f4f0e6', 12, Math.PI / 2);
        for (const [x, y, r] of [[-0.42, 0.5, 0.15], [0.42, 0.5, 0.15], [-0.2, 0.62, 0.12], [0.2, 0.62, 0.12]]) { L.cil(x, y, 0.15, r, 0.14, '#c0262d', 10); L.cil(x, y + 0.14, 0.15, r - 0.01, 0.01, '#f4f0e6', 10); L.cajaB(x, 0, 0.15, 0.03, y, 0.03, '#9aa0a8'); }
        for (const s of [-1, 1]) { L.cajaB(s * 0.62, 0, 0.0, 0.03, 0.95, 0.03, '#9aa0a8'); L.cil(s * 0.62, 0.95, 0, 0.24, 0.01, '#e0b84a', 12); }
        L.cil(0, 0, -0.62, 0.2, 0.42, '#2a2a30', 8);
        bloquear(p.x, p.z, 1.5, 1.0, p.r);
      },
      teclado_musical(p) { for (const s of [-1, 1]) L.caja(s * 0.35, 0.4, 0, 0.04, 0.85, 0.04, C.metO, 0, 0, s * 0.35); L.cajaB(0, 0.75, 0, 1.15, 0.08, 0.32, '#1e1e22'); L.cajaB(0, 0.83, 0.03, 1.05, 0.02, 0.18, '#f4f4f4'); for (let k = 0; k < 14; k++) if (k % 7 !== 2 && k % 7 !== 6) L.cajaB(-0.48 + k * 0.07, 0.85, -0.01, 0.035, 0.02, 0.1, '#1a1a1a'); bloquear(p.x, p.z, 1.1, 0.4, p.r); },
      microfono() { L.cil(0, 0, 0, 0.14, 0.03, '#2a2a30', 8); L.cajaB(0, 0, 0, 0.025, 1.35, 0.025, '#9aa0a8'); L.caja(0, 1.38, -0.1, 0.03, 0.03, 0.22, '#9aa0a8', 0.4); L.esfera(0, 1.42, -0.2, 0.05, '#3a3a3e', 1); },
      ampli(p) { L.cajaB(0, 0, 0, 0.6, 0.65, 0.42, '#1e1e22'); L.cajaB(0, 0.08, 0.212, 0.5, 0.45, 0.01, '#3a3530'); L.cajaB(0, 0.55, 0.214, 0.5, 0.06, 0.01, '#c8a24a'); bloquear(p.x, p.z, 0.6, 0.45, p.r); },
      bafles(p) { for (let k = 0; k < 3; k++) { L.cajaB(0, k * 0.62, 0, 0.7, 0.6, 0.55, '#1e1e22'); L.cilC(0, k * 0.62 + 0.3, 0.28, 0.2, 0.02, '#3a3a40', 10, Math.PI / 2); L.cilC(0, k * 0.62 + 0.3, 0.29, 0.08, 0.02, '#5a5a62', 8, Math.PI / 2); } bloquear(p.x, p.z, 0.7, 0.6, p.r); },
      foco_escenario(p) {
        L.cajaB(0, 0, 0, 0.06, 2.3, 0.06, C.metO); L.caja(0, 2.3, -0.1, 0.2, 0.2, 0.3, '#1e1e22', -0.6);
        const cono = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4ab0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        const g = new THREE.Group(); g.position.set(p.x, 2.25, p.z); g.rotation.y = rad(p.r || 0); cono.position.set(0, -1.0, -0.6); cono.rotation.x = 0.55; g.add(cono); raiz.add(g);
        animados.push({ act: (t, noche) => { cono.visible = noche > 0.3; cono.material.color.setHSL(((t / 4000) + p.x * 0.05) % 1, 0.9, 0.6); } });
        bloquear(p.x, p.z, 0.4, 0.4, 0);
      },
      parada_bus(p) {
        L.cajaB(0, 0, -0.45, 2.2, 0.06, 0.12, C.metO); for (const s of [-1, 1]) L.cajaB(s * 1.05, 0, -0.45, 0.07, 2.1, 0.07, C.metO);
        L.cajaB(0, 2.1, -0.1, 2.4, 0.08, 1.0, '#3a7a5a'); L.cajaB(0, 0.5, -0.47, 2.0, 1.3, 0.02, '#bfe8ff');
        L.cajaB(0, 0.42, -0.25, 1.6, 0.06, 0.32, C.madC); L.cajaB(0.9, 1.4, -0.42, 0.3, 0.5, 0.03, '#f2c230');
        Ll.cajaB(0, 2.03, -0.1, 1.8, 0.04, 0.2, '#fff4d0'); halo(0, 1.95, 0, 1.4, 0xfff0c0);
        bloquear(p.x, p.z, 2.2, 0.4, p.r);
      },
      buzon(p) { L.cajaB(0, 0, 0, 0.08, 0.8, 0.08, C.metO); L.cajaB(0, 0.8, 0, 0.36, 0.34, 0.5, '#2a5ab8'); L.cajaB(0, 1.14, 0, 0.38, 0.04, 0.52, '#2a4a98'); L.cajaB(0, 0.95, 0.251, 0.2, 0.03, 0.01, '#f2f2f2'); bloquear(p.x, p.z, 0.4, 0.4, 0); },
      hidrante(p) { L.cil(0, 0, 0, 0.13, 0.5, '#d63a2a', 8); L.cil(0, 0.5, 0, 0.1, 0.12, '#e8e8e8', 8); for (const s of [-1, 1]) L.cilC(s * 0.15, 0.33, 0, 0.05, 0.08, '#d63a2a', 6, 0, 0, Math.PI / 2); bloquear(p.x, p.z, 0.3, 0.3, 0); },
      basurero(p) { L.cil(0, 0, 0, 0.22, 0.6, '#3a6a4a', 8); L.cil(0, 0.6, 0, 0.24, 0.05, '#2a4a3a', 8); L.cajaB(0, 0.25, 0.21, 0.2, 0.08, 0.03, '#e8e8e8'); bloquear(p.x, p.z, 0.4, 0.4, 0); },
      senal(p) {
        L.cajaB(0, 0, 0, 0.06, 1.9, 0.06, '#9aa0a8');
        if (p.tipo === 'pare') { L.cilC(0, 1.85, 0.05, 0.26, 0.03, '#d63a2a', 8, Math.PI / 2); L.cajaB(0, 1.82, 0.07, 0.3, 0.06, 0.005, '#ffffff'); }
        else {
          const t = texto(96, 32, (x) => { x.fillStyle = '#2f6a4a'; x.fillRect(0, 0, 96, 32); x.strokeStyle = '#fff6dd'; x.lineWidth = 2; x.strokeRect(2, 2, 92, 28); x.fillStyle = '#fff6dd'; x.font = `9px ${FUENTE}`; x.textAlign = 'center'; x.fillText('PUEBLO', 48, 14); x.fillText('AGENTICO', 48, 25); });
          L.cajaB(0, 1.6, 0.03, 0.9, 0.34, 0.04, '#2f6a4a');
          plan('senal_pueblo', matTex(t.t, false)).agregar(0, 1.77, 0.052, 0.86, 0.3);
        }
        bloquear(p.x, p.z, 0.25, 0.25, 0);
      },
      mirador(p) {
        L.cajaB(0, 0, 0.45, 3.6, 0.08, 0.08, C.madO);
        for (let k = 0; k < 5; k++) L.cajaB(-1.6 + k * 0.8, 0, 0.45, 0.08, 0.9, 0.08, C.madO);
        L.cajaB(0, 0.86, 0.45, 3.7, 0.07, 0.1, C.madC);
        L.cajaB(1.2, 0, 0.0, 0.08, 1.0, 0.08, C.metO); L.caja(1.2, 1.12, 0.05, 0.16, 0.16, 0.36, '#3a3a42', -0.3); L.cilC(1.2, 1.15, 0.28, 0.06, 0.12, '#1e1e22', 8, Math.PI / 2 - 0.3);
        bloquear(p.x, p.z, 3.6, 0.3, p.r);
      },
      seto(p) { L.cajaB(0, 0, 0, p.w, 0.55, 0.62, '#4f8f3c', 0, 0.05); for (let k = 0; k < p.w / 0.5; k++) L.esfera(-p.w / 2 + 0.25 + k * 0.5, 0.55, (hash(k, p.x) - 0.5) * 0.2, 0.26, hash(k, p.z) > 0.5 ? '#5a9a45' : '#4a8a38', 0, 1, 0.55, 1.1); bloquear(p.x, p.z, p.w, 0.6, p.r); },
      cerca(p) { for (let u = -p.w / 2; u <= p.w / 2 + 0.01; u += 0.9) L.cajaB(u, 0, 0, 0.08, 0.55, 0.08, p.c ? tono(p.c, 0.9) : '#8a6038'); for (const y of [0.18, 0.42]) L.cajaB(0, y, 0, p.w, 0.06, 0.04, p.c || '#a87445'); },
      // ================= islas temáticas =================
      // --- Distrito Tecnológico ---
      torre_empresa(p) {
        const w = p.w, d = p.d, h = p.h, c = p.c, c2 = p.c2, hb = h - 1.3, yc = 0.5 + hb / 2, wb = w - 0.1, db = d - 0.1;
        L.cajaB(0, 0, 0, w, 0.5, d, tono(c, 0.78));
        L.cajaB(0, 0.5, 0, wb, hb, db, tono(c, 0.95));
        L.cajaB(0, h - 0.8, 0, w - 0.4, 0.8, d - 0.4, tono(c, 0.86));
        L.cajaB(0, h, 0, w * 0.42, 0.55, d * 0.42, tono(c, 0.7));
        L.cajaB(0.6, h + 0.55, 0.5, 0.08, 2.3, 0.08, '#8a8f98');
        Lb.esfera(0.6, h + 2.9, 0.5, 0.13, '#ff3030', 0); balizas.push(local(0.6, h + 2.9, 0.5));
        for (let y = 3.5; y < h - 1.6; y += 3.5) L.cajaB(0, y, 0, w + 0.04, 0.12, d + 0.04, c2);
        const F = fachada(p, hb);
        for (const [x, z, ry, an] of [[0, db / 2 + 0.012, 0, wb], [wb / 2 + 0.012, 0, Math.PI / 2, db], [0, -db / 2 - 0.012, Math.PI, wb], [-wb / 2 - 0.012, 0, -Math.PI / 2, db]]) {
          F.dia.agregar(x, yc, z, an, hb, [0, 0, 1, 1], ry);
          F.noche.agregar(x + Math.sin(ry) * 0.01, yc, z + Math.cos(ry) * 0.01, an, hb, [0, 0, 1, 1], ry);
        }
        const S = marca(p);
        for (const [x, z, ry, an] of [[0, (d - 0.4) / 2 + 0.015, 0, w - 0.7], [(w - 0.4) / 2 + 0.015, 0, Math.PI / 2, d - 0.7], [0, -(d - 0.4) / 2 - 0.015, Math.PI, w - 0.7], [-(w - 0.4) / 2 - 0.015, 0, -Math.PI / 2, d - 0.7]]) S.agregar(x, h - 0.4, z, an, an / 4, [0, 0, 1, 1], ry);
        // entrada con marquesina
        L.cajaB(0, 0, db / 2 + 0.04, 1.6, 1.75, 0.08, '#1e2a36'); Ll.cajaB(0, 0.1, db / 2 + 0.085, 1.3, 1.5, 0.02, '#cfe6ff');
        L.cajaB(0, 1.85, db / 2 + 0.55, 2.4, 0.1, 1.1, c2); L.cajaB(-1.05, 0, db / 2 + 1.0, 0.07, 1.85, 0.07, '#8a8f98'); L.cajaB(1.05, 0, db / 2 + 1.0, 0.07, 1.85, 0.07, '#8a8f98');
        halo(0, 1.2, db / 2 + 0.4, 1.6, 0xcfe6ff); charco(0, db / 2 + 1.2, 3.2, 0xcfe6ff);
        for (const s of [-1, 1]) { L.cajaB(s * 1.7, 0, db / 2 + 0.45, 0.5, 0.4, 0.5, '#8a8f98'); L.esfera(s * 1.7, 0.6, db / 2 + 0.45, 0.3, '#4f9a3f', 0); }
        bloquear(p.x, p.z, w, d, p.r);
      },
      edificio_ollama(p) {
        L.cajaB(0, 0, 0, 3.4, 2.6, 3.2, '#f4f2ee'); L.cajaB(0, 2.6, 0, 3.6, 0.18, 3.4, '#2a2a2e');
        L.cil(0, 2.78, 0, 1.3, 0.5, '#e8e6e0', 10); L.esfera(0, 3.3, 0, 1.1, '#f4f2ee', 1, 1, 0.55, 1);
        for (const s of [-0.45, 0.45]) L.caja(s, 3.95, 0.1, 0.22, 0.6, 0.18, '#f4f2ee', 0, 0, s * 0.3);
        L.cajaB(0, 0, 1.62, 0.9, 1.5, 0.06, '#2a2a2e'); Ll.cajaB(0, 0.1, 1.655, 0.7, 1.3, 0.02, '#ffe2a0');
        for (const s of [-1, 1]) { L.cajaB(s * 1.72, 1.0, 0, 0.06, 0.8, 1.0, '#2a2a2e'); Ll.cajaB(s * 1.75, 1.08, 0, 0.02, 0.64, 0.84, '#ffe2a0'); }
        const S = marca({ marca: 'ollama', texto: 'OLLAMA', c: '#f4f2ee', c2: '#2a2a2e' });
        S.agregar(0, 2.15, 1.64, 2.4, 0.6, [0, 0, 1, 1], 0);
        halo(0, 1.0, 1.9, 1.4, 0xffe2a0); charco(0, 2.4, 3, 0xffd890);
        bloquear(p.x, p.z, 3.6, 3.4, p.r);
      },
      mesa_laptop(p) {
        L.cajaB(0, 0.7, 0, 1.2, 0.06, 0.7, '#e8e2d8'); for (const [x, z] of [[-0.52, -0.28], [0.52, -0.28], [-0.52, 0.28], [0.52, 0.28]]) L.cajaB(x, 0, z, 0.05, 0.7, 0.05, '#8a8f98');
        L.cajaB(0, 0.76, -0.05, 0.5, 0.02, 0.34, '#b8bcc4'); L.caja(0, 0.92, 0.1, 0.5, 0.32, 0.02, '#b8bcc4', 0, -0.25);
        plan('pant_codigo', matTex(TX.codigo.t, true)).agregar(0, 0.92, 0.088, 0.44, 0.27, [0, 0, 1, 1], Math.PI, -0.25);
        halo(0, 0.95, 0.0, 0.6, 0x4ac8ff, true);
        L.cil(0.4, 0.76, -0.15, 0.05, 0.1, '#ffffff', 8);
        bloquear(p.x, p.z, 1.2, 0.7, p.r);
      },
      sombrilla(p) { L.cil(0, 0, 0, 0.04, 2.1, '#8a8f98', 6); L.cono(0, 1.95, 0, 1.3, 0.45, p.c, 8); L.cono(0, 1.93, 0, 1.32, 0.04, tono(p.c, 0.7), 8); L.cil(0, 0, 0, 0.25, 0.08, '#555', 8); },
      fuente_holo(p) {
        L.cil(0, 0, 0, 2.0, 0.45, '#c9ced6', 16); L.cil(0, 0.45, 0, 2.05, 0.06, '#e8ecf0', 16); Lb.cil(0, 0.38, 0, 1.75, 0.05, '#4fd8ff', 16);
        L.cil(0, 0.45, 0, 0.35, 0.6, '#8a8f98', 8); Lb.cil(0, 1.05, 0, 0.3, 0.05, '#7ff0ff', 8);
        const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshBasicMaterial({ color: 0x6ae8ff, wireframe: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
        const q = local(0, 2.1, 0); holo.position.set(q.x, q.y, q.z); destino.add(holo);
        const anillo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.03, 4, 32), holo.material); anillo.position.copy(holo.position); destino.add(anillo);
        animados.push({ act: (t) => { holo.rotation.y = t / 1600; holo.rotation.x = Math.sin(t / 2300) * 0.3; anillo.rotation.x = Math.PI / 2 + Math.sin(t / 900) * 0.4; anillo.rotation.y = t / 1300; holo.position.y = q.y + Math.sin(t / 700) * 0.12; } });
        halo(0, 2.1, 0, 3.2, 0x4fd8ff, true); charco(0, 0, 6, 0x4fd8ff);
        bloquearCirculo(p.x, p.z, 2.1);
      },
      food_truck(p) {
        const c = p.c;
        L.cajaB(0, 0.35, 0, 3.2, 1.6, 1.6, c); L.cajaB(-1.35, 0.35, 0, 0.6, 1.1, 1.58, tono(c, 0.85)); L.cajaB(-1.62, 0.9, 0, 0.04, 0.45, 1.3, '#2c3e50');
        L.cajaB(0, 1.95, 0, 3.24, 0.08, 1.64, '#f2f2f2');
        L.cajaB(0.35, 0.9, 0.81, 1.8, 0.75, 0.02, '#1e1e22'); Ll.cajaB(0.35, 0.95, 0.805, 1.6, 0.6, 0.02, '#ffe9b0');
        L.caja(0.35, 1.72, 1.1, 2.0, 0.05, 0.62, tono(c, 0.75), 0, -0.35); L.cajaB(0.35, 0.88, 0.95, 1.9, 0.06, 0.3, '#d8d0c0');
        for (const [x, z] of [[-1.05, 0.82], [1.0, 0.82], [-1.05, -0.82], [1.0, -0.82]]) L.cilC(x, 0.3, z, 0.28, 0.16, '#1a1a1e', 10, Math.PI / 2);
        if (p.texto) plan('carteles', matCartel).agregar(0.35, 2.25, 0.0, 2.8, 0.35, uvTexto(p.texto, p.t), 0);
        if (p.texto) L.cajaB(0.35, 2.03, 0, 2.9, 0.42, 0.06, '#1e1e22');
        if (p.texto) plan('carteles', matCartel).agregar(0.35, 2.25, 0.035, 2.8, 0.35, uvTexto(p.texto, p.t), 0);
        if (p.texto) plan('carteles', matCartel).agregar(0.35, 2.25, -0.035, 2.8, 0.35, uvTexto(p.texto, p.t), Math.PI);
        halo(0.35, 1.0, 1.1, 1.8, 0xffe2a0); charco(0.35, 1.4, 3.4, 0xffd890);
        bloquear(p.x, p.z, 3.4, 1.8, p.r);
      },
      letras_ia(p) {
        L.cajaB(0, 0, 0, 3.0, 0.3, 1.0, '#c9ced6');
        L.cajaB(-0.9, 0.3, 0, 0.5, 2.0, 0.5, '#2f8fe0'); L.cajaB(-0.9, 2.3, 0, 0.9, 0.3, 0.5, '#2f8fe0'); L.cajaB(-0.9, 0.3, 0, 0.9, 0.3, 0.5, '#2f8fe0');
        L.caja(0.55, 1.3, 0, 0.45, 2.15, 0.5, '#ff6ad5', 0, 0, -0.36); L.caja(1.25, 1.3, 0, 0.45, 2.15, 0.5, '#ff6ad5', 0, 0, 0.36); L.cajaB(0.9, 0.85, 0, 0.75, 0.28, 0.5, '#ff6ad5');
        halo(0, 1.4, 0.6, 2.4, 0x9ac8ff); bloquear(p.x, p.z, 3.0, 1.0, p.r);
      },
      farola_moderna(p) { L.cil(0, 0, 0, 0.1, 0.12, '#2a2e36', 8); L.cajaB(0, 0.12, 0, 0.1, 3.0, 0.1, '#2a2e36'); L.cajaB(0.3, 3.0, 0, 0.75, 0.08, 0.16, '#2a2e36'); Ll.cajaB(0.42, 2.96, 0, 0.5, 0.04, 0.1, '#e8f4ff'); halo(0.42, 2.9, 0, 1.5, 0xd8ecff); charco(0.42, 0, 4.4, 0xcfe6ff); bloquear(p.x, p.z, 0.3, 0.3, 0); },
      // --- Ciudad del Cine ---
      pantalla_autocine(p) {
        const w = p.w, h = p.h, y0 = 1.0;
        for (const s of [-1, 1]) { L.cajaB(s * (w / 2 - 0.6), 0, -0.25, 0.3, y0 + h + 0.2, 0.3, '#5a5f68'); L.cajaB(s * (w / 2 - 0.6), 0, -1.2, 0.2, y0 + h * 0.6, 0.2, '#5a5f68'); L.caja(s * (w / 2 - 0.6), (y0 + h * 0.6) / 2 + 0.3, -0.75, 0.1, 0.1, 1.3, '#5a5f68', 0, 0.7); }
        L.cajaB(0, y0 - 0.15, -0.08, w + 0.3, h + 0.3, 0.16, '#2a2a2e');
        plan('peli', new THREE.MeshBasicMaterial({ map: TX.peli.t })).agregar(0, y0 + h / 2, 0.012, w, h, [0, 0, 1, 1], 0);
        halo(0, y0 + h / 2, 0.4, w * 0.9, 0x9ab8ff, true); charco(0, 5, 12, 0x9ab8ff);
        bloquear(p.x, p.z, w, 1.4, p.r);
      },
      auto_clasico(p) {
        const c = p.c;
        L.cajaB(0, 0.2, 0, 1.1, 0.42, 2.4, c); L.cajaB(0, 0.62, -0.15, 0.95, 0.38, 1.2, c); L.cajaB(0, 0.66, -0.15, 0.97, 0.3, 1.0, '#2c3e50');
        L.cajaB(0, 0.25, 1.22, 1.14, 0.1, 0.06, '#e8e8e8'); L.cajaB(0, 0.25, -1.22, 1.14, 0.1, 0.06, '#e8e8e8');
        for (const s of [-1, 1]) { L.caja(s * 0.5, 0.75, -1.0, 0.06, 0.3, 0.5, c, 0, 0.5); Lb.cajaB(s * 0.36, 0.38, 1.21, 0.2, 0.12, 0.02, '#fff6d8'); }
        for (const [x, z] of [[-0.52, 0.78], [0.52, 0.78], [-0.52, -0.78], [0.52, -0.78]]) L.cilC(x, 0.22, z, 0.22, 0.14, '#1a1a1e', 10, 0, 0, Math.PI / 2);
        bloquear(p.x, p.z, 1.2, 2.5, p.r);
      },
      carrito_palomitas(p) {
        L.cajaB(0, 0.3, 0, 1.4, 0.7, 0.8, '#d63a2a'); for (let k = 0; k < 5; k++) L.cajaB(-0.56 + k * 0.28, 0.3, 0.405, 0.12, 0.7, 0.01, '#f4f4f0');
        L.cajaB(0, 1.0, 0, 1.0, 0.7, 0.7, '#cfe6ff'); for (let k = 0; k < 14; k++) Lb.esfera((hash(k, 1) - 0.5) * 0.8, 1.05 + hash(1, k) * 0.35, (hash(k, 7) - 0.5) * 0.5, 0.07, '#ffe680', 0);
        L.cono(0, 1.7, 0, 0.75, 0.4, '#d63a2a', 8); L.cajaB(0, 1.68, 0, 1.05, 0.04, 0.75, '#f4f4f0');
        for (const s of [-1, 1]) L.cilC(s * 0.55, 0.22, 0.42, 0.2, 0.08, '#1a1a1e', 10, Math.PI / 2);
        halo(0, 1.2, 0.5, 1.2, 0xffe680); bloquear(p.x, p.z, 1.5, 0.9, p.r);
      },
      fondo_verde(p) {
        L.cajaB(0, 0, 0, p.w, p.h, 0.12, '#3fc24a'); L.cajaB(0, 0, 1.1, p.w, 0.02, 2.2, '#3fc24a'); L.caja(0, 0.15, 0.12, p.w, 0.3, 0.3, '#3fc24a', 0, -0.78);
        for (const s of [-1, 1]) L.cajaB(s * (p.w / 2 + 0.06), 0, 0, 0.1, p.h + 0.2, 0.18, '#2a2a2e');
        L.cajaB(0, p.h + 0.1, 0, p.w + 0.2, 0.1, 0.18, '#2a2a2e');
        bloquear(p.x, p.z - 0.05, p.w, 0.3, p.r);
      },
      grua_camara(p) {
        L.cil(0, 0, 0, 0.5, 0.15, '#2a2a2e', 8); L.cil(0, 0.15, 0, 0.12, 1.4, '#3a3a40', 8);
        const g = new THREE.Group(); const q = local(0, 1.55, 0); g.position.set(q.x, q.y, q.z); g.rotation.y = enCurso.ry;
        const LG = new G.Lote(); LG.caja(0, 0.1, 0.8, 0.12, 0.12, 3.4, '#5a5f68'); LG.caja(0, 0.1, -1.1, 0.4, 0.4, 0.5, '#2a2a2e'); LG.cajaB(0, -0.15, 2.5, 0.32, 0.3, 0.45, '#1e1e22'); LG.cilC(0, 0.0, 2.8, 0.1, 0.16, '#1a1a1e', 8, Math.PI / 2);
        g.add(LG.malla(MAT.solido)); destino.add(g);
        const base = enCurso.ry; animados.push({ act: (t) => { g.rotation.y = base + Math.sin(t / 4200) * 0.5; g.rotation.x = Math.sin(t / 3100) * 0.12; } });
        bloquearCirculo(p.x, p.z, 0.6);
      },
      silla_director(p) {
        for (const s of [-1, 1]) { L.caja(s * 0.25, 0.45, 0, 0.05, 0.95, 0.05, '#8a6038', 0, 0, s * 0.25); L.cajaB(s * 0.27, 0.9, -0.2, 0.05, 0.6, 0.05, '#8a6038'); }
        L.cajaB(0, 0.85, 0, 0.55, 0.04, 0.45, '#1e1e22'); L.cajaB(0, 1.2, -0.21, 0.55, 0.25, 0.03, '#1e1e22'); L.cajaB(0, 0.25, 0, 0.5, 0.05, 0.05, '#8a6038');
        bloquear(p.x, p.z, 0.6, 0.5, p.r);
      },
      foco_estudio(p) { for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; L.caja(Math.cos(a) * 0.25, 0.7, Math.sin(a) * 0.25, 0.03, 1.4, 0.03, '#2a2a2e', 0, -a, 0.18); } L.cajaB(0, 0, 0, 0.04, 1.9, 0.04, '#2a2a2e'); L.cajaB(0, 1.75, 0, 0.75, 0.6, 0.35, '#2a2a2e'); Lb.cajaB(0, 1.8, 0.18, 0.66, 0.5, 0.02, '#fffaf0'); halo(0, 2.05, 0.4, 1.8, 0xfff4e0, true); bloquear(p.x, p.z, 0.6, 0.6, 0); },
      claqueta(p) { L.cajaB(0, 0, 0, 0.36, 0.02, 0.3, '#1e1e22'); L.caja(0, 0.06, -0.12, 0.36, 0.06, 0.02, '#f4f4f0', 0, 0.4); for (let k = 0; k < 4; k++) L.caja(-0.13 + k * 0.09, 0.063, -0.12, 0.04, 0.065, 0.022, '#1e1e22', 0, 0.4); },
      caja_equipo(p) { L.cajaB(0, 0, 0, 0.8, 0.55, 0.55, '#1e1e22'); for (const s of [-1, 1]) L.cajaB(s * 0.39, 0, 0, 0.04, 0.55, 0.57, '#8a8f98'); L.cajaB(0, 0.25, 0.28, 0.2, 0.08, 0.02, '#8a8f98'); bloquear(p.x, p.z, 0.8, 0.6, p.r); },
      estrella_fama(p) { plan('estrella', matTex(TX.estrella.t, false, { transparent: true, alphaTest: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })).agregar(0, 0.012, 0, 1.0, 1.0, [0, 0, 1, 1], 0, -Math.PI / 2); },
      rollo_pelicula(p) {
        L.cajaB(0, 0, 0, 1.2, 0.3, 1.2, '#5a5f68');
        L.cilC(0, 1.75, 0, 1.3, 0.25, '#2a2a2e', 16, Math.PI / 2); L.cilC(0, 1.75, 0, 0.35, 0.3, '#8a8f98', 10, Math.PI / 2);
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; L.cilC(Math.cos(a) * 0.82, 1.75 + Math.sin(a) * 0.82, 0, 0.26, 0.28, '#5a5f68', 8, Math.PI / 2); }
        for (let k = 0; k < 7; k++) L.caja(0.6 + k * 0.22, 1.0 - k * 0.15, 0.12, 0.24, 0.05, 0.45, k % 2 ? '#1e1e22' : '#2a2a2e', 0, 0, -0.5 - k * 0.05);
        L.cajaB(0, 0.3, 0, 0.3, 0.3, 0.3, '#5a5f68');
        bloquear(p.x, p.z, 1.4, 1.2, p.r);
      },
      cine(p) {
        const w = p.w, d = p.d, h = p.h;
        L.cajaB(0, 0, 0, w, h, d, '#efe0c6'); L.cajaB(0, h, 0, w + 0.2, 0.25, d + 0.2, '#b8423a'); L.cajaB(0, 0, d / 2 + 0.01, w, 0.5, 0.04, '#b8423a');
        for (let k = 0; k < 4; k++) L.cajaB(-w / 2 + 1.3 + k * 2.5, 0.5, d / 2 + 0.03, 0.06, h - 0.5, 0.04, '#d8c8a8');
        // marquesina con letrero animado
        L.cajaB(0, 2.5, d / 2 + 0.7, 7.2, 0.95, 1.4, '#1a1214'); L.cajaB(0, 2.45, d / 2 + 0.7, 7.4, 0.08, 1.5, '#d4a83a'); L.cajaB(0, 3.45, d / 2 + 0.7, 7.4, 0.08, 1.5, '#d4a83a');
        plan('marquesina', new THREE.MeshBasicMaterial({ map: TX.marquesina.t })).agregar(0, 2.97, d / 2 + 1.41, 7.0, 0.875, [0, 0, 1, 1], 0);
        plan('marquesina', new THREE.MeshBasicMaterial({ map: TX.marquesina.t })).agregar(3.61, 2.97, d / 2 + 0.7, 1.3, 0.875, [0, 0, 0.19, 1], Math.PI / 2);
        // puertas y afiches
        for (const s of [-1, 1]) { L.cajaB(s * 0.8, 0, d / 2 + 0.03, 1.2, 2.1, 0.06, '#5a2a22'); Ll.cajaB(s * 0.8, 0.15, d / 2 + 0.065, 1.0, 1.8, 0.02, '#ffd890'); }
        const pa = plan('afiches', matTex(TX.afiches.t, false));
        pa.agregar(-3.6, 1.45, d / 2 + 0.06, 1.1, 1.6, [0, 0, 0.333, 1], 0); pa.agregar(3.6, 1.45, d / 2 + 0.06, 1.1, 1.6, [0.333, 0, 0.666, 1], 0);
        pa.agregar(w / 2 + 0.03, 1.6, 1.2, 1.1, 1.6, [0.666, 0, 1, 1], Math.PI / 2); pa.agregar(w / 2 + 0.03, 1.6, -1.8, 1.1, 1.6, [0, 0, 0.333, 1], Math.PI / 2);
        if (p.texto) { L.cajaB(0, h + 0.25, -0.5, 5.4, 1.0, 0.2, '#1a1214'); plan('carteles', matCartel).agregar(0, h + 0.75, -0.39, 5.2, 0.65, uvTexto(p.texto, p.t), 0); }
        halo(0, 3.0, d / 2 + 1.5, 4.5, 0xffd890, true); charco(0, d / 2 + 2.4, 7, 0xffd890);
        bloquear(p.x, p.z, w, d + 1.0, p.r);
      },
      redjohn_grande(p) {
        const t = texto(128, 128, (x) => {
          x.clearRect(0, 0, 128, 128); x.strokeStyle = '#c0101a'; x.fillStyle = '#c0101a'; x.lineWidth = 8; x.lineCap = 'round';
          x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke();
          x.beginPath(); x.ellipse(46, 50, 6, 10, 0, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(82, 50, 6, 10, 0, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(64, 66, 30, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
          for (let k = 0; k < 9; k++) { x.lineWidth = 3; x.beginPath(); const u = 20 + hash(k, 3) * 90; x.moveTo(u, 70 + hash(k, 4) * 40); x.lineTo(u + (hash(k, 5) - 0.5) * 3, 100 + hash(k, 6) * 26); x.stroke(); }
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: t.t, transparent: true, alphaTest: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
        const q = local(0, 1.3 + (p.y || 0), 0.02); m.position.set(q.x, q.y, q.z); m.rotation.y = enCurso.ry; destino.add(m);
        halo(0, 1.3 + (p.y || 0), 0.4, 4.0, 0xff2020, true); charco(0, 1.5, 5, 0xff2020);
      },
      // --- Isla Festival ---
      escenario_grande(p) {
        const w = p.w, d = p.d, h = p.h;
        L.cajaB(0, 0, 0, w, h, d, '#2a2a30'); L.cajaB(0, h, 0, w + 0.1, 0.05, d + 0.1, '#3a3a42'); L.cajaB(0, 0, d / 2 + 0.01, w, h, 0.04, '#1a1a1e');
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) L.cajaB(s * (w / 2 + 0.3), 0, -0.6 + k * 0.4, 0.6, h * (k + 1) / 3, 0.4, '#3a3a42');
        L.cajaB(0, h, -d / 2 + 0.25, w - 0.6, 5.0, 0.3, '#1a1a1e');
        plan('led_escenario', new THREE.MeshBasicMaterial({ map: TX.visualizador.t })).agregar(0, h + 2.6, -d / 2 + 0.41, w - 1.2, 4.4, [0, 0, 1, 1], 0);
        for (const s of [-1, 1]) {
          for (let y = 0; y < 7; y += 1.0) { L.cajaB(s * (w / 2 + 0.5), y, -d / 2 + 0.5, 0.06, 1.0, 0.06, '#8a8f98'); L.cajaB(s * (w / 2 + 0.9), y, -d / 2 + 0.5, 0.06, 1.0, 0.06, '#8a8f98'); L.caja(s * (w / 2 + 0.7), y + 0.5, -d / 2 + 0.5, 0.45, 0.04, 0.04, '#8a8f98', 0, 0, 0.9); }
          L.cajaB(s * (w / 2 + 2.0), 0, d / 2 - 1.4, 1.4, 2.6, 1.2, '#1e1e22'); for (let k = 0; k < 3; k++) L.cilC(s * (w / 2 + 2.0), 0.5 + k * 0.85, d / 2 - 0.79, 0.3, 0.03, '#3a3a40', 10, Math.PI / 2);
          L.caja(s * 2.4, h + 0.18, d / 2 - 0.4, 0.7, 0.36, 0.5, '#1e1e22', 0, 0.5);
        }
        L.cajaB(0, 7.0, -d / 2 + 0.5, w + 2.0, 0.3, 0.3, '#8a8f98');
        const focos = new THREE.Group(); destino.add(focos);
        const q0 = local(0, 6.75, -d / 2 + 0.5); focos.position.set(q0.x, q0.y, q0.z); focos.rotation.y = enCurso.ry;
        const cols = [0xff3ad0, 0x3ad0ff, 0xffd23a, 0x7aff5a, 0xff6a3a, 0x9a6aff];
        const beams = [];
        for (let k = 0; k < 6; k++) {
          const g = new THREE.Group(); g.position.x = -w / 2 + 0.6 + k * (w - 1.2) / 5;
          const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a2a2e })); g.add(cuerpo);
          const cono = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6.5, 12, 1, true), new THREE.MeshBasicMaterial({ color: cols[k], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
          cono.position.y = -3.25; cono.rotation.x = 0; g.add(cono); beams.push({ g, cono, k });
          focos.add(g);
          halos.push(Object.assign(local(-w / 2 + 0.6 + k * (w - 1.2) / 5, 6.6, -d / 2 + 0.5), { s: 1.0, c: cols[k], siempre: true }));
        }
        animados.push({ act: (t, noche) => { for (const b of beams) { b.g.rotation.x = 0.55 + Math.sin(t / 900 + b.k) * 0.35; b.g.rotation.z = Math.sin(t / 1300 + b.k * 1.7) * 0.5; b.cono.material.opacity = Math.max(0, noche - 0.3) * 0.22; } } });
        halo(0, h + 2.6, -d / 2 + 1.2, w * 0.8, 0xc060ff, true); charco(0, d / 2 + 2, 12, 0xc060ff);
        bloquear(p.x, p.z, w + 1.2, d + 0.2, p.r);
      },
      cabina_dj(p) {
        L.cajaB(0, 0, -0.2, 4.2, 0.5, 2.6, '#2a2a30');
        L.cajaB(0, 0.5, 0.2, 2.6, 0.85, 0.7, '#1e1e22'); plan('led_dj', new THREE.MeshBasicMaterial({ map: TX.pista.t })).agregar(0, 0.92, 0.556, 2.5, 0.75, [0, 0, 1, 1], 0);
        for (const s of [-1, 1]) { L.cil(s * 0.65, 1.35, 0.2, 0.28, 0.04, '#3a3a40', 12); Lb.cil(s * 0.65, 1.39, 0.2, 0.08, 0.01, '#ff3ad0', 8); L.cajaB(s * 1.75, 0.5, 0.1, 0.7, 1.6, 0.6, '#1e1e22'); L.cilC(s * 1.75, 1.0, 0.41, 0.24, 0.03, '#3a3a40', 10, Math.PI / 2); }
        L.cajaB(0, 1.35, 0.2, 0.5, 0.06, 0.4, '#3a3a40');
        L.cajaB(0, 0.5, -1.2, 4.0, 2.6, 0.12, '#1e1e22'); plan('led_dj2', new THREE.MeshBasicMaterial({ map: TX.visualizador.t })).agregar(0, 1.85, -1.13, 3.8, 2.4, [0, 0, 1, 1], 0);
        halo(0, 1.6, 0.8, 2.6, 0xff3ad0, true); charco(0, 2.5, 6, 0xff3ad0);
        bloquear(p.x, p.z + 0.2, 4.2, 1.2, p.r);
      },
      torre_luces(p) {
        for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) L.cajaB(x, 0, z, 0.06, 6, 0.06, '#8a8f98');
        for (let y = 0.5; y < 6; y += 0.8) L.cajaB(0, y, 0, 0.56, 0.04, 0.56, '#8a8f98');
        const g = new THREE.Group(); const q = local(0, 6.1, 0); g.position.set(q.x, q.y, q.z); destino.add(g);
        const cono = new THREE.Mesh(new THREE.ConeGeometry(1.0, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x9a6aff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        cono.position.y = -3; g.add(cono); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0x2a2a2e })));
        const ph = hash(p.x, p.z) * 6;
        animados.push({ act: (t, noche) => { g.rotation.x = 0.6 + Math.sin(t / 800 + ph) * 0.4; g.rotation.y = t / 1500 + ph; cono.material.opacity = Math.max(0, noche - 0.3) * 0.25; cono.material.color.setHSL(((t / 4000 + ph) % 1), 0.8, 0.6); } });
        halo(0, 6.1, 0, 1.2, 0xc080ff, true);
        bloquear(p.x, p.z, 0.7, 0.7, 0);
      },
      pantalla_karaoke() { L.cajaB(0, 0, 0.02, 2.2, 1.3, 0.06, '#1e1e22'); plan('karaoke', new THREE.MeshBasicMaterial({ map: TX.karaoke.t })).agregar(0, 0.65, 0.056, 2.0, 1.1, [0, 0, 1, 1], 0); halo(0, 0.65, 0.3, 1.8, 0x6ad0ff, true); },
      neon_texto(p) { neonTexto(p); },
      bola_disco(p) {
        L.cajaB(0, 0.3, 0, 0.02, 0.6, 0.02, '#3a3a40');
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshLambertMaterial({ color: 0xdfe6f0, emissive: 0x30343a, flatShading: true }));
        const q = local(0, 0.1, 0); m.position.set(q.x, q.y, q.z); destino.add(m);
        animados.push({ act: (t) => { m.rotation.y = t / 900; } });
        halo(0, 0.1, 0, 1.2, 0xffffff, true); charco(0, 0, 5, 0xff6ae0);
      },
      estante_guitarras(p) {
        L.cajaB(0, 1.6, 0.05, 3.0, 0.06, 0.1, '#6e4a2c');
        ['#d63a2a', '#2f8fe0', '#f2c230', '#1e1e22', '#7fbf7f'].forEach((c, k) => { const x = -1.2 + k * 0.6; L.cajaB(x, 1.0, 0.1, 0.06, 0.6, 0.04, '#5a3a22'); L.esfera(x, 0.75, 0.12, 0.2, c, 0, 1, 1.2, 0.35); L.esfera(x, 0.52, 0.12, 0.23, c, 0, 1.1, 1, 0.35); });
      },
      piano(p) {
        L.cajaB(0, 0, -0.1, 1.5, 1.25, 0.55, '#1e1a1a'); L.cajaB(0, 0.72, 0.25, 1.5, 0.06, 0.3, '#1e1a1a'); L.cajaB(0, 0.76, 0.26, 1.4, 0.03, 0.22, '#f4f4f0');
        for (let k = 0; k < 9; k++) L.cajaB(-0.6 + k * 0.15, 0.79, 0.21, 0.06, 0.03, 0.12, '#1e1e22');
        for (const s of [-1, 1]) L.cajaB(s * 0.7, 0, 0.3, 0.08, 0.72, 0.08, '#1e1a1a');
        L.cajaB(0, 0.42, 0.75, 0.9, 0.06, 0.36, '#1e1a1a'); for (const s of [-1, 1]) L.cajaB(s * 0.38, 0, 0.75, 0.06, 0.42, 0.3, '#1e1a1a');
        Ll.cil(0.5, 1.25, -0.15, 0.06, 0.14, '#ffe2a0', 6); halo(0.5, 1.4, -0.15, 0.6, 0xffd890);
        bloquear(p.x, p.z, 1.5, 0.9, p.r);
      },
      mesa_picnic(p) { L.cajaB(0, 0.68, 0, 1.9, 0.07, 0.75, C.mad); for (const s of [-1, 1]) { L.cajaB(0, 0.4, s * 0.7, 1.9, 0.06, 0.3, C.mad); L.caja(s * 0.7, 0.34, 0, 0.08, 0.08, 1.7, C.madO); L.cajaB(s * 0.75, 0, 0, 0.08, 0.68, 0.08, C.madO); } bloquear(p.x, p.z, 1.9, 0.75, p.r); },
      guitarra_gigante(p) {
        L.cajaB(0, 0, 0, 1.6, 0.4, 1.0, '#5a5f68');
        L.esfera(0, 1.5, 0, 1.0, '#c8202a', 1, 1, 1.05, 0.32); L.esfera(0, 2.6, 0, 0.75, '#c8202a', 1, 1, 1.05, 0.32); L.esfera(0.15, 1.7, 0.18, 0.4, '#f4f4f0', 0, 1, 1.2, 0.1);
        L.cajaB(0, 3.0, 0, 0.26, 2.4, 0.14, '#5a3a22'); L.cajaB(0, 5.35, 0, 0.42, 0.6, 0.16, '#2a2a2e');
        for (let k = 0; k < 4; k++) L.cajaB(-0.07 + k * 0.045, 1.3, 0.14, 0.015, 3.9, 0.01, '#e8e8e8');
        halo(0, 2.6, 0.5, 2.2, 0xff5a5a); bloquear(p.x, p.z, 1.6, 1.0, p.r);
      },
      // --- Bosque Mágico ---
      torre_mago(p) {
        const h = p.h;
        L.cil(0, 0, 0, 1.75, 0.6, '#6f6b66', 10); L.agregar('tronco', 10, 0, h / 2, 0, 3.0, h, 3.0, '#8b857d', 0, 0, 0);
        for (let y = 1.6; y < h - 0.5; y += 2.2) for (let k = 0; k < 2; k++) { const a = y * 1.3 + k * Math.PI; const r = 1.55 - y / h * 0.35; L.cajaB(Math.sin(a) * r, y, Math.cos(a) * r, 0.36, 0.6, 0.36, '#4a3f5a', a); Ll.cajaB(Math.sin(a) * (r + 0.1), y + 0.05, Math.cos(a) * (r + 0.1), 0.24, 0.48, 0.24, '#c9a0ff', a); halo(Math.sin(a) * (r + 0.3), y + 0.3, Math.cos(a) * (r + 0.3), 0.8, 0xc9a0ff); }
        L.cil(0, h - 0.2, 0, 1.55, 0.3, '#6f6b66', 10); L.cono(0, h + 0.1, 0, 1.75, 3.6, '#5a3fa8', 10); L.cono(0, h + 3.4, 0, 0.32, 0.9, '#7a5fd8', 8);
        L.cajaB(0, 0, 1.38, 0.8, 1.5, 0.3, '#3a2a1e'); Ll.cajaB(0, 0.15, 1.53, 0.55, 1.15, 0.02, '#ffcf7a');
        const orbe = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshBasicMaterial({ color: 0xb98aff }));
        const q = local(0, h + 5.2, 0); orbe.position.set(q.x, q.y, q.z); destino.add(orbe);
        animados.push({ act: (t) => { orbe.rotation.y = t / 700; orbe.position.y = q.y + Math.sin(t / 900) * 0.25; } });
        halos.push({ x: q.x, y: q.y, z: q.z, s: 2.6, c: 0xb98aff, siempre: true }); charco(0, 2, 5, 0xb98aff);
        bloquearCirculo(p.x, p.z, 1.9);
      },
      mesa_magia(p) {
        L.cajaB(0, 0.66, 0, 1.3, 0.08, 0.8, '#5a3a22'); for (const [x, z] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) L.cajaB(x, 0, z, 0.08, 0.66, 0.08, '#4a2e1a');
        L.cajaB(-0.3, 0.74, 0.05, 0.42, 0.06, 0.3, '#7a2a3a'); L.caja(-0.3, 0.79, 0.05, 0.4, 0.01, 0.28, '#f2e6c8', 0, 0, 0.08);
        Lb.esfera(0.32, 0.92, -0.1, 0.14, '#9ad8ff', 1); halo(0.32, 0.92, -0.1, 1.0, 0x9ad8ff, true);
        for (const [x, z, c] of [[0.5, 0.25, '#ff6ad5'], [0.2, 0.28, '#6affb0']]) { L.cil(x, 0.74, z, 0.05, 0.16, c, 6); }
        Ll.cil(-0.55, 0.74, -0.3, 0.03, 0.14, '#fff0c0', 5); halo(-0.55, 0.95, -0.3, 0.5, 0xffd080);
        bloquear(p.x, p.z, 1.3, 0.8, p.r);
      },
      portal(p) {
        L.cajaB(0, 0, 0, 4.0, 0.3, 2.2, '#8b857d'); L.cajaB(0, 0.3, 0, 3.2, 0.2, 1.6, '#9d978f');
        for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; L.caja(Math.sin(a) * 1.55, 2.2 + Math.cos(a) * 1.55, 0, 0.5, 0.75, 0.5, k % 3 ? '#7d776f' : '#6f6b66', 0, 0, -a); if (k % 2 === 0) Lb.caja(Math.sin(a) * 1.55, 2.2 + Math.cos(a) * 1.55, 0.26, 0.14, 0.2, 0.02, '#c9a0ff', 0, 0, -a); }
        plan('portal', new THREE.MeshBasicMaterial({ map: TX.portal.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })).agregar(0, 2.2, 0.0, 2.7, 2.7, [0, 0, 1, 1], 0);
        plan('portal', new THREE.MeshBasicMaterial({ map: TX.portal.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })).agregar(0, 2.2, -0.01, 2.7, 2.7, [0, 0, 1, 1], Math.PI);
        halo(0, 2.2, 0.4, 4.4, 0xa070ff, true); charco(0, 1.2, 7, 0xa070ff);
        bloquear(p.x, p.z, 4.0, 2.2, p.r);
      },
      ruinas(p) {
        for (const [x, z, h, rota] of [[-2.8, -1.0, 3.2, 0], [2.8, -1.0, 2.4, 0], [-3.4, 1.6, 1.1, 1], [3.1, 1.2, 0, 2]]) {
          if (rota === 2) { L.cilC(x, 0.35, z, 0.38, 2.2, '#9d978f', 8, 0, 0.4, Math.PI / 2); continue; }
          L.cajaB(x, 0, z, 1.0, 0.3, 1.0, '#8b857d'); L.cil(x, 0.3, z, 0.38, h, '#a7a29a', 8);
          if (!rota) L.cajaB(x, 0.3 + h, z, 1.0, 0.35, 1.0, '#8b857d');
          bloquear(p.x + x, p.z + z, 1.0, 1.0, 0);
        }
        L.cajaB(3.9, 0, -2.4, 1.1, 0.7, 0.9, '#7d776f', 0.3); Lb.cajaB(3.9, 0.3, -1.93, 0.6, 0.2, 0.02, '#7ff0ff', 0.3);
        for (let k = 0; k < 6; k++) L.esfera(-1.6 + hash(k, 2) * 3.4, 0.12, 1.8 + hash(2, k) * 1.2, 0.18 + hash(k, k) * 0.15, '#9d978f', 0, 1.2, 0.7, 1);
        for (let k = 0; k < 8; k++) L.cajaB(-3.8 + hash(k, 5) * 7.6, 0, -2.3 + hash(5, k) * 0.6, 0.06, 0.35 + hash(k, 9) * 0.5, 0.06, '#4f8f3a');
      },
      arbol_ancestral(p) {
        L.agregar('tronco', 8, 0, 2.6, 0, 2.6, 5.2, 2.6, '#6b4a3a', 0, 0, 0);
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + 0.3; L.caja(Math.sin(a) * 1.6, 0.25, Math.cos(a) * 1.6, 0.45, 0.4, 1.9, '#5a3a2a', a, 0.2); }
        for (const [a, y, l] of [[0.6, 4.4, 2.6], [2.5, 4.8, 2.2], [4.2, 4.2, 2.4], [5.6, 5.0, 2.0]]) L.caja(Math.sin(a) * l * 0.5, y, Math.cos(a) * l * 0.5, 0.4, 0.4, l, '#5a3a2a', a, -0.5);
        for (const [x, y, z, r, c] of [[0, 7.2, 0, 3.4, '#2fae8a'], [2.4, 6.2, 0.8, 2.2, '#3fc29a'], [-2.3, 6.4, -0.6, 2.3, '#2a9a7a'], [0.6, 6.0, -2.4, 2.1, '#5a8ae8'], [-0.8, 6.0, 2.4, 2.0, '#7a6ae0'], [0.4, 8.9, 0.3, 1.9, '#4fcaa8']]) L.esfera(x, y, z, r, c, 1);
        const cols = ['#ff8ae8', '#8ae8ff', '#ffe68a', '#b98aff'];
        for (let k = 0; k < 22; k++) { const a = hash(k, 3) * 6.28, r = 1.8 + hash(3, k) * 1.8, y = 5.6 + hash(k, 8) * 3.2; Lb.esfera(Math.sin(a) * r, y, Math.cos(a) * r + 0.2, 0.13, cols[k % 4], 0); if (k % 3 === 0) halo(Math.sin(a) * r, y, Math.cos(a) * r + 0.2, 1.2, new THREE.Color(cols[k % 4]).getHex(), true); }
        for (const [x, z] of [[1.8, 1.6], [-1.9, 1.2], [1.2, -1.9]]) { L.cajaB(x, 3.4, z, 0.02, 1.0, 0.02, '#3a2a1e'); Ll.esfera(x, 3.3, z, 0.16, '#ffd27a', 0); halo(x, 3.3, z, 1.0, 0xffc070); }
        charco(0, 0, 10, 0x6affd0);
        bloquearCirculo(p.x, p.z, 1.9);
      },
      circulo_piedras(p) {
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * Math.PI * 2, x = Math.sin(a) * 2.4, z = Math.cos(a) * 2.4, h = 1.3 + hash(k, 4) * 0.8;
          L.caja(x, h / 2, z, 0.6, h, 0.4, k % 2 ? '#8b857d' : '#9d978f', a, (hash(k, 1) - 0.5) * 0.15, (hash(1, k) - 0.5) * 0.15);
          Lb.caja(x - Math.sin(a) * 0.21, h * 0.55, z - Math.cos(a) * 0.21, 0.18, 0.3, 0.02, '#7ff0ff', a);
          bloquear(p.x + x, p.z + z, 0.6, 0.6, 0);
        }
        L.cil(0, 0, 0, 0.8, 0.12, '#7d776f', 8); Lb.cil(0, 0.12, 0, 0.5, 0.01, '#7ff0ff', 8);
        halo(0, 0.5, 0, 3.4, 0x7ff0ff, true); charco(0, 0, 6, 0x7ff0ff);
      },
      choza_bruja(p) {
        L.caja(0, 1.05, 0, 3.0, 2.1, 2.8, '#5a4636', 0.08); L.cajaB(0, 0, 0, 3.2, 0.2, 3.0, '#4a3a2a');
        L.cono(0, 2.0, 0, 2.6, 2.6, '#4a2f6a', 7, 0.08, 0.1); L.cono(0.3, 4.3, 0.2, 0.5, 0.9, '#5a3f7a', 6, 0.5, 0.3);
        L.cajaB(0, 0, 1.42, 0.8, 1.5, 0.1, '#3a2a1e'); Ll.cil(0.95, 1.3, 1.42, 0.3, 0.05, '#7aff8a', 8, Math.PI / 2); halo(0.95, 1.3, 1.6, 1.0, 0x7aff8a);
        L.cajaB(-0.9, 2.2, -0.6, 0.4, 1.6, 0.4, '#6f6b66'); for (let k = 0; k < 3; k++) Lb.esfera(-0.9 + k * 0.15, 4.0 + k * 0.45, -0.6, 0.18 + k * 0.06, '#9aff9a', 0);
        bloquear(p.x, p.z, 3.4, 3.2, p.r);
      },
      caldero(p) {
        for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; L.caja(Math.sin(a) * 0.4, 0.2, Math.cos(a) * 0.4, 0.06, 0.45, 0.06, '#1e1e22', 0, 0, 0); }
        L.esfera(0, 0.7, 0, 0.6, '#1e1e22', 1, 1, 0.8, 1); L.cil(0, 0.95, 0, 0.5, 0.06, '#1e1e22', 12); Lb.cil(0, 0.96, 0, 0.44, 0.05, '#6aff6a', 12);
        const g = new THREE.Group(); const q = local(0, 1.02, 0); g.position.set(q.x, q.y, q.z); destino.add(g);
        const mb = new THREE.MeshBasicMaterial({ color: 0x9aff9a });
        const burbujas = []; for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mb); g.add(b); burbujas.push(b); }
        animados.push({ act: (t) => { burbujas.forEach((b, k) => { const u = ((t / 1400 + k / 5) % 1); b.position.set(Math.sin(k * 2.1) * 0.25, u * 0.8, Math.cos(k * 1.7) * 0.25); b.scale.setScalar(1 - u * 0.6); }); } });
        const f = fuego(p.x, 0.02, p.z, 0.8, true); destino.add(f.g); animados.push({ fuego: f });
        halo(0, 1.2, 0, 2.0, 0x6aff6a, true); charco(0, 0, 4, 0x6aff6a);
        bloquearCirculo(p.x, p.z, 0.75);
      },
      cristales(p) {
        for (const [x, z, h, r, c] of [[0, 0, 2.4, 0.5, '#c79bff'], [0.6, 0.3, 1.6, 0.38, '#7ff0ff'], [-0.5, 0.4, 1.4, 0.34, '#ff8ae8'], [0.2, -0.6, 1.2, 0.3, '#7ff0ff'], [-0.6, -0.4, 1.0, 0.28, '#c79bff']]) {
          Lb.cono(x, 0, z, r, h, c, 5, (hash(x, z) - 0.5) * 0.4, (hash(z, x) - 0.5) * 0.4); halo(x, h * 0.6, z, 1.3, new THREE.Color(c).getHex(), true);
        }
        charco(0, 0, 5, 0xc79bff); bloquearCirculo(p.x, p.z, 1.0);
      },
      casa_hongo(p) {
        L.cil(0, 0, 0, 0.85, 1.5, '#f2e6cf', 10); L.esfera(0, 1.75, 0, 1.45, p.c, 1, 1, 0.6, 1);
        for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + 0.4, r = 0.5 + hash(k, 2) * 0.7; L.esfera(Math.sin(a) * r, 2.05 + (1.2 - r) * 0.3, Math.cos(a) * r, 0.17, '#fff8f0', 0, 1, 0.5, 1); }
        L.cajaB(0, 0, 0.83, 0.55, 0.95, 0.06, '#6e4a2c'); Ll.cil(0.45, 1.0, 0.78, 0.17, 0.04, '#ffd27a', 8, Math.PI / 2 - 0.3); halo(0.45, 1.0, 1.0, 0.9, 0xffc070); charco(0, 1.2, 3, 0xffc070);
        bloquearCirculo(p.x, p.z, 1.0);
      },
      hongo_gigante(p) {
        const s = p.s || 1, c = p.c;
        L.cil(0, 0, 0, 0.22 * s, 1.6 * s, '#efe4d2', 8); L.esfera(0, 1.7 * s, 0, 0.95 * s, c, 1, 1, 0.45, 1); Lb.cil(0, 1.52 * s, 0, 0.8 * s, 0.03, tono(c, 1.25), 10);
        for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + s, r = 0.55 * s; Lb.esfera(Math.sin(a) * r, 1.86 * s, Math.cos(a) * r, 0.1 * s, '#fff8f0', 0, 1, 0.5, 1); }
        halo(0, 1.4 * s, 0, 1.8 * s, new THREE.Color(c).getHex(), true); charco(0, 0, 3 * s, new THREE.Color(c).getHex());
        bloquearCirculo(p.x, p.z, 0.35 * s + 0.15);
      },
      piedras_brillo(p) { for (let k = 0; k < 3; k++) { const x = (k - 1) * 0.55, z = (hash(k, p.z) - 0.5) * 0.4; L.cil(x, 0, z, 0.24, 0.06, '#9d978f', 7); Lb.esfera(x + 0.08, 0.06, z, 0.05, '#7ff0ff', 0); } halo(0, 0.2, 0, 1.0, 0x7ff0ff); },
      farol_hada(p) { L.cil(0, 0, 0, 0.06, 1.5, '#4a3a2a', 6); L.caja(0.18, 1.55, 0, 0.05, 0.05, 0.45, '#4a3a2a', Math.PI / 2, 0, 0.3); Ll.esfera(0.38, 1.38, 0, 0.13, '#b8ffe8', 0); halo(0.38, 1.38, 0, 1.2, 0x9affe0); charco(0.38, 0, 3, 0x9affe0); bloquear(p.x, p.z, 0.3, 0.3, 0); },
      flores_brillo(p) { const cols = ['#7ff0ff', '#ff8ae8', '#c79bff', '#b8ffb0']; for (let k = 0; k < 7; k++) { const x = (hash(k, p.x) - 0.5) * 0.9, z = (hash(p.z, k) - 0.5) * 0.9, h = 0.2 + hash(k, k) * 0.25; L.cajaB(x, 0, z, 0.02, h, 0.02, '#3a7a5a'); Lb.esfera(x, h, z, 0.06, cols[k % 4], 0); } halo(0, 0.25, 0, 1.1, 0x9ad8ff); },
      // --- puentes y entradas ---
      arco_isla(p) {
        const ab = 3.35;
        for (const s of [-1, 1]) { L.cajaB(s * ab, 0, 0, 0.5, 4.2, 0.5, p.c); L.cajaB(s * ab, 0, 0, 0.7, 0.4, 0.7, tono(p.c, 0.7)); L.cajaB(s * ab, 4.2, 0, 0.62, 0.2, 0.62, tono(p.c, 0.7)); Ll.esfera(s * ab, 4.55, 0, 0.18, '#fff0c0', 0); halo(s * ab, 4.55, 0, 1.4, 0xffe0a0); }
        L.cajaB(0, 3.55, 0, 2 * ab + 0.6, 0.95, 0.22, tono(p.c, 0.75));
        plan('carteles', matCartel).agregar(0, 4.02, 0.115, 2 * ab - 0.3, (2 * ab - 0.3) / 8, uvTexto(p.texto, p.t), 0);
        plan('carteles', matCartel).agregar(0, 4.02, -0.115, 2 * ab - 0.3, (2 * ab - 0.3) / 8, uvTexto(p.texto, p.t), Math.PI);
        for (let k = 0; k < 9; k++) { const u = -ab + 0.4 + k * (2 * ab - 0.8) / 8; Lb.esfera(u, 3.48, 0.12, 0.05, k % 2 ? '#ffe680' : p.c2, 0); }
        for (const s of [-1, 1]) { const q = local(s * ab, 0, 0); bloquear(q.x, q.z, 0.6, 0.6, 0); }
      },
      // ================= cinco islas nuevas =================
      // --- Mega Mall ---
      mall_edificio(p) {
        const w = p.w, d = p.d, h = p.h, zf = d / 2, pisos = 3, alto = h / pisos, lp = p.cc;
        L.cajaB(0, 0, 0, w, h, d, '#d8dde3');
        for (let k = 0; k <= pisos; k++) L.cajaB(0, k * alto - 0.08, zf + 0.04, w + 0.1, 0.16, 0.1, k % 3 ? '#f4f4f0' : lp);
        // vitrinas por piso
        const col = ['#d64541', '#3a8fd8', '#f2c230', '#5aa046', '#c06ad8', '#f28a2a'];
        for (let k = 0; k < pisos; k++) for (let i = 0; i < 11; i++) {
          if (k === 0 && i >= 4 && i <= 6) continue;
          const x = -w / 2 + 1.3 + i * (w - 2.6) / 10, y = k * alto + 0.3;
          L.cajaB(x, y, zf + 0.03, 1.9, alto - 0.5, 0.05, '#3a4656');
          Ll.cajaB(x, y + 0.06, zf + 0.06, 1.76, alto - 0.62, 0.03, '#bfe8ff');
          L.cajaB(x, y + alto - 0.72, zf + 0.09, 1.76, 0.2, 0.05, col[(i + k * 2) % 6]);
          if (k === 0) for (let m = 0; m < 3; m++) L.cajaB(x - 0.5 + m * 0.5, y + 0.08, zf + 0.09, 0.3, 0.5 + (m % 2) * 0.25, 0.03, col[(i + m) % 6]);
          if (i % 3 === 0) halo(x, y + 0.9, zf + 0.3, 1.1, 0xbfe8ff);
        }
        // entrada: atrio de vidrio con cúpula
        L.cajaB(0, 0, zf + 0.8, 6.4, 3.0, 1.6, '#c9d6e0');
        L.cajaB(0, 0, zf + 1.6, 4.6, 2.4, 0.06, '#3a4656'); Ll.cajaB(0, 0.05, zf + 1.64, 4.4, 2.3, 0.03, '#d8f2ff');
        for (const x of [-1.5, 0, 1.5]) L.cajaB(x, 0, zf + 1.68, 0.08, 2.4, 0.04, '#7a8694');
        L.cajaB(0, 2.98, zf + 0.8, 6.7, 0.18, 1.9, lp);
        L.cajaB(0, h, 0, w + 0.3, 0.24, d + 0.3, '#aab2bc');
        for (const x of [-8, 8]) { L.cajaB(x, h + 0.24, -1, 3, 0.7, 2.4, '#8a929c'); for (let m = 0; m < 3; m++) L.cil(x - 0.8 + m * 0.8, h + 0.94, -1, 0.26, 0.1, '#5a6270', 8); }
        for (let k = 0; k < 7; k++) { const r = 2.6 * Math.cos(k / 7 * Math.PI / 2), y = h + 0.24 + 1.6 * Math.sin(k / 7 * Math.PI / 2); Ll.cil(0, y, 0.6, r, 0.24, k % 2 ? '#bfe8ff' : '#a8d8f4', 14); }
        // letrero sobre el atrio
        L.cajaB(0, h - 2.15, zf + 0.12, 9.2, 1.5, 0.2, lp);
        plan('carteles', matCartel).agregar(0, h - 1.4, zf + 0.225, 8.8, 1.1, uvTexto(p.texto, p.t), 0);
        halo(0, h - 1.4, zf + 0.8, 5.0, 0xff7ab0, true);
        for (const x of [-5, 0, 5]) charco(x, zf + 2.4, 6.0, 0xbfe8ff);
        bloquear(p.x, p.z, w, d, p.r); bloquear(p.x, p.z + zf + 0.8, 6.4, 1.6, p.r);
      },
      parqueo(p) {
        const w = p.w, d = p.d;
        for (const z of [-d / 2 + 2.2, d / 2 - 2.2]) for (let k = 0; k <= 4; k++) L.cajaB(-w / 2 + 0.3 + k * 2.9, 0.012, z, 0.08, 0.006, 3.6, '#e8e6e0');
        for (let k = 0; k < 5; k++) L.cajaB(-w / 2 + 1.2 + k * 2.5, 0.012, 0, 1.3, 0.006, 0.12, '#f2d65a');
      },
      poste_precio(p) {
        L.cajaB(0, 0, 0, 0.18, 4.0, 0.18, '#3a4656'); L.cajaB(0, 3.0, 0, 3.2, 1.0, 0.16, p.cc);
        plan('carteles', matCartel).agregar(0, 3.5, 0.085, 3.0, 0.75, uvTexto(p.texto, p.t), 0);
        plan('carteles', matCartel).agregar(0, 3.5, -0.085, 3.0, 0.75, uvTexto(p.texto, p.t), Math.PI);
        halo(0, 3.5, 0.2, 1.8, 0xff7ab0, true); bloquear(p.x, p.z, 0.3, 0.3, p.r);
      },
      // --- Avenida de la Comida ---
      restaurante(p) {
        const w = p.w, d = p.d, h = p.h, c = p.c, c2 = p.c2, zf = d / 2, m = p.marca;
        L.cajaB(0, 0, 0, w, h, d, c); L.cajaB(0, 0, 0, w + 0.08, 0.3, d + 0.08, tono(c, 0.7));
        // ventanales y puerta
        for (const x of [-2.5, -0.9, 0.9, 2.5]) { L.cajaB(x, 0.5, zf + 0.02, 1.4, 1.4, 0.05, tono(c2, 0.75)); Ll.cajaB(x, 0.56, zf + 0.05, 1.26, 1.28, 0.03, '#ffe6b0'); halo(x, 1.2, zf + 0.3, 1.0, 0xffd890); }
        L.cajaB(0, 0, zf + 0.06, 1.1, 1.95, 0.06, '#3a2a20'); Ll.cajaB(0, 0.1, zf + 0.1, 0.9, 1.75, 0.03, '#ffeec8');
        for (let k = 0; k < 14; k++) L.caja(-w / 2 + (k + 0.5) * w / 14, 2.12, zf + 0.42, w / 14 + 0.005, 0.05, 0.86, k % 2 ? c2 : '#f8f4ec', 0, 0.35);
        // letrero al frente
        L.cajaB(0, h - 0.68, zf + 0.04, 5.8, 0.82, 0.14, p.cc);
        plan('carteles', matCartel).agregar(0, h - 0.27, zf + 0.115, 5.5, 0.68, uvTexto(p.texto, p.t), 0);
        // techo y detalle de cada marca
        if (m === 'pizzahut') {
          // el techo rojo en forma de trapecio, con su cresta
          for (let k = 0; k < 7; k++) { const e = 1 - k / 8.5; L.cajaB(0, h + k * 0.28, 0, (w + 0.8) * e, 0.3, (d + 0.8) * e, k % 2 ? c2 : tono(c2, 0.86)); }
          L.cajaB(0, h + 1.96, 0, w * 0.32, 0.5, d * 0.32, tono(c2, 0.7));
          // porción de pizza gigante
          L.cil(2.4, h + 0.2, 0, 0.09, 0.8, '#7a6250', 6);
          L.empujarRot(2.4, h + 2.4, 0.6, 0.9, 0, 0);
          for (let k = 0; k < 6; k++) L.cajaB(0, 0, -1.1 + k * 0.4, 2.0 - k * 0.32, 0.12, 0.42, k === 0 ? '#c88a44' : '#f2c84a');
          for (const [x, z] of [[-0.4, -0.5], [0.3, -0.3], [0, 0.2], [-0.15, -0.9]]) L.cil(x, 0.11, z, 0.16, 0.04, '#c8302a', 8);
          L.soltar();
        } else {
          L.cajaB(0, h, 0, w + 0.24, 0.2, d + 0.24, c2); L.cajaB(0, h + 0.2, 0, w - 0.5, 0.26, d - 0.5, tono(c2, 0.82));
        }
        const y0 = h + 0.46;
        if (m === 'popeyes') {
          // pieza de pollo frito gigante
          L.empujarRot(-1.6, y0 + 1.4, 0, 0, 0.4, 0.5);
          for (const [x, y, z, r, k] of [[0, 0.4, 0, 1.0, '#c8782a'], [0.4, 0.7, 0.3, 0.7, '#d68a34'], [-0.4, 0.75, -0.2, 0.68, '#b86a22'], [0.1, -0.1, -0.3, 0.74, '#d0802e']]) L.esfera(x, y, z, r, k, 1);
          L.cil(0, -1.6, 0, 0.18, 1.1, '#f4e8d0', 8); L.esfera(0.08, -1.62, 0, 0.22, '#f4e8d0', 0); L.esfera(-0.08, -1.62, 0, 0.22, '#f4e8d0', 0);
          L.soltar();
          L.cajaB(2.0, y0, 0, 2.2, 0.5, 2.2, '#f2a52a');
        } else if (m === 'mcdonalds') {
          // la M dorada sobre un poste
          L.cajaB(w / 2 - 0.6, 0, zf - 0.4, 0.2, h + 3, 0.2, '#6a7078');
          for (const s of [-1, 1]) for (let k = 0; k < 10; k++) {
            const a = k / 9 * Math.PI, x = s * 0.72 + Math.cos(a) * 0.72, y = h + 2.4 + Math.sin(a) * 1.5;
            L.caja(w / 2 - 0.6 + x, y, zf - 0.4, 0.3, 0.34, 0.2, '#ffc82a');
          }
          for (const s of [-1, 1]) L.cajaB(w / 2 - 0.6 + s * 1.44, h + 1.4, zf - 0.4, 0.3, 1.0, 0.2, '#ffc82a');
          halo(w / 2 - 0.6, h + 3.4, zf, 3.0, 0xffc82a, true);
        } else if (m === 'kfc') {
          // cubeta de pollo a rayas
          const n = 12;
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; L.empujarRot(Math.sin(a) * 1.05, y0 + 0.9, Math.cos(a) * 1.05, 0, a, 0); L.cajaB(0, -0.9, 0, 0.58, 1.9, 0.08, k % 2 ? '#c8202a' : '#f8f4ec'); L.soltar(); }
          L.cil(0, y0 + 1.7, 0, 1.0, 0.12, '#d0802e', 12);
          for (const [x, z, r] of [[-0.4, 0.2, 0.55], [0.35, -0.3, 0.6], [0.2, 0.4, 0.48], [-0.2, -0.4, 0.46]]) L.esfera(x, y0 + 1.95, z, r, '#c8782a', 1);
        } else if (m === 'burger') {
          // hamburguesa gigante
          const b = [[0.3, '#d8963c', 1.45], [0.14, '#5a3220', 1.5], [0.08, '#f2c23a', 1.56], [0.1, '#c8302a', 1.42], [0.1, '#6ab04a', 1.6]];
          let y = y0;
          for (const [h2, col, r] of b) { L.cil(0, y, 0, r, h2, col, 14); y += h2; }
          L.esfera(0, y, 0, 1.46, '#e0a048', 1, 1, 0.56, 1);
          for (let k = 0; k < 7; k++) L.esfera(Math.cos(k * 1.3) * 0.75, y + 0.72, Math.sin(k * 1.3) * 0.75, 0.06, '#f8ecc8', 0, 1, 0.5, 1.4);
        } else if (m === 'starbucks') {
          // vaso gigante
          for (let k = 0; k < 8; k++) L.cil(0, y0 + k * 0.32, 0, 0.78 + k * 0.06, 0.33, k >= 3 && k <= 5 ? '#0f6a42' : '#f8f4ec', 14);
          L.cil(0, y0 + 2.56, 0, 1.3, 0.14, '#f8f4ec', 14); L.cil(0, y0 + 2.7, 0, 1.0, 0.24, '#f8f4ec', 14); L.cil(0, y0 + 2.94, 0, 0.1, 0.8, '#0f6a42', 6);
        }
        charco(0, zf + 1.6, 6.0, 0xffd890);
        bloquear(p.x, p.z, w, d, p.r);
      },
      // --- Parque de Diversiones ---
      rueda_fortuna(p) {
        const R = p.radio, yc = R + 1.1, z0 = 0;
        for (const s of [-1, 1]) { L.caja(-1.5, yc / 2, z0 + s * 0.62, 0.3, yc + 0.8, 0.3, '#5a6270', 0, 0, -0.3); L.caja(1.5, yc / 2, z0 + s * 0.62, 0.3, yc + 0.8, 0.3, '#5a6270', 0, 0, 0.3); }
        L.cilC(0, yc, z0, 0.26, 1.5, '#8a929c', 10, Math.PI / 2);
        L.cajaB(0, 0, 0, 6.4, 0.2, 2.4, '#7a8694');
        L.cajaB(0, 0, 2.2, 3.2, 1.0, 1.6, '#e0457b'); L.cajaB(0, 1.0, 2.2, 3.4, 0.12, 1.8, '#fff0f6');
        const q = local(0, yc, z0), rue = new THREE.Group(), LR = new G.Lote(), n = 8;
        rue.position.set(q.x, q.y, q.z); rue.rotation.y = rad(p.r || 0);
        const giro = new THREE.Group(); rue.add(giro);
        for (const s of [-1, 1]) {
          for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; LR.caja(Math.cos(a) * R, Math.sin(a) * R, s * 0.46, 2 * R * Math.sin(Math.PI / 28) + 0.04, 0.12, 0.12, '#e8473f', 0, 0, a + Math.PI / 2); }
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; LR.caja(Math.cos(a) * R / 2, Math.sin(a) * R / 2, s * 0.46, R, 0.07, 0.07, '#f4f4f0', 0, 0, a); }
        }
        giro.add(LR.malla(MAT.solido));
        const cabinas = [], cols = ['#3a8ae0', '#f2c230', '#5aa046', '#e04f5f'];
        for (let k = 0; k < n; k++) {
          const LC = new G.Lote(), c = cols[k % 4];
          LC.cajaB(0, -0.92, 0, 0.9, 0.5, 0.86, c); LC.cajaB(0, -0.42, 0, 0.06, 0.34, 0.06, '#5a6270'); LC.cajaB(0, -0.12, 0, 0.98, 0.1, 0.94, tono(c, 0.75));
          if (k % 3 !== 2) { pasajero(LC, -0.2, -0.74, 0, k); pasajero(LC, 0.2, -0.74, 0, k + 3); }
          for (const [x, zz] of [[-0.42, -0.4], [0.42, -0.4], [-0.42, 0.4], [0.42, 0.4]]) LC.cajaB(x, -0.42, zz, 0.04, 0.32, 0.04, '#5a6270');
          const mc = LC.malla(MAT.solido); rue.add(mc); cabinas.push({ mc, a: k / n * Math.PI * 2 });
        }
        destino.add(rue);
        animados.push({ act: (t) => { const a = t / 9000; giro.rotation.z = a; for (const c of cabinas) c.mc.position.set(Math.cos(c.a + a) * R, Math.sin(c.a + a) * R, 0); } });
        halo(0, yc, 0.8, 5.5, 0xff7a9a); charco(0, 2, 7.0, 0xffb0c8);
        bloquear(p.x, p.z, 6.4, 2.4, p.r); bloquear(p.x, p.z + 2.2, 3.2, 1.6, p.r);
      },
      montana_rusa(p) {
        const esc = p.escala || 1, alt = p.alto || 1;
        // curva cerrada alrededor de la zona: x y z locales y altura con una gran subida
        const cur = (s) => {
          const a = s * Math.PI * 2, x = Math.cos(a) * (6.2 + Math.sin(a * 2) * 0.7) * esc, z = Math.sin(a) * 3.8 * esc;
          return [x, 1.1 + (3.4 * (0.5 + 0.5 * Math.sin(a * 3 + 1.2)) + 2.6 * Math.max(0, Math.sin(a - 0.4))) * alt, z];
        };
        const n = 110, pts = [];
        for (let k = 0; k < n; k++) pts.push(cur(k / n));
        for (let k = 0; k < n; k++) {
          const a = pts[k], b = pts[(k + 1) % n], lx = b[0] - a[0], ly = b[1] - a[1], lz = b[2] - a[2], len = Math.hypot(lx, ly, lz);
          const ry = Math.atan2(lx, lz), rx = -Math.atan2(ly, Math.hypot(lx, lz));
          L.empujarRot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 0, ry, 0);
          L.empujarRot(0, 0, 0, rx, 0, 0);
          L.caja(0.22, 0, 0, 0.07, 0.07, len + 0.05, '#e8473f'); L.caja(-0.22, 0, 0, 0.07, 0.07, len + 0.05, '#e8473f');
          if (k % 2 === 0) L.caja(0, -0.04, 0, 0.5, 0.04, 0.1, '#3a4656');
          L.soltar(); L.soltar();
          if (k % 5 === 0) { L.cajaB(a[0], 0, a[2], 0.1, a[1] - 0.04, 0.1, '#f4f4f0'); }
        }
        const zf = 4.6 * esc, cm = p.alto ? '#3a5ae0' : '#e8473f';
        L.cajaB(0, 0, zf, 7.0 * esc, 0.5, 1.2, '#7a8694'); L.cajaB(0, 2.3, zf, 7.4 * esc, 0.12, 1.4, cm);
        for (const x of [-3.2, 3.2]) L.cajaB(x * esc, 0.5, zf, 0.12, 1.8, 0.12, '#5a6270');
        const c0 = local(0, 0, 0), ry0 = rad(p.r || 0), carros = [];
        const raizR = new THREE.Group(); raizR.position.set(c0.x, 0, c0.z); raizR.rotation.y = ry0;
        for (let k = 0; k < 3; k++) {
          const LC = new G.Lote(), col = ['#f2c230', '#3a8ae0', '#e0457b'][k];
          LC.cajaB(0, 0, 0, 0.56, 0.28, 0.76, col); LC.cajaB(0, 0.28, -0.3, 0.56, 0.2, 0.1, tono(col, 0.75));
          pasajero(LC, -0.13, 0.2, 0.05, k); pasajero(LC, 0.13, 0.2, 0.05, k + 2);
          const mc = LC.malla(MAT.solido); raizR.add(mc); carros.push(mc);
        }
        destino.add(raizR);
        let s = 0, ult = 0;
        animados.push({ act: (t) => {
          const dt = Math.min(0.1, (t - ult) / 1000 || 0.016); ult = t;
          const h0 = cur(s)[1];
          s = (s + dt * (0.03 + 0.05 * Math.sqrt(Math.max(0.05, (8 - h0) / 7)))) % 1;
          carros.forEach((m, k) => {
            const u = (s + 1 - k * 0.018) % 1, a = cur(u), b = cur((u + 0.004) % 1);
            m.position.set(a[0], a[1] + 0.06, a[2]); m.rotation.set(0, Math.atan2(b[0] - a[0], b[2] - a[2]), 0);
          });
        } });
        bloquear(p.x, p.z + zf, 7.0 * esc, 1.2, p.r);
      },
      carrusel(p) {
        const R = 3.0;
        L.cil(0, 0, 0, R + 0.25, 0.3, '#f8e8d0', 18); L.cil(0, 0.3, 0, 0.5, 2.6, '#f2c230', 10);
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; L.empujarRot(0, 3.5, 0, 0, a, 0); L.caja(0, 0, 1.75, 1.72, 0.1, 3.4, k % 2 ? '#e0457b' : '#fff0f6', 0, 0.5); L.soltar(); }
        L.cono(0, 4.2, 0, 0.5, 0.8, '#e0457b', 10); Lb.esfera(0, 5.05, 0, 0.14, '#ffe680', 0);
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; Ll.esfera(Math.cos(a) * 3.1, 2.68, Math.sin(a) * 3.1, 0.07, '#ffe680', 0); }
        const q = local(0, 0, 0), g = new THREE.Group(), LC = new G.Lote();
        g.position.set(q.x, 0.3, q.z);
        ['#f4f4f0', '#3a8ae0', '#e04f5f', '#f2c230', '#5aa046', '#c06ad8'].forEach((c, k) => {
          const a = k / 6 * Math.PI * 2, x = Math.cos(a) * 2.2, z = Math.sin(a) * 2.2;
          LC.cil(x, 0, z, 0.05, 2.5, '#e8d090', 6);
          LC.empujar(x, 0.72, z, -a);
          LC.cajaB(0, 0, 0, 0.32, 0.4, 0.86, c); LC.cajaB(0, 0.35, 0.42, 0.26, 0.42, 0.26, c); LC.cajaB(0, 0.7, 0.54, 0.22, 0.2, 0.4, c);
          for (const [lx, lz] of [[-0.1, 0.32], [0.1, 0.32], [-0.1, -0.32], [0.1, -0.32]]) LC.cajaB(lx, -0.32, lz, 0.08, 0.34, 0.08, c);
          if (k % 2 === 0) pasajero(LC, 0, 0.42, -0.08, k);
          LC.soltar();
        });
        g.add(LC.malla(MAT.solido)); destino.add(g);
        animados.push({ act: (t) => { g.rotation.y = t / 2600; } });
        halo(0, 2.6, 0, 4.0, 0xffd890); charco(0, 0, 7.0, 0xffc8d8);
        bloquearCirculo(p.x, p.z, R + 0.4);
      },
      chocones(p) {
        const w = p.w, d = p.d;
        L.cajaB(0, 0, 0, w, 0.14, d, '#3a3f4a');
        for (const [x, z, l, a] of [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, 1], [w / 2, 0, d, 1]]) L.cajaB(x, 0.14, z, a ? 0.18 : l + 0.18, 0.36, a ? l : 0.18, '#f2c230');
        for (const [x, z] of [[-w / 2 + 0.2, -d / 2 + 0.2], [w / 2 - 0.2, -d / 2 + 0.2], [-w / 2 + 0.2, d / 2 - 0.2], [w / 2 - 0.2, d / 2 - 0.2]]) L.cajaB(x, 0, z, 0.16, 2.9, 0.16, '#5a6270');
        L.cajaB(0, 2.9, 0, w + 0.3, 0.14, d + 0.3, '#7a3ae0'); L.cajaB(0, 3.04, 0, w * 0.7, 0.12, d * 0.7, '#e0457b');
        for (let k = 0; k < 8; k++) { Ll.esfera(-w / 2 + 0.5 + k * (w - 1) / 7, 2.82, -d / 2 + 0.3, 0.08, '#ffe680', 0); Ll.esfera(-w / 2 + 0.5 + k * (w - 1) / 7, 2.82, d / 2 - 0.3, 0.08, '#ffe680', 0); }
        const q = local(0, 0, 0), g = new THREE.Group(); g.position.set(q.x, 0.16, q.z); g.rotation.y = rad(p.r || 0);
        const autos = ['#e04f5f', '#3a8ae0', '#f2c230', '#5aa046'].map((c, k) => {
          const LC = new G.Lote();
          pasajero(LC, 0, 0.3, 0.12, k); LC.cajaB(0, 0.02, 0, 0.9, 0.3, 1.3, c); LC.cajaB(0, 0.32, -0.2, 0.6, 0.2, 0.5, tono(c, 0.7)); LC.cajaB(0, 0, 0, 1.0, 0.1, 1.4, '#2a2a30'); LC.cajaB(0, 0.3, 0, 0.04, 0.7, 0.04, '#9aa0a8');
          const m = LC.malla(MAT.solido); g.add(m); return { m, f: k * 1.57 + 0.5, v: 0.00052 + k * 0.00009 };
        });
        destino.add(g);
        animados.push({ act: (t) => {
          for (const a of autos) {
            const px = Math.sin(t * a.v + a.f) * (w / 2 - 1), pz = Math.sin(t * a.v * 1.73 + a.f * 2) * (d / 2 - 1);
            const dx = Math.cos(t * a.v + a.f) * (w / 2 - 1), dz = 1.73 * Math.cos(t * a.v * 1.73 + a.f * 2) * (d / 2 - 1);
            a.m.position.set(px, 0, pz); a.m.rotation.y = Math.atan2(dx, dz);
          }
        } });
        halo(0, 2.6, 0, 4.0, 0xff7ad0); charco(0, 0, 8.0, 0xff9ad8);
        for (const [x, z, w2, d2] of [[0, -d / 2, w, 0.3], [0, d / 2, w, 0.3], [-w / 2, 0, 0.3, d], [w / 2, 0, 0.3, d]]) { const q2 = local(x, 0, z); bloquear(q2.x, q2.z, w2, d2, p.r); }
        bloquear(p.x, p.z, w, d, p.r);
      },
      torre_caida(p) {
        const h = p.h;
        L.cajaB(0, 0, 0, 3.0, 0.3, 3.0, '#7a8694'); L.cajaB(0, 0.3, 0, 0.8, h, 0.8, '#d8dde3');
        for (let k = 1; k < 8; k++) L.cajaB(0, k * h / 8, 0, 0.92, 0.12, 0.92, k % 2 ? '#e0457b' : '#3ad0e0');
        L.cajaB(0, h + 0.3, 0, 1.4, 0.4, 1.4, '#e0457b'); L.cono(0, h + 0.7, 0, 0.6, 1.0, '#c8202a', 8); Lb.esfera(0, h + 1.8, 0, 0.14, '#ff3030', 0);
        const q = local(0, 0, 0), LC = new G.Lote();
        LC.cil(0, 0, 0, 1.5, 0.34, '#f2c230', 14); LC.cil(0, 0.34, 0, 1.56, 0.1, '#e0457b', 14);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; LC.cajaB(Math.cos(a) * 1.25, -0.5, Math.sin(a) * 1.25, 0.34, 0.5, 0.34, ['#3a8ae0', '#e04f5f'][k % 2]); if (k % 2) pasajero(LC, Math.cos(a) * 1.25, -0.42, Math.sin(a) * 1.25, k); }
        const m = LC.malla(MAT.solido); m.position.set(q.x, 2, q.z); destino.add(m);
        animados.push({ act: (t) => { const f = (t % 12000) / 12000; const y = f < 0.6 ? 1.1 + (h - 1.6) * (f / 0.6) : f < 0.72 ? h - 0.5 : f < 0.78 ? (h - 0.5) - (h - 1.6) * Math.pow((f - 0.72) / 0.06, 2) : 1.1; m.position.y = y; } });
        bloquear(p.x, p.z, 3.0, 3.0, p.r);
      },
      puesto_feria(p) {
        const c = p.c;
        L.cajaB(0, 0, 0, 4.6, 0.95, 1.8, '#f4ece0'); L.cajaB(0, 0.95, 0.4, 4.7, 0.1, 1.0, tono(c, 0.8));
        L.cajaB(0, 0, -0.8, 4.6, 2.3, 0.14, tono(c, 0.85));
        for (const s of [-1, 1]) { L.cajaB(s * 2.2, 0, 0.8, 0.12, 2.5, 0.12, '#6a5240'); L.cajaB(s * 2.2, 0, -0.8, 0.12, 2.5, 0.12, '#6a5240'); }
        for (let k = 0; k < 10; k++) L.caja(-2.25 + k * 0.5, 2.62, 0, 0.5, 0.06, 2.3, k % 2 ? c : '#f8f4ec', 0, 0.22);
        for (let k = 0; k < 7; k++) L.esfera(-1.8 + k * 0.6, 1.24, 0.3, 0.17, ['#ff8ac0', '#3ab0e0', '#f2c230', '#7fbf4a', '#c06ad8', '#e04f5f', '#ffffff'][k], 0);
        L.cajaB(0, 2.6, -0.76, 3.6, 0.5, 0.1, p.cc);
        plan('carteles', matCartel).agregar(0, 2.85, -0.7, 3.4, 0.42, uvTexto(p.texto, p.t), 0);
        for (let k = 0; k < 5; k++) Ll.esfera(-2.0 + k, 2.48, 1.1, 0.06, '#ffe680', 0);
        charco(0, 1.6, 4.2, 0xffd890);
        bloquear(p.x, p.z, 4.6, 1.8, p.r);
      },
      // --- Japón ---
      monte_fuji(p) {
        const R = p.radio, H = p.h, n = 11;
        for (let k = 0; k < n; k++) {
          const u = k / n, r = R * Math.pow(1 - u, 1.3) + 0.45, y = u * H;
          const c = u > 0.62 ? (k % 2 ? '#f4f8fc' : '#e8eff6') : u > 0.5 ? '#c8d4e2' : (k % 2 ? '#5a6e8a' : '#647a98');
          L.cil(0, y, 0, r, H / n + 0.02, c, 16);
        }
        // lenguas de nieve que bajan por la ladera
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2, d = 1.25 + (k % 2) * 0.3; L.cajaB(Math.sin(a) * d, H * 0.47, Math.cos(a) * d, 0.42, 0.5 + (k % 2) * 0.35, 0.42, '#eef3f8', a); }
        L.cil(0, H, 0, 0.32, 0.08, '#8a96a6', 10);
        for (let k = 0; k < 7; k++) { const a = k * 0.9; L.esfera(Math.cos(a) * (R * 0.72), H * 0.32 + (k % 3) * 0.2, Math.sin(a) * (R * 0.72), 0.55 + (k % 2) * 0.25, '#ffffff', 0, 1.5, 0.5, 1); }
        bloquearCirculo(p.x, p.z, R + 0.4);
      },
      torre_tokio(p) {
        const h = p.h, n = 18, c1 = '#e8541f', c2 = '#f4f4f0';
        const ancho = (u) => 3.4 * Math.pow(1 - u, 1.9) + 0.22;
        for (let k = 0; k < n; k++) {
          const u = k / n, y = u * h, a = ancho(u) / 2, b = ancho((k + 1) / n) / 2, c = k % 4 < 2 ? c1 : c2, ph = h / n + 0.02, inc = Math.atan2(a - b, h / n);
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.caja(sx * (a + b) / 2, y + ph / 2, sz * (a + b) / 2, 0.11, ph, 0.11, c, 0, sx * sz * 0, 0);
          for (const s of [-1, 1]) { L.cajaB(0, y, s * a, a * 2, 0.05, 0.05, c); L.cajaB(s * a, y, 0, 0.05, 0.05, a * 2, c); }
          void inc;
        }
        const yo = h * 0.44, yp = h * 0.74;
        L.cajaB(0, yo, 0, 1.5, 0.5, 1.5, c2); Ll.cajaB(0, yo + 0.12, 0, 1.54, 0.2, 1.54, '#ffe2a0'); L.cajaB(0, yo + 0.5, 0, 1.6, 0.08, 1.6, c1);
        L.cajaB(0, yp, 0, 0.7, 0.3, 0.7, c2); Ll.cajaB(0, yp + 0.08, 0, 0.74, 0.14, 0.74, '#ffe2a0');
        L.cajaB(0, h, 0, 0.12, 2.4, 0.12, c1); Lb.esfera(0, h + 2.45, 0, 0.1, '#ff3030', 0);
        L.cajaB(0, 0, 0, 3.8, 0.24, 3.8, '#8a929c');
        halo(0, yo + 0.2, 0, 2.6, 0xffb060); halo(0, h + 2.4, 0, 1.2, 0xff4030, true); charco(0, 0, 6.0, 0xffb060);
        bloquear(p.x, p.z, 3.8, 3.8, p.r);
      },
      shinkansen(p) {
        // viaducto de lado a lado de la isla y el tren bala yendo y viniendo por arriba
        const w = p.w, y = 2.9;
        L.cajaB(0, y - 0.28, 0, w + 1.2, 0.28, 1.0, '#c9ced6');
        for (const s of [-1, 1]) L.cajaB(0, y, s * 0.46, w + 1.2, 0.16, 0.06, '#8a929c');
        for (const s of [-1, 1]) L.cajaB(0, y, s * 0.2, w + 1.2, 0.05, 0.05, '#5a6270');
        for (let x = -w / 2 + 1; x <= w / 2 - 0.5; x += 5) { L.cajaB(x, 0, 0, 0.34, y - 0.28, 0.5, '#aab2bc'); const q = local(x, 0, 0); bloquear(q.x, q.z, 0.4, 0.5, p.r); }
        const LT = new G.Lote(), bl = '#f4f6f8', az = '#2a5ac8', vid = '#20283a';
        for (const i of [-1, 0, 1]) {
          LT.cajaB(i * 3.05, 0.08, 0, 3.0, 0.72, 0.76, bl); LT.cajaB(i * 3.05, 0.22, 0, 3.02, 0.12, 0.78, az);
          for (let k = 0; k < 7; k++) LT.cajaB(i * 3.05 - 1.2 + k * 0.4, 0.46, 0, 0.26, 0.17, 0.78, vid);
          LT.cajaB(i * 3.05, 0.8, 0, 2.9, 0.05, 0.56, '#c8ccd2');
        }
        for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const e = 1 - k / 7.5; LT.cajaB(s * (4.75 + k * 0.32), 0.08 + (1 - e) * 0.1, 0, 0.34, 0.72 * e, 0.76 * Math.sqrt(e), k < 2 ? bl : (k < 4 ? az : bl)); }
        for (const s of [-1, 1]) LT.cajaB(s * 5.05, 0.5, 0, 0.5, 0.2, 0.7, vid);
        const tren = new THREE.Group(), q0 = local(0, y, 0);
        tren.add(LT.malla(MAT.solido));
        tren.position.set(q0.x, y + 0.14, q0.z);
        tren.rotation.y = rad(p.r || 0);
        destino.add(tren);
        const fin = w / 2 - 4.2, ax = Math.cos(rad(p.r || 0)), az2 = -Math.sin(rad(p.r || 0));
        animados.push({ act: (t) => { const f = (t % 16000) / 16000, u = f < 0.4 ? -1 + 2 * (0.5 - 0.5 * Math.cos(f / 0.4 * Math.PI)) : f < 0.5 ? 1 : f < 0.9 ? 1 - 2 * (0.5 - 0.5 * Math.cos((f - 0.5) / 0.4 * Math.PI)) : -1; const d = u * fin; tren.position.x = q0.x + ax * d; tren.position.z = q0.z + az2 * d; } });
      },
      maneki(p) {
        const b = '#fbf8f0', r = '#c8202a', o = '#e8b83a';
        L.cajaB(0, 0, 0, 1.5, 0.24, 1.5, '#8f8a7e');
        L.cajaB(0, 0.24, 0, 1.2, 1.2, 1.0, b); L.cajaB(0, 1.2, 0, 1.26, 0.14, 1.06, r); L.cajaB(0, 1.04, 0.54, 0.26, 0.26, 0.08, o);
        L.cajaB(0, 1.34, 0, 1.24, 0.96, 1.0, b); for (const s of [-1, 1]) { L.caja(s * 0.4, 2.42, 0.05, 0.3, 0.32, 0.22, b, 0, 0, -s * 0.2); L.cajaB(s * 0.3, 1.76, 0.51, 0.16, 0.2, 0.04, '#1a1a1e'); L.cajaB(s * 0.3, 1.8, 0.53, 0.05, 0.08, 0.03, '#fff'); }
        L.cajaB(0, 1.6, 0.51, 0.1, 0.07, 0.04, '#e8809a'); L.cajaB(0.42, 0.42, 0.52, 0.34, 0.5, 0.05, o);
        const q = local(-0.72, 1.3, 0.1), LB = new G.Lote(), g = new THREE.Group();
        LB.cajaB(0, 0, 0, 0.32, 0.8, 0.34, b); LB.cajaB(0, 0.74, 0.1, 0.34, 0.26, 0.2, b);
        g.add(LB.malla(MAT.solido)); g.position.set(q.x, q.y, q.z); g.rotation.y = rad(p.r || 0); destino.add(g);
        animados.push({ act: (t) => { g.rotation.x = -0.35 + Math.sin(t / 420) * 0.32; } });
        bloquear(p.x, p.z, 1.5, 1.5, p.r);
      },
      dohyo(p) {
        L.cajaB(0, 0, 0, 5.4, 0.5, 5.4, '#c8a878'); L.cajaB(0, 0.5, 0, 5.0, 0.02, 5.0, '#d8bc90');
        for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; L.cajaB(Math.cos(a) * 2.0, 0.5, Math.sin(a) * 2.0, 0.34, 0.07, 0.34, '#a88a58', a); }
        for (const [x, z, c] of [[-2.4, -2.4, '#2a7a4a'], [2.4, -2.4, '#c8202a'], [-2.4, 2.4, '#1a1a1e'], [2.4, 2.4, '#f4f4f0']]) { L.cajaB(x, 0.5, z, 0.1, 2.4, 0.1, c); }
        L.cajaB(0, 2.9, 0, 5.8, 0.14, 5.8, '#7a4a2a'); L.cajaB(0, 3.04, 0, 4.0, 0.3, 4.0, '#5a3820');
        bloquear(p.x, p.z, 5.4, 5.4, p.r);
      },
      vapor(p) {
        const ms = [];
        for (let k = 0; k < 5; k++) {
          const a = k * 1.3, m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.24, depthWrite: false }));
          const q = local(Math.cos(a) * 2.2, 0.3, Math.sin(a) * 1.2); m.position.copy(q); destino.add(m); ms.push({ m, y: q.y, f: k * 0.9 });
        }
        animados.push({ act: (t) => { for (const v of ms) { const u = ((t / 3200) + v.f) % 1; v.m.position.y = v.y + u * 1.5; v.m.scale.setScalar(0.7 + u * 1.3); v.m.material.opacity = 0.26 * (1 - u); } } });
      },
      // --- Súper Parque ---
      castillo_fantasia(p) {
        const m = '#f6f1e8', m2 = '#e6dfd2', t = '#3a5ae0', t2 = '#e0457b', o = '#e8c24a';
        const torre = (x, z, r, h, c) => {
          L.cil(x, 0, z, r, h, m, 12); L.cil(x, h - 0.1, z, r + 0.14, 0.2, m2, 12); L.cono(x, h + 0.1, z, r + 0.2, r * 3.2, c, 12);
          L.cajaB(x, h + 0.1 + r * 3.2, z, 0.04, 0.5, 0.04, '#6a7078'); L.cajaB(x + 0.14, h + 0.36 + r * 3.2, z, 0.26, 0.16, 0.02, o);
          for (let k = 1; k <= Math.floor(h / 1.8); k++) { const a = k * 1.1 + 0.3; Ll.cajaB(x + Math.sin(0.78) * r, k * 1.7, z + Math.cos(0.78) * r, 0.24, 0.5, 0.05, '#ffe2a0'); void a; }
        };
        L.cajaB(0, 0, 0, 13, 3.4, 6.4, m); L.cajaB(0, 3.4, 0, 13.2, 0.16, 6.6, m2);
        for (let k = 0; k < 13; k++) for (const s of [-1, 1]) L.cajaB(-6 + k, 3.56, s * 3.2, 0.5, 0.36, 0.24, m);
        L.cajaB(0, 3.5, -0.4, 7.4, 2.8, 3.8, m); L.cajaB(0, 6.3, -0.4, 7.6, 0.14, 4.0, t);
        for (let k = 0; k < 5; k++) { const e = 1 - k / 5; L.cajaB(0, 6.44 + k * 0.42, -0.4, 7.2 * e, 0.42, 3.6 * e, k % 2 ? t : tono(t, 0.82)); }
        // puerta con arco y escalones
        L.cajaB(0, 0, 3.25, 2.0, 2.4, 0.12, m2); L.cajaB(0, 0, 3.32, 1.5, 1.9, 0.08, '#5a3820'); L.cajaB(0, 1.9, 3.32, 1.0, 0.24, 0.08, '#5a3820'); L.cajaB(0, 0.9, 3.38, 0.05, 0.05, 0.03, o);
        for (let k = 0; k < 3; k++) L.cajaB(0, k * 0.08 * -1 + 0.16, 3.6 + k * 0.3, 2.6 + k * 0.5, 0.08, 0.34, '#d8d0c0');
        L.cajaB(0, 2.5, 3.26, 3.4, 0.5, 0.1, t2); Lb.cajaB(0, 2.62, 3.32, 3.0, 0.22, 0.02, '#ffe9a8');
        torre(-5.9, 2.9, 0.9, 5.0, t); torre(5.9, 2.9, 0.9, 5.0, t); torre(-5.9, -2.9, 0.9, 6.2, t2); torre(5.9, -2.9, 0.9, 6.2, t2);
        torre(-3.1, 1.3, 0.62, 7.2, t2); torre(3.1, 1.3, 0.62, 7.2, t2); torre(0, -1.0, 0.95, 10.2, t);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; Ll.cajaB(-4.8 + k * 1.37, 1.5 + (k % 2) * 0.3, 3.22, 0.5, 0.7, 0.04, '#ffe2a0'); void a; }
        halo(0, 3.0, 3.6, 3.6, 0xffd890); charco(0, 4.4, 9.0, 0xffc8e0); for (const x of [-5.9, 5.9]) halo(x, 4.0, 3.6, 2.0, 0xc8d8ff);
        bloquear(p.x, p.z, 14.4, 7.0, p.r);
      },
      tobogan_agua(p) {
        L.cajaB(0, 0, 0, 1.4, 0.2, 1.4, '#8a929c');
        for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) L.cajaB(x, 0, z, 0.12, 5.2, 0.12, '#f2a83a');
        L.cajaB(0, 5.2, 0, 1.7, 0.14, 1.7, '#3a5ae0'); L.cajaB(0, 6.4, 0, 2.0, 0.1, 2.0, '#e0457b');
        for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) L.cajaB(x, 5.34, z, 0.06, 1.1, 0.06, '#f4f4f0');
        for (let k = 0; k < 10; k++) L.cajaB(0.74, 0.4 + k * 0.5, -0.74 + (k % 2) * 0.2, 0.28, 0.05, 0.14, '#6a7078');
        const curva = (fase, radio, y0, y1, col, vueltas, cx, cz) => {
          const n = 46;
          for (let k = 0; k < n; k++) {
            const u = k / n, a = fase + u * Math.PI * 2 * vueltas, x = cx + Math.cos(a) * radio, z = cz + Math.sin(a) * radio, y = y0 + (y1 - y0) * u;
            L.empujarRot(x, y, z, 0, -a, 0); L.cajaB(0, -0.08, 0, 0.62, 0.1, 0.5, col); for (const s of [-1, 1]) L.cajaB(s * 0.32, -0.04, 0, 0.06, 0.26, 0.5, col); Lb.cajaB(0, -0.0, 0, 0.5, 0.02, 0.5, '#9fe7ff'); L.soltar();
          }
        };
        curva(0.2, 1.7, 5.2, 0.5, '#f2c230', 1.3, 0, 0);
        // bajada larga y recta hasta la piscina
        for (let k = 0; k < 16; k++) { const u = k / 16, x = -1.5 - u * 3.2, y = 5.0 - u * 4.7, z = -1.2 + u * 1.5; L.empujarRot(x, y, z, 0, 0.42, 0); L.cajaB(0, -0.08, 0, 0.42, 0.1, 0.62, '#e0457b'); L.soltar(); Lb.cajaB(x, y + 0.02, z, 0.32, 0.02, 0.4, '#9fe7ff'); }
        bloquear(p.x, p.z, 1.6, 1.6, p.r);
      },
      sillas_voladoras(p) {
        const h = 5.2;
        L.cil(0, 0, 0, 1.2, 0.3, '#8a929c', 14); L.cil(0, 0.3, 0, 0.32, h, '#e0457b', 10); L.cono(0, h + 1.1, 0, 0.4, 0.8, '#f2c230', 10); Lb.esfera(0, h + 2.0, 0, 0.12, '#ffe680', 0);
        const q = local(0, h, 0), g = new THREE.Group(), LT = new G.Lote(), n = 10, R = 2.6;
        g.position.set(q.x, q.y, q.z);
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; LT.empujarRot(0, 0.5, 0, 0, a, 0); LT.caja(0, 0, 1.45, 1.1, 0.1, 2.9, k % 2 ? '#3a5ae0' : '#fff0f6', 0, 0.3); LT.soltar(); }
        g.add(LT.malla(MAT.solido));
        const sillas = [];
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2, LS = new G.Lote(), c = ['#e04f5f', '#3ab0e0', '#f2c230', '#5aa046', '#c06ad8'][k % 5];
          LS.cajaB(0, -2.2, 0, 0.4, 0.1, 0.4, c); LS.cajaB(0, -2.1, -0.18, 0.4, 0.34, 0.06, c); LS.cajaB(0, -2.1, 0, 0.03, 2.1, 0.03, '#c8ccd2');
          if (k % 3 !== 1) pasajero(LS, 0, -2.1, 0, k);
          const m = LS.malla(MAT.solido); m.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); m.rotation.y = -a + Math.PI / 2; g.add(m); sillas.push(m);
        }
        destino.add(g);
        animados.push({ act: (t) => {
          const v = 0.65 + 0.35 * Math.sin(t / 9000), inc = 0.25 + v * 0.45;
          g.rotation.y = t / 1300; g.position.y = q.y - 0.2 + v * 0.5;
          for (const m of sillas) m.rotation.x = -inc;
        } });
        halo(0, h, 0, 3.6, 0xffc8e0); charco(0, 0, 6.5, 0xffc8e0);
        bloquearCirculo(p.x, p.z, 1.5);
      },
      barco_pirata(p) {
        const hp = 3.9;
        L.cajaB(0, 0, 0, 10.0, 0.14, 4.0, '#7a8694');
        for (const x of [-3.4, 3.4]) { }
        for (const s of [-1, 1]) { L.caja(-0.9, hp / 2, s * 1.6, 0.26, hp + 0.6, 0.26, '#5a6270', 0, 0, -0.42); L.caja(0.9, hp / 2, s * 1.6, 0.26, hp + 0.6, 0.26, '#5a6270', 0, 0, 0.42); }
        L.cajaB(0, hp - 0.1, 0, 0.3, 0.3, 3.6, '#8a929c');
        const q = local(0, hp, 0), g = new THREE.Group(), LB = new G.Lote(), cas = '#7a4a2a', cl = '#a87445';
        for (let k = 0; k < 11; k++) { const u = (k - 5) / 5, ancho = 1.5 * (1 - u * u * 0.55), y = -3.1 + u * u * 0.8; LB.cajaB(u * 3.6, y, 0, 0.74, 1.3 - u * u * 0.3, ancho, k % 2 ? cas : cl); LB.cajaB(u * 3.6, y + 1.2 - u * u * 0.3, 0, 0.74, 0.1, ancho + 0.12, '#e8c24a'); }
        for (let k = 0; k < 5; k++) { LB.cajaB(-2.0 + k, -2.0, 0, 0.5, 0.3, 1.2, '#4a2a1a'); for (const z of [-0.3, 0.3]) if ((k + (z > 0 ? 1 : 0)) % 3 !== 2) pasajero(LB, -2.0 + k, -1.72, z, k * 2 + (z > 0 ? 1 : 0)); }
        for (const s of [-1, 1]) LB.caja(0, -1.3, s * 0.7, 0.1, 2.6, 0.1, '#5a6270');
        LB.cajaB(0, -2.0, 0, 0.14, 2.8, 0.14, cas); LB.cajaB(0, -0.1, 0, 1.9, 1.2, 0.05, '#f4f0e0'); LB.cajaB(0, 0.3, 0.03, 0.6, 0.5, 0.03, '#1a1a1e');
        LB.cajaB(3.9, -2.3, 0, 0.8, 0.8, 0.5, '#c8202a'); LB.cajaB(-3.9, -2.3, 0, 0.8, 0.8, 0.5, '#c8202a');
        g.add(LB.malla(MAT.solido)); g.position.set(q.x, q.y, q.z); g.rotation.y = rad(p.r || 0); destino.add(g);
        animados.push({ act: (t) => { const f = Math.sin(t / 1500); g.rotation.z = f * (0.45 + 0.25 * Math.sin(t / 14000)); } });
        for (const [x, z] of [[-1, -1.6], [1, -1.6], [-1, 1.6], [1, 1.6]]) { const q2 = local(x, 0, z); bloquear(q2.x, q2.z, 0.5, 0.5, p.r); }
        bloquear(p.x, p.z, 9.6, 2.6, p.r);
      },
      pagoda(p) {
        L.cajaB(0, 0, 0, 7.6, 0.4, 5.8, '#a8a29a');
        for (let k = 0; k < 4; k++) {
          const e = 1 - k * 0.18, y = 0.4 + k * 1.7;
          L.cajaB(0, y, 0, 5.0 * e, 1.5, 3.6 * e, k % 2 ? '#e8d8c8' : '#d8c8b4');
          for (const x of [-2.3 * e, 0, 2.3 * e]) L.cajaB(x, y, 1.8 * e + 0.03, 0.16, 1.5, 0.08, '#8a2a24');
          if (k === 0) { L.cajaB(0, y, 1.8 * e + 0.04, 1.4, 1.3, 0.05, '#5a3020'); } else Ll.cajaB(0, y + 0.4, 1.8 * e + 0.05, 1.0, 0.7, 0.03, '#ffd890');
          L.cajaB(0, y + 1.5, 0, 6.6 * e, 0.14, 5.0 * e, '#3a4a58'); L.cajaB(0, y + 1.64, 0, 5.2 * e, 0.12, 3.8 * e, '#2a3a48');
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.caja(sx * 3.3 * e, y + 1.72, sz * 2.5 * e, 0.2, 0.3, 0.2, '#2a3a48', 0, 0, 0);
          halo(0, y + 0.8, 1.9 * e, 1.0, 0xffc880);
        }
        L.cil(0, 7.3, 0, 0.1, 1.5, '#c8a24a', 6); for (let k = 0; k < 4; k++) L.cil(0, 7.5 + k * 0.28, 0, 0.3 - k * 0.05, 0.08, '#c8a24a', 8);
        bloquear(p.x, p.z, 7.6, 5.8, p.r);
      },
      expendedora(p) {
        L.cajaB(0, 0, 0, 0.9, 1.9, 0.7, p.c); L.cajaB(0, 0.8, 0.36, 0.76, 1.0, 0.04, '#20232a'); Lb.cajaB(0, 0.86, 0.385, 0.68, 0.88, 0.02, '#cfeeff');
        for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) L.cajaB(-0.24 + k * 0.16, 1.0 + i * 0.26, 0.4, 0.1, 0.16, 0.02, ['#e04f5f', '#3ab0e0', '#f2c230', '#5aa046'][(i + k) % 4]);
        L.cajaB(0, 0.25, 0.37, 0.6, 0.2, 0.03, '#141418');
        halo(0, 1.3, 0.5, 1.2, 0xcfeeff, true); bloquear(p.x, p.z, 0.9, 0.7, p.r);
      },
      // ================= anillo exterior =================
      // --- Parque Deportivo ---
      gradas(p) {
        const w = p.w;
        for (let k = 0; k < 3; k++) {
          const z = 0.8 - k * 0.8, h = 0.45 * (k + 1);
          L.cajaB(0, 0, z, w, h, 0.8, k % 2 ? '#c9ccd1' : '#d2d5da');
          for (let u = -w / 2 + 0.55; u < w / 2 - 0.3; u += 0.9) L.cajaB(u, h, z + 0.12, 0.7, 0.06, 0.42, k === 1 ? '#f4f4f0' : '#2f9a52');
        }
        L.cajaB(0, 0, -1.25, w, 1.9, 0.1, '#9aa0a8');
        for (const s of [-1, 1]) { L.cajaB(s * (w / 2 + 0.05), 0, -0.4, 0.1, 1.5, 1.7, '#9aa0a8'); L.cajaB(s * (w / 2 - 0.2), 1.9, -1.2, 0.1, 0.9, 0.1, '#5a6270'); }
        L.caja(0, 2.85, -0.75, w + 0.3, 0.08, 1.2, '#2f9a52', 0, 0.18);
        Lb.cajaB(0, 2.0, -1.19, 2.6, 0.5, 0.04, '#1e1e22');
        for (const [u, c] of [[-0.8, '#ff5a3a'], [0.8, '#3ab0ff']]) Lb.cajaB(u, 2.1, -1.16, 0.6, 0.3, 0.02, c);
        bloquear(p.x, p.z, w, 2.6, p.r);
      },
      cancha_futbol(p) {
        const w = p.w, d = p.d, b = '#f4f4f0', y = 0.004;
        const linea = (x, z, lw, ld) => L.cajaB(x, y, z, lw, 0.008, ld, b);
        linea(0, -d / 2, w, 0.08); linea(0, d / 2, w, 0.08); linea(-w / 2, 0, 0.08, d); linea(w / 2, 0, 0.08, d); linea(0, 0, 0.08, d);
        for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; L.cajaB(Math.cos(a) * 1.3, y, Math.sin(a) * 1.3, 0.12, 0.008, 0.12, b); }
        for (let i = 0; i < 7; i++) L.cajaB(-w / 2 + (i + 0.5) * w / 7, 0.002, 0, w / 7, 0.004, d, i % 2 ? '#6fb551' : '#7cc25c');
        for (const s of [-1, 1]) {
          linea(s * (w / 2 - 1.1), 0, 0.08, 3.6); linea(s * (w / 2 - 0.55), -1.8, 1.1, 0.08); linea(s * (w / 2 - 0.55), 1.8, 1.1, 0.08);
          const gx = s * (w / 2 + 0.05);
          for (const z of [-0.95, 0.95]) L.cajaB(gx, 0, z, 0.09, 1.0, 0.09, b);
          L.cajaB(gx, 0.95, 0, 0.09, 0.09, 1.99, b);
          L.cajaB(gx + s * 0.55, 0, 0, 0.02, 0.85, 1.9, '#e2e8ec'); L.cajaB(gx + s * 0.28, 0.9, 0, 0.56, 0.02, 1.9, '#e2e8ec');
          for (const z of [-0.95, 0.95]) L.cajaB(gx + s * 0.28, 0, z, 0.56, 0.9, 0.02, '#e2e8ec');
          const q = local(gx + s * 0.28, 0, 0); bloquear(q.x, q.z, 0.6, 2.0, 0);
        }
        L.esfera(0.5, 0.13, 0.4, 0.13, '#f4f4f0', 1); L.esfera(0.5, 0.13, 0.4, 0.06, '#1e1e22', 0, 1, 1, 2.2);
      },
      cancha_basquet(p) {
        const w = p.w, d = p.d, b = '#f4f4f0', y = 0.004;
        const linea = (x, z, lw, ld) => L.cajaB(x, y, z, lw, 0.008, ld, b);
        linea(0, -d / 2, w, 0.07); linea(0, d / 2, w, 0.07); linea(-w / 2, 0, 0.07, d); linea(w / 2, 0, 0.07, d); linea(0, 0, w, 0.07);
        for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; L.cajaB(Math.cos(a) * 1.0, y, Math.sin(a) * 1.0, 0.1, 0.008, 0.1, b); }
        for (const s of [-1, 1]) {
          L.cajaB(0, 0.003, s * (d / 2 - 1.1), 2.2, 0.006, 2.2, '#2f6fb0');
          const z0 = s * (d / 2 + 0.15);
          L.cajaB(0, 0, z0, 0.14, 2.7, 0.14, '#3a3f48'); L.cajaB(0, 2.55, z0 - s * 0.35, 0.1, 0.1, 0.7, '#3a3f48');
          L.cajaB(0, 2.2, z0 - s * 0.72, 1.3, 0.85, 0.06, b); L.cajaB(0, 2.35, z0 - s * 0.755, 0.5, 0.34, 0.01, '#d63a3a'); L.cajaB(0, 2.39, z0 - s * 0.76, 0.42, 0.26, 0.012, b);
          for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; L.cajaB(Math.cos(a) * 0.2, 2.3, z0 - s * 0.97 + Math.sin(a) * 0.2, 0.05, 0.03, 0.05, '#e8761e'); }
          const q = local(0, 0, z0); bloquear(q.x, q.z, 0.4, 0.4, 0);
        }
        L.esfera(1.7, 0.13, 1.4, 0.13, '#e8761e', 1);
      },
      barras(p) {
        const w = p.w;
        for (const u of [-w / 2, 0, w / 2]) L.cajaB(u, 0, 0, 0.1, 2.1, 0.1, '#3a3f48');
        L.cajaB(-w / 4, 2.0, 0, w / 2, 0.06, 0.06, '#b8bcc2'); L.cajaB(w / 4, 1.6, 0, w / 2, 0.06, 0.06, '#b8bcc2');
        bloquear(p.x, p.z, w, 0.3, p.r);
      },
      trampolin(p) {
        L.cajaB(0, 0, -0.3, 0.7, 0.5, 0.6, '#c9ccd1');
        L.cajaB(0, 0.5, 0.55, 0.45, 0.06, 1.9, '#3ab0e0');
        for (const s of [-1, 1]) L.cajaB(s * 0.3, 0.5, -0.45, 0.05, 0.6, 0.05, '#b8bcc2');
        const q = local(0, 0, -0.3); bloquear(q.x, q.z, 0.7, 0.6, p.r);
      },
      tumbona(p) {
        const c = p.c || '#3ab0e0';
        for (const [x, z] of [[-0.28, -0.75], [0.28, -0.75], [-0.28, 0.8], [0.28, 0.8]]) L.cajaB(x, 0, z, 0.05, 0.28, 0.05, '#e8e2d8');
        L.cajaB(0, 0.28, 0.2, 0.66, 0.05, 1.4, '#f4f0e6'); L.cajaB(0, 0.33, 0.2, 0.6, 0.04, 1.34, c);
        L.caja(0, 0.48, -0.72, 0.66, 0.05, 0.5, '#f4f0e6', 0, 0.55); L.caja(0, 0.5, -0.7, 0.6, 0.04, 0.46, tono(c, 1.1), 0, 0.55);
        bloquear(p.x, p.z, 0.7, 1.9, p.r);
      },
      toalla(p) {
        L.cajaB(0, 0, 0, 0.8, 0.02, 1.7, p.c || '#3ab0e0');
        for (const z of [-0.5, 0, 0.5]) L.cajaB(0, 0.02, z, 0.8, 0.004, 0.16, '#f4f4f0');
      },
      tienda_local(p) {
        const w = p.w, d = p.d, h = p.h || 2.3, c = p.c, c2 = p.c2, zf = d / 2;
        L.cajaB(0, 0, 0, w, h, d, c); L.cajaB(0, h, 0, w + 0.16, 0.14, d + 0.16, tono(c, 0.7));
        L.cajaB(0, 0, zf + 0.005, w, 0.25, 0.04, tono(c, 0.75));
        L.cajaB(-w / 2 + 0.9, 0, zf + 0.02, 0.8, 1.7, 0.04, '#5a3a22'); Ll.cajaB(-w / 2 + 0.9, 0.2, zf + 0.045, 0.6, 1.3, 0.02, '#ffe9b0');
        L.cajaB(0.55, 0.7, zf + 0.02, w - 2.5, 1.0, 0.04, '#e8e2d8'); Ll.cajaB(0.55, 0.76, zf + 0.045, w - 2.7, 0.88, 0.02, '#ffe2a0');
        for (let k = 0; k < 4; k++) L.cajaB(0.55 - (w - 2.7) / 2 + 0.3 + k * (w - 3.3) / 3, 0.8, zf + 0.06, 0.32, 0.22, 0.04, ['#d64541', '#f2c230', '#4a8ae0', '#5aa046'][k]);
        const n = Math.max(4, Math.round(w / 0.5));
        for (let k = 0; k < n; k++) L.caja(-w / 2 + (k + 0.5) * w / n, h - 0.32, zf + 0.36, w / n + 0.005, 0.05, 0.78, k % 2 ? c2 : '#f8f4ec', 0, 0.35);
        if (p.texto) {
          const ws = Math.min(w - 0.3, 4.3);
          L.cajaB(0, h + 0.14, zf - 0.1, ws + 0.1, 0.64, 0.12, p.cc || '#2a2a2e');
          plan('carteles', matCartel).agregar(0, h + 0.46, zf - 0.035, ws, ws / 8, uvTexto(p.texto, p.t), 0);
        }
        L.cajaB(w / 2 + 0.01, 0.8, 0, 0.04, 0.9, Math.min(1.4, d - 0.6), '#e8e2d8'); Ll.cajaB(w / 2 + 0.03, 0.86, 0, 0.02, 0.78, Math.min(1.25, d - 0.75), '#ffe2a0');
        halo(-w / 2 + 0.9, 1.0, zf + 0.3, 1.2, 0xffd890); charco(0.4, zf + 1.0, 4.4, 0xffc878);
        bloquear(p.x, p.z, w, d, p.r);
      },
      bici_taller(p) {
        L.cajaB(0, 0, 0, 0.5, 0.04, 0.5, '#3a3f48'); L.cajaB(0, 0, 0, 0.06, 0.95, 0.06, '#3a3f48');
        for (const z of [-0.48, 0.48]) { L.cilC(0, 0.95, z, 0.3, 0.04, '#1e1e22', 12, 0, 0, Math.PI / 2); L.cilC(0, 0.95, z, 0.06, 0.06, '#9aa0a8', 6, 0, 0, Math.PI / 2); }
        L.caja(0, 1.1, 0, 0.05, 0.05, 0.9, '#2f9a52'); L.caja(0, 1.0, -0.2, 0.05, 0.4, 0.05, '#2f9a52', 0, 0.4); L.cajaB(0, 1.25, -0.25, 0.1, 0.05, 0.22, '#1e1e22');
        L.cajaB(0.35, 0, 0.1, 0.36, 0.3, 0.26, '#d63a3a');
        bloquear(p.x, p.z, 0.5, 1.2, p.r);
      },
      puesto_frutas(p) {
        L.cajaB(0, 0, 0, 1.8, 0.75, 0.7, '#a87445');
        const cols = ['#e04a3a', '#f2a83a', '#f2d23a', '#7fbf4a', '#8a3ab0'];
        for (let k = 0; k < 5; k++) { L.cajaB(-0.72 + k * 0.36, 0.75, 0, 0.32, 0.12, 0.6, '#c8925a'); for (let m = 0; m < 3; m++) L.esfera(-0.72 + k * 0.36 + (m - 1) * 0.09, 0.9, (m % 2) * 0.12 - 0.06, 0.06, cols[k], 0); }
        for (const s of [-1, 1]) L.cajaB(s * 0.85, 0, -0.3, 0.05, 1.7, 0.05, '#6e4a2c');
        L.caja(0, 1.72, 0, 2.0, 0.05, 0.9, '#2f8f5a', 0, 0.25);
        bloquear(p.x, p.z, 1.8, 0.7, p.r);
      },
      // --- Barrio Residencial ---
      casa(p) {
        const w = p.w, d = p.d, h = p.h || 2.4, c = p.c, c2 = p.c2, zf = d / 2;
        L.cajaB(0, 0, 0, w, h, d, c); L.cajaB(0, 0, 0, w + 0.06, 0.22, d + 0.06, tono(c, 0.72));
        const ang = 0.55, mitad = d / 2 + 0.35, largo = mitad / Math.cos(ang), alto = Math.tan(ang) * mitad;
        for (const s of [-1, 1]) L.caja(0, h + alto / 2 + 0.02, s * mitad / 2, w + 0.5, 0.14, largo + 0.04, s < 0 ? tono(c2, 0.85) : c2, 0, s * ang);
        for (let k = 0; k < 5; k++) for (const s of [-1, 1]) L.cajaB(s * (w / 2 - 0.05), h + k * alto / 5, 0, 0.1, alto / 5 + 0.01, Math.max(0.1, d * (1 - (k + 0.5) / 5)), c);
        L.cajaB(w * 0.28, h + alto * 0.25, -d * 0.18, 0.42, alto * 0.95, 0.42, tono(c2, 0.7));
        const xp = -w * 0.18;
        L.cajaB(xp, 0, zf + 0.25, 1.1, 0.12, 0.5, '#b8b2a8');
        L.cajaB(xp, 0, zf + 0.02, 0.82, 1.65, 0.05, tono(c2, 0.8)); L.cajaB(xp + 0.26, 0.82, zf + 0.06, 0.06, 0.06, 0.03, '#e3b43c');
        L.caja(xp, 1.95, zf + 0.35, 1.3, 0.06, 0.7, tono(c2, 0.9), 0, 0.3);
        const ventana = (x) => {
          L.cajaB(x, 0.72, zf + 0.02, 0.95, 0.88, 0.04, '#f4f4f0'); Ll.cajaB(x, 0.79, zf + 0.04, 0.8, 0.74, 0.02, '#ffe2a0');
          L.cajaB(x, 1.14, zf + 0.06, 0.8, 0.04, 0.02, '#f4f4f0'); L.cajaB(x, 0.79, zf + 0.06, 0.04, 0.74, 0.02, '#f4f4f0');
          L.cajaB(x, 0.62, zf + 0.12, 1.0, 0.1, 0.2, tono(c2, 0.9)); for (let k = 0; k < 4; k++) L.esfera(x - 0.36 + k * 0.24, 0.76, zf + 0.12, 0.08, ['#ff6a8a', '#ffe14a', '#ffffff', '#b98aff'][k], 0);
          halo(x, 1.1, zf + 0.3, 1.2, 0xffd890);
        };
        ventana(w * 0.26); if (w >= 4.6) ventana(-w * 0.4);
        L.cajaB(w / 2 + 0.02, 0.72, 0, 0.04, 0.88, 0.95, '#f4f4f0'); Ll.cajaB(w / 2 + 0.04, 0.79, 0, 0.02, 0.74, 0.8, '#ffe2a0');
        if (p.texto) { L.cajaB(xp, 1.7, zf + 0.04, 1.3, 0.26, 0.04, p.cc || '#5a3a22'); plan('carteles', matCartel).agregar(xp, 1.83, zf + 0.065, 1.2, 0.15, uvTexto(p.texto, p.t), 0); }
        Ll.cajaB(xp - 0.62, 1.4, zf + 0.06, 0.12, 0.16, 0.08, '#ffe9a8'); halo(xp - 0.62, 1.45, zf + 0.2, 1.0, 0xffd890); charco(xp, zf + 0.9, 3.2, 0xffc878);
        bloquear(p.x, p.z, w, d, p.r);
      },
      caseta_perro(p) {
        L.cajaB(0, 0, 0, 0.8, 0.55, 0.9, '#c8925a');
        for (const s of [-1, 1]) L.caja(s * 0.24, 0.7, 0, 0.58, 0.06, 1.0, '#8a3a2a', 0, 0, -s * 0.7);
        L.cajaB(0, 0.55, 0, 0.08, 0.3, 0.9, '#c8925a');
        L.cajaB(0, 0, 0.455, 0.36, 0.42, 0.02, '#2a1e16');
        L.cajaB(0.3, 0, 0.62, 0.2, 0.05, 0.14, '#9aa0a8'); L.esfera(-0.25, 0.04, 0.65, 0.07, '#f4f0e6', 0, 1.6, 0.6, 0.6);
        bloquear(p.x, p.z, 0.8, 0.9, p.r);
      },
      ajedrez_gigante(p) {
        const w = p.w, q = w / 8;
        L.cajaB(0, 0, 0, w + 0.3, 0.05, w + 0.3, '#6e4a2c');
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) L.cajaB(-w / 2 + (i + 0.5) * q, 0.05, -w / 2 + (j + 0.5) * q, q, 0.012, q, (i + j) % 2 ? '#3a3a40' : '#efe9de');
        const pieza = (i, j, tipo, c) => {
          const x = -w / 2 + (i + 0.5) * q, z = -w / 2 + (j + 0.5) * q, y = 0.06;
          L.cil(x, y, z, 0.24, 0.1, c, 10); L.cil(x, y + 0.1, z, 0.14, tipo === 'peon' ? 0.3 : 0.55, c, 8);
          if (tipo === 'rey') { L.cajaB(x, y + 0.65, z, 0.06, 0.3, 0.06, c); L.cajaB(x, y + 0.82, z, 0.22, 0.06, 0.06, c); }
          else if (tipo === 'caballo') L.caja(x, y + 0.78, z + 0.04, 0.16, 0.34, 0.3, c, 0, 0.45);
          else if (tipo === 'torre') { L.cil(x, y + 0.65, z, 0.2, 0.16, c, 8); for (let k = 0; k < 4; k++) L.cajaB(x + Math.cos(k * 1.57) * 0.15, y + 0.81, z + Math.sin(k * 1.57) * 0.15, 0.08, 0.08, 0.08, c); }
          else L.esfera(x, y + (tipo === 'peon' ? 0.46 : 0.74), z, tipo === 'reina' ? 0.16 : 0.12, c, 1);
        };
        const B = '#f4f0e6', N = '#2a2a30';
        for (const [i, j, t] of [[4, 7, 'rey'], [0, 7, 'torre'], [5, 5, 'caballo'], [3, 6, 'reina'], [1, 6, 'peon'], [2, 6, 'peon'], [5, 6, 'peon'], [6, 5, 'peon']]) pieza(i, j, t, B);
        for (const [i, j, t] of [[4, 0, 'rey'], [7, 0, 'torre'], [2, 2, 'caballo'], [3, 1, 'reina'], [0, 1, 'peon'], [3, 3, 'peon'], [6, 1, 'peon'], [7, 2, 'peon']]) pieza(i, j, t, N);
        bloquear(p.x, p.z, w + 0.3, w + 0.3, 0);
      },
      columpios(p) {
        const w = p.w;
        for (const s of [-1, 1]) for (const dz of [-1, 1]) L.caja(s * w / 2, 1.0, dz * 0.27, 0.08, 2.12, 0.08, '#d64541', 0, -dz * 0.24);
        L.cajaB(0, 1.98, 0, w + 0.1, 0.08, 0.08, '#d64541');
        for (const x of [-0.7, 0.7]) { for (const dx of [-0.2, 0.2]) L.cajaB(x + dx, 0.55, 0, 0.02, 1.45, 0.02, '#9aa0a8'); L.cajaB(x, 0.5, 0, 0.5, 0.05, 0.25, '#2a2a2e'); }
        for (const s of [-1, 1]) { const q = local(s * w / 2, 0, 0); bloquear(q.x, q.z, 0.3, 1.0, 0); }
      },
      tobogan(p) {
        L.cajaB(0, 0, -0.9, 0.7, 1.5, 0.7, '#f2c230'); L.cajaB(0, 1.5, -0.9, 0.8, 0.08, 0.8, '#d64541');
        for (let k = 0; k < 4; k++) L.cajaB(0, 0.3 + k * 0.33, -1.27, 0.5, 0.05, 0.06, '#3a3f48');
        L.caja(0, 0.82, 0.45, 0.55, 0.06, 2.0, '#3ab0e0', 0, 0.72);
        for (const s of [-1, 1]) L.caja(s * 0.3, 0.9, 0.45, 0.05, 0.14, 2.0, '#2f8fe0', 0, 0.72);
        bloquear(p.x, p.z, 0.8, 2.6, p.r);
      },
      // --- Raccoon City ---
      comisaria(p) {
        const w = p.w, d = p.d, h = p.h, zf = d / 2, c = '#d8cdb8';
        L.cajaB(0, 0, 0, w, h, d, c); L.cajaB(0, h, 0, w + 0.3, 0.3, d + 0.3, '#b8ad98'); L.cajaB(0, 0, 0, w + 0.1, 0.35, d + 0.1, '#a89d88');
        L.cajaB(0, h * 0.5, zf + 0.01, w, 0.12, 0.06, '#b8ad98');
        L.cajaB(0, 0, zf + 0.6, 4.4, 0.18, 1.3, '#c9c0ac'); L.cajaB(0, 0, zf + 1.35, 4.8, 0.09, 0.5, '#b8ad98');
        for (const x of [-1.8, -0.6, 0.6, 1.8]) L.cil(x, 0.18, zf + 1.0, 0.15, h - 0.6, '#efe8da', 10);
        L.cajaB(0, h - 0.42, zf + 0.7, 4.5, 0.42, 1.4, '#e8e0d0');
        for (let k = 0; k < 3; k++) L.cajaB(0, h + k * 0.16, zf + 0.7, 3.6 - k * 1.1, 0.16, 1.3, '#e8e0d0');
        L.cajaB(0, 0.18, zf + 0.02, 1.4, 2.0, 0.05, '#4a3a2a'); Ll.cajaB(0, 0.3, zf + 0.05, 1.2, 1.7, 0.02, '#ffd890');
        for (const y of [0.9, h * 0.5 + 0.4]) for (let x = -w / 2 + 0.9; x < w / 2 - 0.5; x += 1.3) {
          if (Math.abs(x) < 2.5) continue;
          L.cajaB(x, y, zf + 0.02, 0.7, 0.95, 0.04, '#5a5048'); Ll.cajaB(x, y + 0.06, zf + 0.04, 0.56, 0.82, 0.02, '#ffe2a0');
        }
        for (let z = -d / 2 + 0.9; z < d / 2 - 0.5; z += 1.4) for (const y of [0.9, h * 0.5 + 0.4]) { L.cajaB(w / 2 + 0.02, y, z, 0.04, 0.95, 0.7, '#5a5048'); Ll.cajaB(w / 2 + 0.04, y + 0.06, z, 0.02, 0.82, 0.56, '#ffe2a0'); }
        if (p.texto) plan('carteles', matCartel).agregar(0, h - 0.21, zf + 1.415, 3.0, 0.375, uvTexto(p.texto, p.t), 0);
        L.cajaB(w / 2 - 0.6, h + 0.3, -0.5, 0.06, 1.8, 0.06, '#d8d8d8'); L.cajaB(w / 2 - 0.3, h + 1.6, -0.5, 0.6, 0.38, 0.02, '#2a4a8a');
        for (const s of [-1, 1]) { L.cil(s * 2.5, 0, zf + 1.3, 0.06, 1.6, '#2a2a30', 6); Ll.cajaB(s * 2.5, 1.6, zf + 1.3, 0.22, 0.3, 0.22, '#ffe9a8'); halo(s * 2.5, 1.75, zf + 1.3, 1.4, 0xffd890); }
        charco(0, zf + 2.4, 6, 0xffc878);
        const q = local(0, 0, 0.67); bloquear(q.x, q.z, w, d + 1.35, p.r);
      },
      patrulla(p) {
        L.cajaB(0, 0.18, 0, 1.0, 0.42, 2.05, '#1e1e22');
        for (const s of [-1, 1]) L.cajaB(s * 0.505, 0.24, 0, 0.012, 0.32, 1.0, '#f4f4f0');
        L.cajaB(0, 0.6, -0.08, 0.9, 0.34, 1.05, '#f4f4f0');
        for (const s of [-1, 1]) { L.cajaB(0, 0.65, -0.08 + s * 0.53, 0.84, 0.24, 0.01, '#2c3e50'); L.cajaB(s * 0.455, 0.65, -0.08, 0.01, 0.22, 0.9, '#2c3e50'); }
        for (const [x, z] of [[-0.5, 0.66], [0.5, 0.66], [-0.5, -0.66], [0.5, -0.66]]) L.cilC(x, 0.18, z, 0.18, 0.12, '#1a1a1e', 10, 0, 0, Math.PI / 2);
        L.cajaB(0, 0.94, -0.08, 0.62, 0.07, 0.2, '#2a2a30');
        Ll.cajaB(-0.3, 0.32, 1.03, 0.2, 0.08, 0.01, '#fff4c0'); Ll.cajaB(0.3, 0.32, 1.03, 0.2, 0.08, 0.01, '#fff4c0');
        const luz = (dx, color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.18), new THREE.MeshBasicMaterial({ color })); const q = local(dx, 1.05, -0.08); m.position.set(q.x, q.y, q.z); m.rotation.y = rad(p.r || 0); destino.add(m); return m; };
        const rojo = luz(-0.16, 0xff2a2a), azul = luz(0.16, 0x2a6aff);
        if (p.sirena) { const ph = hash(p.x, p.z) * 9; animados.push({ act: (t) => { const on = Math.floor(t / 260 + ph) % 2; rojo.visible = !!on; azul.visible = !on; } }); halo(0, 1.05, -0.08, 2.4, 0xff4a6a, true); }
        bloquear(p.x, p.z, 1.0, 2.1, p.r);
      },
      mansion(p) {
        const w = p.w, d = p.d, h = p.h, zf = d / 2, c = '#9a8a74', c2 = '#4a3436';
        L.cajaB(0, 0, 0, w, h, d, c); L.cajaB(0, 0, 0, w + 0.1, 0.4, d + 0.1, '#6e6050'); L.cajaB(0, h / 2 - 0.08, zf + 0.01, w, 0.16, 0.06, '#7a6a58');
        for (let k = 0; k < 5; k++) L.cajaB(0, h + k * 0.3, 0, w + 0.5 - k * 2.0, 0.3, d + 0.5 - k * 1.2, k % 2 ? tono(c2, 0.9) : c2);
        L.cajaB(0, 0, 0.2, 3.6, h + 1.0, d + 0.4, tono(c, 1.06));
        for (let k = 0; k < 4; k++) L.cajaB(0, h + 1.0 + k * 0.32, 0.2, 4.0 - k * 0.9, 0.32, d + 0.8 - k * 1.5, c2);
        for (const s of [-1, 1]) { L.cajaB(s * (w / 2 - 0.8), h, -0.6, 0.5, 2.2, 0.5, '#7a6a58'); L.cajaB(s * (w / 2 - 0.8), h + 2.2, -0.6, 0.6, 0.12, 0.6, '#5a4a40'); }
        L.cajaB(0, 0, zf + 0.7, 3.2, 0.2, 1.3, '#7a6a58');
        for (const x of [-1.2, 1.2]) L.cil(x, 0.2, zf + 1.1, 0.13, 2.2, '#d8cfc0', 8);
        L.cajaB(0, 2.4, zf + 0.8, 3.0, 0.18, 1.3, '#6e6050');
        for (let u = -1.4; u <= 1.41; u += 0.2) L.cajaB(u, 2.58, zf + 1.42, 0.04, 0.42, 0.04, '#2a2a30');
        L.cajaB(0, 2.98, zf + 1.42, 3.0, 0.05, 0.05, '#2a2a30');
        const zc = zf + 0.41;
        L.cajaB(0, 0.2, zc, 1.5, 1.95, 0.05, '#3a2418'); L.cajaB(0, 0.2, zc + 0.03, 0.04, 1.95, 0.02, '#1e140e'); Ll.cajaB(0, 1.7, zc + 0.03, 1.2, 0.3, 0.02, '#ffcf80');
        L.cajaB(0, h - 0.4, zc, 1.2, 1.1, 0.04, '#3a2a22'); Ll.cajaB(0, h - 0.33, zc + 0.02, 1.0, 0.95, 0.02, '#ffcf80');
        for (const y of [0.9, h / 2 + 0.55]) for (let x = -w / 2 + 0.8; x < w / 2 - 0.4; x += 1.25) {
          if (Math.abs(x) < 2.0) continue;
          const on = hash(x * 3.1, y * 1.7) > 0.5;
          L.cajaB(x, y, zf + 0.02, 0.62, 1.0, 0.05, '#3a2a22'); (on ? Ll : L).cajaB(x, y + 0.08, zf + 0.05, 0.48, 0.84, 0.02, on ? '#ffcf80' : '#1e2a34');
          if (on) halo(x, y + 0.5, zf + 0.3, 1.0, 0xffc070);
        }
        for (let z = -d / 2 + 0.9; z < d / 2 - 0.4; z += 1.4) for (const y of [0.9, h / 2 + 0.55]) { L.cajaB(w / 2 + 0.02, y, z, 0.05, 1.0, 0.62, '#3a2a22'); L.cajaB(w / 2 + 0.05, y + 0.08, z, 0.02, 0.84, 0.48, '#1e2a34'); }
        halo(0, 1.8, zc + 0.4, 1.6, 0xffc070); charco(0, zf + 2.2, 5, 0xffb060);
        const q = local(0, 0, 0.7); bloquear(q.x, q.z, w, d + 1.4, p.r);
      },
      reja(p) {
        const w = p.w;
        L.cajaB(0, 0, 0, w, 0.12, 0.14, '#5a5048'); L.cajaB(0, 1.12, 0, w, 0.05, 0.05, '#1e1e24'); L.cajaB(0, 0.42, 0, w, 0.05, 0.05, '#1e1e24');
        for (let u = -w / 2 + 0.11; u < w / 2 - 0.05; u += 0.22) { L.cajaB(u, 0.12, 0, 0.035, 1.1, 0.035, '#1e1e24'); L.cono(u, 1.22, 0, 0.04, 0.12, '#1e1e24', 4); }
        for (const s of [-1, 1]) { L.cajaB(s * w / 2, 0, 0, 0.24, 1.45, 0.24, '#6a6058'); L.esfera(s * w / 2, 1.55, 0, 0.12, '#6a6058', 0); }
        bloquear(p.x, p.z, w, 0.3, p.r);
      },
      lapida(p) {
        const v = p.v || 0, c = v === 2 ? '#9a968e' : '#8f8b84';
        L.cajaB(0, 0, 0.4, 0.62, 0.08, 0.9, '#5e5040');
        if (v === 1) { L.cajaB(0, 0, -0.05, 0.12, 0.95, 0.12, c); L.cajaB(0, 0.58, -0.05, 0.5, 0.12, 0.12, c); }
        else { L.cajaB(0, 0, -0.05, 0.5, 0.58, 0.14, c); L.cilC(0, 0.58, -0.05, 0.25, 0.14, c, 10, Math.PI / 2); L.cajaB(0, 0.36, 0.025, 0.3, 0.04, 0.01, '#6f6b66'); L.cajaB(0, 0.26, 0.025, 0.22, 0.03, 0.01, '#6f6b66'); }
        if (v !== 1) for (const [x, cc] of [[-0.14, '#d64541'], [0.0, '#f4f4f0'], [0.14, '#b98aff']]) L.esfera(x, 0.12, 0.2, 0.05, cc, 0);
        const q = local(0, 0, -0.05); bloquear(q.x, q.z, 0.5, 0.2, 0);
      },
      cripta(p) {
        const c = '#a8a29a';
        L.cajaB(0, 0, 0, 2.6, 0.2, 2.4, '#8f8b84'); L.cajaB(0, 0.2, -0.1, 2.2, 2.0, 2.0, c);
        for (const x of [-0.8, 0.8]) L.cil(x, 0.2, 0.95, 0.12, 1.9, '#c9c3b8', 8);
        L.cajaB(0, 2.1, 0.1, 2.5, 0.25, 2.4, '#8f8b84');
        for (let k = 0; k < 4; k++) L.cajaB(0, 2.35 + k * 0.15, 0.1, 2.3 - k * 0.55, 0.15, 2.3, '#8f8b84');
        L.cajaB(0, 0.2, 0.91, 0.9, 1.5, 0.04, '#2a2a30'); L.cajaB(0, 2.95, 0.1, 0.1, 0.6, 0.1, '#6f6b66'); L.cajaB(0, 3.3, 0.1, 0.36, 0.1, 0.1, '#6f6b66');
        bloquear(p.x, p.z, 2.6, 2.4, p.r);
      },
      cinta_policial(p) {
        const w = p.w, d = p.d, cy = '#f2d23a';
        for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { L.cajaB(x, 0, z, 0.08, 0.9, 0.08, '#e8761e'); L.cajaB(x, 0, z, 0.24, 0.06, 0.24, '#2a2a2e'); }
        for (const s of [-1, 1]) {
          L.cajaB(0, 0.78, s * d / 2, w, 0.08, 0.012, cy); L.cajaB(s * w / 2, 0.78, 0, 0.012, 0.08, d, cy);
          for (let u = -w / 2 + 0.3; u < w / 2; u += 0.6) L.cajaB(u, 0.78, s * d / 2, 0.14, 0.08, 0.02, '#1e1e22');
          for (let u = -d / 2 + 0.3; u < d / 2; u += 0.6) L.cajaB(s * w / 2, 0.78, u, 0.02, 0.08, 0.14, '#1e1e22');
        }
        for (const [x, z] of [[-1.6, -0.9], [1.3, 1.0], [-0.5, 1.4], [1.9, -1.2]]) { L.caja(x, 0.08, z - 0.04, 0.16, 0.18, 0.1, cy, 0, -0.35); L.caja(x, 0.08, z + 0.04, 0.16, 0.18, 0.1, tono(cy, 0.85), 0, 0.35); }
      },
      silueta(p) {
        const b = '#f4f4f0', y = 0.006;
        const seg = (x, z, l, a) => L.caja(x, y, z, 0.05, 0.01, l, b, a);
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; seg(Math.cos(a) * 0.18, -0.8 + Math.sin(a) * 0.18, 0.12, a); }
        seg(-0.22, -0.3, 0.7, 0); seg(0.22, -0.3, 0.7, 0); seg(0, -0.62, 0.05, 0); L.caja(0, y, -0.63, 0.44, 0.01, 0.05, b);
        seg(-0.46, -0.48, 0.62, 0.7); seg(0.46, -0.38, 0.62, -1.0);
        seg(-0.15, 0.42, 0.85, 0.15); seg(0.22, 0.42, 0.85, -0.22);
      },
      // --- Playa del Sol ---
      barco(p) {
        const B = new G.Lote();
        B.cajaB(0, -0.25, 0, 1.4, 0.55, 2.8, '#f4f4f0'); B.cajaB(0, 0.27, 0, 1.46, 0.08, 2.84, '#2f6fb0'); B.cajaB(0, -0.25, 0, 1.42, 0.14, 2.82, '#c0392b');
        B.caja(0, 0.0, 1.5, 0.99, 0.55, 0.99, '#f4f4f0', Math.PI / 4); B.caja(0, 0.29, 1.5, 1.03, 0.08, 1.03, '#2f6fb0', Math.PI / 4);
        B.cajaB(0, 0.3, -0.55, 1.0, 0.8, 1.0, '#e8e2d8'); B.cajaB(0, 1.1, -0.55, 1.15, 0.08, 1.15, '#d64541');
        for (const s of [-1, 1]) B.cajaB(s * 0.505, 0.6, -0.55, 0.02, 0.3, 0.6, '#2c3e50');
        B.cajaB(0, 0.3, 0.55, 0.06, 2.0, 0.06, '#6e4a2c'); B.cajaB(0.2, 2.0, 0.55, 0.4, 0.24, 0.02, '#f2c230');
        B.cilC(0.72, 0.15, 0.4, 0.16, 0.06, '#f4f4f0', 10, 0, 0, Math.PI / 2); B.cilC(0.75, 0.15, 0.4, 0.1, 0.07, '#d63a3a', 10, 0, 0, Math.PI / 2);
        const m = B.malla(MAT.solido); const q = local(0, 0, 0); m.position.set(q.x, 0, q.z); m.rotation.y = rad(p.r || 0); destino.add(m);
        const ph = hash(p.x, p.z) * 6;
        animados.push({ act: (t) => { m.position.y = Math.sin(t / 900 + ph) * 0.06; m.rotation.z = Math.sin(t / 1300 + ph) * 0.04; m.rotation.x = Math.sin(t / 1700 + ph) * 0.02; } });
      },
      tabla_surf(p) {
        const c = ['#e04a5a', '#f2a83a', '#3ab0e0'][Math.floor(hash(p.x, p.z) * 3)];
        L.cajaB(0, 0.06, 0, 0.5, 0.05, 1.5, '#f4f4f0'); L.cajaB(0, 0.105, 0, 0.12, 0.01, 1.4, c);
        L.esfera(0, 0.085, 0.75, 0.25, '#f4f4f0', 0, 1, 0.1, 0.5); L.esfera(0, 0.085, -0.75, 0.25, '#f4f4f0', 0, 1, 0.1, 0.3);
      },
      castillo_arena(p) {
        const c = '#e0c88a';
        L.cajaB(0, 0, 0, 0.9, 0.25, 0.9, c);
        for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) { L.cil(x, 0, z, 0.14, 0.42, c, 8); L.cono(x, 0.42, z, 0.15, 0.16, tono(c, 0.92), 8); }
        L.cil(0, 0.25, 0, 0.22, 0.35, tono(c, 1.05), 8); L.cajaB(0, 0.6, 0, 0.02, 0.3, 0.02, '#6e4a2c'); L.cajaB(0.07, 0.8, 0, 0.12, 0.08, 0.01, '#d63a3a');
        L.cajaB(0.7, 0, 0.3, 0.2, 0.18, 0.15, '#3ab0e0'); L.caja(0.66, 0.05, -0.2, 0.06, 0.04, 0.3, '#f2c230', 0.6);
        bloquear(p.x, p.z, 0.9, 0.9, 0);
      },
      torre_salvavidas(p) {
        for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) L.cajaB(x, 0, z, 0.1, 1.3, 0.1, '#f4f4f0');
        L.cajaB(0, 1.3, 0, 1.4, 0.1, 1.4, '#d64541');
        L.cajaB(0, 1.4, -0.15, 0.55, 0.32, 0.45, '#f4f4f0'); L.cajaB(0, 1.4, -0.42, 0.55, 0.7, 0.06, '#f4f4f0');
        for (const s of [-1, 1]) L.cajaB(s * 0.68, 1.4, 0, 0.05, 0.42, 1.3, '#f4f4f0');
        L.caja(0, 0.65, 0.98, 0.5, 1.5, 0.05, '#e8e2d8', 0, -0.35);
        L.cajaB(0.62, 1.4, -0.62, 0.04, 1.6, 0.04, '#9aa0a8'); L.cajaB(0.62, 2.7, -0.42, 0.02, 0.3, 0.38, '#d64541'); L.cajaB(0.63, 2.79, -0.42, 0.02, 0.12, 0.06, '#f4f4f0'); L.cajaB(0.63, 2.85, -0.42, 0.02, 0.04, 0.18, '#f4f4f0');
        L.cilC(-0.72, 1.1, 0.3, 0.2, 0.06, '#f28a2a', 10, 0, 0, Math.PI / 2);
        bloquear(p.x, p.z, 1.4, 1.4, p.r);
      },
      red_voley(p) {
        const w = p.w;
        for (const s of [-1, 1]) L.cajaB(s * w / 2, 0, 0, 0.1, 2.45, 0.1, '#e8e2d8');
        for (let u = -w / 2; u <= w / 2 + 0.01; u += 0.2) L.cajaB(u, 1.7, 0, 0.012, 0.6, 0.012, '#f4f4f0');
        for (let y = 0; y <= 0.61; y += 0.15) L.cajaB(0, 1.7 + y, 0, w, 0.012, 0.012, '#f4f4f0');
        L.cajaB(0, 2.27, 0, w, 0.06, 0.03, '#f4f4f0');
        for (const s of [-1, 1]) { L.cajaB(0, 0.004, s * 3.8, w + 1.2, 0.01, 0.06, '#2f6fb0'); L.cajaB(s * (w / 2 + 0.6), 0.004, 0, 0.06, 0.01, 7.6, '#2f6fb0'); }
        L.esfera(1.2, 0.12, 1.4, 0.12, '#f2d23a', 1);
        for (const s of [-1, 1]) { const q = local(s * w / 2, 0, 0); bloquear(q.x, q.z, 0.3, 0.3, 0); }
      },
      chiringuito(p) {
        const w = p.w, d = p.d;
        L.cajaB(0, 0, 0, w, 0.12, d, '#b98352');
        for (const [x, z] of [[-w / 2 + 0.15, -d / 2 + 0.15], [w / 2 - 0.15, -d / 2 + 0.15], [-w / 2 + 0.15, d / 2 - 0.15], [w / 2 - 0.15, d / 2 - 0.15]]) L.cajaB(x, 0.12, z, 0.16, 2.3, 0.16, '#8a6038');
        L.cajaB(0, 0.12, -d / 2 + 0.12, w - 0.3, 1.9, 0.1, '#a87445');
        for (const y of [0.9, 1.4]) { L.cajaB(0, y, -d / 2 + 0.3, w - 0.8, 0.05, 0.3, '#6e4a2c'); for (let k = 0; k < 9; k++) L.cil(-w / 2 + 0.7 + k * (w - 1.4) / 8, y + 0.05, -d / 2 + 0.3, 0.05, 0.24, ['#3a8a4a', '#c0392b', '#f2c230', '#2a5a8a', '#e8e0d0'][k % 5], 6); }
        L.cajaB(0, 0.12, d / 2 - 0.4, w - 0.6, 1.0, 0.5, '#c8925a'); L.cajaB(0, 1.12, d / 2 - 0.4, w - 0.5, 0.06, 0.6, '#e8d0a0');
        for (let k = 0; k < 4; k++) L.cajaB(0, 2.42 + k * 0.18, 0, w + 0.8 - k * 1.0, 0.2, d + 0.8 - k * 0.6, k % 2 ? '#d8b46a' : '#c9a35a');
        for (let k = 0; k < 7; k++) { const u = -w / 2 - 0.2 + k * (w + 0.4) / 6; Lb.esfera(u, 2.35, d / 2 + 0.38, 0.06, ['#ffe680', '#ff8ab0', '#7ff0ff'][k % 3], 0); if (k % 2) halo(u, 2.35, d / 2 + 0.4, 0.8, 0xffe0a0); }
        bloquear(p.x, p.z, w, d, p.r);
      },
      faro(p) {
        L.esfera(0, 0.1, 0, 1.3, '#8f8b84', 0, 1, 0.4, 1);
        for (let k = 0; k < 7; k++) L.cil(0, 0.2 + k * 0.9, 0, 0.95 - k * 0.07, 0.9, k % 2 ? '#c0262d' : '#f4f4f0', 10);
        const yt = 0.2 + 7 * 0.9;
        L.cil(0, yt, 0, 0.82, 0.1, '#2a2a30', 10); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; L.cajaB(Math.sin(a) * 0.78, yt + 0.1, Math.cos(a) * 0.78, 0.04, 0.3, 0.04, '#2a2a30'); }
        Ll.cil(0, yt + 0.1, 0, 0.45, 0.7, '#fff2b0', 10); L.cono(0, yt + 0.8, 0, 0.62, 0.6, '#2a2a30', 10);
        L.cajaB(0, 0.2, 0.92, 0.45, 0.85, 0.06, '#3a2a22');
        for (const y of [2.6, 4.4]) Ll.cajaB(0, y, 0.82 - (y - 0.2) * 0.075, 0.18, 0.3, 0.06, '#ffe2a0');
        halo(0, yt + 0.45, 0, 2.6, 0xfff2b0);
        const haz = new THREE.Mesh(new THREE.ConeGeometry(1.4, 14, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        haz.rotation.z = Math.PI / 2; haz.position.set(7, 0, 0);
        const brazo = new THREE.Group(); const q = local(0, yt + 0.45, 0); brazo.position.set(q.x, q.y, q.z); brazo.add(haz); destino.add(brazo);
        animados.push({ act: (t, noche) => { brazo.rotation.y = t / 1800; haz.visible = noche > 0.35; } });
        bloquear(p.x, p.z, 2.2, 2.2, 0);
      },
      // ================= decoración de eventos =================
      calabaza(p) {
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; L.esfera(Math.sin(a) * 0.12, 0.26, Math.cos(a) * 0.12, 0.28, k % 2 ? '#e8761e' : '#f08a2a', 0, 0.75, 0.85, 0.75); }
        L.cil(0, 0.48, 0, 0.04, 0.14, '#4a6a2a', 5);
        for (const s of [-1, 1]) Ll.caja(s * 0.1, 0.32, 0.27, 0.08, 0.07, 0.03, '#ffb030', 0, 0, s * 0.5);
        Ll.cajaB(0, 0.15, 0.275, 0.22, 0.05, 0.03, '#ffb030');
        halo(0, 0.3, 0.3, 0.9, 0xff9a30); charco(0, 0, 1.8, 0xff9a30);
      },
      fantasma(p) {
        const g = new THREE.Group(); const q = local(0, p.y || 1.2, 0); g.position.set(q.x, q.y, q.z); destino.add(g);
        const mat = new THREE.MeshLambertMaterial({ color: 0xf4f6ff, emissive: 0x30344a, transparent: true, opacity: 0.88 });
        const cuerpo = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.0, 10, 1, true), mat); cuerpo.position.y = -0.2; g.add(cuerpo);
        const cab = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mat); cab.position.y = 0.3; g.add(cab);
        for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1a1a24 })); o.position.set(s * 0.12, 0.35, 0.3); g.add(o); }
        const ph = hash(p.x, p.z) * 6;
        animados.push({ act: (t) => { g.position.y = q.y + Math.sin(t / 800 + ph) * 0.25; g.rotation.y = Math.sin(t / 2000 + ph) * 0.8; mat.opacity = 0.6 + Math.sin(t / 600 + ph) * 0.25; } });
        halos.push({ x: q.x, y: q.y, z: q.z, s: 1.6, c: 0xb8c8ff });
      },
      telarana(p) {
        for (let k = 0; k < 6; k++) L.caja(0, 0, 0, 0.012, 1.4, 0.012, '#f0f0f0', 0, 0, k * Math.PI / 6);
        for (const r of [0.2, 0.4, 0.6]) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; L.caja(Math.cos(a) * r, Math.sin(a) * r, 0, 2 * Math.PI * r / 12, 0.01, 0.012, '#f0f0f0', 0, 0, a + Math.PI / 2); }
        L.esfera(0.15, -0.25, 0.02, 0.07, '#1a1a1e', 0);
      },
      arbol_navidad(p) {
        L.cil(0, 0, 0, 0.18, 0.6, '#6b4426', 6); for (let k = 0; k < 4; k++) L.cono(0, 0.5 + k * 0.85, 0, 1.55 - k * 0.32, 1.3, k % 2 ? '#2f6e35' : '#3a7a3a', 9);
        Lb.esfera(0, 4.2, 0, 0.26, '#ffe14a', 0); halo(0, 4.2, 0, 1.8, 0xffe14a, true);
        const cols = ['#ff4a4a', '#4ad0ff', '#ffe14a', '#7aff5a', '#ff8ae8'];
        for (let k = 0; k < 26; k++) { const y = 0.7 + hash(k, 1) * 3.2, r = (1.5 - (y - 0.5) * 0.34) * 0.92, a = hash(1, k) * 6.28; Lb.esfera(Math.sin(a) * r, y, Math.cos(a) * r, 0.07, cols[k % 5], 0); if (k % 2) halo(Math.sin(a) * r, y, Math.cos(a) * r, 0.6, new THREE.Color(cols[k % 5]).getHex()); }
        for (const [x, z, c] of [[0.9, 0.7, '#d63a2a'], [-0.8, 0.9, '#3a8fd8'], [0.2, 1.2, '#f2c230'], [-1.1, -0.3, '#7fbf7f']]) { L.cajaB(x, 0, z, 0.42, 0.34, 0.42, c); L.cajaB(x, 0, z, 0.44, 0.35, 0.08, '#f4f4f0'); L.cajaB(x, 0, z, 0.08, 0.35, 0.44, '#f4f4f0'); }
        charco(0, 0, 5, 0xffd890);
      },
      muneco_nieve(p) {
        L.esfera(0, 0.42, 0, 0.45, '#f4f7fa', 1); L.esfera(0, 1.0, 0, 0.33, '#f4f7fa', 1); L.esfera(0, 1.45, 0, 0.24, '#f4f7fa', 1);
        L.cil(0, 1.62, 0, 0.2, 0.06, '#1e1e22', 8); L.cil(0, 1.66, 0, 0.13, 0.3, '#1e1e22', 8);
        L.cono(0, 1.42, 0.3, 0.05, 0.22, '#f08a2a', 5, Math.PI / 2); for (const s of [-1, 1]) L.esfera(s * 0.08, 1.52, 0.2, 0.03, '#1e1e22', 0);
        L.cil(0, 1.2, 0, 0.27, 0.09, '#d63a2a', 10); L.cajaB(0.15, 0.9, 0.22, 0.1, 0.32, 0.05, '#d63a2a');
        for (const s of [-1, 1]) L.caja(s * 0.45, 1.05, 0, 0.5, 0.04, 0.04, '#6b4426', 0, 0, s * 0.5);
      },
    };

    for (const p0 of D.props) {
      if (p0.vehiculo) continue;
      const f = P[p0.t];
      if (!f) { console.warn('prop desconocido', p0.t); continue; }
      let p = p0;
      if (p0.pared) { const a = rad(p0.r || 0); p = Object.assign({}, p0, { x: p0.x + Math.sin(a) * 0.17, z: p0.z + Math.cos(a) * 0.17 }); }
      if (p0.evento) { usar(lotesEvento(p0.evento)); sinBloqueo = true; }
      en(p, () => f(p));
      if (p0.evento) { usar(BASE); sinBloqueo = false; }
    }

    // ---------- muros ----------
    for (const m of D.muros) {
      const horiz = Math.abs(m.z0 - m.z1) < 1e-6;
      const len = horiz ? m.x1 - m.x0 : m.z1 - m.z0;
      const cx = horiz ? (m.x0 + m.x1) / 2 : m.x0 + 0.08, cz = horiz ? m.z0 + 0.08 : (m.z0 + m.z1) / 2;
      const w = horiz ? len : 0.16, d = horiz ? 0.16 : len;
      L.cajaB(cx, 0, cz, w, m.h, d, m.c);
      L.cajaB(cx, m.h - 0.02, cz, w + 0.04, 0.08, d + 0.04, tono(m.c, 0.78));
      const fz = horiz ? m.z0 + 0.16 : 0, fx = horiz ? 0 : m.x0 + 0.16;
      const enCara = (u, y, ww, hh, color, lote, prof) => {
        prof = prof || 0.02;
        if (horiz) (lote || L).caja(m.x0 + u, y, fz + prof / 2 + 0.004, ww, hh, prof, color);
        else (lote || L).caja(fx + prof / 2 + 0.004, y, m.z0 + u, prof, hh, ww, color);
      };
      enCara(len / 2, 0.06, len, 0.12, tono(m.c, 0.7));
      if (m.almenas) for (let u = 0.4; u < len; u += 0.9) { if (horiz) L.cajaB(m.x0 + u, m.h, cz, 0.45, 0.32, 0.22, m.c); else L.cajaB(cx, m.h, m.z0 + u, 0.22, 0.32, 0.45, m.c); }
      if (m.ventanas) for (let u = 1.6; u < len - 0.8; u += 2.4) {
        enCara(u, 1.25, 0.9, 0.7, '#7a5a3a', L, 0.03); enCara(u, 1.25, 0.76, 0.56, '#ffe9a8', Ll, 0.05); enCara(u, 1.25, 0.05, 0.56, '#7a5a3a', L, 0.06); enCara(u, 0.86, 1.0, 0.06, '#7a5a3a', L, 0.08);
        const q = horiz ? { x: m.x0 + u, z: fz + 0.2 } : { x: fx + 0.2, z: m.z0 + u };
        halos.push({ x: q.x, y: 1.25, z: q.z, s: 1.1, c: 0xffd890 });
      }
      if (m.neon) { enCara(len / 2, m.h - 0.2, len - 0.4, 0.04, m.neon, Lb, 0.03); enCara(len / 2, 0.3, len - 0.4, 0.03, m.neon, Lb, 0.03); }
      if (m.espuma) for (let u = 0.5; u < len - 0.3; u += 0.42) for (let y = 0.5; y < m.h - 0.3; y += 0.42) enCara(u, y, 0.34, 0.34, (Math.floor(u * 3) + Math.floor(y * 3)) % 2 ? '#2a2430' : '#332b3a', L, 0.06);
      if (m.franja) { enCara(len / 2, 0.75, len, 0.14, m.franja); enCara(len / 2, 1.02, len, 0.04, m.franja); }
      if (m.pacman) {
        for (let u = 0.6; u < len - 0.4; u += 1.7) { enCara(u, 0.9, 1.2, 0.05, '#2f5bff', Lb, 0.03); enCara(u + 0.6, 0.62, 0.05, 0.6, '#2f5bff', Lb, 0.03); enCara(u - 0.3, 0.35, 0.7, 0.05, '#2f5bff', Lb, 0.03); }
        for (let u = 0.4; u < len; u += 0.5) enCara(u, 0.5 + (Math.floor(u * 2) % 2) * 0.25, 0.07, 0.07, '#ffd77a', Lb, 0.035);
      }
      if (horiz) for (let i = Math.floor(m.x0); i < Math.ceil(m.x1); i++) { const k = celda(i + 0.5, m.z0 + 0.3); if (k >= 0) bloq[k] = 1; }
      else for (let j = Math.floor(m.z0); j < Math.ceil(m.z1); j++) { const k = celda(m.x0 + 0.3, j + 0.5); if (k >= 0) bloq[k] = 1; }
    }

    // ---------- árboles (el follaje va en su propio lote: cambia de color con las estaciones) ----------
    const hojas = [];
    const hoja = (tipo, rol, sem, fn) => { const ini = Lv.p.length / 3; fn(); hojas.push({ ini, n: Lv.p.length / 3 - ini, tipo, rol, sem }); };
    for (const a of D.arboles) {
      const s = a.s, x = a.x, z = a.z, sem = hash(x * 1.7, z * 2.3);
      if (a.t === 'pino') { Lv.cil(x, 0, z, 0.14 * s, 0.6 * s, '#6b4426', 6); for (let k = 0; k < 3; k++) hoja('pino', k % 2, sem, () => Lv.cono(x, (0.45 + k * 0.62) * s, z, (0.95 - k * 0.24) * s, 1.0 * s, k % 2 ? '#3a7a3a' : '#2f6e35', 7)); }
      else if (a.t === 'redondo') {
        Lv.cil(x, 0, z, 0.12 * s, 0.9 * s, '#6b4426', 6);
        hoja('redondo', 0, sem, () => Lv.esfera(x, 1.4 * s, z, 0.85 * s, '#5aa046', 0));
        hoja('redondo', 1, sem, () => Lv.esfera(x + 0.35 * s, 1.15 * s, z + 0.2 * s, 0.5 * s, '#4f9440', 0));
        hoja('redondo', 2, sem, () => Lv.esfera(x - 0.3 * s, 1.75 * s, z - 0.15 * s, 0.45 * s, '#66ae50', 0));
      } else if (a.t === 'cerezo') {
        Lv.cil(x, 0, z, 0.12 * s, 1.0 * s, '#5a3a2a', 6);
        [[0, 1.55, 0, 0.75], [0.45, 1.35, 0.2, 0.5], [-0.4, 1.4, -0.15, 0.55], [0.1, 1.95, -0.2, 0.45]].forEach(([dx, dy, dz, r], k) => hoja('cerezo', k % 2, sem, () => Lv.esfera(x + dx * s, dy * s, z + dz * s, r * s, k % 2 ? '#f2bcd4' : '#f6a8c8', 0)));
      } else if (a.t === 'palmera') {
        for (let k = 0; k < 6; k++) Lv.cilC(x + k * 0.07 * s, (0.33 + k * 0.62) * s, z, (0.15 - k * 0.012) * s, 0.66 * s, k % 2 ? '#8a6a48' : '#7a5a3a', 6, 0, 0, -0.07);
        const px = x + 0.4 * s, py = 3.85 * s;
        for (let k = 0; k < 7; k++) { const ang = k / 7 * Math.PI * 2; Lv.empujarRot(px, py, z, 0, ang, 0); Lv.caja(0, -0.12 * s, 0.75 * s, 0.34 * s, 0.05 * s, 1.6 * s, k % 2 ? '#3f9a3a' : '#4fae46', 0, 0.38); Lv.soltar(); }
        for (let k = 0; k < 3; k++) Lv.esfera(px + (k - 1) * 0.13 * s, py - 0.28 * s, z + 0.1 * s, 0.11 * s, '#6b4a2a', 0);
      } else if (a.t === 'magico') {
        L.agregar('tronco', 6, x, 0.9 * s, z, 0.62 * s, 1.8 * s, 0.62 * s, '#4a3a5a', 0, 0, 0.08);
        const cols = [['#7a4fd8', '#9a6af0'], ['#2fae9a', '#4fcab8'], ['#d84fae', '#f06ac8']][Math.floor(sem * 3) % 3];
        L.esfera(x, 2.3 * s, z, 1.0 * s, cols[0], 1); L.esfera(x + 0.4 * s, 2.0 * s, z + 0.3 * s, 0.6 * s, cols[1], 0); L.esfera(x - 0.3 * s, 2.8 * s, z - 0.2 * s, 0.55 * s, cols[1], 0);
        for (let k = 0; k < 5; k++) { const ang = k * 1.26 + sem * 6; Lb.esfera(x + Math.sin(ang) * 0.85 * s, (2.0 + hash(k, sem) * 0.9) * s, z + Math.cos(ang) * 0.85 * s, 0.07 * s, '#fff0ff', 0); }
        halos.push({ x, y: 2.3 * s, z, s: 2.4 * s, c: new THREE.Color(cols[1]).getHex() });
      } else if (a.t === 'seco') {
        L.cil(x, 0, z, 0.13 * s, 1.7 * s, '#4a3a30', 6);
        for (let k = 0; k < 5; k++) { L.empujarRot(x, (1.0 + k * 0.17) * s, z, 0, k * 1.9 + sem * 6, 0); L.caja(0, 0.28 * s, 0.16 * s, 0.06 * s, 0.7 * s, 0.06 * s, '#4a3a30', 0, 0.75); L.soltar(); }
      } else {
        hoja('arbusto', 0, sem, () => Lv.esfera(x, 0.28 * s, z, 0.42 * s, '#4f9a3f', 0, 1, 0.75, 1));
        hoja('arbusto', 1, sem, () => Lv.esfera(x + 0.2 * s, 0.22 * s, z + 0.15 * s, 0.26 * s, '#5aa84a', 0));
      }
      const k = celda(x, z); if (k >= 0) bloq[k] = 1;
    }

    // ---------- lago, río y cascada ----------
    const rip = texDinamica(64, 64, (x, t, w, h) => {
      x.fillStyle = '#4fb3d9'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,255,255,0.4)'; x.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { const y = (k * 11 + t / 120) % 64; x.beginPath(); x.moveTo(((k * 23) % 50), y); x.lineTo(((k * 23) % 50) + 12, y); x.stroke(); }
    }, 200, false);
    rip.t.wrapS = rip.t.wrapT = THREE.RepeatWrapping;
    const matAgua = new THREE.MeshLambertMaterial({ map: rip.t, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
    const ripM = texDinamica(64, 64, (x, t, w, h) => {
      x.fillStyle = '#2fb8c8'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(230,190,255,0.6)'; x.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { const y = (k * 11 + t / 140) % 64; x.beginPath(); x.moveTo(((k * 23) % 50), y); x.lineTo(((k * 23) % 50) + 12, y); x.stroke(); }
    }, 220, false);
    ripM.t.wrapS = ripM.t.wrapT = THREE.RepeatWrapping;
    const matMagica = new THREE.MeshLambertMaterial({ map: ripM.t, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, emissive: 0x1a6a8a, emissiveIntensity: 0.7 });
    for (const a of D.agua) {
      const r = a.radio || 0.5, s = new THREE.Shape();
      const w = a.x1 - a.x0, h = a.z1 - a.z0;
      s.moveTo(r, 0); s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
      s.lineTo(r, h); s.quadraticCurveTo(0, h, 0, h - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
      const g = new THREE.ShapeGeometry(s, 6);
      g.rotateX(Math.PI / 2);
      const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / 3, uv.getY(k) / 3);
      const agua = new THREE.Mesh(g, a.magica ? matMagica : matAgua);
      if (a.magica) for (let k = 0; k < 6; k++) halos.push({ x: a.x0 + 1 + hash(k, 3) * (w - 2), y: 0.5, z: a.z0 + 1 + hash(3, k) * (h - 2), s: 1.4, c: k % 2 ? 0xb98aff : 0x7ff0ff, siempre: true });
      agua.position.set(a.x0, 0.06, a.z0);
      raiz.add(agua);
      const per = 2 * (w + h);
      for (let k = 0; k < per / 0.75; k++) {
        const u = (k * 0.75) / per; let x, z;
        if (u < w / per) { x = a.x0 + u * per; z = a.z0; } else if (u < (w + h) / per) { x = a.x1; z = a.z0 + (u * per - w); }
        else if (u < (2 * w + h) / per) { x = a.x1 - (u * per - w - h); z = a.z1; } else { x = a.x0; z = a.z1 - (u * per - 2 * w - h); }
        const cx = Math.max(a.x0 + r, Math.min(x, a.x1 - r)), cz = Math.max(a.z0 + r, Math.min(z, a.z1 - r));
        const dd = Math.hypot(x - cx, z - cz) || 1;
        const px = cx + (x - cx) / dd * r, pz = cz + (z - cz) / dd * r;
        if (D.caminable.some((c) => px > c.x0 - 0.6 && px < c.x1 + 0.6 && pz > c.z0 - 0.6 && pz < c.z1 + 0.6)) continue;
        if (cas && Math.abs(px - cas.x) < cas.ancho / 2 + 0.2 && pz > a.z1 - 1) continue;
        if (a.piscina) L.cajaB(px, 0, pz, 0.7, 0.12, 0.7, '#f4f4f0');
        else if (a.mar) L.esfera(px, 0.04, pz, 0.2 + hash(k, 2) * 0.12, '#f8f4e8', 0, 1, 0.25, 1);
        else L.esfera(px, 0.05, pz, 0.17 + hash(k, 2) * 0.12, hash(k, 5) > 0.5 ? '#a8a49c' : '#8f8b84', 0, 1, 0.6, 1);
      }
    }
    if (cas) {
      const largo = cas.z1 - cas.z0;
      const gr = new THREE.PlaneGeometry(cas.ancho, largo); gr.rotateX(-Math.PI / 2);
      const rio = new THREE.Mesh(gr, matAgua); rio.position.set(cas.x, 0.05, cas.z0 + largo / 2); raiz.add(rio);
      for (let z = cas.z0; z < cas.z1; z += 0.6) for (const s of [-1, 1]) L.esfera(cas.x + s * (cas.ancho / 2 + 0.1), 0.05, z, 0.15 + hash(z, s) * 0.1, '#9a968e', 0, 1, 0.6, 1);
      for (let z = Math.floor(cas.z0); z < cas.z1; z++) for (let x = Math.floor(cas.x - cas.ancho / 2); x <= Math.floor(cas.x + cas.ancho / 2); x++) { const k = celda(x + 0.5, z + 0.5); if (k >= 0) bloq[k] = 1; }
      const cae = texDinamica(32, 64, (x, t) => {
        x.fillStyle = '#7fcff0'; x.fillRect(0, 0, 32, 64);
        for (let k = 0; k < 10; k++) { const y = ((k * 13) + t / 18) % 64; x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect((k * 7) % 30, y, 2, 9); }
      }, 60, false);
      const caida = new THREE.Mesh(new THREE.PlaneGeometry(cas.ancho * 1.05, 14), new THREE.MeshBasicMaterial({ map: cae.t, transparent: true, opacity: 0.88, depthWrite: false }));
      caida.position.set(cas.x, -6.9, cas.z1 + 0.2); raiz.add(caida);
      const espuma = new THREE.Group();
      for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + hash(k, 1) * 0.6, 0), new THREE.MeshLambertMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.85 })); m.position.set(cas.x + (hash(k, 3) - 0.5) * 2.4, -13.6 + hash(k, 4), cas.z1 + 0.8 + hash(k, 5)); espuma.add(m); }
      raiz.add(espuma);
      animados.push({ act: (t) => { espuma.children.forEach((m, k) => { m.scale.setScalar(1 + Math.sin(t / 400 + k) * 0.12); }); } });
    }

    // ---------- pisos (con sombra de contacto junto a muros y muebles) ----------
    const esBorde = (i, j) => { for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = celda(i + a + 0.5, j + b + 0.5); if (k >= 0 && bloq[k]) return true; } return false; };
    const cesped = [];
    for (const I of D.islas) for (let i = Math.floor(I.x0); i < Math.ceil(I.x1); i++) for (let j = Math.floor(I.z0); j < Math.ceil(I.z1); j++) {
      const x = i + 0.5, z = j + 0.5;
      if (enCalle(x, z) || enRio(x, z)) continue;
      const zn = zonaDe[i + j * N], ag = aguaEn(x, z);
      let f = 1;
      if (bloq[i + j * N] && !ag) f = 0.86; else if (esBorde(i, j)) f = 0.93;
      if (ag) { bloq[i + j * N] = 1; Lp.plano(x, 0.001, z, 1, 1, ag.magica ? '#245a6a' : ag.piscina ? '#5ab8d0' : ag.mar ? '#3a8aa0' : '#3f7d6a', 0.05); continue; }
      const piso = zn ? (zn.piso || 'cesped') : (I.piso || 'cesped');
      if (piso === 'cesped') {
        const v = hash(i, j) > 0.93 ? 2 : (hash(j, i) > 0.5 ? 1 : 0);
        cesped.push({ ini: Lg.p.length / 3, v, f });
        Lg.plano(x, 0.001, z, 1, 1, '#' + new THREE.Color(PAL.verano.cesped[v]).multiplyScalar(f).getHexString(), 0);
      } else Lp.plano(x, 0.001, z, 1, 1, '#' + new THREE.Color((PISOS[piso] || PISOS.cesped)(i, j)).multiplyScalar(f).getHexString(), 0.05);
      if (!zn && !bloq[i + j * N] && hash(i * 3, j * 7) > 0.82) {
        const ox = (hash(i, j * 5) - 0.5) * 0.6, oz = (hash(i * 9, j) - 0.5) * 0.6;
        if (hash(j, i * 11) > 0.6) Lp.esfera(x + ox, 0.06, z + oz, 0.05, ['#ff6a8a', '#ffe14a', '#ffffff', '#b98aff'][Math.floor(hash(i, j * 13) * 4)], 0, 1, 0.6, 1);
        else for (let k = 0; k < 3; k++) Lp.cajaB(x + ox + k * 0.06, 0, z + oz, 0.03, 0.09 + k * 0.03, 0.03, '#5a9e40');
      }
    }
    for (const a of D.caminable) for (let i = Math.floor(a.x0); i < Math.ceil(a.x1); i++) for (let j = Math.floor(a.z0); j < Math.ceil(a.z1); j++) if (i >= 0 && j >= 0 && i < N && j < N) bloq[i + j * N] = 0;
    for (const p of D.props) if (p.t === 'puente_rojo') {
      for (let i = Math.floor(p.x - 0.6); i <= Math.floor(p.x + 0.6); i++) for (let j = Math.floor(p.z - 1.3); j <= Math.floor(p.z + 1.3); j++) { const k = celda(i + 0.5, j + 0.5); if (k >= 0) bloq[k] = 0; }
      elevar(p.x - 0.6, p.z - 1.3, p.x + 0.6, p.z + 1.3, 0.18);
    }
    const pisos = fija(Lp.malla(MAT.solido, false));
    pisos.receiveShadow = true;
    raiz.add(pisos);
    const mallaG = fija(Lg.malla(MAT.solido, false)); mallaG.receiveShadow = true; raiz.add(mallaG);
    const mallaV = fija(Lv.malla(MAT.solido)); raiz.add(mallaV);

    // ---------- letreros de zona (fuente pixel, sin íconos) ----------
    const zonasLet = D.zonas.filter((z) => z.letrero);
    const filas = Math.ceil(zonasLet.length / 4);
    const atlas = texDinamica(1024, 64 * filas, (x, t, w, h) => {
      x.fillStyle = '#4a2e1a'; x.fillRect(0, 0, w, h);
      zonasLet.forEach((zn, k) => {
        const cx = (k % 4) * 256, cy = Math.floor(k / 4) * 64;
        x.fillStyle = '#f0dcb4'; x.fillRect(cx + 4, cy + 4, 248, 56);
        x.fillStyle = '#d8bf8c'; x.fillRect(cx + 4, cy + 52, 248, 8);
        x.fillStyle = '#3a2614'; x.textAlign = 'center'; x.textBaseline = 'middle';
        let fs = 22; x.font = `bold ${fs}px ${FUENTE}`;
        const txt = zn.nombre.toUpperCase();
        while (x.measureText(txt).width > 232 && fs > 10) { fs--; x.font = `bold ${fs}px ${FUENTE}`; }
        x.fillText(txt, cx + 128, cy + 30);
      });
    }, 0, true);
    const pLet = plan('letreros', matTex(atlas.t, false));
    zonasLet.forEach((zn, k) => {
      const [x, z, r] = zn.letrero;
      const u0 = (k % 4) / 4, v1 = 1 - Math.floor(k / 4) / filas, v0 = v1 - 1 / filas;
      en({ x, z, r }, () => {
        L.cajaB(-0.72, 0, 0, 0.1, 1.45, 0.1, '#4a2e1a'); L.cajaB(0.72, 0, 0, 0.1, 1.45, 0.1, '#4a2e1a');
        L.cajaB(0, 0.86, 0, 1.8, 0.54, 0.07, '#4a2e1a'); L.cajaB(0, 1.42, 0, 1.9, 0.07, 0.12, '#6e4a2c');
        pLet.agregar(0, 1.13, 0.037, 1.7, 0.43, [u0, v0, u0 + 0.25, v1]);
        pLet.agregar(0, 1.13, -0.037, 1.7, 0.43, [u0, v0, u0 + 0.25, v1], Math.PI);
      });
      bloquear(x, z, 1.6, 0.3, r);
    });

    // ---------- mallas finales ----------
    raiz.add(fija(L.malla(MAT.solido)));
    if (!Lb.vacio()) raiz.add(fija(Lb.malla(MAT.brillo, false)));
    if (!Ll.vacio()) raiz.add(fija(Ll.malla(MAT.luces, false)));
    for (const k in planos) if (!planos[k].p.vacio()) { const m = fija(planos[k].p.malla(planos[k].mat)); m.receiveShadow = !(planos[k].mat instanceof THREE.MeshBasicMaterial); raiz.add(m); }

    // ---------- halos (pantallas siempre, lámparas de noche) y charcos de luz ----------
    const texHalo = (() => {
      const c = G.lienzo(64, 64), x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    function instanciar(lista, horizontal, grupo) {
      if (!lista.length) return null;
      const geo = new THREE.PlaneGeometry(1, 1);
      if (horizontal) geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ map: texHalo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
      const im = new THREE.InstancedMesh(geo, mat, lista.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
      lista.forEach((h, k) => {
        v.set(h.x, horizontal ? 0.02 + (k % 7) * 0.0006 : h.y, h.z);
        s.set(h.s, h.s, h.s);
        m.compose(v, q, s);
        im.setMatrixAt(k, m);
        im.setColorAt(k, c.set(h.c));
      });
      im.frustumCulled = false;
      im.renderOrder = 5;
      (grupo || raiz).add(im);
      return { im, lista };
    }
    const hSiempre = instanciar(halos.filter((h) => h.siempre), false);
    const hNoche = instanciar(halos.filter((h) => !h.siempre), false);
    const hCharcos = instanciar(charcos, true);
    const hBalizas = instanciar(balizas.map((b) => ({ x: b.x, y: b.y, z: b.z, s: 1.5, c: 0xff3030 })), false);
    for (const id in EVENTOS_G) {
      const o = EVENTOS_G[id], g = o.grupo;
      if (!o.L.vacio()) g.add(fija(o.L.malla(MAT.solido)));
      if (!o.Lb.vacio()) g.add(fija(o.Lb.malla(MAT.brillo, false)));
      if (!o.Ll.vacio()) g.add(fija(o.Ll.malla(MAT.luces, false)));
      o.hs = instanciar(o.halos.filter((h) => h.siempre), false, g);
      o.hn = instanciar(o.halos.filter((h) => !h.siempre), false, g);
      o.hc = instanciar(o.charcos, true, g);
      g.visible = false;
    }

    // La geometría fija vive en la tarjeta de video: al subirla se suelta la copia de JavaScript (son decenas de MB).
    // El color del pasto y del follaje se queda porque cambia con las estaciones.
    function soltarCopia() { this.array = null; }
    const conservarColor = [mallaG, mallaV];
    raiz.traverse((o) => {
      if (!o.isMesh || !o.userData.fija) return;
      o.geometry.attributes.normal.onUpload(soltarCopia);
      o.geometry.attributes.position.onUpload(soltarCopia);
      if (o.geometry.attributes.color && conservarColor.indexOf(o) < 0) o.geometry.attributes.color.onUpload(soltarCopia);
      if (o.geometry.attributes.uv) o.geometry.attributes.uv.onUpload(soltarCopia);
    });

    // ---------- luces puntuales (pocas, en sitios clave) ----------
    const zn = (id) => D.zonas.find((z) => z.id === id);
    const centro = (id, dz) => { const z = zn(id); return z ? { x: (z.x0 + z.x1) / 2, z: (z.z0 + z.z1) / 2 + (dz || 0) } : null; };
    for (const [id, y, color, i, d, extra] of [['restaurante', 2.8, 0xffd8a0, 22, 14, {}], ['fortaleza', 2.4, 0xff9a4a, 20, 12, { parpadeo: true }], ['laboratorio', 2.2, 0x4ac8ff, 14, 12, {}], ['dormitorio', 2.2, 0xffd8a0, 12, 12, {}]]) {
      const c = centro(id, id === 'fortaleza' ? -3 : 0);
      if (c) luces.push(Object.assign({ x: c.x, y, z: c.z, color, i, d }, extra));
    }
    const puntos = luces.map((l) => {
      const pl = new THREE.PointLight(l.color, 0, l.d, 2);
      pl.position.set(l.x, l.y, l.z);
      raiz.add(pl);
      return { pl, l };
    });

    function orientarHalos(camara) {
      const extra = [];
      for (const id in EVENTOS_G) extra.push(EVENTOS_G[id].hs, EVENTOS_G[id].hn);
      for (const h of [hSiempre, hNoche, hBalizas, ...extra]) {
        if (!h) continue;
        const m = new THREE.Matrix4(), s = new THREE.Vector3(), v = new THREE.Vector3();
        h.lista.forEach((o, k) => { v.set(o.x, o.y, o.z); s.set(o.s, o.s, o.s); m.compose(v, camara.quaternion, s); h.im.setMatrixAt(k, m); });
        h.im.instanceMatrix.needsUpdate = true;
      }
    }

    function actualizar(t, noche, lucesActivas) {
      for (const o of TEXS) if (t - o.ultimo >= o.cada) { o.ultimo = t; o.dibujar(o.ctx, t, o.cv.width, o.cv.height); o.t.needsUpdate = true; }
      for (const a of animados) {
        if (a.fuego) for (let k = 0; k < a.fuego.llamas.length; k++) { const c = a.fuego.llamas[k]; const f = 0.75 + Math.sin(t / 90 + k * 1.7) * 0.18 + Math.sin(t / 37 + k) * 0.08; c.scale.set(1, f, 1); }
        else a.act(t, noche);
      }
      const v = 0.45 + 0.55 * noche;
      MAT.luces.color.setRGB(v, v, v);
      const nn = lucesActivas ? Math.max(0, (noche - 0.25) / 0.75) : 0;
      if (hSiempre) hSiempre.im.material.opacity = 0.22 + noche * 0.6;
      if (hNoche) hNoche.im.material.opacity = nn * 0.85;
      if (hCharcos) hCharcos.im.material.opacity = nn * 0.6;
      if (hBalizas) hBalizas.im.material.opacity = (Math.floor(t / 900) % 2 ? 0.25 : 0.95) * (0.3 + noche * 0.7);
      for (const m of nocturnos) m.opacity = nn * 0.95;
      for (const id in EVENTOS_G) {
        const o = EVENTOS_G[id];
        if (!o.grupo.visible) continue;
        if (o.hs) o.hs.im.material.opacity = 0.22 + noche * 0.6;
        if (o.hn) o.hn.im.material.opacity = nn * 0.85;
        if (o.hc) o.hc.im.material.opacity = nn * 0.6;
      }
      if (!hielo) rip.t.offset.set(t / 40000, t / 25000);
      ripM.t.offset.set(t / 30000, t / 21000);
      for (const { pl, l } of puntos) {
        let i = lucesActivas ? l.i * nn : 0;
        if (l.parpadeo) i *= 0.85 + Math.sin(t / 70) * 0.08 + Math.sin(t / 23) * 0.05;
        if (l.color2) pl.color.setHex(Math.floor(t / 1500) % 2 ? l.color : l.color2);
        pl.intensity = i;
        pl.visible = i > 0.01;
      }
    }

    // ---------- estaciones: recolorea el pasto, el borde de las islas y el follaje ----------
    let estacionActual = 'verano', hielo = false;
    const C1 = new THREE.Color();
    function pintar(attr, ini, n, hex, f) { C1.set(hex); if (f && f !== 1) C1.multiplyScalar(f); for (let k = ini; k < ini + n; k++) attr.setXYZ(k, C1.r, C1.g, C1.b); }
    function setEstacion(e) {
      if (!PAL[e] || e === estacionActual) return;
      estacionActual = e;
      const P2 = PAL[e], cg = mallaG.geometry.attributes.color, cv = mallaV.geometry.attributes.color;
      for (const t of cesped) pintar(cg, t.ini, 6, P2.cesped[t.v], t.f);
      for (const b of bordesIsla) pintar(cg, b.ini, b.n, P2.borde, 1);
      cg.needsUpdate = true;
      for (const h of hojas) {
        let c;
        if (h.tipo === 'pino') c = P2.pino[h.rol % P2.pino.length];
        else if (h.tipo === 'cerezo') c = P2.cerezo[h.rol % 2];
        else if (h.tipo === 'arbusto') c = P2.arbusto[h.rol % 2];
        else { const g = P2.hoja[Math.floor(h.sem * 97) % P2.hoja.length]; c = g[h.rol % g.length]; }
        pintar(cv, h.ini, h.n, c, 1);
      }
      cv.needsUpdate = true;
      hielo = e === 'invierno';
      matAgua.color.set(hielo ? 0xe8f6ff : 0xffffff);
      matAgua.opacity = hielo ? 0.96 : 0.88;
    }
    function setEventos(lista) { for (const id in EVENTOS_G) EVENTOS_G[id].grupo.visible = lista.indexOf(id) >= 0; }

    const calle = new Uint8Array(N * N);
    for (const k of D.calles) for (let u = Math.floor(k.a - ASF); u < Math.ceil(k.b + ASF); u++) for (let v = Math.floor(k.c - ASF); v < Math.ceil(k.c + ASF); v++) {
      if (Math.abs(v + 0.5 - k.c) >= ASF) continue;
      const i = k.dir === 'x' ? u : v, j = k.dir === 'x' ? v : u;
      if (i >= 0 && j >= 0 && i < N && j < N) calle[i + j * N] = 1;
    }
    // Altura exacta del suelo: la de la celda o la de la vereda/asfalto que haya en ese punto (las veredas miden 0,07)
    const pisosCelda = new Array(N * N);
    for (const p of pisables) for (let i = Math.max(0, Math.floor(p[0] - 0.12)); i < Math.min(N, Math.ceil(p[2] + 0.12)); i++) for (let j = Math.max(0, Math.floor(p[1] - 0.12)); j < Math.min(N, Math.ceil(p[3] + 0.12)); j++) (pisosCelda[i + j * N] || (pisosCelda[i + j * N] = [])).push(p);
    function suelo(x, z) {
      const i = Math.floor(x), j = Math.floor(z);
      if (i < 0 || j < 0 || i >= N || j >= N) return 0;
      let h = altura[i + j * N];
      const ps = pisosCelda[i + j * N];
      // 0,12 de margen: el pie sube a la vereda apenas la toca
      if (ps) for (const p of ps) if (p[4] > h && x >= p[0] - 0.12 && x <= p[2] + 0.12 && z >= p[1] - 0.12 && z <= p[3] + 0.12) h = p[4];
      return h;
    }
    // Celdas con baranda: se puede caminar por ellas (la vereda pasa ahí), pero nadie se corre hacia la baranda al esquivar
    const borde = new Uint8Array(N * N);
    for (const b of barandas) for (let i = Math.max(0, Math.floor(b[0])); i <= Math.min(N - 1, Math.floor(b[2])); i++) for (let j = Math.max(0, Math.floor(b[1])); j <= Math.min(N - 1, Math.floor(b[3])); j++) borde[i + j * N] = 1;
    // Punto equivalente en el centro de la vereda más cercana (las calles de las islas van a media celda y la
    // gente caminaba por el borde de la vereda, medio cuerpo dentro de la baranda); null si no hay vereda cerca
    const MEDIO = ASF + VER / 2;
    function carril(x, z) {
      let mejor = null, md = 1e9;
      for (const k of D.calles) {
        const H = k.dir === 'x', u = H ? x : z, dv = (H ? z : x) - k.c, ad = Math.abs(dv);
        if (u < k.a - 0.5 || u > k.b + 0.5 || ad < ASF - 0.6 || ad > ANCHO + 0.6 || Math.abs(ad - MEDIO) >= md) continue;
        md = Math.abs(ad - MEDIO);
        const v = k.c + Math.sign(dv) * MEDIO;
        mejor = H ? [x, v] : [v, z];
      }
      return mejor;
    }
    return { raiz, grid: { N, bloq, altura, calle, suelo, borde, carril }, actualizar, orientarHalos, setEstacion, setEventos };
  }

  return { construir };
})();
