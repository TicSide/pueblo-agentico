' Inicia el cerebro en segundo plano (sin ventana). El registro queda en datos\registro.log
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
sh.Run "cmd /c node servidor.js > datos\registro.log 2>&1", 0, False
