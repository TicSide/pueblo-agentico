/* Pueblo Agéntico — clima y efectos de temporada: lluvia, tormenta con relámpagos, nieve, hojas de otoño,
 * pétalos de primavera, fuegos artificiales, murciélagos de Halloween y estrellas fugaces.
 * Las partículas viven en una caja alrededor de lo que mira la cámara, así se ven igual de cerca o de lejos.
 * Los cambios automáticos son graduales (unos segundos); si el usuario elige un clima, cambia al instante. */
window.PA = window.PA || {};
PA.Clima = (function () {
  'use strict';
  const OBJETIVO = {
    despejado: { nubes: 0, lluvia: 0, nieve: 0, niebla: 0, tormenta: 0 },
    nublado: { nubes: 0.55, lluvia: 0, nieve: 0, niebla: 0.1, tormenta: 0 },
    lluvia: { nubes: 0.78, lluvia: 1, nieve: 0, niebla: 0.25, tormenta: 0 },
    tormenta: { nubes: 0.95, lluvia: 1.35, nieve: 0, niebla: 0.3, tormenta: 1 },
    nieve: { nubes: 0.5, lluvia: 0, nieve: 1, niebla: 0.2, tormenta: 0 },
    niebla: { nubes: 0.35, lluvia: 0, nieve: 0, niebla: 1, tormenta: 0 }
  };
  const rnd = Math.random;

  function texPunto(dibujar) {
    const c = PA.Geo.lienzo(32, 32), x = c.getContext('2d');
    dibujar(x);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  function crear(escena, D) {
    const raiz = new THREE.Group(); raiz.name = 'clima'; escena.add(raiz);
    const est = { nubes: 0, lluvia: 0, nieve: 0, niebla: 0, tormenta: 0, hojas: 0, petalos: 0 };
    let obj = Object.assign({}, est), eventos = [], noche = 0;

    // ---------- lluvia: segmentos que caen inclinados por el viento ----------
    const NL = 2600;
    const pl = new Float32Array(NL * 6), vl = new Float32Array(NL);
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.BufferAttribute(pl, 3));
    const ml = new THREE.LineBasicMaterial({ color: 0xb8d4f0, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const lluvia = new THREE.LineSegments(gl, ml); lluvia.frustumCulled = false; raiz.add(lluvia);
    // ---------- nieve, hojas y pétalos: puntos ----------
    function nubePuntos(n, tam, tex, color) {
      const p = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const m = new THREE.PointsMaterial({ size: tam, sizeAttenuation: false, map: tex, transparent: true, opacity: 0, depthWrite: false, color, fog: false, alphaTest: 0.05 });
      const o = new THREE.Points(g, m); o.frustumCulled = false; raiz.add(o);
      const fase = new Float32Array(n); for (let k = 0; k < n; k++) fase[k] = rnd() * 6.28;
      return { p, g, m, o, n, fase };
    }
    const copo = texPunto((x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
    const hojaT = texPunto((x) => { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(16, 16, 13, 7, 0.7, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(6, 24); x.lineTo(26, 8); x.stroke(); });
    const nieve = nubePuntos(2400, 3.2, copo, 0xffffff);
    const hojas = nubePuntos(320, 7, hojaT, 0xffffff);
    const colHojas = new Float32Array(320 * 3);
    hojas.g.setAttribute('color', new THREE.BufferAttribute(colHojas, 3)); hojas.m.vertexColors = true;
    let paletaHojas = '';
    function pintarHojas(cols) {
      const k = cols.join();
      if (k === paletaHojas) return; paletaHojas = k;
      const c = new THREE.Color();
      for (let i = 0; i < hojas.n; i++) { c.set(cols[i % cols.length]); colHojas[i * 3] = c.r; colHojas[i * 3 + 1] = c.g; colHojas[i * 3 + 2] = c.b; }
      hojas.g.attributes.color.needsUpdate = true;
    }

    // caja de partículas: centrada en lo que mira la cámara, del tamaño de lo visible
    const caja = { x: D.N / 2, z: D.N / 2, r: 120 };
    function sembrar(p, i, alto) { p[i] = caja.x + (rnd() - 0.5) * caja.r * 2; p[i + 1] = alto ? 6 + rnd() * 34 : rnd() * 40; p[i + 2] = caja.z + (rnd() - 0.5) * caja.r * 2; }
    for (let k = 0; k < NL; k++) { const x = caja.x + (rnd() - 0.5) * 240, y = rnd() * 40, z = caja.z + (rnd() - 0.5) * 240; pl.set([x, y, z, x + 0.25, y + 1.1, z], k * 6); vl[k] = 26 + rnd() * 10; }
    for (const s of [nieve, hojas]) for (let k = 0; k < s.n; k++) sembrar(s.p, k * 3, false);
    const fuera = (x, z) => Math.abs(x - caja.x) > caja.r || Math.abs(z - caja.z) > caja.r;

    // ---------- relámpagos ----------
    const rayo = new THREE.Group(); raiz.add(rayo); rayo.visible = false;
    const mRayo = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (let k = 0; k < 9; k++) rayo.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 1, 0.28), mRayo));
    let proxRayo = 0, flash = [], rayoHasta = 0;
    function dibujarRayo(x0, z0) {
      let x = x0, y = 55, z = z0;
      rayo.children.forEach((m, k) => {
        const ny = 55 - (k + 1) * (55 / rayo.children.length), nx = x + (rnd() - 0.5) * 3.5, nz = z + (rnd() - 0.5) * 3.5;
        const dx = nx - x, dy = ny - y, dz = nz - z, l = Math.hypot(dx, dy, dz);
        m.position.set((x + nx) / 2, (y + ny) / 2, (z + nz) / 2); m.scale.set(1, l, 1);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / l, dy / l, dz / l));
        x = nx; y = ny; z = nz;
      });
    }

    // ---------- fuegos artificiales ----------
    const NF = 1800;
    const pf = new Float32Array(NF * 3), cf = new Float32Array(NF * 3), vf = new Float32Array(NF * 3), vida = new Float32Array(NF), base = new Float32Array(NF * 3);
    const gf = new THREE.BufferGeometry(); gf.setAttribute('position', new THREE.BufferAttribute(pf, 3)); gf.setAttribute('color', new THREE.BufferAttribute(cf, 3));
    const chispa = texPunto((x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
    const mf = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, map: chispa, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const fuegos = new THREE.Points(gf, mf); fuegos.frustumCulled = false; raiz.add(fuegos);
    for (let k = 0; k < NF; k++) { vida[k] = 0; pf[k * 3 + 1] = -999; }
    let libre = 0;
    const cohetes = [];
    const sitios = [];
    const zPlaza = D.zonas.find((z) => z.id === 'plaza'), zFest = D.zonas.find((z) => z.id === 'fest_escenario'), zTec = D.zonas.find((z) => z.id === 'tec_plaza');
    for (const z of [zPlaza, zFest, zTec]) if (z) sitios.push([(z.x0 + z.x1) / 2, (z.z0 + z.z1) / 2]);
    function estallar(x, y, z) {
      const c = new THREE.Color().setHSL(rnd(), 0.9, 0.62), c2 = new THREE.Color().setHSL(rnd(), 0.9, 0.7);
      const n = 70, v = 7 + rnd() * 4;
      for (let k = 0; k < n; k++) {
        const i = libre; libre = (libre + 1) % NF;
        const u = rnd() * 2 - 1, a = rnd() * 6.28, r = Math.sqrt(1 - u * u);
        pf[i * 3] = x; pf[i * 3 + 1] = y; pf[i * 3 + 2] = z;
        vf[i * 3] = r * Math.cos(a) * v; vf[i * 3 + 1] = u * v + 1.5; vf[i * 3 + 2] = r * Math.sin(a) * v;
        const cc = k % 3 ? c : c2; base[i * 3] = cc.r; base[i * 3 + 1] = cc.g; base[i * 3 + 2] = cc.b;
        vida[i] = 1.6 + rnd() * 0.8;
      }
    }
    function lanzar() {
      if (!sitios.length) return;
      const s = sitios[Math.floor(rnd() * sitios.length)];
      cohetes.push({ x: s[0] + (rnd() - 0.5) * 6, y: 1, z: s[1] + (rnd() - 0.5) * 6, vy: 16 + rnd() * 5, techo: 18 + rnd() * 9 });
    }
    let proxFuego = 0;

    // ---------- murciélagos de Halloween ----------
    const murcielagos = [];
    const mM = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.DoubleSide });
    const geoAla = new THREE.BufferGeometry(); geoAla.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.12, 0.55, 0.05, 0.05, 0, 0, 0.14], 3));
    const centros = [];
    const torre = D.props.find((p) => p.t === 'torre'), mago = D.props.find((p) => p.t === 'torre_mago');
    if (torre) centros.push([torre.x, 7, torre.z]);
    if (mago) centros.push([mago.x, 15, mago.z]);
    for (let k = 0; k < 8 && centros.length; k++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), mM));
      const ai = new THREE.Mesh(geoAla, mM), ad = new THREE.Mesh(geoAla, mM); ad.scale.x = -1; g.add(ai, ad);
      raiz.add(g);
      murcielagos.push({ g, ai, ad, c: centros[k % centros.length], r: 2.5 + rnd() * 3, v: 0.9 + rnd() * 0.8, a: rnd() * 6.28, h: rnd() * 3 });
    }

    // ---------- estrellas fugaces (lienzo sobre el cielo) ----------
    const lienzo = document.createElement('canvas'); lienzo.id = 'fugaces';
    Object.assign(lienzo.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    const cieloEl = document.getElementById('estrellas');
    if (cieloEl && cieloEl.parentNode) cieloEl.parentNode.insertBefore(lienzo, cieloEl.nextSibling);
    const cx = lienzo.getContext('2d');
    let fugaces = [], proxFugaz = 0;
    function redimensionar() { lienzo.width = innerWidth; lienzo.height = innerHeight; }
    redimensionar(); addEventListener('resize', redimensionar);

    // ---------- estado pedido por el calendario ----------
    let primera = true, intensidad = 1;
    function ajustar(cal, inmediato) {
      const o = OBJETIVO[cal.clima] || OBJETIVO.despejado;
      obj = Object.assign({}, o);
      // con lluvia, tormenta o nieve no vuelan hojas ni pétalos (así no se mezclan los efectos)
      const malo = cal.clima === 'lluvia' || cal.clima === 'tormenta' || cal.clima === 'nieve';
      obj.hojas = cal.estacion === 'otono' && !malo ? 0.8 : 0;
      obj.petalos = cal.estacion === 'primavera' && !malo ? 0.6 : 0;
      eventos = cal.eventos || [];
      pintarHojas(cal.estacion === 'primavera' ? ['#ffb8d8', '#ffd0e4', '#ffffff'] : ['#e0762a', '#d9a42a', '#c0502a', '#e8b43a', '#a8402a']);
      if (primera || inmediato) { primera = false; Object.assign(est, obj); }
    }

    function actualizar(dt, ms, nocheAct, objetivoCam, anchoVista) {
      noche = nocheAct;
      const k = Math.min(1, dt / 6);
      for (const c in est) est[c] += ((obj[c] || 0) - est[c]) * (Math.abs((obj[c] || 0) - est[c]) < 0.002 ? 1 : k);
      caja.x = objetivoCam.x; caja.z = objetivoCam.z; caja.r = Math.max(30, Math.min(150, anchoVista * 0.62));
      const t = ms / 1000;
      // lluvia
      ml.opacity = Math.min(0.62, est.lluvia * 0.5);
      lluvia.visible = est.lluvia > 0.01 && intensidad > 0;
      if (lluvia.visible) {
        const activos = Math.floor(NL * Math.min(1, est.lluvia) * intensidad);
        for (let i = 0; i < NL; i++) {
          const j = i * 6;
          if (i >= activos) { pl[j + 1] = pl[j + 4] = -50; continue; }
          let y = pl[j + 1] - vl[i] * dt, x = pl[j] + vl[i] * 0.12 * dt;
          if (y < 0 || pl[j + 1] < -10 || fuera(x, pl[j + 2])) { x = caja.x + (rnd() - 0.5) * caja.r * 2; y = 24 + rnd() * 18; pl[j + 2] = caja.z + (rnd() - 0.5) * caja.r * 2; }
          pl[j] = x; pl[j + 1] = y; pl[j + 3] = x + 0.22; pl[j + 4] = y + 1.15; pl[j + 5] = pl[j + 2];
        }
        gl.attributes.position.needsUpdate = true;
      }
      // nieve, hojas y pétalos
      const mover = (s, inten, vy, viento, sway) => {
        s.o.visible = inten > 0.01 && intensidad > 0;
        s.m.opacity = Math.min(1, inten);
        if (!s.o.visible) return;
        const activos = Math.floor(s.n * Math.min(1, inten) * intensidad);
        for (let i = 0; i < s.n; i++) {
          const j = i * 3;
          if (i >= activos) { s.p[j + 1] = -50; continue; }
          s.p[j] += (viento + Math.sin(t * 1.3 + s.fase[i]) * sway) * dt;
          s.p[j + 2] += Math.cos(t * 0.9 + s.fase[i]) * sway * 0.6 * dt;
          s.p[j + 1] -= vy * (0.8 + (i % 5) * 0.08) * dt;
          if (s.p[j + 1] < 0 || fuera(s.p[j], s.p[j + 2])) sembrar(s.p, j, true);
        }
        s.g.attributes.position.needsUpdate = true;
      };
      mover(nieve, est.nieve, 2.4, 0.6, 0.9);
      mover(hojas, Math.max(est.hojas, est.petalos), 1.6, 1.2, 1.6);
      // tormenta: relámpagos con destello
      if (est.tormenta > 0.5 && ms > proxRayo) {
        proxRayo = ms + 6000 + rnd() * 9000;
        flash = [ms, ms + 90, ms + 220];
        rayoHasta = ms + 180;
        dibujarRayo(caja.x + (rnd() - 0.5) * caja.r, caja.z + (rnd() - 0.5) * caja.r);
      }
      let f = 0;
      for (const m of flash) if (ms >= m && ms < m + 90) f = Math.max(f, 1 - (ms - m) / 90);
      rayo.visible = ms < rayoHasta;
      PA.Escena.relampago(f * (0.6 + noche * 0.6));
      // fuegos artificiales: Año Nuevo (muchos) y noches de concierto (algunos)
      const anioNuevo = eventos.indexOf('anio_nuevo') >= 0, concierto = eventos.indexOf('concierto') >= 0 && noche > 0.5;
      if ((anioNuevo || concierto) && noche > 0.4 && ms > proxFuego) { proxFuego = ms + (anioNuevo ? 700 + rnd() * 900 : 5000 + rnd() * 7000); lanzar(); }
      for (let i = cohetes.length - 1; i >= 0; i--) {
        const c = cohetes[i];
        c.y += c.vy * dt;
        const j = libre; libre = (libre + 1) % NF;
        pf[j * 3] = c.x; pf[j * 3 + 1] = c.y; pf[j * 3 + 2] = c.z; vf[j * 3] = vf[j * 3 + 2] = 0; vf[j * 3 + 1] = -1; base[j * 3] = 1; base[j * 3 + 1] = 0.85; base[j * 3 + 2] = 0.5; vida[j] = 0.35;
        if (c.y >= c.techo) { estallar(c.x, c.y, c.z); cohetes.splice(i, 1); }
      }
      let hay = cohetes.length > 0;
      for (let i = 0; i < NF; i++) {
        if (vida[i] <= 0) continue;
        hay = true;
        vida[i] -= dt;
        const j = i * 3;
        vf[j + 1] -= 6 * dt; vf[j] *= 0.985; vf[j + 2] *= 0.985;
        pf[j] += vf[j] * dt; pf[j + 1] += vf[j + 1] * dt; pf[j + 2] += vf[j + 2] * dt;
        const a = Math.max(0, Math.min(1, vida[i] / 1.2));
        cf[j] = base[j] * a; cf[j + 1] = base[j + 1] * a; cf[j + 2] = base[j + 2] * a;
        if (vida[i] <= 0) pf[j + 1] = -999;
      }
      fuegos.visible = hay;
      if (hay) { gf.attributes.position.needsUpdate = true; gf.attributes.color.needsUpdate = true; }
      // murciélagos
      const hw = eventos.indexOf('halloween') >= 0 && noche > 0.45;
      for (const m of murcielagos) {
        m.g.visible = hw;
        if (!hw) continue;
        m.a += m.v * dt;
        m.g.position.set(m.c[0] + Math.cos(m.a) * m.r, m.c[1] + m.h + Math.sin(t * 2 + m.a) * 0.8, m.c[2] + Math.sin(m.a) * m.r);
        m.g.rotation.y = -m.a;
        const w = Math.sin(t * 16 + m.a * 3) * 0.9; m.ai.rotation.z = w; m.ad.rotation.z = -w;
      }
      // estrellas fugaces
      const fug = eventos.indexOf('estrellas_fugaces') >= 0 && noche > 0.6 && est.nubes < 0.3;
      if (fug && ms > proxFugaz) { proxFugaz = ms + 1500 + rnd() * 4000; fugaces.push({ x: rnd() * innerWidth, y: rnd() * innerHeight * 0.35, vx: -(300 + rnd() * 300), vy: 120 + rnd() * 120, v: 1 }); }
      if (fugaces.length || lienzo.dataset.sucio) {
        cx.clearRect(0, 0, lienzo.width, lienzo.height);
        lienzo.dataset.sucio = fugaces.length ? '1' : '';
        for (let i = fugaces.length - 1; i >= 0; i--) {
          const e = fugaces[i];
          e.x += e.vx * dt; e.y += e.vy * dt; e.v -= dt * 0.9;
          if (e.v <= 0) { fugaces.splice(i, 1); continue; }
          const g = cx.createLinearGradient(e.x, e.y, e.x - e.vx * 0.25, e.y - e.vy * 0.25);
          g.addColorStop(0, `rgba(255,255,255,${e.v})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          cx.strokeStyle = g; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(e.x, e.y); cx.lineTo(e.x - e.vx * 0.25, e.y - e.vy * 0.25); cx.stroke();
        }
      }
    }

    return { raiz, ajustar, actualizar, setIntensidad(k) { intensidad = Math.max(0, Math.min(1.5, k)); }, get estado() { return est; } };
  }

  return { crear };
})();
