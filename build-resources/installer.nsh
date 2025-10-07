; Custom NSIS installer script for Speech Overlay App

; Create config template in user directory
Section "ConfigTemplate"
  SetOutPath "$APPDATA\Speech Overlay App"
  File "${BUILD_RESOURCES_DIR}\..\config-template.json"
  File "${BUILD_RESOURCES_DIR}\..\README-SETUP.md"
SectionEnd

; Create desktop shortcut with custom icon
Section "DesktopShortcut"
  CreateShortCut "$DESKTOP\Speech Overlay App.lnk" "$INSTDIR\Speech Overlay App.exe" "" "$INSTDIR\Speech Overlay App.exe" 0
SectionEnd