const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { registerAppHandlers } = require('../src/main/ipc/appHandlers');

app.whenReady().then(async () => {
  try {
    console.log('[Smoke Test] Initializing Electron Runtime...');
    console.log('[Smoke Test] Electron Version:', process.versions.electron);
    console.log('[Smoke Test] Chrome Version:', process.versions.chrome);
    console.log('[Smoke Test] Node Version:', process.versions.node);

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

    win.webContents.on('did-fail-load', (e, code, desc) => {
      console.error('[Smoke Test] Failed to load renderer:', desc, code);
      process.exit(1);
    });

    await win.loadFile(path.resolve(__dirname, '../src/renderer/index.html'));
    console.log('[Smoke Test] Renderer HTML loaded successfully!');

    // Wait for DOMContentLoaded and IPC bridge execution
    await new Promise((r) => setTimeout(r, 1000));

    // 1. Verify Bridge & Metadata
    const bridgeText = await win.webContents.executeJavaScript('document.getElementById("status-indicator-text")?.textContent');
    const versionText = await win.webContents.executeJavaScript('document.getElementById("label-app-version")?.textContent');
    console.log('[Smoke Test] Status Indicator:', bridgeText);
    console.log('[Smoke Test] Version Label:', versionText);

    if (versionText !== 'v0.1.0') {
      throw new Error(`Expected v0.1.0 but got ${versionText}`);
    }

    // 2. Initial Tab state
    let tabCount = await win.webContents.executeJavaScript('document.querySelectorAll(".req-tab")?.length');
    console.log('[Smoke Test] Initial Tab Count:', tabCount);
    if (tabCount !== 1) throw new Error(`Expected 1 tab, got ${tabCount}`);

    // 3. Trigger New Request Action
    console.log('[Smoke Test] Triggering "+ New Request" button click...');
    await win.webContents.executeJavaScript('document.getElementById("btn-new-request")?.click()');
    tabCount = await win.webContents.executeJavaScript('document.querySelectorAll(".req-tab")?.length');
    console.log('[Smoke Test] Tab Count after New Request click:', tabCount);
    if (tabCount !== 2) throw new Error(`Expected 2 tabs after click, got ${tabCount}`);

    // 4. Verify Active Tab is new tab with GET and empty URL
    const activeMethod = await win.webContents.executeJavaScript('document.getElementById("select-method")?.value');
    const activeUrl = await win.webContents.executeJavaScript('document.getElementById("input-url")?.value');
    console.log('[Smoke Test] New Tab Method:', activeMethod, '| URL:', JSON.stringify(activeUrl));
    if (activeMethod !== 'GET' || activeUrl !== '') {
      throw new Error('New tab should default to GET and empty URL');
    }

    // 5. Simulate editing URL on tab 2
    console.log('[Smoke Test] Editing URL in tab 2...');
    await win.webContents.executeJavaScript(`
      const input = document.getElementById("input-url");
      input.value = "https://spring.example.com/api/v1/users";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    `);

    // 6. Test Send button interaction (Honest Step 1 behavior)
    console.log('[Smoke Test] Clicking Send button on tab 2...');
    await win.webContents.executeJavaScript('document.getElementById("btn-send")?.click()');
    const feedbackVisible = await win.webContents.executeJavaScript('!document.getElementById("response-step1-feedback")?.hasAttribute("hidden")');
    const previewUrl = await win.webContents.executeJavaScript('document.getElementById("preview-url-text")?.textContent');
    console.log('[Smoke Test] Step 1 Feedback Visible:', feedbackVisible, '| Preview URL:', previewUrl);

    if (!feedbackVisible || !previewUrl.includes('https://spring.example.com/api/v1/users')) {
      throw new Error('Step 1 feedback card should display configured method and URL');
    }

    // 7. Dismiss feedback
    await win.webContents.executeJavaScript('document.getElementById("btn-dismiss-feedback")?.click()');
    const emptyStateVisible = await win.webContents.executeJavaScript('!document.getElementById("response-empty-state")?.hasAttribute("hidden")');
    console.log('[Smoke Test] Empty state restored:', emptyStateVisible);
    if (!emptyStateVisible) throw new Error('Empty state was not restored after dismiss');

    // 8. Close tab 2
    console.log('[Smoke Test] Closing tab 2...');
    await win.webContents.executeJavaScript(`
      const closeBtns = document.querySelectorAll(".tab-close-btn");
      if (closeBtns.length > 0) closeBtns[closeBtns.length - 1].click();
    `);
    tabCount = await win.webContents.executeJavaScript('document.querySelectorAll(".req-tab")?.length');
    console.log('[Smoke Test] Tab Count after closing tab 2:', tabCount);
    if (tabCount !== 1) throw new Error(`Expected 1 tab after closing, got ${tabCount}`);

    console.log('[Smoke Test] ========================================');
    console.log('[Smoke Test] ALL ELECTRON INTERACTION TESTS PASSED!');
    console.log('[Smoke Test] ========================================');

    app.quit();
    process.exit(0);
  } catch (err) {
    console.error('[Smoke Test] FATAL TEST ERROR:', err);
    app.quit();
    process.exit(1);
  }
});
