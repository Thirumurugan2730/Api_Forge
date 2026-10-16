const path = require('path');
const fs = require('fs');
const { clipboard } = require('electron');
const { executeHttpRequest, cancelHttpRequest } = require('../http/httpClient');

/**
 * Validates any optional arguments supplied to the getAppInfo IPC channel.
 *
 * @param {unknown} args - The arguments received over IPC.
 * @throws {TypeError|RangeError|Error} If arguments fail validation.
 */
function validateGetAppInfoArgs(args) {
  if (args === undefined || args === null) {
    return true;
  }

  if (typeof args !== 'object' || Array.isArray(args)) {
    throw new TypeError('Invalid arguments: payload must be an object or empty');
  }

  const proto = Object.getPrototypeOf(args);
  if (proto !== null && proto !== Object.prototype) {
    throw new Error('Invalid prototype: only plain objects are permitted');
  }

  const payloadString = JSON.stringify(args);
  if (payloadString.length > 1024) {
    throw new RangeError('Payload exceeds maximum permitted size of 1024 bytes');
  }

  const allowedKeys = ['requestTimestamp'];
  const ownKeys = Object.getOwnPropertyNames(args);
  for (const key of ownKeys) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`Unexpected argument key: ${key}`);
    }
  }

  if ('requestTimestamp' in args && typeof args.requestTimestamp !== 'number') {
    throw new TypeError('requestTimestamp must be a number');
  }

  return true;
}

/**
 * Retrieves the application package metadata.
 *
 * @returns {{ name: string, version: string }}
 */
function getPackageMetadata() {
  try {
    const pkgPath = path.resolve(__dirname, '../../../package.json');
    if (fs.existsSync(pkgPath)) {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const parsed = JSON.parse(raw.trim());
      return {
        name: parsed.name || 'apiforge-lite',
        version: parsed.version || '0.1.0'
      };
    }
  } catch (error) {
    console.error('[IPC Handler] Error loading package metadata:', error);
  }
  return { name: 'apiforge-lite', version: '0.1.0' };
}

/**
 * Core handler logic for getAppInfo.
 *
 * @param {object} [appInstance] - The Electron app instance or mock.
 * @param {unknown} [args] - Optional arguments from the renderer.
 * @returns {object} Application metadata and runtime status.
 */
function handleGetAppInfo(appInstance, args) {
  validateGetAppInfoArgs(args);

  const pkg = getPackageMetadata();
  let appVersion = pkg.version;
  if (appInstance && typeof appInstance.getVersion === 'function') {
    const v = appInstance.getVersion();
    if (v && (!process.versions || v !== process.versions.electron)) {
      appVersion = v;
    }
  }

  return {
    name: 'ApiForge Lite',
    packageName: pkg.name,
    subtitle: 'Spring Edition',
    version: appVersion,
    electronVersion: (process.versions && process.versions.electron) ? process.versions.electron : 'N/A',
    nodeVersion: (process.versions && process.versions.node) ? process.versions.node : process.version,
    chromeVersion: (process.versions && process.versions.chrome) ? process.versions.chrome : 'N/A',
    platform: process.platform,
    arch: process.arch,
    status: 'online',
    bridgeTimestamp: Date.now()
  };
}

/**
 * Registers all IPC handlers with ipcMain.
 *
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron').App} appInstance
 */
function registerAppHandlers(ipcMain, appInstance) {
  if (!ipcMain || typeof ipcMain.handle !== 'function') {
    throw new Error('Valid ipcMain instance must be provided');
  }

  // 1. App Info Channel
  ipcMain.handle('app:get-info', async (event, args) => {
    return handleGetAppInfo(appInstance, args);
  });

  // 2. HTTP Request Execution Channel (Step 2)
  ipcMain.handle('http:send-request', async (event, requestConfig) => {
    return executeHttpRequest(requestConfig);
  });

  // 3. HTTP Request Cancellation Channel (Step 2)
  ipcMain.handle('http:cancel-request', async (event, payload) => {
    const requestId = payload && typeof payload.requestId === 'string' ? payload.requestId : '';
    const cancelled = cancelHttpRequest(requestId);
    return { cancelled };
  });

  // 4. Safe Clipboard Copy Channel (Step 2)
  ipcMain.handle('clipboard:copy', async (event, payload) => {
    if (!payload || typeof payload.text !== 'string') {
      throw new TypeError('Clipboard text payload must be a string');
    }
    // Limit clipboard copy size to 10 MiB to prevent denial-of-service
    if (payload.text.length > 10 * 1024 * 1024) {
      throw new RangeError('Text exceeds maximum copy buffer limit of 10 MiB');
    }

    if (clipboard && typeof clipboard.writeText === 'function') {
      clipboard.writeText(payload.text);
      return { success: true };
    }
    return { success: false, reason: 'Clipboard API unavailable' };
  });
}

module.exports = {
  validateGetAppInfoArgs,
  handleGetAppInfo,
  registerAppHandlers
};
