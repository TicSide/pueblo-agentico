/* Pueblo Agéntico — el cielo alrededor de la isla: islas flotantes con molino, faro y cristales,
 * islas lejanas en la neblina, mar de nubes, bandadas de aves y globos aerostáticos. */
window.PA = window.PA || {};
PA.Fondo = (function () {
  'use strict';
  const G = PA.Geo, MAT = G.MAT, hash = G.hash;

  function construir(escena, N) {
    const raiz = new THREE.Group();
    raiz.name = 'fondo';
    escena.add(raiz);
    const L = new G.Lote(), Lb = new G.Lote(), Ll = new G.Lote();
    const animados = [];
    const C = 87;   // centro original del archipiélago: las islas nuevas crecen hacia abajo

    // ---------- islas flotantes ----------
    function isla(cx, cy, cz, r, semilla) {
      const partes = [[0, 0, 1], [r * 0.55, r * 0.3, 0.62], [-r * 0.5, r * 0.32, 0.56], [r * 0.12, -r * 0.55, 0.6]];
      for (const [dx, dz, k] of partes) {
        const rr = r * k;
        L.cil(cx + dx, cy - 0.4, cz + dz, rr, 0.4, '#6aa94a', 9);
        L.cil(cx + dx, cy - 1.7, cz + dz, rr * 0.96, 1.3, '#8a5a38', 9);
        L.cono(cx + dx, cy - 1.7 - rr * 1.5, cz + dz, rr * 0.92, rr * 1.5, '#5a3a28', 7, Math.PI);
      }
      for (let k = 0; k < 5; k++) {
        const a = hash(k, semilla) * 6.28, d = r * (0.3 + hash(semilla, k) * 0.5);
        Lb.cono(cx + Math.cos(a) * d, cy - 2.6 - hash(k, k + semilla) * 1.5, cz + Math.sin(a) * d, 0.22, 0.8, ['#7ff0ff', '#c79bff', '#7fffb0'][k % 3], 4, Math.PI);
      }
    }
    function pino(x, y, z, s) { L.cil(x, y, z, 0.14 * s, 0.6 * s, '#6b4426', 6); for (let k = 0; k < 3; k++) L.cono(x, y + (0.45 + k * 0.62) * s, z, (0.95 - k * 0.24) * s, 1.0 * s, k % 2 ? '#3a7a3a' : '#2f6e35', 7); }
    function redondo(x, y, z, s, c) { L.cil(x, y, z, 0.12 * s, 0.9 * s, '#6b4426', 6); L.esfera(x, y + 1.4 * s, z, 0.85 * s, c || '#5aa046', 0); L.esfera(x + 0.35 * s, y + 1.15 * s, z + 0.2 * s, 0.5 * s, '#4f9440', 0); }
    function casita(x, y, z, ry, c) {
      L.empujar(x, y, z, ry);
      L.cajaB(0, 0, 0, 2.2, 1.5, 1.8, c || '#efe0c6');
      L.caja(0, 1.86, 0.5, 2.5, 0.12, 1.3, '#b8423a', 0, 0.62); L.caja(0, 1.86, -0.5, 2.5, 0.12, 1.3, '#a8382f', 0, -0.62);
      L.agregar('caja', 0, 0, 1.75, 0, 2.18, 0.5, 1.2, c || '#efe0c6', Math.PI / 4, 0, 0);
      L.cajaB(0, 0, 0.91, 0.5, 0.9, 0.04, '#6e4a2c'); L.cajaB(0.7, 1.9, -0.3, 0.3, 0.8, 0.3, '#8a6050');
      Ll.cajaB(-0.6, 0.7, 0.92, 0.45, 0.4, 0.03, '#ffe2a0'); Ll.cajaB(0.6, 0.7, 0.92, 0.45, 0.4, 0.03, '#ffe2a0');
      L.soltar();
    }

    // 2) Isla del faro (a la derecha, entre el Parque Deportivo y Japón)
    const m2 = { x: C + 113, y: -12, z: C - 28 };
    isla(m2.x, m2.y, m2.z, 7, 7);
    for (let k = 0; k < 6; k++) L.cil(m2.x, m2.y + k * 0.9, m2.z, 1.05 - k * 0.07, 0.9, k % 2 ? '#f4f4f0' : '#c0262d', 10);
    L.cil(m2.x, m2.y + 5.4, m2.z, 0.95, 0.12, '#2a2a30', 10);
    Ll.cil(m2.x, m2.y + 5.52, m2.z, 0.62, 0.8, '#fff2b0', 10);
    L.cono(m2.x, m2.y + 6.32, m2.z, 0.85, 0.8, '#2a2a30', 10);
    for (const [dx, dz, s] of [[3.2, 2.4, 0.9], [-3.0, 2.6, 0.8], [2.4, -3.2, 0.85]]) pino(m2.x + dx, m2.y, m2.z + dz, s);
    for (let k = 0; k < 6; k++) L.esfera(m2.x + Math.cos(k) * 4.5, m2.y + 0.1, m2.z + Math.sin(k) * 4.5, 0.5 + hash(k, 2) * 0.4, '#8f8b84', 0, 1.2, 0.7, 1);
    const haz = new THREE.Mesh(new THREE.ConeGeometry(1.6, 16, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    haz.rotation.z = Math.PI / 2; haz.position.set(8, 0, 0);
    const brazo = new THREE.Group(); brazo.position.set(m2.x, m2.y + 5.9, m2.z); brazo.add(haz); raiz.add(brazo);
    animados.push((t, noche) => { brazo.rotation.y = t / 1800; haz.visible = noche > 0.35; });

    // 3) Isla de cristales (a la izquierda, entre el Barrio Residencial y el Parque de Diversiones)
    const m3 = { x: C - 63, y: -12, z: C + 99 };
    isla(m3.x, m3.y, m3.z, 5, 11);
    for (let k = 0; k < 9; k++) { const a = k * 0.7, d = 0.5 + (k % 3) * 0.9; Lb.cono(m3.x + Math.cos(a) * d, m3.y, m3.z + Math.sin(a) * d, 0.25 + (k % 2) * 0.15, 1.2 + hash(k, 4) * 1.6, ['#7ff0ff', '#c79bff', '#7fffb0', '#ffd27f'][k % 4], 5); }
    pino(m3.x + 2.8, m3.y, m3.z - 1.6, 0.8);

    // 4) Islotes de adelante (abajo, entre el Súper Parque y Japón)
    const m4 = { x: C + 82, y: -11, z: C + 110 }, m5 = { x: C + 66, y: -11, z: C + 122 };
    isla(m4.x, m4.y, m4.z, 4.5, 13); casita(m4.x - 0.6, m4.y, m4.z - 0.4, -0.3, '#d8e8f0'); redondo(m4.x + 2.2, m4.y, m4.z + 1.5, 0.8, '#f2bcd4');
    isla(m5.x, m5.y, m5.z, 4.5, 17); redondo(m5.x, m5.y, m5.z, 1.2, '#f6a8c8'); L.cajaB(m5.x + 1.8, m5.y + 0.4, m5.z + 1.2, 1.4, 0.08, 0.4, '#a87445'); casita(m5.x - 1.9, m5.y, m5.z - 1.2, 0.8, '#f0d8c0');

    // 5) Islas lejanas (se pierden en la neblina)
    for (const [x, y, z, r, s] of [[C - 128, -42, C - 128, 11, 21], [C - 155, -38, C - 92, 8, 23], [C - 92, -38, C - 155, 8, 25], [C - 180, -52, C - 125, 10, 27], [C - 125, -52, C - 180, 10, 29]]) {
      isla(x, y, z, r, s);
      for (let k = 0; k < 3; k++) pino(x + (hash(k, s) - 0.5) * r, y, z + (hash(s, k) - 0.5) * r, 1.2);
    }

    // ---------- mar de nubes (abajo) ----------
    const LN = new G.Lote();
    for (let k = 0; k < 260; k++) {
      const a = hash(k, 3) * Math.PI * 2, d = 30 + hash(3, k) * 190;
      const x = C + 18 + Math.cos(a) * d, z = C + 18 + Math.sin(a) * d;
      const r = 6 + hash(k, 8) * 9;
      LN.esfera(x, -22 - hash(k, 9) * 6, z, r, hash(k, 4) > 0.5 ? '#ffffff' : '#eef3fb', 1, 1, 0.34, 1);
    }
    const marNubes = LN.malla(new THREE.MeshLambertMaterial({ vertexColors: true }), false);
    raiz.add(marNubes);

    // ---------- nubes altas que se mueven ----------
    const matNube = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.94 });
    const nubes = [];
    for (let k = 0; k < 9; k++) {
      const g = new THREE.Group();
      // los 5 copos de cada nube van fusionados en una sola malla (menos llamadas de dibujo)
      const LC = new G.Lote();
      for (let j = 0; j < 5; j++) LC.esfera(j * 1.4 - 2.8, hash(j, k) * 0.7, hash(k, j) * 0.9, 1, '#ffffff', 1, 1.2 + hash(j * 3, k), 0.8 + hash(k, j * 2) * 0.5, 1.1);
      const mc = new THREE.Mesh(LC.geometria(), matNube); g.add(mc);
      g.scale.setScalar(1.2 + hash(k, 5) * 0.8);
      g.scale.multiplyScalar(1.5);
      const esc = g.scale.x;
      g.userData = { a: hash(k, 1) * 6.28, r: 118 + hash(k, 2) * 45, y: 16 + hash(k, 3) * 16, v: 0.003 + hash(k, 6) * 0.003, esc };
      raiz.add(g); nubes.push(g);
    }

    // ---------- bandadas de aves ----------
    const matAve = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
    const bandadas = [];
    for (let b = 0; b < 2; b++) {
      const g = new THREE.Group();
      const aves = [];
      for (let k = 0; k < 6; k++) {
        const ave = new THREE.Group();
        const fila = Math.ceil(k / 2), lado = k % 2 ? 1 : -1;
        ave.position.set(lado * fila * 0.9, 0, -fila * 0.9);
        const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.35), matAve);
        const ai = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), matAve), ad = ai.clone();
        ai.geometry = ai.geometry.clone(); ai.geometry.translate(0.25, 0, 0); ad.geometry = ad.geometry.clone(); ad.geometry.translate(-0.25, 0, 0);
        ave.add(cuerpo, ai, ad);
        g.add(ave); aves.push({ ai, ad, f: k * 0.7 });
      }
      raiz.add(g);
      bandadas.push({ g, aves, r: 96 + b * 30, y: 20 + b * 6, v: 0.035 + b * 0.012, a: b * 3 });
    }

    // ---------- globos aerostáticos ----------
    const globos = [];
    for (let k = 0; k < 2; k++) {
      const g = new THREE.Group();
      const LG = new G.Lote();
      const cols = k ? ['#e8473f', '#f2c230'] : ['#3a8ae0', '#f4f4f0'];
      const R = 1.4, n = 9;
      for (let s = 0; s < n; s++) { const r = R * Math.sin(Math.PI * (s + 0.5) / n) + 0.05, h = 2 * R / n; LG.cil(0, 3 - R * 1.1 + s * h * 1.1, 0, r, h * 1.1 + 0.01, cols[s % 2], 12); }
      LG.cil(0, 3 - R * 1.1 - 0.35, 0, 0.35, 0.4, cols[1], 10);
      LG.cajaB(0, 0, 0, 0.7, 0.55, 0.7, '#8a5a34');
      for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) LG.caja(x, 1.0, z, 0.03, 1.0, 0.03, '#5a3a22', 0, 0, x * 0.4);
      const m = LG.malla(MAT.solido); m.castShadow = false;
      g.add(m);
      raiz.add(g);
      globos.push({ g, a: k * 2.6 + 1, r: 128 + k * 16, y: 14 + k * 7, v: 0.004 + k * 0.0015 });
    }

    // ---------- mallas ----------
    const ms = L.malla(MAT.solido); ms.castShadow = false; ms.receiveShadow = false; raiz.add(ms);
    raiz.add(Lb.malla(MAT.brillo, false));
    raiz.add(Ll.malla(MAT.luces, false));

    let grisNubes = -1;
    function actualizar(t, nubosidad) {
      const s = t / 1000;
      const g = Math.round((nubosidad || 0) * 20) / 20;
      if (g !== grisNubes) { grisNubes = g; const v = 1 - g * 0.45; matNube.color.setRGB(v, v, v * 1.02); marNubes.material.color.setRGB(1 - g * 0.35, 1 - g * 0.35, 1 - g * 0.32); }
      for (const f of animados) f(t, PA.Escena.noche);
      for (const n of nubes) {
        const u = n.userData, a = u.a + s * u.v;
        n.position.set(C + Math.cos(a) * u.r, u.y, C + Math.sin(a) * u.r); n.rotation.y = -a;
        // las nubes altas solo pasan por detrás: al acercarse al frente (hacia la cámara) se encogen y desaparecen
        const frente = Math.cos(a - Math.PI / 4), k = Math.max(0, Math.min(1, (0.1 - frente) * 3));
        n.visible = k > 0.01; if (n.visible) n.scale.setScalar(u.esc * k);
      }
      for (const b of bandadas) {
        const a = b.a + s * b.v;
        b.g.position.set(C + Math.cos(a) * b.r, b.y + Math.sin(s * 0.4 + b.a) * 2, C + Math.sin(a) * b.r);
        b.g.rotation.y = -a + Math.PI;
        for (const av of b.aves) { const w = Math.sin(s * 9 + av.f) * 0.7; av.ai.rotation.z = w; av.ad.rotation.z = -w; }
      }
      for (const g of globos) { const a = g.a + s * g.v; g.g.position.set(C + Math.cos(a) * g.r, g.y + Math.sin(s * 0.3 + g.a) * 1.5, C + Math.sin(a) * g.r); }
    }

    return { raiz, actualizar };
  }

  return { construir };
})();
