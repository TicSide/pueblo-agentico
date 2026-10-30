# Pueblo Agéntico — ventanita para hablarle al pueblo (se abre con el atajo Ctrl+Alt+H).
# Enter envía, Esc cierra. Si el cerebro está apagado, manda el mensaje por Wallpaper Engine.
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$puerto = 8787
try { $puerto = (Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json).puerto } catch {}
$url = "http://127.0.0.1:$puerto"
$steam = try { (Get-ItemProperty 'HKCU:\Software\Valve\Steam' -ErrorAction Stop).SteamPath -replace '/', '\' } catch { 'C:\Program Files (x86)\Steam' }
$we = Join-Path $steam 'steamapps\common\wallpaper_engine\wallpaper64.exe'

$fondo = [System.Drawing.Color]::FromArgb(28, 30, 43)
$campo = [System.Drawing.Color]::FromArgb(40, 43, 60)
$fuente = New-Object System.Drawing.Font('Segoe UI', 11)

$f = New-Object System.Windows.Forms.Form
$f.Text = 'Hablarle al Pueblo Agéntico'
$f.FormBorderStyle = 'FixedToolWindow'
$f.StartPosition = 'Manual'
$f.TopMost = $true
$f.KeyPreview = $true
$f.BackColor = $fondo
$f.ForeColor = [System.Drawing.Color]::White
$f.ClientSize = New-Object System.Drawing.Size(640, 82)
$area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$f.Location = New-Object System.Drawing.Point([int]($area.Left + ($area.Width - 640) / 2), [int]($area.Bottom - 190))

$combo = New-Object System.Windows.Forms.ComboBox
$combo.DropDownStyle = 'DropDownList'
$combo.Font = $fuente
$combo.BackColor = $campo
$combo.ForeColor = [System.Drawing.Color]::White
$combo.FlatStyle = 'Flat'
$combo.SetBounds(10, 10, 170, 30)
[void]$combo.Items.Add('Quien sea')
$ids = @('')
try {
  $lista = Invoke-RestMethod -Uri "$url/api/personajes" -TimeoutSec 2
  foreach ($p in $lista) { [void]$combo.Items.Add($p.nombre); $ids += $p.id }
} catch {}
$combo.SelectedIndex = 0

$txt = New-Object System.Windows.Forms.TextBox
$txt.Font = $fuente
$txt.BackColor = $campo
$txt.ForeColor = [System.Drawing.Color]::White
$txt.BorderStyle = 'FixedSingle'
$txt.SetBounds(188, 10, 442, 30)

$lbl = New-Object System.Windows.Forms.Label
$lbl.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$lbl.ForeColor = [System.Drawing.Color]::FromArgb(170, 172, 190)
$lbl.SetBounds(10, 50, 620, 24)
$lbl.Text = 'Enter: enviar · Esc: cerrar · Empieza con un nombre para hablar con alguien: "Jane, ¿quién es Red John?"'
if ($ids.Count -le 1) { $lbl.Text = 'El cerebro no responde: el mensaje irá al wallpaper (modo local, sin IA). Enciende iniciar-cerebro.' }

$f.Controls.AddRange(@($combo, $txt, $lbl))

function Enviar {
  $texto = $txt.Text.Trim()
  if (-not $texto) { return }
  $id = $ids[$combo.SelectedIndex]
  $cuerpo = @{ texto = $texto }
  if ($id) { $cuerpo.a = $id }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes(($cuerpo | ConvertTo-Json -Compress))
  try {
    Invoke-RestMethod -Uri "$url/api/mensaje" -Method Post -Body $bytes -ContentType 'application/json; charset=utf-8' -TimeoutSec 4 | Out-Null
    $f.Close()
  } catch {
    # Plan B: propiedad "mensaje" de Wallpaper Engine (el wallpaper responde en modo local)
    if (Test-Path $we) {
      $limpio = ($texto -replace '[()~]', ' ').Trim()
      & $we -control applyProperties -properties "RAW~(mensaje:$limpio)~END"
      $f.Close()
    } else { $lbl.Text = 'No se pudo enviar: el cerebro está apagado y no encontré Wallpaper Engine.' }
  }
}

$f.Add_KeyDown({
  if ($_.KeyCode -eq 'Escape') { $f.Close() }
  elseif ($_.KeyCode -eq 'Enter') { $_.SuppressKeyPress = $true; Enviar }
})
$f.Add_Shown({ $f.Activate(); $txt.Focus() })
[void]$f.ShowDialog()
