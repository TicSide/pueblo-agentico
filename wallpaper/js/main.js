/* Pueblo Agéntico — programa principal del wallpaper.
 * Modo "cerebro": obedece al cerebro local por WebSocket (IA con Ollama).
 * Modo "local": si no hay cerebro, la misma simulación corre aquí con frases pregrabadas. */
(function () {
  'use strict';
  const DP = window.DATOS_PERSONAJES, DM = window.DATOS_MUNDO;
  const cfg = { zoom: 1, camara: 'mapa', ciclo: 'real', nombres: false, registro: true, estado: true, sombras: true, luces: true, calidad: 1, puerto: 8787, fps: 30 };
  // clima: 'auto' o uno fijo; estación: 'auto' o una fija; eventos: 'auto', 'no' o uno forzado
  const opcClima = { clima: 'auto', estacion: 'auto', hemisferio: 'norte', eventos: 'auto', evento: null };
  let cal = null, eventosVistos = [];
  let pausado = false, listo = false, pendientes = [], ultimoMensajeProp = null, primeraProp = true, tMensaje = 0, ultimoEnviado = null;
  let mundo, fondo, trafico, animales, climaFx, sis, sim = null, modo = 'arranque', ia = { estado: 'offline', modelo: '', activa: true };
  let seleccionado = null, cache = {}, ultimaCharla = null, ultimaCharlaT = 0, ultimaInteraccionUsuario = 0;
  const app = {};

  // ---------------- ajustes de la interfaz (panel de ajustes y propiedades de Wallpaper Engine) ----------------
  const AJ_DEF = { idioma: 'auto', tema: 'madera', acento: '', escala: 100, opacidad: 100, pos_estado: 'ar-der', pos_diario: 'ab-der', pos_mapa: 'ab-izq', pos_botones: 'ab-der',
    lineas: 7, h12: false, avisos: true, globos: 'todos', max_globos: 8, escala_globos: 100, nombres: false, trafico: 100, particulas: 100, animales: true };
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: no se recuerda */ } };
  const aj = Object.assign({}, AJ_DEF, leer('pueblo-ajustes') || {});
  const vistosWE = leer('pueblo-we') || {};
  function aplicarAjustes() {
    cfg.nombres = !!aj.nombres;
    PA.UI.configurar(aj);
    if (trafico) trafico.densidad(aj.trafico / 100);
    if (climaFx) climaFx.setIntensidad(aj.particulas / 100);
    if (animales) animales.visible(!!aj.animales);
    if (sis) PA.UI.nombres(cfg.nombres, sis.lista, sis.encima, seleccionado);
  }
  function ajustar(k, v) {
    if (!(k in AJ_DEF)) return;
    const cambio = aj[k] !== v;
    aj[k] = v;
    guardar('pueblo-ajustes', aj);
    // otro idioma: los datos y los letreros se arman al cargar
    if (k === 'idioma') { if (cambio && listo) location.reload(); return; }
    if (listo) aplicarAjustes();
  }
  // Una propiedad de Wallpaper Engine se aplica solo si cambió desde la última vez que la vimos:
  // así, al recargar, no pisa lo que el usuario eligió en el panel de ajustes.
  function propWE(k, v) {
    if (vistosWE[k] !== undefined && vistosWE[k] === v) return;
    vistosWE[k] = v;
    guardar('pueblo-we', vistosWE);
    ajustar(k, v);
  }
  app.ajustes = () => aj;
  app.actores = () => sis.lista;
  app.ajustar = ajustar;
  app.restablecerAjustes = () => { Object.assign(aj, AJ_DEF, { idioma: aj.idioma }); guardar('pueblo-ajustes', aj); aplicarAjustes(); };
  const PROPS_AJUSTE = ['idioma', 'tema', 'escala', 'opacidad', 'pos_estado', 'pos_diario', 'pos_mapa', 'pos_botones', 'lineas', 'h12', 'avisos', 'globos', 'max_globos', 'escala_globos', 'nombres', 'trafico', 'particulas', 'animales'];
  const colorWE = (v) => '#' + String(v).split(' ').slice(0, 3).map((c) => ('0' + Math.round(Math.max(0, Math.min(1, parseFloat(c) || 0)) * 255).toString(16)).slice(-2)).join('');

  window.wallpaperPropertyListener = {
    applyUserProperties(p) { if (listo) aplicarProps(p); else pendientes.push(p); },
    applyGeneralProperties(p) { if (p.fps) cfg.fps = Math.max(10, Math.min(60, p.fps)); },
    setPaused(v) { pausado = !!v; }
  };

  function aplicarProps(p) {
    if (p.zoom) { cfg.zoom = p.zoom.value / 100; PA.Escena.zoomUsuario(cfg.zoom); }
    if (p.camara) { cfg.camara = p.camara.value; if (cfg.camara === 'mapa' && !seleccionado) PA.Escena.seguir(null); }
    if (p.ciclo) cfg.ciclo = p.ciclo.value;
    for (const k of PROPS_AJUSTE) if (p[k]) propWE(k, typeof AJ_DEF[k] === 'boolean' ? !!p[k].value : (typeof AJ_DEF[k] === 'number' ? +p[k].value : p[k].value));
    if (p.schemecolor) propWE('acento', colorWE(p.schemecolor.value));
    if (p.registro) { cfg.registro = !!p.registro.value; PA.UI.mostrar('registro', cfg.registro); }
    if (p.estado) { cfg.estado = !!p.estado.value; PA.UI.mostrar('estado', cfg.estado); }
    if (p.sombras) { cfg.sombras = !!p.sombras.value; PA.Escena.sombras(cfg.sombras); }
    if (p.luces) cfg.luces = !!p.luces.value;
    if (p.calidad) { cfg.calidad = parseFloat(p.calidad.value) || 1; PA.Escena.calidad(cfg.calidad); }
    if (p.puerto) { const n = parseInt(p.puerto.value, 10); if (n && n !== cfg.puerto) { cfg.puerto = n; PA.Red.cambiarPuerto(n); } }
    let cambioClima = false;
    if (p.clima) { opcClima.clima = p.clima.value; cambioClima = true; }
    if (p.estacion) { const v = p.estacion.value; opcClima.hemisferio = v === 'auto_sur' ? 'sur' : 'norte'; opcClima.estacion = v.indexOf('auto') === 0 ? 'auto' : v; cambioClima = true; }
    if (p.eventos) { const v = p.eventos.value; opcClima.eventos = v === 'no' ? 'no' : 'auto'; opcClima.evento = v !== 'no' && v !== 'auto' ? v : null; cambioClima = true; }
    if (cambioClima) aplicarClima(true);
    if (p.mensaje) {
      const v = String(p.mensaje.value || '').trim();
      // al cargar, WE manda el valor guardado: no lo reenviamos. Se espera a que termine de escribir.
      clearTimeout(tMensaje);
      if (!primeraProp && v && v !== ultimoMensajeProp) tMensaje = setTimeout(() => { if (v !== ultimoEnviado) { ultimoEnviado = v; enviarMensajeUsuario(v); } }, 1500);
      ultimoMensajeProp = v;
    }
    primeraProp = false;
  }

  // ---------------- eventos de la simulación (locales o del cerebro) ----------------
  function evento(e) {
    const a = e.id ? sis.porId[e.id] : null;
    switch (e.t) {
      case 'orden': if (a) a.ordenar(e.spot, e.act, e.inmediato); break;
      case 'decir':
        if (!a) break;
        a.hablar(e.dur || 5, e.a);
        if (e.emocion) a.setEmocion(e.emocion);
        PA.UI.burbuja(a, e.texto, e.modo, e.dur);
        PA.UI.dicho(a, e.texto, e.modo);
        if (e.emocion && ['neutral', 'contento', a.d.emoBase].indexOf(e.emocion) < 0) PA.UI.icono(a, e.emocion);
        if (e.modo !== 'piensa') { ultimaCharla = a; ultimaCharlaT = performance.now(); }
        break;
      case 'emocion': if (a) { a.setEmocion(e.emocion); if (a === seleccionado) PA.UI.icono(a, e.emocion); } break;
      case 'charla': { const A = sis.porId[e.a], B = sis.porId[e.b]; if (A && B) { A.mirarA = B; B.mirarA = A; } break; }
      case 'log': PA.UI.nota(e.texto); break;
      case 'atender': if (a) a.atenderHasta = performance.now() + (e.dur || 8) * 1000; break;
      case 'par': { const A = sis.porId[e.a], B = sis.porId[e.b]; if (A && B) { A.parCon(B, e.anim[0], e.cerca, true); B.parCon(A, e.anim[1], e.cerca, false); } break; }
      case 'fin_par': for (const id of [e.a, e.b]) { const x = sis.porId[id]; if (x) x.finPar(); } break;
    }
  }

  function iniciarLocal() {
    const posiciones = {};
    for (const a of sis.lista) if (a.spot) posiciones[a.id] = a.spot.id;
    sim = new SimCore.Simulacion({ personajes: DP.personajes, mundo: DM, alEvento: evento, posiciones: Object.keys(posiciones).length ? posiciones : null });
    modo = 'local';
  }

  // ---------------- cerebro ----------------
  let primeraInstantanea = true;
  function mensajeCerebro(m) {
    switch (m.t) {
      case 'estado':
        if (m.ia) ia = m.ia;
        for (const p of m.personajes || []) {
          const a = sis.porId[p.id];
          if (!a) continue;
          cache[p.id] = p;
          if (!a.spot || a.spot.id !== p.spot) {
            const s = sis.spots[p.spot];
            const lejos = s && Math.hypot(s.x - a.pos.x, s.z - a.pos.z) > 1.5;
            a.ordenar(p.spot, p.act, primeraInstantanea || (p.fase === 'haciendo' && lejos && !a.camino && !a.montura));
          }
          if (p.emocion && p.emocion !== a.emocion && !(performance.now() < a.hablandoHasta)) a.setEmocion(p.emocion);
        }
        primeraInstantanea = false;
        if (seleccionado) refrescarFicha();
        break;
      case 'ia': ia = Object.assign({}, ia, m); break;
      case 'usuario': PA.UI.banner(m.texto); break;
      case 'personalizados': aplicarPersonalizados(m.datos); break;
      case 'ubicar': app.ubicar(m.id); break;
      case 'ficha': if (seleccionado && seleccionado.id === m.id) PA.UI.ficha(seleccionado, Object.assign({}, m.info, { nec: (cache[m.id] || {}).nec || m.info.nec })); break;
      default: evento(m);
    }
  }
  function cambioConexion(on) {
    if (on) { sim = null; modo = 'cerebro'; primeraInstantanea = !sis.lista.some((a) => a.spot); PA.UI.nota(Idiomas.t('Cerebro conectado: la IA local toma el control.')); PA.Red.enviar({ t: 'idioma', lang: Idiomas.actual }); PA.Red.enviar({ t: 'clima', opc: opcClima }); }
    else { ia = { estado: 'offline' }; iniciarLocal(); PA.UI.nota(Idiomas.t('Cerebro desconectado: modo local con frases pregrabadas.')); }
  }

  // El editor (se abre en el navegador) guardó algo: se aplica sin recargar el wallpaper
  let ultimoP = JSON.stringify(window.PERSONALIZADOS || {});
  function aplicarPersonalizados(P) {
    const k = JSON.stringify(P);
    if (k === ultimoP) return;
    ultimoP = k;
    const lista = DP.personajes = Idiomas.traducirLista(DP.combinar(P), DP);
    const cambiados = sis.sincronizar(lista);
    if (seleccionado && cambiados.indexOf(seleccionado.id) >= 0) app.seleccionar(null);
    for (const id of cambiados) { PA.UI.olvidar(id); delete cache[id]; }
    if (sim) sim.sincronizar(lista);
    if (cambiados.length) PA.UI.nota(Idiomas.t('El pueblo se actualizó con tus cambios del editor.'));
  }
  const pideApp = () => PA.UI.aviso(Idiomas.t('APP GRATUITA'), Idiomas.t('Esto necesita la app gratuita: github.com/TicSide/pueblo-agentico'), 'exclamacion');
  app.abrirEditor = (id) => {
    ultimaInteraccionUsuario = performance.now();
    if (!PA.Red.enviar({ t: 'abrir_editor', id: id || null })) pideApp();
  };

  // ---------------- interacción ----------------
  function elegirObjetivo(texto) {
    const t = texto.toLowerCase();
    for (const d of DP.personajes) for (const al of [d.id, ...(d.alias || [])]) if (al.length > 2 && new RegExp('(^|[^a-záéíóúñü])' + al + '($|[^a-záéíóúñü])').test(t)) return d.id;
    return seleccionado ? seleccionado.id : null;
  }
  function enviarMensajeUsuario(texto) {
    ultimaInteraccionUsuario = performance.now();
    if (modo === 'cerebro' && PA.Red.enviar({ t: 'mensaje', texto, seleccionado: seleccionado ? seleccionado.id : null })) return;
    PA.UI.banner(texto);
    const id = elegirObjetivo(texto) || SimCore.elegir(sis.lista.filter((a) => !a.durmiendo)).id;
    const d = sim.porId[id];
    setTimeout(() => sim.decir(id, SimCore.elegir(d.frases || ['...']), 'sorprendido'), 900);
  }
  app.interactuar = function (id, accion) {
    const a = sis.porId[id];
    if (!a) return;
    ultimaInteraccionUsuario = performance.now();
    if (accion === 'seguir') { PA.Escena.seguir(PA.Escena.siguiendo === a.rig.raiz ? null : a.rig.raiz); refrescarFicha(true); return; }
    if (accion === 'saludar') a.saludar();
    if (modo === 'cerebro') { PA.Red.enviar({ t: 'interaccion', id, accion }); return; }
    if (accion === 'socializar') { sim.socializar(id); return; }
    sim.interactuar(id, accion);
    const d = sim.porId[id];
    const frases = { saludar: ['¡Hola! ¿Cómo estás?', '¡Hey! Te veo desde aquí.', '¡Buenas!'], comida: ['¡Gracias! ¡Qué rico!', 'Justo tenía hambre.', '¡Mmm, delicioso!'], dormir: ['Sí, me hace falta dormir...', 'Buenas noches.'], jugar: ['¡A jugar se ha dicho!', '¿Una partida?'] };
    const t = accion === 'hablar' ? SimCore.elegir(d.frases || ['...']) : Idiomas.t(SimCore.elegir(frases[accion] || d.frases || ['...']));
    sim.decir(id, d.tipo === 'gato' ? SimCore.elegir(d.frases) : t, accion === 'comida' ? 'feliz' : null);
  };
  // botones del mapa y de la IA
  app.zoom = (dir) => { ultimaInteraccionUsuario = performance.now(); PA.Escena.zoomPaso(dir); };
  app.vista = () => { ultimaInteraccionUsuario = performance.now(); PA.Escena.vistaGeneral(); };
  app.irIsla = (id) => {
    const I = DM.islas.find((i) => i.id === (id === 'pueblo' ? 'pueblo' : id));
    if (!I) return;
    ultimaInteraccionUsuario = performance.now();
    PA.Escena.irA((I.x0 + I.x1) / 2, (I.z0 + I.z1) / 2, id === 'pueblo' ? 2.4 : 4.0);
  };
  // Ubicar a un vecino: la cámara va hacia él y lo marca con una columna de luz. Si está adentro de un edificio
  // (o manejando con el vehículo tapado), va a esa puerta y avisa qué está haciendo.
  app.ubicar = (id) => {
    const a = sis.porId[id];
    if (!a) return;
    ultimaInteraccionUsuario = performance.now();
    app.seleccionar(a);
    if (a.oculto && !a.montura) {
      const s = a.spot || a.pos;
      PA.Escena.seguir(null); PA.Escena.irA(s.x, s.z, 5.5);
      sis.marcar(null, s.x, s.z);
      PA.UI.aviso(a.d.corto.toUpperCase() + ' · ' + Idiomas.t('ESTÁ ADENTRO'), PA.UI.lugarDe(a), 'lupa');
      return;
    }
    PA.Escena.seguir(a.rig.raiz, 5.5);
    sis.marcar(a);
    refrescarFicha(true);
  };
  app.alternarIA = () => {
    if (modo !== 'cerebro') { pideApp(); return; }
    const activa = !(ia.activa !== false && ia.estado !== 'apagada');
    ia.activa = activa; ia.estado = activa ? 'iniciando' : 'apagada';
    PA.Red.enviar({ t: 'ia_activa', activa });
    PA.UI.aviso(Idiomas.t(activa ? 'ENCENDIENDO LA IA' : 'IA APAGADA'), Idiomas.t(activa ? 'Arrancando Ollama y el modelo...' : 'Ollama se cerró y liberó la memoria. El pueblo sigue con frases pregrabadas.'), activa ? 'brillo' : 'dormir');
  };
  app.seleccionar = function (a) {
    seleccionado = a;
    sis.seleccionado = a;
    if (modo === 'cerebro') PA.Red.enviar({ t: 'seleccion', id: a ? a.id : null });
    if (!a) { PA.UI.ficha(null); PA.Escena.soltarRetrato(); if (PA.Escena.siguiendo) PA.Escena.seguir(null); return; }
    ultimaInteraccionUsuario = performance.now();
    refrescarFicha(true);
  };
  let ultimaFicha = 0;
  function refrescarFicha(forzar) {
    if (!seleccionado) return;
    const ahora = performance.now();
    if (!forzar && ahora - ultimaFicha < 1500) return;
    ultimaFicha = ahora;
    if (modo === 'cerebro') {
      PA.Red.enviar({ t: 'ficha', id: seleccionado.id });
      const c = cache[seleccionado.id];
      PA.UI.ficha(seleccionado, c ? { nec: c.nec, emocion: c.emocion, actividad: (SimCore.ACT[c.act] || {}).txt, zona: zonaNombre(c.spot) } : null);
    } else if (sim) {
      const info = sim.describir(seleccionado.id);
      info.nec = sim.estado[seleccionado.id].nec;
      PA.UI.ficha(seleccionado, info);
    }
  }
  function zonaNombre(spotId) { const s = sis.spots[spotId]; const z = s && DM.zonas.find((x) => x.id === s.zona); return z ? z.nombre : ''; }

  // ---------------- ratón ----------------
  function ratonar() {
    const cv = PA.Escena.renderer.domElement;
    let abajo = null, arrastre = false, ultimoHover = 0;
    addEventListener('mousedown', (e) => { if (e.button === 0) { abajo = { x: e.clientX, y: e.clientY }; arrastre = false; } });
    addEventListener('mousemove', (e) => {
      if (abajo && (Math.abs(e.clientX - abajo.x) + Math.abs(e.clientY - abajo.y) > 6)) arrastre = true;
      if (abajo && arrastre) { PA.Escena.panear(e.movementX || 0, e.movementY || 0); return; }
      const ahora = performance.now();
      if (ahora - ultimoHover < 60) return;
      ultimoHover = ahora;
      sis.encima = sis.actorDe(PA.Escena.tocar(e.clientX, e.clientY, sis.hits));
      cv.style.cursor = sis.encima ? 'pointer' : 'default';
    });
    addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !abajo) return;
      const fue = arrastre;
      abajo = null;
      if (fue) return;
      if (e.target.closest && e.target.closest('#ficha, #ayuda, #botonera, #estado, #registro, #mapa, #aviso, #ajustes, #buscador')) return;
      app.seleccionar(sis.actorDe(PA.Escena.tocar(e.clientX, e.clientY, sis.hits)));
    });
    addEventListener('dblclick', (e) => { const a = sis.actorDe(PA.Escena.tocar(e.clientX, e.clientY, sis.hits)); if (a) { app.seleccionar(a); PA.Escena.seguir(a.rig.raiz); refrescarFicha(true); } });
    addEventListener('wheel', (e) => { PA.Escena.zoomRueda(e.deltaY, e.clientX, e.clientY); }, { passive: true });
  }

  // ---------------- cámara automática ----------------
  let proxPaseo = 0;
  function paseoCamara(ahora) {
    if (cfg.camara !== 'paseo' || ahora < proxPaseo || ahora - ultimaInteraccionUsuario < 60000) return;
    proxPaseo = ahora + 22000;
    if (Math.random() < 0.25) { PA.Escena.seguir(null); return; }
    let a = ultimaCharla && ahora - ultimaCharlaT < 30000 ? ultimaCharla : null;
    if (!a || a.oculto) { const despiertos = sis.lista.filter((x) => !x.durmiendo && !x.oculto); a = despiertos[Math.floor(Math.random() * despiertos.length)]; }
    if (a) PA.Escena.seguir(a.rig.raiz, 6.0);
  }

  // ---------------- bucle ----------------
  const FASES = [[5.2, 'NOCHE'], [6.6, 'AMANECER'], [12, 'MAÑANA'], [17.5, 'TARDE'], [19.2, 'ATARDECER'], [24, 'NOCHE']];
  function horaVisual() {
    if (cfg.ciclo === 'dia') return 12.5;
    if (cfg.ciclo === 'tarde') return 18.1;
    if (cfg.ciclo === 'noche') return 22.5;
    const f = new Date();
    return f.getHours() + f.getMinutes() / 60 + f.getSeconds() / 3600;
  }
  let ultimo = 0, ultimoPaso = 0, ultimoLatido = 0, ultimoEstado = 0, ultimoRetrato = 0, noche = 0;
  function bucle(ms) {
    requestAnimationFrame(bucle);
    if (pausado) return;
    if (ms - ultimo < 1000 / cfg.fps - 2) return;
    const dt = Math.min(0.1, (ms - ultimo) / 1000 || 0.016);
    ultimo = ms;
    const t = ms / 1000;
    if (sim && ms - ultimoPaso > 500) { ultimoPaso = ms; sim.paso(); }
    if (ms - ultimoEstado > 1000) {
      ultimoEstado = ms;
      const h = horaVisual();
      noche = PA.Escena.ciclo(h);
      const durm = sis.lista.filter((a) => a.durmiendo).length, hablan = sis.lista.filter((a) => ms < a.hablandoHasta).length;
      let clase = 'apagado', txt = 'MODO LOCAL', modelo = '';
      if (modo === 'cerebro') {
        modelo = ia.modelo || '';
        if (ia.estado === 'apagada' || ia.activa === false) { clase = 'apagado'; txt = 'IA APAGADA'; modelo = Idiomas.t('frases'); }
        else if (ia.estado === 'pensando') { clase = 'pensando'; txt = 'PENSANDO'; }
        else if (ia.estado === 'listo') { clase = 'ok'; txt = 'IA LOCAL'; }
        else if (ia.estado === 'iniciando') { clase = 'pensando'; txt = 'ENCENDIENDO'; }
        else if (ia.estado === 'sin_modelo') { clase = 'aviso'; txt = 'BAJANDO MODELO'; }
        else { clase = 'aviso'; txt = 'IA NO RESPONDE'; }
      }
      PA.UI.interruptorIA({ disponible: modo === 'cerebro', activa: modo === 'cerebro' && ia.activa !== false && ia.estado !== 'apagada' });
      aplicarClima(false);
      const T = Idiomas.t;
      PA.UI.estado({ fase: T((FASES.find((f) => h < f[0]) || FASES[0])[1]), esNoche: noche > 0.5, claseCerebro: clase, textoCerebro: T(txt), modelo, poblacion: `${sis.lista.length} ${T('VECINOS')} · ${durm} ${T('DUERMEN')} · ${hablan} ${T('HABLAN')}` });
      PA.UI.nombres(cfg.nombres, sis.lista, sis.encima, seleccionado);
      if (seleccionado) refrescarFicha();
    } else if (sis.encima || seleccionado) PA.UI.nombres(cfg.nombres, sis.lista, sis.encima, seleccionado);
    if (modo === 'cerebro' && ms - ultimoLatido > 5000) { ultimoLatido = ms; PA.Red.enviar({ t: 'latido' }); }
    paseoCamara(ms);
    PA.Escena.actualizarCamara(dt);
    sis.actualizar(dt, t, ms, noche, PA.Escena.pixelesPorUnidad());
    trafico.actualizar(dt, ms, noche);
    animales.actualizar(dt, t, noche);
    mundo.actualizar(ms, noche, cfg.luces);
    const cam = PA.Escena.camara;
    climaFx.actualizar(dt, ms, noche, PA.Escena.objetivo, cam.right - cam.left);
    const ec = climaFx.estado;
    sis.lluvia = ec.lluvia > 0.35;
    fondo.actualizar(ms, ec.nubes);
    if (cal && cal.eventos.indexOf('san_valentin') >= 0 && Math.random() < dt * 1.5) { const pz = DM.zonas.find((z) => z.id === 'plaza'); if (pz) sis.pCorazon.emitir(pz.x0 + Math.random() * (pz.x1 - pz.x0), 0.6, pz.z0 + Math.random() * (pz.z1 - pz.z0), 0, 0.5, 0, 3); }
    sis.actualizarFaro(t, ms);
    PA.Escena.render();
    if (seleccionado && ms - ultimoRetrato > 250) { ultimoRetrato = ms; PA.Escena.retrato(seleccionado, PA.UI.lienzoRetrato()); }
    PA.UI.actualizar(ms);
  }

  // Estación, clima y eventos: los calcula el calendario compartido (el cerebro llega al mismo resultado)
  const ICONO_EVENTO = { halloween: 'calabaza', navidad: 'navidad', anio_nuevo: 'fuegos', san_valentin: 'corazon', concierto: 'nota', cine: 'cine', red_john: 'redjohn', estrellas_fugaces: 'estrella' };
  const TEXTO_EVENTO = { halloween: 'Calabazas, fantasmas y murciélagos en todo el pueblo.', navidad: 'Árboles de Navidad en el festival y en el cine.', anio_nuevo: 'Fuegos artificiales toda la noche.', san_valentin: 'Hay amor en el aire de la plaza.', concierto: 'Esta noche toca la banda en la Isla Festival.', cine: 'Hoy hay película en el autocine.', red_john: 'Apareció una carita roja en la pared del cine. Jane va a investigar.', estrellas_fugaces: 'Mira el cielo: caen estrellas.' };
  let ultimaOpc = '';
  function aplicarClima(avisarCerebro) {
    cal = SimCore.calendario(new Date(), opcClima);
    mundo.setEstacion(cal.estacion);
    mundo.setEventos(cal.eventos);
    climaFx.ajustar(cal, avisarCerebro);
    const ec = climaFx.estado;
    PA.Escena.ajustarClima({ nubes: ec.nubes, niebla: ec.niebla, nieve: ec.nieve });
    PA.UI.clima({ estacion: cal.estacion, clima: cal.clima, eventos: cal.eventos, esNoche: noche > 0.5 });
    if (sim) sim.ajustarClima(opcClima);
    const k = JSON.stringify(opcClima);
    if (avisarCerebro && k !== ultimaOpc && modo === 'cerebro') PA.Red.enviar({ t: 'clima', opc: opcClima });
    ultimaOpc = k;
    for (const e of cal.eventos) if (eventosVistos.indexOf(e) < 0) PA.UI.aviso(Idiomas.t('EVENTO') + ' · ' + Idiomas.t(PA.UI.NOMBRE_EVENTO[e] || e.toUpperCase()), Idiomas.t(TEXTO_EVENTO[e] || ''), ICONO_EVENTO[e]);
    eventosVistos = cal.eventos.slice();
  }

  async function arrancar() {
    // las fuentes pixel se usan también dentro de las texturas del mundo (letreros)
    try { await Promise.race([Promise.all([document.fonts.load('22px "Silkscreen"'), document.fonts.load('bold 22px "Silkscreen"'), document.fonts.load('16px "Pixelify Sans"')]), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* sin fuentes */ }
    const q = new URLSearchParams(location.search);
    // el idioma va antes de construir nada: los letreros del mundo y las fichas salen de estos datos
    for (const p of pendientes) if (p.idioma) propWE('idioma', p.idioma.value);
    Idiomas.aplicar(Idiomas.elegir(q.get('idioma') || aj.idioma, navigator.language), SimCore, DP, DM);
    DP.personajes = Idiomas.traducirLista(DP.personajes, DP);
    document.documentElement.lang = Idiomas.actual;
    if (q.get('calidad')) cfg.calidad = parseFloat(q.get('calidad')) || 1;
    PA.Escena.iniciar(document.getElementById('escena'), DM, { calidad: cfg.calidad, sombras: cfg.sombras });
    mundo = PA.Mundo.construir(PA.Escena.escena, DM);
    fondo = PA.Fondo.construir(PA.Escena.escena, DM.N);
    sis = PA.Actores.crear(PA.Escena.escena, DP, DM, mundo.grid);
    trafico = PA.Vehiculos.construir(PA.Escena.escena, DM, sis);
    animales = PA.Animales.crear(PA.Escena.escena, DM, mundo.grid);
    climaFx = PA.Clima.crear(PA.Escena.escena, DM);
    PA.UI.iniciar(DP, app);
    listo = true;
    aplicarAjustes();
    for (const p of pendientes) aplicarProps(p);
    pendientes = [];
    if (q.get('puerto')) cfg.puerto = parseInt(q.get('puerto'), 10) || cfg.puerto;
    if (q.get('ciclo')) cfg.ciclo = q.get('ciclo');
    if (q.get('zoom')) PA.Escena.zoomUsuario(parseFloat(q.get('zoom')) || 1);
    if (q.get('clima')) opcClima.clima = q.get('clima');
    if (q.get('estacion')) opcClima.estacion = q.get('estacion');
    if (q.get('evento')) opcClima.evento = q.get('evento');
    noche = PA.Escena.ciclo(horaVisual());
    aplicarClima(false);
    PA.Red.conectar(cfg.puerto, mensajeCerebro, cambioConexion);
    setTimeout(() => { if (modo === 'arranque') iniciarLocal(); }, q.get('local') ? 0 : 1500);
    ratonar();
    if (!leer('pueblo-bienvenida')) { guardar('pueblo-bienvenida', 1); setTimeout(() => PA.UI.aviso('PUEBLO AGÉNTICO', Idiomas.credito(), 'estrella'), 3000); }
    PA.Escena.actualizarCamara(0.016);
    mundo.orientarHalos(PA.Escena.camara);
    window.PUEBLO = { sis, get sim() { return sim; }, cfg, app, trafico, animales, mundo, opcClima, get cal() { return cal; }, get clima() { return climaFx; }, aplicarClima };
    requestAnimationFrame(bucle);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
