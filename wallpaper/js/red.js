/* Pueblo Agéntico — conexión WebSocket con el cerebro local (se reconecta sola). */
window.PA = window.PA || {};
PA.Red = (function () {
  'use strict';
  let ws = null, puerto = 8787, conectado = false, timer = 0, alMensaje = () => {}, alCambio = () => {};

  function conectar(p, onMensaje, onCambio) {
    puerto = p || puerto;
    if (onMensaje) alMensaje = onMensaje;
    if (onCambio) alCambio = onCambio;
    abrir();
  }
  function abrir() {
    clearTimeout(timer);
    try { ws = new WebSocket(`ws://127.0.0.1:${puerto}/ws?cliente=wallpaper`); }
    catch (e) { reintentar(); return; }
    ws.onopen = () => { conectado = true; alCambio(true); enviar({ t: 'hola', cliente: 'wallpaper', version: 1 }); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } alMensaje(m); };
    ws.onclose = () => { if (conectado) { conectado = false; alCambio(false); } reintentar(); };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* nada */ } };
  }
  function reintentar() { clearTimeout(timer); timer = setTimeout(abrir, 4000); }
  function enviar(o) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } return false; }
  function cambiarPuerto(p) { if (p && p !== puerto) { puerto = p; try { ws && ws.close(); } catch (e) { /* nada */ } abrir(); } }

  return { conectar, enviar, cambiarPuerto, get conectado() { return conectado; } };
})();
