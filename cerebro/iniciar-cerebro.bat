@echo off
chcp 65001 >nul
title Cerebro del Pueblo Agentico
cd /d "%~dp0"
echo Iniciando el cerebro del Pueblo Agentico... (cierra esta ventana para apagarlo)
node servidor.js
pause
