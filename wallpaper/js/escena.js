/* Pueblo Agéntico — renderer, cámara isométrica y ciclo de día/noche con la hora real. */
window.PA = window.PA || {};
PA.Escena = (function () {
  'use strict';
  const V3 = THREE.Vector3;
  let renderer, escena, camara, sol, hemi, amb, cielo, estrellas, discoSol, discoLuna;
  let N = 54, centro = new V3(27, 0, 27), islas = null;
  const ZMIN = 0.8, ZMAX = 9.5;
  // clima: nubes (0-1) oscurece el sol y el cielo, niebla (0-1) acerca la neblina, flash = relámpago
  const clima = { nubes: 0, niebla: 0, nieve: 0, flash: 0 };
  const AZ = Math.PI / 4, EL = THREE.MathUtils.degToRad(30);
  const DIR = new V3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL));
  let ext = { cx: 0, cy: 0, w: 80, h: 46 };
  let base = new V3();
  const cam = { obj: new V3(), objDeseado: new V3(), zoom: 1, zoomDeseado: 1, zoomUsuario: 1, seguir: null };
  let noche = 0;

  // hora -> colores (cielo arriba, cielo abajo, sol, intensidad sol, hemisferio cielo/suelo, intensidad, noche)
  const CLAVES = [
    [0, '#070b22', '#1a2350', '#8fa8ff', 0.55, '#4a5aa0', '#20243a', 0.85, 1],
    [5.2, '#0a0f2c', '#232c5c', '#8fa8ff', 0.55, '#4a5aa0', '#20243a', 0.85, 1],
    [6.0, '#3b4f8c', '#f2a477', '#ffb07a', 1.6, '#b0c0e8', '#5a4a40', 1.15, 0.55],
    [7.2, '#6fb0e8', '#ffe2bc', '#ffe8c8', 3.1, '#d8eaff', '#806e54', 1.55, 0.05],
    [12, '#5aa8f0', '#d2ecff', '#fff8ee', 3.6, '#e8f4ff', '#8a7a5a', 1.7, 0],
    [16.5, '#64a2e6', '#ffe4c0', '#ffe8c8', 3.3, '#e0eeff', '#8a7a5a', 1.65, 0],
    [17.7, '#5a74c0', '#ffb070', '#ffb880', 2.5, '#d8cfee', '#7a6050', 1.35, 0.15],
    [18.5, '#2c3478', '#f07a6a', '#ff8a5a', 1.3, '#9a90c8', '#4a3a40', 1.05, 0.55],
    [19.4, '#0e1438', '#4a3a78', '#9aa8ff', 0.6, '#5a60b0', '#22243a', 0.85, 0.9],
    [24, '#070b22', '#1a2350', '#8fa8ff', 0.55, '#4a5aa0', '#20243a', 0.85, 1]
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function mezcla(h1, h2, k) { cA.set(h1); cB.set(h2); return cA.lerp(cB, k); }

  function iniciar(contenedor, mundo, opciones) {
    if (typeof mundo === 'number') N = mundo; else { N = mundo.N; islas = mundo.islas; }
    centro = new V3(N / 2, 0, N / 2);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * (opciones.calidad || 1));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = opciones.sombras !== false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    cielo = document.createElement('div');
    cielo.id = 'cielo';
    contenedor.appendChild(cielo);
    discoSol = document.createElement('div'); discoSol.id = 'disco-sol'; contenedor.appendChild(discoSol);
    discoLuna = document.createElement('div'); discoLuna.id = 'disco-luna'; contenedor.appendChild(discoLuna);
    estrellas = document.createElement('canvas');
    estrellas.id = 'estrellas';
    contenedor.appendChild(estrellas);
    dibujarEstrellas();
    contenedor.appendChild(renderer.domElement);

    escena = new THREE.Scene();
    escena.fog = new THREE.Fog(0xcfeaff, 320, 540);
    camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 700);
    hemi = new THREE.HemisphereLight(0xdfefff, 0x8a7a5a, 1.4);
    escena.add(hemi);
    amb = new THREE.AmbientLight(0xffffff, 0.12);
    escena.add(amb);
    sol = new THREE.DirectionalLight(0xfff2e0, 2.8);
    sol.castShadow = true;
    const res = (opciones.calidad || 1) >= 1 ? 4096 : 2048;
    sol.shadow.mapSize.set(res, res);
    const sc = sol.shadow.camera, ex = N * 0.78;
    sc.left = -ex; sc.right = ex; sc.top = ex; sc.bottom = -ex; sc.near = 1; sc.far = 320;
    sol.shadow.bias = -0.0006;
    sol.shadow.normalBias = 0.03;
    sol.target.position.copy(centro);
    escena.add(sol, sol.target);

    calcularExtension();
    cam.obj.copy(base); cam.objDeseado.copy(base);
    ajustar();
    addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); dibujarEstrellas(); ajustar(); });
  }

  function dibujarEstrellas() {
    estrellas.width = innerWidth; estrellas.height = innerHeight;
    const x = estrellas.getContext('2d');
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = 0; i < 260; i++) {
      const h = PA.Geo.hash(i, 3), v = PA.Geo.hash(7, i);
      x.fillStyle = `rgba(255,255,255,${0.35 + PA.Geo.hash(i, i) * 0.65})`;
      const s = PA.Geo.hash(i, 11) > 0.92 ? 2 : 1;
      x.fillRect(h * innerWidth, v * innerHeight * 0.85, s, s);
    }
  }

  function calcularExtension() {
    camara.position.copy(centro).addScaledVector(DIR, 200);
    camara.lookAt(centro);
    camara.updateMatrixWorld();
    let pts = [[0, 0, 0], [N, 0, 0], [0, 0, N], [N, 0, N], [0, -4, N], [N, -4, 0], [N, -6, N], [0, 6, 0], [N, 3, 0], [0, 3, N]];
    if (islas) {
      // el encuadre abarca todas las islas: arriba un poco de los edificios, abajo los acantilados
      pts = [];
      for (const I of islas) pts.push([I.x0, 7, I.z0], [I.x1, 2, I.z0], [I.x0, 2, I.z1], [I.x1, -7, I.z1], [I.x1, -5, I.z0], [I.x0, -5, I.z1]);
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const v = new V3();
    for (const p of pts) { v.set(p[0], p[1], p[2]).applyMatrix4(camara.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    ext = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
    const der = new V3().setFromMatrixColumn(camara.matrixWorld, 0), arr = new V3().setFromMatrixColumn(camara.matrixWorld, 1);
    base = centro.clone().addScaledVector(der, ext.cx).addScaledVector(arr, ext.cy);
  }

  function ajustar() {
    const asp = innerWidth / innerHeight;
    const h = Math.max(ext.h, ext.w / asp) * 1.03 / cam.zoom;
    const w = h * asp;
    camara.left = -w / 2; camara.right = w / 2; camara.top = h / 2; camara.bottom = -h / 2;
    camara.updateProjectionMatrix();
  }
  function pixelesPorUnidad() { return innerHeight / (camara.top - camara.bottom); }
  const zoomInverso = () => 1 / Math.max(0.5, cam.zoom);

  // ---------- cámara ----------
  function seguir(obj, zoom) { cam.seguir = obj; cam.zoomDeseado = obj ? (zoom || Math.max(6.0, cam.zoomUsuario)) : cam.zoomUsuario; if (!obj) cam.objDeseado.copy(base); }
  function zoomUsuario(z) { cam.zoomUsuario = z; if (!cam.seguir) cam.zoomDeseado = z; }
  function zoomRueda(delta, px, py) {
    const z = THREE.MathUtils.clamp(cam.zoomDeseado * (delta > 0 ? 0.88 : 1.14), ZMIN, ZMAX);
    if (!cam.seguir) {
      const p = puntoSuelo(px, py);
      if (p && z > cam.zoomDeseado) cam.objDeseado.lerp(p, 0.18);
      if (z <= 1.02) cam.objDeseado.copy(base);
    }
    cam.zoomDeseado = z;
  }
  function panear(dx, dy) {
    if (cam.seguir) cam.seguir = null;
    const k = 1 / pixelesPorUnidad();
    const der = new V3().setFromMatrixColumn(camara.matrixWorld, 0), arr = new V3().setFromMatrixColumn(camara.matrixWorld, 1);
    cam.objDeseado.addScaledVector(der, -dx * k).addScaledVector(arr, dy * k);
  }
  function actualizarCamara(dt) {
    if (cam.seguir) { cam.objDeseado.copy(cam.seguir.getWorldPosition(new V3())); cam.objDeseado.y = 0.6; }
    const k = 1 - Math.exp(-dt * 4);
    cam.obj.lerp(cam.objDeseado, k);
    const zAnt = cam.zoom;
    cam.zoom += (cam.zoomDeseado - cam.zoom) * k;
    camara.position.copy(cam.obj).addScaledVector(DIR, 200);
    camara.lookAt(cam.obj);
    if (Math.abs(zAnt - cam.zoom) > 1e-4) ajustar();
    ajustarSombra();
  }
  // La cámara de sombras cubre solo lo que se ve (ajustada a la rejilla de texeles para que no tiemble)
  const solDir = new V3(), tmpS = new V3(), ejeX = new V3(), ejeY = new V3();
  let radioSombra = 0;
  function ajustarSombra() {
    if (!sol || solDir.lengthSq() < 0.5) return;
    const w = camara.right - camara.left, h = camara.top - camara.bottom;
    const r = Math.min(N * 0.8, Math.hypot(w, h * 2) * 0.62 + 6);
    if (Math.abs(r - radioSombra) > radioSombra * 0.06) {
      radioSombra = r;
      const sc = sol.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.updateProjectionMatrix();
    }
    const texel = (2 * radioSombra) / sol.shadow.mapSize.x;
    ejeX.crossVectors(solDir, new V3(0, 1, 0)).normalize(); if (ejeX.lengthSq() < 0.1) ejeX.set(1, 0, 0);
    ejeY.crossVectors(ejeX, solDir).normalize();
    const cx = Math.round(cam.obj.dot(ejeX) / texel) * texel, cy = Math.round(cam.obj.dot(ejeY) / texel) * texel, cz = cam.obj.dot(solDir);
    tmpS.copy(ejeX).multiplyScalar(cx).addScaledVector(ejeY, cy).addScaledVector(solDir, cz);
    sol.target.position.copy(tmpS); sol.target.updateMatrixWorld();
    sol.position.copy(tmpS).addScaledVector(solDir, 150);
  }
  // botones de zoom y de "ir a una isla"
  function zoomPaso(dir) {
    const z = THREE.MathUtils.clamp(cam.zoomDeseado * (dir > 0 ? 1.35 : 1 / 1.35), ZMIN, ZMAX);
    if (cam.seguir && dir < 0 && z < 2) cam.seguir = null;
    if (!cam.seguir && z <= 1.02) cam.objDeseado.copy(base);
    cam.zoomDeseado = z;
  }
  function vistaGeneral() { cam.seguir = null; cam.objDeseado.copy(base); cam.zoomDeseado = cam.zoomUsuario; }
  function irA(x, z, zoom) { cam.seguir = null; cam.objDeseado.set(x, 0.6, z); cam.zoomDeseado = THREE.MathUtils.clamp(zoom || 2.6, ZMIN, ZMAX); }
  function ajustarClima(c) { Object.assign(clima, c); ultimoCielo = ''; }
  function relampago(v) { clima.flash = v; if (amb) amb.intensity = 0.12 + v * 2.6; if (cielo) cielo.style.filter = v > 0.05 ? `brightness(${(1 + v * 1.6).toFixed(2)})` : ''; }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(new V3(0, 1, 0), 0);
  function puntoSuelo(px, py) {
    ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camara);
    const p = new V3();
    return ray.ray.intersectPlane(plano, p) ? p : null;
  }
  function tocar(px, py, objetos) {
    ndc.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camara);
    const r = ray.intersectObjects(objetos, false);
    return r.length ? r[0].object : null;
  }
  const tmp = new V3();
  function proyectar(v3) {
    tmp.copy(v3).project(camara);
    return { x: (tmp.x + 1) / 2 * innerWidth, y: (1 - tmp.y) / 2 * innerHeight, visible: tmp.z < 1 && tmp.z > -1 };
  }

  // ---------- día y noche ----------
  let ultimoCielo = '';
  function ciclo(hora) {
    let i = 0;
    while (i < CLAVES.length - 2 && CLAVES[i + 1][0] <= hora) i++;
    const a = CLAVES[i], b = CLAVES[i + 1];
    const k = THREE.MathUtils.clamp((hora - a[0]) / (b[0] - a[0]), 0, 1);
    const nb = clima.nubes;
    const gris = (hex, g) => '#' + cA.set(hex).lerp(cB.set(g), nb * 0.7).getHexString();
    let arriba = '#' + mezcla(a[1], b[1], k).getHexString(), abajo = '#' + mezcla(a[2], b[2], k).getHexString();
    const nocheBase = a[8] + (b[8] - a[8]) * k;
    if (nb > 0.01) { arriba = gris(arriba, nocheBase > 0.5 ? '#151a22' : '#6f7a86'); abajo = gris(abajo, nocheBase > 0.5 ? '#232a34' : (clima.nieve ? '#d8e0e8' : '#a4adb6')); }
    sol.color.copy(mezcla(a[3], b[3], k));
    sol.intensity = (a[4] + (b[4] - a[4]) * k) * (1 - 0.62 * nb);
    hemi.color.copy(mezcla(a[5], b[5], k));
    hemi.groundColor.copy(mezcla(a[6], b[6], k));
    hemi.intensity = (a[7] + (b[7] - a[7]) * k) * (1 - 0.2 * nb) + clima.nieve * 0.25;
    noche = Math.min(1, nocheBase + nb * 0.18 * (1 - nocheBase));
    // posición del sol (o la luna): va de adelante-izquierda a adelante-derecha para iluminar las caras
    let dir;
    if (hora >= 5.8 && hora <= 18.8) {
      const u = (hora - 5.8) / 13, el = Math.sin(u * Math.PI) * 0.75 + 0.35, fi = 0.15 + u * 1.25;
      dir = new V3(Math.sin(fi) * Math.cos(el), Math.sin(el), Math.cos(fi) * Math.cos(el));
    } else dir = new V3(0.35, 0.85, 0.6);
    solDir.copy(dir.normalize());
    ajustarSombra();
    const clave = arriba + abajo + clima.niebla;
    if (clave !== ultimoCielo) {
      ultimoCielo = clave;
      cielo.style.background = `linear-gradient(180deg, ${arriba} 0%, ${abajo} 78%, ${abajo} 100%)`;
      escena.fog.color.set(abajo).lerp(new THREE.Color(arriba), 0.25);
      escena.fog.near = 320 - clima.niebla * 190; escena.fog.far = 540 - clima.niebla * 220;
    }
    estrellas.style.opacity = (Math.max(0, (noche - 0.3) / 0.7) * (1 - nb * 0.85)).toFixed(3);
    // disco del sol (de día) y de la luna (de noche), solo decorativos
    const dia = hora >= 5.6 && hora <= 19.2;
    if (dia) {
      const u = (hora - 5.6) / 13.6;
      discoSol.style.opacity = (Math.min(1, Math.sin(u * Math.PI) * 3) * (1 - nb * 0.9)).toFixed(2);
      discoSol.style.transform = `translate(${(8 + u * 70).toFixed(1)}vw, ${(34 - Math.sin(u * Math.PI) * 26).toFixed(1)}vh)`;
      discoSol.className = (u < 0.12 || u > 0.86) ? 'bajo' : '';
      discoLuna.style.opacity = 0;
    } else {
      const h2 = hora > 12 ? hora - 19.2 : hora + 4.8, u = Math.min(1, h2 / 10.4);
      discoLuna.style.opacity = (Math.min(1, Math.sin(u * Math.PI) * 3) * (1 - nb * 0.85)).toFixed(2);
      discoLuna.style.transform = `translate(${(78 - u * 62).toFixed(1)}vw, ${(30 - Math.sin(u * Math.PI) * 20).toFixed(1)}vh)`;
      discoSol.style.opacity = 0;
    }
    renderer.toneMappingExposure = 1.12 + noche * 0.18;
    return noche;
  }

  // ---------- retrato del personaje seleccionado (se dibuja solo él, en vivo) ----------
  let rtR = null, camR = null, bufR = null, ultimoR = null;
  const GAMMA = new Uint8Array(256).map((_, v) => Math.round(255 * Math.pow(v / 255, 1 / 2.2)));
  function retrato(actor, canvas) {
    if (!actor || !canvas) return;
    const W = canvas.width;
    if (!rtR || rtR.width !== W) {
      rtR = new THREE.WebGLRenderTarget(W, W);
      camR = new THREE.OrthographicCamera(-0.6, 0.6, 0.6, -0.6, 0.1, 14);
      camR.layers.set(1);
      bufR = new Uint8Array(W * W * 4);
      for (const l of [sol, hemi, amb]) l.layers.enable(1);
    }
    if (ultimoR !== actor) {
      if (ultimoR) ultimoR.rig.raiz.traverse((o) => o.layers.disable(1));
      actor.rig.raiz.traverse((o) => o.layers.enable(1));
      ultimoR = actor;
    }
    const c = actor.centroCabeza(new V3());
    const ang = actor.rot + 0.55, s = actor.cuadrupedo ? (actor.rig.tipo === 'llama' ? 0.62 : 0.5) : 0.6;
    camR.left = -s; camR.right = s; camR.top = s; camR.bottom = -s; camR.updateProjectionMatrix();
    camR.position.set(c.x + Math.sin(ang) * 5, c.y + 1.2, c.z + Math.cos(ang) * 5);
    camR.lookAt(c.x, c.y - 0.12, c.z);
    const alfa = renderer.getClearAlpha();
    renderer.setRenderTarget(rtR);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(escena, camR);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, alfa);
    renderer.readRenderTargetPixels(rtR, 0, 0, W, W, bufR);
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(W, W), d = img.data;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const i = ((W - 1 - y) * W + x) * 4, o = (y * W + x) * 4;
      d[o] = GAMMA[bufR[i]]; d[o + 1] = GAMMA[bufR[i + 1]]; d[o + 2] = GAMMA[bufR[i + 2]]; d[o + 3] = bufR[i + 3];
    }
    ctx.putImageData(img, 0, 0);
  }
  function soltarRetrato() { if (ultimoR) ultimoR.rig.raiz.traverse((o) => o.layers.disable(1)); ultimoR = null; }

  function sombras(on) { renderer.shadowMap.enabled = on; sol.castShadow = on; escena.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
  function calidad(c) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * c); renderer.setSize(innerWidth, innerHeight); }
  function render() { renderer.render(escena, camara); }

  return {
    iniciar, ciclo, render, zoomInverso, proyectar, tocar, puntoSuelo, seguir, zoomUsuario, zoomRueda, panear, actualizarCamara, sombras, calidad, pixelesPorUnidad, retrato, soltarRetrato,
    zoomPaso, vistaGeneral, irA, ajustarClima, relampago, get zoom() { return cam.zoom; }, get objetivo() { return cam.obj; },
    get escena() { return escena; }, get camara() { return camara; }, get renderer() { return renderer; }, get noche() { return noche; }, get siguiendo() { return cam.seguir; }
  };
})();
