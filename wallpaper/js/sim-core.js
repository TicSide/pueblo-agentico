/* Pueblo Agéntico — núcleo de la simulación.
 * Se usa igual en el navegador (modo sin cerebro) y en Node (el cerebro).
 * Maneja necesidades, decisiones (IA de utilidad tipo "Los Sims"), charlas y memoria.
 * No dibuja nada: emite eventos ({t:'orden'|'decir'|'emocion'|'charla'|'fin_charla'|'log'}). */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.SimCore = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NECESIDADES = ['energia', 'comida', 'diversion', 'social', 'calma'];
  const NOMBRE_NEC = { energia: 'Energía', comida: 'Comida', diversion: 'Diversión', social: 'Social', calma: 'Calma' };
  // Cuánto baja cada necesidad por minuto (se multiplica por los rasgos del personaje)
  const DECAE = { energia: 0.45, comida: 0.7, diversion: 0.9, social: 0.7, calma: 0.55 };

  const EMOCIONES = ['neutral', 'contento', 'feliz', 'riendo', 'emocionado', 'sereno', 'triste', 'lloroso',
    'enojado', 'sorprendido', 'asustado', 'pensativo', 'picaro', 'enamorado', 'cansado', 'dormido',
    'aburrido', 'confundido', 'orgulloso', 'avergonzado', 'nervioso', 'serio', 'decidido'];

  const GENTE = ['humano', 'ia', 'androide'];
  const TODOS = ['humano', 'ia', 'androide', 'gato'];

  // Catálogo de actividades: ef = efecto por minuto en cada necesidad
  const ACT = {
    comer: { txt: 'Comiendo', txtEn: 'Comiendo en {lugar}', grupo: 'comer', ef: { comida: 10, social: 1, diversion: 0.5 }, dur: [60, 150], social: true, emo: 'feliz' },
    banquete: { txt: 'En el banquete', grupo: 'comer', ef: { comida: 11, social: 2 }, dur: [70, 160], social: true, emo: 'feliz' },
    helado: { txt: 'Tomando un helado', grupo: 'comer', ef: { comida: 5, diversion: 3, social: 1 }, dur: [40, 80], social: true, emo: 'feliz' },
    tomar_te: { txt: 'Tomando algo en la tetería', grupo: 'comer', ef: { comida: 3, calma: 5, social: 1.5 }, dur: [50, 120], social: true, emo: 'sereno' },
    cocinar: { txt: 'Cocinando', txtEn: 'Cocinando en {lugar}', grupo: 'trabajar', ef: { diversion: 3, comida: 2, energia: -1 }, dur: [60, 140], social: true, emo: 'decidido' },
    dormir: { txt: 'Durmiendo', txtEn: 'Durmiendo en {lugar}', grupo: 'dormir', ef: { energia: 7, calma: 2 }, dur: [300, 900], dormir: true },
    recargar: { txt: 'Recargando batería', grupo: 'dormir', ef: { energia: 9 }, dur: [180, 500], dormir: true, tipos: ['ia', 'androide'] },
    siesta: { txt: 'Tomando una siesta', grupo: 'dormir', ef: { energia: 5, calma: 2 }, dur: [120, 300], dormir: true, tipos: TODOS },
    sofa_jane: { txt: 'Echado en el sofá de cuero', grupo: 'relajarse', ef: { calma: 6, energia: 3 }, dur: [90, 240], emo: 'sereno' },
    jugar_consola: { txt: 'Jugando videojuegos', txtEn: 'Jugando videojuegos en {lugar}', grupo: 'jugar', ef: { diversion: 9, social: 1.5, energia: -0.5 }, dur: [90, 240], social: true, emo: 'emocionado' },
    arcade: { txt: 'Jugando en el arcade', grupo: 'jugar', ef: { diversion: 9, energia: -1 }, dur: [60, 150], emo: 'emocionado' },
    pingpong: { txt: 'Jugando ping-pong', grupo: 'jugar', ef: { diversion: 8, social: 3, energia: -2 }, dur: [60, 140], social: true, emo: 'decidido' },
    ajedrez: { txt: 'Jugando ajedrez', grupo: 'jugar', ef: { diversion: 6, social: 3, calma: 1 }, dur: [90, 220], social: true, emo: 'pensativo' },
    trono: { txt: 'Sentado en el Trono de Hierro', grupo: 'jugar', ef: { diversion: 6, calma: -1 }, dur: [40, 100], emo: 'orgulloso' },
    guitarra: { txt: 'Tocando la guitarra', grupo: 'musica', ef: { diversion: 8, calma: 2, energia: -0.5 }, dur: [60, 160], emo: 'feliz' },
    bateria: { txt: 'Tocando la batería', grupo: 'musica', ef: { diversion: 10, calma: 1, energia: -1 }, dur: [50, 120], emo: 'emocionado' },
    teclado: { txt: 'Tocando el teclado', grupo: 'musica', ef: { diversion: 7, calma: 3 }, dur: [60, 150], emo: 'sereno' },
    cantar: { txt: 'Cantando en el escenario', grupo: 'musica', ef: { diversion: 9, social: 2, energia: -1 }, dur: [45, 110], emo: 'emocionado' },
    publico: { txt: 'Viendo el concierto', grupo: 'musica', ef: { diversion: 6, social: 2 }, dur: [40, 100], social: true, emo: 'feliz' },
    bailar: { txt: 'Bailando', grupo: 'bailar', ef: { diversion: 8, social: 3, energia: -2 }, dur: [40, 110], social: true, emo: 'feliz' },
    banca: { txt: 'Descansando en una banca', grupo: 'relajarse', ef: { calma: 4, energia: 1.5, social: 1.5 }, dur: [60, 150], social: true, tipos: TODOS },
    fuente: { txt: 'Mirando la fuente', grupo: 'relajarse', ef: { calma: 4, diversion: 1 }, dur: [30, 70], emo: 'sereno' },
    pasear: { txt: 'Paseando', grupo: 'pasear', ef: { calma: 2, diversion: 1 }, dur: [12, 35], tipos: TODOS, libre: true },
    programar: { txt: 'Programando', grupo: 'trabajar', ef: { diversion: 4, energia: -1, calma: -0.5 }, dur: [90, 260], emo: 'decidido' },
    servidores: { txt: 'Revisando los servidores', grupo: 'trabajar', ef: { diversion: 3 }, dur: [50, 120], emo: 'pensativo' },
    editar_video: { txt: 'Editando un video', grupo: 'trabajar', ef: { diversion: 5, energia: -1 }, dur: [90, 240], emo: 'decidido' },
    grabar: { txt: 'Grabando para YouTube', grupo: 'trabajar', ef: { diversion: 7, social: 4, energia: -1 }, dur: [60, 150], emo: 'emocionado' },
    podcast: { txt: 'Grabando un pódcast', grupo: 'trabajar', ef: { diversion: 5, social: 6 }, dur: [90, 200], social: true },
    investigar: { txt: 'Investigando un caso', txtEn: 'Investigando en {lugar}', grupo: 'trabajar', ef: { diversion: 5, calma: -1 }, dur: [80, 200], emo: 'pensativo' },
    papeleo: { txt: 'Trabajando en el escritorio', grupo: 'trabajar', ef: { diversion: 1, calma: 1, energia: -0.5 }, dur: [80, 200], emo: 'serio' },
    reunion: { txt: 'En reunión del equipo', grupo: 'trabajar', ef: { social: 5, diversion: 2 }, dur: [80, 180], social: true, emo: 'serio' },
    leer: { txt: 'Leyendo', grupo: 'relajarse', ef: { calma: 5, diversion: 3 }, dur: [90, 240], emo: 'pensativo' },
    boxeo: { txt: 'Entrenando boxeo', grupo: 'entrenar', ef: { diversion: 4, calma: 3, energia: -3 }, dur: [50, 120], emo: 'decidido' },
    pesas: { txt: 'Levantando pesas', grupo: 'entrenar', ef: { diversion: 3, calma: 2, energia: -3 }, dur: [50, 120], emo: 'decidido' },
    correr: { txt: 'Corriendo en la cinta', grupo: 'entrenar', ef: { diversion: 3, calma: 3, energia: -3 }, dur: [50, 110], emo: 'decidido' },
    tiro_arco: { txt: 'Practicando tiro con arco', grupo: 'entrenar', ef: { diversion: 6, calma: 2, energia: -1 }, dur: [60, 140], emo: 'decidido' },
    espada: { txt: 'Practicando con la espada', grupo: 'entrenar', ef: { diversion: 5, calma: 2, energia: -2 }, dur: [60, 140], emo: 'decidido' },
    roca: { txt: 'Golpeando una roca gigante', grupo: 'entrenar', ef: { diversion: 6, calma: 3, energia: -3 }, dur: [40, 90], emo: 'decidido' },
    cortar_lena: { txt: 'Cortando leña', grupo: 'entrenar', ef: { diversion: 3, calma: 2, energia: -2 }, dur: [50, 120], emo: 'serio' },
    meditar: { txt: 'Meditando', grupo: 'relajarse', ef: { calma: 9, energia: 1 }, dur: [90, 240], emo: 'sereno' },
    pescar: { txt: 'Pescando', grupo: 'relajarse', ef: { calma: 7, diversion: 2 }, dur: [100, 260], emo: 'sereno' },
    hamaca: { txt: 'Meciéndose en la hamaca', grupo: 'relajarse', ef: { calma: 7, energia: 3 }, dur: [100, 260], emo: 'sereno' },
    jardineria: { txt: 'Cuidando el jardín', grupo: 'relajarse', ef: { calma: 5, diversion: 2 }, dur: [60, 140], emo: 'contento' },
    observar_aves: { txt: 'Observando aves', grupo: 'relajarse', ef: { calma: 6, diversion: 3 }, dur: [60, 160], emo: 'pensativo' },
    fogata: { txt: 'Junto a la fogata', grupo: 'relajarse', ef: { calma: 5, social: 3, energia: 1 }, dur: [80, 220], social: true, tipos: TODOS, emo: 'sereno' },
    brasero: { txt: 'Calentándose junto al brasero', grupo: 'relajarse', ef: { calma: 3, energia: 1 }, dur: [40, 90], social: true },
    reparar_moto: { txt: 'Reparando la moto', grupo: 'trabajar', ef: { diversion: 5, calma: 3 }, dur: [80, 200], emo: 'decidido' },
    pasear_moto: { txt: 'Dando una vuelta en moto', grupo: 'pasear', ef: { diversion: 10, calma: 4 }, dur: [110, 170], emo: 'feliz' },
    vigilar: { txt: 'Vigilando la muralla', txtEn: 'Vigilando {lugar}', grupo: 'trabajar', ef: { calma: 2, diversion: 1 }, dur: [60, 140], emo: 'serio' },
    // Islas temáticas
    trabajar_hq: { txt: 'Trabajando en su empresa', txtEn: 'Trabajando en {lugar}', grupo: 'trabajar', ef: { diversion: 3, social: 3, calma: -0.5 }, dur: [150, 380], emo: 'decidido' },
    ver_pelicula: { txt: 'Viendo una película', txtEn: 'Viendo una película en {lugar}', grupo: 'relajarse', ef: { diversion: 7, calma: 3, social: 1 }, dur: [120, 300], social: true, emo: 'emocionado' },
    snack: { txt: 'Comiendo palomitas', grupo: 'comer', ef: { comida: 6, diversion: 2, social: 1 }, dur: [40, 90], social: true, emo: 'feliz' },
    actuar: { txt: 'Actuando frente a la cámara', grupo: 'trabajar', ef: { diversion: 7, social: 3, energia: -1 }, dur: [60, 140], emo: 'emocionado' },
    dirigir: { txt: 'Dirigiendo una película', grupo: 'trabajar', ef: { diversion: 6, social: 2 }, dur: [80, 180], emo: 'decidido' },
    dj: { txt: 'Pinchando música', grupo: 'musica', ef: { diversion: 9, social: 3, energia: -1 }, dur: [60, 160], emo: 'emocionado' },
    karaoke: { txt: 'Cantando karaoke', grupo: 'musica', ef: { diversion: 9, social: 4 }, dur: [40, 90], social: true, emo: 'riendo' },
    pociones: { txt: 'Preparando pociones', grupo: 'trabajar', ef: { diversion: 6, calma: 2 }, dur: [70, 160], emo: 'picaro' },
    recolectar: { txt: 'Recolectando cristales mágicos', grupo: 'relajarse', ef: { calma: 4, diversion: 4 }, dur: [50, 120], emo: 'contento' },
    explorar: { txt: 'Explorando las ruinas', txtEn: 'Explorando {lugar}', grupo: 'jugar', ef: { diversion: 8, energia: -1.5 }, dur: [60, 150], emo: 'decidido' },
    estudiar_magia: { txt: 'Estudiando libros de magia', txtEn: 'Estudiando en {lugar}', grupo: 'relajarse', ef: { calma: 5, diversion: 4 }, dur: [90, 220], emo: 'pensativo' },
    // Anillo exterior: Parque Deportivo, Barrio Residencial, Raccoon City y Playa del Sol
    futbol: { txt: 'Jugando fútbol', grupo: 'jugar', ef: { diversion: 9, social: 3, energia: -3 }, dur: [60, 150], social: true, emo: 'emocionado' },
    ver_partido: { txt: 'Viendo el partido', grupo: 'relajarse', ef: { diversion: 6, social: 3, calma: 1 }, dur: [50, 130], social: true, emo: 'emocionado' },
    basquet: { txt: 'Jugando básquet', grupo: 'jugar', ef: { diversion: 8, social: 3, energia: -2.5 }, dur: [50, 130], social: true, emo: 'decidido' },
    calistenia: { txt: 'Haciendo barras', grupo: 'entrenar', ef: { diversion: 3, calma: 3, energia: -3 }, dur: [40, 100], emo: 'decidido' },
    nadar: { txt: 'Nadando', grupo: 'entrenar', ef: { diversion: 7, calma: 4, energia: -2 }, dur: [50, 120], emo: 'feliz' },
    tomar_sol: { txt: 'Tomando sol', grupo: 'relajarse', ef: { calma: 7, energia: 2 }, dur: [80, 200], emo: 'sereno' },
    reparar_bici: { txt: 'Arreglando una bici', grupo: 'trabajar', ef: { diversion: 5, calma: 3 }, dur: [60, 150], emo: 'decidido' },
    pasear_bici: { txt: 'Paseando en bici', grupo: 'pasear', ef: { diversion: 10, calma: 4, energia: -1.5 }, dur: [110, 170], emo: 'feliz' },
    manejar: { txt: 'Manejando su auto blanco', grupo: 'pasear', ef: { diversion: 6, calma: 3 }, dur: [100, 160], emo: 'contento' },
    ajedrez_gigante: { txt: 'Jugando ajedrez gigante', grupo: 'jugar', ef: { diversion: 6, social: 3, calma: 1 }, dur: [80, 200], social: true, emo: 'pensativo' },
    columpiarse: { txt: 'En los columpios', grupo: 'jugar', ef: { diversion: 7, calma: 2 }, dur: [30, 80], emo: 'feliz' },
    jugar_perro: { txt: 'Jugando con los perros', txtEn: 'Jugando con su perro', grupo: 'jugar', ef: { diversion: 7, calma: 4, social: 2 }, dur: [50, 120], emo: 'feliz' },
    ver_series: { txt: 'Viendo series en casa', grupo: 'relajarse', ef: { diversion: 7, calma: 4 }, dur: [120, 280], emo: 'emocionado' },
    en_casa: { txt: 'Descansando en casa', txtEn: 'Descansando en {lugar}', grupo: 'relajarse', ef: { calma: 6, energia: 3 }, dur: [90, 220], emo: 'sereno' },
    comprar: { txt: 'Haciendo las compras', txtEn: 'Comprando en {lugar}', grupo: 'comer', ef: { comida: 4, social: 2 }, dur: [30, 70], social: true, emo: 'contento' },
    visitar_tumbas: { txt: 'Paseando por el cementerio', grupo: 'relajarse', ef: { calma: 3, diversion: 3 }, dur: [40, 100], emo: 'pensativo' },
    voley: { txt: 'Jugando vóley playa', grupo: 'jugar', ef: { diversion: 9, social: 3, energia: -2.5 }, dur: [50, 130], social: true, emo: 'riendo' },
    castillo: { txt: 'Haciendo un castillo de arena', grupo: 'jugar', ef: { diversion: 6, calma: 4 }, dur: [50, 130], emo: 'contento' },
    surf: { txt: 'Surfeando', grupo: 'entrenar', ef: { diversion: 10, calma: 3, energia: -2 }, dur: [50, 120], emo: 'emocionado' },
    salvavidas: { txt: 'Cuidando a los bañistas', grupo: 'trabajar', ef: { diversion: 2, calma: 3 }, dur: [80, 200], emo: 'serio' },
    atender: { txt: 'Atendiendo su puesto', txtEn: 'Atendiendo {lugar}', grupo: 'trabajar', ef: { diversion: 3, social: 4 }, dur: [90, 220], social: true, emo: 'contento' },
    // Mega Mall, Avenida de la Comida, Parque de Diversiones, Japón y Súper Parque
    vitrinear: { txt: 'Mirando vitrinas', txtEn: 'Mirando vitrinas en {lugar}', grupo: 'pasear', ef: { diversion: 4, calma: 2, social: 1 }, dur: [30, 80], social: true, emo: 'contento' },
    probar_ropa: { txt: 'Probándose ropa', txtEn: 'Probándose ropa en {lugar}', grupo: 'jugar', ef: { diversion: 6, social: 1 }, dur: [50, 130], emo: 'feliz' },
    admirar: { txt: 'Admirando el lugar', txtEn: 'Admirando {lugar}', grupo: 'relajarse', ef: { diversion: 6, calma: 3, social: 1 }, dur: [30, 80], social: true, emo: 'contento' },
    subir_juego: { txt: 'Subido a un juego mecánico', txtEn: 'Subido a {lugar}', grupo: 'jugar', ef: { diversion: 12, calma: -1, energia: -1 }, dur: [50, 120], social: true, emo: 'emocionado' },
    tiro_feria: { txt: 'Jugando en la feria', txtEn: 'Jugando en {lugar}', grupo: 'jugar', ef: { diversion: 8, social: 2 }, dur: [40, 90], social: true, emo: 'decidido' },
    hacer_fila: { txt: 'Haciendo fila', txtEn: 'Haciendo fila en {lugar}', grupo: 'jugar', ef: { diversion: 4, social: 3 }, dur: [25, 60], social: true, emo: 'emocionado' },
    leer_manga: { txt: 'Leyendo manga', txtEn: 'Leyendo manga en {lugar}', grupo: 'relajarse', ef: { calma: 4, diversion: 6 }, dur: [70, 180], emo: 'emocionado' },
    onsen: { txt: 'Relajándose en el onsen', grupo: 'relajarse', ef: { calma: 10, energia: 3 }, dur: [80, 200], social: true, emo: 'sereno' },
    sumo: { txt: 'Luchando sumo', grupo: 'entrenar', ef: { diversion: 8, calma: 2, energia: -3 }, dur: [50, 120], social: true, emo: 'decidido' },
    // Solo para el gato
    comer_gato: { txt: 'Comiendo croquetas', grupo: 'comer', ef: { comida: 14 }, dur: [30, 70], tipos: ['gato'], emo: 'feliz' },
    dormir_gato: { txt: 'Durmiendo hecho bolita', grupo: 'dormir', ef: { energia: 8, calma: 3 }, dur: [200, 700], dormir: true, tipos: ['gato'] },
    jugar_gato: { txt: 'Jugando con un ovillo', grupo: 'jugar', ef: { diversion: 12, energia: -2 }, dur: [30, 80], tipos: ['gato'], emo: 'emocionado' },
    molestar: { txt: 'Sentado sobre un teclado', grupo: 'jugar', ef: { diversion: 8, social: 4 }, dur: [40, 100], tipos: ['gato'], emo: 'picaro' },
    mirar: { txt: 'Observándolo todo', grupo: 'relajarse', ef: { calma: 6, diversion: 2 }, dur: [40, 120], tipos: ['gato'], emo: 'sereno' }
  };

  // Para órdenes del usuario ("ve a comer") — el grupo agrupa varias actividades
  const GRUPOS = {
    comer: 'Ir a comer', dormir: 'Ir a dormir', jugar: 'Ir a jugar', musica: 'Hacer música', bailar: 'Bailar',
    entrenar: 'Entrenar', relajarse: 'Relajarse', trabajar: 'Trabajar', pasear: 'Pasear'
  };

  // Frases genéricas para cuando no hay modelo de IA (o falla)
  const COMENTARIOS = {
    comer: ['Esto está buenísimo.', '¿Me pasas la sal?', 'Necesitaba comer algo.', 'El chef se lució hoy.', '¿Vas a terminarte eso?'],
    banquete: ['Un banquete digno de reyes.', 'Que no falte el vino.', 'Esta carne está en su punto.'],
    helado: ['¿De qué sabor es el tuyo?', 'Nada como un helado.', 'Se me derrite, ¡rápido!'],
    tomar_te: ['El té lo arregla todo.', 'Un café más y despierto.', 'Este lugar es muy tranquilo.'],
    cocinar: ['Un poco más de sal...', '¡Huele delicioso!', 'La receta secreta lleva cariño.'],
    jugar_consola: ['¡Te voy a ganar!', '¿Otra partida?', 'Ese jefe final es imposible.', '¡No vale, hiciste trampa!'],
    arcade: ['¡Récord nuevo!', 'Una ficha más, solo una.', 'Estos clásicos nunca fallan.'],
    pingpong: ['¡Saque!', 'Esa no la viste venir.', '¡Punto para mí!'],
    ajedrez: ['Jaque.', 'Interesante jugada...', 'Te veo tres movimientos adelante.'],
    bailar: ['¡Qué ritmo!', '¡Esta canción me encanta!', 'Mira este paso.'],
    banca: ['Qué buen día.', 'A veces solo hay que sentarse.', '¿Viste lo que pasó en la plaza?'],
    fogata: ['Las fogatas invitan a contar historias.', 'Hace frío esta noche.', 'Me recuerda a otros tiempos.'],
    publico: ['¡Otra, otra!', '¡Sube el volumen!', '¡Esta banda es buenísima!'],
    reunion: ['Repasemos el perfil.', '¿Qué sabemos hasta ahora?', 'Hay un patrón aquí.'],
    podcast: ['Bienvenidos a un nuevo episodio.', 'Eso daría para otro episodio.', 'Que la audiencia opine.'],
    cocinar_2: ['Pruébalo y dime.'],
    ver_pelicula: ['¡No hagas spoilers!', 'Esta escena es mi favorita.', '¿Me pasas las palomitas?'],
    trabajar_hq: ['Otra reunión que pudo ser un correo.', 'Hoy lanzamos una versión nueva.', 'El café de la oficina es terrible.'],
    karaoke: ['¡Me toca la siguiente canción!', 'Nadie canta peor que yo, y no me importa.'],
    dj: ['¡Suban las manos!', 'Esta mezcla la hice yo.'],
    pociones: ['Una pizca más de polvo de hada...', 'Si explota, no fui yo.'],
    explorar: ['Estas ruinas esconden algo.', 'Ese portal brilla más que ayer.', '¿Escuchaste algo en el piso de arriba?'],
    futbol: ['¡Pásala!', '¡Goool!', 'Eso fue penal, árbitro.', '¡Defiendan, defiendan!'],
    basquet: ['¡Triple!', 'Te bloqueé, admítelo.', 'Una más y descansamos.'],
    voley: ['¡Mía!', 'Buen remate.', 'La arena quema los pies.'],
    tomar_sol: ['Qué rico este sol.', 'Olvidé el bloqueador...', 'Despiértame en una hora.'],
    nadar: ['¡El agua está perfecta!', 'Una vuelta más.', '¿Hacemos una carrera?'],
    surf: ['¡Viene una ola grande!', 'Casi me caigo.', 'Esto es libertad.'],
    ajedrez_gigante: ['Jaque... con una pieza gigante.', 'Mover estas piezas es puro ejercicio.'],
    visitar_tumbas: ['Este cementerio me da escalofríos.', '¿Escuchaste eso?', 'Raccoon City nunca duerme... ni sus muertos.'],
    investigar: ['Aquí hay algo que no cuadra.', 'Nadie toque la evidencia.', 'Revisemos el perfil otra vez.'],
    comprar: ['¿Llevamos pan?', 'Las ofertas de hoy están buenas.'],
    jugar_perro: ['¿Quién es un buen perro?', '¡Trae la pelota!'],
    vitrinear: ['Esas zapatillas están en oferta.', 'Solo vine a mirar, lo juro.', '¿Eso cuesta tanto?'],
    probar_ropa: ['¿Me queda bien?', 'Tienen mi talla, qué milagro.'],
    admirar: ['Qué impresionante.', 'Sácame una foto aquí.', 'Tenía que verlo en persona.', 'En las fotos parece más chico.'],
    hacer_fila: ['¿Cuánto falta?', 'Esta fila no avanza.', 'Ya casi nos toca.'],
    subir_juego: ['¡Aaaaah!', '¡Otra vuelta!', 'Creo que dejé el estómago arriba.', '¡No mires abajo!'],
    tiro_feria: ['Esta vez sí le doy.', '¡Quiero el peluche grande!'],
    leer_manga: ['Este capítulo me dejó sin palabras.', 'No me hagas spoilers del final.'],
    onsen: ['Esto es el paraíso.', 'No me saquen de aquí.'],
    sumo: ['¡Nokotta, nokotta!', 'Este rival pesa más que yo.'],
    general: ['¿Qué tal tu día?', 'Este pueblo es raro, pero me gusta.', '¿Has visto a Rubius?', 'Hoy me siento bien.', 'Cuéntame algo interesante.', 'No sé cómo llegué aquí, pero bueno.', '¿Ya fuiste al Bosque Mágico?', 'Dicen que la torre de CyberLife no duerme nunca.', '¿Ya fuiste a la Playa del Sol?', 'Dicen que en la Mansión Spencer pasan cosas raras.', 'Vi a Luis pasar volando en su bici.', 'Hay partido en el Parque Deportivo.', '¿Vamos al Mega Mall?', '¿Popeyes o Pizza Hut?', '¿Ya viste el Monte Fuji?', 'Quiero subirme a la montaña rusa.'],
    // clima y eventos
    lluvia: ['Qué aguacero, ¿no?', 'Me encanta el olor a lluvia.', 'Olvidé mi paraguas otra vez.', 'Mejor nos quedamos bajo techo.'],
    tormenta: ['¿Escuchaste ese trueno?', 'Esta tormenta da miedo.', 'Que no se vaya la luz...'],
    nieve: ['¡Está nevando!', 'Hagamos un muñeco de nieve.', 'Qué frío hace hoy.'],
    niebla: ['No se ve nada con esta niebla.', 'La niebla le da un aire misterioso al pueblo.'],
    halloween: ['¿Truco o trato?', '¿Viste las calabazas?', 'Esta noche hay fantasmas, lo juro.', '¿De qué te vas a disfrazar?'],
    navidad: ['¡Feliz Navidad!', '¿Ya viste el árbol del festival?', '¿Qué le vas a regalar a Rubius?'],
    anio_nuevo: ['¡Feliz Año Nuevo!', '¿Cuál es tu propósito para este año?'],
    san_valentin: ['¿Tienes cita hoy?', 'El amor está en el aire... o es el olor a pizza.'],
    concierto: ['¡Esta noche hay concierto en la Isla Festival!', '¿Vamos al concierto?'],
    cine: ['Hoy hay función en el autocine.', '¿Qué película dan hoy?'],
    red_john: ['¿Supiste? Apareció una carita roja en la pared del cine.', 'Jane está obsesionado con esa carita.', 'Esa carita sonriente me da escalofríos.']
  };

  // ---------------- estaciones, clima y eventos (iguales en el cerebro y en el wallpaper) ----------------
  const ESTACIONES = ['primavera', 'verano', 'otono', 'invierno'];
  const CLIMAS = ['despejado', 'nublado', 'lluvia', 'tormenta', 'nieve', 'niebla'];
  const NOMBRE_ESTACION = { primavera: 'primavera', verano: 'verano', otono: 'otoño', invierno: 'invierno' };
  const NOMBRE_CLIMA = { despejado: 'despejado', nublado: 'nublado', lluvia: 'lluvia', tormenta: 'tormenta', nieve: 'nieve', niebla: 'niebla' };
  const EVENTOS = {
    halloween: 'Halloween', navidad: 'Navidad', anio_nuevo: 'Año Nuevo', san_valentin: 'San Valentín',
    concierto: 'Noche de concierto en la Isla Festival', cine: 'Función en el autocine',
    red_john: 'La carita de Red John apareció en el cine', estrellas_fugaces: 'Lluvia de estrellas'
  };
  const PROB_CLIMA = {
    primavera: { despejado: 0.42, nublado: 0.24, lluvia: 0.22, tormenta: 0.05, niebla: 0.07 },
    verano: { despejado: 0.58, nublado: 0.16, lluvia: 0.1, tormenta: 0.13, niebla: 0.03 },
    otono: { despejado: 0.34, nublado: 0.26, lluvia: 0.22, tormenta: 0.05, niebla: 0.13 },
    invierno: { despejado: 0.3, nublado: 0.22, nieve: 0.34, niebla: 0.1, lluvia: 0.04 }
  };
  function h32(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function estacionDe(fecha, hemisferio) {
    const m = fecha.getMonth();
    const e = m === 11 || m < 2 ? 'invierno' : m < 5 ? 'primavera' : m < 8 ? 'verano' : 'otono';
    return hemisferio === 'sur' ? { invierno: 'verano', verano: 'invierno', primavera: 'otono', otono: 'primavera' }[e] : e;
  }
  // El clima cambia en bloques de 3 horas y suele repetir el del bloque anterior
  function climaDe(fecha, estacion) {
    let b = Math.floor(fecha.getTime() / 10800000);
    for (let k = 0; k < 4 && h32(b * 3 + 1) < 0.45; k++) b--;
    const r = h32(b * 7 + 3), tabla = PROB_CLIMA[estacion];
    let acc = 0;
    for (const c in tabla) { acc += tabla[c]; if (r < acc) return c; }
    return 'despejado';
  }
  function eventosDe(fecha, clima) {
    const m = fecha.getMonth() + 1, d = fecha.getDate(), h = fecha.getHours() + fecha.getMinutes() / 60, ds = fecha.getDay();
    const ev = [];
    if ((m === 10 && d >= 24) || (m === 11 && d <= 2)) ev.push('halloween');
    if (m === 12 || (m === 1 && d <= 6)) ev.push('navidad');
    if ((m === 12 && d === 31 && h >= 20) || (m === 1 && d === 1 && h < 2)) ev.push('anio_nuevo');
    if (m === 2 && d >= 13 && d <= 15) ev.push('san_valentin');
    if ((ds === 5 || ds === 6) && h >= 20) ev.push('concierto');
    if ((ds === 3 || ds === 0) && h >= 19 && h < 22.5) ev.push('cine');
    // la noche pertenece al día en que empezó
    const t = new Date(fecha.getTime() - 6 * 3600000);
    const dia = t.getFullYear() * 400 + t.getMonth() * 32 + t.getDate();
    if ((h >= 21 || h < 3) && h32(dia * 13 + 5) < 0.25) ev.push('red_john');
    if ((h >= 22 || h < 4) && clima === 'despejado' && h32(dia * 17 + 2) < 0.22) ev.push('estrellas_fugaces');
    return ev;
  }
  // opc: { estacion, clima, hemisferio: 'norte'|'sur', eventos: 'auto'|'no', evento: id forzado }
  function calendario(fecha, opc) {
    opc = opc || {};
    const estacion = ESTACIONES.indexOf(opc.estacion) >= 0 ? opc.estacion : estacionDe(fecha, opc.hemisferio);
    let clima = CLIMAS.indexOf(opc.clima) >= 0 ? opc.clima : climaDe(fecha, estacion);
    if (clima === 'nieve' && estacion !== 'invierno' && CLIMAS.indexOf(opc.clima) < 0) clima = 'lluvia';
    const eventos = opc.eventos === 'no' ? [] : eventosDe(fecha, clima);
    if (opc.evento && EVENTOS[opc.evento] && eventos.indexOf(opc.evento) < 0) eventos.push(opc.evento);
    return { estacion, clima, eventos };
  }
  // Bono de utilidad que da cada evento a ciertas actividades
  const BONO_EVENTO = {
    concierto: { publico: 6, cantar: 4, guitarra: 3, bateria: 3, teclado: 3, dj: 4, bailar: 3 },
    cine: { ver_pelicula: 6, snack: 3 },
    halloween: { fogata: 1.5, explorar: 3, pociones: 2, visitar_tumbas: 3 },
    navidad: { banquete: 2, comer: 1, fogata: 1.5, tomar_te: 1, comprar: 1.5, en_casa: 1.5 },
    anio_nuevo: { publico: 3, bailar: 3, banca: 1.5 },
    san_valentin: { tomar_te: 1.5, pasear: 1, helado: 1.5 }
  };
  const PLAYA = ['nadar', 'tomar_sol', 'surf', 'voley', 'castillo'];
  // Interacciones entre dos vecinos que están cerca. rel: entre qué afinidad pasa; anim: la de quien empieza y la del otro;
  // cerca: se juntan (necesita a los dos de pie); dice: lo que dice cada uno; af: cuánto cambia la afinidad;
  // diario: queda escrito en el diario y en sus recuerdos
  const INTER_PAR = {
    saludo: { rel: [-15, 100], anim: ['saludar', 'saludar'], dur: 4, emo: ['contento', 'contento'], af: 1, peso: 2, dice: [['¡Hola!', '¡Hey!', '¿Todo bien?'], ['¡Hola!', 'Todo bien, ¿y tú?', '¡Buenas!']] },
    reir: { rel: [5, 100], anim: ['reir', 'reir'], dur: 6, emo: ['riendo', 'riendo'], af: 2, peso: 2, dice: [['¡Jajaja!', 'No puede ser, ¡jaja!'], ['¡Me muero de risa!', '¡Basta, jajaja!']] },
    chocar: { rel: [15, 100], anim: ['chocar', 'chocar'], dur: 4, cerca: true, emo: ['feliz', 'feliz'], af: 3, peso: 2, dice: [['¡Chócala!', '¡Esa es!'], ['¡Eso!', '¡Vamos!']] },
    puno: { rel: [20, 100], anim: ['puno', 'puno'], dur: 3.5, cerca: true, emo: ['contento', 'contento'], af: 2, dice: [['Puñito.', '¡Dale!'], ['¡Ahí está!', 'Puñito.']] },
    manos: { rel: [-10, 30], anim: ['manos', 'manos'], dur: 4, cerca: true, emo: ['serio', 'contento'], af: 2, dice: [['Mucho gusto.', 'Un placer.'], ['Igualmente.', 'El gusto es mío.']] },
    abrazo: { rel: [45, 100], anim: ['abrazar', 'abrazar'], dur: 6, cerca: true, emo: ['feliz', 'feliz'], af: 5, peso: 1.5, diario: '{a} y {b} se dieron un abrazo.', dice: [['¡Cuánto tiempo!', 'Te extrañé.'], ['¡Yo también!', 'Qué bueno verte.']] },
    chisme: { rel: [15, 100], anim: ['susurrar', 'escuchar'], dur: 7, cerca: true, emo: ['picaro', 'sorprendido'], af: 3, dice: [['No le digas a nadie, pero...', 'Psst, ¿supiste lo último?'], ['¿¡En serio!?', '¡No te creo!']] },
    selfie: { rel: [10, 100], anim: ['selfie', 'posar'], dur: 6, cerca: true, emo: ['feliz', 'feliz'], af: 3, diario: '{a} y {b} se tomaron una selfie.', dice: [['¡Una selfie!', 'Sonríe, esta va al perfil.'], ['¡Sale con filtro!', '¡Whisky!']] },
    regalo: { rel: [30, 100], anim: ['dar', 'recibir'], dur: 5, cerca: true, emo: ['contento', 'sorprendido'], af: 6, diario: '{a} le dio un regalo a {b}.', dice: [['Toma, es para ti.', 'Te traje algo.'], ['¿Para mí? ¡Gracias!', '¡No te hubieras molestado!']] },
    consolar: { rel: [0, 100], anim: ['consolar', 'llorar'], dur: 7, cerca: true, emo: ['sereno', 'lloroso'], af: 6, peso: 4, solo: (a, b) => b.emocion === 'triste' || b.emocion === 'lloroso' || b.nec.social < 20, nec: { calma: 15, social: 15 }, diario: '{a} consoló a {b}.', dice: [['Todo va a estar bien.', 'Aquí estoy, ¿qué pasó?'], ['Gracias por escucharme.', 'Hoy no fue mi día.']] },
    bailar: { rel: [20, 100], anim: ['bailar', 'bailar'], dur: 9, depie: true, emo: ['emocionado', 'feliz'], af: 3, dice: [['¡Esta canción me encanta!', '¡Vamos a bailar!'], ['¡Sígueme el paso!', '¡Dale!']] },
    ppt: { rel: [-20, 100], anim: ['ppt', 'ppt'], dur: 5.5, cerca: true, emo: ['decidido', 'decidido'], af: 1, dice: [['¡Piedra, papel o tijera!', 'El que pierde invita.'], ['¡Papel!', '¡Tijera, gané!', '¡Otra vez!']] },
    discutir: { rel: [-100, 6], anim: ['discutir', 'discutir'], dur: 8, cerca: true, emo: ['enojado', 'enojado'], af: -3, peso: 0.8, diario: '{a} y {b} discutieron.', dice: [['¡Eso no fue lo que dijiste!', '¡Siempre haces lo mismo!'], ['¡No me hables así!', 'Ya déjame en paz.']] },
    duelo: { rel: [-100, 25], anim: ['duelo', 'duelo'], dur: 8, cerca: true, emo: ['decidido', 'decidido'], af: -1, peso: 2, solo: (a, b) => /espada|hacha_espalda/.test(((a.d.ap || {}).extras || []).join()) && /espada|hacha_espalda/.test(((b.d.ap || {}).extras || []).join()), diario: '{a} y {b} se batieron en duelo de práctica.', dice: [['¡En guardia!', '¡Veamos qué tan bueno eres!'], ['¡A ver si puedes!', '¡No te tengo miedo!']] },
    pelea: { rel: [-100, 10], anim: ['boxeo', 'boxeo'], dur: 7, cerca: true, emo: ['enojado', 'decidido'], af: -1, solo: (a, b) => /^(gimnasio|dep_gym|jp_sumo)$/.test(a.zonaAct || '') || /^(gimnasio|dep_gym|jp_sumo)$/.test(b.zonaAct || ''), dice: [['¡Guardia arriba!', '¡Vamos, un round!'], ['¡Solo es práctica!', '¡Toma!']] },
    reverencia: { rel: [-30, 100], anim: ['reverencia', 'reverencia'], dur: 4, depie: true, emo: ['sereno', 'sereno'], af: 2, peso: 4, solo: (a, b) => a.d.region === 'japon' || b.d.region === 'japon', dice: [['Konnichiwa.', 'Es un honor.'], ['Konnichiwa.', 'El honor es mío.']] }
  };
  const SALUDOS = ['¡Hola, {b}!', '¿Qué tal, {b}?', '{b}, ¿cómo va todo?', 'Hey, {b}.', '¡{b}! Justo pensaba en ti.', 'Buenas, {b}.'];

  function azar(a, b) { return a + Math.random() * (b - a); }
  function elegir(l) { return l[Math.floor(Math.random() * l.length)]; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  function limitar(v, a, b) { return v < a ? a : v > b ? b : v; }
  const VEL = 1.6; // unidades por segundo al caminar (igual que en el wallpaper)

  class Simulacion {
    constructor(opc) {
      this.datos = opc.personajes;
      this.porId = {};
      for (const d of this.datos) this.porId[d.id] = d;
      this.mundo = opc.mundo;
      this.alEvento = opc.alEvento || function () {};
      this.generador = opc.generadorDialogo || null;
      this.generadorPensamiento = opc.generadorPensamiento || null;
      this.reloj = opc.reloj || (() => Date.now());
      this.config = Object.assign({
        suenoDesde: 0, suenoHasta: 7, charlaCada: [16, 34], pensamientoCada: [40, 90], maxCharlas: 2
      }, opc.config || {});
      this.opcClima = Object.assign({}, opc.clima || {});
      this.cal = calendario(new Date(this.reloj()), this.opcClima);
      this.ultimoCal = 0;
      this.spots = this.mundo.spots;
      this.spotPorId = {};
      for (const s of this.spots) this.spotPorId[s.id] = s;
      this.zonaPorId = {};
      for (const z of this.mundo.zonas) this.zonaPorId[z.id] = z;
      // los lugareños solo usan los sitios de su región
      this.zonasRegion = {};
      for (const d of this.datos) if (d.region) this.zonasRegion[d.id] = new Set((this.mundo.regiones || {})[d.region] || []);
      this.ocupado = {};
      this.charlas = [];
      this.colaLineas = [];
      this.pausaCharlas = false;
      this.diario = [];
      this.ausentes = {};   // lo guardado de personajes que ahora no están (ocultos en el editor): se conserva
      this.estado = {};
      for (const d of this.datos) this.estado[d.id] = this._nuevo(d);
      if (opc.guardado) this.importar(opc.guardado);
      const ahora = this.reloj();
      this.ultimoPaso = ahora;
      this.proximaCharla = ahora + 6000;
      this.proximoPensamiento = ahora + 15000;
      this.proximaPareja = ahora + 5000;
      // Todos empiezan ya haciendo algo (sin caminar); si nos pasan posiciones, se respetan
      const pos = opc.posiciones || {};
      for (const d of this.datos) {
        const p = this.estado[d.id], s = this.spotPorId[pos[d.id]];
        if (s && (ACT[s.act].libre || !this.ocupado[s.id])) {
          if (!ACT[s.act].libre) this.ocupado[s.id] = p.id;
          p.act = s.act; p.spot = s.id; p.pos = { x: s.x, z: s.z };
          p.hasta = ahora + azar(5, 60) * 1000;
        } else this.decidir(p, { inmediato: true });
      }
    }

    _nuevo(d) {
      const nec = {};
      for (const n of NECESIDADES) nec[n] = azar(45, 95);
      const rel = Object.assign({}, d.relaciones || {});
      return {
        id: d.id, d, nec, rel, recuerdos: [], historial: [],
        act: null, spot: null, fase: 'haciendo', llega: 0, hasta: 0,
        pos: { x: this.mundo.N / 2, z: this.mundo.N / 2 }, origen: null,
        emocion: d.emoBase || 'contento', emoHasta: 0, enCharla: false, charlaCooldown: 0
      };
    }

    // ---------- tiempo ----------
    hora() { const f = new Date(this.reloj()); return f.getHours() + f.getMinutes() / 60; }
    esNoche(h) {
      const a = this.config.suenoDesde, b = this.config.suenoHasta;
      return a <= b ? (h >= a && h < b) : (h >= a || h < b);
    }

    // posición aproximada (para saber quién está cerca de quién)
    posicion(p) {
      const s = this.spotPorId[p.spot];
      if (!s) return p.pos;
      if (p.fase === 'yendo' && p.origen) {
        const ahora = this.reloj();
        const total = Math.max(1, p.llega - p.salida);
        const k = limitar((ahora - p.salida) / total, 0, 1);
        return { x: p.origen.x + (s.x - p.origen.x) * k, z: p.origen.z + (s.z - p.origen.z) * k };
      }
      return { x: s.x, z: s.z };
    }

    tipoPermitido(p, a, s) {
      const tipos = a.tipos || GENTE;
      if (tipos.indexOf(p.d.tipo) < 0) return false;
      if (p.d.permitidas && p.d.permitidas.indexOf(s.act) < 0) return false;
      if (s.solo && s.solo.indexOf(p.d.tipo) < 0 && s.solo.indexOf(p.id) < 0 && !(p.d.region && s.solo.indexOf('region:' + p.d.region) >= 0)) return false;
      const zr = this.zonasRegion[p.id];
      if (zr && !zr.has(s.zona)) return false;
      return true;
    }

    // ---------- decisiones ----------
    puntuar(p, s, a, noche, aqui, genteZona) {
      const d = p.d, r = d.rasgos || {};
      let v = 0;
      for (const n of NECESIDADES) {
        const e = a.ef[n];
        if (!e) continue;
        const def = (100 - p.nec[n]) / 100;
        v += e > 0 ? e * (0.1 + 2.5 * def * def) : e * (0.3 + 1.5 * def);
      }
      v *= 0.55;
      v += ((d.gustos && d.gustos[s.act]) || 0) * 2.2;
      v += ((d.zonas && d.zonas[s.zona]) || 0) * 1.2;
      if (a.dormir) {
        const somno = (100 - p.nec.energia) / 100;
        if (r.dormilon) v += 3 + 6 * somno;
        else if (noche && !r.nocturno) v += 10 * (somno + 0.4);
        else if (p.nec.energia > 30) v -= 7;
      } else if (noche && !r.nocturno) v -= 2.5;
      if (p.historial.indexOf(s.act) >= 0) v -= 3.5;
      if (p.historial[p.historial.length - 1] === s.act) v -= 3;
      if (a.social) {
        const gente = genteZona[s.zona] || 0;
        const soc = (r.social !== undefined ? r.social : 0.6);
        v += Math.min(gente, 4) * 0.7 * (soc - 0.35) * (1.3 - p.nec.social / 100);
      }
      // clima: con lluvia, tormenta o nieve se prefiere estar bajo techo
      const cal = this.cal, z = this.zonaPorId[s.zona];
      if (z && z.atractivo) v += z.atractivo;
      if (cal && (cal.clima === 'lluvia' || cal.clima === 'tormenta' || cal.clima === 'nieve')) {
        const fuera = !z || z.abierta || z.virtual;
        if (fuera && !(a.dormir && s.pose === 'acostado' && z && !z.abierta)) v -= cal.clima === 'tormenta' ? 5 : cal.clima === 'nieve' ? 2.2 : 3.2;
        else v += 0.8;
        if (cal.clima === 'nieve' && (s.act === 'fogata' || s.act === 'brasero')) v += 2.5;
      }
      if (cal) for (const e of cal.eventos) { const b = BONO_EVENTO[e]; if (b && b[s.act]) v += b[s.act]; }
      // la playa y la piscina se llenan en verano y se vacían en invierno
      if (cal && PLAYA.indexOf(s.act) >= 0) v += cal.estacion === 'verano' ? 1.5 : cal.estacion === 'invierno' ? -5 : 0;
      if (s.evento) v += 12;
      v -= dist(aqui, s) * 0.025;
      v += azar(0, 3.2);
      return v;
    }

    decidir(p, opc) {
      opc = opc || {};
      const ahora = this.reloj();
      const aqui = this.posicion(p);
      if (p.spot && this.ocupado[p.spot] === p.id) delete this.ocupado[p.spot];
      const noche = this.esNoche(this.hora());
      // cuánta gente hay en cada zona (para las actividades sociales), contado una sola vez
      const genteZona = {};
      for (const id in this.estado) { const o = this.estado[id], so = o !== p && this.spotPorId[o.spot]; if (so) genteZona[so.zona] = (genteZona[so.zona] || 0) + 1; }
      let mejor = null, mejorV = -1e9;
      for (const s of this.spots) {
        const a = ACT[s.act];
        if (!a || !this.tipoPermitido(p, a, s)) continue;
        if (!a.libre && this.ocupado[s.id]) continue;
        if (opc.grupo && a.grupo !== opc.grupo) continue;
        if (opc.act && s.act !== opc.act) continue;
        if (s.evento && this.cal.eventos.indexOf(s.evento) < 0) continue;
        if (s.id === p.spot && !opc.grupo) continue;
        const v = this.puntuar(p, s, a, noche, aqui, genteZona);
        if (v > mejorV) { mejorV = v; mejor = s; }
      }
      if (!mejor) {
        if (opc.grupo || opc.act) return false;
        const zr = this.zonasRegion[p.id];
        mejor = this.spots.find((s) => s.act === 'pasear' && (!zr || zr.has(s.zona)));
        if (!mejor) { p.hasta = this.reloj() + 30000; return false; }
      }
      this.asignar(p, mejor, aqui, opc.inmediato, noche);
      return true;
    }

    asignar(p, s, aqui, inmediato, noche) {
      const a = ACT[s.act];
      const ahora = this.reloj();
      if (!a.libre) this.ocupado[s.id] = p.id;
      p.origen = { x: aqui.x, z: aqui.z };
      p.act = s.act;
      p.spot = s.id;
      p.salida = ahora;
      const viaje = inmediato ? 0 : (dist(aqui, s) / VEL) * 1.35 + 1;
      p.llega = ahora + viaje * 1000;
      p.fase = inmediato ? 'haciendo' : 'yendo';
      let dur = azar(a.dur[0], a.dur[1]);
      if (a.dormir && noche && !(p.d.rasgos && p.d.rasgos.nocturno)) dur *= 3;
      if (inmediato) dur *= Math.random();
      p.hasta = p.llega + dur * 1000;
      p.historial.push(s.act);
      if (p.historial.length > 4) p.historial.shift();
      p.emoHasta = 0;
      this.alEvento({ t: 'orden', id: p.id, spot: s.id, act: s.act, inmediato: !!inmediato, dur: Math.round(dur) });
    }

    // Orden externa (usuario o IA): grupo = 'comer'|'dormir'|...
    ordenar(id, grupo) {
      const p = this.estado[id];
      if (!p || !GRUPOS[grupo]) return false;
      if (grupo === 'pasear') return this.decidir(p, { act: 'pasear' });
      return this.decidir(p, { grupo });
    }

    // ---------- calendario: estación, clima y eventos ----------
    actualizarCalendario() {
      const ahora = this.reloj();
      this.ultimoCal = ahora;
      const antes = this.cal ? this.cal.eventos : [];
      this.cal = calendario(new Date(ahora), this.opcClima);
      for (const e of this.cal.eventos) if (antes.indexOf(e) < 0 && e !== 'estrellas_fugaces') this.registrar('Evento: ' + EVENTOS[e] + '.');
    }
    ajustarClima(o) {
      for (const k of ['clima', 'estacion', 'hemisferio', 'eventos', 'evento']) if (o && o[k] !== undefined) this.opcClima[k] = o[k];
      this.actualizarCalendario();
    }
    textoClima() {
      const c = this.cal;
      if (!c) return '';
      const ev = c.eventos.filter((e) => e !== 'estrellas_fugaces').map((e) => EVENTOS[e]);
      return NOMBRE_ESTACION[c.estacion] + ', ' + ({ despejado: 'cielo despejado', nublado: 'nublado', lluvia: 'está lloviendo', tormenta: 'hay tormenta', nieve: 'está nevando', niebla: 'hay mucha niebla' })[c.clima] + (ev.length ? '; hoy: ' + ev.join(', ') : '');
    }
    comentarioDelDia() {
      const c = this.cal;
      if (!c) return null;
      const opciones = c.eventos.filter((e) => COMENTARIOS[e]);
      if (COMENTARIOS[c.clima]) opciones.push(c.clima);
      return opciones.length ? COMENTARIOS[elegir(opciones)] : null;
    }

    // ---------- emociones ----------
    emocionBase(p) {
      const a = ACT[p.act];
      if (a && a.dormir && p.fase === 'haciendo') return 'dormido';
      const n = p.nec, d = p.d;
      if (n.energia < 18) return 'cansado';
      if (n.comida < 15) return d.rasgos && d.rasgos.irritable ? 'enojado' : 'triste';
      if (n.calma < 18) return 'nervioso';
      if (n.diversion < 18) return 'aburrido';
      if (n.social < 14) return 'triste';
      if (a && a.emo && p.fase === 'haciendo' && Math.random() < 0.6) return a.emo;
      let prom = 0;
      for (const k of NECESIDADES) prom += n[k];
      prom /= NECESIDADES.length;
      if (prom > 78) return d.emoFeliz || 'feliz';
      if (prom > 52) return d.emoBase || 'contento';
      if (prom > 36) return 'neutral';
      return 'triste';
    }

    ponerEmocion(id, emo, segundos) {
      const p = this.estado[id];
      if (!p || EMOCIONES.indexOf(emo) < 0) return;
      p.emocion = emo;
      p.emoHasta = this.reloj() + (segundos || 12) * 1000;
      this.alEvento({ t: 'emocion', id, emocion: emo });
    }

    // ---------- paso principal ----------
    paso() {
      const ahora = this.reloj();
      let dt = (ahora - this.ultimoPaso) / 1000;
      this.ultimoPaso = ahora;
      if (dt <= 0) return;
      if (dt > 900) dt = 900;
      const min = dt / 60;
      const noche = this.esNoche(this.hora());
      if (ahora - this.ultimoCal > 10000) this.actualizarCalendario();
      for (const id in this.estado) {
        const p = this.estado[id], r = p.d.rasgos || {};
        if (p.fase === 'yendo' && ahora >= p.llega) p.fase = 'haciendo';
        const a = ACT[p.act];
        for (const n of NECESIDADES) {
          let dec = DECAE[n];
          if (n === 'energia') dec *= (r.sueno || 1) * (noche && !r.nocturno ? 2.6 : 1);
          if (n === 'comida') dec *= r.apetito || 1;
          if (n === 'social') dec *= (r.social !== undefined ? 0.4 + r.social : 1);
          if (n === 'diversion') dec *= r.inquieto || 1;
          if (n === 'calma') dec *= r.estres || 1;
          let v = p.nec[n] - dec * min;
          if (a && p.fase === 'haciendo' && a.ef[n]) v += a.ef[n] * min;
          p.nec[n] = limitar(v, 0, 100);
        }
        // Dormir: despertar al llenarse o al amanecer
        if (a && a.dormir && p.fase === 'haciendo' && p.nec.energia >= 99 && !noche) p.hasta = Math.min(p.hasta, ahora);
        if (ahora >= p.hasta && !p.enCharla) this.decidir(p);
        if (ahora >= p.emoHasta) {
          const e = this.emocionBase(p);
          p.emoHasta = ahora + azar(14, 30) * 1000;
          if (e !== p.emocion) { p.emocion = e; this.alEvento({ t: 'emocion', id: p.id, emocion: e }); }
        }
      }
      // líneas de diálogo programadas
      while (this.colaLineas.length && this.colaLineas[0].t <= ahora) {
        const l = this.colaLineas.shift();
        if (l.fin) { this._terminarCharla(l.charla); continue; }
        if (l.finPar) { this._terminarPar(l.finPar); continue; }
        this.decir(l.id, l.texto, l.emocion, { a: l.a, dur: l.dur });
      }
      if (ahora >= this.proximaCharla) {
        this.proximaCharla = ahora + azar(this.config.charlaCada[0], this.config.charlaCada[1]) * 1000;
        if (!this.pausaCharlas) this.intentarCharla();
      }
      if (ahora >= this.proximaPareja) {
        this.proximaPareja = ahora + azar(5, 11) * 1000;
        this.intentarPareja();
      }
      if (ahora >= this.proximoPensamiento) {
        this.proximoPensamiento = ahora + azar(this.config.pensamientoCada[0], this.config.pensamientoCada[1]) * 1000;
        if (!this.pausaCharlas) this.intentarPensamiento();
      }
    }

    adentro(p) { const s = this.spotPorId[p.spot]; return !!(s && s.pose === 'dentro'); }

    despierto(p) {
      const a = ACT[p.act];
      return !(a && a.dormir && p.fase === 'haciendo');
    }

    // ---------- habla ----------
    decir(id, texto, emocion, opc) {
      const p = this.estado[id];
      if (!p || !texto) return;
      opc = opc || {};
      const pal = texto.split(/\s+/).length;
      const dur = opc.dur || limitar(2 + pal * 0.4, 3.2, 10);
      if (emocion && EMOCIONES.indexOf(emocion) >= 0) { p.emocion = emocion; p.emoHasta = this.reloj() + (dur + 6) * 1000; }
      this.alEvento({ t: 'decir', id, texto, emocion: p.emocion, dur, a: opc.a || null, modo: opc.modo || 'habla' });
    }

    // ---------- charlas ----------
    intentarCharla() {
      if (this.charlas.length >= this.config.maxCharlas) return;
      const ahora = this.reloj();
      const libres = [];
      for (const id in this.estado) {
        const p = this.estado[id];
        if (p.d.tipo === 'gato' || p.enCharla || p.fase !== 'haciendo' || !this.despierto(p) || ahora < p.charlaCooldown || this.adentro(p)) continue;
        libres.push(p);
      }
      let mejor = null, mejorV = -1e9;
      for (let i = 0; i < libres.length; i++) {
        const a = libres[i], pa = this.posicion(a);
        for (let j = i + 1; j < libres.length; j++) {
          const b = libres[j], pb = this.posicion(b);
          const dd = dist(pa, pb);
          if (dd > 4.2) continue;
          const sa = ACT[a.act], sb = ACT[b.act];
          let v = (sa.social ? 1.2 : 0) + (sb.social ? 1.2 : 0);
          v += (200 - a.nec.social - b.nec.social) / 100;
          v += (Math.abs(a.rel[b.id] || 0) + Math.abs(b.rel[a.id] || 0)) / 80;
          v += a.d.serie !== b.d.serie ? 0.9 : 0.4;
          v -= dd * 0.15;
          v += azar(0, 1.6);
          if (v > mejorV) { mejorV = v; mejor = [a, b]; }
        }
      }
      if (mejor && mejorV > 1.2) this.iniciarCharla(mejor[0], mejor[1]);
    }

    contextoCharla(a, b) {
      const s = this.spotPorId[a.spot];
      const z = s ? this.zonaPorId[s.zona] : null;
      return {
        zona: z ? z.nombre : 'el pueblo', hora: this.hora(), noche: this.esNoche(this.hora()),
        actA: ACT[a.act] ? ACT[a.act].txt : 'paseando', actB: ACT[b.act] ? ACT[b.act].txt : 'paseando',
        relAB: a.rel[b.id] || 0, relBA: b.rel[a.id] || 0, clima: this.textoClima()
      };
    }

    iniciarCharla(a, b) {
      const c = { a: a.id, b: b.id, inicio: this.reloj() };
      this.charlas.push(c);
      a.enCharla = b.enCharla = true;
      this.alEvento({ t: 'charla', a: a.id, b: b.id });
      const ctx = this.contextoCharla(a, b);
      const usarFallback = () => this._programarCharla(c, this.dialogoEnlatado(a, b, ctx));
      if (!this.generador) return usarFallback();
      let resuelto = false;
      const limite = setTimeout(() => { if (!resuelto) { resuelto = true; usarFallback(); } }, 75000);
      Promise.resolve().then(() => this.generador(a, b, ctx)).then((r) => {
        if (resuelto) return;
        resuelto = true; clearTimeout(limite);
        if (r && Array.isArray(r.lineas) && r.lineas.length) this._programarCharla(c, r);
        else usarFallback();
      }).catch(() => { if (!resuelto) { resuelto = true; clearTimeout(limite); usarFallback(); } });
    }

    dialogoEnlatado(a, b, ctx) {
      const nb = b.d.corto || b.d.nombre;
      const lineas = [];
      const fa = a.d.frases || [], fb = b.d.frases || [];
      const tema = this.comentarioDelDia();
      const coment = tema && Math.random() < 0.45 ? tema : (COMENTARIOS[a.act] || COMENTARIOS.general);
      lineas.push({ quien: a.id, texto: Math.random() < 0.5 ? elegir(SALUDOS).replace('{b}', nb) : elegir(coment), emocion: a.d.emoBase || 'contento' });
      lineas.push({ quien: b.id, texto: fb.length && Math.random() < 0.75 ? elegir(fb) : elegir(COMENTARIOS.general), emocion: b.d.emoBase || 'contento' });
      if (Math.random() < 0.65) lineas.push({ quien: a.id, texto: fa.length && Math.random() < 0.6 ? elegir(fa) : elegir(coment), emocion: elegir(['riendo', 'contento', 'picaro', 'sorprendido', 'pensativo']) });
      return { lineas, resumen: 'charlamos un rato en ' + ctx.zona, afinidad: 1, enlatado: true };
    }

    _programarCharla(c, r) {
      const ahora = this.reloj();
      let t = ahora + 400;
      const a = this.estado[c.a], b = this.estado[c.b];
      if (!a || !b) return;
      const lineas = r.lineas.filter((l) => l && l.texto && (l.quien === c.a || l.quien === c.b)).slice(0, 6);
      if (!lineas.length) { lineas.push({ quien: c.a, texto: '...', emocion: 'confundido' }, { quien: c.b, texto: '...', emocion: 'confundido' }); }
      for (const l of lineas) {
        const pal = String(l.texto).split(/\s+/).length;
        const dur = limitar(2 + pal * 0.4, 3.2, 10);
        this.colaLineas.push({ t, id: l.quien, texto: String(l.texto).slice(0, 220), emocion: l.emocion, a: l.quien === c.a ? c.b : c.a, dur });
        t += (dur + 0.6) * 1000;
      }
      c.r = r;
      this.colaLineas.push({ t: t + 300, fin: true, charla: c });
      this.colaLineas.sort((x, y) => x.t - y.t);
      // que no se vayan a mitad de la charla
      const fin = t + 1500;
      a.hasta = Math.max(a.hasta, fin);
      b.hasta = Math.max(b.hasta, fin);
    }

    _terminarCharla(c) {
      const i = this.charlas.indexOf(c);
      if (i >= 0) this.charlas.splice(i, 1);
      const a = this.estado[c.a], b = this.estado[c.b];
      const ahora = this.reloj();
      const r = c.r || {};
      const af = limitar(Number(r.afinidad) || 0, -2, 2);
      for (const [p, o] of [[a, b], [b, a]]) {
        if (!p) continue;
        p.enCharla = false;
        p.charlaCooldown = ahora + azar(50, 110) * 1000;
        p.nec.social = limitar(p.nec.social + 18, 0, 100);
        if (o) {
          p.rel[o.id] = limitar((p.rel[o.id] || 0) + 2 + af * 5, -100, 100);
          if (r.resumen && !r.enlatado) this.recordar(p.id, 'Hablé con ' + o.d.nombre + ': ' + r.resumen);
        }
      }
      if (a && b) this.registrar(a.d.corto + ' y ' + b.d.corto + ' charlaron' + (r.resumen && !r.enlatado ? ': ' + r.resumen : '.'));
      this.alEvento({ t: 'fin_charla', a: c.a, b: c.b });
    }

    intentarPensamiento() {
      const ahora = this.reloj();
      const libres = Object.values(this.estado).filter((p) => p.fase === 'haciendo' && !p.enCharla && this.despierto(p) && !this.adentro(p));
      if (!libres.length) return;
      const p = elegir(libres);
      const ctx = { act: ACT[p.act] ? ACT[p.act].txt : 'paseando', zona: this.zonaDe(p), hora: this.hora() };
      const enlatado = () => {
        const f = p.d.frases || [];
        const tema = this.comentarioDelDia();
        const extra = tema && Math.random() < 0.4 ? tema : (COMENTARIOS[p.act] || COMENTARIOS.general);
        this.decir(p.id, f.length && Math.random() < 0.7 ? elegir(f) : elegir(extra), null, { modo: 'piensa' });
      };
      if (!this.generadorPensamiento) return enlatado();
      Promise.resolve().then(() => this.generadorPensamiento(p, ctx)).then((r) => {
        if (r && r.texto) this.decir(p.id, r.texto, r.emocion, { modo: 'piensa' });
        else enlatado();
      }).catch(enlatado);
    }

    // ---------- interacciones entre vecinos ----------
    deLaPartida(p, ahora) {
      if (p.d.tipo === 'gato' || (p.d.ap && p.d.ap.cuerpo) || p.enCharla || p.fase !== 'haciendo' || !this.despierto(p) || ahora < (p.parCooldown || 0) || this.adentro(p)) return false;
      const s = this.spotPorId[p.spot];
      return !!s && !s.vehiculo;
    }
    dePie(p) { const s = this.spotPorId[p.spot]; return !!s && (s.pose || 'parado') === 'parado'; }
    intentarPareja() {
      const ahora = this.reloj(), libres = [];
      for (const id in this.estado) if (this.deLaPartida(this.estado[id], ahora)) libres.push(this.estado[id]);
      let mejor = null, mejorV = -1e9;
      for (let i = 0; i < libres.length; i++) {
        const a = libres[i], pa = this.posicion(a);
        for (let j = i + 1; j < libres.length; j++) {
          const b = libres[j], pb = this.posicion(b), dd = dist(pa, pb);
          if (dd > 4.5) continue;
          const v = (Math.abs(a.rel[b.id] || 0) + Math.abs(b.rel[a.id] || 0)) / 60 + (this.dePie(a) && this.dePie(b) ? 1.4 : 0) - dd * 0.2 + azar(0, 1.6);
          if (v > mejorV) { mejorV = v; mejor = Math.random() < 0.5 ? [a, b] : [b, a]; }
        }
      }
      if (mejor) this.interactuarPar(mejor[0], mejor[1]);
    }
    elegirInteraccion(a, b) {
      const rel = ((a.rel[b.id] || 0) + (b.rel[a.id] || 0)) / 2, juntos = this.dePie(a) && this.dePie(b);
      a.zonaAct = (this.spotPorId[a.spot] || {}).zona; b.zonaAct = (this.spotPorId[b.spot] || {}).zona;
      const op = [];
      let suma = 0;
      for (const k in INTER_PAR) {
        const i = INTER_PAR[k];
        if (rel < i.rel[0] || rel > i.rel[1] || ((i.cerca || i.depie) && !juntos) || (i.solo && !i.solo(a, b))) continue;
        op.push(k); suma += i.peso || 1;
      }
      let r = Math.random() * suma;
      for (const k of op) { r -= INTER_PAR[k].peso || 1; if (r <= 0) return k; }
      return op[0] || null;
    }
    interactuarPar(a, b, tipo) {
      tipo = tipo || this.elegirInteraccion(a, b);
      const i = INTER_PAR[tipo];
      if (!i) return false;
      const ahora = this.reloj(), c = { a: a.id, b: b.id, tipo };
      a.enCharla = b.enCharla = true;
      this.alEvento({ t: 'par', a: a.id, b: b.id, tipo, anim: i.anim, cerca: !!i.cerca, dur: i.dur });
      // si tienen que juntarse, el que camina necesita un momento antes de que empiece lo demás
      const pausa = i.cerca ? 1200 : 200, fin = ahora + pausa + i.dur * 1000;
      this.colaLineas.push({ t: ahora + pausa, id: a.id, texto: elegir(i.dice[0]), emocion: i.emo[0], a: b.id, dur: Math.min(3.4, i.dur) });
      this.colaLineas.push({ t: ahora + pausa + 1700, id: b.id, texto: elegir(i.dice[1]), emocion: i.emo[1], a: a.id, dur: Math.min(3.4, i.dur) });
      this.colaLineas.push({ t: fin, finPar: c });
      this.colaLineas.sort((x, y) => x.t - y.t);
      a.hasta = Math.max(a.hasta, fin + 1500); b.hasta = Math.max(b.hasta, fin + 1500);
      return true;
    }
    _terminarPar(c) {
      const a = this.estado[c.a], b = this.estado[c.b], i = INTER_PAR[c.tipo], ahora = this.reloj();
      for (const [p, o] of [[a, b], [b, a]]) {
        if (!p) continue;
        p.enCharla = false;
        p.parCooldown = ahora + azar(40, 90) * 1000;
        p.nec.social = limitar(p.nec.social + 6, 0, 100);
        if (o) p.rel[o.id] = limitar((p.rel[o.id] || 0) + i.af, -100, 100);
        if (i.nec && p === b) for (const n in i.nec) p.nec[n] = limitar(p.nec[n] + i.nec[n], 0, 100);
      }
      if (a && b && i.diario) {
        const txt = i.diario.replace('{a}', a.d.corto).replace('{b}', b.d.corto);
        this.registrar(txt);
        this.recordar(a.id, txt); this.recordar(b.id, txt);
      }
      this.alEvento({ t: 'fin_par', a: c.a, b: c.b });
    }
    // Botón SOCIALIZAR de la ficha: busca a quien tenga más cerca (aunque esté a unos pasos)
    socializar(id) {
      const a = this.estado[id], ahora = this.reloj();
      if (!a || !this.deLaPartida(Object.assign({}, a, { parCooldown: 0 }), ahora)) return false;
      const pa = this.posicion(a);
      let mejor = null, md = 12;
      for (const k in this.estado) {
        const b = this.estado[k];
        if (b === a || !this.deLaPartida(Object.assign({}, b, { parCooldown: 0 }), ahora)) continue;
        const d = dist(pa, this.posicion(b));
        if (d < md) { md = d; mejor = b; }
      }
      return mejor ? this.interactuarPar(a, mejor) : false;
    }

    // ---------- memoria ----------
    recordar(id, texto) {
      const p = this.estado[id];
      if (!p) return;
      p.recuerdos.push(texto.slice(0, 240));
      if (p.recuerdos.length > 10) p.recuerdos.shift();
    }

    registrar(texto) {
      const h = new Date(this.reloj());
      const e = { hora: ('0' + h.getHours()).slice(-2) + ':' + ('0' + h.getMinutes()).slice(-2), texto };
      this.diario.push(e);
      if (this.diario.length > 200) this.diario.shift();
      this.alEvento({ t: 'log', texto: e.texto, hora: e.hora });
    }

    zonaDe(p) {
      const s = this.spotPorId[p.spot];
      const z = s ? this.zonaPorId[s.zona] : null;
      return z ? z.nombre : 'el pueblo';
    }

    // Texto con el estado de un personaje (para los prompts de la IA)
    describir(id) {
      const p = this.estado[id];
      if (!p) return null;
      const a = ACT[p.act];
      const nec = NECESIDADES.map((n) => NOMBRE_NEC[n] + ' ' + Math.round(p.nec[n])).join(', ');
      const amigos = Object.entries(p.rel).filter(([o]) => this.porId[o]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 4)
        .map(([o, v]) => this.porId[o].corto + (v > 40 ? ' (muy cercano)' : v > 10 ? ' (amigo)' : v < -40 ? ' (enemigo)' : v < -10 ? ' (no le cae bien)' : ' (conocido)'));
      const s = this.spotPorId[p.spot];
      const actividad = a ? (a.txtEn && s && s.lugar ? a.txtEn.replace('{lugar}', s.lugar) : a.txt) : 'Paseando';
      return {
        actividad, zona: this.zonaDe(p), emocion: p.emocion, necesidades: nec,
        recuerdos: p.recuerdos.slice(-5), relaciones: amigos, durmiendo: !this.despierto(p)
      };
    }

    // Interacciones del usuario con clics (el anfitrión genera la frase)
    interactuar(id, accion) {
      const p = this.estado[id];
      if (!p) return null;
      if (accion === 'comida') { p.nec.comida = limitar(p.nec.comida + 35, 0, 100); this.ponerEmocion(id, 'feliz', 15); }
      else if (accion === 'saludar') { if (!this.despierto(p)) { p.hasta = this.reloj(); } this.ponerEmocion(id, 'contento', 10); }
      else if (accion === 'molestar') { this.ponerEmocion(id, p.d.rasgos && p.d.rasgos.irritable ? 'enojado' : 'sorprendido', 10); p.nec.calma = limitar(p.nec.calma - 10, 0, 100); }
      else if (accion === 'dormir') this.ordenar(id, 'dormir');
      else if (accion === 'jugar') this.ordenar(id, 'jugar');
      else if (accion === 'comer') this.ordenar(id, 'comer');
      return this.describir(id);
    }

    // ---------- estado público / guardado ----------
    instantanea() {
      const ahora = this.reloj();
      return Object.values(this.estado).map((p) => ({
        id: p.id, act: p.act, spot: p.spot, fase: p.fase, restante: Math.max(0, Math.round((p.llega - ahora) / 1000)),
        emocion: p.emocion, nec: NECESIDADES.reduce((o, n) => (o[n] = Math.round(p.nec[n]), o), {}), enCharla: p.enCharla
      }));
    }

    // El editor agregó, cambió o quitó personajes: se aplica sin reiniciar y cada uno conserva lo que vivió
    sincronizar(lista) {
      const ids = {};
      for (const d of lista) ids[d.id] = d;
      for (const id in this.estado) {
        if (ids[id]) continue;
        for (const c of this.charlas.slice()) if (c.a === id || c.b === id) this._terminarCharla(c);
        this.colaLineas = this.colaLineas.filter((l) => l.id !== id && !(l.charla && (l.charla.a === id || l.charla.b === id)));
        const p = this.estado[id];
        if (p.spot && this.ocupado[p.spot] === id) delete this.ocupado[p.spot];
        this.ausentes[id] = { nec: p.nec, rel: p.rel, recuerdos: p.recuerdos };
        delete this.estado[id];
      }
      this.datos = lista; this.porId = ids; this.zonasRegion = {};
      for (const d of lista) if (d.region) this.zonasRegion[d.id] = new Set((this.mundo.regiones || {})[d.region] || []);
      for (const d of lista) {
        let p = this.estado[d.id];
        if (!p) {
          p = this.estado[d.id] = this._nuevo(d);
          if (this.ausentes[d.id]) { this.importar({ personajes: { [d.id]: this.ausentes[d.id] } }); delete this.ausentes[d.id]; }
          this.decidir(p, { inmediato: true });
          continue;
        }
        p.d = d;
        Object.assign(p.rel, d.relaciones || {});
        const s = this.spotPorId[p.spot], a = s && ACT[s.act];
        if (!a || !this.tipoPermitido(p, a, s)) this.decidir(p, { inmediato: true });
      }
    }

    exportar() {
      const personajes = Object.assign({}, this.ausentes);
      for (const id in this.estado) {
        const p = this.estado[id];
        personajes[id] = { nec: p.nec, rel: p.rel, recuerdos: p.recuerdos };
      }
      return { v: 1, guardado: new Date(this.reloj()).toISOString(), personajes, diario: this.diario.slice(-60) };
    }

    importar(g) {
      if (!g || !g.personajes) return;
      for (const id in g.personajes) {
        const p = this.estado[id], s = g.personajes[id];
        if (!s) continue;
        if (!p) { this.ausentes[id] = s; continue; }
        if (s.nec) for (const n of NECESIDADES) if (typeof s.nec[n] === 'number') p.nec[n] = limitar(s.nec[n], 5, 100);
        if (s.rel) Object.assign(p.rel, s.rel);
        if (Array.isArray(s.recuerdos)) p.recuerdos = s.recuerdos.slice(-10);
      }
      if (Array.isArray(g.diario)) this.diario = g.diario.slice(-60);
    }
  }

  return { Simulacion, ACT, GRUPOS, INTER_PAR, NECESIDADES, NOMBRE_NEC, EMOCIONES, COMENTARIOS, elegir, azar, calendario, EVENTOS, CLIMAS, ESTACIONES, NOMBRE_CLIMA, NOMBRE_ESTACION };
});
