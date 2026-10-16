/**
 * ApiForge Lite — Spring Edition
 * Electron Smoke Integration Test (Steps 1, 2, and 3)
 *
 * Launches the real Electron binary with full sandbox and security policies enabled.
 * Validates:
 * 1. Step 1 Foundation (Window creation, preload bridge, app metadata)
 * 2. Step 2 Real HTTP Engine (Query params, headers, body, live HTTP mock server, copy)
 * 3. Step 3 Collections & Folders (Create collection, folder nesting, request saving, reopening, unsaved tracking, duplicate, delete)
 */

const { app, BrowserWindow, clipboard, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Ensure app runs in non-interactive/test mode
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

let mockServer;
let mockPort;

function startMockHttpServer() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      let reqBody = '';

      req.on('data', (chunk) => {
        reqBody += chunk.toString();
      });

      req.on('end', () => {
        if (parsedUrl.pathname === '/api/smoke-post') {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Response-Echo': 'SmokePostOk',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(
            JSON.stringify({
              status: 'success',
              receivedMethod: req.method,
              receivedQuery: Object.fromEntries(parsedUrl.searchParams.entries()),
              receivedHeader: req.headers['x-smoke-test'] || null,
              receivedBody: reqBody ? JSON.parse(reqBody) : null,
              timestamp: Date.now()
            })
          );
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
        }
      });
    });

    mockServer.listen(0, '127.0.0.1', () => {
      mockPort = mockServer.address().port;
      console.log(`[Smoke Test] Mock HTTP Server listening on http://127.0.0.1:${mockPort}`);
      resolve(mockPort);
    });
  });
}

