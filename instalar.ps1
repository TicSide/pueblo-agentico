# Pueblo Agéntico — instalación (ejecútalo una vez):
#   powershell -ExecutionPolicy Bypass -File .\instalar.ps1
# 1) Enlaza el wallpaper en Wallpaper Engine (myprojects)
# 2) Crea los atajos Ctrl+Alt+H (hablarle al pueblo) y Ctrl+Alt+E (editor de personajes)
# 3) Hace que el cerebro arranque solo al iniciar Windows
# 4) Enciende el cerebro ahora
#   Con -Aplicar además pone el Pueblo como fondo de pantalla.
#   Con -RutaWE indica dónde está Wallpaper Engine, si no está en la biblioteca principal de Steam.
param([switch]$Aplicar, [string]$RutaWE)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$we = $RutaWE
if (-not $we) {
  $steam = try { (Get-ItemProperty 'HKCU:\Software\Valve\Steam' -ErrorAction Stop).SteamPath -replace '/', '\' } catch { 'C:\Program Files (x86)\Steam' }
  $we = Join-Path $steam 'steamapps\common\wallpaper_engine'
}
if (-not (Test-Path $we)) { throw "No encontré Wallpaper Engine en $we. Indica la carpeta con -RutaWE." }
$sh = New-Object -ComObject WScript.Shell

# Dependencias del cerebro
if (-not (Test-Path (Join-Path $raiz 'cerebro\node_modules'))) {
  Push-Location (Join-Path $raiz 'cerebro')
  try { npm install --omit=dev } finally { Pop-Location }
  Write-Host '✔ Dependencias del cerebro instaladas'
}

# 1) Wallpaper Engine
$destino = Join-Path $we 'projects\myprojects\pueblo_agentico'
if (Test-Path $destino) { Write-Host "✔ El wallpaper ya está enlazado en Wallpaper Engine: $destino" }
else {
  New-Item -ItemType Junction -Path $destino -Target (Join-Path $raiz 'wallpaper') | Out-Null
  Write-Host "✔ Wallpaper enlazado en Wallpaper Engine: $destino"
}

# 2) Atajo Ctrl+Alt+H (debe estar en el menú Inicio para que Windows registre la tecla)
$menu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
$lnk = $sh.CreateShortcut((Join-Path $menu 'Hablar con el Pueblo.lnk'))
$lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
$lnk.Arguments = '"' + (Join-Path $raiz 'cerebro\hablar.vbs') + '"'
$lnk.WorkingDirectory = Join-Path $raiz 'cerebro'
$lnk.Hotkey = 'CTRL+ALT+H'
$lnk.IconLocation = "$env:WINDIR\System32\shell32.dll,160"
$lnk.Description = 'Hablarle al Pueblo Agéntico'
$lnk.Save()
Write-Host '✔ Atajo Ctrl+Alt+H creado (menú Inicio > Hablar con el Pueblo)'
$lnkE = $sh.CreateShortcut((Join-Path $menu 'Editor de Personajes.lnk'))
$lnkE.TargetPath = "$env:WINDIR\System32\wscript.exe"
$lnkE.Arguments = '"' + (Join-Path $raiz 'cerebro\abrir-editor.vbs') + '"'
$lnkE.WorkingDirectory = Join-Path $raiz 'cerebro'
$lnkE.Hotkey = 'CTRL+ALT+E'
$lnkE.IconLocation = "$env:WINDIR\System32\shell32.dll,269"
$lnkE.Description = 'Crear y editar los personajes del Pueblo Agéntico'
$lnkE.Save()
Write-Host '✔ Atajo Ctrl+Alt+E creado (menú Inicio > Editor de Personajes)'

# 3) Cerebro al iniciar Windows
$inicio = [Environment]::GetFolderPath('Startup')
$lnk2 = $sh.CreateShortcut((Join-Path $inicio 'Cerebro Pueblo Agentico.lnk'))
$lnk2.TargetPath = "$env:WINDIR\System32\wscript.exe"
$lnk2.Arguments = '"' + (Join-Path $raiz 'cerebro\iniciar-cerebro-oculto.vbs') + '"'
$lnk2.WorkingDirectory = Join-Path $raiz 'cerebro'
$lnk2.Save()
Write-Host '✔ El cerebro arrancará solo al iniciar Windows'

# 4) Encender el cerebro ahora (si no está corriendo)
$corriendo = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if ($corriendo) { Write-Host '✔ El cerebro ya estaba encendido' }
else { Start-Process "$env:WINDIR\System32\wscript.exe" -ArgumentList ('"' + (Join-Path $raiz 'cerebro\iniciar-cerebro-oculto.vbs') + '"'); Write-Host '✔ Cerebro encendido (panel: http://127.0.0.1:8787)' }

# 5) Poner el wallpaper (opcional)
if ($Aplicar) {
  & (Join-Path $we 'wallpaper64.exe') -control openWallpaper -file (Join-Path $destino 'project.json')
  Write-Host '✔ Pueblo Agéntico puesto como fondo.'
} else { Write-Host 'Para ponerlo de fondo: búscalo en Wallpaper Engine (tus proyectos) o vuelve a ejecutar con -Aplicar.' }
Write-Host 'Listo: clic en un personaje para ver su ficha y Ctrl+Alt+H para hablarles.'
