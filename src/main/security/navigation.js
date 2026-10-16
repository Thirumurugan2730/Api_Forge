const path = require('path');

/**
 * Validates whether a navigation URL is permitted.
 * In Step 1, only the local renderer index.html file is permitted.
 * Remote URLs, external protocols, and other files are strictly rejected.
 *
 * @param {string} targetUrl - The target URL attempting navigation.
 * @param {string} expectedFilePath - The absolute file path of the allowed entry document.
 * @returns {boolean} True if allowed, false otherwise.
 */
function isAllowedNavigationUrl(targetUrl, expectedFilePath) {
  if (typeof targetUrl !== 'string' || !targetUrl.trim()) {
    return false;
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol === 'file:') {
      // Normalize paths for cross-platform/Windows comparison
      const normalizedTarget = path.normalize(decodeURI(parsed.pathname)).toLowerCase();
      const cleanTarget = normalizedTarget.replace(/^[\\\/]+([a-zA-Z]:)/, '$1');
      const normalizedExpected = path.normalize(expectedFilePath).toLowerCase();
      return cleanTarget === normalizedExpected;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Configures security restrictions on an Electron BrowserWindow.
 *
 * @param {object} window - The BrowserWindow to secure.
 * @param {string} entryFilePath - The absolute path of the authorized index.html file.
 */
function setupSecurity(window, entryFilePath) {
  if (!window || !window.webContents) {
    throw new Error('Invalid BrowserWindow instance provided to setupSecurity');
  }

  const { webContents } = window;

  // Deny all window.open / target="_blank" requests
  webContents.setWindowOpenHandler(({ url }) => {
    console.warn('[Security] Blocked unauthorized window open request for URL:', url);
    return { action: 'deny' };
  });

  // Deny unexpected in-page navigation away from the local application
  webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedNavigationUrl(navigationUrl, entryFilePath)) {
      event.preventDefault();
      console.warn('[Security] Blocked unexpected navigation to:', navigationUrl);
    }
  });

  // Block webview tags
  webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
    console.warn('[Security] Blocked unexpected webview attachment');
  });

  // Deny hardware/system permission requests (camera, mic, notifications, etc.)
  if (webContents.session && typeof webContents.session.setPermissionRequestHandler === 'function') {
    webContents.session.setPermissionRequestHandler((_, permission, callback) => {
      console.warn('[Security] Denied permission request for:', permission);
      callback(false);
    });
  }
}

module.exports = {
  isAllowedNavigationUrl,
  setupSecurity
};
