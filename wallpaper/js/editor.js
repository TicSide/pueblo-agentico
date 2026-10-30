/* Pueblo Agéntico — editor de personajes. Crea vecinos nuevos y cambia los que ya existen, con vista previa 3D.
 * Se abre en el navegador (Wallpaper Engine no pasa el teclado): lo sirve el cerebro en /editor y guarda con /api/editor/...
 * El borrador es una copia del personaje; al guardar, el cerebro escribe personalizados.js y avisa al wallpaper. */
(function () {
  'use strict';
  const DP = window.DATOS_PERSONAJES, DM = window.DATOS_MUNDO;
  const $ = (id) => document.getElementById(id);
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const NUM_ES = (v) => (Number.isInteger(v) ? String(v) : Number(v).toFixed(2));

  // ---------------- catálogos (salen de lo que los modelos saben dibujar) ----------------
  const PELOS = [['', 'Sin definir'], ['calvo', 'Calvo'], ['rapado', 'Rapado'], ['ralo', 'Ralo'], ['chato', 'Chato'], ['entradas', 'Con entradas'], ['corto', 'Corto'], ['peinado', 'Peinado'], ['engominado', 'Engominado'], ['flequillo', 'Flequillo'], ['medio', 'Medio'], ['despeinado', 'Despeinado'], ['rizado', 'Rizado'], ['ondulado', 'Ondulado'], ['bob', 'Bob'], ['coleta', 'Coleta'], ['trenza', 'Trenza'], ['mono', 'Moño'], ['largo', 'Largo'], ['largo_rizado', 'Largo rizado']];
  const BARBAS = [['', 'Sin barba'], ['rala', 'Rala'], ['corta', 'Corta'], ['candado', 'Candado'], ['bigote', 'Bigote'], ['larga', 'Larga'], ['kratos', 'Tupida'], ['gimli', 'De enano']];
  const CUERPOS = [['', 'Persona'], ['gato', 'Gato'], ['llama', 'Llama']];
  const CARAS = [['', 'Humana'], ['pantalla', 'Pantalla (IA)'], ['monitor', 'Monitor'], ['ballena', 'Ballena'], ['gollum', 'Criatura'], ['casco', 'Casco con visor']];
  const TIPOS = [['humano', 'Humano'], ['ia', 'Inteligencia artificial'], ['androide', 'Androide']];
  const BEBIDAS = [['cafe', 'Café'], ['te', 'Té'], ['jugo', 'Jugo'], ['gaseosa', 'Gaseosa'], ['cerveza', 'Cerveza'], ['vino', 'Vino'], ['thirium', 'Thirium']];
  const LOGOS = [['', 'Sin logo'], ['claude', 'Claude'], ['chatgpt', 'ChatGPT'], ['codex', 'Codex'], ['gemini', 'Gemini'], ['copilot', 'Copilot'], ['deepseek', 'DeepSeek'], ['qwen', 'Qwen']];
  // [nombre, etiqueta, color por defecto si el accesorio lleva color]
  const EXTRAS = [
    ['Cabeza', [['gorra', 'Gorra', '#d64541'], ['boina', 'Boina', '#3a4a7a'], ['bandana', 'Bandana', '#c8202a'], ['capucha', 'Capucha', '#3a3f4a'], ['sombrero_mago', 'Sombrero de mago', '#4a3a7a'], ['gorro_chef', 'Gorro de chef'], ['gorra_aviador', 'Gorra de aviador'], ['audifonos', 'Audífonos'], ['gafas', 'Gafas'], ['gafas_sol', 'Gafas de sol'], ['flor', 'Flor', '#ff8ac0'], ['orejas_elfo', 'Orejas de elfo'], ['antena', 'Antena'], ['trenzas', 'Trenzas']]],
    ['Cuerpo', [['delantal', 'Delantal', '#f4f4f0'], ['chaleco', 'Chaleco', '#3d424b'], ['bufanda', 'Bufanda', '#d64541'], ['guantes', 'Guantes', '#2a2a30'], ['cuello_piel', 'Cuello de piel', '#6a5a48'], ['hombrera', 'Hombrera', '#6a6e78'], ['taparrabo', 'Taparrabo', '#5a3a22'], ['chaleco_motero', 'Chaleco motero'], ['placa', 'Placa'], ['collar_cruz', 'Collar de cruz'], ['tatuaje_rojo', 'Tatuaje rojo']]],
    ['Equipo', [['mochila', 'Mochila'], ['bolso', 'Bolso', '#a87445'], ['espada_cintura', 'Espada'], ['pistolera', 'Pistolera'], ['pistolas', 'Dos pistolas'], ['hacha_espalda', 'Hacha'], ['arco_espalda', 'Arco'], ['carcaj', 'Carcaj']]],
    ['Trajes', [['traje_espacial', 'Traje espacial'], ['casco_astronauta', 'Casco de astronauta'], ['casco_isaac', 'Casco de ingeniero'], ['casco_gimli', 'Casco de enano'], ['casco_peacemaker', 'Casco cromado'], ['cyberlife', 'Androide CyberLife'], ['led', 'LED en la sien'], ['rig', 'Columna luminosa'], ['paloma', 'Paloma en el pecho']]]
  ];
  const COLORES = [['piel', 'Piel', '#f0c8a0'], ['cp', 'Pelo', '#3a2a1e'], ['cb', 'Barba', '#3a2a1e'], ['ojos', 'Ojos', '#3a2a1e'], ['torso', 'Polera', '#3a7ad9'], ['camisa', 'Camisa', '#f4f4f0'], ['chaqueta', 'Chaqueta', '#3a3f4a'], ['abrigo', 'Abrigo largo', '#5a4632'], ['corbata', 'Corbata', '#c8202a'], ['piernas', 'Pantalón', '#333a48'], ['shorts', 'Shorts', '#3a4a63'], ['falda', 'Falda', '#7a4fa8'], ['capa', 'Capa', '#a8232b'], ['zapatos', 'Zapatos', '#222222']];
  const COLORES_ANIMAL = [['piel', 'Pelaje', '#8f7f66'], ['rayas', 'Rayas', '#3d3428'], ['pecho', 'Pecho', '#f2ece0'], ['ojos', 'Ojos', '#b8c43c'], ['torso', 'Lomo', '#f4f1ea'], ['piernas', 'Patas', '#ebe5d8']];
  const PROPORCIONES = [['alto', 'Altura', 0.7, 1.4], ['ancho', 'Ancho', 0.7, 1.5], ['cabeza', 'Cabeza', 0.8, 1.4], ['torsoL', 'Torso', 0.8, 1.3], ['piernaL', 'Piernas', 0.7, 1.3]];
  const RASGOS = [['social', 'Sociable', 0.1, 1, 0.6, 'Cuánto busca a otros para charlar'], ['apetito', 'Apetito', 0.4, 1.6, 1, 'Qué tan seguido tiene hambre'], ['sueno', 'Sueño', 0.4, 1.6, 1, 'Qué tan rápido se cansa'], ['inquieto', 'Inquieto', 0.5, 1.6, 1, 'Qué tan rápido se aburre'], ['estres', 'Nervios', 0.4, 1.6, 1, 'Qué tan rápido pierde la calma']];
  const NOMBRE_EMO = { neutral: 'Tranquilo', contento: 'Contento', feliz: 'Feliz', riendo: 'Riendo', emocionado: 'Emocionado', sereno: 'Sereno', triste: 'Triste', lloroso: 'Llorando', enojado: 'Enojado', sorprendido: 'Sorprendido', asustado: 'Asustado', pensativo: 'Pensativo', picaro: 'Pícaro', enamorado: 'Enamorado', cansado: 'Cansado', dormido: 'Dormido', aburrido: 'Aburrido', confundido: 'Confundido', orgulloso: 'Orgulloso', avergonzado: 'Avergonzado', nervioso: 'Nervioso', serio: 'Serio', decidido: 'Decidido' };
  const EMOS = SimCore.EMOCIONES.map((e) => [e, NOMBRE_EMO[e] || e]);
  const SIN_ACENTO = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ACTIVIDADES = Object.keys(SimCore.ACT).filter((k) => (SimCore.ACT[k].tipos || ['humano']).indexOf('humano') >= 0).map((k) => [k, SimCore.ACT[k].txt]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const NOM_ZONA = {};
  for (const z of DM.zonas) if (!z.virtual) NOM_ZONA[z.id] = z.nombre.replace(/^(el|la|los|las) /i, '');
  const ZONAS = Object.keys(NOM_ZONA).map((k) => [k, NOM_ZONA[k]]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const NOM_ISLA = {};
  for (const I of DM.islas) NOM_ISLA[I.id] = I.nombre.replace(/^(el|la|los|las) /i, '');
  const NOM_REGION = { casos: 'Oficina de casos y escena del crimen', restaurante: 'Restaurante', plaza: 'Plaza Central', gimnasio: 'Gimnasio', fortaleza: 'Fortaleza', jardin: 'Jardín Zen', gamer: 'Sala Gamer', musica: 'Estudio de Música', campamento: 'Campamento' };
  const REGIONES = [['', 'Libre: va a todo el mapa']].concat(Object.keys(DM.regiones).map((k) => [k, 'Se queda en: ' + (NOM_ISLA[k] || NOM_REGION[k] || k)]));

  // ---------------- estado ----------------
  let P = window.PERSONALIZADOS || { nuevos: [], cambios: {}, ocultos: [], series: {} };
  let todos = [], id = null, borrador = null, sucio = false, pestana = 'identidad', fotoPrev = null, serieNueva = null;

  async function api(ruta, cuerpo) {
    const r = await fetch('/api/editor/' + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({ error: 'respuesta inválida' }));
    if (!r.ok || j.error) throw new Error(j.error || 'no se pudo guardar');
    return j;
  }
  let tAviso = 0;
  function aviso(txt, mal) {
    const a = $('aviso-editor');
    a.textContent = txt; a.className = 'visible' + (mal ? ' mal' : '');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => { a.className = ''; }, 3800);
  }
  function marcarSucio(v) { sucio = v; $('btn-guardar').textContent = v ? 'GUARDAR CAMBIOS' : 'GUARDADO'; $('btn-guardar').disabled = !v; }

  function actualizarTodos() {
    const lista = DP.combinar(P), ids = new Set(lista.map((d) => d.id));
    todos = lista.concat(DP.base.filter((d) => !ids.has(d.id)).map((d) => Object.assign({}, d, { oculto: true })));
    todos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }
  const marcaDe = (d) => (d.creado ? 'nuevo' : d.oculto ? 'oculto' : d.editado ? 'editado' : '');
  const TXT_MARCA = { nuevo: 'NUEVO', oculto: 'OCULTO', editado: 'EDITADO' };

  // ---------------- lista ----------------
  function pintarFiltro() {
    const f = $('filtro'), val = f.value;
    f.textContent = '';
    const op = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; f.appendChild(o); };
    op('', 'Todos los grupos'); op('*nuevo', 'Mis personajes nuevos'); op('*editado', 'Editados'); op('*oculto', 'Ocultos');
    for (const g in DP.SERIES) op(g, DP.SERIES[g].nombre);
    f.value = val;
  }
  function pintarLista() {
    const q = SIN_ACENTO($('buscar').value.trim()), fil = $('filtro').value, cont = $('lista');
    cont.textContent = '';
    let n = 0;
    for (const d of todos) {
      if (q && SIN_ACENTO(d.nombre + ' ' + d.serie + ' ' + (d.alias || []).join(' ')).indexOf(q) < 0) continue;
      if (fil[0] === '*' ? marcaDe(d) !== fil.slice(1) : fil && d.grupo !== fil) continue;
      n++;
      const b = document.createElement('button');
      b.type = 'button';
      if (d.id === id) b.className = 'activo';
      const i = document.createElement('i'); i.style.background = (DP.SERIES[d.grupo] || {}).color || '#888';
      const s = document.createElement('span'); s.textContent = d.nombre;
      b.append(i, s);
      const m = marcaDe(d);
      if (m) { const e = document.createElement('em'); e.className = m; e.textContent = TXT_MARCA[m]; b.appendChild(e); }
      b.onclick = () => elegir(d.id);
      cont.appendChild(b);
    }
    $('cuenta').textContent = `${n} DE ${todos.length} PERSONAJES`;
  }

  // ---------------- elegir o crear ----------------
  function confirmarSalida() { return !sucio || window.confirm('Tienes cambios sin guardar. ¿Descartarlos?'); }
  function cargar(d, nuevo) {
    borrador = copia(d);
    for (const k of ['editado', 'creado', 'retratoVivo', 'oculto']) delete borrador[k];
    borrador.ap = borrador.ap || {}; borrador.ap.extras = borrador.ap.extras || [];
    for (const k of ['gustos', 'zonas', 'rasgos', 'relaciones']) borrador[k] = borrador[k] || {};
    borrador.frases = borrador.frases || []; borrador.alias = borrador.alias || [];
    id = nuevo ? null : d.id;
    serieNueva = null; fotoPrev = null;
    marcarSucio(!!nuevo);
    history.replaceState(null, '', id ? '?id=' + id : location.pathname);
    pintarLista(); pintarFormulario(); pintarBotones(); reconstruir();
  }
  function elegir(nid) {
    if (nid === id || !confirmarSalida()) return;
    const d = todos.find((x) => x.id === nid);
    if (d) cargar(d, false);
  }
  const PLANTILLAS = {
    persona: { tipo: 'humano', ap: { piel: '#f0c8a0', pelo: 'corto', cp: '#3a2a1e', torso: '#3a7ad9', camisa: '#3a7ad9', piernas: '#333a48', zapatos: '#222222' } },
    ia: { tipo: 'ia', ap: { piel: '#5a8ae0', cara: 'pantalla', pantalla: '#101a30', brillo: '#9fe7ff', torso: '#5a8ae0', piernas: '#3a5ab0', zapatos: '#25306a', manos: '#e8f0ff' } },
    gato: { tipo: 'gato', ap: { cuerpo: 'gato', cara: 'gato', piel: '#c8903a', rayas: '#7a4a1a', pecho: '#f8ecd8', ojos: '#5ac84a' }, frases: ['Miau. (Este lugar me pertenece.)', 'Mrrr... (¿Y mi comida?)'] },
    llama: { tipo: 'ia', ap: { cuerpo: 'llama', cara: 'llama', piel: '#c89a6a', torso: '#c89a6a', piernas: '#b0855a', zapatos: '#3b3b3b', ojos: '#151515' } }
  };
  function nuevoDesde(t) {
    if (!confirmarSalida()) return;
    const b = PLANTILLAS[t];
    cargar(Object.assign({ nombre: '', corto: '', serie: 'Vecino del pueblo', grupo: 'vecinos', alias: [], personalidad: '', estilo: '', gustos: {}, zonas: {}, rasgos: { social: 0.7 }, emoBase: 'contento', bebida: 'cafe', frases: ['¡Hola!'], relaciones: {} }, copia(b)), true);
    pestana = 'identidad'; pintarFormulario();
    const n = $('formulario').querySelector('[data-foco]');
    if (n) n.focus();
  }

  // ---------------- formulario ----------------
  const E = (tag, cl, txt) => { const e = document.createElement(tag); if (cl) e.className = cl; if (txt !== undefined) e.textContent = txt; return e; };
  const leerRuta = (r) => r.split('.').reduce((o, k) => (o ? o[k] : undefined), borrador);
  function ponerRuta(r, v) {
    const k = r.split('.'), f = k.pop();
    const o = k.reduce((x, c) => (x[c] = x[c] || {}), borrador);
    if (v === '' || v === undefined || v === null) delete o[f]; else o[f] = v;
    cambio();
  }
  let tModelo = 0;
  const VISUAL = /^(ap|tipo|nombre|serie|grupo|emoBase)/;
  function cambio(ruta) {
    marcarSucio(true);
    clearTimeout(tModelo);
    tModelo = setTimeout(reconstruir, 70);
  }
  function campoTexto(cont, etq, r, opc) {
    opc = opc || {};
    const c = E('div', 'campo'), l = E('label', '', etq), u = 'c-' + r.replace(/\./g, '-'), i = E(opc.largo ? 'textarea' : 'input');
    l.htmlFor = u; i.id = u; i.value = leerRuta(r) || '';
    if (opc.max) i.maxLength = opc.max;
    if (opc.foco) i.dataset.foco = '1';
    if (opc.placeholder) i.placeholder = opc.placeholder;
    i.oninput = () => { ponerRuta(r, i.value); if (opc.alCambiar) opc.alCambiar(i.value); };
    c.append(l, i);
    if (opc.ayuda) c.appendChild(E('small', '', opc.ayuda));
    cont.appendChild(c);
    return i;
  }
  function campoLista(cont, etq, r, ayuda, porLinea) {
    const c = E('div', 'campo'), l = E('label', '', etq), u = 'c-' + r, i = E('textarea');
    l.htmlFor = u; i.id = u;
    const sep = porLinea ? '\n' : ', ';
    i.value = (leerRuta(r) || []).join(sep);
    i.oninput = () => { borrador[r] = i.value.split(porLinea ? /\n/ : /,/).map((s) => s.trim()).filter(Boolean); cambio(); };
    c.append(l, i);
    if (ayuda) c.appendChild(E('small', '', ayuda));
    cont.appendChild(c);
  }
  function campoSelect(cont, etq, r, ops, alCambiar) {
    const c = E('div', 'campo'), l = E('label', '', etq), u = 'c-' + r.replace(/\./g, '-'), s = E('select');
    l.htmlFor = u; s.id = u;
    for (const [v, t] of ops) { const o = E('option', '', t); o.value = v; s.appendChild(o); }
    s.value = leerRuta(r) || '';
    s.onchange = () => { ponerRuta(r, s.value); if (alCambiar) alCambiar(s.value); };
    c.append(l, s); cont.appendChild(c);
    return s;
  }
  function campoRango(cont, etq, r, a, b, def, ayuda) {
    const f = E('div', 'fila'), l = E('label', '', etq), i = E('input'), o = E('output');
    i.type = 'range'; i.min = a; i.max = b; i.step = 0.05;
    const v = leerRuta(r);
    i.value = v === undefined ? def : v;
    i.setAttribute('aria-label', etq);
    if (ayuda) i.title = ayuda;
    o.textContent = NUM_ES(+i.value);
    i.oninput = () => { o.textContent = NUM_ES(+i.value); ponerRuta(r, +i.value); };
    f.append(l, i, o); cont.appendChild(f);
  }
  function campoColores(cont, lista) {
    const g = E('div', 'colores');
    for (const [k, t, def] of lista) {
      const r = 'ap.' + k, v = leerRuta(r), c = E('div', 'color' + (v ? '' : ' vacio')), i = E('input'), s = E('span', '', t), b = E('button', '', 'X');
      i.type = 'color'; i.value = /^#[0-9a-f]{6}$/i.test(v || '') ? v : def; i.setAttribute('aria-label', t);
      b.type = 'button'; b.title = 'Quitar'; b.setAttribute('aria-label', 'Quitar ' + t); b.hidden = !v;
      i.oninput = () => { ponerRuta(r, i.value); c.classList.remove('vacio'); b.hidden = false; };
      b.onclick = () => { ponerRuta(r, ''); c.classList.add('vacio'); b.hidden = true; };
      c.append(i, s, b); g.appendChild(c);
    }
    cont.appendChild(g);
  }
  function campoExtras(cont) {
    const ex = {};
    for (const e of borrador.ap.extras) { const k = e.indexOf(':'); ex[k < 0 ? e : e.slice(0, k)] = k < 0 ? true : e.slice(k + 1); }
    const escribir = () => { borrador.ap.extras = Object.keys(ex).map((k) => (ex[k] === true ? k : k + ':' + ex[k])); cambio(); };
    for (const [titulo, grupo] of EXTRAS) {
      cont.appendChild(E('h3', '', titulo.toUpperCase()));
      const g = E('div', 'chips');
      for (const [k, t, def] of grupo) {
        const c = E('label', 'chip' + (ex[k] ? ' on' : '')), x = E('input');
        x.type = 'checkbox'; x.checked = !!ex[k];
        c.append(x, document.createTextNode(t));
        let col = null;
        if (def) {
          col = E('input'); col.type = 'color'; col.value = typeof ex[k] === 'string' ? ex[k] : def; col.hidden = !ex[k]; col.setAttribute('aria-label', 'Color de ' + t);
          col.onclick = (e) => e.stopPropagation();
          col.oninput = () => { ex[k] = col.value; escribir(); };
          c.appendChild(col);
        }
        x.onchange = () => { if (x.checked) ex[k] = def || true; else delete ex[k]; c.classList.toggle('on', x.checked); if (col) { col.hidden = !x.checked; col.value = def || col.value; } escribir(); };
        g.appendChild(c);
      }
      cont.appendChild(g);
    }
  }
  // lista de "cosa → cuánto" (gustos, zonas favoritas, relaciones)
  function campoPesos(cont, ruta, ops, a, b, def, nombre, paso) {
    const lista = E('div', 'pesos'), add = E('div', 'agregar'), s = E('select'), bt = E('button', '', 'AGREGAR');
    const nom = {}; for (const [k, t] of ops) nom[k] = t;
    const pintar = () => {
      lista.textContent = '';
      const o = borrador[ruta];
      for (const k of Object.keys(o).sort((x, y) => o[y] - o[x])) {
        const f = E('div', 'peso'), n = E('span', '', nom[k] || k), r = E('input'), v = E('output', '', String(o[k])), x = E('button', '', 'X');
        n.title = nom[k] || k; r.type = 'range'; r.min = a; r.max = b; r.step = paso; r.value = o[k]; r.setAttribute('aria-label', nom[k] || k);
        x.type = 'button'; x.setAttribute('aria-label', 'Quitar ' + (nom[k] || k));
        r.oninput = () => { o[k] = +r.value; v.textContent = r.value; cambio(); };
        x.onclick = () => { delete o[k]; cambio(); pintar(); };
        f.append(n, r, v, x); lista.appendChild(f);
      }
      if (!Object.keys(o).length) lista.appendChild(E('span', 'nota', nombre));
    };
    for (const [k, t] of ops) { const o = E('option', '', t); o.value = k; s.appendChild(o); }
    s.setAttribute('aria-label', 'Elegir');
    bt.type = 'button';
    bt.onclick = () => { if (borrador[ruta][s.value] === undefined) { borrador[ruta][s.value] = def; cambio(); pintar(); } };
    add.append(s, bt);
    cont.append(lista, add);
    pintar();
  }

  const PESTANAS = {
    identidad: ['IDENTIDAD', (f) => {
      campoTexto(f, 'NOMBRE COMPLETO', 'nombre', { max: 40, foco: true, placeholder: 'Ej.: Don Ramón', alCambiar: (v) => { if (!id) { const c = $('c-corto'); if (c && !c.dataset.tocado) { c.value = v.split(' ')[0]; borrador.corto = c.value; } } pintarTitulo(); } });
      const co = campoTexto(f, 'NOMBRE CORTO (EL DE LOS GLOBOS)', 'corto', { max: 16 });
      co.addEventListener('input', () => { co.dataset.tocado = '1'; });
      campoTexto(f, 'DE DÓNDE VIENE', 'serie', { max: 60, placeholder: 'Ej.: Mi serie favorita, Vecino del barrio...', ayuda: 'Se muestra en su ficha y la IA lo usa para imaginar quién es.', alCambiar: pintarTitulo });
      const d2 = E('div', 'dos'); f.appendChild(d2);
      campoSelect(d2, 'GRUPO', 'grupo', Object.keys(DP.SERIES).map((g) => [g, DP.SERIES[g].nombre]).concat([['*nuevo', 'Crear grupo nuevo...']]), (v) => { if (v === '*nuevo') { pedirGrupo(); } });
      if (borrador.ap.cuerpo !== 'gato') campoSelect(d2, 'TIPO', 'tipo', TIPOS);
      const bloque = E('div'); bloque.id = 'grupo-nuevo'; f.appendChild(bloque);
      campoLista(f, 'OTROS NOMBRES PARA HABLARLE', 'alias', 'Separados por coma. Así lo encuentras con Ctrl+Alt+H: «ramón, don ramón».');
    }],
    aspecto: ['ASPECTO', (f) => {
      const animal = borrador.ap.cuerpo === 'gato' || borrador.ap.cuerpo === 'llama';
      const d2 = E('div', 'dos'); f.appendChild(d2);
      campoSelect(d2, 'CUERPO', 'ap.cuerpo', CUERPOS, (v) => {
        if (v === 'gato') { borrador.tipo = 'gato'; borrador.ap.cara = 'gato'; } else if (v === 'llama') { borrador.ap.cara = 'llama'; if (borrador.tipo === 'gato') borrador.tipo = 'ia'; } else { if (borrador.tipo === 'gato') borrador.tipo = 'humano'; if (borrador.ap.cara === 'gato' || borrador.ap.cara === 'llama') delete borrador.ap.cara; }
        pintarFormulario();
      });
      if (!animal) {
        campoSelect(d2, 'CARA', 'ap.cara', CARAS, () => pintarFormulario());
        campoSelect(d2, 'PELO', 'ap.pelo', PELOS);
        campoSelect(d2, 'BARBA', 'ap.barba', BARBAS);
      }
      f.appendChild(E('h3', '', 'COLORES'));
      campoColores(f, animal ? COLORES_ANIMAL : COLORES);
      if (animal) { f.appendChild(E('p', 'nota', 'Los animales usan estos colores; las proporciones y accesorios son solo para personas.')); return; }
      if (borrador.ap.cara === 'pantalla' || borrador.ap.cara === 'monitor' || borrador.ap.cara === 'casco') campoColores(f, [['pantalla', 'Fondo de pantalla', '#101418'], ['brillo', 'Luz de la pantalla', '#9fe7ff'], ['cabezaColor', 'Carcasa', '#f1e4d6'], ['manos', 'Manos', '#e8f0ff']]);
      f.appendChild(E('h3', '', 'PROPORCIONES'));
      for (const [k, t, a, b] of PROPORCIONES) campoRango(f, t, 'ap.' + k, a, b, 1);
      const m = E('label', 'chip' + (borrador.ap.brazosPiel ? ' on' : '')), x = E('input');
      x.type = 'checkbox'; x.checked = !!borrador.ap.brazosPiel;
      x.onchange = () => { ponerRuta('ap.brazosPiel', x.checked || ''); m.classList.toggle('on', x.checked); };
      m.append(x, document.createTextNode('Manga corta'));
      const y = E('label', 'chip' + (borrador.ap.faldaLarga ? ' on' : '')), z = E('input');
      z.type = 'checkbox'; z.checked = !!borrador.ap.faldaLarga;
      z.onchange = () => { ponerRuta('ap.faldaLarga', z.checked || ''); y.classList.toggle('on', z.checked); };
      y.append(z, document.createTextNode('Falda larga'));
      const ch = E('div', 'chips'); ch.append(m, y); f.appendChild(ch);
      campoSelect(f, 'LOGO EN EL PECHO', 'ap.logo', LOGOS);
      campoExtras(f);
    }],
    caracter: ['CARÁCTER', (f) => {
      campoTexto(f, 'PERSONALIDAD', 'personalidad', { largo: true, max: 600, ayuda: 'Quién es y qué le importa. La IA actúa a partir de esto.' });
      campoTexto(f, 'CÓMO HABLA', 'estilo', { largo: true, max: 300, ayuda: 'Muletillas, tono, frases típicas.' });
      campoLista(f, 'FRASES', 'frases', 'Una por línea. Las dice cuando la IA está apagada.', true);
      const d2 = E('div', 'dos'); f.appendChild(d2);
      campoSelect(d2, 'ÁNIMO HABITUAL', 'emoBase', EMOS);
      campoSelect(d2, 'BEBIDA', 'bebida', BEBIDAS);
      f.appendChild(E('h3', '', 'RASGOS'));
      for (const [k, t, a, b, def, ayuda] of RASGOS) campoRango(f, t, 'rasgos.' + k, a, b, def, ayuda);
      const ch = E('div', 'chips');
      for (const [k, t] of [['nocturno', 'Trasnochador'], ['dormilon', 'Dormilón'], ['irritable', 'Se enoja con hambre']]) {
        const c = E('label', 'chip' + (borrador.rasgos[k] ? ' on' : '')), x = E('input');
        x.type = 'checkbox'; x.checked = !!borrador.rasgos[k];
        x.onchange = () => { ponerRuta('rasgos.' + k, x.checked || ''); c.classList.toggle('on', x.checked); };
        c.append(x, document.createTextNode(t)); ch.appendChild(c);
      }
      f.appendChild(ch);
    }],
    vida: ['VIDA', (f) => {
      campoSelect(f, 'DÓNDE VIVE', 'region', REGIONES);
      f.appendChild(E('p', 'nota', 'Si eliges un lugar, trabaja, ronda y duerme ahí y no sale de esa zona.'));
      f.appendChild(E('h3', '', 'LO QUE LE GUSTA HACER'));
      campoPesos(f, 'gustos', ACTIVIDADES, -3, 7, 3, 'Sin gustos: hará lo que necesite en cada momento.', 1);
      f.appendChild(E('h3', '', 'SUS LUGARES FAVORITOS'));
      campoPesos(f, 'zonas', ZONAS, -3, 5, 2, 'Sin lugares favoritos.', 1);
    }],
    amigos: ['RELACIONES', (f) => {
      f.appendChild(E('p', 'nota', 'De -100 (enemigos) a 100 (inseparables). Cambian solos con el tiempo según cómo les vaya.'));
      campoPesos(f, 'relaciones', todos.filter((d) => d.id !== id).map((d) => [d.id, d.nombre]), -100, 100, 40, 'Todavía no conoce a nadie.', 5);
    }],
    foto: ['FOTO', (f) => {
      f.appendChild(E('p', 'nota', 'La foto sale en su ficha. Si no pones ninguna, se usa su retrato 3D. Las fotos originales no se borran.'));
      const c = E('div', 'foto'), img = E('img'), col = E('div', 'campo'), l = E('label', '', 'ELEGIR IMAGEN'), i = E('input'), q = E('button', '', 'QUITAR FOTO');
      img.alt = 'Foto del personaje';
      const actual = fotoPrev || (borrador.foto ? borrador.foto : (id && !(todos.find((x) => x.id === id) || {}).creado ? `fotos/${id}.png` : ''));
      if (actual) img.src = actual; else img.style.visibility = 'hidden';
      img.onerror = () => { img.style.visibility = 'hidden'; };
      i.type = 'file'; i.accept = 'image/*'; i.id = 'c-foto'; l.htmlFor = 'c-foto'; q.type = 'button'; q.hidden = !borrador.foto;
      q.onclick = () => { delete borrador.foto; fotoPrev = null; cambio(); pintarFormulario(); };
      i.onchange = () => { if (i.files[0]) leerFoto(i.files[0]); };
      col.append(l, i, E('small', '', 'Se recorta al centro y se guarda en 256x256.'), q);
      c.append(img, col); f.appendChild(c);
    }]
  };
  function leerFoto(archivo) {
    const u = URL.createObjectURL(archivo), im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const l = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - l) / 2, (im.height - l) / 2, l, l, 0, 0, 256, 256);
      URL.revokeObjectURL(u);
      fotoPrev = c.toDataURL('image/png');
      cambio(); pintarFormulario();
    };
    im.onerror = () => { URL.revokeObjectURL(u); aviso('Esa imagen no se pudo abrir.', true); };
    im.src = u;
  }
  function pedirGrupo() {
    const b = $('grupo-nuevo');
    b.textContent = '';
    serieNueva = { id: 'grupo_' + Date.now().toString(36), nombre: '', color: '#3a8ae0' };
    const f = E('div', 'fila'), n = E('input'), c = E('input');
    n.placeholder = 'Nombre del grupo nuevo'; n.setAttribute('aria-label', 'Nombre del grupo nuevo'); n.maxLength = 40;
    c.type = 'color'; c.value = serieNueva.color; c.setAttribute('aria-label', 'Color del grupo');
    n.oninput = () => { serieNueva.nombre = n.value; marcarSucio(true); };
    c.oninput = () => { serieNueva.color = c.value; marcarSucio(true); };
    f.append(n, c); b.appendChild(f); n.focus();
  }
  function pintarFormulario() {
    const nav = $('pestanas'), f = $('formulario');
    nav.textContent = '';
    for (const k in PESTANAS) { const b = E('button', k === pestana ? 'on' : '', PESTANAS[k][0]); b.type = 'button'; b.onclick = () => { pestana = k; pintarFormulario(); }; nav.appendChild(b); }
    f.textContent = '';
    if (borrador) PESTANAS[pestana][1](f);
    f.scrollTop = 0;
    pintarTitulo();
  }
  function pintarTitulo() {
    if (!borrador) return;
    $('vista-nombre').textContent = (borrador.nombre || 'SIN NOMBRE').toUpperCase();
    $('vista-serie').textContent = (borrador.serie || '').toUpperCase();
    const d = todos.find((x) => x.id === id);
    $('vista-marca').textContent = !id ? 'SIN GUARDAR' : TXT_MARCA[marcaDe(d || {})] || '';
  }
  function pintarBotones() {
    const d = todos.find((x) => x.id === id);
    const original = !!id && !!d && !d.creado;
    $('btn-duplicar').disabled = !id;
    $('btn-ver').disabled = !id || !!(d && d.oculto);
    $('btn-restaurar').hidden = !original; $('btn-restaurar').disabled = !(d && (d.editado || d.oculto));
    $('btn-ocultar').hidden = !original; $('btn-ocultar').textContent = d && d.oculto ? 'VOLVER AL PUEBLO' : 'OCULTAR';
    $('btn-borrar').hidden = !(d && d.creado);
  }

  // ---------------- acciones ----------------
  async function guardar() {
    if (!borrador.nombre || !borrador.nombre.trim()) { pestana = 'identidad'; pintarFormulario(); aviso('Ponle un nombre antes de guardar.', true); return; }
    if (borrador.grupo === '*nuevo' && !(serieNueva && serieNueva.nombre)) { aviso('Ponle nombre al grupo nuevo.', true); return; }
    try {
      const d = copia(borrador);
      if (d.grupo === '*nuevo') d.grupo = serieNueva.id;
      if (id) d.id = id; else delete d.id;
      let r = await api('guardar', { d, serieNueva: borrador.grupo === '*nuevo' ? serieNueva : null });
      if (fotoPrev) {
        const f = await api('foto', { id: r.id, png: fotoPrev });
        d.foto = f.foto; d.id = r.id;
        r = await api('guardar', { d });
      }
      await refrescar();
      const nd = todos.find((x) => x.id === r.id);
      cargar(nd, false);
      aviso(`${nd.nombre.toUpperCase()} YA ESTÁ EN EL PUEBLO`);
    } catch (e) { aviso(e.message, true); }
  }
  async function refrescar() {
    const r = await fetch('/api/editor').then((x) => x.json());
    P = r.datos;
    actualizarTodos(); pintarFiltro(); pintarLista();
  }
  async function accion(ruta, cuerpo, msg, siguiente) {
    try {
      await api(ruta, cuerpo);
      await refrescar();
      marcarSucio(false);
      const d = todos.find((x) => x.id === (siguiente || id)) || todos[0];
      cargar(d, false);
      aviso(msg);
    } catch (e) { aviso(e.message, true); }
  }

  // ---------------- vista 3D ----------------
  let render, escena, camara, rig = null, ang = 0.55, animando = 'quieto', emo = 'contento', arrastre = null, fijo = false, ultimo = 0, altoVista = 1.8;
  const ANIMS = [['quieto', 'QUIETO'], ['caminar', 'CAMINAR'], ['saludar', 'SALUDAR'], ['bailar', 'BAILAR']];
  function iniciarVista() {
    const L = $('lienzo');
    render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    render.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    render.outputColorSpace = THREE.SRGBColorSpace;
    render.toneMapping = THREE.ACESFilmicToneMapping;
    render.toneMappingExposure = 1.1;
    render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
    L.appendChild(render.domElement);
    escena = new THREE.Scene();
    camara = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
    escena.add(new THREE.HemisphereLight(0xe8f4ff, 0x8a7a5a, 1.9));
    const sol = new THREE.DirectionalLight(0xfff2e0, 2.6);
    sol.position.set(3, 7, 5); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
    sol.shadow.bias = -0.0008; sol.shadow.normalBias = 0.02;
    escena.add(sol);
    // base con botones de bloque
    const G = new PA.Geo.Lote();
    G.cajaB(0, -0.3, 0, 4, 0.3, 4, '#7cc25c');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) G.cil(-1.75 + i * 0.5, 0, -1.75 + j * 0.5, 0.15, 0.06, (i + j) % 2 ? '#86cc66' : '#7cc25c', 10);
    const b = G.malla(PA.Geo.MAT.solido); b.castShadow = false; b.receiveShadow = true;
    escena.add(b);
    const ajustar = () => { const w = L.clientWidth || 400, h = L.clientHeight || 400; render.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); };
    addEventListener('resize', ajustar);
    ajustar();
    const cv = render.domElement;
    cv.addEventListener('pointerdown', (e) => { arrastre = { x: e.clientX, a: ang }; fijo = true; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (arrastre) ang = arrastre.a - (e.clientX - arrastre.x) * 0.012; });
    cv.addEventListener('pointerup', () => { arrastre = null; });
    requestAnimationFrame(bucle);
  }
  function reconstruir() {
    if (!borrador || !escena) return;
    if (rig) { escena.remove(rig.raiz); rig.raiz.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); if (rig.cara) rig.cara.tex.dispose(); }
    try { rig = PA.Modelos.crear(Object.assign({ id: id || 'nuevo' }, borrador)); }
    catch (e) { rig = null; console.warn('modelo', e); return; }
    rig.raiz.traverse((o) => { if (o.isMesh && o.material.visible !== false) o.castShadow = true; });
    escena.add(rig.raiz);
    if (rig.cara) rig.cara.clave = '';
    altoVista = rig.dims.alto || 1.4;
  }
  function animar(t) {
    const r = rig, s = Math.sin;
    if (r.tipo !== 'humano') {
      if (r.patas) r.patas.forEach((p, i) => { p.rotation.x = animando === 'caminar' ? s(t * 8 + i * Math.PI) * 0.55 : 0; });
      r.raiz.position.y = animando === 'bailar' ? Math.abs(s(t * 6)) * 0.14 : 0;
      r.raiz.rotation.y = animando === 'bailar' ? s(t * 3) * 0.4 : 0;
      return;
    }
    let pI = 0, pD = 0, bI = 0, bD = 0, bIz = 0, bDz = 0, y = 0, tz = 0;
    if (animando === 'caminar') { const f = s(t * 7); pI = f * 0.6; pD = -f * 0.6; bI = -f * 0.5; bD = f * 0.5; y = Math.abs(s(t * 7)) * 0.03; }
    else if (animando === 'saludar') { bD = -2.7 + s(t * 9) * 0.05; bDz = -0.25 + s(t * 9) * 0.3; bI = s(t * 1.8) * 0.04; }
    else if (animando === 'bailar') { const f = s(t * 6); bI = -1.6 + f * 0.8; bD = -1.6 - f * 0.8; bIz = 0.4; bDz = -0.4; pI = f * 0.25; pD = -f * 0.25; y = Math.abs(f) * 0.08; tz = f * 0.1; }
    else { bI = s(t * 1.7) * 0.04; bD = -s(t * 1.7) * 0.04; y = s(t * 1.7) * 0.006; }
    r.piernaI.rotation.x = pI; r.piernaD.rotation.x = pD;
    r.brazoI.rotation.x = bI; r.brazoD.rotation.x = bD; r.brazoI.rotation.z = bIz; r.brazoD.rotation.z = bDz;
    r.cuerpo.position.y = y; r.torso.rotation.z = tz;
    r.cabeza.rotation.y = s(t * 0.7) * 0.1;
  }
  function bucle(ms) {
    requestAnimationFrame(bucle);
    const dt = Math.min(0.05, (ms - ultimo) / 1000 || 0.016);
    ultimo = ms;
    // se mece mostrando la cara; arrastrando con el mouse se gira a mano
    if (!fijo) ang = 0.35 + Math.sin(ms / 2600) * 0.5;
    const h = altoVista, d = 4.4 + h * 1.9;
    camara.position.set(Math.sin(ang) * d, h * 0.62 + 0.5, Math.cos(ang) * d);
    camara.lookAt(0, h * 0.5, 0);
    if (rig) {
      animar(ms / 1000);
      if (rig.cara) PA.Caras.dibujar(rig.cara, emo, false, (ms % 3600) < 130, false);
    }
    render.render(escena, camara);
  }
  const AL = (l) => l[Math.floor(Math.random() * l.length)];
  function aspectoAzar() {
    const pieles = ['#f6d7b8', '#f0c8a0', '#e0b090', '#c99a72', '#a87a58', '#8a5a3a', '#5e3c28'], pelos = ['#1a1410', '#3a2a1e', '#6a3a22', '#c0603a', '#d8b860', '#a0a0a8', '#f0ece0'];
    const ropa = ['#d64541', '#3a7ad9', '#5aa046', '#f2c230', '#7a4fa8', '#2fb0a8', '#e0457b', '#3a3f4a', '#f4f4f0', '#e8742a'];
    const a = borrador.ap;
    if (a.cuerpo === 'gato' || a.cuerpo === 'llama') { a.piel = AL(['#8f7f66', '#c8903a', '#3a3a40', '#f4f1ea', '#a8a8b0']); a.ojos = AL(['#b8c43c', '#5ac84a', '#3a8ae0']); if (a.rayas) a.rayas = AL(['#3d3428', '#7a4a1a', '#1a1a1e']); }
    else {
      a.piel = AL(pieles); a.pelo = AL(PELOS.slice(1).map((p) => p[0])); a.cp = AL(pelos); a.ojos = AL(['#3a2a1e', '#2a5a8a', '#3a7a4a', '#1a1a1e']);
      a.torso = AL(ropa); a.camisa = a.torso; a.piernas = AL(['#333a48', '#3a4a63', '#2a2a2e', '#5a5f68', '#6a5a48']); a.zapatos = AL(['#222222', '#f4f4f0', '#5a3a22', '#c8202a']);
      delete a.barba; delete a.chaqueta; delete a.abrigo; delete a.falda; delete a.shorts;
      if (Math.random() < 0.3) { a.barba = AL(BARBAS.slice(1).map((p) => p[0])); a.cb = a.cp; }
      if (Math.random() < 0.25) a.chaqueta = AL(ropa);
      a.alto = +(0.85 + Math.random() * 0.3).toFixed(2); a.ancho = +(0.85 + Math.random() * 0.35).toFixed(2);
      a.extras = (a.extras || []).filter((e) => !/^(gorra|gafas|gafas_sol|audifonos|mochila)/.test(e));
      if (Math.random() < 0.3) a.extras.push('gorra:' + AL(ropa));
      if (Math.random() < 0.2) a.extras.push('gafas');
    }
    cambio();
    if (pestana === 'aspecto') pintarFormulario();
  }

  // ---------------- arranque ----------------
  async function iniciar() {
    iniciarVista();
    const ag = $('animaciones');
    for (const [k, t] of ANIMS) { const b = E('button', k === animando ? 'on' : '', t); b.type = 'button'; b.onclick = () => { animando = k; for (const x of ag.children) x.classList.toggle('on', x === b); }; ag.appendChild(b); }
    const se = $('emocion');
    for (const [k, t] of EMOS) { const o = E('option', '', t); o.value = k; se.appendChild(o); }
    se.value = emo; se.onchange = () => { emo = se.value; };
    const pl = $('plantillas');
    for (const [k, t] of [['persona', 'PERSONA'], ['ia', 'ROBOT'], ['gato', 'GATO'], ['llama', 'LLAMA']]) { const b = E('button', '', t); b.type = 'button'; b.onclick = () => nuevoDesde(k); pl.appendChild(b); }
    $('btn-nuevo').onclick = () => nuevoDesde('persona');
    $('buscar').oninput = pintarLista; $('filtro').onchange = pintarLista;
    $('btn-azar').onclick = aspectoAzar;
    $('btn-guardar').onclick = guardar;
    $('btn-ver').onclick = () => api('ubicar', { id }).then(() => aviso('MIRA EL FONDO DE PANTALLA')).catch((e) => aviso(e.message, true));
    $('btn-duplicar').onclick = () => { if (!confirmarSalida()) return; const d = copia(borrador); d.nombre += ' (copia)'; d.corto = d.nombre.slice(0, 16); delete d.foto; cargar(d, true); };
    $('btn-restaurar').onclick = () => { if (window.confirm('¿Volver al personaje original? Se pierden los cambios que le hiciste.')) accion('restaurar', { id }, 'PERSONAJE RESTAURADO'); };
    $('btn-ocultar').onclick = () => { const d = todos.find((x) => x.id === id); accion('ocultar', { id, oculto: !d.oculto }, d.oculto ? 'VOLVIÓ AL PUEBLO' : 'YA NO ESTÁ EN EL PUEBLO. SUS RECUERDOS SE GUARDAN'); };
    $('btn-borrar').onclick = () => { if (window.confirm(`¿Borrar a ${borrador.nombre}? No se puede deshacer.`)) accion('borrar', { id }, 'PERSONAJE BORRADO', 'omar'); };
    addEventListener('beforeunload', (e) => { if (sucio) { e.preventDefault(); e.returnValue = ''; } });
    addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (sucio) guardar(); } });
    try {
      await refrescar();
      $('estado-editor').textContent = 'LO QUE GUARDES APARECE AL INSTANTE EN EL PUEBLO';
    } catch (e) {
      $('estado-editor').textContent = 'SIN CEREBRO: ABRE ESTA PÁGINA DESDE HTTP://127.0.0.1:8787/EDITOR';
      $('estado-editor').className = 'mal';
      actualizarTodos(); pintarFiltro(); pintarLista();
    }
    const q = new URLSearchParams(location.search).get('id');
    cargar(todos.find((d) => d.id === q) || todos.find((d) => d.id === 'omar') || todos[0], false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
