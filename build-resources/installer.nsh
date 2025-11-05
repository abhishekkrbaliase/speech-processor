; Custom NSIS installer script for Speech Processor

; Create desktop shortcut with custom icon
Section "DesktopShortcut"
  CreateShortCut "$DESKTOP\Speech Processor.lnk" "$INSTDIR\Speech Processor.exe" "" "$INSTDIR\Speech Processor.exe" 0
SectionEnd