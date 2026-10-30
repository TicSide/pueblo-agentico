/* Pueblo Agéntico — animales que pasean por las islas: ciervos, conejos, zorros, un unicornio, búhos y fuegos
 * fatuos en el Bosque Mágico; perros y patos en el pueblo; un perro robot y drones en el Distrito Tecnológico;
 * cuervos en el cementerio de Raccoon City y gaviotas y cangrejos en la Playa del Sol.
 * No son parte de la simulación: deambulan solos por su zona sin pisar el asfalto ni atravesar muebles. */
window.PA = window.PA || {};
PA.Animales = (function () {
  'use strict';
  const G = PA.Geo, MAT = G.MAT, hash = G.hash, rnd = Math.random;
  const VEL = { ciervo: 1.1, conejo: 1.5, zorro: 1.4, unicornio: 1.2, perro: 1.7, perro_robot: 1.1, pato: 0.45, cangrejo: 0.5 };

  // ---------- modelos low-poly ----------
  function pata(color, alto, ancho) {
    const L = new G.Lote(); L.cajaB(0, -alto, 0, ancho, alto, ancho, color);
    const m = L.malla(MAT.solido); const g = new THREE.Group(); g.add(m); return g;
  }
  function modelo(tipo, k) {
    const g = new THREE.Group(), L = new G.Lote(), Lb = new G.Lote();
    const r = { g, patas: [], cabeza: null, cola: null, alas: [], rotores: [], brillo: null };
    const conPatas = (pos, color, alto, ancho) => { for (const [x, z] of pos) { const p = pata(color, alto, ancho); p.position.set(x, alto, z); g.add(p); r.patas.push(p); } };
    const cabeza = (fn, y, z) => { const h = new THREE.Group(); const LH = new G.Lote(), LHb = new G.Lote(); fn(LH, LHb); h.add(LH.malla(MAT.solido)); if (!LHb.vacio()) h.add(LHb.malla(MAT.brillo, false)); h.position.set(0, y, z); g.add(h); r.cabeza = h; };
    if (tipo === 'ciervo') {
      L.cajaB(0, 0.55, 0, 0.42, 0.42, 0.95, '#a8683a'); L.cajaB(0, 0.56, 0, 0.3, 0.2, 0.8, '#f0e0c8'); L.caja(0, 1.02, 0.42, 0.18, 0.5, 0.18, '#a8683a', 0, -0.45);
      L.esfera(0, 0.88, -0.5, 0.09, '#ffffff', 0);
      conPatas([[-0.15, 0.36], [0.15, 0.36], [-0.15, -0.36], [0.15, -0.36]], '#7a4a2a', 0.56, 0.09);
      const glow = k === 0;
      cabeza((H, Hb) => { H.cajaB(0, 0, 0.05, 0.22, 0.22, 0.34, '#a8683a'); H.cajaB(0, 0.02, 0.24, 0.14, 0.12, 0.12, '#5a3a22'); for (const s of [-1, 1]) { H.caja(s * 0.12, 0.25, -0.02, 0.06, 0.14, 0.04, '#a8683a', 0, 0, s * 0.6); const A = glow ? Hb : H; A.caja(s * 0.12, 0.38, 0.0, 0.035, 0.36, 0.035, glow ? '#9affe8' : '#e8d8b8', 0, 0, s * 0.35); A.caja(s * 0.2, 0.5, 0.06, 0.03, 0.18, 0.03, glow ? '#9affe8' : '#e8d8b8', -0.5, 0, s * 0.9); } H.esfera(0.08, 0.06, 0.2, 0.025, '#1a1a1a', 0); H.esfera(-0.08, 0.06, 0.2, 0.025, '#1a1a1a', 0); }, 1.25, 0.55);
      if (glow) r.brillo = 0x9affe8;
    } else if (tipo === 'conejo') {
      const c = ['#f4f2ee', '#c8b8a0', '#9a8a7a'][k % 3];
      L.esfera(0, 0.18, 0, 0.17, c, 1, 1, 0.9, 1.25); L.esfera(0, 0.2, -0.22, 0.07, '#ffffff', 0);
      cabeza((H) => { H.esfera(0, 0, 0, 0.12, c, 1); for (const s of [-1, 1]) H.caja(s * 0.05, 0.17, -0.02, 0.05, 0.2, 0.03, c, 0, 0, s * 0.15); H.esfera(0.05, 0.03, 0.1, 0.02, '#1a1a1a', 0); H.esfera(-0.05, 0.03, 0.1, 0.02, '#1a1a1a', 0); H.esfera(0, -0.01, 0.12, 0.02, '#ff9ab0', 0); }, 0.33, 0.17);
    } else if (tipo === 'zorro' || tipo === 'perro') {
      const c = tipo === 'zorro' ? '#e0762a' : ['#c8a070', '#5a4030', '#f0e8dc'][k % 3];
      L.cajaB(0, 0.3, 0, 0.26, 0.26, 0.62, c); L.cajaB(0, 0.3, 0.22, 0.2, 0.2, 0.16, tipo === 'zorro' ? '#f4f0ea' : c);
      conPatas([[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]], tipo === 'zorro' ? '#2a2a2e' : c, 0.3, 0.07);
      const cola = new THREE.Group(); const LC = new G.Lote(); LC.caja(0, 0.06, -0.2, 0.12, 0.12, 0.42, c, 0, 0.5); if (tipo === 'zorro') LC.caja(0, 0.16, -0.38, 0.1, 0.1, 0.1, '#f4f0ea', 0, 0.5); cola.add(LC.malla(MAT.solido)); cola.position.set(0, 0.45, -0.3); g.add(cola); r.cola = cola;
      cabeza((H) => { H.cajaB(0, -0.08, 0.02, 0.22, 0.2, 0.22, c); H.cajaB(0, -0.08, 0.18, 0.1, 0.1, 0.14, tipo === 'zorro' ? '#f4f0ea' : tono2(c)); H.esfera(0, -0.03, 0.25, 0.03, '#1a1a1a', 0); for (const s of [-1, 1]) { if (tipo === 'zorro') H.cono(s * 0.07, 0.11, 0.0, 0.05, 0.12, c, 4); else H.caja(s * 0.12, 0.02, 0.0, 0.05, 0.14, 0.08, tono2(c), 0, 0, s * 0.4); H.esfera(s * 0.06, 0.02, 0.13, 0.022, '#1a1a1a', 0); } }, 0.58, 0.36);
    } else if (tipo === 'unicornio') {
      L.cajaB(0, 0.75, 0, 0.5, 0.5, 1.2, '#f8f8ff'); L.caja(0, 1.32, 0.55, 0.22, 0.62, 0.24, '#f8f8ff', 0, -0.5);
      const crin = ['#ff6a8a', '#ffb06a', '#ffe66a', '#6aff9a', '#6ac8ff', '#b06aff'];
      crin.forEach((c, i) => L.cajaB(0, 1.3 + i * 0.07, 0.42 - i * 0.05, 0.08, 0.1, 0.12, c));
      crin.forEach((c, i) => L.caja(0, 0.95 - i * 0.07, -0.68 - i * 0.03, 0.09, 0.12, 0.14, c, 0, 0.6));
      conPatas([[-0.17, 0.45], [0.17, 0.45], [-0.17, -0.45], [0.17, -0.45]], '#f0f0f8', 0.76, 0.1);
      cabeza((H, Hb) => { H.cajaB(0, -0.06, 0.08, 0.22, 0.24, 0.42, '#f8f8ff'); Hb.cono(0, 0.18, 0.1, 0.04, 0.32, '#ffd23a', 6); H.esfera(0.1, 0.04, 0.2, 0.025, '#1a1a2a', 0); H.esfera(-0.1, 0.04, 0.2, 0.025, '#1a1a2a', 0); H.cajaB(0, -0.06, 0.3, 0.16, 0.14, 0.04, '#f0d8e0'); }, 1.65, 0.75);
      r.brillo = 0xffd8ff;
    } else if (tipo === 'pato') {
      L.esfera(0, 0.1, 0, 0.16, k % 2 ? '#f4f4f0' : '#8a6a4a', 1, 1, 0.75, 1.35); L.caja(0, 0.16, -0.2, 0.08, 0.06, 0.12, k % 2 ? '#f4f4f0' : '#6a4a3a', 0, -0.5);
      cabeza((H) => { H.esfera(0, 0, 0, 0.09, k % 2 ? '#f4f4f0' : '#2f7a4a', 1); H.cajaB(0, -0.03, 0.08, 0.07, 0.03, 0.1, '#f0a020'); H.esfera(0.05, 0.03, 0.05, 0.018, '#1a1a1a', 0); H.esfera(-0.05, 0.03, 0.05, 0.018, '#1a1a1a', 0); }, 0.28, 0.14);
    } else if (tipo === 'perro_robot') {
      L.cajaB(0, 0.32, 0, 0.3, 0.2, 0.62, '#c9ced6'); L.cajaB(0, 0.52, -0.05, 0.22, 0.04, 0.3, '#2a2e36'); Lb.cajaB(0, 0.4, 0.315, 0.2, 0.04, 0.01, '#3fd0ff');
      conPatas([[-0.13, 0.22], [0.13, 0.22], [-0.13, -0.22], [0.13, -0.22]], '#5a5f68', 0.33, 0.06);
      cabeza((H, Hb) => { H.cajaB(0, -0.06, 0.05, 0.2, 0.14, 0.2, '#c9ced6'); Hb.cajaB(0, -0.01, 0.155, 0.14, 0.04, 0.01, '#3fd0ff'); }, 0.52, 0.36);
      r.brillo = 0x3fd0ff;
    } else if (tipo === 'buho') {
      L.esfera(0, 0, 0, 0.2, '#8a6a4a', 1, 1, 1.2, 0.9); L.esfera(0, 0.02, 0.1, 0.13, '#d8c0a0', 0, 1, 1.2, 0.6);
      for (const s of [-1, 1]) { Lb.esfera(s * 0.07, 0.1, 0.16, 0.05, '#ffd23a', 0); L.esfera(s * 0.07, 0.1, 0.19, 0.022, '#1a1a1a', 0); L.cono(s * 0.1, 0.2, 0, 0.04, 0.09, '#6a4a3a', 4); }
      L.cono(0, 0.0, 0.2, 0.025, 0.06, '#f0a020', 4, Math.PI / 2);
      for (const s of [-1, 1]) { const a = new THREE.Group(); const LA = new G.Lote(); LA.cajaB(s * 0.25, -0.02, 0, 0.5, 0.03, 0.22, '#7a5a3a'); a.add(LA.malla(MAT.solido)); a.position.set(s * 0.12, 0.05, -0.02); g.add(a); r.alas.push({ a, s }); }
    } else if (tipo === 'dron') {
      L.cajaB(0, 0, 0, 0.32, 0.1, 0.32, '#2a2e36'); L.caja(0, 0.02, 0, 0.9, 0.04, 0.06, '#3a3e46', Math.PI / 4); L.caja(0, 0.02, 0, 0.9, 0.04, 0.06, '#3a3e46', -Math.PI / 4);
      Lb.esfera(0, -0.06, 0.16, 0.04, k % 2 ? '#3fd0ff' : '#ff3a5a', 0); L.cajaB(0, -0.26, 0, 0.18, 0.18, 0.18, '#d6a85a');
      for (const [x, z] of [[0.32, 0.32], [-0.32, 0.32], [0.32, -0.32], [-0.32, -0.32]]) { const ro = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.05), new THREE.MeshLambertMaterial({ color: 0x9aa0a8 })); ro.position.set(x, 0.08, z); g.add(ro); r.rotores.push(ro); }
      r.brillo = k % 2 ? 0x3fd0ff : 0xff3a5a;
    } else if (tipo === 'cuervo' || tipo === 'gaviota') {
      const c = tipo === 'cuervo' ? '#1e1e24' : '#f4f4f0', ca = tipo === 'cuervo' ? '#2a2a32' : '#b8c0c8';
      L.esfera(0, 0, 0, 0.13, c, 1, 1, 0.8, 1.6); L.esfera(0, 0.06, 0.18, 0.08, c, 1);
      L.cono(0, 0.03, 0.27, 0.025, 0.1, tipo === 'cuervo' ? '#3a3a40' : '#f2b030', 4, Math.PI / 2);
      L.caja(0, 0.0, -0.24, 0.12, 0.03, 0.14, ca);
      for (const s of [-1, 1]) { L.esfera(s * 0.04, 0.08, 0.23, 0.015, tipo === 'cuervo' ? '#c03030' : '#1a1a1a', 0); const a = new THREE.Group(); const LA = new G.Lote(); LA.cajaB(s * 0.24, -0.02, 0, 0.48, 0.025, 0.18, ca); if (tipo === 'gaviota') LA.cajaB(s * 0.44, -0.02, 0, 0.08, 0.026, 0.18, '#2a2a30'); a.add(LA.malla(MAT.solido)); a.position.set(s * 0.08, 0.04, 0); g.add(a); r.alas.push({ a, s }); }
    } else if (tipo === 'cangrejo') {
      L.esfera(0, 0.08, 0, 0.12, '#d6452a', 0, 1.3, 0.6, 1);
      for (const s of [-1, 1]) { L.esfera(s * 0.05, 0.16, 0.1, 0.025, '#1a1a1a', 0); L.esfera(s * 0.17, 0.08, 0.12, 0.05, '#e05a3a', 0); for (let k = 0; k < 3; k++) L.caja(s * 0.15, 0.04, -0.06 + k * 0.06, 0.12, 0.02, 0.02, '#c03a22', 0, 0, s * 0.5); }
    } else if (tipo === 'fuego_fatuo') {
      const c = ['#9affe8', '#c79bff', '#ffb0f0', '#b8f0ff'][k % 4];
      Lb.esfera(0, 0, 0, 0.09, c, 1); r.brillo = new THREE.Color(c).getHex();
    }
    if (!L.vacio()) { const m = L.malla(MAT.solido); m.castShadow = tipo !== 'fuego_fatuo'; m.receiveShadow = false; g.add(m); }
    if (!Lb.vacio()) g.add(Lb.malla(MAT.brillo, false));
    // solo el cuerpo de los animales grandes proyecta sombra (rendimiento)
    const grande = tipo === 'ciervo' || tipo === 'unicornio';
    g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    if (grande && g.children.length) for (const o of g.children) if (o.isMesh) { o.castShadow = true; break; }
    return r;
  }
  const tono2 = (hex) => PA.Caras.tono(hex, 0.8);

  // halo (resplandor) compartido para los animales que brillan
  let texHalo = null;
  function halo(color, s) {
    if (!texHalo) {
      const c = G.lienzo(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); texHalo = new THREE.CanvasTexture(c);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, fog: false }));
    sp.scale.set(s, s, 1);
    return sp;
  }

  // ---------- comportamiento ----------
  class Animal {
    constructor(def, k, mundo) {
      this.tipo = def.tipo; this.def = def; this.k = k; this.m = mundo;
      this.r = modelo(def.tipo, k);
      this.g = this.r.g;
      this.vuela = !!def.vuela;
      this.vel = VEL[def.tipo] || 1.2;
      this.pos = new THREE.Vector3(); this.rot = rnd() * 6.28; this.fase = rnd() * 10;
      this.objetivo = null; this.esperaHasta = 0; this.andando = false;
      if (this.r.brillo) { this.h = halo(this.r.brillo, def.tipo === 'fuego_fatuo' ? 1.6 : 1.4); this.h.position.y = def.tipo === 'unicornio' ? 1.7 : 0.2; this.g.add(this.h); }
      const p = this.puntoNuevo(true) || { x: (def.area ? (def.area[0] + def.area[2]) / 2 : mundo.N / 2), z: (def.area ? (def.area[1] + def.area[3]) / 2 : mundo.N / 2) };
      this.pos.set(p.x, this.vuela ? this.altura() : 0, p.z);
    }
    altura() { return this.tipo === 'dron' ? 6 + rnd() * 6 : this.tipo === 'buho' ? 4 + rnd() * 4 : this.tipo === 'gaviota' ? 4 + rnd() * 5 : this.tipo === 'cuervo' ? 2.5 + rnd() * 3 : 0.4 + rnd() * 1.8; }
    puntoNuevo(inicio) {
      const M = this.m;
      for (let n = 0; n < 24; n++) {
        let x, z;
        if (this.def.agua !== undefined) {
          const a = M.agua[this.def.agua]; if (!a) return null;
          x = a.x0 + 0.8 + rnd() * (a.x1 - a.x0 - 1.6); z = a.z0 + 0.8 + rnd() * (a.z1 - a.z0 - 1.6);
          if (!M.enAgua(x, z)) continue;
        } else {
          const A = this.def.area;
          x = A[0] + rnd() * (A[2] - A[0]); z = A[1] + rnd() * (A[3] - A[1]);
          if (!this.vuela && !M.libre(x, z)) continue;
          if (!inicio && !this.vuela && !M.despejado(this.pos.x, this.pos.z, x, z)) continue;
        }
        return { x, z, y: this.vuela ? this.altura() : 0 };
      }
      return null;
    }
    actualizar(dt, t, noche) {
      const ahora = t * 1000;
      if (!this.objetivo && ahora > this.esperaHasta) { this.objetivo = this.puntoNuevo(false); if (!this.objetivo) this.esperaHasta = ahora + 2000; }
      let mov = 0;
      if (this.objetivo) {
        const o = this.objetivo, dx = o.x - this.pos.x, dz = o.z - this.pos.z, dy = (o.y || 0) - this.pos.y, d = Math.hypot(dx, dz, this.vuela ? dy : 0);
        const v = this.vuela ? (this.tipo === 'dron' ? 2.6 : this.tipo === 'buho' || this.tipo === 'cuervo' ? 2.2 : this.tipo === 'gaviota' ? 3.0 : 0.7) : this.vel;
        if (d < 0.15) { this.objetivo = null; this.esperaHasta = ahora + (this.vuela ? 500 + rnd() * 2500 : 2500 + rnd() * 7000); }
        else {
          const paso = Math.min(d, v * dt);
          this.pos.x += dx / d * paso; this.pos.z += dz / d * paso; if (this.vuela) this.pos.y += dy / d * paso;
          const deseada = Math.atan2(dx, dz); let dr = deseada - this.rot; while (dr > Math.PI) dr -= 6.283; while (dr < -Math.PI) dr += 6.283; this.rot += dr * Math.min(1, dt * 5);
          mov = 1;
        }
      }
      // animación
      const r = this.r, f = t * (this.tipo === 'conejo' ? 9 : 7) + this.fase;
      let y = this.pos.y;
      if (!this.vuela && this.m.suelo) y += this.m.suelo(this.pos.x, this.pos.z);   // encima de la vereda, no hundido en ella
      if (this.tipo === 'conejo' && mov) y += Math.abs(Math.sin(f)) * 0.18;
      if (this.tipo === 'pato') y = 0.07 + Math.sin(t * 2 + this.fase) * 0.015;
      if (this.tipo === 'fuego_fatuo') { y += Math.sin(t * 1.5 + this.fase) * 0.3; if (this.h) this.h.material.opacity = (0.35 + noche * 0.5) * (0.8 + Math.sin(t * 3 + this.fase) * 0.2); }
      else if (this.h) this.h.material.opacity = 0.12 + noche * 0.45;
      this.g.position.set(this.pos.x, y, this.pos.z);
      this.g.rotation.y = this.rot;
      r.patas.forEach((p, i) => { p.rotation.x = mov ? Math.sin(f + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 : 0; });
      if (r.cabeza) r.cabeza.rotation.x = mov ? Math.sin(f * 2) * 0.05 : (this.tipo === 'ciervo' || this.tipo === 'unicornio' ? 0.55 + Math.sin(t * 0.7 + this.fase) * 0.25 : Math.sin(t * 0.9 + this.fase) * 0.15);
      if (r.cola) r.cola.rotation.y = Math.sin(t * (this.tipo === 'perro' ? 14 : 4) + this.fase) * 0.5;
      for (const a of r.alas) a.a.rotation.z = a.s * (mov ? Math.sin(t * (this.tipo === 'gaviota' ? 6 : 14) + this.fase) * 0.7 : -0.1);
      for (const ro of r.rotores) ro.rotation.y += dt * 40;
      if (this.tipo === 'dron') { this.g.rotation.z = mov ? 0.08 : 0; }
    }
  }

  function crear(escena, D, grid) {
    const N = grid.N;
    const idx = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i >= 0 && j >= 0 && i < N && j < N ? i + j * N : -1; };
    const libre = (x, z) => { const k = idx(x, z); return k >= 0 && !grid.bloq[k] && !grid.calle[k]; };
    const despejado = (ax, az, bx, bz) => { const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.4); for (let k = 1; k <= n; k++) if (!libre(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return false; return true; };
    const enAgua = (x, z) => D.agua.some((a) => { const r = a.radio || 0, cx = Math.max(a.x0 + r, Math.min(x, a.x1 - r)), cz = Math.max(a.z0 + r, Math.min(z, a.z1 - r)); return Math.hypot(x - cx, z - cz) <= r - 0.4 && x > a.x0 + 0.4 && x < a.x1 - 0.4 && z > a.z0 + 0.4 && z < a.z1 - 0.4; });
    const mundo = { N, libre, despejado, enAgua, agua: D.agua, suelo: grid.suelo };
    const lista = [];
    const raiz = new THREE.Group(); raiz.name = 'animales'; escena.add(raiz);
    for (const def of D.animales || []) for (let k = 0; k < def.n; k++) { const a = new Animal(def, k, mundo); raiz.add(a.g); lista.push(a); }
    let ocultos = false;
    return {
      lista,
      visible(on) { ocultos = !on; raiz.visible = on; },
      actualizar(dt, t, noche) { if (ocultos) return; for (const a of lista) a.actualizar(dt, t, noche); }
    };
  }

  return { crear, modelo };
})();
