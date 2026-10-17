const fs = require('fs');
﻿const path = require('path');
const { app, BrowserWindow, ipcMain, session } = require('electron');
const { registerAppHandlers } = require('./ipc/appHandlers');
const { setupSecurity } = require('./security/navigation');

let mainWindow = null;

/**
 * Creates the primary application window with hardened security defaults.
 */
function createMainWindow() {
  const preloadPath = path.resolve(__dirname, '../preload/preload.js');
  const rendererPath = path.resolve(__dirname, '../renderer/index.html');
  const iconPath = path.resolve(__dirname, '../../assets/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    title: 'ApiForge Lite — Spring Edition',
    backgroundColor: '#0c0e14',
    show: false, // Prevents white flash before rendering
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  });

  // Attach navigation restrictions, window open blocking, and permission handlers
  setupSecurity(mainWindow, rendererPath);

  // Apply Content Security Policy via HTTP/file headers for defense-in-depth
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self';"
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY']
      }
    });
  });

  // Gracefully reveal window when ready to display
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle page load failures gracefully
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer Error] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });

  // Handle renderer crash or exit
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`[Process Error] Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  mainWindow.on('unresponsive', () => {
    console.warn('[Window] Application window became unresponsive');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load strictly the local application HTML page
  mainWindow.loadFile(rendererPath);
}

// Ensure single instance lock for desktop stability
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Register IPC handlers before creating windows
    registerAppHandlers(ipcMain, app);

    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
