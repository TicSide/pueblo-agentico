# Cómo está hecho

El proyecto tiene dos partes que comparten los mismos datos y la misma simulación.

| Parte | Carpeta | Qué hace |
| --- | --- | --- |
| Wallpaper | `wallpaper/` | Dibuja el mundo con three.js r159. Son scripts clásicos, sin compilar. |
| Cerebro | `cerebro/` | Servidor local en Node: simulación, IA con Ollama, memoria y guardado del editor. |

Si el cerebro está apagado, el wallpaper corre la misma simulación por su cuenta con frases pregrabadas.

## Archivos compartidos

- `wallpaper/js/datos-personajes.js`: personajes, grupos y mascotas.
- `wallpaper/js/datos-mundo.js`: islas, zonas, muebles, sitios, calles y red de tránsito.
- `wallpaper/js/sim-core.js`: necesidades, decisiones, charlas, interacciones y calendario.
- `wallpaper/js/personalizados.js`: lo creado con el editor. Lo escribe el cerebro.

Después de cambiar datos compartidos hay que reiniciar el cerebro y recargar el wallpaper.

## Idiomas

`wallpaper/js/idiomas.js` guarda las traducciones de la interfaz, las actividades y las islas, con el texto en español como clave: `Idiomas.t('MAPA')`. `idioma-en.js` trae el contenido completo en inglés (frases, personalidades, lugares y comentarios); los otros idiomas usan ese. El español sigue en los datos originales.

`Idiomas.aplicar` traduce los datos compartidos antes de construir el mundo, y `Idiomas.traducirLista` hace una copia de los personajes: los originales quedan intactos porque el editor los compara, y lo que el usuario cambió no se pisa. El wallpaper le avisa su idioma al cerebro con `{t: 'idioma', lang}`.

Al agregar textos, actividades o vecinos, `npm test` avisa lo que falta traducir.

## Wallpaper

- `mundo.js`: construye el mundo. Casi todo se fusiona en pocas mallas con `PA.Geo.Lote`.
- `modelos.js` y `caras.js`: personajes voxel y expresiones en pixel art.
- `actores.js`: caminar con A*, animaciones e interacciones entre vecinos.
- `vehiculos.js`, `animales.js`, `clima.js` y `fondo.js`: lo que da vida al mapa.
- `ui.js`: ficha, diario, buscador y ajustes.
- `main.js`: une todo y atiende los mensajes del cerebro.
- `editor.html` y `js/editor.js`: editor de personajes, servido por el cerebro en `/editor`.

Wallpaper Engine no pasa el teclado a los wallpapers. Por eso el editor se abre en el navegador y todo lo que hay dentro del wallpaper funciona con el mouse.

## Conexión

El wallpaper habla con el cerebro por `ws://127.0.0.1:8787/ws`. El servidor solo escucha en la propia PC y rechaza pedidos de otros orígenes.

| Ruta | Uso |
| --- | --- |
| `GET /` | Panel del cerebro |
| `GET /editor` | Editor de personajes |
| `GET /api/estado` | Estado de la simulación |
| `POST /api/mensaje` | Hablarle al pueblo: `{ texto, a? }` |
| `POST /api/ia` | Encender o apagar la IA: `{ activa }` |
| `POST /api/editor/<acción>` | `guardar`, `restaurar`, `ocultar`, `borrar`, `foto` y `ubicar` |

## Agregar cosas

**Un personaje:** usa el editor. También se puede copiar un bloque en `datos-personajes.js`, con un `id` que no exista.

**Una isla:** en `datos-mundo.js`, llama a `satelite()` y une la isla con `enlace()`. Agrega sus puntos en `RONDAR` y `HOGAR`, y su botón en `index.html`. Para no achicar el encuadre, ponla en la punta de abajo del mapa: `|x - z| ≤ 170`. Si queda lejos del centro, súbele `atractivo` para que lleguen visitantes.

**Una interacción:** agrégala a `INTER_PAR` en `sim-core.js` y su animación en `animarHumano`, dentro de `actores.js`.

## Probar

```bash
cd cerebro
npm test
```

`npm test` revisa que los datos sean coherentes y corre un rato de simulación.

Para ver el wallpaper en un navegador, sirve `wallpaper/` con cualquier servidor estático y abre:

```text
index.html?local=1&puerto=9&ciclo=dia|tarde|noche&clima=lluvia|tormenta|nieve|niebla&estacion=invierno&evento=navidad
```

`puerto=9` evita que se conecte al cerebro. Si se conecta, le manda su clima y queda guardado en tus preferencias. En la consola, `window.PUEBLO` da acceso a la simulación y al mundo.
