/* Pueblo Agéntico — modelos voxel low-poly de personajes, mascotas y objetos de mano.
 * El personaje mira hacia +z. Su derecha es -x y su izquierda +x. */
window.PA = window.PA || {};
PA.Modelos = (function () {
  'use strict';
  const G = PA.Geo, MAT = G.MAT;
  const tono = (h, f) => PA.Caras.tono(h, f);
  const MAT_HIT = new THREE.MeshBasicMaterial({ visible: false });

  function extrasDe(ap) {
    const o = {};
    for (const e of ap.extras || []) { const i = e.indexOf(':'); if (i < 0) o[e] = true; else o[e.slice(0, i)] = e.slice(i + 1); }
    return o;
  }
  function grupo(n, x, y, z) { const g = new THREE.Group(); g.name = n; g.position.set(x || 0, y || 0, z || 0); return g; }
  function meter(gr, lote, mat, sombra) {
    if (lote.vacio()) return null;
    const m = lote.malla(mat || MAT.solido, false);
    m.castShadow = sombra !== false;
    gr.add(m);
    return m;
  }

  // ---------------- pelo ----------------
  function pelo(L, estilo, c, HW, HH, HD) {
    const top = (h) => L.cajaB(0, HH - 0.03, 0, HW + 0.06, h || 0.1, HD + 0.06, c);
    const atras = (y0) => L.cajaB(0, y0, -HD / 2 - 0.025, HW + 0.06, HH + 0.05 - y0, 0.06, c);
    const lados = (y0, zf) => { for (const s of [-1, 1]) L.cajaB(s * (HW / 2 + 0.025), y0, -HD * 0.12 + (zf || 0), 0.05, HH + 0.04 - y0, HD * 0.76, c); };
    const fleco = (y0) => L.cajaB(0, y0, HD / 2 + 0.02, HW + 0.04, HH + 0.02 - y0, 0.05, c);
    switch (estilo) {
      case 'calvo': return;
      case 'rapado':
        L.cajaB(0, HH - 0.01, 0, HW + 0.02, 0.035, HD + 0.02, c);
        L.cajaB(0, HH * 0.5, -HD / 2 - 0.01, HW + 0.02, HH * 0.5, 0.02, c);
        return;
      case 'ralo':
        for (const [x, z, r] of [[-0.1, 0.05, 0.3], [0.05, -0.05, -0.2], [0.12, 0.08, 0.4], [-0.02, 0.12, -0.3]]) L.caja(x, HH + 0.05, z, 0.025, 0.12, 0.025, c, 0, 0, r);
        return;
      case 'chato':
        // corto y plano arriba, sin flequillo
        L.cajaB(0, HH - 0.02, 0, HW + 0.05, 0.07, HD + 0.05, c);
        L.cajaB(0, HH + 0.04, -0.01, HW * 0.92, 0.03, HD * 0.92, tono(c, 1.1));
        L.cajaB(0, HH * 0.9, HD / 2 + 0.015, HW + 0.03, HH * 0.12, 0.04, c);
        atras(HH * 0.42); lados(HH * 0.58);
        return;
      case 'entradas': {
        // casi nada arriba (la cabeza parece un huevo), pelo corto a los lados y atrás
        L.cajaB(0, HH * 0.3, -HD / 2 - 0.012, HW + 0.025, HH * 0.5, 0.025, c);
        for (const s2 of [-1, 1]) L.cajaB(s2 * (HW / 2 + 0.012), HH * 0.32, -HD * 0.1, 0.025, HH * 0.42, HD * 0.62, c);
        for (const [x, z] of [[-0.06, -0.08], [0.05, -0.02], [0.0, -0.16], [-0.12, -0.18], [0.12, -0.12]]) L.cajaB(x * HW / 0.62, HH - 0.005, z * HD / 0.56, 0.05, 0.02, 0.05, tono(c, 1.05));
        return;
      }
      case 'engominado':
        L.cajaB(0, HH - 0.03, -0.02, HW + 0.05, 0.09, HD + 0.02, c);
        L.cajaB(0, HH + 0.02, -0.06, HW * 0.9, 0.06, HD * 0.8, tono(c, 1.12));
        atras(HH * 0.35); lados(HH * 0.6, -0.03);
        return;
    }
    top(estilo === 'rizado' || estilo === 'ondulado' ? 0.13 : 0.1);
    if (estilo === 'corto' || estilo === 'peinado' || estilo === 'flequillo' || estilo === 'rizado' || estilo === 'ondulado' || estilo === 'coleta' || estilo === 'trenza' || estilo === 'mono') { atras(HH * 0.38); lados(HH * 0.6); }
    if (estilo === 'largo') { atras(-0.34); lados(HH * 0.08); L.cajaB(0, -0.42, -HD / 2 - 0.03, HW * 0.8, 0.1, 0.05, c); }
    if (estilo === 'largo_rizado') {
      atras(-0.4); lados(HH * 0.02);
      // volumen de rizos: arriba, a los lados y una melena que cae por la espalda
      const rizo = (x, y, z, k) => L.caja(x, y, z, k, k, k, tono(c, 0.9 + ((Math.abs(x * 13 + y * 7 + z * 5)) % 0.22)));
      for (const [x, y, z] of [[-0.22, 0.1, 0.12], [0, 0.13, 0.16], [0.22, 0.1, 0.1], [-0.15, 0.14, -0.12], [0.16, 0.12, -0.15], [0, 0.1, -0.24]]) rizo(x * HW / 0.62, HH + y, z * HD / 0.56, 0.15);
      for (const s2 of [-1, 1]) for (let i = 0; i < 6; i++) rizo(s2 * (HW / 2 + 0.06 + (i > 3 ? 0.02 : 0)), HH * 0.75 - i * 0.16, -HD * 0.12 + (i % 2) * 0.06 + (i > 3 ? 0.08 : 0), 0.15);
      for (let i = 0; i < 5; i++) for (const x of [-0.16, 0, 0.16]) rizo(x + (i % 2) * 0.05, HH * 0.6 - i * 0.15, -HD / 2 - 0.07, 0.15);
    }
    if (estilo === 'medio' || estilo === 'despeinado' || estilo === 'mono') { atras(HH * 0.08); lados(HH * 0.14); }
    if (estilo === 'bob') { atras(HH * 0.16); for (const s of [-1, 1]) L.cajaB(s * (HW / 2 + 0.035), HH * 0.16, -HD * 0.05, 0.07, HH * 0.88, HD * 0.86, c); fleco(HH * 0.72); }
    switch (estilo) {
      case 'corto': fleco(HH * 0.86); break;
      case 'peinado':
        L.cajaB(HW * 0.12, HH + 0.05, 0.02, HW * 0.62, 0.07, HD * 0.82, c);
        L.cajaB(-HW * 0.18, HH * 0.84, HD / 2 + 0.02, HW * 0.62, HH * 0.16, 0.05, c);
        break;
      case 'flequillo':
        for (const s of [-1, 1]) L.cajaB(s * (HW / 2 - 0.05), HH * 0.42, HD / 2 + 0.015, 0.12, HH * 0.6, 0.05, c);
        L.cajaB(-0.08, HH * 0.72, HD / 2 + 0.02, HW * 0.42, HH * 0.3, 0.05, c);
        L.cajaB(0.1, HH * 0.78, HD / 2 + 0.02, HW * 0.3, HH * 0.24, 0.05, c);
        break;
      case 'rizado': case 'ondulado': {
        const k = estilo === 'rizado' ? 0.13 : 0.17;
        const pts = estilo === 'rizado'
          ? [[-0.22, 0.1, 0.12], [0, 0.12, 0.16], [0.22, 0.1, 0.1], [-0.15, 0.13, -0.12], [0.16, 0.12, -0.15], [-0.3, -0.05, 0], [0.3, -0.03, -0.05], [0, 0.08, -0.26], [-0.12, -0.02, 0.26], [0.14, -0.02, 0.26]]
          : [[-0.18, 0.12, 0.08], [0.06, 0.15, 0.12], [0.24, 0.1, 0], [-0.08, 0.13, -0.14], [-0.3, 0.0, -0.06], [0.3, 0.02, 0.1], [0, 0.04, 0.26]];
        for (const [x, y, z] of pts) L.caja(x * HW / 0.62, HH + y, z * HD / 0.56, k, k, k, tono(c, 0.92 + ((x * 7 + z * 3) % 0.2)));
        fleco(HH * 0.84);
        break;
      }
      case 'medio': fleco(HH * 0.84); break;
      case 'largo': fleco(HH * 0.86); break;
      case 'largo_rizado': for (const x of [-0.18, 0, 0.18]) L.caja(x * HW / 0.62, HH * 0.86, HD / 2 + 0.04, 0.13, 0.12, 0.08, tono(c, 0.95)); break;
      case 'despeinado':
        fleco(HH * 0.8);
        for (const [x, z, r] of [[-0.2, 0.1, 0.5], [0.15, 0.14, -0.4], [0.25, -0.1, 0.6], [-0.25, -0.15, -0.5], [0, 0.2, 0.2]]) L.caja(x, HH + 0.1, z, 0.1, 0.14, 0.1, c, r, 0, r);
        break;
      case 'coleta':
        fleco(HH * 0.86);
        L.caja(0, HH * 0.42, -HD / 2 - 0.1, 0.13, 0.4, 0.12, c, 0, 0.25);
        L.cajaB(0, HH * 0.66, -HD / 2 - 0.07, 0.09, 0.05, 0.09, tono(c, 0.6));
        break;
      case 'trenza':
        fleco(HH * 0.86);
        for (let i = 0; i < 6; i++) L.caja((i % 2 ? 0.015 : -0.015), HH * 0.4 - i * 0.12, -HD / 2 - 0.08, 0.1, 0.12, 0.09, tono(c, i % 2 ? 0.9 : 1));
        break;
      case 'mono':
        fleco(HH * 0.86);
        L.cajaB(0, HH + 0.04, -HD * 0.25, 0.16, 0.13, 0.16, c);
        break;
    }
  }

  function barba(L, estilo, c, piel, HW, HH, HD) {
    const z = HD / 2 + 0.025;
    const bigote = (w) => L.cajaB(0, HH * 0.305, z, w, 0.045, 0.05, c);
    const lados = (h) => { for (const s of [-1, 1]) L.cajaB(s * (HW / 2 - 0.055), 0, HD * 0.1, 0.12, h, HD * 0.82, c); };
    switch (estilo) {
      case 'corta': L.cajaB(0, -0.02, z, HW * 0.78, HH * 0.2 + 0.02, 0.06, c); lados(HH * 0.42); bigote(HW * 0.36); break;
      case 'rala': {
        const m = '#' + new THREE.Color(piel).lerp(new THREE.Color(c), 0.55).getHexString();
        L.cajaB(0, -0.01, HD / 2 + 0.006, HW * 0.74, HH * 0.2, 0.015, m);
        for (const s of [-1, 1]) L.cajaB(s * (HW / 2 + 0.004), 0, HD * 0.1, 0.012, HH * 0.4, HD * 0.7, m);
        L.cajaB(0, HH * 0.305, HD / 2 + 0.006, HW * 0.34, 0.04, 0.015, m);
        break;
      }
      case 'candado':
        L.cajaB(0, -0.02, z, HW * 0.3, HH * 0.2 + 0.02, 0.05, c);
        bigote(HW * 0.32);
        for (const s of [-1, 1]) L.cajaB(s * HW * 0.17, HH * 0.18, z, 0.035, HH * 0.15, 0.05, c);
        break;
      case 'larga':
        L.cajaB(0, -0.02, z, HW * 0.82, HH * 0.22, 0.07, c); lados(HH * 0.45);
        L.cajaB(0, -0.46, z + 0.01, HW * 0.72, 0.46, 0.1, c);
        L.cajaB(0, -0.62, z + 0.01, HW * 0.44, 0.17, 0.09, tono(c, 0.95));
        bigote(HW * 0.5);
        break;
      case 'kratos':
        L.cajaB(0, -0.02, z, HW * 0.9, HH * 0.24, 0.08, c); lados(HH * 0.46);
        L.cajaB(0, -0.26, z, HW * 0.74, 0.25, 0.09, c);
        bigote(HW * 0.42);
        break;
      case 'gimli':
        L.cajaB(0, -0.02, z, HW * 1.02, HH * 0.3, 0.09, c); lados(HH * 0.55);
        L.cajaB(0, -0.4, z + 0.01, HW * 0.96, 0.4, 0.12, c);
        for (const s of [-1, 1]) L.cajaB(s * 0.12, -0.56, z + 0.01, 0.09, 0.16, 0.09, tono(c, 0.85));
        L.cajaB(0, HH * 0.29, z + 0.01, HW * 0.72, 0.06, 0.06, c);
        break;
      case 'bigote':
        L.cajaB(0, HH * 0.3, z, HW * 0.5, 0.06, 0.05, c);
        for (const s of [-1, 1]) L.caja(s * HW * 0.3, HH * 0.36, z, 0.08, 0.04, 0.04, c, 0, 0, s * 0.6);
        break;
    }
  }

  // ---------------- humano / robot ----------------
  function crearHumano(d) {
    const ap = d.ap || {}, ex = extrasDe(ap);
    const a = ap.alto || 1, w = ap.ancho || 1;
    const LEG = 0.4 * Math.pow(a, 1.5) * (ap.piernaL || 1), TOR = 0.46 * a * (ap.torsoL || 1), TW = 0.5 * w, TD = 0.28 * (0.75 + 0.25 * w);
    const hs = (ap.cabeza || 1) * (0.9 + 0.1 * a) * (ap.cara === 'gollum' ? 1.06 : 1);
    const HW = 0.62 * hs * (ap.cara === 'ballena' ? 1.12 : 1), HH = 0.56 * hs, HD = 0.56 * hs;
    const AW = 0.15 * (0.8 + 0.2 * w) * (ex.traje_espacial ? 1.2 : 1), AD = AW * 1.1, AH = TOR * 0.92 + 0.02;
    const LW = 0.19 * (0.85 + 0.15 * w), LD = 0.21;
    const robot = ap.cara === 'pantalla' || ap.cara === 'monitor';
    const piel = ap.piel || '#f0c8a0';
    const cabezaCol = ap.cabezaColor || piel;
    const cExt = ap.abrigo || ap.chaqueta || ap.torso || '#556677';
    const cIn = ap.torso || cExt;
    const mangas = ex.chaleco_motero ? (ap.camisa || cIn) : (ap.abrigo || ap.chaqueta || ap.torso || '#556677');
    const manos = ap.manos || ex.guantes || piel;
    const piernas = ap.piernas || '#333a48', zapatos = ap.zapatos || '#222222';

    const raiz = grupo('raiz'), cuerpo = grupo('cuerpo');
    raiz.add(cuerpo);
    const brilloT = new G.Lote(), brilloH = new G.Lote();

    // piernas
    const legX = TW / 2 - LW / 2 - 0.015;
    const pierna = (lado) => {
      const g = grupo('pierna' + lado, lado === 'I' ? legX : -legX, LEG, 0);
      const L = new G.Lote();
      if (ap.shorts) {
        L.cajaB(0, -LEG + 0.08, 0, LW * 0.9, LEG - 0.08, LD * 0.9, piel);
        L.cajaB(0, -LEG * 0.4, 0, LW + 0.025, LEG * 0.4, LD + 0.025, ap.shorts);
        L.cajaB(0, -LEG + 0.08, 0, LW * 0.92, 0.07, LD * 0.92, ap.medias || '#f4f4f0');
      } else L.cajaB(0, -LEG + 0.08, 0, LW, LEG - 0.08, LD, piernas);
      L.cajaB(0, -LEG, 0.025, LW + 0.012, 0.085, LD + 0.06, zapatos);
      if (ex.pistolas || (ex.pistolera && lado === 'D')) L.cajaB((lado === 'I' ? 1 : -1) * (LW / 2 + 0.03), -LEG * 0.55, 0, 0.05, LEG * 0.32, 0.12, '#2a211b');
      if (ex.traje_espacial) L.cajaB(0, -LEG + 0.085, 0, LW + 0.03, 0.08, LD + 0.03, '#9aa0a8');
      meter(g, L);
      cuerpo.add(g);
      return g;
    };
    const piernaI = pierna('I'), piernaD = pierna('D');

    // torso
    const torso = grupo('torso', 0, LEG, 0);
    cuerpo.add(torso);
    const T = new G.Lote();
    const zf = TD / 2 + 0.006;
    T.cajaB(0, 0, 0, TW, TOR, TD, cExt);
    if (ap.torso2) T.cajaB(0, -0.002, 0, TW + 0.006, TOR * 0.45, TD + 0.006, ap.torso2);
    if (ap.panza) T.cajaB(0, 0.02, zf - 0.004, TW * 0.72, TOR * 0.7, 0.012, ap.panza);
    if (ap.chaqueta || ap.abrigo) {
      T.cajaB(0, 0.02, zf, TW * 0.34, TOR - 0.03, 0.012, ex.chaleco || cIn);
      T.caja(-TW * 0.13, TOR * 0.72, zf + 0.004, 0.05, TOR * 0.5, 0.012, tono(cExt, 1.12), 0, 0, -0.35);
      T.caja(TW * 0.13, TOR * 0.72, zf + 0.004, 0.05, TOR * 0.5, 0.012, tono(cExt, 1.12), 0, 0, 0.35);
    } else if (ex.chaleco) {
      for (const s of [-1, 1]) T.cajaB(s * TW * 0.31, 0.02, zf, TW * 0.36, TOR - 0.05, 0.014, ex.chaleco);
      T.cajaB(0, 0.02, -TD / 2 - 0.006, TW * 0.98, TOR - 0.05, 0.012, ex.chaleco);
    }
    if (ex.chaleco && (ap.chaqueta || ap.abrigo)) for (let i = 0; i < 3; i++) T.cajaB(0, 0.06 + i * 0.09, zf + 0.008, 0.025, 0.025, 0.01, '#20232a');
    if (ap.camisa && ap.camisa !== cExt && !robot) T.cajaB(0, TOR - 0.1, zf + 0.003, TW * 0.3, 0.1, 0.014, ap.camisa);
    if (ap.corbata) T.cajaB(0, TOR * 0.28, zf + 0.009, 0.06, TOR * 0.64, 0.012, ap.corbata);
    if (!robot && !ap.falda && ap.cara !== 'gollum' && ap.cuerpo !== 'llama') T.cajaB(0, 0, 0, TW + 0.01, 0.05, TD + 0.01, ap.cinturon || '#2a2420');
    if (ex.placa) T.cajaB(TW * 0.3, 0.005, zf + 0.008, 0.07, 0.06, 0.012, '#e3b43c');
    if (ex.collar_cruz) { T.cajaB(0, TOR * 0.68, zf + 0.012, 0.016, 0.06, 0.01, '#e3b43c'); T.cajaB(0, TOR * 0.72, zf + 0.012, 0.045, 0.014, 0.01, '#e3b43c'); }
    if (ex.anillo) { for (let i = 0; i < 4; i++) T.cajaB(-0.06 + i * 0.04, TOR * (0.92 - Math.abs(1.5 - i) * 0.07), zf + 0.01, 0.03, 0.01, 0.01, '#d4b15a'); T.cajaB(0, TOR * 0.68, zf + 0.012, 0.05, 0.05, 0.015, '#f2c94c'); }
    if (ex.cuello_piel) { const c = ex.cuello_piel; T.cajaB(0, TOR - 0.07, 0, TW * 1.08, 0.12, TD * 1.25, c); for (const s of [-1, 0, 1]) T.cajaB(s * TW * 0.3, TOR + 0.03, -TD * 0.1, 0.1, 0.06, TD, tono(c, 1.1)); }
    if (ex.cyberlife) {
      T.cajaB(0, TOR * 0.64, 0, TW + 0.012, 0.05, TD + 0.012, '#e8ecef');
      T.cajaB(-TW * 0.28, TOR * 0.75, zf + 0.008, 0.1, 0.025, 0.01, '#e8ecef');
      brilloT.caja(TW * 0.27, TOR * 0.48, zf + 0.012, 0.06, 0.06, 0.01, '#4cc8ff', 0, 0, Math.PI / 4);
    }
    if (ex.paloma) {
      T.cajaB(0, TOR * 0.45, zf + 0.01, 0.16, 0.06, 0.012, '#ffffff');
      T.caja(-0.08, TOR * 0.56, zf + 0.01, 0.12, 0.04, 0.012, '#ffffff', 0, 0, 0.5);
      T.caja(0.08, TOR * 0.56, zf + 0.01, 0.12, 0.04, 0.012, '#ffffff', 0, 0, -0.5);
      T.cajaB(0, TOR - 0.06, 0, TW + 0.01, 0.06, TD + 0.01, '#f4f4f4');
    }
    if (ex.rig) {
      for (let i = 0; i < 4; i++) brilloT.cajaB(0, 0.08 + i * TOR * 0.2, -TD / 2 - 0.012, 0.07, TOR * 0.13, 0.02, '#5ff2e6');
      for (const s of [-1, 1]) T.cajaB(s * TW * 0.32, TOR - 0.04, 0, TW * 0.42, 0.08, TD + 0.05, '#4e4230');
      T.cajaB(0, TOR * 0.35, zf + 0.006, TW * 0.6, 0.05, 0.02, '#4e4230');
    }
    if (ex.traje_espacial) {
      T.cajaB(0, TOR * 0.42, zf + 0.012, TW * 0.5, TOR * 0.28, 0.04, '#c2c8cf');
      for (let i = 0; i < 3; i++) brilloT.cajaB(-0.07 + i * 0.07, TOR * 0.52, zf + 0.035, 0.035, 0.03, 0.01, ['#ff5050', '#50ff80', '#ffd040'][i]);
      T.cajaB(0, TOR * 0.08, -TD / 2 - 0.12, TW * 0.82, TOR * 0.86, 0.24, '#d4d8dd');
      T.cil(TW * 0.3, TOR * 0.5, -TD / 2 - 0.05, 0.025, TOR * 0.4, '#8a9098', 6);
    }
    if (ex.mochila) T.cajaB(0, TOR * 0.12, -TD / 2 - 0.08, TW * 0.72, TOR * 0.7, 0.16, d.id === 'lara' ? '#5a4632' : '#7a6440');
    if (ex.bolso) {
      T.caja(0, TOR * 0.5, zf + 0.012, 0.045, TOR * 1.25, 0.012, '#4a3020', 0, 0, 0.75);
      T.cajaB(-TW / 2 - 0.05, -0.08, 0.02, 0.08, 0.22, 0.26, ex.bolso);
    }
    if (ex.hacha_espalda) {
      T.caja(0, TOR * 0.5, -TD / 2 - 0.05, 0.05, 0.95, 0.05, '#5a3e26', 0, 0, 0.6);
      T.caja(0.27, TOR * 0.5 + 0.36, -TD / 2 - 0.06, 0.3, 0.2, 0.04, d.id === 'kratos' ? '#a8c4d8' : '#a0a4aa', 0, 0, 0.6);
    }
    if (ex.arco_espalda) {
      for (let i = 0; i < 3; i++) T.caja(-0.05 + i * 0.05, TOR * (0.15 + i * 0.35), -TD / 2 - 0.04, 0.035, 0.34, 0.03, '#6b4a2a', 0, 0, 0.8 - i * 0.5);
    }
    if (ex.carcaj) {
      T.caja(TW * 0.22, TOR * 0.62, -TD / 2 - 0.08, 0.13, 0.45, 0.12, '#5a3a22', 0, 0, -0.3);
      for (let i = 0; i < 3; i++) T.caja(TW * 0.3 + i * 0.03, TOR + 0.08, -TD / 2 - 0.08, 0.02, 0.12, 0.02, '#e8e0d0', 0, 0, -0.3);
    }
    if (ex.espada_cintura) {
      T.caja(TW / 2 + 0.035, -0.18, -0.04, 0.05, 0.62, 0.07, '#3a2a1e', 0.35);
      T.caja(TW / 2 + 0.035, 0.12, 0.06, 0.05, 0.05, 0.16, '#9a9aa2', 0.35);
      T.caja(TW / 2 + 0.035, 0.2, 0.09, 0.04, 0.14, 0.04, '#5a3e26', 0.35);
    }
    if (ex.tatuaje_rojo) {
      T.cajaB(TW * 0.22, TOR * 0.08, zf, 0.06, TOR * 0.9, 0.012, '#b3241c');
      T.cajaB(TW * 0.22, TOR * 0.08, -TD / 2 - 0.006, 0.06, TOR * 0.9, 0.012, '#b3241c');
    }
    if (ex.hombrera) T.caja(0, TOR * 0.55, zf + 0.012, 0.05, TOR * 1.1, 0.012, '#5a4030', 0, 0, -0.7);
    if (ex.delantal) T.cajaB(0, -LEG * 0.55, zf + 0.004, TW * 0.82, LEG * 0.55 + TOR * 0.78, 0.014, ex.delantal);
    if (ex.taparrabo) { T.cajaB(0, -0.2, zf, TW * 0.45, 0.24, 0.03, ex.taparrabo); T.cajaB(0, -0.18, -TD / 2 - 0.01, TW * 0.5, 0.22, 0.03, ex.taparrabo); T.cajaB(0, -0.01, 0, TW + 0.01, 0.05, TD + 0.01, ex.taparrabo); }
    if (ap.falda) {
      const largo = ap.faldaLarga ? LEG * 0.92 : LEG * 0.55;
      T.cajaB(0, -largo, 0, TW * 1.08, largo + 0.05, TD * 1.18, ap.falda);
    }
    if (ap.abrigo) {
      const lc = LEG * 0.72;
      T.cajaB(0, -lc, -TD / 2 + 0.03, TW + 0.03, lc + 0.02, 0.06, ap.abrigo);
      for (const s of [-1, 1]) T.cajaB(s * (TW / 2 - TW * 0.16), -lc, TD / 2 - 0.02, TW * 0.32, lc + 0.02, 0.05, ap.abrigo);
      for (const s of [-1, 1]) T.cajaB(s * (TW / 2 + 0.005), -lc, 0, 0.03, lc + 0.02, TD, ap.abrigo);
    }
    if (ap.cara === 'gollum') T.cajaB(0, TOR * 0.25, zf, TW * 0.6, 0.012, 0.01, tono(piel, 0.85));
    const torsoMalla = meter(torso, T);

    // logo de IA en el pecho
    if (ap.logo) {
      const lm = new THREE.Mesh(new THREE.PlaneGeometry(TW * 0.52, TW * 0.52), new THREE.MeshBasicMaterial({ map: PA.Caras.logo(ap.logo), transparent: true, alphaTest: 0.2 }));
      lm.position.set(0, TOR * 0.55, zf + 0.016);
      torso.add(lm);
    }
    if (ex.cola_ballena) {
      const C = new G.Lote();
      C.caja(0, 0.12, -TD / 2 - 0.14, 0.1, 0.1, 0.26, cExt, -0.3);
      C.caja(-0.12, 0.2, -TD / 2 - 0.27, 0.22, 0.04, 0.12, cExt, 0, 0, 0.45);
      C.caja(0.12, 0.2, -TD / 2 - 0.27, 0.22, 0.04, 0.12, cExt, 0, 0, -0.45);
      meter(torso, C);
    }

    // capa (grupo propio para que se mueva)
    let capa = null;
    if (ap.capa) {
      capa = grupo('capa', 0, TOR - 0.02, -TD / 2 - 0.03);
      const C = new G.Lote();
      const lc = TOR + LEG * 0.82;
      C.cajaB(0, -lc, 0, TW * 1.12, lc, 0.045, ap.capa);
      C.cajaB(0, -0.06, 0.02, TW * 1.16, 0.08, 0.07, tono(ap.capa, 0.8));
      meter(capa, C);
      torso.add(capa);
    }

    // brazos
    const brazo = (lado) => {
      const s = lado === 'I' ? 1 : -1;
      const g = grupo('brazo' + lado, s * (TW / 2 + AW / 2 + 0.006), TOR - 0.05, 0);
      const L = new G.Lote();
      if (ap.brazosPiel) {
        L.cajaB(0, -0.12, 0, AW + 0.01, 0.15, AD + 0.01, cIn);
        L.cajaB(0, -AH + 0.1, 0, AW, AH - 0.2, AD, piel);
      } else L.cajaB(0, -AH + 0.1, 0, AW, AH - 0.08, AD, mangas);
      L.cajaB(0, -AH, 0, AW * 0.92, 0.11, AD * 0.92, manos);
      if (ex.paloma) L.cajaB(0, -AH * 0.45, 0, AW + 0.008, 0.05, AD + 0.008, '#f4f4f4');
      if (ex.traje_espacial) L.cajaB(0, -AH + 0.1, 0, AW + 0.02, 0.06, AD + 0.02, '#9aa0a8');
      if (ex.tatuaje_rojo && lado === 'I') { L.cajaB(0, -AH * 0.35, 0, AW + 0.008, 0.04, AD + 0.008, '#b3241c'); L.cajaB(0, -AH * 0.6, 0, AW + 0.008, 0.04, AD + 0.008, '#b3241c'); }
      if (ex.hombrera && lado === 'I') { L.cajaB(0, -0.06, 0, AW * 1.6, 0.13, AD * 1.5, ex.hombrera); L.cajaB(0, -0.12, 0, AW * 1.4, 0.05, AD * 1.3, tono(ex.hombrera, 0.75)); }
      if (ex.cyberlife && lado === 'I') { L.cajaB(0, -0.2, 0, AW + 0.01, 0.05, AD + 0.01, '#e8ecef'); L.cajaB(0, -0.26, AD / 2 + 0.004, AW * 0.7, 0.03, 0.01, '#4cc8ff'); }
      meter(g, L);
      const mano = grupo('mano' + lado, 0, -AH + 0.05, 0.01);
      g.add(mano);
      torso.add(g);
      return { g, mano };
    };
    const bI = brazo('I'), bD = brazo('D');
    if (ex.baston) {
      const B = new G.Lote();
      B.cajaB(0, -0.55, 0.04, 0.05, 1.75, 0.05, '#6b4a2a');
      B.esfera(0, 1.22, 0.04, 0.07, '#5a3a20', 0);
      meter(bI.mano, B);
    }

    // cabeza
    const cabeza = grupo('cabeza', 0, TOR, 0);
    torso.add(cabeza);
    const H = new G.Lote();
    if (ex.casco_isaac) {
      H.cajaB(0, -0.02, 0, HW * 1.08, HH * 1.06, HD * 1.08, '#6e5f45');
      for (const y of [0.3, 0.55, 0.8]) H.cajaB(0, HH * y, -0.01, HW * 1.1, 0.035, HD * 1.02, '#4a3f2e');
      H.cajaB(0, HH * 0.98, 0, 0.08, 0.08, HD * 0.9, '#4a3f2e');
    } else {
      H.cajaB(0, 0, 0, HW, HH, HD, cabezaCol);
      if (ap.cara === 'monitor') { H.cajaB(0, HH * 0.1, -HD / 2 - 0.09, HW * 0.78, HH * 0.78, 0.18, tono(cabezaCol, 0.85)); }
      if (robot && ap.cara === 'pantalla') for (const s of [-1, 1]) H.cilC(s * (HW / 2 + 0.02), HH * 0.48, 0, 0.09, 0.05, tono(cabezaCol, 0.75), 8, 0, 0, Math.PI / 2);
      if (ap.cara === 'ballena') {
        H.cajaB(0, 0.01, HD / 2 + 0.001, HW * 0.88, HH * 0.34, 0.006, ap.panza || '#eef');
        for (const s of [-1, 1]) H.caja(s * (HW / 2 + 0.05), HH * 0.2, 0, 0.1, 0.05, 0.16, cabezaCol, 0, 0, s * 0.5);
        brilloH.cajaB(0, HH + 0.02, 0, 0.04, 0.12, 0.04, '#9fd8ff');
        brilloH.caja(-0.06, HH + 0.16, 0, 0.04, 0.04, 0.04, '#9fd8ff');
        brilloH.caja(0.06, HH + 0.16, 0, 0.04, 0.04, 0.04, '#9fd8ff');
      }
      if (ap.cara === 'gollum') for (const s of [-1, 1]) H.caja(s * (HW / 2 + 0.05), HH * 0.55, 0, 0.1, 0.16, 0.06, piel, 0, 0, s * 0.3);
      if (!robot && ap.cara !== 'ballena' && !ex.casco_peacemaker) for (const s of [-1, 1]) H.cajaB(s * (HW / 2 + 0.012), HH * 0.38, HD * 0.02, 0.03, HH * 0.18, 0.08, tono(piel, 0.93));
      if (ap.pelo && !ex.casco_astronauta) pelo(H, ap.pelo, ap.cp || '#3a2a1e', HW, HH, HD);
      else if (ap.pelo && ex.casco_astronauta) H.cajaB(0, HH * 0.86, HD / 2 + 0.02, HW * 0.9, HH * 0.12, 0.04, ap.cp || '#3a2a1e');
      if (ap.barba) barba(H, ap.barba, ap.cb || '#3a2a1e', piel, HW, HH, HD);
    }
    if (ex.tatuaje_rojo) H.cajaB(-0.0 + HW * 0.22, HH - 0.005, 0, 0.06, 0.012, HD + 0.01, '#b3241c');
    if (ex.trenzas) { H.cajaB(0, HH * 0.78, 0, HW + 0.09, 0.06, HD + 0.09, tono(ap.cp || '#eee', 0.92)); for (const s of [-1, 1]) H.cajaB(s * (HW / 2 + 0.04), -0.2, -HD * 0.25, 0.06, 0.32, 0.06, tono(ap.cp || '#eee', 0.9)); }
    if (ex.orejas_elfo) for (const s of [-1, 1]) H.caja(s * (HW / 2 + 0.07), HH * 0.55, 0.02, 0.05, 0.16, 0.08, piel, 0, 0, -s * 0.6);
    if (ex.sombrero_mago) {
      const c = ex.sombrero_mago;
      H.cil(0, HH + 0.02, 0, HW * 0.82, 0.035, tono(c, 0.9), 10);
      H.cono(0, HH + 0.05, 0, HW * 0.42, 0.5, c, 6);
      H.cono(0.05, HH + 0.45, -0.02, HW * 0.2, 0.3, c, 6, -0.2, -0.5);
    }
    if (ex.gorro_chef) { H.cil(0, HH - 0.03, 0, HW * 0.5, 0.14, '#ffffff', 10); H.esfera(0, HH + 0.27, 0, 0.27, '#ffffff', 1, 1, 0.8, 1); }
    if (ex.boina) { H.agregar('cil', 10, 0.04, HH + 0.04, 0, HW * 1.12, 0.07, HD * 1.12, ex.boina, 0, 0, -0.18); H.cajaB(0.1, HH + 0.02, HD / 2 - 0.02, 0.06, 0.06, 0.02, '#e3b43c'); }
    if (ex.bandana) {
      const c = ex.bandana;
      H.cajaB(0, HH * 0.74, 0, HW + 0.07, HH * 0.3, HD + 0.07, c);
      H.cajaB(0, HH + 0.02, 0, HW + 0.03, 0.06, HD + 0.03, c);
      H.caja(0.06, HH * 0.75, -HD / 2 - 0.08, 0.05, 0.16, 0.04, c, 0.4);
      H.caja(-0.04, HH * 0.73, -HD / 2 - 0.09, 0.05, 0.18, 0.04, c, 0.6);
    }
    if (ex.casco_peacemaker) {
      const cr = '#d6dce4', cl = '#f6f9fc';
      H.cajaB(0, HH * 0.64, 0, HW + 0.08, HH * 0.42 + 0.06, HD + 0.08, cr);
      H.cajaB(0, HH * 0.15, -HD / 2 - 0.03, HW + 0.08, HH * 0.6, 0.07, cr);
      for (const s of [-1, 1]) H.cajaB(s * (HW / 2 + 0.035), HH * 0.25, -HD * 0.08, 0.07, HH * 0.5, HD * 0.86, cr);
      H.cajaB(0, HH + 0.09, 0, 0.07, 0.09, HD * 0.95, cl);
      H.cajaB(-HW * 0.18, HH * 0.88, HD / 2 + 0.045, HW * 0.3, 0.06, 0.01, cl);
    }
    if (ex.casco_gimli) {
      H.cajaB(0, HH * 0.82, 0, HW + 0.08, HH * 0.32, HD + 0.08, '#7a7e86');
      H.cajaB(0, HH * 0.8, 0, HW + 0.1, 0.05, HD + 0.1, '#c8a24a');
      H.cajaB(0, HH * 0.48, HD / 2 + 0.035, 0.05, HH * 0.34, 0.04, '#7a7e86');
      H.cajaB(0, HH * 1.12, 0, 0.12, 0.08, 0.12, '#7a7e86');
    }
    if (ex.casco_astronauta) {
      const c = '#eef0f2';
      H.cajaB(0, -0.04, -HD / 2 - 0.06, HW + 0.14, HH + 0.16, 0.12, c);
      H.cajaB(0, HH + 0.02, 0, HW + 0.14, 0.09, HD + 0.14, c);
      for (const s of [-1, 1]) H.cajaB(s * (HW / 2 + 0.06), -0.04, 0, 0.08, HH + 0.12, HD + 0.14, c);
      H.cajaB(0, -0.05, 0, HW + 0.14, 0.07, HD + 0.14, '#b8bec6');
      H.cajaB(0, HH - 0.02, HD / 2 + 0.05, HW * 0.92, 0.08, 0.05, '#d9b45a');
      brilloH.cajaB(HW / 2 + 0.1, HH * 0.7, 0.05, 0.04, 0.06, 0.08, '#fffbe0');
    }
    if (ex.gorra_aviador) {
      H.cajaB(0, HH - 0.04, 0, HW + 0.06, 0.12, HD + 0.06, '#7a4e2a');
      for (const s of [-1, 1]) H.cajaB(s * (HW / 2 + 0.035), HH * 0.25, 0, 0.05, HH * 0.55, HD * 0.42, '#6a4222');
      for (const s of [-1, 1]) { H.cilC(s * 0.13, HH + 0.05, HD / 2 - 0.02, 0.075, 0.06, '#3a2a1e', 8, Math.PI / 2); brilloH.cilC(s * 0.13, HH + 0.05, HD / 2 + 0.015, 0.055, 0.02, '#9fe0ff', 8, Math.PI / 2); }
    }
    if (ex.capucha) {
      const c = ex.capucha;
      H.cajaB(0, HH + 0.01, -0.02, HW + 0.12, 0.08, HD + 0.08, c);
      H.cajaB(0, -0.02, -HD / 2 - 0.05, HW + 0.12, HH + 0.1, 0.07, c);
      for (const s of [-1, 1]) H.cajaB(s * (HW / 2 + 0.055), 0, -0.04, 0.06, HH + 0.02, HD * 0.86, c);
    }
    if (ex.corona_estrella) {
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; H.agregar('cono', 4, Math.sin(a) * 0.13, HH + 0.36 + Math.cos(a) * 0.13, 0, 0.11, 0.26, 0.05, k % 2 ? '#b06cf0' : '#6b8cff', 0, 0, -a); }
      brilloH.esfera(0, HH + 0.36, 0, 0.07, '#e8f0ff', 0);
    }
    if (ex.rayos) {
      for (let i = 0; i < 11; i++) {
        const an = i / 11 * Math.PI * 2, l = i % 2 ? 0.2 : 0.15, r = 0.04 + l / 2;
        H.caja(Math.sin(an) * r, HH + 0.24 + Math.cos(an) * r, 0, 0.045, l, 0.045, '#d97757', 0, 0, -an);
      }
    }
    if (ex.nudo) for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; H.caja(Math.cos(an) * 0.11, HH + 0.1, Math.sin(an) * 0.11, 0.09, 0.07, 0.05, '#f4f4f4', -an); }
    if (ex.hexagono) for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + Math.PI / 6; H.caja(Math.sin(an) * 0.15, HH + 0.26 + Math.cos(an) * 0.15, 0, 0.15, 0.045, 0.045, '#dcd9ff', 0, 0, -an + Math.PI / 2); }
    if (ex.antena) { H.cil(0.12, HH, 0, 0.015, 0.2, '#8a8f98', 4); brilloH.esfera(0.12, HH + 0.23, 0, 0.045, ap.brillo || '#7f7', 0); }
    if (ex.flor) { const c = ex.flor; for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; H.caja(-HW / 2 - 0.02, HH * 0.82 + Math.sin(an) * 0.05, 0.08 + Math.cos(an) * 0.05, 0.03, 0.06, 0.06, c); } H.caja(-HW / 2 - 0.035, HH * 0.82, 0.08, 0.03, 0.04, 0.04, '#ffe14a'); }
    if (ex.bufanda) H.cajaB(0, -0.06, 0, HW * 0.8, 0.1, HD * 0.8, ex.bufanda);
    if (ex.audifonos) {
      const c = typeof ex.audifonos === 'string' ? ex.audifonos : '#2a2a30';
      H.cajaB(0, HH + 0.1, -0.02, 0.07, 0.05, HD * 0.5, c);
      for (const s2 of [-1, 1]) { H.cajaB(s2 * (HW / 2 + 0.07), HH * 0.62, -0.02, 0.06, HH * 0.52, 0.06, c); H.cajaB(s2 * (HW / 2 + 0.07), HH * 0.3, -0.02, 0.1, 0.2, 0.18, c); brilloH.cajaB(s2 * (HW / 2 + 0.125), HH * 0.36, -0.02, 0.01, 0.08, 0.08, '#ff5ad8'); }
    }
    if (ex.gorra) {
      H.cajaB(0, HH - 0.03, -0.01, HW + 0.07, 0.13, HD + 0.06, ex.gorra);
      H.cajaB(0, HH - 0.02, HD / 2 + 0.12, HW * 0.8, 0.03, 0.22, tono(ex.gorra, 0.8));
      H.cajaB(0, HH + 0.1, -0.01, 0.06, 0.03, 0.06, tono(ex.gorra, 0.8));
    }
    // gafas (sobre la cara)
    const eyeY = HH * 0.5, eyeX = (HW * 0.94) * 0.172, zG = HD / 2 + 0.016;
    if (ex.gafas) {
      const c = typeof ex.gafas === 'string' ? ex.gafas : '#2a2a2a';
      for (const s of [-1, 1]) {
        H.caja(s * eyeX, eyeY + 0.05, zG, 0.14, 0.018, 0.012, c); H.caja(s * eyeX, eyeY - 0.05, zG, 0.14, 0.018, 0.012, c);
        H.caja(s * eyeX - 0.06, eyeY, zG, 0.018, 0.1, 0.012, c); H.caja(s * eyeX + 0.06, eyeY, zG, 0.018, 0.1, 0.012, c);
        H.caja(s * (HW / 2 + 0.008), eyeY + 0.04, HD * 0.2, 0.012, 0.018, HD * 0.6, c);
      }
      H.caja(0, eyeY + 0.03, zG, 0.06, 0.016, 0.012, c);
    }
    if (ex.gafas_sol) {
      for (const s of [-1, 1]) { H.caja(s * eyeX, eyeY, zG, 0.15, 0.1, 0.015, '#0c0c0e'); H.caja(s * eyeX - 0.035, eyeY + 0.025, zG + 0.008, 0.03, 0.02, 0.005, '#8a8a90'); H.caja(s * (HW / 2 + 0.008), eyeY + 0.03, HD * 0.2, 0.012, 0.018, HD * 0.6, '#0c0c0e'); }
      H.caja(0, eyeY + 0.03, zG, 0.06, 0.016, 0.012, '#0c0c0e');
    }
    meter(cabeza, H);

    // cara (lienzo propio)
    const cara = PA.Caras.crear(d);
    const brilla = ap.cara === 'pantalla' || ap.cara === 'monitor' || ap.cara === 'casco';
    const matCara = brilla ? new THREE.MeshBasicMaterial({ map: cara.tex, alphaTest: 0.4 }) : new THREE.MeshLambertMaterial({ map: cara.tex, alphaTest: 0.4 });
    const caraM = new THREE.Mesh(new THREE.PlaneGeometry(HW * 0.94, HH * 0.92), matCara);
    caraM.position.set(0, HH * 0.47, (ex.casco_isaac ? HD * 1.08 : HD) / 2 + 0.004);
    cabeza.add(caraM);

    // LED de Connor (cambia de color con el ánimo)
    let led = null;
    if (ex.led) {
      led = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10), new THREE.MeshBasicMaterial({ color: 0x38b6ff }));
      led.rotation.z = Math.PI / 2;
      led.position.set(-HW / 2 - 0.006, HH * 0.62, HD * 0.18);
      cabeza.add(led);
    }
    meter(torso, brilloT, MAT.brillo, false);
    meter(cabeza, brilloH, MAT.brillo, false);

    const alto = LEG + TOR + HH + 0.15;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(Math.max(TW + 0.35, 0.8), alto + 0.2, 0.8), MAT_HIT);
    hit.position.y = alto / 2;
    cuerpo.add(hit);

    return {
      tipo: 'humano', raiz, cuerpo, torso, cabeza, piernaI, piernaD, brazoI: bI.g, brazoD: bD.g, manoI: bI.mano, manoD: bD.mano,
      capa, cara, caraM, led, hit, dims: { LEG, TOR, HH, HD, TW, TD, AH, alto }
    };
  }

  // ---------------- cuadrúpedos (gato y llama) ----------------
  function crearCuadrupedo(d, esLlama) {
    const ap = d.ap || {};
    const raiz = grupo('raiz'), cuerpo = grupo('cuerpo');
    raiz.add(cuerpo);
    const c = ap.piel || '#8f7f66';
    const k = esLlama ? 1 : 0.55;
    const BW = (esLlama ? 0.5 : 0.3), BH = (esLlama ? 0.42 : 0.24), BL = (esLlama ? 0.85 : 0.6);
    const PL = esLlama ? 0.55 : 0.2;
    cuerpo.position.y = PL;
    const torso = grupo('torso');
    cuerpo.add(torso);
    const T = new G.Lote();
    T.cajaB(0, 0, 0, BW, BH, BL, c);
    if (esLlama) {
      for (const [x, y, z] of [[-0.18, 0.36, 0.2], [0.17, 0.38, -0.1], [0, 0.4, 0.05], [-0.1, 0.37, -0.28], [0.15, 0.35, 0.3]]) T.caja(x, y, z, 0.2, 0.14, 0.2, tono(c, 0.97));
      T.esfera(0, BH * 0.55, -BL / 2 - 0.08, 0.1, tono(c, 0.95), 0, 1, 1.2, 1);
    } else {
      for (let i = 0; i < 4; i++) T.cajaB(0, BH - 0.005, -0.2 + i * 0.13, BW + 0.01, 0.02, 0.05, ap.rayas || '#3d3428');
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) T.cajaB(s * (BW / 2 + 0.004), BH * 0.4, -0.15 + i * 0.15, 0.01, BH * 0.5, 0.04, ap.rayas || '#3d3428');
      T.cajaB(0, 0.02, BL / 2 - 0.08, BW * 0.8, BH * 0.6, 0.18, ap.pecho || '#f2ece0');
    }
    meter(torso, T);
    const patas = [];
    for (const [x, z, n] of [[-1, 1, 'pd'], [1, 1, 'pi'], [-1, -1, 'td'], [1, -1, 'ti']]) {
      const g = grupo(n, x * (BW / 2 - 0.06 * k), 0.02, z * (BL / 2 - 0.08 * k));
      const L = new G.Lote();
      const pw = esLlama ? 0.13 : 0.085;
      L.cajaB(0, -PL, 0, pw, PL + 0.02, pw, esLlama ? tono(c, 0.96) : c);
      L.cajaB(0, -PL, 0.005, pw + 0.01, esLlama ? 0.08 : 0.05, pw + 0.015, esLlama ? (ap.zapatos || '#3b3b3b') : (ap.pecho || '#f2ece0'));
      meter(g, L);
      cuerpo.add(g);
      patas.push(g);
    }
    // cabeza
    const cuello = grupo('cuello', 0, BH * (esLlama ? 0.7 : 0.75), BL / 2 - (esLlama ? 0.12 : 0.02));
    cuerpo.add(cuello);
    const cabeza = grupo('cabeza', 0, esLlama ? 0.62 : 0.04, esLlama ? 0.04 : 0.1);
    cuello.add(cabeza);
    const N = new G.Lote();
    if (esLlama) {
      N.cajaB(0, -0.05, 0, 0.24, 0.7, 0.24, c);
      for (const y of [0.1, 0.3, 0.5]) N.caja(0, y, 0.02, 0.27, 0.12, 0.27, tono(c, 0.98));
      if (ap.extras && ap.extras.join().indexOf('bufanda') >= 0) {
        const bc = (ap.extras.find((e) => e.indexOf('bufanda') === 0) || 'bufanda:#ff8a3d').split(':')[1];
        N.cajaB(0, 0.02, 0, 0.32, 0.12, 0.32, bc);
        N.caja(0.1, -0.12, 0.17, 0.08, 0.26, 0.04, bc, 0.1);
      }
    }
    meter(cuello, N);
    const HWc = esLlama ? 0.32 : 0.34, HHc = esLlama ? 0.3 : 0.28, HDc = esLlama ? 0.34 : 0.28;
    const H = new G.Lote();
    H.cajaB(0, 0, -HDc / 2, HWc, HHc, HDc, c);
    if (esLlama) {
      H.cajaB(0, 0, 0, HWc * 0.7, HHc * 0.45, 0.14, '#e4dccd');
      for (const s of [-1, 1]) H.caja(s * 0.1, HHc + 0.12, -0.12, 0.07, 0.24, 0.06, c, 0, 0, s * 0.15);
      H.cajaB(0, HHc - 0.02, -HDc / 2, HWc * 0.9, 0.08, HDc * 0.7, tono(c, 0.95));
    } else {
      for (const s of [-1, 1]) { H.caja(s * 0.11, HHc + 0.04, -0.12, 0.09, 0.1, 0.05, c, 0, 0, s * 0.25); H.caja(s * 0.11, HHc + 0.03, -0.1, 0.05, 0.06, 0.02, '#e8a0a8', 0, 0, s * 0.25); }
      H.cajaB(0, 0.01, 0.0, 0.16, 0.09, 0.03, ap.pecho || '#f2ece0');
      for (let i = 0; i < 3; i++) H.cajaB(-0.06 + i * 0.06, HHc - 0.005, -HDc / 2, 0.025, 0.012, HDc * 0.6, ap.rayas || '#3d3428');
    }
    meter(cabeza, H);
    const cara = PA.Caras.crear(d);
    const caraM = new THREE.Mesh(new THREE.PlaneGeometry(HWc * 0.94, HHc * 0.94), new THREE.MeshLambertMaterial({ map: cara.tex, alphaTest: 0.4 }));
    caraM.position.set(0, HHc * 0.5, esLlama ? 0.145 : 0.005);
    if (esLlama) { caraM.scale.set(1, 1, 1); }
    cabeza.add(caraM);
    // cola
    const cola = grupo('cola', 0, BH * 0.8, -BL / 2);
    const Cl = new G.Lote();
    if (esLlama) Cl.esfera(0, 0.02, -0.06, 0.09, tono(c, 0.95), 0);
    else for (let i = 0; i < 4; i++) Cl.caja(0, 0.05 + i * 0.07, -0.04 - i * 0.03, 0.06, 0.09, 0.06, i % 2 ? (ap.rayas || '#3d3428') : c, -0.4 + i * 0.25);
    meter(cola, Cl);
    cuerpo.add(cola);
    const esc = esLlama ? 1 : 1.45;
    cuerpo.scale.setScalar(esc);
    cuerpo.position.y = PL * esc;
    const alto = (PL + BH + (esLlama ? 0.9 : 0.35)) * esc;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.4, (alto + 0.2) / esc, BL + 0.3), MAT_HIT);
    hit.position.y = alto / 2 / esc - PL;
    cuerpo.add(hit);
    return { tipo: esLlama ? 'llama' : 'gato', raiz, cuerpo, torso, cuello, cabeza, patas, cola, cara, caraM, hit, dims: { PL: PL * esc, BH: BH * esc, BL, alto, esc } };
  }

  // ---------------- mascotas voladoras ----------------
  function crearMascota(m) {
    const raiz = grupo('mascota');
    const cuerpo = grupo('cuerpo');
    raiz.add(cuerpo);
    const L = new G.Lote();
    let alaI, alaD, cola = null, escala = 1;
    if (m.tipo === 'aguila') {
      L.cajaB(0, -0.1, 0, 0.2, 0.2, 0.38, '#5a3a22');
      L.cajaB(0, 0.02, 0.2, 0.16, 0.16, 0.16, '#f4f2ec');
      L.cajaB(0, 0.04, 0.32, 0.06, 0.06, 0.08, '#f2b62a');
      L.cajaB(0, -0.04, -0.28, 0.16, 0.04, 0.16, '#f4f2ec');
      for (const s of [-1, 1]) L.cajaB(s * 0.05, 0.08, 0.28, 0.02, 0.02, 0.01, '#111');
      alaI = grupo('alaI', 0.1, 0, 0); alaD = grupo('alaD', -0.1, 0, 0);
      const A = new G.Lote(); A.cajaB(0.25, -0.02, 0, 0.5, 0.03, 0.26, '#4a2e1a'); A.cajaB(0.48, -0.02, -0.03, 0.12, 0.03, 0.2, '#3a2412');
      const B = new G.Lote(); B.cajaB(-0.25, -0.02, 0, 0.5, 0.03, 0.26, '#4a2e1a'); B.cajaB(-0.48, -0.02, -0.03, 0.12, 0.03, 0.2, '#3a2412');
      meter(alaI, A); meter(alaD, B);
    } else {
      escala = 1.4;
      const c = m.color || '#2a2428', c2 = m.color2 || '#7a1f1f';
      L.cajaB(0, -0.15, 0, 0.36, 0.32, 0.8, c);
      L.cajaB(0, -0.12, 0.12, 0.3, 0.12, 0.5, c2);
      L.caja(0, 0.12, 0.5, 0.18, 0.18, 0.3, c, -0.5);
      L.cajaB(0, 0.12, 0.7, 0.24, 0.2, 0.32, c);
      L.cajaB(0, 0.1, 0.88, 0.18, 0.1, 0.12, '#3a3234');
      for (const s of [-1, 1]) { L.caja(s * 0.08, 0.36, 0.6, 0.04, 0.14, 0.04, '#b9a890', 0.6); L.cajaB(s * 0.08, 0.26, 0.84, 0.035, 0.03, 0.01, '#ffb02e'); }
      for (let i = 0; i < 4; i++) L.cajaB(0, 0.17, -0.25 + i * 0.18, 0.05, 0.08, 0.06, '#5a1a1a');
      cola = grupo('cola', 0, -0.05, -0.4);
      const C = new G.Lote();
      for (let i = 0; i < 5; i++) C.cajaB(0, -0.02 * i, -0.18 * i, 0.16 - i * 0.025, 0.12 - i * 0.015, 0.2, c);
      C.cajaB(0, -0.06, -0.95, 0.16, 0.03, 0.14, c2);
      meter(cola, C); cuerpo.add(cola);
      alaI = grupo('alaI', 0.16, 0.1, 0.1); alaD = grupo('alaD', -0.16, 0.1, 0.1);
      const A = new G.Lote(); A.cajaB(0.5, 0, 0, 1.0, 0.04, 0.5, c2); A.cajaB(0.5, 0.01, 0.22, 1.0, 0.06, 0.06, c); A.cajaB(0.95, 0, -0.15, 0.2, 0.04, 0.3, c2);
      const B = new G.Lote(); B.cajaB(-0.5, 0, 0, 1.0, 0.04, 0.5, c2); B.cajaB(-0.5, 0.01, 0.22, 1.0, 0.06, 0.06, c); B.cajaB(-0.95, 0, -0.15, 0.2, 0.04, 0.3, c2);
      meter(alaI, A); meter(alaD, B);
    }
    meter(cuerpo, L);
    cuerpo.add(alaI); cuerpo.add(alaD);
    raiz.scale.setScalar(escala);
    return { raiz, cuerpo, alaI, alaD, cola, tipo: m.tipo };
  }

  // ---------------- objetos de mano ----------------
  // ang = ángulo típico del brazo; el objeto se construye "derecho" y se compensa
  const COMIDAS = ['pizza', 'hamburguesa', 'dona', 'pollo', 'sandwich'];
  function crearItem(nombre, d, opc) {
    const L = new G.Lote(), B = new G.Lote();
    let en = 'manoD', ang = -1.3, extra = null;
    const bebida = (d && d.bebida) || 'cafe';
    switch (nombre) {
      case 'taza':
        if (bebida === 'te') { L.cil(0, 0, 0.06, 0.055, 0.07, '#ffffff', 8); L.cil(0, -0.012, 0.06, 0.09, 0.012, '#f0f0f0', 10); L.cil(0, 0.062, 0.06, 0.045, 0.006, '#c8873a', 8); }
        else if (bebida === 'vino') { L.cil(0, 0, 0.06, 0.012, 0.08, '#e8f0f2', 4); L.cil(0, 0.08, 0.06, 0.045, 0.07, '#8a1c2c', 8); }
        else if (bebida === 'cerveza') { L.cil(0, 0, 0.06, 0.055, 0.12, '#e0a530', 8); L.cil(0, 0.12, 0.06, 0.058, 0.03, '#fffbe8', 8); }
        else if (bebida === 'thirium') { B.cil(0, 0, 0.06, 0.035, 0.13, '#3aa8ff', 6); L.cil(0, 0.13, 0.06, 0.02, 0.03, '#e8e8e8', 6); }
        else if (bebida === 'jugo') { L.cil(0, 0, 0.06, 0.045, 0.1, '#ff9a2a', 8); }
        else { L.cil(0, 0, 0.06, 0.05, 0.1, '#8a4b2a', 8); L.cil(0, 0.095, 0.06, 0.042, 0.006, '#3a2416', 8); }
        L.cajaB(0.06, 0.02, 0.06, 0.02, 0.05, 0.02, bebida === 'te' ? '#ffffff' : '#7a3f22');
        ang = -1.3; break;
      case 'comida': {
        const tipo = COMIDAS[Math.abs(hashStr((d && d.id) || 'x')) % COMIDAS.length];
        if (tipo === 'pizza') { L.caja(0, 0.02, 0.1, 0.13, 0.025, 0.18, '#f2c14e', 0, 0, 0); L.cajaB(0, 0.035, 0.11, 0.1, 0.012, 0.14, '#d9452b'); L.cajaB(0, 0.03, 0.02, 0.14, 0.03, 0.04, '#c88a3a'); }
        else if (tipo === 'hamburguesa') { L.cil(0, 0, 0.08, 0.07, 0.035, '#c8873a', 8); L.cil(0, 0.035, 0.08, 0.072, 0.025, '#5a2e1a', 8); L.cil(0, 0.06, 0.08, 0.074, 0.01, '#5fb84a', 8); L.cil(0, 0.07, 0.08, 0.07, 0.04, '#d9963f', 8); }
        else if (tipo === 'dona') { L.cil(0, 0, 0.08, 0.075, 0.04, '#d9a05a', 8); L.cil(0, 0.035, 0.08, 0.07, 0.01, '#ff7aa8', 8); }
        else if (tipo === 'pollo') { L.esfera(0, 0.04, 0.1, 0.06, '#b8682a', 0, 1, 0.8, 1.3); L.cajaB(0, 0.02, 0.0, 0.025, 0.025, 0.09, '#f2efe6'); }
        else { L.cajaB(0, 0, 0.08, 0.14, 0.03, 0.1, '#f0d9a0'); L.cajaB(0, 0.03, 0.08, 0.15, 0.015, 0.11, '#6fbf4a'); L.cajaB(0, 0.045, 0.08, 0.14, 0.03, 0.1, '#f0d9a0'); }
        ang = -1.5; break;
      }
      case 'helado': L.cono(0, -0.12, 0.06, 0.045, 0.14, '#d8a05a', 6, Math.PI); L.esfera(0, 0.04, 0.06, 0.055, '#ff9ec4', 0); L.esfera(0, 0.1, 0.06, 0.045, '#fff4d6', 0); ang = -1.4; break;
      case 'sarten': L.cil(0, 0, 0.22, 0.13, 0.03, '#2a2a2e', 10); L.cajaB(0, 0.005, 0.04, 0.03, 0.025, 0.16, '#3a2a20'); L.esfera(0.03, 0.04, 0.22, 0.04, '#f6e3a0', 0, 1, 0.4, 1); ang = -1.0; break;
      case 'libro': L.cajaB(0, -0.06, 0.1, 0.22, 0.03, 0.16, '#8a2f2a'); L.cajaB(0, -0.035, 0.1, 0.2, 0.012, 0.15, '#f4eedc'); en = 'ambasCentro'; ang = -1.15; break;
      case 'control': L.cajaB(0, -0.02, 0.1, 0.18, 0.04, 0.09, '#2c2c34'); for (const s of [-1, 1]) L.cajaB(s * 0.08, -0.03, 0.08, 0.06, 0.05, 0.08, '#2c2c34'); B.cajaB(0.04, 0.02, 0.1, 0.02, 0.01, 0.02, '#ff5050'); B.cajaB(-0.04, 0.02, 0.1, 0.02, 0.01, 0.02, '#50a0ff'); en = 'ambasCentro'; ang = -1.0; break;
      case 'raqueta': L.cilC(0, 0.02, 0.18, 0.08, 0.02, '#d63a3a', 10, Math.PI / 2); L.cajaB(0, -0.005, 0.04, 0.03, 0.03, 0.1, '#7a5030'); ang = -1.0; break;
      case 'espada': {
        const c = d && d.id === 'arya' ? '#d8dde4' : '#c8ced6';
        L.cajaB(-0.012, -0.01, 0.0, 0.03, 0.03, 0.13, '#5a3e26');
        L.cajaB(-0.012, -0.01, 0.12, 0.16, 0.03, 0.03, '#8a8a92');
        L.cajaB(-0.012, -0.005, 0.12, 0.04, 0.02, d && d.id === 'arya' ? 0.5 : 0.65, c);
        ang = -0.4; break;
      }
      case 'hacha': L.cajaB(0, -0.01, -0.02, 0.035, 0.035, 0.55, '#5a3e26'); L.cajaB(0, -0.01, 0.42, 0.04, 0.2, 0.16, d && d.id === 'kratos' ? '#a8c4d8' : '#9aa0a8'); ang = -0.4; break;
      case 'llave': L.cajaB(0, 0, 0.06, 0.03, 0.02, 0.18, '#a0a6ae'); L.cajaB(0, 0, 0.16, 0.06, 0.02, 0.04, '#a0a6ae'); ang = -1.0; break;
      case 'cana': L.caja(0, 0.0, 0.5, 0.025, 0.025, 1.1, '#6b4a2a', -0.5); B.cajaB(0, -0.62, 1.05, 0.006, 0.6, 0.006, '#e8e8e8'); L.esfera(0, -0.64, 1.05, 0.03, '#ff3a3a', 0); en = 'ambasCentro'; ang = -0.9; break;
      case 'regadera': L.cajaB(0, -0.1, 0.06, 0.12, 0.12, 0.16, '#3aa86a'); L.caja(0, -0.02, 0.2, 0.03, 0.03, 0.16, '#3aa86a', -0.5); ang = -0.8; break;
      case 'binoculares': for (const s of [-1, 1]) L.cilC(s * 0.05, 0, 0.06, 0.04, 0.14, '#2a2a2e', 8, Math.PI / 2); en = 'ambasCentro'; ang = -2.3; break;
      case 'celular': L.cajaB(0, -0.02, 0.08, 0.1, 0.02, 0.18, '#1a1a1e'); break;
      case 'regalo': L.cajaB(0, -0.1, 0.16, 0.24, 0.2, 0.24, '#d9473b'); L.cajaB(0, -0.11, 0.16, 0.05, 0.22, 0.25, '#ffd23a'); L.cajaB(0, -0.11, 0.16, 0.25, 0.22, 0.05, '#ffd23a'); break;
      case 'mic': L.cajaB(0, -0.02, 0.04, 0.035, 0.035, 0.14, '#2a2a2e'); L.esfera(0, 0, 0.14, 0.045, '#9aa0a8', 1); ang = -2.0; break;
      case 'palomitas': L.cajaB(0, -0.06, 0.09, 0.12, 0.16, 0.1, '#d63a2a'); for (const x of [-0.04, 0, 0.04]) L.cajaB(x, -0.06, 0.141, 0.015, 0.16, 0.002, '#f4f4f0'); for (let k = 0; k < 5; k++) L.esfera(-0.04 + k * 0.02, 0.11, 0.09 + (k % 2) * 0.02, 0.03, '#ffe680', 0); ang = -1.4; break;
      case 'antorcha': L.cajaB(0, -0.02, 0.06, 0.03, 0.03, 0.3, '#5a3a22'); B.cono(0, -0.01, 0.36, 0.05, 0.12, '#ffb030', 5, Math.PI / 2); ang = -1.9; break;
      case 'paraguas': {
        const c = ['#d63a2a', '#2f8fe0', '#f2c230', '#7a4fd8', '#2a2a2e', '#3fae6a'][Math.abs(hashStr((d && d.id) || 'x')) % 6];
        // el mango sale de la mano por el eje z; actores.js calcula el largo para que la tela quede sobre la cabeza y lo endereza
        const ls = (opc && opc.largo) || 0.95;
        L.caja(0, 0, ls / 2 - 0.02, 0.022, 0.022, ls + 0.06, '#2a2a2e');
        L.agregar('cono', 8, 0, 0, ls + 0.13, 1.1, 0.26, 1.1, c, Math.PI / 2, 0, 0);
        L.cil(0, 0, ls + 0.005, 0.5, 0.01, '#2a2a2e', 8, Math.PI / 2);
        L.esfera(0, 0, ls + 0.28, 0.025, '#2a2a2e', 0);
        en = 'paraguas'; ang = 0; break;
      }
      case 'arco':
        for (let i = 0; i < 5; i++) L.caja(0, (i - 2) * 0.15, 0.06 + Math.abs(i - 2) * -0.03, 0.025, 0.16, 0.025, '#6b4a2a', (i - 2) * 0.3);
        B.cajaB(0, -0.32, 0.0, 0.004, 0.64, 0.004, '#f4f4f4');
        en = 'manoI'; ang = -1.57; break;
      case 'guitarra': case 'bajo': {
        const c = nombre === 'bajo' ? '#2a3a8a' : (d && d.id === 'peacemaker' ? '#c0262d' : '#d9822b');
        L.cajaB(0, -0.04, 0, 0.32, 0.26, 0.07, c);
        L.cajaB(0, -0.02, 0.04, 0.1, 0.1, 0.01, '#1a1a1a');
        L.caja(0.3, 0.12, 0, 0.42, 0.05, 0.04, '#5a3a22', 0, 0, 0.35);
        L.caja(0.52, 0.2, 0, 0.1, 0.07, 0.05, '#2a1a12', 0, 0, 0.35);
        en = 'torso'; ang = 0; break;
      }
      case 'baquetas': L.cajaB(0, -0.01, 0.0, 0.02, 0.02, 0.3, '#e8c890'); en = 'ambas'; ang = -0.9; break;
      case 'mancuernas': L.cajaB(0, 0, 0, 0.03, 0.03, 0.12, '#555'); L.cajaB(0, 0, -0.07, 0.07, 0.07, 0.04, '#2a2a2a'); L.cajaB(0, 0, 0.07, 0.07, 0.07, 0.04, '#2a2a2a'); en = 'ambas'; ang = -1.0; break;
      default: return null;
    }
    const g = new THREE.Group();
    meter(g, L);
    meter(g, B, MAT.brillo, false);
    if (en === 'manoD' || en === 'manoI' || en === 'ambas') g.rotation.x = -ang;
    return { g, en, ang, nombre };
  }

  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  function crear(d) {
    const cu = d.ap && d.ap.cuerpo;
    if (cu === 'gato') return crearCuadrupedo(d, false);
    if (cu === 'llama') return crearCuadrupedo(d, true);
    return crearHumano(d);
  }

  return { crear, crearItem, crearMascota, hashStr };
})();
