!macro NSIS_HOOK_POSTINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION "¿Deseas que Steam Watcher se inicie automáticamente con Windows en segundo plano para monitorizar ofertas y recibir notificaciones?" IDNO skip_autostart
  CreateShortCut "$SMSTARTUP\Steam Watcher.lnk" "$INSTDIR\Steam Watcher.exe" "--minimized"
  skip_autostart:
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$SMSTARTUP\Steam Watcher.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Steam Watcher"
!macroend
