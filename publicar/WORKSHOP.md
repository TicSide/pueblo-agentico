# Publicar en Steam Workshop

La publicación la hace el autor desde su cuenta, con el editor de Wallpaper Engine.

## Pasos

1. Genera el paquete. Deja afuera las fotos de terceros y el editor:

   ```powershell
   node publicar\preparar-workshop.js
   ```

2. Abre Wallpaper Engine y entra al editor con **Create Wallpaper**.
3. Arrastra `dist\pueblo_agentico_workshop\index.html` a ese botón. Wallpaper Engine copia la carpeta a sus proyectos.
4. Revisa que el proyecto abierto sea esa copia y no el enlace `pueblo_agentico` de desarrollo: ese enlace incluye las fotos.
5. En el menú **Workshop**, elige **Share wallpaper on Workshop**.
6. Pega el título, la descripción y las etiquetas de abajo y publica. Si el diálogo deja elegir la visibilidad, empieza en oculto para probarlo tú primero.

Para actualizar: vuelve a generar el paquete, copia los archivos a ese mismo proyecto y repite el paso 5.

Antes de publicar, prueba el wallpaper en una resolución 21:9 y en tu resolución normal, sin el cerebro encendido.

## Título

```text
Pueblo Agéntico: Living Voxel Town
```

## Descripción

```text
[h1]A voxel town with a life of its own[/h1]
A floating isometric archipelago: a central town and 13 themed islands joined by bridges. 191 characters eat, sleep, work, go to the beach and the movies, greet each other, hug, argue and chat, all day long.

[list]
[*] 14 areas: Tech District, Cinema City, Festival Island, Magic Forest, Sports Park, Residential Quarter, Raccoon City, Sun Beach, Mega Mall, Food Avenue, Amusement Park, Japan and Super Park
[*] Weather, seasons, day and night, and events such as Halloween, Christmas and concerts
[*] Click a neighbor to see their card, feed them or follow them with the camera
[*] Search to find any neighbor with the mouse
[*] Customizable interface: themes, size, panels and speech bubbles
[*] Interface in English, Spanish, Portuguese, French, German, Russian, Chinese and Japanese. Character lines are in Spanish and English
[/list]

[h2]Optional: local AI[/h2]
The wallpaper works on its own. With the free companion app, neighbors talk with a local AI (Ollama), and you can create your own characters:
[url=https://github.com/TicSide/pueblo-agentico]github.com/TicSide/pueblo-agentico[/url]

[h2]License[/h2]
Created by [b]TicSide[/b]. © 2026, licensed under CC BY-NC-ND 4.0: you may use and share it unmodified with credit. Do not sell it, re-upload modified versions, or remove this credit.

This is an unofficial, non-commercial fan project. All characters, series, games and brands belong to their respective owners, who are not affiliated with it.

[h1]Español[/h1]
Un archipiélago isométrico flotante con vida propia: un pueblo central y 13 islas temáticas unidas por puentes. 191 personajes comen, duermen, trabajan, se saludan, se abrazan, discuten y charlan todo el día.

Funciona solo. Con la app gratuita de GitHub, los vecinos hablan con una IA local (Ollama) y puedes crear tus propios personajes.

Creado por [b]TicSide[/b]. © 2026, licencia CC BY-NC-ND 4.0: puedes usarlo y compartirlo sin modificar y dando crédito. No lo vendas, no subas versiones modificadas y no quites este crédito.

Proyecto de fans, sin fines comerciales ni relación con los dueños de los personajes, series, juegos y marcas que aparecen.
```

## Etiquetas

`Game`, `Fantasy`, `Relaxing`. Clasificación: `Everyone`.

## Qué revisar

- **Derechos de terceros.** Al subir declaras que tienes derechos suficientes sobre el contenido. Los personajes y marcas (Resident Evil, Juego de Tronos, Popeyes, McDonald's y otros) son de sus dueños, y Valve puede retirar el wallpaper si alguno reclama. La licencia de este proyecto solo cubre tu obra.
- **Si te lo retiran.** La salida más simple es publicar una versión sin marcas ni personajes reclamados.
