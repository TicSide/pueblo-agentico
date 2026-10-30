/* Pueblo Agéntico — interfaz estilo RPG pixel: globos, nombres, ficha con retrato 3D, diario, reloj, ayuda y ajustes.
 * Sin emojis: todos los íconos son pixel art (PA.Iconos). La apariencia (tema, tamaño, esquinas, globos) se cambia
 * desde el panel de ajustes o desde las propiedades de Wallpaper Engine (main.js guarda la elección). */
window.PA = window.PA || {};
PA.UI = (function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const I = (n, e) => PA.Iconos.svg(n, e);
  const NEC = [['energia', 'ENERGÍA', 'energia', '#e8a91a'], ['comida', 'COMIDA', 'comida', '#d9473b'], ['diversion', 'DIVERSIÓN', 'diversion', '#c86ad9'], ['social', 'SOCIAL', 'social', '#3a7ad9'], ['calma', 'CALMA', 'calma', '#4f8a32']];
  const NOMBRE_EMO = { neutral: 'tranquilo', contento: 'contento', feliz: 'feliz', riendo: 'riendo', emocionado: 'emocionado', sereno: 'sereno', triste: 'triste', lloroso: 'llorando', enojado: 'enojado', sorprendido: 'sorprendido', asustado: 'asustado', pensativo: 'pensativo', picaro: 'pícaro', enamorado: 'enamorado', cansado: 'cansado', dormido: 'dormido', aburrido: 'aburrido', confundido: 'confundido', orgulloso: 'orgulloso', avergonzado: 'avergonzado', nervioso: 'nervioso', serio: 'serio', decidido: 'decidido' };

  let DP, app, burbujas = [], iconos = [], etiquetas = {};
  let fichaId = null, refs = null, ultimaMem = '', ultimaRel = '';
  // opciones de la interfaz (las manda main.js con configurar())
  const op = { globos: 'todos', maxGlobos: 8, lineas: 7, h12: false, avisos: true, escalaGlobos: 1 };
  const hhmm = (h, m) => op.h12 ? `${(h % 12) || 12}:${('0' + m).slice(-2)}${h < 12 ? 'a' : 'p'}` : `${('0' + h).slice(-2)}:${('0' + m).slice(-2)}`;

  function iniciar(datos, aplicacion) {
    DP = datos; app = aplicacion;
    $('ficha').addEventListener('click', (e) => {
      const b = e.target.closest('[data-accion]');
      if (b && b.dataset.accion === 'editar') { e.stopPropagation(); app.abrirEditor(fichaId); return; }
      if (b) { e.stopPropagation(); app.interactuar(fichaId, b.dataset.accion); }
      if (e.target.closest('.cerrar')) { e.stopPropagation(); app.seleccionar(null); }
    });
    $('btn-ayuda').innerHTML = I('ayuda', 3);
    $('btn-ayuda').addEventListener('click', (e) => { e.stopPropagation(); $('ayuda').classList.toggle('visible'); });
    $('ayuda').addEventListener('click', (e) => { e.stopPropagation(); $('ayuda').classList.remove('visible'); });
    $('btn-ajustes').innerHTML = I('engranaje', 3);
    $('btn-buscar').innerHTML = I('lupa', 3);
    $('btn-buscar').addEventListener('click', (e) => { e.stopPropagation(); alternarBuscador(); });
    $('btn-editor').innerHTML = I('lapiz', 3);
    $('btn-editor').addEventListener('click', (e) => { e.stopPropagation(); app.abrirEditor(fichaId); });
    $('btn-ajustes').addEventListener('click', (e) => { e.stopPropagation(); $('ayuda').classList.remove('visible'); armarAjustes(); $('ajustes').classList.toggle('visible'); });
    $('ajustes').addEventListener('click', (e) => e.stopPropagation());
    for (const id of ['ficha', 'ayuda', 'botonera', 'estado', 'registro', 'mapa', 'ajustes', 'buscador']) { $(id).addEventListener('mousedown', (e) => e.stopPropagation()); $(id).addEventListener('wheel', (e) => e.stopPropagation()); }
    // zoom y viaje a las islas
    const m = $('mapa');
    m.querySelector('[data-zoom="1"]').innerHTML = I('mas', 3);
    m.querySelector('[data-zoom="-1"]').innerHTML = I('menos', 3);
    m.querySelector('[data-vista]').innerHTML = I('casa', 3);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.zoom) app.zoom(+b.dataset.zoom);
      else if (b.dataset.vista) { app.vista(); marcarIsla(null); }
      else if (b.dataset.isla) { app.irIsla(b.dataset.isla); marcarIsla(b.dataset.isla); }
    });
    $('btn-ia').addEventListener('click', (e) => { e.stopPropagation(); app.alternarIA(); });
    escalar();
    addEventListener('resize', escalar);
  }
  // tamaño de la interfaz según la pantalla (1536, 1920, 2560...)
  function escalar() {
    const z = Math.max(0.8, Math.min(1.35, innerWidth / 1920));
    document.documentElement.style.setProperty('--z', z.toFixed(3));
    document.documentElement.style.setProperty('--zg', (z * (op.escalaGlobos || 1)).toFixed(3));
  }

  const colorDe = (d) => (DP.SERIES[d.grupo] || {}).color || '#7a4e2c';
  const oscuro = (hex) => PA.Caras.tono(hex, 0.62);
  const claroSobre = (hex) => { const c = new THREE.Color(hex); return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) > 0.55 ? '#2b1b10' : '#fff6dd'; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- globos ----------
  function burbuja(actor, texto, modo, dur) {
    for (const b of burbujas) if (b.actor === actor) b.fin = Math.min(b.fin, performance.now() + 150);
    const el = document.createElement('div');
    const col = colorDe(actor.d);
    el.className = 'burbuja' + (modo === 'piensa' ? ' piensa' : '');
    el.innerHTML = `<span class="quien" style="background:${col};color:${claroSobre(col)}">${esc(actor.d.corto)}</span><span class="txt">${esc(texto)}</span>`;
    $('capa').appendChild(el);
    const b = { el, actor, inicio: performance.now(), fin: performance.now() + (dur || 5) * 1000, w: el.offsetWidth, h: el.offsetHeight };
    burbujas.push(b);
    requestAnimationFrame(() => el.classList.add('visible'));
  }
  function icono(actor, emo) {
    const n = PA.Iconos.EMOCION[emo];
    if (!n) return;
    const el = document.createElement('div');
    el.className = 'icono-emo';
    el.innerHTML = I(n, 3);
    $('capa').appendChild(el);
    iconos.push({ el, actor, fin: performance.now() + 1800 });
  }
  function etiqueta(actor, visible) {
    let e = etiquetas[actor.id];
    if (!e && !visible) return;
    if (!e) {
      const el = document.createElement('div');
      el.className = 'etiqueta';
      el.innerHTML = `<i style="background:${colorDe(actor.d)}"></i>${esc(actor.d.corto)}`;
      $('capa').appendChild(el);
      e = etiquetas[actor.id] = { el, actor };
    }
    e.vis = visible;
    e.el.style.display = visible ? 'block' : 'none';
  }

  const enPantalla = (p, m) => p.visible && p.x > -m && p.x < innerWidth + m && p.y > -m && p.y < innerHeight + m;
  function actualizar(ahora) {
    for (let i = burbujas.length - 1; i >= 0; i--) {
      const b = burbujas[i];
      if (ahora > b.fin) { b.el.classList.remove('visible'); setTimeout(() => b.el.remove(), 250); burbujas.splice(i, 1); }
    }
    // qué globos se ven: según el modo elegido, solo los que están en pantalla y como máximo N (los más nuevos)
    const cerca = PA.Escena.pixelesPorUnidad() > 16;
    const ver = [];
    for (const b of burbujas.slice().sort((a, c) => c.inicio - a.inicio)) {
      const elegido = fichaId === b.actor.id;
      const modo = op.globos === 'todos' || (op.globos === 'cerca' && cerca) || elegido;
      const p = PA.Escena.proyectar(b.actor.sobreCabeza());
      if (op.globos === 'ninguno' || !modo || !enPantalla(p, 20) || ver.length >= op.maxGlobos) { b.el.style.visibility = 'hidden'; continue; }
      b.p = p; ver.push(b);
    }
    // se acomodan de atrás hacia adelante para que no se tapen
    ver.sort((a, b) => b.actor.pos.x + b.actor.pos.z - (a.actor.pos.x + a.actor.pos.z));
    const colocados = [];
    for (const b of ver) {
      let x = b.p.x, y = b.p.y;
      const w = b.w, h = b.h;
      for (let n = 0; n < 6; n++) {
        const choca = colocados.find((c) => Math.abs(c.x - x) < (c.w + w) / 2 + 6 && Math.abs(c.y - y) < (c.h + h) / 2 + 4);
        if (!choca) break;
        y = choca.y - (choca.h + h) / 2 - 6;
      }
      x = Math.max(w / 2 + 8, Math.min(innerWidth - w / 2 - 8, x));
      if (y < h + 4) { b.el.style.visibility = 'hidden'; continue; }
      colocados.push({ x, y, w, h });
      b.el.style.visibility = 'visible';
      b.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -100%)`;
    }
    for (let i = iconos.length - 1; i >= 0; i--) {
      const c = iconos[i];
      if (ahora > c.fin) { c.el.remove(); iconos.splice(i, 1); continue; }
      const p = PA.Escena.proyectar(c.actor.sobreCabeza());
      const k = 1 - (c.fin - ahora) / 1800;
      c.el.style.visibility = enPantalla(p, 20) && op.globos !== 'ninguno' ? 'visible' : 'hidden';
      c.el.style.transform = `translate3d(${Math.round(p.x + 16)}px, ${Math.round(p.y - 6 - k * 24)}px, 0) translate(-50%, -100%)`;
      c.el.style.opacity = k < 0.8 ? 1 : (1 - k) * 5;
    }
    for (const id in etiquetas) {
      const e = etiquetas[id];
      if (!e.vis) continue;
      const p = PA.Escena.proyectar(e.actor.sobreCabeza());
      const tiene = ver.some((b) => b.actor === e.actor && b.el.style.visibility === 'visible');
      e.el.style.visibility = enPantalla(p, 30) ? 'visible' : 'hidden';
      e.el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y + 4)}px, 0) translate(-50%, -100%)`;
      e.el.style.opacity = tiene ? 0 : 1;
    }
  }
  function nombres(todos, lista, encima, sel) { for (const a of lista) etiqueta(a, (todos || a === encima || a === sel) && !a.oculto); }

  // ---------- diario ----------
  function registro(html, tipo) {
    const r = $('lineas');
    const el = document.createElement('div');
    el.className = 'linea' + (tipo ? ' ' + tipo : '');
    const h = new Date();
    el.innerHTML = `<time>${hhmm(h.getHours(), h.getMinutes())}</time><span>${html}</span>`;
    r.appendChild(el);
    while (r.children.length > op.lineas) r.firstChild.remove();
    while (r.children.length > 1 && r.scrollHeight > r.clientHeight + 1) r.firstChild.remove();
  }
  function dicho(actor, texto, modo) { registro(`<b style="color:${oscuro(colorDe(actor.d))}">${esc(actor.d.corto)}</b>${modo === 'piensa' ? ' <em>piensa</em>' : ''} ${esc(texto)}`); }
  function nota(texto) { registro(esc(texto), 'nota'); }

  // ---------- mensaje del usuario ----------
  let tBanner = 0;
  function banner(texto) {
    const b = $('banner');
    b.innerHTML = `<span class="tu">TÚ</span><span>${esc(texto)}</span>`;
    b.classList.add('visible');
    clearTimeout(tBanner);
    tBanner = setTimeout(() => b.classList.remove('visible'), 9000);
  }

  // ---------- reloj y estado ----------
  let ultimoEstado = '';
  function estado(info) {
    const h = new Date();
    const clave = JSON.stringify(info) + h.getMinutes();
    if (clave === ultimoEstado) return;
    ultimoEstado = clave;
    $('reloj').textContent = hhmm(h.getHours(), h.getMinutes());
    $('ico-hora').innerHTML = I(info.esNoche ? 'luna' : 'sol', 3);
    $('fase').textContent = info.fase;
    $('led').className = 'led ' + info.claseCerebro;
    $('cerebro').textContent = info.textoCerebro;
    $('modelo').textContent = info.modelo || '';
    $('poblacion').textContent = info.poblacion;
  }

  function marcarIsla(id) { for (const b of $('mapa').querySelectorAll('[data-isla]')) b.classList.toggle('activa', b.dataset.isla === id); }

  // ---------- estación, clima y eventos ----------
  const NOMBRE_EST = { primavera: 'PRIMAVERA', verano: 'VERANO', otono: 'OTOÑO', invierno: 'INVIERNO' };
  const NOMBRE_CLI = { despejado: 'DESPEJADO', nublado: 'NUBLADO', lluvia: 'LLUVIA', tormenta: 'TORMENTA', nieve: 'NIEVE', niebla: 'NIEBLA' };
  const NOMBRE_EVE = { halloween: 'HALLOWEEN', navidad: 'NAVIDAD', anio_nuevo: 'AÑO NUEVO', san_valentin: 'SAN VALENTÍN', concierto: 'CONCIERTO EN EL FESTIVAL', cine: 'FUNCIÓN EN EL AUTOCINE', red_john: 'RED JOHN ATACA', estrellas_fugaces: 'ESTRELLAS FUGACES' };
  let ultimoClima = '';
  function clima(info) {
    const clave = info.estacion + info.clima + info.eventos.join() + info.esNoche;
    if (clave === ultimoClima) return;
    ultimoClima = clave;
    const icoCli = info.clima === 'despejado' ? (info.esNoche ? 'luna' : 'sol') : PA.Iconos.CLIMA[info.clima];
    $('ico-clima').innerHTML = I(icoCli, 2) + ' ' + I(PA.Iconos.ESTACION[info.estacion], 2);
    $('clima').textContent = NOMBRE_EST[info.estacion] + ' · ' + NOMBRE_CLI[info.clima];
    const ev = info.eventos.filter((e) => NOMBRE_EVE[e]);
    $('evento').classList.toggle('visible', ev.length > 0);
    $('evento').innerHTML = ev.map((e) => `${I(PA.Iconos.EVENTO[e] || 'estrella', 2)}<span>${NOMBRE_EVE[e]}</span>`).join('<span>·</span>');
  }
  let tAviso = 0;
  function aviso(titulo, texto, icono) {
    if (!op.avisos) return;
    const a = $('aviso');
    a.innerHTML = `${I(icono || 'estrella', 3)}<span>${esc(titulo)}</span>${texto ? `<small>${esc(texto)}</small>` : ''}`;
    a.classList.add('visible');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove('visible'), 8000);
  }
  function interruptorIA(info) {
    const b = $('btn-ia');
    b.disabled = !info.disponible;
    b.classList.toggle('on', !!info.activa);
    b.title = !info.disponible ? 'Sin cerebro: ejecuta instalar.ps1 para tener la IA local' : info.activa ? 'Apagar la IA (y Ollama)' : 'Encender la IA';
  }
  const NOMBRE_EVENTO = NOMBRE_EVE;
  function olvidar(id) { const e = etiquetas[id]; if (e) { e.el.remove(); delete etiquetas[id]; } for (const b of burbujas) if (b.actor.id === id) b.fin = 0; for (const c of iconos) if (c.actor.id === id) c.fin = 0; }

  // ---------- ficha del personaje ----------
  function crearFicha(actor) {
    const d = actor.d, col = colorDe(d);
    const f = $('ficha');
    f.style.setProperty('--serie', col);
    f.innerHTML = `
      <button class="cerrar" title="Cerrar">${I('cerrar', 2)}</button>
      <header>
        <div class="retrato">${d.foto || !d.creado ? `<img alt="" src="${esc(d.foto || `fotos/${d.id}.png`)}">` : ''}<canvas width="112" height="112"></canvas></div>
        <div class="titulo">
          <b>${esc(d.nombre)}</b>
          <span class="serie" style="color:${oscuro(col)}">${esc(d.serie).toUpperCase()}</span>
          <span class="animo"><i class="ico-animo"></i><span class="txt-animo"></span></span>
        </div>
        ${d.emblema === 'redjohn' ? `<div class="emblema" title="Red John">${I('redjohn', 4)}</div>` : ''}
      </header>
      <div class="actividad"><i class="ico-act"></i><span class="txt-act"></span><small class="txt-zona"></small></div>
      <div class="necesidades">${NEC.map(([k, n, ic, c]) => `<div class="nec" data-nec="${k}"><i>${I(ic, 2)}</i><label>${n}</label><div class="segs" style="--c:${c}">${'<span></span>'.repeat(10)}</div></div>`).join('')}</div>
      <p class="perso">${esc(d.personalidad)}</p>
      <div class="rel"></div>
      <div class="mem"><h4>RECUERDOS</h4><ul></ul></div>
      <div class="botones">
        <button data-accion="saludar">${I('saludar', 2)}<span>SALUDAR</span></button>
        <button data-accion="hablar">${I('hablar', 2)}<span>HABLAR</span></button>
        <button data-accion="comida">${I('pizza', 2)}<span>COMIDA</span></button>
        <button data-accion="jugar">${I('control', 2)}<span>JUGAR</span></button>
        <button data-accion="dormir">${I('dormir', 2)}<span>DORMIR</span></button>
        <button data-accion="socializar">${I('social', 2)}<span>SOCIALIZAR</span></button>
        <button data-accion="seguir" class="b-seguir">${I('seguir', 2)}<span>SEGUIR</span></button>
        <button data-accion="editar">${I('lapiz', 2)}<span>EDITAR</span></button>
      </div>`;
    refs = {
      canvas: f.querySelector('.retrato canvas'), retrato: f.querySelector('.retrato'), animo: f.querySelector('.txt-animo'), icoAnimo: f.querySelector('.ico-animo'),
      act: f.querySelector('.txt-act'), icoAct: f.querySelector('.ico-act'), zona: f.querySelector('.txt-zona'),
      nec: {}, rel: f.querySelector('.rel'), mem: f.querySelector('.mem ul'), seguir: f.querySelector('.b-seguir span')
    };
    for (const [k] of NEC) refs.nec[k] = [...f.querySelectorAll(`[data-nec="${k}"] .segs span`)];
    // foto real (fotos/<id>.png: el actor o el render oficial); si no hay, la foto de estudio (retratos/<id>.png);
    // y si tampoco, queda el retrato 3D en vivo
    const foto = f.querySelector('.retrato img');
    if (foto) {
      foto.onload = () => { if (refs) { refs.retrato.classList.add('con-foto'); refs.retrato.classList.toggle('real', foto.src.indexOf('/fotos/') >= 0); } };
      foto.onerror = () => { if (foto.src.indexOf('/fotos/') >= 0 && !d.retratoVivo) foto.src = 'retratos/' + d.id + '.png'; else foto.remove(); };
    }
    ultimaMem = ''; ultimaRel = '';
  }
  function ficha(actor, info) {
    const f = $('ficha');
    if (!actor) { f.classList.remove('visible'); fichaId = null; return; }
    if (fichaId !== actor.id) { fichaId = actor.id; crearFicha(actor); f.classList.add('visible'); }
    const i = info || {};
    const emo = i.emocion || actor.emocion;
    refs.animo.textContent = (NOMBRE_EMO[emo] || emo || '').toUpperCase();
    refs.icoAnimo.innerHTML = I(PA.Iconos.EMOCION[emo] || 'puntos', 2);
    if (i.actividad) refs.act.textContent = i.actividad;
    refs.zona.textContent = i.zona ? ' · ' + i.zona : '';
    const grupo = actor.act && SimCore.ACT[actor.act] ? SimCore.ACT[actor.act].grupo : 'pasear';
    refs.icoAct.innerHTML = I(PA.Iconos.GRUPO[grupo] || 'huella', 2);
    if (i.nec) for (const [k] of NEC) { const v = Math.round(i.nec[k] / 10); refs.nec[k].forEach((s, n) => s.classList.toggle('on', n < v)); }
    const rel = (i.relaciones || []).slice(0, 4);
    if (rel.join() !== ultimaRel) { ultimaRel = rel.join(); refs.rel.innerHTML = rel.map((r) => `<span>${esc(r)}</span>`).join(''); }
    const mem = (i.recuerdos || []).slice(-3).reverse();
    if (mem.join() !== ultimaMem || !refs.mem.children.length) { ultimaMem = mem.join(); refs.mem.innerHTML = mem.map((r) => `<li>${esc(r)}</li>`).join('') || '<li class="vacio">Todavía no recuerda nada especial.</li>'; }
    refs.seguir.textContent = PA.Escena.siguiendo === actor.rig.raiz ? 'MAPA' : 'SEGUIR';
  }
  // ---------- buscador de vecinos ----------
  // Va con el mouse (Wallpaper Engine no pasa el teclado): letras, grupos e islas; el campo de texto sirve en el navegador
  const bus = { letra: '', grupo: '', isla: '', texto: '' };
  const sinTilde = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function lugarDe(actor) {
    const sp = actor.spot, ac = sp && SimCore.ACT[actor.act];
    const que = ac ? (ac.txtEn && sp.lugar ? ac.txtEn.replace('{lugar}', sp.lugar) : ac.txt) : 'Paseando';
    const zn = sp && DM().zonas.find((z) => z.id === sp.zona);
    return que + (zn && !zn.virtual ? ' · ' + zn.nombre.replace(/^(el|la|los|las) /i, '') : '');
  }
  const DM = () => window.DATOS_MUNDO;
  const islaDe = (a) => (DM().islas.find((i) => a.pos.x >= i.x0 && a.pos.x <= i.x1 && a.pos.z >= i.z0 && a.pos.z <= i.z1) || {}).id;
  function alternarBuscador() {
    const b = $('buscador'), abrir = !b.classList.contains('visible');
    b.classList.toggle('visible', abrir);
    if (abrir) { $('ayuda').classList.remove('visible'); $('ajustes').classList.remove('visible'); armarBuscador(); }
  }
  function armarBuscador() {
    const b = $('buscador');
    const grupos = Object.keys(DP.SERIES).filter((g) => DP.personajes.some((d) => d.grupo === g));
    const nombreI = (i) => (i.centro ? 'PUEBLO' : i.nombre.replace(/^(el|la|los|las) /i, '').toUpperCase());
    b.innerHTML = `<h3>BUSCAR VECINO</h3><button class="cerrar-bus" title="Cerrar">${I('cerrar', 2)}</button>
      <input id="bus-texto" type="search" placeholder="Escribe un nombre o usa las letras" autocomplete="off" aria-label="Buscar por nombre">
      <div class="letras">${['', ...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'].map((l) => `<button data-letra="${l}">${l || 'TODAS'}</button>`).join('')}</div>
      <h4>POR GRUPO</h4><div class="chips" data-tipo="grupo"><button data-v="">TODOS</button>${grupos.map((g) => `<button data-v="${esc(g)}"><i style="background:${esc(DP.SERIES[g].color)}"></i>${esc(DP.SERIES[g].nombre).toUpperCase()}</button>`).join('')}</div>
      <h4>DÓNDE ESTÁ AHORA</h4><div class="chips" data-tipo="isla"><button data-v="">TODAS</button>${DM().islas.map((i) => `<button data-v="${esc(i.id)}">${esc(nombreI(i))}</button>`).join('')}</div>
      <div class="cuenta"></div><div class="resultados"></div>`;
    b.querySelector('.cerrar-bus').onclick = () => b.classList.remove('visible');
    const t = $('bus-texto');
    t.value = bus.texto;
    t.oninput = () => { bus.texto = t.value; pintarResultados(); };
    t.onmousedown = (e) => e.stopPropagation();
    b.querySelector('.letras').onclick = (e) => { const x = e.target.closest('button'); if (x) { bus.letra = x.dataset.letra; pintarResultados(); } };
    for (const c of b.querySelectorAll('.chips')) c.onclick = (e) => { const x = e.target.closest('button'); if (x) { bus[c.dataset.tipo] = x.dataset.v; pintarResultados(); } };
    b.querySelector('.resultados').onclick = (e) => { const x = e.target.closest('[data-id]'); if (x) app.ubicar(x.dataset.id); };
    pintarResultados();
  }
  function pintarResultados() {
    const b = $('buscador');
    for (const x of b.querySelectorAll('.letras button')) x.classList.toggle('on', x.dataset.letra === bus.letra);
    for (const c of b.querySelectorAll('.chips')) for (const x of c.children) x.classList.toggle('on', x.dataset.v === bus[c.dataset.tipo]);
    const q = sinTilde(bus.texto.trim());
    const lista = app.actores().filter((a) => {
      const d = a.d;
      if (bus.letra && sinTilde(d.corto)[0] !== sinTilde(bus.letra)) return false;
      if (bus.grupo && d.grupo !== bus.grupo) return false;
      if (q && sinTilde(d.nombre + ' ' + d.corto + ' ' + d.serie + ' ' + (d.alias || []).join(' ')).indexOf(q) < 0) return false;
      return !bus.isla || islaDe(a) === bus.isla;
    }).sort((x, y) => x.d.corto.localeCompare(y.d.corto, 'es'));
    b.querySelector('.cuenta').textContent = lista.length + (lista.length === 1 ? ' VECINO' : ' VECINOS');
    b.querySelector('.resultados').innerHTML = lista.map((a) => `<button data-id="${esc(a.id)}"><i style="background:${esc(colorDe(a.d))}"></i><b>${esc(a.d.corto)}</b><span>${esc(lugarDe(a))}</span></button>`).join('') || '<p>Nadie coincide con esa búsqueda.</p>';
  }

  // ---------- ajustes de la interfaz ----------
  const ESQ = [['ar-izq', 'ARRIBA IZQ.'], ['ar-der', 'ARRIBA DER.'], ['ab-izq', 'ABAJO IZQ.'], ['ab-der', 'ABAJO DER.'], ['oculto', 'OCULTO']];
  const SI_NO = [[true, 'SÍ'], [false, 'NO']];
  const ESQUEMA = [
    ['INTERFAZ'],
    ['tema', 'TEMA', 'ops', [['madera', 'MADERA'], ['noche', 'NOCHE'], ['pergamino', 'PERGAMINO'], ['neon', 'NEÓN'], ['cristal', 'CRISTAL'], ['acento', 'COLOR DE WE']]],
    ['escala', 'TAMAÑO', 'rango', 60, 160, 5, '%'],
    ['opacidad', 'OPACIDAD', 'rango', 30, 100, 5, '%'],
    ['PANELES'],
    ['pos_estado', 'RELOJ Y CLIMA', 'ops', ESQ],
    ['pos_diario', 'DIARIO', 'ops', ESQ],
    ['pos_mapa', 'BOTONES DE ISLAS', 'ops', ESQ],
    ['pos_botones', 'AJUSTES Y AYUDA', 'ops', ESQ.slice(0, 4)],
    ['lineas', 'LÍNEAS DEL DIARIO', 'rango', 2, 12, 1, ''],
    ['h12', 'HORA', 'ops', [[false, '24 H'], [true, '12 H']]],
    ['avisos', 'AVISOS DE EVENTOS', 'ops', SI_NO],
    ['GLOBOS Y NOMBRES'],
    ['globos', 'GLOBOS DE DIÁLOGO', 'ops', [['todos', 'TODOS'], ['cerca', 'AL ACERCAR'], ['elegido', 'SOLO EL ELEGIDO'], ['ninguno', 'NINGUNO']]],
    ['max_globos', 'MÁXIMO A LA VEZ', 'rango', 1, 20, 1, ''],
    ['escala_globos', 'TAMAÑO DE GLOBOS', 'rango', 60, 160, 5, '%'],
    ['nombres', 'NOMBRES SIEMPRE', 'ops', SI_NO],
    ['MUNDO'],
    ['trafico', 'TRÁNSITO', 'rango', 0, 100, 5, '%'],
    ['particulas', 'LLUVIA Y NIEVE', 'rango', 0, 150, 10, '%'],
    ['animales', 'ANIMALES', 'ops', SI_NO]
  ];
  function armarAjustes() {
    const aj = app.ajustes();
    let h = `<h3>AJUSTES DE LA INTERFAZ</h3><button class="cerrar-aj" title="Cerrar">${I('cerrar', 2)}</button>`;
    for (const f of ESQUEMA) {
      if (f.length === 1) { h += `<h4>${f[0]}</h4>`; continue; }
      const [k, nombre, tipo] = f;
      if (tipo === 'ops') h += `<div class="fila"><span>${nombre}</span><div class="ops">${f[3].map(([v, t], i) => `<button data-k="${k}" data-i="${i}" class="${aj[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
      else h += `<div class="fila"><span>${nombre}</span><div class="rango"><input type="range" data-k="${k}" min="${f[3]}" max="${f[4]}" step="${f[5]}" value="${aj[k]}"><output>${aj[k]}${f[6]}</output></div></div>`;
    }
    h += `<div class="acciones"><small>SE GUARDA SOLO. LO QUE CAMBIES EN LAS PROPIEDADES DE WALLPAPER ENGINE TAMBIÉN SE APLICA AQUÍ.</small><button data-reset="1">RESTABLECER</button></div>`;
    const el = $('ajustes');
    el.innerHTML = h;
    el.querySelector('.cerrar-aj').onclick = () => el.classList.remove('visible');
    el.querySelector('[data-reset]').onclick = () => { app.restablecerAjustes(); armarAjustes(); };
    for (const b of el.querySelectorAll('.ops button')) b.onclick = () => {
      const f = ESQUEMA.find((x) => x[0] === b.dataset.k);
      app.ajustar(b.dataset.k, f[3][+b.dataset.i][0]);
      for (const o of b.parentNode.children) o.classList.toggle('on', o === b);
    };
    for (const r of el.querySelectorAll('input[type=range]')) r.oninput = () => {
      const f = ESQUEMA.find((x) => x[0] === r.dataset.k);
      r.nextElementSibling.textContent = r.value + f[6];
      app.ajustar(r.dataset.k, +r.value);
    };
  }
  // Aplica la apariencia: tema, tamaño, opacidad, esquinas de los paneles y globos
  function configurar(aj) {
    const raiz = document.documentElement;
    raiz.dataset.tema = aj.tema === 'acento' ? 'madera' : aj.tema;
    if (aj.tema === 'acento' && aj.acento) { raiz.dataset.acento = '1'; raiz.style.setProperty('--acento', aj.acento); } else delete raiz.dataset.acento;
    raiz.style.setProperty('--zu', (aj.escala / 100).toFixed(2));
    raiz.style.setProperty('--op', (aj.opacidad / 100).toFixed(2));
    op.globos = aj.globos; op.maxGlobos = aj.max_globos; op.escalaGlobos = aj.escala_globos / 100; op.lineas = aj.lineas; op.h12 = !!aj.h12; op.avisos = !!aj.avisos;
    escalar();
    // cada panel a su esquina (en este orden se apilan de arriba hacia abajo)
    for (const [id, k] of [['estado', 'pos_estado'], ['mapa', 'pos_mapa'], ['botonera', 'pos_botones'], ['registro', 'pos_diario']]) {
      const destino = aj[k] === 'oculto' ? $('guardados') : $('esq-' + aj[k]);
      if (destino) destino.appendChild($(id));
    }
    const r = $('lineas');
    while (r.children.length > op.lineas) r.firstChild.remove();
    ultimoEstado = '';
  }

  const lienzoRetrato = () => (refs && fichaId && !refs.retrato.classList.contains('con-foto') ? refs.canvas : null);
  const fichaAbierta = () => fichaId;
  function mostrar(id, on) { $(id).style.display = on ? '' : 'none'; }

  return { iniciar, olvidar, lugarDe, burbuja, icono, actualizar, nombres, registro, dicho, nota, banner, estado, ficha, fichaAbierta, lienzoRetrato, mostrar, clima, aviso, interruptorIA, marcarIsla, configurar, NOMBRE_EVENTO };
})();
