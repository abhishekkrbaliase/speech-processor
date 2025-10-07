# Assets Directory

This directory contains application assets such as:

- Application icons (icon.png, icon.ico, icon.icns)
- Images and graphics
- Static resources

## Icon Requirements

For proper packaging with electron-builder, include:
- `icon.png` - 512x512 PNG for Linux
- `icon.ico` - Windows icon file
- `icon.icns` - macOS icon file

Icons will be automatically resized by electron-builder for different contexts.