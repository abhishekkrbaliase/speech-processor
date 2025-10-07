#!/usr/bin/env node

/**
 * Debug script to test overlay functionality
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  // Create a simple overlay window for testing
  const overlayWindow = new BrowserWindow({
    width: 600,
    height: 300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'dist/preload.js'),
      sandbox: false
    },
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: true,
    show: true
  });

  // Load the overlay
  overlayWindow.loadFile(path.join(__dirname, 'dist/overlay.html'));
  
  // Open dev tools for debugging
  overlayWindow.webContents.openDevTools();
  
  console.log('Debug overlay window created. Check the dev tools for console output.');
  console.log('Click the Test button in the overlay to see if it works.');
});

app.on('window-all-closed', () => {
  app.quit();
});