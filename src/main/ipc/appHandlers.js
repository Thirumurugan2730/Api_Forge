const path = require('path');
const fs = require('fs');

/**
 * Validates any optional arguments supplied to the getAppInfo IPC channel.
 * Even though getAppInfo takes no required payload, we validate that any unexpected payload
 * is not a malicious object, oversized payload, or invalid type.
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

  // Guard against prototype manipulation
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
 * Separated from ipcMain for straightforward automated unit testing.
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
 * Registers all Step 1 IPC handlers with ipcMain.
 *
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron').App} appInstance
 */
function registerAppHandlers(ipcMain, appInstance) {
  if (!ipcMain || typeof ipcMain.handle !== 'function') {
    throw new Error('Valid ipcMain instance must be provided');
  }

  // Register strictly required channel
  ipcMain.handle('app:get-info', async (event, args) => {
    return handleGetAppInfo(appInstance, args);
  });
}

module.exports = {
  validateGetAppInfoArgs,
  handleGetAppInfo,
  registerAppHandlers
};
