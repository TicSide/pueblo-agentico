' Abre el editor de personajes en el navegador. Si el cerebro está apagado, primero lo enciende.
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
Set http = CreateObject("MSXML2.XMLHTTP")
vivo = False
On Error Resume Next
http.Open "GET", "http://127.0.0.1:8787/api/editor", False
http.Send
If Err.Number = 0 And http.Status = 200 Then vivo = True
Err.Clear
On Error GoTo 0
If Not vivo Then
  sh.Run "wscript """ & dir & "\iniciar-cerebro-oculto.vbs""", 0, False
  WScript.Sleep 2500
End If
sh.Run "http://127.0.0.1:8787/editor"
