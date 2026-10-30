/* Pueblo Agéntico — íconos en pixel art (en vez de emojis). Cada ícono es un mapa de letras → colores. */
window.PA = window.PA || {};
PA.Iconos = (function () {
  'use strict';
  const PAL = {
    k: '#2b1b10', w: '#fff6dd', W: '#f4f0d8', r: '#d9473b', R: '#ff8a72', y: '#e8a91a', Y: '#ffe07a', b: '#3a7ad9', B: '#9ad4ff',
    g: '#4f8a32', G: '#9ad06a', p: '#c86ad9', o: '#e8873a', s: '#f2c29a', S: '#c98f62', n: '#7a4e2c', c: '#c9c3a0', e: '#5a5f6a', E: '#a9b0bc'
  };
  const M = {
    sol: ['....y....', '.y..y..y.', '...yyy...', '..yYYYy..', 'yyyYYYyyy', '..yYYYy..', '...yyy...', '.y..y..y.', '....y....'],
    luna: ['...ccc...', '..cWWc...', '.cWWc....', '.cWWc....', '.cWWc....', '.cWWWc...', '..cWWWWc.', '...cccc..'],
    energia: ['....yy.', '...yY..', '..yY...', '.yYYYy.', '...Yy..', '..Yy...', '.yy....'],
    comida: ['....g...', '...g....', '.rr.rr..', 'rRrrrrr.', 'rRrrrrr.', 'rrrrrrr.', '.rrrrr..', '..r.r...'],
    diversion: ['....y....', '...yYy...', 'yyyYYYyyy', '.yYYYYYy.', '..yYYYy..', '..yY.Yy..', '.yy...yy.'],
    social: ['.kkkkkkk.', 'kwwwwwwwk', 'kwkwkwkwk', 'kwwwwwwwk', '.kkkkkkk.', '..kk.....', '.k.......'],
    calma: ['......gg', '....gGGg', '..gGGGg.', '.gGGGg..', '.gGGg...', 'gGgg....', 'gg......'],
    saludar: ['.s.s.s..', '.s.s.s.s', '.s.s.s.s', '.sssssss', 'ssssssss', '.ssssss.', '..ssss..'],
    hablar: ['.kkkkkkk.', 'kwwwwwwwk', 'kwwwwwwwk', 'kwkkkkkwk', 'kwwwwwwwk', '.kkkkkkk.', '.....kk..', '......k..'],
    pizza: ['oooooooo', 'oyyyyyyo', '.yyrryy.', '.yyyyyy.', '..yryy..', '..yyyy..', '...yy...'],
    control: ['.kkkkkkkk.', 'kwkwwwwrwk', 'kkkwwwrwrk', 'kwkwwwwrwk', 'kkwwkkwwkk', '.kk....kk.'],
    dormir: ['....bbbb', '......b.', '.....b..', 'bbb.bbbb', '..b.....', '.b......', 'bbb.....'],
    seguir: ['..kkkkk..', '.kwwbwwk.', 'kwwbkbwwk', '.kwwbwwk.', '..kkkkk..'],
    cerrar: ['k.....k', '.k...k.', '..k.k..', '...k...', '..k.k..', '.k...k.', 'k.....k'],
    ayuda: ['.kkkk.', 'kk..kk', '....kk', '...kk.', '..kk..', '......', '..kk..'],
    lupa: ['..kkkk...', '.kBBBBk..', 'kBwBBBBk.', 'kBBBBBBk.', 'kBBBBBBk.', '.kBBBBk..', '..kkkkkk.', '......kkk', '.......kk'],
    lapiz: ['......kk', '.....krk', '....kyk.', '...kyk..', '..kyk...', '.kyk....', 'kwk.....', 'kk......'],
    engranaje: ['...ee...', '.e.ee.e.', '.eeEEee.', 'eeE..Eee', 'eeE..Eee', '.eeEEee.', '.e.ee.e.', '...ee...'],
    exclamacion: ['.r.', 'rRr', 'rRr', 'rRr', '.r.', '...', '.r.', 'rrr'],
    pregunta: ['.bbbb.', 'bb..bb', '....bb', '...bb.', '..bb..', '......', '..bb..', '..bb..'],
    corazon: ['.rr.rr.', 'rRRrrrr', 'rRrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    enojo: ['.rr.rr.', 'r.....r', 'r.....r', '.......', 'r.....r', 'r.....r', '.rr.rr.'],
    gota: ['..b..', '..b..', '.bBb.', '.bBb.', 'bBBBb', 'bBBBb', '.bbb.'],
    lagrima: ['.b.', 'bBb', 'bBb', '.b.'],
    nota: ['...kkk', '...k.k', '...k..', '...k..', '.kkk..', 'kkkk..', '.kk...'],
    brillo: ['...y...', '...y...', '..yYy..', 'yyYYYyy', '..yYy..', '...y...', '...y...'],
    puntos: ['.......', 'k.k.k..', '.......'],
    estrella: ['...y...', '..yYy..', 'yyYYYyy', '.yYYYy.', '.yy.yy.'],
    pesa: ['ee.....ee', 'eEkkkkkEe', 'eEkkkkkEe', 'ee.....ee'],
    huella: ['.kk.k', 'kkk..', 'kkk.k', '.kk..', '..kk.', '.kkkk', '.kkkk', '..kk.'],
    maletin: ['..kkk..', '.k...k.', 'nnnnnnn', 'nSSSSSn', 'nnnknnn', 'nSSSSSn', 'nnnnnnn'],
    mas: ['..kk..', '..kk..', 'kkkkkk', 'kkkkkk', '..kk..', '..kk..'],
    menos: ['......', '......', 'kkkkkk', 'kkkkkk', '......', '......'],
    casa: ['...k...', '..kwk..', '.kwwwk.', 'kwwwwwk', '.kwkwk.', '.kwkwk.', '.kkkkk.'],
    nube: ['...EE...', '..EwwE..', '.EwwwwEE', 'EwwwwwwE', 'EEEEEEEE'],
    lluvia: ['...EE...', '..EwwE..', '.EwwwwEE', 'EwwwwwwE', 'EEEEEEEE', '.b..b..b', 'b..b..b.'],
    tormenta: ['...ee...', '..eEEe..', '.eEEEEee', 'eEEEEEEe', 'eeeyeeee', '...yy...', '..yy....', '...y....'],
    nieve: ['...B...', '.B.B.B.', '..BBB..', 'BBBwBBB', '..BBB..', '.B.B.B.', '...B...'],
    niebla: ['.EEEEEE.', '........', 'EEEEEEE.', '........', '.EEEEEEE', '........', 'EEEEEE..'],
    hoja: ['....oo.', '...ooo.', '..oyoo.', '.ooyo..', '.oyo...', 'n.o....', 'n......'],
    flor: ['..R.R..', '.RRyRR.', '..RRR..', '...g...', '..gg...', '...g...'],
    calabaza: ['....g....', '..ooooo..', '.ooooooo.', 'ooyoooyoo', 'ooooooooo', 'ooyyyyyoo', '.ooooooo.', '..ooooo..'],
    navidad: ['...y...', '...g...', '..ggg..', '.gRgGg.', '..ggg..', '.ggygg.', 'ggGgggg', '...n...'],
    fuegos: ['p..y..p', '.p.y.p.', '..pyp..', 'yyyYyyy', '..pyp..', '.p.y.p.', 'p..y..p'],
    cine: ['kkkkkkk', 'kwkwkwk', 'kkkkkkk', 'kBBBBBk', 'kBBBBBk', 'kkkkkkk', 'kwkwkwk', 'kkkkkkk'],
    redjohn: ['..rrrrr..', '.r.....r.', 'r..r.r..r', 'r..r.r..r', 'r.......r', 'r.r...r.r', 'r..rrr..r', '.r.....r.', '..rrrrr..', '..r.r.r..']
  };
  const cache = {};
  function svg(nombre, escala) {
    const k = nombre + ':' + (escala || 2);
    if (cache[k]) return cache[k];
    const m = M[nombre] || M.puntos, e = escala || 2;
    const h = m.length, w = Math.max(...m.map((f) => f.length));
    let rects = '';
    m.forEach((fila, y) => { for (let x = 0; x < fila.length; x++) { const c = PAL[fila[x]]; if (c) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`; } });
    const s = `<svg class="ico" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * e}" height="${h * e}" shape-rendering="crispEdges">${rects}</svg>`;
    cache[k] = s;
    return s;
  }
  const EMOCION = {
    enojado: 'enojo', sorprendido: 'exclamacion', asustado: 'gota', nervioso: 'gota', enamorado: 'corazon', triste: 'lagrima', lloroso: 'lagrima',
    confundido: 'pregunta', riendo: 'brillo', emocionado: 'brillo', pensativo: 'puntos', cansado: 'dormir', dormido: 'dormir', orgulloso: 'estrella',
    feliz: 'nota', avergonzado: 'gota', decidido: 'exclamacion', sereno: 'calma'
  };
  const CLIMA = { despejado: 'sol', nublado: 'nube', lluvia: 'lluvia', tormenta: 'tormenta', nieve: 'nieve', niebla: 'niebla' };
  const ESTACION = { primavera: 'flor', verano: 'sol', otono: 'hoja', invierno: 'nieve' };
  const EVENTO = { halloween: 'calabaza', navidad: 'navidad', anio_nuevo: 'fuegos', san_valentin: 'corazon', concierto: 'nota', cine: 'cine', red_john: 'redjohn', estrellas_fugaces: 'estrella' };
  const GRUPO = { comer: 'pizza', dormir: 'dormir', jugar: 'control', musica: 'nota', bailar: 'nota', entrenar: 'pesa', relajarse: 'calma', trabajar: 'maletin', pasear: 'huella' };
  return { svg, EMOCION, GRUPO, CLIMA, ESTACION, EVENTO, existe: (n) => !!M[n] };
})();
