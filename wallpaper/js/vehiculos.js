/* Pueblo Agéntico — tránsito: autos y motos que recorren las calles por su carril, frenan ante
 * peatones y otros vehículos; la moto de Deacon (o Claire) que sale a pasear y vuelve al campamento,
 * y la bici y el auto blanco de Luis, que salen de la entrada de su casa en el Barrio Residencial. */
window.PA = window.PA || {};
PA.Vehiculos = (function () {
  'use strict';
  const G = PA.Geo, MAT = G.MAT, rad = G.rad;
  const V2 = (x, z) => ({ x, z });
  const CARRIL = 1.1, MARGEN_CRUCE = 3.4;

  // ---------------- modelos ----------------
  // Charco de luz de un faro sobre el piso: elipse alargada hacia adelante, cálida y con bordes suaves
  function texCharco() {
    const c = G.lienzo(64, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 14, 2, 32, 56, 66);
    g.addColorStop(0, 'rgba(255,244,214,0.9)'); g.addColorStop(0.35, 'rgba(255,236,196,0.42)'); g.addColorStop(0.75, 'rgba(255,228,186,0.1)'); g.addColorStop(1, 'rgba(255,228,186,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 128);
    return new THREE.CanvasTexture(c);
  }
  let TEX_CHARCO = null;
  // un plano por faro, todos fusionados en una malla por vehículo
  function faros(posiciones, largo) {
    TEX_CHARCO = TEX_CHARCO || texCharco();
    const P = new G.Planos();
    for (const x of posiciones) P.agregar(x * 1.6, 0.03, largo / 2 + 1.35, 1.15, 2.6, [0, 0, 1, 1], 0, -Math.PI / 2);
    const m = P.malla(new THREE.MeshBasicMaterial({ map: TEX_CHARCO, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    m.renderOrder = 3;
    return m;
  }

  function crearAuto(tipo, color) {
    const g = new THREE.Group(), L = new G.Lote(), Lb = new G.Lote();
    const vid = '#2c3e50', neg = '#1a1a1e';
    const largo = tipo === 'furgo' ? 2.2 : 2.05, alto = tipo === 'furgo' ? 0.95 : 0.42;
    L.cajaB(0, 0.18, 0, 1.0, alto, largo, color);
    L.cajaB(0, 0.16, 0, 1.04, 0.1, largo + 0.04, '#2a2a2e');
    if (tipo === 'furgo') {
      L.cajaB(0, 0.6, 0.75, 0.94, 0.38, 0.06, vid); for (const s of [-1, 1]) L.cajaB(s * 0.505, 0.62, 0.45, 0.01, 0.32, 0.5, vid);
      L.cajaB(0, 0.36, -1.11, 0.5, 0.06, 0.01, '#d0d0d0');
    } else if (tipo === 'pickup') {
      L.cajaB(0, 0.6, 0.25, 0.92, 0.38, 0.8, vid); L.cajaB(0, 0.98, 0.25, 0.94, 0.06, 0.82, color);
      L.cajaB(0, 0.6, -0.6, 1.0, 0.14, 0.85, color); L.cajaB(0, 0.58, -0.6, 0.86, 0.02, 0.78, '#3a3a3e');
    } else {
      L.cajaB(0, 0.6, -0.08, 0.9, 0.36, 1.12, vid);
      L.cajaB(0, 0.96, -0.08, 0.92, 0.07, 1.04, color);
      for (const z of [0.47, -0.62]) for (const s of [-1, 1]) L.cajaB(s * 0.45, 0.6, z, 0.04, 0.36, 0.06, color);
    }
    for (const [x, z] of [[-0.45, 0.68], [0.45, 0.68], [-0.45, -0.68], [0.45, -0.68]]) { L.cilC(x, 0.2, z, 0.2, 0.16, neg, 10, 0, 0, Math.PI / 2); L.cilC(x * 1.02, 0.2, z, 0.09, 0.17, '#9aa0a8', 8, 0, 0, Math.PI / 2); }
    for (const s of [-1, 1]) { Lb.cajaB(s * 0.33, 0.36, largo / 2 + 0.005, 0.18, 0.08, 0.02, '#fff6d8'); Lb.cajaB(s * 0.36, 0.38, -largo / 2 - 0.005, 0.16, 0.07, 0.02, '#ff3030'); }
    if (tipo === 'taxi') { L.cajaB(0, 1.03, -0.08, 0.36, 0.14, 0.2, '#2a2a2e'); Lb.cajaB(0, 1.06, 0.03, 0.3, 0.08, 0.01, '#ffe680'); for (let k = 0; k < 6; k++) L.cajaB(0.505, 0.3, -0.75 + k * 0.3, 0.01, 0.08, 0.15, k % 2 ? '#1a1a1e' : '#f4f4f0'); }
    let sirena = null;
    if (tipo === 'policia') {
      for (const s of [-1, 1]) L.cajaB(s * 0.505, 0.22, 0.05, 0.01, 0.3, 1.5, '#f4f4f0');
      L.cajaB(0, 1.03, -0.08, 0.6, 0.08, 0.22, '#2a2a2e');
      sirena = [new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.18), new THREE.MeshBasicMaterial({ color: 0xff2a2a })), new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.18), new THREE.MeshBasicMaterial({ color: 0x2a5aff }))];
      sirena[0].position.set(-0.15, 1.13, -0.08); sirena[1].position.set(0.15, 1.13, -0.08);
      g.add(sirena[0], sirena[1]);
    }
    const m = L.malla(MAT.solido); m.receiveShadow = false; g.add(m);
    g.add(Lb.malla(MAT.brillo, false));
    const b = faros([-0.33, 0.33], largo); g.add(b);
    return { g, beam: b, sirena, largo, frente: [[-0.33, 0.4, largo / 2 + 0.03], [0.33, 0.4, largo / 2 + 0.03]], atras: [[-0.36, 0.42, -largo / 2 - 0.03], [0.36, 0.42, -largo / 2 - 0.03]] };
  }

  function crearBus(color) {
    const g = new THREE.Group(), L = new G.Lote(), Lb = new G.Lote();
    const largo = 3.6;
    L.cajaB(0, 0.25, 0, 1.15, 1.25, largo, color); L.cajaB(0, 1.5, 0, 1.1, 0.08, largo - 0.1, '#f2f2f2');
    L.cajaB(0, 0.22, 0, 1.19, 0.12, largo + 0.04, '#2a2a2e');
    for (const s of [-1, 1]) { L.cajaB(s * 0.58, 0.85, -0.1, 0.02, 0.45, largo - 1.0, '#2c3e50'); for (let k = 0; k < 4; k++) L.cajaB(s * 0.585, 0.85, -1.15 + k * 0.72, 0.02, 0.47, 0.06, color); }
    L.cajaB(0, 0.75, largo / 2 + 0.005, 1.0, 0.6, 0.02, '#2c3e50'); L.cajaB(0, 0.55, -largo / 2 - 0.005, 0.9, 0.4, 0.02, '#2c3e50');
    L.cajaB(0, 1.32, largo / 2 + 0.01, 0.9, 0.16, 0.02, '#1e1e22'); Lb.cajaB(0, 1.34, largo / 2 + 0.02, 0.8, 0.1, 0.01, '#ffb030');
    for (const [x, z] of [[-0.5, 1.15], [0.5, 1.15], [-0.5, -1.15], [0.5, -1.15]]) L.cilC(x, 0.24, z, 0.24, 0.16, '#1a1a1e', 10, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) { Lb.cajaB(s * 0.38, 0.42, largo / 2 + 0.01, 0.2, 0.1, 0.02, '#fff6d8'); Lb.cajaB(s * 0.42, 0.45, -largo / 2 - 0.01, 0.16, 0.12, 0.02, '#ff3030'); }
    const m = L.malla(MAT.solido); m.receiveShadow = false; g.add(m);
    g.add(Lb.malla(MAT.brillo, false));
    const b = faros([-0.38, 0.38], largo); g.add(b);
    return { g, beam: b, sirena: null, largo, frente: [[-0.38, 0.47, largo / 2 + 0.03], [0.38, 0.47, largo / 2 + 0.03]], atras: [[-0.42, 0.51, -largo / 2 - 0.03], [0.42, 0.51, -largo / 2 - 0.03]] };
  }

  function crearMoto(color, jinete, reparto) {
    const g = new THREE.Group(), L = new G.Lote(), Lb = new G.Lote();
    for (const z of [-0.62, 0.66]) { L.cilC(0, 0.3, z, 0.3, 0.12, '#1a1a1e', 10, 0, 0, Math.PI / 2); L.cilC(0, 0.3, z, 0.13, 0.14, '#9aa0a8', 8, 0, 0, Math.PI / 2); }
    L.caja(0, 0.55, 0.0, 0.2, 0.2, 1.05, '#2a2a2e', 0.1); L.cajaB(0, 0.56, 0.18, 0.32, 0.24, 0.48, color); L.cajaB(0, 0.74, -0.3, 0.3, 0.09, 0.52, '#3a2a1e');
    L.caja(0, 0.72, 0.58, 0.06, 0.46, 0.06, '#9aa0a8', -0.35); L.cajaB(0, 0.92, 0.66, 0.66, 0.05, 0.06, '#2a2a2e');
    for (const s of [-1, 1]) L.cilC(s * 0.18, 0.34, -0.3, 0.05, 0.75, '#b8bcc2', 6, Math.PI / 2 - 0.1);
    Lb.cilC(0, 0.84, 0.74, 0.08, 0.05, '#fff4c0', 8, Math.PI / 2); Lb.cajaB(0, 0.62, -0.58, 0.12, 0.06, 0.02, '#ff3030');
    if (reparto) { L.cajaB(0, 0.84, -0.45, 0.5, 0.42, 0.5, '#d63a2a'); L.cajaB(0, 1.07, -0.45, 0.52, 0.04, 0.52, '#f2f2f2'); }
    else { for (const s of [-1, 1]) L.cajaB(s * 0.27, 0.42, -0.42, 0.12, 0.28, 0.42, '#4a3426'); }
    if (jinete) {
      L.cajaB(0, 0.82, -0.12, 0.42, 0.5, 0.26, jinete.ropa); L.caja(0, 1.15, 0.05, 0.4, 0.4, 0.4, jinete.casco); L.cajaB(0, 1.1, 0.25, 0.32, 0.12, 0.02, '#2a3a4a');
      for (const s of [-1, 1]) { L.caja(s * 0.24, 0.98, 0.25, 0.12, 0.42, 0.12, jinete.ropa, -1.1); L.caja(s * 0.16, 0.6, 0.12, 0.14, 0.45, 0.14, '#2a2e3a', -1.3); }
    }
    const m = L.malla(MAT.solido); m.receiveShadow = false; g.add(m);
    g.add(Lb.malla(MAT.brillo, false));
    const b = faros([0], 1.6); g.add(b);
    return { g, beam: b, sirena: null, largo: 1.6, frente: [[0, 0.84, 0.8]], atras: [[0, 0.62, -0.6]] };
  }

  function crearBici(color) {
    const g = new THREE.Group(), L = new G.Lote(), Lb = new G.Lote();
    const tubo = (y0, z0, y1, z1, c, r) => { const dy = y1 - y0, dz = z1 - z0; L.caja(0, (y0 + y1) / 2, (z0 + z1) / 2, r || 0.05, Math.hypot(dy, dz), r || 0.05, c, 0, Math.atan2(dz, dy)); };
    for (const z of [-0.5, 0.5]) { L.cilC(0, 0.33, z, 0.33, 0.04, '#1a1a1e', 14, 0, 0, Math.PI / 2); L.cilC(0, 0.33, z, 0.05, 0.06, '#9aa0a8', 6, 0, 0, Math.PI / 2); }
    tubo(0.33, -0.05, 0.78, -0.2, color); tubo(0.33, -0.05, 0.74, 0.38, color); tubo(0.74, -0.2, 0.74, 0.38, color);
    tubo(0.33, -0.5, 0.74, -0.2, color, 0.035); tubo(0.33, 0.5, 0.88, 0.38, '#9aa0a8', 0.04);
    L.cajaB(0, 0.78, -0.24, 0.12, 0.05, 0.24, '#1e1e22'); L.cajaB(0, 0.88, 0.36, 0.5, 0.04, 0.04, '#2a2a2e');
    L.cilC(0, 0.33, -0.05, 0.09, 0.05, '#9aa0a8', 8, 0, 0, Math.PI / 2);
    Lb.cajaB(0, 0.8, 0.44, 0.08, 0.06, 0.03, '#fff4c0'); Lb.cajaB(0, 0.62, -0.56, 0.06, 0.04, 0.02, '#ff3030');
    const m = L.malla(MAT.solido); m.receiveShadow = false; g.add(m);
    g.add(Lb.malla(MAT.brillo, false));
    const b = faros([0], 1.3); g.add(b);
    return { g, beam: b, sirena: null, largo: 1.2, frente: [[0, 0.8, 0.47]], atras: [[0, 0.62, -0.58]], bici: true, asiento: 0.84 };
  }

  // ---------------- red de calles (viene armada en DATOS_MUNDO.red: cruces, esquinas, entradas en T y finales) ----------------
  function crearRed(D) {
    const nodos = D.red.nodos.map((n) => ({ id: n.id, x: n.x, z: n.z, tipo: n.tipo, vec: [] }));
    D.red.nodos.forEach((n, k) => { nodos[k].vec = n.vec.map((i) => nodos[i]); });
    const en = (x, z) => nodos.find((n) => Math.abs(n.x - x) < 0.2 && Math.abs(n.z - z) < 0.2);
    // ruta más corta (en nodos) de a hasta b sin dar media vuelta hacia 'evitar'
    function ruta(a, b, evitar) {
      const previo = new Map([[a, null]]), cola = [a];
      while (cola.length) {
        const n = cola.shift();
        if (n === b) break;
        for (const m of n.vec) if (!previo.has(m) && !(n === a && m === evitar)) { previo.set(m, n); cola.push(m); }
      }
      if (!previo.has(b)) return null;
      const out = [];
      for (let n = b; n && n !== a; n = previo.get(n)) out.unshift(n);
      return out;
    }
    return { nodos, en, ruta };
  }
  const dirDe = (A, B) => { const dx = B.x - A.x, dz = B.z - A.z, l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l, l }; };
  const derecha = (d) => ({ x: -d.z, z: d.x });
  const enCarril = (A, d, t) => { const r = derecha(d); return V2(A.x + d.x * t + r.x * CARRIL, A.z + d.z * t + r.z * CARRIL); };
  function bezier(p0, c, p1, n) { const out = []; for (let k = 1; k <= n; k++) { const u = k / n, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, e = u * u; out.push(V2(a * p0.x + b * c.x + e * p1.x, a * p0.z + b * c.z + e * p1.z)); } return out; }
  // puntos del tramo A→B y del giro en B hacia C
  function tramo(A, B, C) {
    const d = dirDe(A, B);
    const mA = A.tipo === 'cruce' ? MARGEN_CRUCE : 0, mB = B.tipo === 'cruce' ? MARGEN_CRUCE : 0;
    const pts = [enCarril(A, d, mA), enCarril(A, d, d.l - mB)];
    if (B.tipo === 'fin') {
      const r = derecha(d);
      pts.push(...bezier(enCarril(A, d, d.l), V2(B.x + d.x * 1.7, B.z + d.z * 1.7), V2(B.x - r.x * CARRIL, B.z - r.z * CARRIL), 10));
    } else {
      const d2 = dirDe(B, C), p1 = pts[pts.length - 1], p2 = enCarril(B, d2, MARGEN_CRUCE);
      if (Math.abs(d.x * d2.x + d.z * d2.z) > 0.9) pts.push(p2);
      else { const r1 = derecha(d), r2 = derecha(d2); pts.push(...bezier(p1, V2(B.x + (r1.x + r2.x) * CARRIL, B.z + (r1.z + r2.z) * CARRIL), p2, 9)); }
    }
    return pts;
  }

  // ---------------- semáforos (en algunos cruces del pueblo) ----------------
  // Un ciclo: verde para los que van por z, amarillo, todo rojo, verde para los que van por x, amarillo, todo rojo.
  const CICLO = [['z', 'verde', 13], ['z', 'amarillo', 2.6], ['-', 'rojo', 1.6], ['x', 'verde', 13], ['x', 'amarillo', 2.6], ['-', 'rojo', 1.6]];
  const DURACION = CICLO.reduce((a, c) => a + c[2], 0);
  const COLOR_LUZ = { rojo: [0xff3a30, 0x3a1210], amarillo: [0xffc23a, 0x3a3010], verde: [0x3aff6a, 0x10381a] };
  function crearSemaforos(escena, red, D) {
    const lista = [], porNodo = new Map();
    const L = new G.Lote(), lamparas = [];
    const ab = D.CALLE.asfalto + D.CALLE.vereda + 0.3;
    (D.semaforos || []).forEach(([cx, cz], k) => {
      const nodo = red.en(cx, cz);
      if (!nodo) return;
      const sem = {
        nodo, desfase: k * 9,
        fase(t) { let u = ((t / 1000 + this.desfase) % DURACION + DURACION) % DURACION; for (const c of CICLO) { if (u < c[2]) return c; u -= c[2]; } return CICLO[0]; },
        ahora: 0,
        luzPara(eje) { const f = this.fase(this.ahora || performance.now()); return f[0] === eje ? f[1] : 'rojo'; }
      };
      lista.push(sem); porNodo.set(nodo, sem);
      // un poste por esquina, mirando a los que llegan por su derecha
      for (const [sx, sz, r, eje] of [[-1, -1, 180, 'z'], [1, 1, 0, 'z'], [-1, 1, 270, 'x'], [1, -1, 90, 'x']]) {
        const x = cx + sx * ab, z = cz + sz * ab, ry = r * Math.PI / 180;
        L.empujar(x, 0, z, ry);
        L.cil(0, 0, 0, 0.12, 0.12, '#2a2e36', 8); L.cil(0, 0.12, 0, 0.055, 2.55, '#2a2e36', 8);
        L.cajaB(0, 2.1, 0, 0.36, 1.0, 0.26, '#1e2228'); L.cajaB(0, 2.08, -0.15, 0.46, 1.04, 0.04, '#2a2e36');
        for (let k2 = 0; k2 < 3; k2++) L.caja(0, 2.9 - k2 * 0.3, 0.17, 0.26, 0.04, 0.1, '#1e2228', 0, -0.35);
        L.soltar();
        ['rojo', 'amarillo', 'verde'].forEach((luz, k2) => {
          const s2 = Math.sin(ry), c2 = Math.cos(ry), lz = 0.135;
          lamparas.push({ sem, eje, luz, x: x + s2 * lz, y: 2.82 - k2 * 0.3, z: z + c2 * lz, ry });
        });
      }
    });
    if (!lista.length) return { porNodo, actualizar() {} };
    const cuerpos = L.malla(G.MAT.solido); escena.add(cuerpos);
    // lámparas (un solo InstancedMesh) y su resplandor de frente a la cámara
    const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 12); geo.rotateX(Math.PI / 2);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), lamparas.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), C = new THREE.Color();
    lamparas.forEach((l, k) => { M.compose(V.set(l.x, l.y, l.z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), l.ry), S1); im.setMatrixAt(k, M); im.setColorAt(k, C.set(COLOR_LUZ[l.luz][1])); });
    escena.add(im);
    const texH = (() => { const c = G.lienzo(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texH, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), lamparas.length);
    halos.frustumCulled = false; halos.renderOrder = 5; escena.add(halos);
    let claveAnt = '';
    return {
      porNodo,
      actualizar(t, noche, camara) {
        for (const s3 of lista) s3.ahora = t;
        const clave = lista.map((s3) => s3.fase(t)[0] + s3.fase(t)[1]).join('|') + (noche > 0.5);
        if (clave !== claveAnt) {
          claveAnt = clave;
          lamparas.forEach((l, k) => { const f = l.sem.fase(t), on = (f[0] === l.eje && f[1] === l.luz) || (f[1] === 'rojo' && l.luz === 'rojo') || (f[0] !== l.eje && l.luz === 'rojo'); im.setColorAt(k, C.set(COLOR_LUZ[l.luz][on ? 0 : 1])); l.on = on; });
          im.instanceColor.needsUpdate = true;
        }
        const s4 = 0.55 + noche * 0.75;
        lamparas.forEach((l, k) => {
          M.compose(V.set(l.x + Math.sin(l.ry) * 0.06, l.y, l.z + Math.cos(l.ry) * 0.06), camara.quaternion, l.on ? S1.set(s4, s4, s4) : S1.set(0, 0, 0));
          halos.setMatrixAt(k, M); halos.setColorAt(k, C.set(COLOR_LUZ[l.luz][0]));
        });
        S1.set(1, 1, 1);
        halos.instanceMatrix.needsUpdate = true; if (halos.instanceColor) halos.instanceColor.needsUpdate = true;
        halos.material.opacity = 0.35 + noche * 0.55;
      }
    };
  }

  // ---------------- vehículo ----------------
  // Prioridad: en un cruce solo cede el paso el de menor prioridad, así dos autos nunca se esperan entre sí.
  let siguientePrioridad = 0;
  class Vehiculo {
    constructor(sis, red, modelo, opciones) {
      this.sis = sis; this.red = red; this.m = modelo;
      this.prio = siguientePrioridad++; this.bloqueado = 0; this.fantasma = 0;
      this.vMax = opciones.vMax || 3.2; this.v = 0;
      this.pos = new THREE.Vector3(); this.rot = 0;
      sis.escena.add(modelo.g);
      const n0 = red.nodos[opciones.inicio % red.nodos.length];
      this.prev = n0; this.sig = n0.vec[0];
      this.plan = [];
      this.nuevoTramo(true);
    }
    elegir(desde, en) {
      if (this.plan.length && en.vec.indexOf(this.plan[0]) >= 0) return this.plan.shift();
      this.plan.length = 0;
      const op = en.vec.filter((n) => n !== desde);
      return op.length ? op[Math.floor(Math.random() * op.length)] : desde;
    }
    nuevoTramo(aleatorio) {
      if (!this.despues) this.despues = this.elegir(this.prev, this.sig);
      this.pts = tramo(this.prev, this.sig, this.despues);
      this.i = 1;
      const p0 = this.pts[0];
      if (aleatorio) { const k = Math.random(); const p1 = this.pts[1]; this.pos.set(p0.x + (p1.x - p0.x) * k, 0, p0.z + (p1.z - p0.z) * k); }
    }
    obstaculo() {
      // si lleva rato trabado, pasa igual un momento (nunca se queda atascado para siempre)
      this.bloqueador = null;
      if (this.fantasma > 0) return 99;
      const fx = Math.sin(this.rot), fz = Math.cos(this.rot);
      let min = 99;
      for (const a of this.sis.lista) {
        if (a.montura || a.oculto) continue;
        const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z, ad = dx * fx + dz * fz;
        if (ad > 0.2 && ad < 3.2 && Math.abs(dx * fz - dz * fx) < 0.85 && ad < min) { min = ad; this.bloqueador = a; }
      }
      for (const o of this.sis.vehiculos) {
        if (o === this || o.activo === false || o.oculto) continue;
        const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z;
        if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
        const ad = dx * fx + dz * fz, lado = Math.abs(dx * fz - dz * fx);
        const mismo = Math.sin(o.rot) * fx + Math.cos(o.rot) * fz > 0.5;
        // encimados (por ejemplo al aparecer): espera el de menor prioridad hasta que se separen
        if (ad <= 0.2) { if (mismo && ad > -1.4 && lado < 0.9 && this.prio > o.prio) { min = 0; this.bloqueador = o; } continue; }
        if (ad > 3.2 || lado > 0.95) continue;
        // al de adelante en el mismo sentido siempre se lo respeta; al que cruza, solo si tiene prioridad o ya está pasando
        if ((mismo || o.prio < this.prio || (o.v > 0.5 && ad < 1.8)) && ad < min) { min = ad; this.bloqueador = o; }
      }
      return min;
    }
    avanzar(dt) {
      if (this.fantasma > 0) this.fantasma -= dt;
      const obs = this.obstaculo();
      let objetivo = obs < 2.6 ? Math.max(0, (obs - 1.4) * 2) : this.vMax;
      // en fila: espera tranquilo si el de adelante (o el primero de la fila) está frenado por un semáforo
      const b = this.bloqueador;
      this.enFila = !!(b && b.prio !== undefined && (b.enRojo || b.enFila));
      if (obs < 2.6 && this.v < 0.15 && !this.enFila) {
        this.bloqueado += dt;
        // trabados entre dos (cada uno espera al otro): pasa el de mayor prioridad; si no, a los 20 s pasa igual
        const mutuo = b && b.bloqueador === this && this.bloqueado > 2.5 && this.prio < b.prio;
        if (mutuo || this.bloqueado > 20) { this.bloqueado = 0; this.fantasma = 2.5; }
      } else this.bloqueado = 0;
      // semáforo en rojo (o en amarillo si todavía hay tiempo de frenar): se detiene en la línea
      const sem = this.red.semaforos && this.red.semaforos.get(this.sig);
      if (sem && this.i <= 1 && !this.estado || sem && this.i <= 1 && this.estado === 'ruta') {
        const eje = Math.abs(this.sig.x - this.prev.x) > Math.abs(this.sig.z - this.prev.z) ? 'x' : 'z';
        const luz = sem.luzPara(eje), p = this.pts[1], d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
        const frente = this.m.largo / 2 + 1.1;
        if (luz === 'rojo' || (luz === 'amarillo' && d > frente + 1.4)) { objetivo = Math.min(objetivo, d < frente + 6 ? Math.max(0, (d - frente) * 1.3) : this.vMax); this.enRojo = d < frente + 6; }
        else this.enRojo = false;
      } else this.enRojo = false;
      this.freno = objetivo < this.v - 0.15 || (this.v < 0.3 && objetivo < 0.3);
      this.v += Math.max(-7 * dt, Math.min(2.2 * dt, objetivo - this.v));
      let paso = this.v * dt;
      while (paso > 0) {
        const p = this.pts[this.i];
        const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d > 1e-4) this.rot = Math.atan2(dx, dz);
        if (d <= paso) {
          this.pos.x = p.x; this.pos.z = p.z; paso -= d; this.i++;
          if (this.i >= this.pts.length) {
            this.alTerminarTramo();
            // al aparcar (o si el tramo nuevo vino vacío) no queda camino por recorrer en este cuadro
            if (this.estado === 'aparcada' || !this.pts || this.i >= this.pts.length) break;
          }
        } else { this.pos.x += dx / d * paso; this.pos.z += dz / d * paso; paso = 0; }
      }
    }
    alTerminarTramo() {
      const nuevoPrev = this.sig, nuevoSig = this.despues;
      this.prev = nuevoPrev; this.sig = nuevoSig; this.despues = null;
      this.nuevoTramo(false);
    }
    dibujar(t, noche) {
      const g = this.m.g;
      g.position.set(this.pos.x, 0.01, this.pos.z);
      let giro = this.rot - g.rotation.y;
      while (giro > Math.PI) giro -= Math.PI * 2; while (giro < -Math.PI) giro += Math.PI * 2;
      g.rotation.y += giro * 0.5;
      this.m.beam.material.opacity = this.activo === false ? 0 : Math.max(0, (noche - 0.3) / 0.7) * 0.32;
      if (this.m.sirena) { const on = Math.floor(t / 280) % 2; this.m.sirena[0].visible = !!on; this.m.sirena[1].visible = !on; }
    }
  }

  // Un vehículo de alguien (la moto de Deacon, la bici y el auto de Luis): aparcado junto a una calle x = calle;
  // sale con su dueño al carril que va al sur, da una vuelta por el archipiélago y vuelve. En el auto el conductor no se ve.
  class MotoDeacon extends Vehiculo {
    constructor(sis, red, modelo, aparcar, calle, cN, cS, opc) {
      super(sis, red, modelo, { vMax: (opc && opc.vMax) || 4.4, inicio: 0 });
      this.oculta = !!(opc && opc.oculta);
      this.aparcar = aparcar; this.calle = calle; this.cN = cN; this.cS = cS;
      this.estado = 'aparcada';
      this.jinete = null;
      this.pos.set(aparcar.x, 0, aparcar.z); this.rot = rad(aparcar.r);
      modelo.g.rotation.y = this.rot;
      this.activo = false;
    }
    montar(actor) {
      if (this.estado !== 'aparcada') return false;
      this.jinete = actor; actor.montura = this;
      if (this.oculta) { actor.oculto = true; actor.rig.raiz.visible = false; }
      // salida: del aparcamiento a la vereda y al carril que va hacia el sur (x = calle - carril)
      const zSal = this.aparcar.z, c = this.calle;
      this.salida = [V2(Math.min(this.aparcar.x + 1.2, c - 3.9), zSal - 0.2), V2(c - 3.4, zSal - 0.3), V2(c - 2.4, zSal - 0.2), V2(c - CARRIL, zSal + 0.9)];
      this.pts = this.salida; this.i = 0; this.estado = 'saliendo'; this.activo = true;
      this.prev = this.cN; this.sig = this.cS; this.plan = []; this.despues = this.elegir(this.cN, this.cS);
      this.hasta = performance.now() + 60000 + Math.random() * 30000;
      return true;
    }
    bajar() {
      if (this.jinete) { this.jinete.montura = null; if (this.oculta) { this.jinete.oculto = false; this.jinete.rig.raiz.visible = true; } }
      this.jinete = null;
      this.estado = 'aparcada'; this.activo = false; this.v = 0;
      this.pos.set(this.aparcar.x, 0, this.aparcar.z); this.rot = rad(this.aparcar.r);
      this.m.g.rotation.y = this.rot;
    }
    alTerminarTramo() {
      if (this.estado === 'saliendo') {
        this.estado = 'ruta';
        const d = dirDe(this.prev, this.sig);
        this.pts = tramo(this.prev, this.sig, this.despues).slice(1);
        this.pts = this.pts.filter((p) => (p.z - this.pos.z) * d.z + (p.x - this.pos.x) * d.x > 0 || Math.abs(p.x - this.pos.x) > 0.5);
        this.i = 0;
        if (!this.pts.length) super.alTerminarTramo();
        return;
      }
      if (this.estado === 'volviendo') {
        const j = this.jinete;
        this.bajar();
        if (j) j.alBajarDeMoto();
        return;
      }
      super.alTerminarTramo();
      // de regreso: cuando ya pasó el tiempo, busca la ruta hasta el tramo cN -> cS (pasa junto al campamento)
      if (performance.now() > this.hasta) {
        const cN = this.cN, cS = this.cS;
        if (this.prev === cN && this.sig === cS) {
          const zSal = this.aparcar.z, c = this.calle;
          this.pts = [enCarril(cN, dirDe(cN, cS), MARGEN_CRUCE), V2(c - CARRIL, zSal - 0.9), V2(c - 2.4, zSal - 0.4), V2(c - 3.4, zSal - 0.3), V2(Math.min(this.aparcar.x + 1.1, c - 3.9), zSal), V2(this.aparcar.x, this.aparcar.z)];
          this.i = 0; this.estado = 'volviendo'; this.plan = [];
        } else if (!this.plan.length) {
          const r = this.sig === cN ? [] : this.red.ruta(this.sig, cN, this.prev);
          if (r) {
            this.plan = this.sig === cN ? [cS] : r.concat([cS]);
            this.despues = this.elegir(this.prev, this.sig);
            this.pts = tramo(this.prev, this.sig, this.despues);
            this.i = 1;
          }
        }
      }
    }
    avanzar(dt) { if (this.estado === 'aparcada') return; super.avanzar(dt); }
    obstaculo() { return this.estado === 'ruta' ? super.obstaculo() : 99; }
  }

  // ---------------- sistema ----------------
  function construir(escena, D, sis) {
    const red = crearRed(D);
    const semaforos = crearSemaforos(escena, red, D);
    red.semaforos = semaforos.porNodo;
    sis.vehiculos = [];
    const flota = [
      ['sedan', '#c0392b'], ['taxi', '#f2c230'], ['policia', '#1e1e22'], ['furgo', '#e8e2d4'], ['sedan', '#3a6ea5'], ['pickup', '#4a7a3a'],
      ['sedan', '#e8e8e8'], ['taxi', '#f2c230'], ['sedan', '#8e44ad'], ['furgo', '#2f8fe0'],
      ['sedan', '#f2a83a'], ['pickup', '#8a3a2a'], ['taxi', '#f2c230'], ['sedan', '#2f9a52'], ['furgo', '#e8e2d4'], ['sedan', '#5a5f68'],
      ['sedan', '#e0457b'], ['taxi', '#f2c230'], ['pickup', '#3a6ea5'], ['sedan', '#2fb0a8'], ['furgo', '#c8202a'], ['sedan', '#f4f4f0'], ['policia', '#1e1e22'], ['sedan', '#7a3ae0']
    ];
    // cada vehículo arranca en un nodo distinto (repartidos por toda la red) para que no aparezcan encimados
    const total = flota.length + 4, paso = red.nodos.length / total;
    let n = 0;
    const inicio = () => Math.floor((n++) * paso) % red.nodos.length;
    flota.forEach(([tipo, color], k) => sis.vehiculos.push(new Vehiculo(sis, red, crearAuto(tipo, color), { vMax: 3.0 + (k % 3) * 0.45, inicio: inicio() })));
    sis.vehiculos.push(new Vehiculo(sis, red, crearBus('#d9a42a'), { vMax: 2.5, inicio: inicio() }));
    sis.vehiculos.push(new Vehiculo(sis, red, crearBus('#3ab0e0'), { vMax: 2.5, inicio: inicio() }));
    sis.vehiculos.push(new Vehiculo(sis, red, crearMoto('#2a2a2e', { ropa: '#3a4a6a', casco: '#e8e8e8' }), { vMax: 4.0, inicio: inicio() }));
    sis.vehiculos.push(new Vehiculo(sis, red, crearMoto('#d63a2a', { ropa: '#d63a2a', casco: '#f2f2f2' }, true), { vMax: 3.8, inicio: inicio() }));
    const delTrafico = sis.vehiculos.slice();
    const pm = D.props.find((p) => p.vehiculo === 'deacon');
    let moto = null;
    const personales = {};
    if (pm) {
      // la moto sale a la calle x = R1, entre los cruces (R1,R1) y (R1,R2)
      const cN = red.en(D.R1, D.R1), cS = red.en(D.R1, D.R2);
      moto = new MotoDeacon(sis, red, crearMoto('#3a3a3a', null, false), { x: pm.x, z: pm.z, r: pm.r }, D.R1, cN, cS);
      sis.vehiculos.push(moto);
      personales.deacon = moto;
    }
    // la bici y el auto blanco de Luis salen al anillo este del Barrio Residencial
    for (const p of D.props.filter((q) => q.vehiculo === 'bici_luis' || q.vehiculo === 'auto_luis')) {
      const I = D.islas.find((i) => p.x >= i.x0 && p.x <= i.x1 && p.z >= i.z0 && p.z <= i.z1);
      if (!I) continue;
      const c = I.x1 - 3.5;
      const enCalle = D.red.nodos.filter((n) => Math.abs(n.x - c) < 0.2).sort((a, b) => a.z - b.z);
      const n0 = enCalle.filter((n) => n.z < p.z).pop(), n1 = enCalle.find((n) => n.z > p.z);
      if (!n0 || !n1) continue;
      const auto = p.vehiculo === 'auto_luis';
      const v = new MotoDeacon(sis, red, auto ? crearAuto('sedan', p.c || '#f4f4f2') : crearBici('#2fae5a'), { x: p.x, z: p.z, r: p.r }, c, red.en(n0.x, n0.z), red.en(n1.x, n1.z), { oculta: auto, vMax: auto ? 3.4 : 3.0 });
      sis.vehiculos.push(v);
      personales[p.vehiculo] = v;
    }
    sis.alMontar = (actor) => { const v = personales[(actor.spot && actor.spot.vehiculo) || 'deacon']; return v && v.montar(actor); };
    // resplandores: faros cálidos adelante y luces rojas atrás (más fuertes al frenar)
    const texB = (() => { const c = G.lienzo(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const nLuces = sis.vehiculos.reduce((a, v) => a + v.m.frente.length + v.m.atras.length, 0);
    const brillos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texB, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), nLuces);
    brillos.frustumCulled = false; brillos.renderOrder = 5; escena.add(brillos);
    const M = new THREE.Matrix4(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color(), CF = new THREE.Color(0xfff0c8), CR = new THREE.Color(0xff2a20);
    for (let k = 0; k < nLuces; k++) brillos.setColorAt(k, C.set(0));
    function densidad(k) {
      const cuantos = Math.round(delTrafico.length * Math.max(0, Math.min(1, k)));
      delTrafico.forEach((v, i) => { v.oculto = i >= cuantos; v.m.g.visible = !v.oculto; });
    }
    return {
      densidad,
      actualizar(dt, t, noche) {
        for (const v of sis.vehiculos) { if (v.oculto) continue; v.avanzar(dt); v.dibujar(t, noche); }
        const camara = PA.Escena.camara;
        semaforos.actualizar(t, noche, camara);
        const n = Math.max(0, (noche - 0.25) / 0.75);
        let k = 0;
        for (const v of sis.vehiculos) {
          const g = v.m.g, encendido = v.activo !== false && !v.oculto && n > 0.01;
          g.updateMatrixWorld();
          v.frenoS = (v.frenoS || 0) + ((v.freno ? 1 : 0) - (v.frenoS || 0)) * Math.min(1, dt * 8);
          for (const [lista, col, tam] of [[v.m.frente, CF, 0.75], [v.m.atras, CR, 0.5 + v.frenoS * 0.35]]) for (const p of lista) {
            V.set(p[0], p[1], p[2]).applyMatrix4(g.matrixWorld);
            const s2 = encendido ? tam : 0;
            M.compose(V, camara.quaternion, S.set(s2, s2, s2)); brillos.setMatrixAt(k, M);
            brillos.setColorAt(k, C.copy(col).multiplyScalar(lista === v.m.atras ? 0.45 + v.frenoS * 0.55 : 1));
            k++;
          }
        }
        brillos.instanceMatrix.needsUpdate = true; brillos.instanceColor.needsUpdate = true;
        brillos.material.opacity = n * 0.9;
      },
      moto
    };
  }

  return { construir };
})();
