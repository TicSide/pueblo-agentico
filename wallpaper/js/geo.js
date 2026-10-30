/* Pueblo Agéntico — utilidades de geometría low-poly.
 * Lote: junta cientos de cajas/cilindros con color por vértice en UNA sola malla (pocas llamadas de dibujo).
 * Planos: junta rectángulos con textura (pantallas, letreros) en una malla por material. */
window.PA = window.PA || {};
PA.Geo = (function () {
  'use strict';
  const BASE = {};
  const V = new THREE.Vector3(), Nv = new THREE.Vector3(), M = new THREE.Matrix4(), MM = new THREE.Matrix4(), NM = new THREE.Matrix3();
  const Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), C = new THREE.Color();

  function base(tipo, seg) {
    const k = tipo + ':' + (seg || 0);
    if (BASE[k]) return BASE[k];
    let g;
    if (tipo === 'caja') g = new THREE.BoxGeometry(1, 1, 1);
    else if (tipo === 'cil') g = new THREE.CylinderGeometry(0.5, 0.5, 1, seg || 8);
    else if (tipo === 'cono') g = new THREE.ConeGeometry(0.5, 1, seg || 6);
    else if (tipo === 'esfera') g = new THREE.IcosahedronGeometry(0.5, seg || 0);
    else if (tipo === 'plano') { g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); }
    else if (tipo === 'tronco') g = new THREE.CylinderGeometry(0.35, 0.5, 1, seg || 6);
    else throw new Error('geo desconocida ' + tipo);
    g = g.index ? g.toNonIndexed() : g;
    g.computeVertexNormals();
    BASE[k] = g;
    return g;
  }

  // Ruido determinista para variar un poco los colores
  function hash(a, b) {
    let h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }

  class Lote {
    constructor() { this.p = []; this.n = []; this.c = []; this.pila = [new THREE.Matrix4()]; }
    get m() { return this.pila[this.pila.length - 1]; }
    empujar(x, y, z, ry, s) {
      M.compose(V.set(x, y, z), Q.setFromEuler(E.set(0, ry || 0, 0)), S.set(s || 1, s || 1, s || 1));
      this.pila.push(this.m.clone().multiply(M));
      return this;
    }
    empujarRot(x, y, z, rx, ry, rz) {
      M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0)), S.set(1, 1, 1));
      this.pila.push(this.m.clone().multiply(M));
      return this;
    }
    soltar() { if (this.pila.length > 1) this.pila.pop(); return this; }
    agregar(tipo, seg, x, y, z, sx, sy, sz, color, rx, ry, rz, variacion) {
      const g = base(tipo, seg);
      M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0)), S.set(sx, sy, sz));
      MM.multiplyMatrices(this.m, M);
      NM.getNormalMatrix(MM);
      const pos = g.attributes.position.array, nor = g.attributes.normal.array;
      C.set(color);
      if (variacion) { const f = 1 + (hash(x * 3.1 + sx, z * 1.7 + y) - 0.5) * variacion; C.multiplyScalar(f); }
      const r = C.r, gg = C.g, b = C.b;
      for (let i = 0; i < pos.length; i += 3) {
        V.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(MM);
        this.p.push(V.x, V.y, V.z);
        Nv.set(nor[i], nor[i + 1], nor[i + 2]).applyMatrix3(NM).normalize();
        this.n.push(Nv.x, Nv.y, Nv.z);
        this.c.push(r, gg, b);
      }
      return this;
    }
    // caja centrada
    caja(x, y, z, w, h, d, color, ry, rx, rz, vari) { return this.agregar('caja', 0, x, y, z, w, h, d, color, rx, ry, rz, vari); }
    // caja apoyada: y0 = base
    cajaB(x, y0, z, w, h, d, color, ry, vari) { return this.agregar('caja', 0, x, y0 + h / 2, z, w, h, d, color, 0, ry, 0, vari); }
    cil(x, y0, z, r, h, color, seg, rx, rz) { return this.agregar('cil', seg || 8, x, y0 + h / 2, z, r * 2, h, r * 2, color, rx, 0, rz); }
    cilC(x, y, z, r, h, color, seg, rx, ry, rz) { return this.agregar('cil', seg || 8, x, y, z, r * 2, h, r * 2, color, rx, ry, rz); }
    cono(x, y0, z, r, h, color, seg, rx, rz) { return this.agregar('cono', seg || 6, x, y0 + h / 2, z, r * 2, h, r * 2, color, rx, 0, rz); }
    esfera(x, y, z, r, color, det, sx, sy, sz, ry) { return this.agregar('esfera', det || 0, x, y, z, r * 2 * (sx || 1), r * 2 * (sy || 1), r * 2 * (sz || 1), color, 0, ry || 0, 0); }
    plano(x, y, z, w, d, color, vari) { return this.agregar('plano', 0, x, y, z, w, 1, d, color, 0, 0, 0, vari); }
    vacio() { return this.p.length === 0; }
    geometria() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      this.p = []; this.n = []; this.c = [];   // ya están en la geometría: no guardar dos copias
      return g;
    }
    malla(mat, sombras) {
      const m = new THREE.Mesh(this.geometria(), mat);
      if (sombras !== false) { m.castShadow = true; m.receiveShadow = true; }
      return m;
    }
  }

  // Rectángulos con textura. cara = 'z' (mira a +z), 'x' (mira a +x), 'y' (mira arriba)
  class Planos {
    constructor() { this.p = []; this.n = []; this.uv = []; this.pila = [new THREE.Matrix4()]; }
    get m() { return this.pila[this.pila.length - 1]; }
    empujar(x, y, z, ry) {
      M.compose(V.set(x, y, z), Q.setFromEuler(E.set(0, ry || 0, 0)), S.set(1, 1, 1));
      this.pila.push(this.m.clone().multiply(M));
      return this;
    }
    soltar() { if (this.pila.length > 1) this.pila.pop(); return this; }
    // rectángulo vertical centrado en (x,y,z) que mira a +z local; uv = [u0,v0,u1,v1]
    agregar(x, y, z, w, h, uv, ry, rx) {
      uv = uv || [0, 0, 1, 1];
      M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx || 0, ry || 0, 0)), S.set(1, 1, 1));
      MM.multiplyMatrices(this.m, M);
      NM.getNormalMatrix(MM);
      const hw = w / 2, hh = h / 2;
      const esq = [[-hw, -hh, uv[0], uv[1]], [hw, -hh, uv[2], uv[1]], [hw, hh, uv[2], uv[3]], [-hw, -hh, uv[0], uv[1]], [hw, hh, uv[2], uv[3]], [-hw, hh, uv[0], uv[3]]];
      Nv.set(0, 0, 1).applyMatrix3(NM).normalize();
      for (const e of esq) {
        V.set(e[0], e[1], 0).applyMatrix4(MM);
        this.p.push(V.x, V.y, V.z);
        this.n.push(Nv.x, Nv.y, Nv.z);
        this.uv.push(e[2], e[3]);
      }
      return this;
    }
    vacio() { return this.p.length === 0; }
    malla(mat) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      g.computeBoundingSphere();
      this.p = []; this.n = []; this.uv = [];
      return new THREE.Mesh(g, mat);
    }
  }

  const MAT = {
    solido: new THREE.MeshLambertMaterial({ vertexColors: true }),
    brillo: new THREE.MeshBasicMaterial({ vertexColors: true }),
    luces: new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x777777 })
  };

  function lienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function textura(canvas, pixel) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; }
    t.anisotropy = 4;
    return t;
  }
  const rad = (g) => g * Math.PI / 180;

  return { Lote, Planos, MAT, base, hash, lienzo, textura, rad };
})();
