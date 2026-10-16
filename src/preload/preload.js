const { contextBridge, ipcRenderer } = require('electron');

/**
 * ApiForge Lite Secure Preload Bridge
 *
 * In accordance with Electron Security Best Practices:
 * 1. contextIsolation is enforced.
 * 2. nodeIntegration is disabled.
 * 3. ipcRenderer and Node.js globals are NOT exposed to the renderer.
 * 4. Only an explicit, narrow set of functions is exposed.
 */

const apiForgeBridge = Object.freeze({
  /**
   * Retrieves application metadata and runtime status from the main process.
   * @param {object} [options] - Optional parameter object.
   * @returns {Promise<{name: string, subtitle: string, version: string, electronVersion: string, status: string}>}
   */
  getAppInfo: async (options) => {
    return ipcRenderer.invoke('app:get-info', options);
  }
});

// Expose safe API to the renderer process under window.apiForge
contextBridge.exposeInMainWorld('apiForge', apiForgeBridge);
