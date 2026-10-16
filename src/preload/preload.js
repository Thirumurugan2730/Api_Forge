const { contextBridge, ipcRenderer } = require('electron');

/**
 * ApiForge Lite Secure Preload Bridge (Step 2)
 *
 * Exposes strictly explicit, frozen methods under window.apiForge.
 * Direct access to ipcRenderer, Node.js globals, filesystem, and arbitrary IPC channels is blocked.
 */

const apiForgeBridge = Object.freeze({
  /**
   * Retrieves application metadata and runtime status from the main process.
   * @param {object} [options]
   * @returns {Promise<{name: string, subtitle: string, version: string, electronVersion: string, status: string}>}
   */
  getAppInfo: async (options) => {
    return ipcRenderer.invoke('app:get-info', options);
  },

  /**
   * Sends an HTTP request through the Node.js HTTP engine in the Main Process.
   * @param {object} requestConfig - The structured request configuration.
   * @returns {Promise<{success: boolean, response?: object, error?: object}>}
   */
  sendRequest: async (requestConfig) => {
    return ipcRenderer.invoke('http:send-request', requestConfig);
  },

  /**
   * Cancels an in-flight HTTP request by requestId.
   * @param {string} requestId - The unique identifier of the in-flight request.
   * @returns {Promise<{cancelled: boolean}>}
   */
  cancelRequest: async (requestId) => {
    return ipcRenderer.invoke('http:cancel-request', { requestId });
  },

  /**
   * Copies text safely to the system clipboard via the Electron Main Process.
   * @param {string} text - Text to copy.
   * @returns {Promise<{success: boolean}>}
   */
  copyToClipboard: async (text) => {
    return ipcRenderer.invoke('clipboard:copy', { text });
  }
});

// Expose safe API to the renderer process
contextBridge.exposeInMainWorld('apiForge', apiForgeBridge);
