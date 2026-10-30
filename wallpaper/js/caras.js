/* Pueblo Agéntico — caras en pixel art (32x32) con 23 expresiones.
 * Cada personaje tiene su propio lienzo; solo se redibuja cuando cambia la expresión, la boca o el parpadeo. */
window.PA = window.PA || {};
PA.Caras = (function () {
  'use strict';
  const T = 32;

  const EXP = {
    neutral: { o: 'normal', c: 'plana', b: 'linea' },
    contento: { o: 'normal', c: 'plana', b: 'sonrisa' },
    feliz: { o: 'normal', c: 'arriba1', b: 'D' },
    riendo: { o: 'feliz', c: 'arriba1', b: 'Dg' },
    emocionado: { o: 'brillo', c: 'arriba', b: 'D' },
    sereno: { o: 'cerrado', c: 'plana', b: 'sonrisa' },
    triste: { o: 'abajo', c: 'triste', b: 'triste' },
    lloroso: { o: 'abajo', c: 'triste', b: 'ondulada', lagrimas: true },
    enojado: { o: 'normal', c: 'enojado', b: 'dientes' },
    sorprendido: { o: 'grande', c: 'arriba', b: 'O' },
    asustado: { o: 'asustado', c: 'triste', b: 'ondulada', sudor: true },
    pensativo: { o: 'lado', c: 'una', b: 'lado' },
    picaro: { o: 'guino', c: 'una', b: 'smirk' },
    enamorado: { o: 'corazon', c: 'arriba1', b: 'sonrisa', rubor: true },
    cansado: { o: 'semi', c: 'triste', b: 'pequena', ojeras: true },
    dormido: { o: 'cerrado', c: 'plana', b: 'pequena' },
    aburrido: { o: 'semi', c: 'plana', b: 'lado' },
    confundido: { o: 'confundido', c: 'una', b: 'ondulada' },
    orgulloso: { o: 'semi', c: 'arriba', b: 'smirk' },
    avergonzado: { o: 'abajo', c: 'triste', b: 'ondulada', rubor: true },
    nervioso: { o: 'grande', c: 'triste', b: 'ondulada', sudor: true },
    serio: { o: 'normal', c: 'serio', b: 'linea' },
    decidido: { o: 'normal', c: 'decidido', b: 'firme' }
  };

  function tono(hex, f) {
    const c = new THREE.Color(hex);
    if (f < 1) c.multiplyScalar(f); else c.lerp(new THREE.Color('#ffffff'), f - 1);
    return '#' + c.getHexString();
  }

  function crear(d) {
    const ap = d.ap || {};
    const estilo = ap.cara || (ap.cuerpo === 'gato' ? 'gato' : 'humano');
    const canvas = PA.Geo.lienzo(T, T);
    const ctx = canvas.getContext('2d');
    const tex = PA.Geo.textura(canvas, true);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const piel = ap.piel || '#f0c8a0';
    const col = {
      piel, oscuro: '#1b1922', iris: ap.ojos || '#3a2a1e', iris2: ap.ojos2 || ap.ojos || '#3a2a1e',
      ceja: tono(ap.cb || ap.cp || '#3a2a1e', 0.8), boca: tono(piel, 0.42), parpado: tono(piel, 0.78),
      rubor: 'rgba(255,110,120,0.55)', brillo: ap.brillo || '#9fe7ff', pantalla: ap.pantalla || '#101418',
      tatuaje: (ap.extras || []).indexOf('tatuaje_rojo') >= 0
    };
    if (estilo === 'casco') col.brillo = ap.brillo || '#5ff2e6';
    return { canvas, ctx, tex, estilo, col, clave: '' };
  }

  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // ---------- ojos ----------
  function ojo(ctx, x, y, tipo, col, iris, lado, glow) {
    const D = glow || col.oscuro;
    switch (tipo) {
      case 'normal': case 'abajo': case 'lado': {
        const dy = tipo === 'abajo' ? 1 : tipo === 'lado' ? -1 : 0, dx = tipo === 'lado' ? 1 : 0;
        px(ctx, x + dx, y + dy, 3, 4, D);
        if (!glow) { px(ctx, x + dx, y + dy + 2, 3, 2, iris); px(ctx, x + dx, y + dy + 3, 3, 1, D); px(ctx, x + dx + 1, y + dy + 1, 1, 1, '#ffffff'); }
        break;
      }
      case 'brillo':
        px(ctx, x, y, 3, 4, D);
        if (!glow) { px(ctx, x, y + 2, 3, 1, iris); px(ctx, x + 1, y + 1, 1, 1, '#fff'); px(ctx, x + 2, y + 3, 1, 1, '#fff'); px(ctx, x - 1, y - 1, 1, 1, '#fff6a8'); }
        else { px(ctx, x - 1, y + 1, 5, 2, D); }
        break;
      case 'feliz':
        px(ctx, x, y + 2, 1, 1, D); px(ctx, x + 1, y + 1, 1, 1, D); px(ctx, x + 2, y + 2, 1, 1, D);
        px(ctx, x - 1, y + 3, 1, 1, D); px(ctx, x + 3, y + 3, 1, 1, D);
        break;
      case 'cerrado':
        px(ctx, x - 1, y + 2, 1, 1, D); px(ctx, x, y + 3, 3, 1, D); px(ctx, x + 3, y + 2, 1, 1, D);
        break;
      case 'linea':
        px(ctx, x - 1, y + 2, 5, 1, D);
        break;
      case 'semi':
        px(ctx, x - 1, y + 1, 5, 1, col.parpado);
        px(ctx, x, y + 2, 3, 2, D);
        if (!glow) px(ctx, x, y + 3, 3, 1, iris);
        break;
      case 'grande':
        px(ctx, x - 1, y - 1, 5, 6, D);
        if (!glow) { px(ctx, x, y, 3, 4, '#ffffff'); px(ctx, x + 1, y + 1, 2, 2, D); px(ctx, x + 1, y + 1, 1, 1, iris); }
        break;
      case 'asustado':
        px(ctx, x - 1, y - 1, 5, 6, D);
        if (!glow) { px(ctx, x, y, 3, 4, '#ffffff'); px(ctx, x + 1, y + 2, 1, 1, D); }
        break;
      case 'corazon': {
        const R = glow || '#e8334a';
        px(ctx, x - 1, y, 2, 1, R); px(ctx, x + 2, y, 2, 1, R); px(ctx, x - 1, y + 1, 5, 1, R);
        px(ctx, x, y + 2, 3, 1, R); px(ctx, x + 1, y + 3, 1, 1, R);
        break;
      }
      case 'guino':
        if (lado === 'd') { px(ctx, x - 1, y + 2, 5, 1, D); px(ctx, x - 1, y + 1, 1, 1, D); }
        else ojo(ctx, x, y, 'normal', col, iris, lado, glow);
        break;
      case 'confundido':
        if (lado === 'd') ojo(ctx, x, y, 'grande', col, iris, lado, glow);
        else ojo(ctx, x, y, 'semi', col, iris, lado, glow);
        break;
      default: ojo(ctx, x, y, 'normal', col, iris, lado, glow);
    }
  }

  function cejas(ctx, tipo, xi, xd, y, c) {
    const pinta = (pts) => { for (const [x, yy] of pts) px(ctx, x, yy, 1, 1, c); };
    const L = (dy) => [[xi, y + dy[0]], [xi + 1, y + dy[1]], [xi + 2, y + dy[2]], [xi + 3, y + dy[3]]];
    const R = (dy) => [[xd + 3, y + dy[0]], [xd + 2, y + dy[1]], [xd + 1, y + dy[2]], [xd, y + dy[3]]];
    switch (tipo) {
      case 'enojado': pinta(L([0, 0, 1, 2])); pinta(R([0, 0, 1, 2])); break;
      case 'decidido': pinta(L([0, 0, 1, 1])); pinta(R([0, 0, 1, 1])); break;
      case 'triste': pinta(L([2, 1, 0, 0])); pinta(R([2, 1, 0, 0])); break;
      case 'arriba': pinta(L([-1, -2, -2, -1])); pinta(R([-1, -2, -2, -1])); break;
      case 'arriba1': pinta(L([0, -1, -1, 0])); pinta(R([0, -1, -1, 0])); break;
      case 'una': pinta(L([0, 0, 0, 0])); pinta(R([0, -1, -2, -2])); break;
      case 'serio': pinta(L([1, 1, 1, 1])); pinta(R([1, 1, 1, 1])); break;
      default: pinta(L([0, 0, 0, 0])); pinta(R([0, 0, 0, 0]));
    }
  }

  function boca(ctx, tipo, cx, y, c, interior) {
    const R = interior || '#b23a3a';
    switch (tipo) {
      case 'linea': px(ctx, cx - 2, y, 4, 1, c); break;
      case 'firme': px(ctx, cx - 2, y, 4, 1, c); px(ctx, cx - 3, y - 1, 1, 1, c); break;
      case 'sonrisa': px(ctx, cx - 3, y - 1, 1, 1, c); px(ctx, cx - 2, y, 4, 1, c); px(ctx, cx + 2, y - 1, 1, 1, c); break;
      case 'D': px(ctx, cx - 3, y - 1, 6, 1, c); px(ctx, cx - 3, y, 6, 1, c); px(ctx, cx - 2, y, 4, 1, R); px(ctx, cx - 2, y + 1, 4, 1, c); break;
      case 'Dg': px(ctx, cx - 4, y - 1, 8, 1, c); px(ctx, cx - 4, y, 8, 2, c); px(ctx, cx - 3, y, 6, 2, R); px(ctx, cx - 3, y + 2, 6, 1, c); px(ctx, cx - 1, y + 1, 2, 1, '#ff8f8f'); break;
      case 'abierta': px(ctx, cx - 2, y - 1, 4, 3, c); px(ctx, cx - 1, y, 2, 1, R); break;
      case 'O': px(ctx, cx - 2, y - 1, 4, 4, c); px(ctx, cx - 1, y, 2, 2, R); break;
      case 'triste': px(ctx, cx - 3, y + 1, 1, 1, c); px(ctx, cx - 2, y, 4, 1, c); px(ctx, cx + 2, y + 1, 1, 1, c); break;
      case 'smirk': px(ctx, cx - 2, y, 3, 1, c); px(ctx, cx + 1, y - 1, 1, 1, c); px(ctx, cx + 2, y - 2, 1, 1, c); break;
      case 'ondulada': for (let i = 0; i < 6; i++) px(ctx, cx - 3 + i, y - (i % 2), 1, 1, c); break;
      case 'dientes': px(ctx, cx - 3, y - 1, 6, 3, c); px(ctx, cx - 2, y, 4, 1, '#f4f4f4'); break;
      case 'pequena': px(ctx, cx - 1, y - 1, 2, 2, c); break;
      case 'lado': px(ctx, cx, y, 3, 1, c); break;
      case 'masticar': px(ctx, cx - 2, y - 1, 4, 2, c); break;
      default: px(ctx, cx - 2, y, 4, 1, c);
    }
  }

  // ---------- estilos ----------
  function humano(cara, e, bocaAbierta, parp, masticar) {
    const { ctx, col } = cara;
    const x1 = 9, x2 = 20, y = 13;
    let to = parp ? 'linea' : e.o;
    if (e.o === 'cerrado' || e.o === 'feliz') to = e.o;
    ojo(ctx, x1, y, to, col, col.iris, 'i');
    ojo(ctx, x2, y, to, col, col.iris2, 'd');
    cejas(ctx, e.c, 8, 20, 10, col.ceja);
    if (e.rubor || e.o === 'corazon') { px(ctx, 5, 19, 3, 1, col.rubor); px(ctx, 24, 19, 3, 1, col.rubor); }
    if (e.ojeras) { px(ctx, 9, 18, 3, 1, col.parpado); px(ctx, 20, 18, 3, 1, col.parpado); }
    if (e.lagrimas) { px(ctx, 9, 17, 1, 5, '#6ec6ff'); px(ctx, 22, 17, 1, 5, '#6ec6ff'); }
    if (e.sudor) { px(ctx, 26, 8, 2, 3, '#8fd8ff'); px(ctx, 26, 11, 1, 1, '#8fd8ff'); }
    let b = e.b;
    if (masticar) b = (Date.now() % 500 < 250) ? 'masticar' : 'linea';
    else if (bocaAbierta) b = (b === 'D' || b === 'Dg' || b === 'O') ? 'sonrisa' : 'abierta';
    boca(ctx, b, 16, 23, col.boca);
    if (col.tatuaje) { px(ctx, 22, 0, 2, 12, '#b3241c'); px(ctx, 22, 18, 2, 14, '#b3241c'); }
  }

  function pantalla(cara, e, bocaAbierta, parp, masticar, monitor) {
    const { ctx, col } = cara;
    px(ctx, 2, 3, 28, 25, col.pantalla);
    for (let yy = 4; yy < 28; yy += 3) px(ctx, 3, yy, 26, 1, 'rgba(255,255,255,0.04)');
    const G = col.brillo;
    let to = parp ? 'linea' : e.o;
    if (to === 'normal' || to === 'abajo' || to === 'lado') {
      const dy = to === 'abajo' ? 1 : to === 'lado' ? -1 : 0, dx = to === 'lado' ? 1 : 0;
      px(ctx, 8 + dx, 10 + dy, 3, 5, G); px(ctx, 21 + dx, 10 + dy, 3, 5, G);
    } else {
      ojo(ctx, 8, 11, to, col, G, 'i', G);
      ojo(ctx, 21, 11, to, col, G, 'd', G);
    }
    if (e.c === 'enojado') { px(ctx, 7, 8, 2, 1, G); px(ctx, 9, 9, 2, 1, G); px(ctx, 23, 8, 2, 1, G); px(ctx, 21, 9, 2, 1, G); }
    if (e.c === 'triste') { px(ctx, 9, 8, 2, 1, G); px(ctx, 7, 9, 2, 1, G); px(ctx, 21, 8, 2, 1, G); px(ctx, 23, 9, 2, 1, G); }
    if (e.rubor) { px(ctx, 5, 18, 3, 1, 'rgba(255,120,150,0.8)'); px(ctx, 24, 18, 3, 1, 'rgba(255,120,150,0.8)'); }
    if (e.sudor) px(ctx, 26, 6, 2, 3, '#8fd8ff');
    let b = e.b;
    if (masticar) b = (Date.now() % 500 < 250) ? 'masticar' : 'linea';
    else if (bocaAbierta) b = 'abierta';
    if (monitor) {
      px(ctx, 5, 21, 1, 1, G); px(ctx, 6, 22, 1, 1, G); px(ctx, 5, 23, 1, 1, G);
      if (Date.now() % 1000 < 600) px(ctx, 8, 23, 3, 1, G);
      boca(ctx, b, 18, 22, G, G);
    } else boca(ctx, b, 16, 22, G, G);
  }

  function gato(cara, e, bocaAbierta, parp) {
    const { ctx, col } = cara;
    const ojoG = '#c8d040';
    let to = parp ? 'cerrado' : e.o;
    for (const [x, lado] of [[8, 'i'], [21, 'd']]) {
      if (to === 'cerrado' || to === 'feliz' || to === 'linea') ojo(ctx, x, 12, to === 'feliz' ? 'feliz' : 'cerrado', col, ojoG, lado);
      else if (to === 'semi') { px(ctx, x - 1, 13, 5, 1, '#5a4a3a'); px(ctx, x, 14, 3, 2, ojoG); px(ctx, x + 1, 14, 1, 2, '#111'); }
      else if (to === 'corazon') ojo(ctx, x, 12, 'corazon', col, ojoG, lado);
      else { px(ctx, x - 1, 11, 4, 5, '#2a2018'); px(ctx, x, 12, 2, 3, ojoG); px(ctx, x + 1 - (lado === 'i' ? 1 : 0), 12, 1, 3, '#111'); px(ctx, x, 12, 1, 1, '#fff'); }
    }
    px(ctx, 14, 18, 4, 1, '#e88a9a'); px(ctx, 15, 19, 2, 1, '#e88a9a');
    if (bocaAbierta) { px(ctx, 14, 21, 4, 2, '#5a2a2a'); }
    else { px(ctx, 13, 21, 1, 1, '#3a2a22'); px(ctx, 14, 22, 1, 1, '#3a2a22'); px(ctx, 15, 21, 2, 1, '#3a2a22'); px(ctx, 17, 22, 1, 1, '#3a2a22'); px(ctx, 18, 21, 1, 1, '#3a2a22'); }
    for (const yy of [19, 21]) { px(ctx, 2, yy, 6, 1, 'rgba(255,255,255,0.75)'); px(ctx, 24, yy, 6, 1, 'rgba(255,255,255,0.75)'); }
    if (e.rubor) { px(ctx, 5, 17, 3, 1, col.rubor); px(ctx, 24, 17, 3, 1, col.rubor); }
  }

  function llama(cara, e, bocaAbierta, parp, masticar) {
    const { ctx, col } = cara;
    let to = parp ? 'linea' : e.o;
    for (const [x, l] of [[8, 'i'], [21, 'd']]) {
      if (to === 'normal' || to === 'abajo' || to === 'brillo' || to === 'lado') { px(ctx, x, 11, 3, 4, '#151515'); px(ctx, x + 1, 12, 1, 1, '#fff'); }
      else ojo(ctx, x, 11, to, col, '#151515', l);
    }
    px(ctx, 12, 19, 8, 6, '#e4dccd');
    px(ctx, 14, 20, 1, 1, '#3a3030'); px(ctx, 17, 20, 1, 1, '#3a3030');
    let b = bocaAbierta ? 'abierta' : masticar ? ((Date.now() % 500 < 250) ? 'masticar' : 'linea') : (e.b === 'D' || e.b === 'Dg' ? 'sonrisa' : e.b);
    boca(ctx, b, 16, 23, '#5a4a44');
    if (e.rubor || e.o === 'corazon' || e.b === 'sonrisa') { px(ctx, 5, 17, 3, 1, 'rgba(255,140,150,0.6)'); px(ctx, 24, 17, 3, 1, 'rgba(255,140,150,0.6)'); }
    if (e.c === 'enojado') cejas(ctx, 'enojado', 7, 20, 9, '#8a8070');
  }

  function ballena(cara, e, bocaAbierta, parp, masticar) {
    const { ctx, col } = cara;
    let to = parp ? 'linea' : e.o;
    for (const [x, l] of [[7, 'i'], [22, 'd']]) {
      if (to === 'normal' || to === 'abajo' || to === 'lado' || to === 'brillo') { px(ctx, x, 13, 3, 3, '#0e1a4a'); px(ctx, x + 1, 13, 1, 1, '#fff'); }
      else ojo(ctx, x, 13, to, col, '#0e1a4a', l, '#0e1a4a');
    }
    let b = bocaAbierta ? 'abierta' : masticar ? 'masticar' : e.b;
    boca(ctx, b, 16, 21, '#1d2a6a', '#e05a7a');
    if (e.rubor || e.b === 'sonrisa' || e.b === 'D') { px(ctx, 4, 18, 3, 1, 'rgba(255,140,170,0.7)'); px(ctx, 25, 18, 3, 1, 'rgba(255,140,170,0.7)'); }
  }

  function casco(cara, e) {
    const { ctx, col } = cara;
    px(ctx, 4, 6, 24, 20, '#4a3e2c');
    let G = col.brillo;
    if (e.c === 'enojado' || e.o === 'asustado') G = '#ff6a3a';
    if (e.o === 'grande' || e.sudor) G = '#ffd24a';
    if (e.o === 'cerrado') G = '#2a6a66';
    for (const yy of [10, 15, 20]) { px(ctx, 6, yy, 20, 2, G); px(ctx, 6, yy + 2, 20, 1, 'rgba(0,0,0,0.35)'); }
  }

  function gollum(cara, e, bocaAbierta, parp) {
    const { ctx, col } = cara;
    let to = parp ? 'linea' : e.o;
    for (const [x, l] of [[6, 'i'], [19, 'd']]) {
      if (to === 'linea' || to === 'cerrado' || to === 'feliz') ojo(ctx, x + 1, 12, to, col, '#111', l);
      else {
        px(ctx, x, 9, 7, 7, '#1f2a30'); px(ctx, x + 1, 10, 5, 5, '#bfe4f4'); px(ctx, x + 2, 11, 3, 3, '#1a1a1a'); px(ctx, x + 2, 11, 1, 1, '#ffffff');
        if (to === 'semi') px(ctx, x, 9, 7, 3, col.parpado);
      }
    }
    if (e.c === 'enojado') { px(ctx, 6, 8, 3, 1, '#6a6050'); px(ctx, 9, 9, 2, 1, '#6a6050'); px(ctx, 23, 8, 3, 1, '#6a6050'); px(ctx, 21, 9, 2, 1, '#6a6050'); }
    let b = bocaAbierta ? 'abierta' : e.b;
    boca(ctx, b, 16, 23, '#5a5040');
    px(ctx, 14, 24, 1, 1, '#f0ead0'); px(ctx, 17, 24, 1, 1, '#f0ead0');
  }

  function dibujar(cara, emocion, bocaAbierta, parpadeo, masticar) {
    const e = EXP[emocion] || EXP.neutral;
    const mastF = masticar ? (Date.now() % 500 < 250 ? 1 : 2) : 0;
    const cursor = cara.estilo === 'monitor' ? (Date.now() % 1000 < 600 ? 1 : 0) : 0;
    const clave = emocion + (bocaAbierta ? 'B' : '') + (parpadeo ? 'P' : '') + mastF + cursor;
    if (clave === cara.clave) return;
    cara.clave = clave;
    const ctx = cara.ctx;
    ctx.clearRect(0, 0, T, T);
    switch (cara.estilo) {
      case 'pantalla': pantalla(cara, e, bocaAbierta, parpadeo, masticar, false); break;
      case 'monitor': pantalla(cara, e, bocaAbierta, parpadeo, masticar, true); break;
      case 'gato': gato(cara, e, bocaAbierta, parpadeo); break;
      case 'llama': llama(cara, e, bocaAbierta, parpadeo, masticar); break;
      case 'ballena': ballena(cara, e, bocaAbierta, parpadeo, masticar); break;
      case 'casco': casco(cara, e); break;
      case 'gollum': gollum(cara, e, bocaAbierta, parpadeo); break;
      default: humano(cara, e, bocaAbierta, parpadeo, masticar);
    }
    cara.tex.needsUpdate = true;
  }

  // ---------- logos (pecho de las IAs, 32x32) ----------
  const LOGOS = {};
  function logo(nombre) {
    if (LOGOS[nombre]) return LOGOS[nombre];
    const c = PA.Geo.lienzo(64, 64), x = c.getContext('2d');
    x.lineCap = 'round'; x.lineJoin = 'round';
    const centro = (f) => { x.save(); x.translate(32, 32); f(); x.restore(); };
    switch (nombre) {
      case 'claude':
        x.fillStyle = '#f7e9dc'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
        centro(() => { x.strokeStyle = '#c96442'; x.lineWidth = 6; for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + 0.2, l = i % 2 ? 22 : 18; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * l, Math.sin(a) * l); x.stroke(); } });
        break;
      case 'chatgpt':
        x.fillStyle = '#ffffff'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
        centro(() => { x.strokeStyle = '#1f2a28'; x.lineWidth = 4.5; for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.beginPath(); x.ellipse(0, -9, 7, 13, 0.5, 0, Math.PI * 2); x.stroke(); } });
        break;
      case 'codex':
        x.fillStyle = '#0b120d'; x.fillRect(2, 8, 60, 48); x.fillStyle = '#39ff88'; x.font = 'bold 30px monospace'; x.fillText('>_', 12, 42);
        break;
      case 'gemini': {
        const g = x.createLinearGradient(0, 0, 64, 64); g.addColorStop(0, '#4f8bff'); g.addColorStop(1, '#b06cf0');
        x.fillStyle = g;
        centro(() => { x.beginPath(); x.moveTo(0, -30); x.quadraticCurveTo(2, -2, 30, 0); x.quadraticCurveTo(2, 2, 0, 30); x.quadraticCurveTo(-2, 2, -30, 0); x.quadraticCurveTo(-2, -2, 0, -30); x.fill(); });
        break;
      }
      case 'copilot': {
        const cols = ['#2870ea', '#3bb37e', '#f7b23b', '#e95f8a'];
        centro(() => { x.lineWidth = 11; for (let i = 0; i < 4; i++) { x.strokeStyle = cols[i]; x.beginPath(); x.arc(i < 2 ? -6 : 6, 0, 16, Math.PI * (0.5 * i + 0.25), Math.PI * (0.5 * i + 0.75)); x.stroke(); } });
        break;
      }
      case 'deepseek':
        x.fillStyle = '#ffffff'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
        x.fillStyle = '#4d6bfe'; x.beginPath(); x.ellipse(30, 36, 20, 13, 0, 0, 7); x.fill();
        x.beginPath(); x.moveTo(46, 32); x.lineTo(58, 18); x.lineTo(54, 34); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(22, 33, 3, 0, 7); x.fill();
        break;
      case 'qwen':
        centro(() => { x.strokeStyle = '#ffffff'; x.lineWidth = 7; x.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2; x.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); } x.stroke(); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(0, -10); x.lineTo(9, 6); x.lineTo(-9, 6); x.fill(); });
        break;
      default:
        x.fillStyle = '#fff'; x.fillRect(16, 16, 32, 32);
    }
    const t = PA.Geo.textura(c, false);
    LOGOS[nombre] = t;
    return t;
  }

  return { crear, dibujar, logo, EXP, tono };
})();
