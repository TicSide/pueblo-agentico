/* Cerebro — guarda y carga la memoria del pueblo (necesidades, relaciones, recuerdos, lo que dijo el usuario). */
'use strict';
const fs = require('fs');
const path = require('path');

class Memoria {
  constructor(archivo) {
    this.archivo = archivo;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
  }
  cargar() {
    try { return JSON.parse(fs.readFileSync(this.archivo, 'utf8')); }
    catch (e) { return null; }
  }
  guardar(datos) {
    const tmp = this.archivo + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(datos, null, 1), 'utf8');
    fs.renameSync(tmp, this.archivo);
  }
}

module.exports = { Memoria };
