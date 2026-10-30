/* Pueblo Agéntico — actores: caminan con A* (evitando ir por el asfalto), aceleran y frenan suave,
 * se apartan entre ellos, animan cada actividad, hablan, miran, montan la moto y tienen sombra de contacto. */
window.PA = window.PA || {};
PA.Actores = (function () {
  'use strict';
  const V3 = THREE.Vector3, rad = PA.Geo.rad, hash = PA.Geo.hash;
  const sin = Math.sin, max = Math.max, PI = Math.PI;

  const ANIM = {
    comer: 'comer', banquete: 'comer', helado: 'comer', tomar_te: 'beber', cocinar: 'cocinar', dormir: 'dormir', recargar: 'recargar', siesta: 'siesta',
    sofa_jane: 'relax', jugar_consola: 'jugar', arcade: 'arcade', pingpong: 'pingpong', ajedrez: 'ajedrez', trono: 'trono', guitarra: 'guitarra',
    bateria: 'bateria', teclado: 'piano', cantar: 'cantar', publico: 'aplaudir', bailar: 'bailar', banca: 'sentado', fuente: 'contemplar', pasear: 'mirar',
    programar: 'teclear', servidores: 'revisar', editar_video: 'teclear', grabar: 'gesticular', podcast: 'gesticular', investigar: 'pensar', papeleo: 'escribir',
    reunion: 'gesticular', leer: 'leer', boxeo: 'boxeo', pesas: 'pesas', correr: 'correr', tiro_arco: 'arco', espada: 'espada', roca: 'boxeo',
    cortar_lena: 'hachazo', meditar: 'meditar', pescar: 'pescar', hamaca: 'relax', jardineria: 'regar', observar_aves: 'binoculares', fogata: 'fogata',
    brasero: 'calentarse', reparar_moto: 'reparar', vigilar: 'vigilar', pasear_moto: 'mirar',
    trabajar_hq: 'mirar', ver_pelicula: 'sentado', snack: 'comer', actuar: 'gesticular', dirigir: 'gesticular', dj: 'teclear', karaoke: 'cantar',
    pociones: 'cocinar', recolectar: 'reparar', explorar: 'pensar', estudiar_magia: 'leer',
    futbol: 'futbol', ver_partido: 'aplaudir', basquet: 'basquet', calistenia: 'pesas', nadar: 'nadar', tomar_sol: 'relax', reparar_bici: 'reparar',
    pasear_bici: 'mirar', manejar: 'mirar', ajedrez_gigante: 'pensar', columpiarse: 'columpio', jugar_perro: 'lanzar', ver_series: 'sentado', en_casa: 'sentado',
    comprar: 'mirar', visitar_tumbas: 'contemplar', voley: 'basquet', castillo: 'reparar', surf: 'surf', salvavidas: 'binoculares', atender: 'gesticular',
    vitrinear: 'contemplar', probar_ropa: 'mirar', admirar: 'contemplar', subir_juego: 'mirar', hacer_fila: 'mirar', tiro_feria: 'lanzar', leer_manga: 'leer', onsen: 'meditar', sumo: 'boxeo',
    comer_gato: 'g_comer', dormir_gato: 'dormir', jugar_gato: 'g_jugar', molestar: 'g_sentado', mirar: 'g_sentado'
  };
  const ITEM = {
    comer: 'comida', banquete: 'comida', tomar_te: 'taza', leer: 'libro', jugar_consola: 'control', pingpong: 'raqueta', cocinar: 'sarten', espada: 'espada',
    tiro_arco: 'arco', cortar_lena: 'hacha', reparar_moto: 'llave', pescar: 'cana', jardineria: 'regadera', observar_aves: 'binoculares', helado: 'helado',
    guitarra: 'guitarra', bateria: 'baquetas', pesas: 'mancuernas', cantar: 'mic', karaoke: 'mic', snack: 'palomitas', estudiar_magia: 'libro', reparar_bici: 'llave', leer_manga: 'libro'
  };
  const ITEM_PAR = { selfie: 'celular', dar: 'regalo', duelo: 'espada', boxeo: null };
  const LIBRES = ['pasear', 'fuente', 'helado', 'brasero', 'vigilar', 'publico', 'pasear_moto', 'explorar', 'pasear_bici', 'manejar', 'comprar', 'jugar_perro', 'vitrinear', 'admirar', 'hacer_fila'];
  const MONTAR = ['pasear_moto', 'pasear_bici', 'manejar'];
  // Con lluvia, el paraguas solo se usa caminando o en actividades tranquilas de pie (no jugando, bailando ni aplaudiendo)
  const PARAGUAS = ['mirar', 'contemplar', 'pensar', 'vigilar', 'gesticular'];
  const BRAZO_PARAGUAS = -0.6, INCLINA_PARAGUAS = 0.12;   // el brazo derecho lo sostiene quieto; el mango se inclina hacia la cabeza
  const MUSICA_EXTRA = ['dj', 'karaoke'];
  const MUSICA = ['guitarra', 'bateria', 'teclado', 'cantar'];
  const LED = { enojado: 0xff3a3a, triste: 0xff3a3a, lloroso: 0xff3a3a, asustado: 0xffd23a, nervioso: 0xffd23a, confundido: 0xffd23a, sorprendido: 0xffd23a, pensativo: 0xffd23a };

  const ALCANCE = 1.4, CUERPO = 0.55;   // a qué distancia se ven venir y cuánto ocupa cada uno al caminar
  function angDif(a, b) { let d = a - b; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; }

  // ---------------- A* (el asfalto cuesta más: se cruza, no se camina por él) ----------------
  function crearBuscador(grid) {
    const N = grid.N, bloq = grid.bloq, calle = grid.calle, T = N * N;
    const g = new Float32Array(T), f = new Float32Array(T), padre = new Int32Array(T), visto = new Uint32Array(T), cerrado = new Uint32Array(T);
    let marca = 0;
    const heap = [];
    const libre = (i, j) => i >= 0 && j >= 0 && i < N && j < N && !bloq[i + j * N];
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    function push(n) { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (f[heap[p]] <= f[heap[i]]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } }
    function pop() {
      const top = heap[0], last = heap.pop();
      if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l; if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } }
      return top;
    }
    function cercano(x, z) {
      const i0 = Math.floor(x), j0 = Math.floor(z);
      if (libre(i0, j0)) return [i0, j0];
      for (let r = 1; r <= 6; r++) {
        let mejor = null, md = 1e9;
        for (let i = i0 - r; i <= i0 + r; i++) for (let j = j0 - r; j <= j0 + r; j++) {
          if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || !libre(i, j)) continue;
          const d = (i + 0.5 - x) ** 2 + (j + 0.5 - z) ** 2;
          if (d < md) { md = d; mejor = [i, j]; }
        }
        if (mejor) return mejor;
      }
      return null;
    }
    function visible(ax, az, bx, bz) {
      const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.2);
      let enAsfalto = 0;
      for (let k = 1; k < n; k++) {
        const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n;
        if (!libre(Math.floor(x), Math.floor(z)) || !libre(Math.floor(x + 0.28), Math.floor(z)) || !libre(Math.floor(x - 0.28), Math.floor(z)) || !libre(Math.floor(x), Math.floor(z + 0.28)) || !libre(Math.floor(x), Math.floor(z - 0.28))) return false;
        if (calle && calle[Math.floor(x) + Math.floor(z) * N]) enAsfalto++;
      }
      return enAsfalto * 0.2 < 4.6;
    }
    function buscar(sx, sz, tx, tz) {
      const s = cercano(sx, sz), t = cercano(tx, tz);
      if (!s || !t) return null;
      marca++; heap.length = 0;
      const si = s[0] + s[1] * N, ti = t[0] + t[1] * N;
      g[si] = 0; f[si] = Math.hypot(t[0] - s[0], t[1] - s[1]); padre[si] = -1; visto[si] = marca; push(si);
      let pasos = 0;
      while (heap.length && pasos++ < 40000) {
        const c = pop();
        if (c === ti) break;
        if (cerrado[c] === marca) continue;
        cerrado[c] = marca;
        const ci = c % N, cj = (c / N) | 0;
        for (const [di, dj, cost] of DIRS) {
          const ni = ci + di, nj = cj + dj;
          if (!libre(ni, nj) || (di && dj && (!libre(ci + di, cj) || !libre(ci, cj + dj)))) continue;
          const n = ni + nj * N, ng = g[c] + cost * (calle && calle[n] ? 3 : 1);
          if (visto[n] !== marca || ng < g[n]) { visto[n] = marca; g[n] = ng; f[n] = ng + Math.hypot(t[0] - ni, t[1] - nj); padre[n] = c; push(n); }
        }
      }
      if (visto[ti] !== marca) return null;
      const pts = [];
      for (let c = ti; c !== -1; c = padre[c]) pts.push([c % N + 0.5, ((c / N) | 0) + 0.5]);
      pts.reverse();
      let out = pts;
      if (pts.length >= 3) {
        out = [pts[0]];
        let i = 0;
        while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !visible(pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); i = j; }
      }
      // por el centro de la vereda: cada punto junto a una calle se corre al medio de su vereda, si el tramo sigue despejado
      if (grid.carril) for (let k = 0; k < out.length; k++) {
        const c = grid.carril(out[k][0], out[k][1]);
        if (!c || !libre(Math.floor(c[0]), Math.floor(c[1]))) continue;
        const a = out[k - 1], b = out[k + 1];
        if ((!a || visible(a[0], a[1], c[0], c[1])) && (!b || visible(c[0], c[1], b[0], b[1]))) out[k] = c;
      }
      return out;
    }
    const alturaEn = grid.suelo || ((x, z) => { const i = Math.floor(x), j = Math.floor(z); return i >= 0 && j >= 0 && i < N && j < N ? grid.altura[i + j * N] : 0; });
    // libre con holgura del ancho del cuerpo (para no meterse en muebles ni muros al esquivar)
    // (las celdas con baranda cuentan como ocupadas: al esquivar nadie se corre hacia el borde de la isla)
    const firme = (i, j) => libre(i, j) && !(grid.borde && grid.borde[i + j * N]);
    const holgado = (x, z) => firme(Math.floor(x), Math.floor(z)) && firme(Math.floor(x + 0.22), Math.floor(z)) && firme(Math.floor(x - 0.22), Math.floor(z)) && firme(Math.floor(x), Math.floor(z + 0.22)) && firme(Math.floor(x), Math.floor(z - 0.22));
    return { buscar, alturaEn, libre, holgado, firme };
  }

  // ---------------- partículas ----------------
  function texGlifo(glifo, color, fuente) {
    const c = PA.Geo.lienzo(32, 32), x = c.getContext('2d');
    x.font = `bold 26px ${fuente || '"Silkscreen", monospace'}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,0.35)'; x.strokeText(glifo, 16, 17);
    x.fillStyle = color; x.fillText(glifo, 16, 17);
    return new THREE.CanvasTexture(c);
  }
  class Particulas {
    constructor(escena, tex, max, tam) {
      this.max = max; this.vivas = [];
      const g = new THREE.BufferGeometry();
      this.pos = new Float32Array(max * 3); this.alfa = new Float32Array(max);
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      g.setAttribute('alfa', new THREE.BufferAttribute(this.alfa, 1));
      this.mat = new THREE.ShaderMaterial({
        uniforms: { mapa: { value: tex }, escala: { value: 30 }, tam: { value: tam } },
        vertexShader: 'attribute float alfa; varying float vA; uniform float escala; uniform float tam; void main(){ vA = alfa; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = tam * escala * (0.7 + 0.3 * alfa); }',
        fragmentShader: 'uniform sampler2D mapa; varying float vA; void main(){ vec4 c = texture2D(mapa, gl_PointCoord); if (c.a * vA < 0.04) discard; gl_FragColor = vec4(c.rgb, c.a * vA); }',
        transparent: true, depthWrite: false
      });
      this.puntos = new THREE.Points(g, this.mat);
      this.puntos.frustumCulled = false;
      escena.add(this.puntos);
    }
    emitir(x, y, z, vx, vy, vz, vida) { if (this.vivas.length < this.max) this.vivas.push({ x, y, z, vx, vy, vz, vida, t: 0, fase: Math.random() * 6 }); }
    actualizar(dt, escala) {
      this.mat.uniforms.escala.value = escala;
      let k = 0;
      for (let i = this.vivas.length - 1; i >= 0; i--) {
        const p = this.vivas[i];
        p.t += dt;
        if (p.t >= p.vida) { this.vivas.splice(i, 1); continue; }
        p.x += (p.vx + sin(p.t * 3 + p.fase) * 0.15) * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
      for (const p of this.vivas) {
        this.pos[k * 3] = p.x; this.pos[k * 3 + 1] = p.y; this.pos[k * 3 + 2] = p.z;
        const u = p.t / p.vida; this.alfa[k] = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
        k++;
      }
      for (let i = k; i < this.max; i++) this.alfa[i] = 0;
      this.puntos.geometry.attributes.position.needsUpdate = true;
      this.puntos.geometry.attributes.alfa.needsUpdate = true;
      this.puntos.geometry.setDrawRange(0, Math.max(1, k));
    }
  }

  // ---------------- actor ----------------
  class Actor {
    constructor(sis, d) {
      this.sis = sis; this.d = d; this.id = d.id;
      this.rig = PA.Modelos.crear(d);
      this.rig.raiz.userData.actor = this;
      this.rig.hit.userData.actor = this;
      sis.escena.add(this.rig.raiz);
      this.pos = new V3(36, 0, 36); this.rot = 0; this.rotDeseada = 0; this.ySuelo = 0; this.freno = 1; this.avI = -1; this.avD = 0; this.atasco = 0;
      const ap = d.ap || {};
      this.cuadrupedo = this.rig.tipo !== 'humano';
      this.vel = this.rig.tipo === 'gato' ? 1.9 : this.rig.tipo === 'llama' ? 1.3 : 1.45 + hash(d.id.length, d.id.charCodeAt(0)) * 0.35 + ((ap.alto || 1) - 1) * 0.6;
      this.velActual = 0;
      this.fase = hash(d.id.charCodeAt(0), d.id.length) * 10;
      this.estiloBaile = Math.abs(PA.Modelos.hashStr(d.id)) % 3;
      if (d.id === 'peacemaker') this.estiloBaile = 1;
      this.levita = d.tipo === 'ia' || d.id === 'gandalf';
      this.estado = 'quieto'; this.camino = null; this.iCamino = 0;
      this.spot = null; this.act = null; this.pose = 'parado'; this.anim = 'mirar';
      this.emocion = d.emoBase || 'contento';
      this.hablandoHasta = 0; this.mirarA = null; this.saludoHasta = 0; this.atenderHasta = 0;
      this.parpadeoHasta = 0; this.proxParpadeo = performance.now() + 1000 + Math.random() * 3000;
      this.boca = false; this.proxBoca = 0;
      this.items = {}; this.itemActual = null;
      this.proxZ = 0; this.proxNota = 0; this.proxCorazon = 0;
      this.montura = null;
      this.par = null;
      this.cabezaTmp = new V3();
      this.setEmocion(this.emocion);
    }

    sobreCabeza() {
      const r = this.rig;
      if (this.montura) return this.cabezaTmp.set(this.pos.x, r.dims.alto + 0.55, this.pos.z);
      const h = r.dims.alto + (this.pose === 'acostado' ? -r.dims.alto * 0.55 : this.pose === 'sentado' || this.pose === 'meditar' ? -r.dims.LEG * 0.9 : 0) + 0.25;
      return this.cabezaTmp.set(this.pos.x, this.rig.raiz.position.y + h + (this.cuadrupedo ? 0.1 : 0), this.pos.z);
    }
    centroCabeza(v) {
      const r = this.rig;
      if (r.cabeza) { r.cabeza.getWorldPosition(v); v.y += (r.dims.HH || 0.3) * 0.5; return v; }
      return v.copy(this.sobreCabeza()).setY(this.sobreCabeza().y - 0.35);
    }

    ordenar(spotId, act, inmediato) {
      const s = this.sis.spots[spotId];
      if (!s) return;
      if (this.montura) this.montura.bajar();
      this.spot = s; this.act = act; this.par = null;
      this.ponerItem(null);
      this.mirarA = null;
      this.oculto = false; this.rig.raiz.visible = true;
      if (this.sis.lluvia && !this.cuadrupedo) this.ponerItem('paraguas');
      this.dest = null;
      const [dx, dz] = this.dest = this.puntoEn(s);
      const dist = Math.hypot(dx - this.pos.x, dz - this.pos.z);
      if (inmediato || dist < 0.05) { this.teletransportar(s); return; }
      const camino = this.sis.buscador.buscar(this.pos.x, this.pos.z, dx, dz);
      if (!camino) { this.teletransportar(s); return; }
      camino.push([dx, dz]);
      this.camino = camino; this.iCamino = 0; this.avI = -1;
      this.estado = 'caminando'; this.pose = 'parado'; this.anim = 'caminar';
    }
    // Dónde pararse: las actividades libres (pasear, mirar la fuente, ser público...) se comparten, y si otro ya
    // está o va a ese punto, busca un lugar despejado al lado para no quedar uno dentro del otro
    puntoEn(s) {
      if ((s.pose && s.pose !== 'parado') || s.vehiculo || MONTAR.indexOf(this.act) >= 0) return [s.x, s.z];
      const otros = [];
      for (const a of this.sis.lista) if (a !== this && a.dest && !a.oculto && !a.montura) otros.push(a.dest);
      const ocupa = (x, z) => otros.some((d) => Math.abs(d[0] - x) < 0.6 && Math.abs(d[1] - z) < 0.6 && Math.hypot(d[0] - x, d[1] - z) < 0.6);
      if (!ocupa(s.x, s.z)) return [s.x, s.z];
      const B = this.sis.buscador, r0 = rad(s.r || 0);
      for (const r of [0.65, 1.0, 1.35]) for (const g of [90, -90, 45, -45, 135, -135, 180, 0]) {
        const x = s.x + Math.sin(r0 + rad(g)) * r, z = s.z + Math.cos(r0 + rad(g)) * r;
        if (!ocupa(x, z) && B.firme(Math.floor(x), Math.floor(z))) return [x, z];
      }
      return [s.x, s.z];
    }
    teletransportar(s) {
      const d = this.dest || [s.x, s.z];
      this.pos.x = d[0]; this.pos.z = d[1];
      this.rot = this.rotDeseada = rad(s.r);
      this.llegar(true);
    }
    // Interacción con otro vecino: si hace falta, el segundo camina hasta quedar enfrente; al terminar, cada uno vuelve a lo suyo
    parCon(otro, anim, cerca, quieto) {
      if (this.cuadrupedo || this.oculto || this.montura || !this.spot) return;
      this.par = { otro, anim, listo: true, movido: false };
      this.ponerItem(ITEM_PAR[anim] || null);
      const d = Math.hypot(otro.pos.x - this.pos.x, otro.pos.z - this.pos.z);
      if (!cerca || quieto || d < 1.05 || d > 9) return;
      const px = otro.pos.x + (this.pos.x - otro.pos.x) / d * 0.92, pz = otro.pos.z + (this.pos.z - otro.pos.z) / d * 0.92;
      const camino = this.sis.buscador.buscar(this.pos.x, this.pos.z, px, pz);
      if (!camino) return;
      camino.push([px, pz]);
      this.par.listo = false; this.par.movido = true;
      this.camino = camino; this.iCamino = 0; this.avI = -1;
      this.estado = 'caminando'; this.pose = 'parado'; this.anim = 'caminar';
    }
    finPar() {
      const p = this.par;
      if (!p) return;
      this.par = null;
      if (!this.spot) return;
      if (p.movido) this.ordenar(this.spot.id, this.act); else if (this.estado === 'actividad') this.llegar(false);
    }
    llegar(directo) {
      if (this.par && !directo) {
        this.estado = 'actividad'; this.camino = null; this.velActual = 0; this.pose = 'parado'; this.par.listo = true;
        return;
      }
      const s = this.spot, d = this.dest || [s.x, s.z];
      this.estado = 'actividad'; this.camino = null; this.velActual = 0;
      this.pos.x = d[0]; this.pos.z = d[1];
      this.rotDeseada = rad(s.r);
      if (directo) this.rot = this.rotDeseada;
      this.pose = s.pose || 'parado';
      this.anim = ANIM[this.act] || 'mirar';
      this.par = null;
      let item = s.item || ITEM[this.act];
      if (item === 'espada' && (this.d.id === 'kratos' || this.d.id === 'gimli')) item = 'hacha';
      // bajo la lluvia, quien se queda de pie al aire libre en algo tranquilo sigue con el paraguas
      if (!item && this.quiereParaguas(s)) item = 'paraguas';
      this.ponerItem(item && !this.cuadrupedo ? item : null);
      // entra al edificio (oficinas, cine, torre del mago): se esconde hasta que salga
      if (this.pose === 'dentro') { this.oculto = true; this.rig.raiz.visible = false; }
      if (MONTAR.indexOf(this.act) >= 0 && !directo && this.sis.alMontar) this.sis.alMontar(this);
    }
    alBajarDeMoto() {
      if (!this.spot) return;
      this.pos.x = this.spot.x; this.pos.z = this.spot.z;
      this.rotDeseada = rad(this.spot.r);
      this.pose = 'parado'; this.anim = 'mirar';
    }

    quiereParaguas(s) {
      return this.sis.lluvia && !this.cuadrupedo && this.pose === 'parado' && PARAGUAS.indexOf(this.anim) >= 0 && MONTAR.indexOf(this.act) < 0 && this.sis.alAireLibre(s);
    }
    // Si empieza o para de llover, abre o guarda el paraguas sin esperar a la siguiente actividad
    revisarParaguas() {
      if (this.cuadrupedo || this.montura) return;
      if (!this.sis.lluvia) { if (this.conParaguas) this.ponerItem(null); return; }
      if (this.itemActual) return;
      if (this.estado === 'caminando' || (this.estado === 'actividad' && this.spot && this.quiereParaguas(this.spot))) this.ponerItem('paraguas');
    }
    // Largo del mango para que la tela quede justo sobre la coronilla (sombrero incluido) con el brazo en BRAZO_PARAGUAS
    largoParaguas() {
      const r = this.rig, inv = new THREE.Matrix4(), m = new THREE.Matrix4(), caja = new THREE.Box3(), b = new THREE.Box3();
      r.torso.updateMatrixWorld(true);
      inv.copy(r.torso.matrixWorld).invert();
      r.cabeza.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        caja.union(b.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
      });
      const tope = (caja.isEmpty() ? r.dims.TOR + r.dims.HH : caja.max.y) - r.brazoD.position.y;
      return (tope - r.manoD.position.y * Math.cos(BRAZO_PARAGUAS) + 0.1) / Math.cos(INCLINA_PARAGUAS * 1.41);
    }

    ponerItem(nombre) {
      if (this.itemActual) for (const it of this.itemActual) it.g.visible = false;
      this.itemActual = null;
      this.conParaguas = false;
      if (!nombre || this.cuadrupedo) return;
      if (!this.items[nombre]) {
        const base = PA.Modelos.crearItem(nombre, this.d, nombre === 'paraguas' ? { largo: this.largoParaguas() } : null);
        if (!base) return;
        const r = this.rig, D = r.dims, lista = [];
        const enMano = (it, mano, dx) => { it.g.position.set(dx || 0, 0, 0.02); mano.add(it.g); lista.push(it); };
        if (base.en === 'torso') { base.g.position.set(-0.04, D.TOR * 0.32, D.TD / 2 + 0.07); base.g.rotation.z = -0.45; r.torso.add(base.g); lista.push(base); }
        // mango vertical con el brazo en BRAZO_PARAGUAS, un poco inclinado hacia la cabeza (el brazo derecho está en -x)
        else if (base.en === 'paraguas') { base.g.rotation.set(-PI / 2 - INCLINA_PARAGUAS - BRAZO_PARAGUAS, INCLINA_PARAGUAS, 0); enMano(base, r.manoD); }
        else if (base.en === 'manoI') enMano(base, r.manoI);
        else if (base.en === 'ambasCentro') enMano(base, r.manoD, D.TW / 2 + 0.08);
        else if (base.en === 'ambas') { enMano(base, r.manoD); const b2 = PA.Modelos.crearItem(nombre, this.d); enMano(b2, r.manoI); }
        else enMano(base, r.manoD);
        this.items[nombre] = lista;
      }
      this.itemActual = this.items[nombre];
      for (const it of this.itemActual) it.g.visible = true;
      this.conParaguas = nombre === 'paraguas';
    }

    setEmocion(e) {
      if (!e) return;
      this.emocion = e;
      if (this.rig.led) this.rig.led.material.color.setHex(LED[e] || 0x38b6ff);
    }
    hablar(dur, conId) {
      this.hablandoHasta = performance.now() + dur * 1000;
      if (conId && this.sis.porId[conId]) this.mirarA = this.sis.porId[conId];
    }
    saludar() { this.saludoHasta = performance.now() + 3200; }
    get durmiendo() { return this.estado === 'actividad' && !this.montura && (this.anim === 'dormir' || this.anim === 'siesta' || this.anim === 'recargar'); }

    actualizar(dt, t, ahora) {
      const r = this.rig, B = this.sis.buscador;
      if (this.lluviaVista !== this.sis.lluvia) { this.lluviaVista = this.sis.lluvia; this.revisarParaguas(); }
      if (this.montura) {
        const v = this.montura;
        this.pos.set(v.pos.x, 0, v.pos.z);
        this.rot = v.m.g.rotation.y;
        this.animarMontado(dt, t);
        r.raiz.position.set(v.pos.x, 0, v.pos.z);
        r.raiz.rotation.y = this.rot;
      } else {
        // ---- caminar: acelera, frena al llegar, gira antes de arrancar ----
        if (this.estado === 'caminando' && this.camino) {
          const o0 = this.camino[this.iCamino];
          const giro = Math.abs(angDif(Math.atan2(o0[0] - this.pos.x, o0[1] - this.pos.z), this.rot));
          const ultimo = this.camino[this.camino.length - 1], resta = Math.hypot(ultimo[0] - this.pos.x, ultimo[1] - this.pos.z);
          const objetivo = this.vel * (giro > 1.3 ? 0.25 : 1) * Math.min(1, 0.35 + resta / 1.2) * this.freno;
          this.velActual += (objetivo - this.velActual) * Math.min(1, dt * 5);
          let paso = this.velActual * dt;
          while (paso > 0 && this.camino) {
            const o = this.camino[this.iCamino];
            const dx = o[0] - this.pos.x, dz = o[1] - this.pos.z, d = Math.hypot(dx, dz);
            // los puntos intermedios se dan por pasados a 0,35 (si dos van al mismo punto, no se quedan dando vueltas)
            if (d <= paso || (d < 0.35 && this.iCamino < this.camino.length - 1)) {
              if (d <= paso) { this.pos.x = o[0]; this.pos.z = o[1]; paso -= d; }
              this.iCamino++;
              if (this.iCamino >= this.camino.length) { this.llegar(false); break; }
            } else { this.pos.x += dx / d * paso; this.pos.z += dz / d * paso; this.rotDeseada = Math.atan2(dx, dz); paso = 0; }
          }
          // esquivar a los demás: mira hacia adelante y se corre hacia el lado contrario de quien viene
          // (de frente, cada uno a su derecha); si alguien queda pegado se separa, y frena si lo tiene justo delante.
          // Cerca de su destino deja de esquivar (para llegar siempre) y si lleva 2 s sin avanzar, pasa igual.
          this.freno = 1;
          if (this.estado === 'caminando') {
            const o = this.camino[this.iCamino], hx = o[0] - this.pos.x, hz = o[1] - this.pos.z, hd = Math.hypot(hx, hz) || 1;
            if (this.iCamino !== this.avI || hd < this.avD - 0.05) { this.avI = this.iCamino; this.avD = hd; this.atasco = 0; } else this.atasco += dt;
            const cerca = this.atasco > 2 ? 0 : Math.min(1, Math.max(0, (resta - 0.3) / 0.6));
            const fx = hx / hd, fz = hz / hd, px = fz, pz = -fx;
            let lado = 0, sx = 0, sz = 0;
            if (cerca > 0) for (const a of this.sis.lista) {
              if (a === this || a.montura || a.oculto) continue;
              const dx = a.pos.x - this.pos.x, dz = a.pos.z - this.pos.z;
              if (dx > ALCANCE || dx < -ALCANCE || dz > ALCANCE || dz < -ALCANCE) continue;
              const d = Math.hypot(dx, dz);
              if (d < CUERPO) { const k = d > 0.001 ? (CUERPO - d) / d : 0; sx -= dx * k; sz -= dz * k; if (d <= 0.001) { sx += px * 0.2; sz += pz * 0.2; } }
              const ad = dx * fx + dz * fz, lat = dx * px + dz * pz;
              if (ad <= 0 || ad > ALCANCE || Math.abs(lat) > 0.65) continue;
              const w = (1 - ad / ALCANCE) * (1 - Math.abs(lat) / 0.65);
              lado += (Math.abs(lat) < 0.02 ? 1 : -Math.sign(lat)) * w;
              // de frente o detenido justo delante: frena un poco mientras lo rodea (nunca se queda quieto)
              if (ad < 0.7 && Math.abs(lat) < 0.4) this.freno = Math.min(this.freno, 0.35 + ad * 0.5);
            }
            this.freno = 1 - (1 - this.freno) * cerca;
            const lmax = this.vel * dt * 0.9, lat = Math.max(-lmax, Math.min(lmax, lado * this.vel * dt * 1.6)) * cerca, ks = Math.min(1, dt * 8) * cerca;
            const mx = lat * px + sx * ks, mz = lat * pz + sz * ks;
            if (mx || mz) {
              const nx = this.pos.x + mx, nz = this.pos.z + mz;
              if (B.holgado(nx, nz) || (!B.holgado(this.pos.x, this.pos.z) && B.firme(Math.floor(nx), Math.floor(nz)))) { this.pos.x = nx; this.pos.z = nz; }
            }
          }
        }
        const enLibre = this.estado === 'actividad' && (LIBRES.indexOf(this.act) >= 0 || this.pose === 'parado' && this.anim === 'mirar');
        if (this.mirarA && ahora < this.hablandoHasta + 4000 && enLibre && !this.cuadrupedo) this.rotDeseada = Math.atan2(this.mirarA.pos.x - this.pos.x, this.mirarA.pos.z - this.pos.z);
        if ((ahora < this.saludoHasta || (ahora < this.atenderHasta && enLibre)) && this.estado === 'actividad' && this.pose === 'parado') this.rotDeseada = PI / 4;
        if (this.estado === 'actividad' && this.anim === 'bailar') this.rotDeseada = rad(this.spot.r) + sin(t * 1.1 + this.fase) * 0.7;
        if (this.par && this.par.listo && this.estado === 'actividad') this.rotDeseada = Math.atan2(this.par.otro.pos.x - this.pos.x, this.par.otro.pos.z - this.pos.z);
        this.rot += angDif(this.rotDeseada, this.rot) * Math.min(1, dt * 8);
        const suelo = B.alturaEn(this.pos.x, this.pos.z);
        // sube rápido al pisar la vereda (si no, los pies se hunden en ella) y baja suave
        this.ySuelo += (suelo - this.ySuelo) * Math.min(1, dt * (suelo > this.ySuelo ? 30 : 10));
        if (this.cuadrupedo) this.animarCuadrupedo(dt, t, ahora);
        else this.animarHumano(dt, t, ahora);
        r.raiz.position.x = this.pos.x; r.raiz.position.z = this.pos.z;
        r.raiz.rotation.y = this.rot;
      }

      // ---- cara ----
      if (ahora > this.proxParpadeo) { this.parpadeoHasta = ahora + 130; this.proxParpadeo = ahora + 2200 + Math.random() * 4200; }
      const hablando = ahora < this.hablandoHasta;
      if (hablando && ahora > this.proxBoca) { this.boca = !this.boca; this.proxBoca = ahora + 90 + Math.random() * 110; }
      if (!hablando) this.boca = false;
      let emo = this.emocion;
      if (this.durmiendo) emo = this.anim === 'recargar' ? 'sereno' : 'dormido';
      const masticar = !hablando && this.estado === 'actividad' && (this.anim === 'comer' || this.anim === 'g_comer');
      PA.Caras.dibujar(r.cara, emo, this.boca, ahora < this.parpadeoHasta && !this.durmiendo, masticar);

      // ---- partículas ----
      const S = this.sis;
      if (this.durmiendo && this.anim !== 'recargar' && ahora > this.proxZ) { const p = this.sobreCabeza(); S.pZ.emitir(p.x + 0.1, p.y - 0.15, p.z, 0.05, 0.35, 0.05, 2.6); this.proxZ = ahora + 1300 + Math.random() * 600; }
      if (this.estado === 'actividad' && !this.oculto && (MUSICA.indexOf(this.act) >= 0 || MUSICA_EXTRA.indexOf(this.act) >= 0) && ahora > this.proxNota) { const p = this.sobreCabeza(); S.pNota.emitir(p.x + (Math.random() - 0.5) * 0.6, p.y - 0.3, p.z + (Math.random() - 0.5) * 0.6, 0, 0.5, 0, 2.2); this.proxNota = ahora + 700 + Math.random() * 600; }
      if (this.emocion === 'enamorado' && ahora > this.proxCorazon) { const p = this.sobreCabeza(); S.pCorazon.emitir(p.x, p.y - 0.2, p.z, 0, 0.4, 0, 2); this.proxCorazon = ahora + 900; }
    }

    animarMontado(dt, t) {
      const r = this.rig, D = r.dims, k = 1 - Math.exp(-dt * 12);
      const L = (o, ax, v) => { o.rotation[ax] += (v - o.rotation[ax]) * k; };
      const tumbo = sin(t * 9) * 0.02, bici = this.montura && this.montura.m.bici;
      if (bici) { const pd = sin(t * 7 + this.fase) * 0.55; L(r.piernaI, 'x', -1.05 + pd); L(r.piernaD, 'x', -1.05 - pd); L(r.piernaI, 'z', 0.05); L(r.piernaD, 'z', -0.05); }
      else { L(r.piernaI, 'x', -1.35); L(r.piernaD, 'x', -1.35); L(r.piernaI, 'z', 0.12); L(r.piernaD, 'z', -0.12); }
      L(r.brazoI, 'x', -1.25 + tumbo); L(r.brazoD, 'x', -1.25 - tumbo); L(r.brazoI, 'z', -0.12); L(r.brazoD, 'z', 0.12);
      L(r.torso, 'x', 0.28); L(r.torso, 'y', 0); L(r.torso, 'z', 0); L(r.cabeza, 'x', -0.18); L(r.cabeza, 'y', 0); L(r.cabeza, 'z', 0);
      L(r.cuerpo, 'x', 0); L(r.cuerpo, 'z', 0);
      r.cuerpo.position.y += ((bici ? this.montura.m.asiento : 0.78) - D.LEG - r.cuerpo.position.y) * k;
      r.cuerpo.position.z += ((bici ? -0.22 : -0.12) - r.cuerpo.position.z) * k;
      if (r.capa) L(r.capa, 'x', 0.5);
    }

    animarHumano(dt, t, ahora) {
      const r = this.rig, D = r.dims, f = this.fase;
      let pI = 0, pD = 0, pIz = 0, pDz = 0, bIx = 0, bDx = 0, bIz = 0.04, bDz = -0.04, tx = 0, ty = 0, tz = 0, hx = 0, hy = 0, hz = 0;
      let cy = 0, cz = 0, crx = 0, crz = 0, capa = 0.06, sq = 1;
      let y = this.ySuelo;
      const s = this.spot;
      if (this.estado === 'caminando') {
        const v = this.velActual / Math.max(0.5, this.vel);
        const fr = t * this.vel * 5.6 + f, sw = sin(fr);
        pI = sw * 0.62 * v; pD = -pI; bIx = -pI * 0.8; bDx = -pD * 0.8; bIz = 0.07; bDz = -0.07;
        cy = Math.abs(sw) * 0.05 * v; sq = 1 - Math.abs(sw) * 0.025 * v;
        ty = sw * 0.08 * v; hy = -sw * 0.06 * v; tx = 0.04 * v; tz = sin(fr * 0.5) * 0.02;
        capa = 0.3 + Math.abs(sw) * 0.12;
      } else if (this.estado === 'actividad' && s) {
        const pose = this.pose;
        if (pose === 'sentado' || pose === 'meditar') { y = s.y - D.LEG; pI = pD = -PI / 2; cz = -0.04; }
        else if (pose === 'acostado') { y = s.y; crx = -PI / 2; cz = D.alto / 2 - 0.08; cy = D.TD / 2 + 0.03; hz = 0.18; }
        else if (pose === 'agachado') { cy = -D.LEG * 0.42; pI = -1.25; pD = 0.35; tx = 0.32; }
        else if (pose === 'nadar') { y = s.y; crx = PI / 2; cz = -(D.alto / 2 - 0.08); cy = D.TD / 2 - 0.16; }
        else y = Math.max(y, s.y);
        if (pose === 'meditar') { pIz = 0.62; pDz = -0.62; }
        const a = this.par && this.par.listo ? this.par.anim : this.anim;
        switch (a) {
          case 'saludar': bDx = -2.9; bDz = -0.3 + sin(t * 12) * 0.35; break;
          case 'reir': bIx = bDx = -0.45; bIz = 0.3; bDz = -0.3; tx = -0.1 + sin(t * 11 + f) * 0.07; hx = -0.2; cy = Math.abs(sin(t * 11 + f)) * 0.04; break;
          case 'chocar': { const c = (t * 1.5) % 1.5; bDx = c < 0.7 ? -2.75 : -2.75 + Math.min(1, (c - 0.7) * 5) * 1.3; bDz = -0.1; tx = 0.1; cy = c > 0.68 && c < 0.85 ? 0.07 : 0; break; }
          case 'puno': { const c = (t * 1.3) % 1.3, k2 = c < 0.5 ? c / 0.5 : c < 0.75 ? 1 : 0; bDx = -0.6 - k2 * 1.0; tx = 0.06; break; }
          case 'manos': bDx = -1.25 + sin(t * 10) * 0.14; bDz = -0.05; hx = 0.1; break;
          case 'abrazar': bIx = bDx = -1.6; bIz = -0.55; bDz = 0.55; tx = 0.16; tz = sin(t * 2.2) * 0.07; hz = -0.15; break;
          case 'susurrar': bDx = -2.3; bDz = -0.5; tx = 0.2; hz = 0.16; break;
          case 'escuchar': bIz = 0.1; bDz = -0.1; hz = -0.14; hx = 0.08; break;
          case 'selfie': bDx = -2.55; bDz = 0.28; hy = -0.12; cy = Math.abs(sin(t * 2.4)) * 0.02; break;
          case 'posar': bDx = -2.75; bDz = -0.25; bIz = 0.62; bIx = -0.3; tz = 0.09; hz = -0.1; break;
          case 'dar': case 'recibir': { const k2 = Math.min(1, sin(t * 0.9) * 0.5 + 0.8); bIx = bDx = -1.45 * k2; bIz = -0.2; bDz = 0.2; tx = 0.1; break; }
          case 'consolar': bDx = -1.65; bDz = -0.3; bIz = 0.05; hx = 0.1; break;
          case 'llorar': bIx = bDx = -2.3; bIz = -0.5; bDz = 0.5; hx = 0.32; tx = 0.1 + sin(t * 7) * 0.03; break;
          case 'discutir': bIx = -0.95 + sin(t * 7 + f) * 0.75; bDx = -0.95 + sin(t * 7 + f + 2.1) * 0.75; bIz = 0.28; bDz = -0.28; tx = 0.12 + sin(t * 3.5 + f) * 0.06; hx = 0.05 + sin(t * 7) * 0.05; break;
          case 'duelo': { const c = (t * 1.2 + f) % 1.6; bDx = c < 0.6 ? -2.5 * (c / 0.6) : c < 0.85 ? -2.5 + (c - 0.6) / 0.25 * 2.2 : -0.5; bIx = -0.5; ty = sin(t * 3) * 0.3; pI = 0.25; pD = -0.25; break; }
          case 'ppt': { const c = t % 3; bDx = c < 1.8 ? -1.0 - Math.abs(sin(t * 5.2)) * 0.8 : -1.5; bIz = 0.5; bIx = -0.2; hx = 0.12; break; }
          case 'reverencia': { const k2 = max(0, sin(t * 1.1)); tx = 0.15 + k2 * 0.55; hx = k2 * 0.25; bIz = 0.05; bDz = -0.05; break; }
          case 'comer': case 'beber': { const k = a === 'comer' ? 2.3 : 1.4; const l = max(0, sin(t * k + f)); bDx = -0.85 - l * 1.05; bDz = -0.1 + l * 0.35; bIx = -0.45; hx = 0.08 - l * 0.08; break; }
          case 'cocinar': bDx = -1.1 + sin(t * 5 + f) * 0.15; bDz = sin(t * 5 + f + 1) * 0.18; bIx = -0.75; hx = 0.28; break;
          case 'teclear': bIx = -1.22 + sin(t * 17 + f) * 0.06; bDx = -1.22 + sin(t * 17 + f + 1.6) * 0.06; bIz = -0.12; bDz = 0.12; hx = 0.08 + sin(t * 0.3 + f) * 0.05; break;
          case 'escribir': bDx = -1.12 + sin(t * 6 + f) * 0.06; bDz = 0.12; bIx = -0.85; bIz = -0.15; hx = 0.32; break;
          case 'jugar': bIx = bDx = -1.05 + sin(t * 9 + f) * 0.04; bIz = -0.32; bDz = 0.32; cy += Math.pow(max(0, sin(t * 0.9 + f)), 12) * 0.12; tx = -0.05; break;
          case 'arcade': bIx = -1.15 + sin(t * 13 + f) * 0.07; bDx = -1.15 + sin(t * 15 + f) * 0.09; bIz = -0.15; bDz = 0.15; hx = -0.05; break;
          case 'pingpong': bDx = -0.9 + sin(t * 7 + f) * 0.6; bDz = 0.2 + sin(t * 7 + f) * 0.3; ty = sin(t * 3.5 + f) * 0.18; cy = Math.abs(sin(t * 7)) * 0.03; break;
          case 'ajedrez': { const c = (t + f) % 8; if (c < 5) { bDx = -2.05; bDz = 0.6; hx = 0.15; } else if (c < 6) { bDx = -1.0; bDz = 0.1; hx = 0.3; } else bDx = -0.4; bIx = -0.4; break; }
          case 'trono': bIx = bDx = -0.45; bIz = 0.22; bDz = -0.22; hx = -0.08; break;
          case 'guitarra': bDx = -0.7 + sin(t * 13 + f) * 0.22; bDz = 0.35; bIx = -0.95; bIz = 0.6; hx = sin(t * 6) * 0.08; tz = sin(t * 3) * 0.05; break;
          case 'bateria': bIx = -1.0 + sin(t * 11 + f) * 0.42; bDx = -1.0 + sin(t * 11 + f + PI) * 0.42; bIz = -0.18; bDz = 0.18; hx = sin(t * 5.5) * 0.1; break;
          case 'piano': bIx = -1.1 + sin(t * 9 + f) * 0.08; bDx = -1.1 + sin(t * 9 + f + 2) * 0.08; ty = sin(t * 1.5) * 0.1; hx = 0.15; break;
          case 'cantar': bDx = -2.1; bDz = 0.42; bIx = -0.6 + sin(t * 2 + f) * 0.5; bIz = 0.3 + sin(t * 2) * 0.2; ty = sin(t * 2.4) * 0.15; cy = Math.abs(sin(t * 4.8)) * 0.03; break;
          case 'aplaudir': bIx = -2.6 + sin(t * 6 + f) * 0.25; bDx = -2.6 + sin(t * 6 + f + 1) * 0.25; bIz = -sin(t * 3) * 0.3; bDz = sin(t * 3) * 0.3; cy = Math.abs(sin(t * 5 + f)) * 0.1; sq = 1 - Math.abs(sin(t * 5 + f)) * 0.03; break;
          case 'bailar':
            if (this.estiloBaile === 0) { bIx = -2.4 + sin(t * 8 + f) * 0.5; bDx = -2.4 - sin(t * 8 + f) * 0.5; cy = Math.abs(sin(t * 8)) * 0.08; ty = sin(t * 4) * 0.3; sq = 1 - Math.abs(sin(t * 8)) * 0.04; }
            else if (this.estiloBaile === 1) { tz = sin(t * 4) * 0.12; pI = sin(t * 8) * 0.4; pD = -pI; bIx = -0.5 + sin(t * 8) * 0.6; bDx = -0.5 - sin(t * 8) * 0.6; bIz = 0.4; bDz = -0.4; cy = Math.abs(sin(t * 8)) * 0.05; }
            else { const arr = sin(t * 3 + f) > 0; bDx = arr ? -2.7 : -0.4; bDz = arr ? -0.3 : 0.2; bIx = arr ? -0.2 : -2.0; tz = sin(t * 6) * 0.15; cy = Math.abs(sin(t * 6)) * 0.05; }
            break;
          case 'sentado': bIx = bDx = -0.35; hy = sin(t * 0.5 + f) * 0.4; break;
          case 'contemplar': bIx = bDx = 0.32; bIz = -0.08; bDz = 0.08; hx = 0.22; hy = sin(t * 0.4 + f) * 0.25; break;
          case 'mirar': {
            hy = sin(t * 0.7 + f) * 0.6;
            const c = (t * 0.13 + f) % 6;
            if (c < 0.8) { const k = sin(c / 0.8 * PI); bIx = bDx = -2.9 * k; bIz = 0.2 * k; bDz = -0.2 * k; hx = -0.2 * k; }
            else if (c > 3.5 && c < 4.6) { bIz = 0.35; bDz = -0.35; bIx = bDx = 0.3; }
            break;
          }
          case 'revisar': bDx = -1.5 + sin(t * 2 + f) * 0.15; bDz = 0.1; bIx = -0.2; hx = -0.15; break;
          case 'gesticular': bIx = -0.55 + sin(t * 2.3 + f) * 0.35; bDx = -0.55 + sin(t * 2.9 + f) * 0.35; bIz = 0.18; bDz = -0.18; break;
          case 'pensar': bDx = -2.1; bDz = 0.6; bIx = -1.0; bIz = -0.6; if (sin(t * 0.45 + f) > 0.85) { bIx = -1.9; bIz = 0.05; } break;
          case 'leer': bIx = bDx = -1.15; bIz = -0.25; bDz = 0.25; hx = 0.35; break;
          case 'boxeo': { const p1 = Math.pow(max(0, sin(t * 7 + f)), 3), p2 = Math.pow(max(0, sin(t * 7 + f + PI)), 3); bIx = -1.2 - p1 * 0.5; bDx = -1.2 - p2 * 0.5; bIz = -0.3; bDz = 0.3; ty = sin(t * 7 + f) * 0.15; cy = Math.abs(sin(t * 3.5)) * 0.03; break; }
          case 'pesas': bIx = -0.3 - max(0, sin(t * 2.4 + f)) * 1.6; bDx = -0.3 - max(0, sin(t * 2.4 + f + PI)) * 1.6; break;
          case 'correr': { const fr = t * 13; pI = sin(fr) * 0.85; pD = -pI; bIx = -pI * 0.9 - 0.3; bDx = -pD * 0.9 - 0.3; cy = Math.abs(sin(fr)) * 0.07; tx = 0.1; break; }
          case 'arco': { const c = (t + f) % 3, k = c < 1.6 ? c / 1.6 : c < 1.9 ? 1 : max(0, 1 - (c - 1.9) * 3); bIx = -1.57; bIz = 0; bDx = -1.5; bDz = 0.1 + k * 0.65; ty = 0.5; hy = -0.4; break; }
          case 'espada': { const c = (t + f) % 1.8; bDx = c < 0.6 ? -2.6 * (c / 0.6) : c < 0.85 ? -2.6 + (c - 0.6) / 0.25 * 2.3 : -0.3 - (c - 0.85) * 0.4; bIx = -0.6; ty = sin(t * 3.5) * 0.25; break; }
          case 'hachazo': { const c = (t + f) % 2, k = c < 1.2 ? c / 1.2 : c < 1.45 ? 1 - (c - 1.2) / 0.25 : 0; bIx = bDx = -0.7 - k * 2.1; bIz = -0.25; bDz = 0.25; tx = c > 1.2 && c < 1.7 ? 0.25 : 0; break; }
          case 'meditar': bIx = bDx = -0.5; bIz = 0.45; bDz = -0.45; if (this.levita) cy = 0.14 + sin(t * 1.2 + f) * 0.05; break;
          case 'pescar': { const tir = ((t + f) % 9) < 0.5; bIx = bDx = tir ? -1.45 : -0.9 + sin(t * 0.8 + f) * 0.05; bIz = -0.25; bDz = 0.25; break; }
          case 'relax': bIx = bDx = -2.85; bIz = 0.35; bDz = -0.35; if (this.act === 'hamaca') crz = sin(t * 1.1 + f) * 0.1; break;
          case 'dormir': bIz = 0.08; bDz = -0.08; break;
          case 'siesta': bIx = bDx = -0.25; hx = 0.45; hz = 0.15; break;
          case 'recargar': bIz = 0.18; bDz = -0.18; cy = 0.06 + sin(t * 1.5 + f) * 0.03; break;
          case 'regar': bDx = -0.9; bDz = 0.1; break;
          case 'binoculares': bIx = bDx = -2.3; bIz = -0.35; bDz = 0.35; hy = sin(t * 0.35 + f) * 0.5; hx = -0.1; break;
          case 'fogata': bIx = bDx = -1.1 + sin(t * 0.8 + f) * 0.1; bIz = -0.2; bDz = 0.2; break;
          case 'calentarse': bIx = bDx = -1.0 + sin(t * 0.9 + f) * 0.1; bIz = -0.2; bDz = 0.2; break;
          case 'reparar': bDx = -1.1 + sin(t * 7 + f) * 0.25; bIx = -0.7; tx = 0.42; hx = 0.3; break;
          case 'vigilar': bIz = 0.5; bDz = -0.5; bIx = bDx = 0.25; hy = sin(t * 0.5 + f) * 0.7; if (sin(t * 0.3 + f) > 0.8) { bDx = -2.6; bDz = 0.6; } break;
          case 'futbol': {
            const fr = t * 9 + f, pat = ((t + f) % 4) < 0.35;
            pI = sin(fr) * 0.6; pD = -pI; bIx = -pI * 0.7 - 0.2; bDx = -pD * 0.7 - 0.2; cy = Math.abs(sin(fr)) * 0.05; tx = 0.12;
            if (pat) { pD = -1.35; pI = 0.35; bIx = -0.9; bDx = 0.5; tx = -0.1; }
            ty = sin(t * 0.7 + f) * 0.4;
            break;
          }
          case 'basquet': {
            const c = (t + f) % 3;
            if (c < 2.2) { bDx = -0.7 - Math.abs(sin(t * 7 + f)) * 0.5; bIx = -0.5; bIz = 0.3; cy = Math.abs(sin(t * 3.5)) * 0.03; pI = sin(t * 7) * 0.2; pD = -pI; tx = 0.15; }
            else { const k2 = sin((c - 2.2) / 0.8 * PI); bIx = bDx = -2.9 * k2 - 0.2; bIz = 0.1; bDz = -0.1; cy = k2 * 0.35; pI = pD = -0.3 * k2; }
            break;
          }
          case 'columpio': { const ph = sin(t * 2.2 + f); cz = ph * 0.35; cy = (1 - Math.cos(ph * 0.8)) * 0.25; pI = pD = -PI / 2 + ph * 0.6; bIx = bDx = -2.7; bIz = 0.12; bDz = -0.12; break; }
          case 'lanzar': { const c = (t + f) % 2.4, k2 = c < 0.5 ? c / 0.5 : c < 0.7 ? 1 - (c - 0.5) / 0.2 * 2 : 0; bDx = -0.4 - k2 * 2.4; bDz = 0.1; bIx = -0.3; tx = c > 0.5 && c < 0.8 ? 0.2 : 0; hy = sin(t * 0.8 + f) * 0.5; if (c > 1.2) { pI = sin(t * 9) * 0.1; } break; }
          case 'surf': pI = 0.38; pD = -0.38; tx = 0.18; bIz = 1.15 + sin(t * 1.7 + f) * 0.2; bDz = -1.15 + sin(t * 1.9 + f) * 0.2; crz = sin(t * 1.3 + f) * 0.12; cy = -0.07 + sin(t * 2.1 + f) * 0.04; hy = 0.4; y += sin(t * 1.1 + f) * 0.05; break;
          case 'nadar': { const fr = t * 3.5 + f; bIx = -1.6 + sin(fr) * 1.5; bDx = -1.6 + sin(fr + PI) * 1.5; bIz = 0.2; bDz = -0.2; pI = sin(t * 9 + f) * 0.3; pD = -pI; hy = sin(fr * 0.5) * 0.45; crz = sin(fr) * 0.12; break; }
        }
        if (this.mirarA && ahora < this.hablandoHasta + 4000 && pose !== 'acostado') {
          const lim = (LIBRES.indexOf(this.act) >= 0 || this.anim === 'mirar') ? 0.3 : 1.0;
          const ang = angDif(Math.atan2(this.mirarA.pos.x - this.pos.x, this.mirarA.pos.z - this.pos.z), this.rot);
          hy = Math.max(-lim, Math.min(lim, ang));
        }
        if (this.emocion === 'riendo' || this.emocion === 'emocionado') { cy += Math.abs(sin(t * 7 + f)) * 0.025; }
        if (this.emocion === 'enojado' && pose === 'parado') { hy += sin(t * 9) * 0.05; }
      }
      if (ahora < this.hablandoHasta && this.pose !== 'acostado') {
        hx += sin(t * 5 + f) * 0.04; hy += sin(t * 1.7 + f) * 0.08;
        if (this.estado === 'actividad' && (this.anim === 'mirar' || this.anim === 'contemplar' || this.anim === 'sentado' || this.anim === 'fogata' || this.anim === 'calentarse')) { bDx = -0.6 + sin(t * 3 + f) * 0.35; bDz = -0.15; }
      }
      if (ahora < this.saludoHasta && this.pose !== 'acostado') { bDx = -2.9; bDz = -0.3 + sin(t * 12) * 0.35; }
      // con paraguas, el brazo derecho lo sostiene quieto (saluda con el izquierdo)
      if (this.conParaguas) {
        if (ahora < this.saludoHasta) { bIx = -2.9; bIz = 0.3 - sin(t * 12) * 0.35; }
        bDx = BRAZO_PARAGUAS; bDz = 0;
      }
      const k = 1 - Math.exp(-dt * 16), kp = 1 - Math.exp(-dt * 9);
      const L = (o, ax, v, kk) => { o.rotation[ax] += (v - o.rotation[ax]) * (kk || k); };
      L(r.piernaI, 'x', pI); L(r.piernaD, 'x', pD); L(r.piernaI, 'z', pIz); L(r.piernaD, 'z', pDz);
      L(r.brazoI, 'x', bIx); L(r.brazoD, 'x', bDx); L(r.brazoI, 'z', bIz); L(r.brazoD, 'z', bDz);
      L(r.torso, 'x', tx); L(r.torso, 'y', ty); L(r.torso, 'z', tz);
      L(r.cabeza, 'x', hx); L(r.cabeza, 'y', hy); L(r.cabeza, 'z', hz);
      L(r.cuerpo, 'x', crx, kp); L(r.cuerpo, 'z', crz, kp);
      r.cuerpo.position.y += (cy - r.cuerpo.position.y) * kp;
      r.cuerpo.position.z += (cz - r.cuerpo.position.z) * kp;
      r.cuerpo.scale.y += (sq - r.cuerpo.scale.y) * k;
      r.raiz.position.y += (y - r.raiz.position.y) * kp;
      if (r.capa) L(r.capa, 'x', capa);
      r.torso.scale.y = 1 + sin(t * 2 + f) * 0.012;
    }

    animarCuadrupedo(dt, t, ahora) {
      const r = this.rig, D = r.dims, f = this.fase, gato = r.tipo === 'gato';
      let pata = [0, 0, 0, 0], crx = 0, cy = D.PL, cuello = 0, cuelloY = 0, colaY = sin(t * 1.4 + f) * 0.4, colaX = 0, oculto = false;
      let y = this.ySuelo;
      if (this.estado === 'caminando') {
        const v = this.velActual / Math.max(0.5, this.vel);
        const fr = t * this.vel * (gato ? 7 : 5.5) + f, a = sin(fr) * 0.6 * v;
        pata = [a, -a, -a, a]; cy += Math.abs(sin(fr)) * 0.025 * v; cuello = sin(fr * 2) * 0.04; colaY = sin(fr * 0.5) * 0.3; colaX = gato ? -0.35 : 0;
      } else if (this.estado === 'actividad' && this.spot) {
        const pose = this.pose, s = this.spot;
        y = Math.max(y, s.y);
        if (pose === 'acostado' || this.anim === 'dormir') { cy = 0.1 * (D.esc || 1); oculto = true; cuello = gato ? 0.55 : 0.3; cuelloY = gato ? 0.7 : 0.2; colaY = 1.3; }
        else if (pose === 'sentado' || this.anim === 'g_sentado') {
          if (gato) { crx = -0.55; cy = D.PL - 0.02; pata = [0.55, 0.55, -0.9, -0.9]; cuello = -0.35; cuelloY = sin(t * 0.6 + f) * 0.6; colaX = 0.5; }
          else { cy = 0.24 * (D.esc || 1); oculto = true; cuello = -0.1; }
        }
        if (this.anim === 'g_comer' || (this.anim === 'comer' && !gato)) { cuello = 0.75 + sin(t * 6) * 0.08; }
        if (this.anim === 'g_jugar') { crx = sin(t * 6 + f) * 0.25; pata[0] = pata[1] = -Math.abs(sin(t * 6)) * 0.8; colaX = -0.6; }
        if (!gato && this.anim === 'regar') cuello = 0.8 + sin(t * 3) * 0.1;
        if (gato && this.anim === 'mirar' && ((t * 0.1 + f) % 5) < 1.2) { cuello = 0.6; cuelloY = 0.9; }
        if (this.mirarA && ahora < this.hablandoHasta + 4000) cuelloY = Math.max(-0.8, Math.min(0.8, angDif(Math.atan2(this.mirarA.pos.x - this.pos.x, this.mirarA.pos.z - this.pos.z), this.rot)));
      }
      if (ahora < this.hablandoHasta) cuello += sin(t * 7) * 0.05;
      const k = 1 - Math.exp(-dt * 12);
      r.patas.forEach((p, i) => { p.rotation.x += (pata[i] - p.rotation.x) * k; p.visible = !oculto; });
      r.cuerpo.rotation.x += (crx - r.cuerpo.rotation.x) * k;
      r.cuerpo.position.y += (cy - r.cuerpo.position.y) * k;
      r.cuello.rotation.x += (cuello - r.cuello.rotation.x) * k;
      r.cuello.rotation.y += (cuelloY - r.cuello.rotation.y) * k;
      r.cola.rotation.y += (colaY - r.cola.rotation.y) * k;
      r.cola.rotation.x += (colaX - r.cola.rotation.x) * k;
      r.raiz.position.y += (y - r.raiz.position.y) * k;
    }
  }

  // ---------------- mascotas ----------------
  class Mascota {
    constructor(sis, m) {
      this.sis = sis; this.m = m;
      this.rig = PA.Modelos.crearMascota(m);
      sis.escena.add(this.rig.raiz);
      this.pos = new V3(9, 6, 8); this.ang = Math.random() * 6; this.rot = 0;
      this.objetivo = new V3();
      const roca = sis.props && sis.props.find((p) => p.t === 'roca_dragon');
      this.percha = roca ? new V3(roca.x, 1.62, roca.z) : new V3(14.6, 1.62, 5.4);
      const f = sis.zonas && sis.zonas.find((z) => z.id === 'fortaleza');
      this.centroFort = f ? new V3((f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2) : new V3(12, 0, 12);
    }
    actualizar(dt, t) {
      const due = this.sis.porId[this.m.dueno];
      const o = this.objetivo;
      let posado = false;
      if (this.m.tipo === 'aguila') {
        if (!due || due.durmiendo) { posado = true; o.set((due ? due.pos.x : 36) + 0.7, (due ? due.ySuelo : 0) + 0.12, (due ? due.pos.z : 36) + 0.6); }
        else { this.ang += dt * 0.9; o.set(due.pos.x + Math.cos(this.ang) * 1.6, due.rig.raiz.position.y + 2.5 + sin(t * 1.3) * 0.25, due.pos.z + Math.sin(this.ang) * 1.6); }
      } else {
        const zonaDue = due && due.spot ? due.spot.zona : null;
        if (!due || (due.durmiendo && this.sis.noche > 0.5)) { posado = true; o.copy(this.percha); }
        else if (zonaDue === 'fortaleza') { this.ang += dt * 0.45; o.set(due.pos.x + Math.cos(this.ang) * 4, 4.6 + sin(t * 0.8) * 0.4, due.pos.z + Math.sin(this.ang) * 4); }
        else { this.ang += dt * 0.22; o.set(this.centroFort.x + Math.cos(this.ang) * 11, 8 + sin(t * 0.6) * 0.8, this.centroFort.z + Math.sin(this.ang) * 11); }
      }
      const prev = this.pos.clone();
      this.pos.lerp(o, 1 - Math.exp(-dt * (posado ? 2 : 1.6)));
      const v = this.pos.clone().sub(prev);
      if (v.lengthSq() > 1e-6 && !posado) this.rot += angDif(Math.atan2(v.x, v.z), this.rot) * Math.min(1, dt * 4);
      if (posado && this.pos.distanceTo(o) < 0.3) this.rot += angDif(PI / 4, this.rot) * Math.min(1, dt * 2);
      const R = this.rig;
      R.raiz.position.copy(this.pos); R.raiz.rotation.y = this.rot;
      const vuela = !(posado && this.pos.distanceTo(o) < 0.4);
      const fr = this.m.tipo === 'aguila' ? 11 : 4.5, amp = this.m.tipo === 'aguila' ? 0.75 : 0.6;
      const a = sin(t * fr) * amp;
      if (vuela) { R.alaI.rotation.z = a; R.alaD.rotation.z = -a; } else { R.alaI.rotation.z = 1.2; R.alaD.rotation.z = -1.2; }
      R.cuerpo.rotation.x = vuela ? -0.05 + sin(t * fr) * 0.04 : 0;
      if (R.cola) R.cola.rotation.y = sin(t * 1.5) * 0.3;
    }
  }

  // El perro de un vecino: sigue el rastro de su dueño, lo espera en su casita mientras está adentro
  // y juega a su alrededor cuando el dueño juega con él.
  class Perro {
    constructor(sis, m) {
      this.sis = sis; this.m = m;
      this.r = PA.Animales.modelo('perro', 0);
      this.g = this.r.g; sis.escena.add(this.g);
      const casa = sis.props && sis.props.find((p) => p.t === 'caseta_perro');
      this.casita = casa ? new V3(casa.x + Math.sin(rad(casa.r || 0)) * 0.9, 0, casa.z + Math.cos(rad(casa.r || 0)) * 0.9) : new V3(20, 0, 150);
      this.pos = this.casita.clone(); this.rot = 0; this.rastro = []; this.ang = 0; this.vel = 0;
    }
    actualizar(dt, t) {
      const due = this.sis.porId[this.m.dueno];
      const o = new V3();
      let quieto = false;
      if (!due || (due.oculto && !due.montura) || due.durmiendo) { o.copy(this.casita); this.rastro.length = 0; }
      else if (due.estado === 'actividad' && due.act === 'jugar_perro') { this.ang += dt * 2.2; o.set(due.pos.x + Math.sin(this.ang) * 1.3, 0, due.pos.z + 1.1 + Math.cos(this.ang) * 0.9); }
      else {
        // rastro del dueño: un punto cada 0.4; el perro va 1.2 detrás
        const ult = this.rastro[this.rastro.length - 1];
        if (!ult || Math.hypot(ult.x - due.pos.x, ult.z - due.pos.z) > 0.4) this.rastro.push({ x: due.pos.x, z: due.pos.z });
        if (this.rastro.length > 400) this.rastro.splice(0, 200);
        if (ult && Math.hypot(ult.x - due.pos.x, ult.z - due.pos.z) > 8) { this.rastro = [{ x: due.pos.x, z: due.pos.z }]; this.pos.set(due.pos.x - 1, 0, due.pos.z - 1); }
        while (this.rastro.length > 1 && Math.hypot(this.rastro[0].x - this.pos.x, this.rastro[0].z - this.pos.z) < 0.3) this.rastro.shift();
        const lejos = Math.hypot(due.pos.x - this.pos.x, due.pos.z - this.pos.z);
        if (lejos < 1.3) { quieto = true; o.copy(this.pos); }
        else o.set(this.rastro[0].x, 0, this.rastro[0].z);
      }
      const dx = o.x - this.pos.x, dz = o.z - this.pos.z, d = Math.hypot(dx, dz);
      const lejosDue = due ? Math.hypot(due.pos.x - this.pos.x, due.pos.z - this.pos.z) : 0;
      const vMax = lejosDue > 4 ? 4.6 : 2.0;
      this.vel += ((d > 0.15 && !quieto ? vMax : 0) - this.vel) * Math.min(1, dt * 5);
      if (d > 0.05) { const paso = Math.min(d, this.vel * dt); this.pos.x += dx / d * paso; this.pos.z += dz / d * paso; this.rot += angDif(Math.atan2(dx, dz), this.rot) * Math.min(1, dt * 6); }
      else if (due && quieto) this.rot += angDif(Math.atan2(due.pos.x - this.pos.x, due.pos.z - this.pos.z), this.rot) * Math.min(1, dt * 3);
      const mov = this.vel > 0.3, f = t * (this.vel > 3 ? 14 : 9);
      this.g.position.set(this.pos.x, this.sis.ySuelo ? this.sis.ySuelo(this.pos.x, this.pos.z) : 0, this.pos.z);
      if (due && due.act === 'jugar_perro' && due.estado === 'actividad') this.g.position.y += Math.abs(sin(t * 6)) * 0.18;
      this.g.rotation.y = this.rot;
      this.r.patas.forEach((p, i) => { p.rotation.x = mov ? sin(f + (i % 2 ? PI : 0) + (i > 1 ? PI / 2 : 0)) * 0.7 : 0; });
      if (this.r.cola) this.r.cola.rotation.y = sin(t * 14) * 0.5;
      if (this.r.cabeza) this.r.cabeza.rotation.x = mov ? sin(f * 2) * 0.05 : sin(t * 0.9) * 0.12;
    }
  }

  // ---------------- sombras de contacto (una sola malla instanciada) ----------------
  function crearSombras(escena, n) {
    const c = PA.Geo.lienzo(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.8 }), n);
    im.frustumCulled = false;
    im.renderOrder = 2;
    escena.add(im);
    return im;
  }

  // ---------------- sistema ----------------
  function crear(escena, DP, DM, grid) {
    const sis = { escena, spots: {}, porId: {}, lista: [], mascotas: [], noche: 0, vehiculos: [], props: DM.props, zonas: DM.zonas };
    for (const s of DM.spots) sis.spots[s.id] = s;
    sis.buscador = crearBuscador(grid);
    sis.ySuelo = sis.buscador.alturaEn;
    sis.pZ = new Particulas(escena, texGlifo('Z', '#e8f0ff'), 160, 0.32);
    sis.pNota = new Particulas(escena, texGlifo('♪', '#ffe066', '"Segoe UI Symbol", sans-serif'), 120, 0.36);
    sis.pCorazon = new Particulas(escena, texGlifo('♥', '#ff5a7a', '"Segoe UI Symbol", sans-serif'), 60, 0.34);
    sis.pChispa = new Particulas(escena, texGlifo('•', '#ffb03a'), 80, 0.16);
    sis.pLuciernaga = new Particulas(escena, texGlifo('•', '#d8ff7a'), 90, 0.14);
    for (const d of DP.personajes) { const a = new Actor(sis, d); sis.lista.push(a); sis.porId[d.id] = a; }
    // Rendimiento: solo las dos piezas más grandes de cada personaje proyectan sombra (la mancha de contacto hace el resto)
    for (const a of sis.lista) {
      const piezas = [];
      a.rig.raiz.traverse((o) => { if (o.isMesh && o.castShadow) { o.geometry.computeBoundingSphere(); piezas.push(o); } });
      piezas.sort((x, y) => y.geometry.boundingSphere.radius - x.geometry.boundingSphere.radius);
      piezas.forEach((o, k) => { o.castShadow = k < 2; });
    }
    for (const m of DP.mascotas || []) sis.mascotas.push(m.tipo === 'perro' ? new Perro(sis, m) : new Mascota(sis, m));
    sis.hits = sis.lista.map((a) => a.rig.hit);
    function limitarSombras(a) {
      const piezas = [];
      a.rig.raiz.traverse((o) => { if (o.isMesh && o.castShadow) { o.geometry.computeBoundingSphere(); piezas.push(o); } });
      piezas.sort((x, y) => y.geometry.boundingSphere.radius - x.geometry.boundingSphere.radius);
      piezas.forEach((o, k) => { o.castShadow = k < 2; });
    }
    function quitarActor(a) {
      if (a.montura) a.montura.bajar();
      sis.escena.remove(a.rig.raiz);
      a.rig.raiz.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      if (a.rig.cara) a.rig.cara.tex.dispose();
      sis.lista.splice(sis.lista.indexOf(a), 1);
      delete sis.porId[a.id];
      for (const o of sis.lista) if (o.mirarA === a) o.mirarA = null;
      if (sis.encima === a) sis.encima = null;
    }
    // El editor agregó, cambió o quitó personajes: se rehace solo el modelo de los que cambiaron, en el mismo lugar
    sis.sincronizar = function (lista) {
      const hay = {}, cambiados = [];
      for (const d of lista) hay[d.id] = d;
      for (const a of sis.lista.slice()) if (!hay[a.id]) { cambiados.push(a.id); quitarActor(a); }
      for (const d of lista) {
        const a = sis.porId[d.id];
        if (a && (a.d === d || JSON.stringify(a.d) === JSON.stringify(d))) continue;
        let spot = null, act = null, pos = null;
        if (a) { spot = a.spot; act = a.act; pos = a.pos.clone(); cambiados.push(a.id); quitarActor(a); }
        const n = new Actor(sis, d);
        sis.lista.push(n); sis.porId[d.id] = n;
        limitarSombras(n);
        if (pos) n.pos.copy(pos);
        if (spot) n.ordenar(spot.id, act, true);
      }
      sis.hits = sis.lista.map((a) => a.rig.hit);
      return cambiados;
    };
    const capacidad = sis.lista.length + 28 + 80;   // deja lugar para los que se creen con el editor
    const sombras = crearSombras(escena, capacidad);
    const fogata = DM.props.find((p) => p.t === 'fogata');
    const jardin = DM.zonas.find((z) => z.id === 'jardin'), camp = DM.zonas.find((z) => z.id === 'campamento'), bosque = DM.zonas.find((z) => z.id === 'bosque');
    const zonaPorId = {}; for (const z of DM.zonas) zonaPorId[z.id] = z;
    sis.alAireLibre = (s) => { const z = zonaPorId[s.zona]; return !z || !!z.abierta || !!z.virtual; };
    sis.lluvia = false;

    const anillo = (color, ri, re, op) => { const m = new THREE.Mesh(new THREE.RingGeometry(ri, re, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -PI / 2; m.visible = false; escena.add(m); return m; };
    const aSel = anillo(0xffffff, 0.48, 0.66, 0.9), aHover = anillo(0xffffff, 0.5, 0.6, 0.5);
    sis.seleccionado = null; sis.encima = null;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new V3(), P3 = new V3();

    sis.actualizar = function (dt, t, ahora, noche, escalaPx) {
      sis.noche = noche;
      for (const a of sis.lista) {
        try { a.actualizar(dt, t, ahora); }
        catch (e) { if (!a.fallo) { a.fallo = true; console.error('vecino', a.id, a.par ? a.par.anim : a.anim, e); } }
      }
      for (const m of sis.mascotas) m.actualizar(dt, t);
      if (fogata && noche > 0.4 && Math.random() < dt * 6) sis.pChispa.emitir(fogata.x + (Math.random() - 0.5) * 0.5, 0.7, fogata.z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2, 0.9, (Math.random() - 0.5) * 0.2, 1.6);
      if (noche > 0.5 && Math.random() < dt * 8) {
        const r = Math.random(), z = r < 0.3 ? jardin : r < 0.55 ? camp : bosque;
        if (z) sis.pLuciernaga.emitir(z.x0 + Math.random() * (z.x1 - z.x0), 0.4 + Math.random() * 1.2, z.z0 + Math.random() * (z.z1 - z.z0), (Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3, 4);
      }
      for (const p of [sis.pZ, sis.pNota, sis.pCorazon, sis.pChispa, sis.pLuciernaga]) p.actualizar(dt, escalaPx);
      // sombras de contacto
      let k = 0;
      for (const a of sis.lista) {
        if (a.oculto || (a.pose === 'nadar' && a.estado === 'actividad')) continue;
        const ancho = a.cuadrupedo ? (a.rig.tipo === 'llama' ? 1.2 : 0.8) : 0.55 + (a.rig.dims.TW || 0.5) * 0.6;
        const acostado = a.pose === 'acostado' && a.estado === 'actividad';
        S3.set(acostado ? ancho * 1.1 : ancho, 1, acostado ? 1.8 : ancho);
        P3.set(a.pos.x, a.ySuelo + (a.montura ? 0 : (a.estado === 'actividad' && a.spot ? Math.max(0, a.spot.y - (a.pose === 'sentado' ? 0.45 : 0)) : 0)) + 0.012 + k * 0.0003, a.pos.z);
        Q.setFromAxisAngle(new V3(0, 1, 0), a.rot);
        M.compose(P3, Q, S3); sombras.setMatrixAt(k++, M);
      }
      for (const v of sis.vehiculos) { if (k >= capacidad) break; if (v.oculto) continue; S3.set(1.5, 1, v.m.largo + 0.4); P3.set(v.pos.x, 0.015 + k * 0.0003, v.pos.z); Q.setFromAxisAngle(new V3(0, 1, 0), v.m.g.rotation.y); M.compose(P3, Q, S3); sombras.setMatrixAt(k++, M); }
      sombras.count = k;
      sombras.instanceMatrix.needsUpdate = true;
      for (const [ring, a] of [[aSel, sis.seleccionado], [aHover, sis.encima !== sis.seleccionado ? sis.encima : null]]) {
        ring.visible = !!a && !a.oculto;
        if (a) { ring.position.set(a.pos.x, a.rig.raiz.position.y + 0.03 + (a.pose === 'sentado' ? a.rig.dims.LEG || 0 : 0), a.pos.z); ring.material.color.set((DP.SERIES[a.d.grupo] || {}).color || '#ffffff'); ring.rotation.z = t * 0.6; }
      }
    };
    // Ubicar a un vecino: una columna de luz encima de él durante unos segundos
    const faro = new THREE.Group();
    const colFaro = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 26, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    colFaro.position.y = 13; faro.add(colFaro);
    const flecha = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false })); flecha.rotation.x = PI; faro.add(flecha);
    faro.visible = false; escena.add(faro);
    let faroA = null, faroHasta = 0, posFaro = null;
    sis.marcar = function (a, x, z) { faroA = a; posFaro = a ? null : [x, z]; faroHasta = performance.now() + 9000; };
    sis.actualizarFaro = function (t, ahora) {
      faro.visible = ahora < faroHasta;
      if (!faro.visible) return;
      if (faroA && !sis.porId[faroA.id]) { faroHasta = 0; return; }
      const x = posFaro ? posFaro[0] : faroA.pos.x, z = posFaro ? posFaro[1] : faroA.pos.z, s = 1 + PA.Escena.zoomInverso() * 0.8;
      faro.position.set(x, 0, z); faro.scale.set(s, 1, s);
      flecha.position.y = (posFaro || faroA.oculto ? 3.4 : faroA.rig.dims.alto + 1.2) + sin(t * 5) * 0.2;
      flecha.rotation.y = t * 2;
      colFaro.material.opacity = 0.16 + sin(t * 4) * 0.06;
    };
    sis.actorDe = (obj) => { const a = obj && obj.userData.actor; return a && !a.oculto ? a : null; };
    return sis;
  }

  return { crear, ANIM };
})();
