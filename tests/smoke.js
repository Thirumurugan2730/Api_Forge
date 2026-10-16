/**
 * ApiForge Lite — Step 2 Complete Electron Runtime & UI Smoke Test
 * Tests full end-to-end integration inside actual Electron 33.2.1
 */

const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const http = require('node:http');
const path = require('node:path');
const { registerAppHandlers } = require('../src/main/ipc/appHandlers');

let mockServer;
let mockPort;

app.whenReady().then(async () => {
  try {
    console.log('[Smoke Test] Initializing Electron Runtime (Step 2)...');

    // 1. Start local mock HTTP server
    mockServer = http.createServer((req, res) => {
      const parsed = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === 'POST' && parsed.pathname === '/api/smoke-post') {
        let b = '';
        req.on('data', (c) => { b += c; });
        req.on('end', () => {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'X-Smoke-Header': 'Verified'
          });
          res.end(JSON.stringify({
            receivedMethod: 'POST',
            receivedQuery: Object.fromEntries(parsed.searchParams.entries()),
            receivedHeader: req.headers['x-smoke-test'] || null,
            receivedPayload: b ? JSON.parse(b) : null
          }));
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });

    await new Promise((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => {
        mockPort = mockServer.address().port;
        console.log(`[Smoke Test] Local test server listening on http://127.0.0.1:${mockPort}`);
        resolve();
      });
    });

    // 2. Register main process handlers
    registerAppHandlers(ipcMain, app);

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.resolve(__dirname, '../src/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    win.webContents.on('console-message', (event, level, message) => {
      console.log(`[Renderer Console]:`, message);
    });

    await win.loadFile(path.resolve(__dirname, '../src/renderer/index.html'));
    console.log('[Smoke Test] Renderer HTML loaded successfully!');

    // Wait for DOM & Bridge to settle
    await new Promise((r) => setTimeout(r, 800));

    // Check Bridge status
    const statusText = await win.webContents.executeJavaScript('document.getElementById("status-indicator-text")?.textContent');
    console.log('[Smoke Test] Initial Bridge status:', statusText);

    // =========================================================================
    // TEST 1: Request Builder UI (Method, URL, Params, Headers, Body)
    // =========================================================================
    console.log('[Smoke Test] Configuring POST request in UI...');
    await win.webContents.executeJavaScript(`(() => {
      // 1. Select POST method
      const selectMethod = document.getElementById("select-method");
      selectMethod.value = "POST";
      selectMethod.dispatchEvent(new Event("change", { bubbles: true }));

      // 2. Enter Base URL
      const inputUrl = document.getElementById("input-url");
      inputUrl.value = "http://127.0.0.1:${mockPort}/api/smoke-post";
      inputUrl.dispatchEvent(new Event("input", { bubbles: true }));

      // 3. Add Query Parameter
      document.getElementById("btn-add-param")?.click();
      const paramKeys = document.querySelectorAll("#params-tbody .col-key input");
      const paramVals = document.querySelectorAll("#params-tbody .col-val input");
      if (paramKeys.length > 0) {
        paramKeys[0].value = "client";
        paramKeys[0].dispatchEvent(new Event("input", { bubbles: true }));
        paramVals[0].value = "electron";
        paramVals[0].dispatchEvent(new Event("input", { bubbles: true }));
      }

      // 4. Add Custom Header
      document.getElementById("tab-headers")?.click();
      document.getElementById("btn-add-header")?.click();
      const headerKeys = document.querySelectorAll("#headers-tbody .col-key input");
      const headerVals = document.querySelectorAll("#headers-tbody .col-val input");
      if (headerKeys.length > 0) {
        headerKeys[0].value = "X-Smoke-Test";
        headerKeys[0].dispatchEvent(new Event("input", { bubbles: true }));
        headerVals[0].value = "Active";
        headerVals[0].dispatchEvent(new Event("input", { bubbles: true }));
      }

      // 5. Add Body
      document.getElementById("tab-body")?.click();
      const inputBody = document.getElementById("input-body-text");
      inputBody.value = JSON.stringify({ framework: "Spring Boot", test: true });
      inputBody.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);

    // Verify Effective URL updated with query param
    const effectiveUrl = await win.webContents.executeJavaScript('document.getElementById("input-url")?.value');
    console.log('[Smoke Test] Composed Effective URL:', effectiveUrl);
    if (!effectiveUrl.includes('client=electron')) {
      throw new Error(`Effective URL did not include query parameter: ${effectiveUrl}`);
    }

    // =========================================================================
    // TEST 2: Send Real HTTP Request and Verify Real Response in DOM
    // =========================================================================
    console.log('[Smoke Test] Triggering Send button...');
    await win.webContents.executeJavaScript('document.getElementById("btn-send")?.click()');

    // Wait for response to arrive and DOM to update
    await new Promise((r) => setTimeout(r, 1200));

    const statusBadgeText = await win.webContents.executeJavaScript('document.getElementById("stat-status")?.textContent');
    const timeText = await win.webContents.executeJavaScript('document.getElementById("stat-time")?.textContent');
    const sizeText = await win.webContents.executeJavaScript('document.getElementById("stat-size")?.textContent');
    const bodyContent = await win.webContents.executeJavaScript('document.getElementById("response-body-pre")?.textContent');

    console.log('[Smoke Test] Received Status Badge:', statusBadgeText);
    console.log('[Smoke Test] Measured Time:', timeText);
    console.log('[Smoke Test] Response Size:', sizeText);
    console.log('[Smoke Test] Response Body Sample:', bodyContent.replace(/\s+/g, ' ').slice(0, 100));

    if (!statusBadgeText.includes('200 OK')) {
      throw new Error(`Expected "200 OK" status badge, got: ${statusBadgeText}`);
    }

    const parsedBody = JSON.parse(bodyContent);
    if (parsedBody.receivedMethod !== 'POST' || parsedBody.receivedQuery.client !== 'electron' || parsedBody.receivedHeader !== 'Active') {
      throw new Error('Response payload verification failed: unexpected echo content');
    }

    // =========================================================================
    // TEST 3: Clipboard Copy Functionality
    // =========================================================================
    console.log('[Smoke Test] Testing copy response body...');
    await win.webContents.executeJavaScript('document.getElementById("btn-copy-response")?.click()');
    await new Promise((r) => setTimeout(r, 200));
    const copiedClipboardText = clipboard.readText();
    console.log('[Smoke Test] Clipboard text verified (length):', copiedClipboardText.length);
    if (!copiedClipboardText.includes('Spring Boot')) {
      throw new Error('Clipboard did not contain copied response content');
    }

    // =========================================================================
    // TEST 4: GET Body Restriction
    // =========================================================================
    console.log('[Smoke Test] Testing GET method body disabling...');
    await win.webContents.executeJavaScript(`(() => {
      const selectMethod = document.getElementById("select-method");
      selectMethod.value = "GET";
      selectMethod.dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("tab-body")?.click();
    })()`);

    const isWarningVisible = await win.webContents.executeJavaScript('!document.getElementById("body-disabled-notice")?.hidden');
    console.log('[Smoke Test] GET Body Warning Visible:', isWarningVisible);
    if (!isWarningVisible) {
      throw new Error('Body disabled warning should be visible when GET is selected');
    }

    // =========================================================================
    // TEST 5: Network Error Display (Connection Refused)
    // =========================================================================
    console.log('[Smoke Test] Testing network failure display...');
    await win.webContents.executeJavaScript(`(() => {
      // Clear body to allow GET send
      document.getElementById("btn-clear-body")?.click();
      const inputUrl = document.getElementById("input-url");
      inputUrl.value = "http://127.0.0.1:59199/api/unreachable";
      inputUrl.dispatchEvent(new Event("input", { bubbles: true }));
      document.getElementById("btn-send")?.click();
    })()`);

    await new Promise((r) => setTimeout(r, 1200));

    const isErrorCardVisible = await win.webContents.executeJavaScript('!document.getElementById("response-network-error")?.hidden');
    const errorType = await win.webContents.executeJavaScript('document.getElementById("error-type-badge")?.textContent');
    console.log('[Smoke Test] Network Error Visible:', isErrorCardVisible, '| Type:', errorType);

    if (!isErrorCardVisible || !errorType.includes('CONNECTION_REFUSED')) {
      throw new Error(`Expected CONNECTION_REFUSED error card, got visible=${isErrorCardVisible}, type=${errorType}`);
    }

    console.log('[Smoke Test] ================================================');
    console.log('[Smoke Test] ALL STEP 2 ELECTRON SMOKE TESTS PASSED!');
    console.log('[Smoke Test] ================================================');

    if (mockServer) mockServer.close();
    app.quit();
    process.exit(0);
  } catch (err) {
    console.error('[Smoke Test] FATAL ERROR:', err);
    if (mockServer) mockServer.close();
    app.quit();
    process.exit(1);
  }
});
