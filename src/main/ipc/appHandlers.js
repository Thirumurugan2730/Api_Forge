const path = require('path');
const fs = require('fs');
const { clipboard, dialog } = require('electron');
const { executeHttpRequest, cancelHttpRequest } = require('../http/httpClient');
const collectionsStorage = require('../storage/collectionsStorage');
const historyStorage = require('../storage/historyStorage');
const settingsStorage = require('../storage/settingsStorage');
const testEvaluator = require('../tests/testEvaluator');
const openApiParser = require('../openapi/openApiParser');
const errorExplainer = require('../explainer/errorExplainer');
const roleMatrixRunner = require('../roles/roleMatrixRunner');

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

  // Ensure storage is initialized
  collectionsStorage.initStorage();
  historyStorage.initHistoryStorage();
  settingsStorage.initSettingsStorage();

  // Sync history limit from persisted settings
  const initialSettings = settingsStorage.getSettings();
  historyStorage.setMaxEntries(initialSettings.historyLimit);

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
    if (payload.text.length > 10 * 1024 * 1024) {
      throw new RangeError('Text exceeds maximum copy buffer limit of 10 MiB');
    }

    if (clipboard && typeof clipboard.writeText === 'function') {
      clipboard.writeText(payload.text);
      return { success: true };
    }
    return { success: false, reason: 'Clipboard API unavailable' };
  });

  // =========================================================================
  // Collections & Folders Storage Channels (Step 3)
  // =========================================================================

  ipcMain.handle('collections:get-tree', async () => {
    return collectionsStorage.getCollectionsTree();
  });

  ipcMain.handle('collections:create-collection', async (event, payload) => {
    const name = payload && typeof payload.name === 'string' ? payload.name : '';
    return collectionsStorage.createCollection(name);
  });

  ipcMain.handle('collections:rename-collection', async (event, payload) => {
    const { collectionId, name } = payload || {};
    return collectionsStorage.renameCollection(collectionId, name);
  });

  ipcMain.handle('collections:delete-collection', async (event, payload) => {
    const { collectionId } = payload || {};
    return collectionsStorage.deleteCollection(collectionId);
  });

  ipcMain.handle('collections:duplicate-collection', async (event, payload) => {
    const { collectionId } = payload || {};
    return collectionsStorage.duplicateCollection(collectionId);
  });

  ipcMain.handle('collections:create-folder', async (event, payload) => {
    const { collectionId, parentFolderId, name } = payload || {};
    return collectionsStorage.createFolder(collectionId, parentFolderId, name);
  });

  ipcMain.handle('collections:rename-folder', async (event, payload) => {
    const { collectionId, folderId, name } = payload || {};
    return collectionsStorage.renameFolder(collectionId, folderId, name);
  });

  ipcMain.handle('collections:delete-folder', async (event, payload) => {
    const { collectionId, folderId } = payload || {};
    return collectionsStorage.deleteFolder(collectionId, folderId);
  });

  ipcMain.handle('collections:duplicate-folder', async (event, payload) => {
    const { collectionId, folderId } = payload || {};
    return collectionsStorage.duplicateFolder(collectionId, folderId);
  });

  ipcMain.handle('collections:save-request', async (event, payload) => {
    const { collectionId, folderId, requestData, request, requestId } = payload || {};
    return collectionsStorage.saveRequest(collectionId, folderId, requestData || request, requestId);
  });

  ipcMain.handle('collections:get-request', async (event, payload) => {
    const { collectionId, requestId } = payload || {};
    return collectionsStorage.getRequest(collectionId, requestId);
  });

  ipcMain.handle('collections:rename-request', async (event, payload) => {
    const { collectionId, requestId, name } = payload || {};
    return collectionsStorage.renameRequest(collectionId, requestId, name);
  });

  ipcMain.handle('collections:delete-request', async (event, payload) => {
    const { collectionId, requestId } = payload || {};
    return collectionsStorage.deleteRequest(collectionId, requestId);
  });

  ipcMain.handle('collections:duplicate-request', async (event, payload) => {
    const { collectionId, requestId } = payload || {};
    return collectionsStorage.duplicateRequest(collectionId, requestId);
  });



  // =========================================================================
  // History Storage Channels (Step 4)
  // =========================================================================

  ipcMain.handle('history:get', async () => {
    return historyStorage.getHistory();
  });

  ipcMain.handle('history:add', async (event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('history:add payload must be an object');
    }
    return historyStorage.addHistoryEntry(payload);
  });

  ipcMain.handle('history:clear', async () => {
    return historyStorage.clearHistory();
  });

  // =========================================================================
  // Settings Storage Channels (Step 4)
  // =========================================================================

  ipcMain.handle('settings:get', async () => {
    return settingsStorage.getSettings();
  });

  ipcMain.handle('settings:save', async (event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('settings:save payload must be an object');
    }
    // Validate in main process before persisting
    settingsStorage.validateSettings(payload);
    const saved = settingsStorage.saveSettings(payload);
    // Sync historyStorage.maxEntries if historyLimit changed
    if (typeof saved.historyLimit === 'number') {
      historyStorage.setMaxEntries(saved.historyLimit);
    }
    return saved;
  });

  ipcMain.handle('settings:reset', async () => {
    return settingsStorage.resetSettings();
  });

  // =========================================================================
  // Automated API Testing Channels (Step 6)
  // =========================================================================

  ipcMain.handle('tests:evaluate', async (event, tests, response) => {
    if (!Array.isArray(tests)) {
      throw new TypeError('tests:evaluate tests argument must be an array');
    }
    return testEvaluator.evaluateTests(tests, response || {});
  });

  // =========================================================================
  // OpenAPI 3.x Import Channels (Step 7)
  // =========================================================================

  ipcMain.handle('openapi:fetch-url', async (event, url) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new TypeError('OpenAPI URL must be a non-empty string');
    }
    const trimmed = url.trim();
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmed);
    } catch (_) {
      throw new Error(`Invalid URL format: "${trimmed}". URL must begin with http:// or https://`);
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error(`Unsupported URL protocol "${parsedUrl.protocol}". Only HTTP and HTTPS URLs are supported.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      let res;
      try {
        res = await fetch(trimmed, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'ApiForge-Lite/0.1.0 (OpenAPI-Discovery-Engine)'
          },
          signal: controller.signal
        });
      } catch (netErr) {
        clearTimeout(timeoutId);
        if (netErr.name === 'AbortError') {
          throw new Error(`Connection timed out after 20 seconds while reaching: ${trimmed}`);
        }
        if (netErr.code === 'ENOTFOUND' || (netErr.message && netErr.message.includes('ENOTFOUND'))) {
          throw new Error(`Could not resolve remote host: "${parsedUrl.hostname}". Check domain name and internet connectivity.`);
        }
        if (netErr.code === 'ECONNREFUSED' || (netErr.message && netErr.message.includes('ECONNREFUSED'))) {
          throw new Error(`Connection refused by host ${parsedUrl.host}. The server is offline or the port is closed.`);
        }
        if (netErr.code === 'ECONNRESET' || (netErr.message && netErr.message.includes('ECONNRESET'))) {
          throw new Error(`Connection was reset by host ${parsedUrl.host}.`);
        }
        throw new Error(`Network error connecting to ${trimmed}: ${netErr.message}`);
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Access denied (HTTP ${res.status} ${res.statusText}) at ${trimmed}. OpenAPI documentation is protected by authentication.`);
        }
        if (res.status === 404) {
          throw new Error(`OpenAPI specification not found at ${trimmed} (HTTP 404). Check if the path is correct (e.g. /v3/api-docs).`);
        }
        throw new Error(`Remote server returned HTTP ${res.status} ${res.statusText} at ${trimmed}`);
      }

      const text = await res.text();
      if (text.length > openApiParser.MAX_DOC_SIZE_BYTES) {
        throw new Error(`Document size exceeds 10 MB limit (${Math.round(text.length / 1024 / 1024)} MB).`);
      }

      let jsonDoc;
      try {
        jsonDoc = JSON.parse(text);
      } catch (err) {
        const preview = text.substring(0, 100).replace(/\s+/g, ' ');
        throw new Error(`Response from ${trimmed} is not valid JSON (${err.message}). Content starts with: "${preview}"`);
      }

      // Pass trimmed document URL to parseOpenApi for relative server URL resolution
      const parsedSpec = openApiParser.parseOpenApi(jsonDoc, trimmed);
      return {
        success: true,
        source: trimmed,
        documentUrl: trimmed,
        ...parsedSpec
      };
    } catch (err) {
      throw err;
    }
  });

  ipcMain.handle('openapi:open-file', async () => {
    const dialogResult = await dialog.showOpenDialog({
      title: 'Select OpenAPI 3.x Specification File',
      filters: [
        { name: 'OpenAPI JSON (*.json)', extensions: ['json'] },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
      return { cancelled: true };
    }

    const filePath = dialogResult.filePaths[0];
    const stat = fs.statSync(filePath);
    if (stat.size > openApiParser.MAX_DOC_SIZE_BYTES) {
      throw new Error(`File size exceeds 10 MB limit (${Math.round(stat.size / 1024 / 1024)} MB).`);
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    let jsonDoc;
    try {
      jsonDoc = JSON.parse(rawContent);
    } catch (err) {
      throw new Error(`Failed to parse local OpenAPI file: File is not valid JSON (${err.message}).`);
    }

    const parsedSpec = openApiParser.parseOpenApi(jsonDoc);
    return {
      success: true,
      filePath,
      filename: path.basename(filePath),
      ...parsedSpec
    };
  });

  ipcMain.handle('openapi:parse-content', async (event, content) => {
    if (!content) {
      throw new Error('Content is required');
    }
    let jsonDoc;
    if (typeof content === 'string') {
      try {
        jsonDoc = JSON.parse(content);
      } catch (err) {
        throw new Error(`Failed to parse OpenAPI document: Content is not valid JSON (${err.message}).`);
      }
    } else if (typeof content === 'object') {
      jsonDoc = content;
    } else {
      throw new Error('Content must be a JSON string or object');
    }

    const parsedSpec = openApiParser.parseOpenApi(jsonDoc);
    return {
      success: true,
      ...parsedSpec
    };
  });

  // =========================================================================
  // Spring Boot Error Explainer Channels (Step 8)
  // =========================================================================

  ipcMain.handle('explainer:explain-error', async (event, context) => {
    if (!context || typeof context !== 'object') {
      throw new TypeError('explainer:explain-error context must be an object');
    }
    return errorExplainer.explainSpringError(context);
  });

  ipcMain.handle('openapi:import-endpoints', async (event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('openapi:import-endpoints payload must be an object');
    }

    const {
      targetCollectionId,
      targetCollectionName,
      targetFolderId,
      endpoints,
      options = {}
    } = payload;

    if (!Array.isArray(endpoints) || endpoints.length === 0) {
      throw new Error('No endpoints provided for import');
    }

    let colId = targetCollectionId;
    if (!colId || colId === 'new') {
      const colName = (targetCollectionName || 'Imported API').trim();
      const newCol = collectionsStorage.createCollection(colName);
      colId = newCol.id;
    }

    // Get existing collection requests to detect duplicates
    const collections = collectionsStorage.getCollectionsTree();
    const targetCol = collections.find(c => c.id === colId);
    if (!targetCol) {
      throw new Error(`Target collection not found: ${colId}`);
    }

    let existingRequests = [];
    if (targetFolderId) {
      const folder = (targetCol.folders || []).find(f => f.id === targetFolderId);
      if (folder) existingRequests = folder.requests || [];
    } else {
      existingRequests = targetCol.requests || [];
    }

    let importedCount = 0;
    let skippedCount = 0;
    const duplicates = [];

    const duplicateStrategy = options.duplicateStrategy || 'rename'; // 'skip' | 'rename' | 'keep'

    for (const ep of endpoints) {
      const converted = openApiParser.convertEndpointToRequest(ep, options);

      // Check for existing request with same name or same method+url
      const duplicate = existingRequests.find(
        r => r.name.toLowerCase() === converted.name.toLowerCase() ||
             (r.method.toUpperCase() === converted.method.toUpperCase() && r.url.toLowerCase() === converted.url.toLowerCase())
      );

      if (duplicate) {
        duplicates.push(converted.name);
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateStrategy === 'rename') {
          converted.name = `${converted.name} (Imported)`;
        }
      }

      collectionsStorage.saveRequest(colId, targetFolderId || null, converted, null);

      importedCount++;
    }

    return {
      success: true,
      collectionId: colId,
      totalRequested: endpoints.length,
      importedCount,
      skippedCount,
      duplicates
    };
  });

  // =========================================================================
  // Spring Security Role Testing Matrix Channels (Step 9)
  // =========================================================================

  ipcMain.handle('roles:run-matrix', async (event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('roles:run-matrix payload must be an object');
    }
    return roleMatrixRunner.runRoleMatrix(payload);
  });

}

module.exports = {
  validateGetAppInfoArgs,
  handleGetAppInfo,
  registerAppHandlers

};

