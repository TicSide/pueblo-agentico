/* Arma la copia del wallpaper que se sube a Steam Workshop: node publicar/preparar-workshop.js
 * Deja afuera las fotos de terceros (no tienen licencia para redistribuirse) y lo que solo funciona con la app
 * gratuita de GitHub (editor). Los pasos para publicar están en publicar/WORKSHOP.md. */
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const origen = path.join(raiz, 'wallpaper');
const destino = path.join(raiz, 'dist', 'pueblo_agentico_workshop');
const FUERA = new Set(['fotos', 'herramientas', 'editor.html', path.join('js', 'editor.js'), path.join('css', 'editor.css')]);

// se vacía por dentro: la carpeta puede estar abierta en otra ventana
fs.mkdirSync(destino, { recursive: true });
for (const e of fs.readdirSync(destino)) fs.rmSync(path.join(destino, e), { recursive: true, force: true });
fs.cpSync(origen, destino, { recursive: true, filter: (f) => !FUERA.has(path.relative(origen, f)) });
fs.copyFileSync(path.join(raiz, 'LICENSE'), path.join(destino, 'LICENSE.txt'));
fs.copyFileSync(path.join(raiz, 'COPYRIGHT.md'), path.join(destino, 'COPYRIGHT.txt'));

const archivos = [];
const recorrer = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r = path.join(d, e.name); if (e.isDirectory()) recorrer(r); else archivos.push(r); } };
recorrer(destino);

for (const f of FUERA) if (fs.existsSync(path.join(destino, f))) throw new Error('quedó en el paquete: ' + f);
for (const f of ['index.html', 'project.json', 'preview.png', 'LICENSE.txt']) if (!fs.existsSync(path.join(destino, f))) throw new Error('falta en el paquete: ' + f);

const mb = archivos.reduce((s, f) => s + fs.statSync(f).size, 0) / 1048576;
console.log(`Listo: ${archivos.length} archivos, ${mb.toFixed(1)} MB`);
console.log(destino);