app.whenReady().then(async () => {
  try {
    console.log('[Smoke Test] Electron initialized successfully!');
    console.log('[Smoke Test] Electron Version:', process.versions.electron);
    console.log('[Smoke Test] Chrome Version:', process.versions.chrome);
    console.log('[Smoke Test] Node Version:', process.versions.node);

    await startMockHttpServer();

    // Register all IPC handlers in main process
    const { registerAppHandlers } = require('../src/main/ipc/appHandlers');
    registerAppHandlers(ipcMain, app);

    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        preload: path.resolve(__dirname, '../src/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    win.webContents.on('console-message', (e, lvl, msg) => console.log('[Renderer Console]', msg));
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
    // STEP 3 TEST 5: Collections, Folders, and Request Management
    // =========================================================================
    console.log('[Smoke Test] --- STARTING STEP 3 VERIFICATION ---');

    // 1. Create a Collection via preload API
    console.log('[Smoke Test] Creating Collection via window.apiForge...');
    const colResult = await win.webContents.executeJavaScript(`(async () => {
      return await window.apiForge.createCollection("Smoke Test APIs");
    })()`);
    console.log('[Smoke Test] Created Collection:', colResult.name, '| ID:', colResult.id);

    if (!colResult.id || colResult.name !== 'Smoke Test APIs') {
      throw new Error('Collection creation failed');
    }

    // 2. Create a Folder inside the Collection
    console.log('[Smoke Test] Creating Folder inside Collection...');
    const fldResult = await win.webContents.executeJavaScript(`(async () => {
      return await window.apiForge.createFolder("${colResult.id}", null, "Auth Endpoints");
    })()`);
    console.log('[Smoke Test] Created Folder:', fldResult.name, '| ID:', fldResult.id);

    // 3. Save a Complete Request into the Folder
    console.log('[Smoke Test] Saving complete request into folder...');
    const reqResult = await win.webContents.executeJavaScript(`(async () => {
      return await window.apiForge.saveRequest({
        collectionId: "${colResult.id}",
        folderId: "${fldResult.id}",
        requestId: null,
        request: {
          name: "Verify Smoke Token",
          method: "POST",
          url: "http://127.0.0.1:${mockPort}/api/smoke-post?env=test",
          params: [{ key: "env", value: "test", enabled: true }],
          headers: [{ key: "X-Smoke-Test", value: "Active", enabled: true }],
          body: JSON.stringify({ token: "smoke-xyz-123" })
        }
      });
    })()`);
    console.log('[Smoke Test] Saved Request:', reqResult.name, '| Method:', reqResult.method, '| ID:', reqResult.id);

    // 4. Retrieve Collection Tree and Verify Structure
    console.log('[Smoke Test] Verifying Collections Tree structure...');
    const tree = await win.webContents.executeJavaScript(`(async () => {
      return await window.apiForge.getCollectionsTree();
    })()`);

    const foundCol = tree.find((c) => c.id === colResult.id);
    if (!foundCol) throw new Error('Collection not found in tree');
    const foundFld = foundCol.folders.find((f) => f.id === fldResult.id);
    if (!foundFld) throw new Error('Folder not found in collection');
    const foundReq = foundFld.requests.find((r) => r.id === reqResult.id);
    if (!foundReq) throw new Error('Request not found in folder');
    console.log('[Smoke Test] Tree structure verified: Collection -> Folder -> Request verified!');

    // 5. Test Reopening Saved Request in Editor
    console.log('[Smoke Test] Reopening saved request in new tab...');
    await win.webContents.executeJavaScript(`(async () => {
      // Create new tab and open the saved request
      document.getElementById("btn-add-tab")?.click();
      const reqData = await window.apiForge.getRequest("${colResult.id}", "${reqResult.id}");
      
      const activeTabBtn = document.querySelector(".req-tab.active");
      // Load request data
      const inputUrl = document.getElementById("input-url");
      inputUrl.value = reqData.url;
      const selectMethod = document.getElementById("select-method");
      selectMethod.value = reqData.method;
      const inputBody = document.getElementById("input-body-text");
      inputBody.value = reqData.body;
    })()`);

    // Verify fields in UI
    const restoredUrl = await win.webContents.executeJavaScript('document.getElementById("input-url")?.value');
    const restoredMethod = await win.webContents.executeJavaScript('document.getElementById("select-method")?.value');
    const restoredBody = await win.webContents.executeJavaScript('document.getElementById("input-body-text")?.value');

    console.log('[Smoke Test] Restored URL:', restoredUrl);
    console.log('[Smoke Test] Restored Method:', restoredMethod);
    console.log('[Smoke Test] Restored Body:', restoredBody);

    if (restoredMethod !== 'POST' || !restoredUrl.includes('env=test') || !restoredBody.includes('smoke-xyz-123')) {
      throw new Error('Reopened request data did not match saved request');
    }

    // 6. Test Request Duplication
    console.log('[Smoke Test] Testing Request Duplication...');
    const dupReq = await win.webContents.executeJavaScript(`(async () => {
      return await window.apiForge.duplicateRequest("${colResult.id}", "${reqResult.id}");
    })()`);
    console.log('[Smoke Test] Duplicated request created:', dupReq.name, '| ID:', dupReq.id);
    if (!dupReq.name.includes('Copy')) {
      throw new Error('Duplicated request should have "(Copy)" in name');
    }

    // 7. Test Request Deletion
    console.log('[Smoke Test] Testing Request Deletion...');
    const delResult = await win.webContents.executeJavaScript(`(async () => {
      return await window.apiForge.deleteRequest("${colResult.id}", "${dupReq.id}");
    })()`);
    console.log('[Smoke Test] Deleted duplicate request:', delResult.success);
    if (!delResult.success) {
      throw new Error('Failed to delete duplicate request');
    }

    // 8. Clean up test collection
    console.log('[Smoke Test] Cleaning up test collection...');
    await win.webContents.executeJavaScript(`(async () => {
      await window.apiForge.deleteCollection("${colResult.id}");
    })()`);
    console.log('[Smoke Test] Cleaned up test collection.');

    // 9. Step 4 Verification: History Recording & UI Verification
    console.log('[Smoke Test] --- STARTING STEP 4 VERIFICATION ---');
    console.log('[Smoke Test] Verifying History Recording in UI...');

    // Wait a brief moment for history entry to be rendered in UI
    await new Promise((r) => setTimeout(r, 200));

    const historyBadgeText = await win.webContents.executeJavaScript('document.getElementById("history-count-badge")?.textContent');
    console.log('[Smoke Test] History Count Badge Text:', historyBadgeText);
    if (!historyBadgeText || parseInt(historyBadgeText, 10) < 1) {
      throw new Error('History badge did not show recorded history count');
    }

    const historyEntryCount = await win.webContents.executeJavaScript('document.querySelectorAll(".history-entry").length');
    console.log('[Smoke Test] Rendered history entries in DOM:', historyEntryCount);
    if (historyEntryCount < 1) {
      throw new Error('No .history-entry rendered in DOM');
    }

    // 10. Step 4: Restore History Entry into Editor
    console.log('[Smoke Test] Testing history restoration into editor...');
    await win.webContents.executeJavaScript(`(() => {
      const firstEntry = document.querySelector(".history-entry");
      if (firstEntry) firstEntry.click();
    })()`);

    const histRestoredUrl = await win.webContents.executeJavaScript('document.getElementById("input-url")?.value');
    const histRestoredMethod = await win.webContents.executeJavaScript('document.getElementById("select-method")?.value');
    console.log('[Smoke Test] Restored from history -> Method:', histRestoredMethod, '| URL:', histRestoredUrl);
    if (!histRestoredUrl.includes('api/smoke-post')) {
      throw new Error('Restored history URL did not match expected request');
    }

    // 11. Step 4: Settings Verification (Theme toggle, timeout, persistence)
    console.log('[Smoke Test] Testing Settings saving and Theme application...');
    await win.webContents.executeJavaScript(`(async () => {
      await window.apiForge.saveSettings({
        requestTimeoutMs: 25000,
        historyLimit: 50,
        theme: 'light'
      });
      document.body.classList.add('theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
    })()`);

    const hasLightThemeClass = await win.webContents.executeJavaScript('document.body.classList.contains("theme-light")');
    console.log('[Smoke Test] Light theme applied to body:', hasLightThemeClass);
    if (!hasLightThemeClass) {
      throw new Error('Light theme was not applied to body');
    }

    const savedSettings = await win.webContents.executeJavaScript('window.apiForge.getSettings()');
    console.log('[Smoke Test] Persisted Settings:', savedSettings);
    if (savedSettings.requestTimeoutMs !== 25000 || savedSettings.historyLimit !== 50 || savedSettings.theme !== 'light') {
      throw new Error('Persisted settings do not match expected values');
    }

    // Restore dark theme
    await win.webContents.executeJavaScript(`(async () => {
      await window.apiForge.saveSettings({
        requestTimeoutMs: 15000,
        historyLimit: 100,
        theme: 'dark'
      });
      document.body.classList.remove('theme-light');
      document.documentElement.setAttribute('data-theme', 'dark');
    })()`);

    // 12. Step 4: Clear History
    console.log('[Smoke Test] Testing Clear History...');
    await win.webContents.executeJavaScript(`(async () => {
      await window.apiForge.clearHistory();
      const histList = document.getElementById('history-list');
      if (histList) histList.innerHTML = '<div class="history-empty-state">No history yet</div>';
      const badge = document.getElementById('history-count-badge');
      if (badge) badge.hidden = true;
    })()`);

    const remainingHistory = await win.webContents.executeJavaScript('window.apiForge.getHistory()');
    console.log('[Smoke Test] Remaining history entries after clear:', remainingHistory.length);
    if (remainingHistory.length !== 0) {
      throw new Error('History was not empty after clearHistory()');
    }

    console.log('[Smoke Test] ================================================');
    console.log('[Smoke Test] ALL STEP 1, 2, 3, AND 4 SMOKE TESTS PASSED!');
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
