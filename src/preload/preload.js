const { contextBridge, ipcRenderer } = require('electron');

/**
 * ApiForge Lite Secure Preload Bridge (Step 3)
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
  },

  // =========================================================================
  // Collections & Folders Storage APIs (Step 3)
  // =========================================================================

  getCollectionsTree: async () => {
    return ipcRenderer.invoke('collections:get-tree');
  },

  createCollection: async (name) => {
    return ipcRenderer.invoke('collections:create-collection', { name });
  },

  renameCollection: async (collectionId, name) => {
    return ipcRenderer.invoke('collections:rename-collection', { collectionId, name });
  },

  deleteCollection: async (collectionId) => {
    return ipcRenderer.invoke('collections:delete-collection', { collectionId });
  },

  duplicateCollection: async (collectionId) => {
    return ipcRenderer.invoke('collections:duplicate-collection', { collectionId });
  },

  createFolder: async (collectionId, parentFolderId, name) => {
    return ipcRenderer.invoke('collections:create-folder', { collectionId, parentFolderId, name });
  },

  renameFolder: async (collectionId, folderId, name) => {
    return ipcRenderer.invoke('collections:rename-folder', { collectionId, folderId, name });
  },

  deleteFolder: async (collectionId, folderId) => {
    return ipcRenderer.invoke('collections:delete-folder', { collectionId, folderId });
  },

  duplicateFolder: async (collectionId, folderId) => {
    return ipcRenderer.invoke('collections:duplicate-folder', { collectionId, folderId });
  },

  saveRequest: async (payload) => {
    return ipcRenderer.invoke('collections:save-request', payload);
  },

  getRequest: async (collectionId, requestId) => {
    return ipcRenderer.invoke('collections:get-request', { collectionId, requestId });
  },

  renameRequest: async (collectionId, requestId, name) => {
    return ipcRenderer.invoke('collections:rename-request', { collectionId, requestId, name });
  },

  deleteRequest: async (collectionId, requestId) => {
    return ipcRenderer.invoke('collections:delete-request', { collectionId, requestId });
  },

  duplicateRequest: async (collectionId, requestId) => {
    return ipcRenderer.invoke('collections:duplicate-request', { collectionId, requestId });
  }
});

// Expose safe API to the renderer process
contextBridge.exposeInMainWorld('apiForge', apiForgeBridge);
