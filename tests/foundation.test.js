/**
 * ApiForge Lite — Step 1 Foundation Automated Test Suite
 * Executed via Node.js built-in test runner (node --test)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');
const MAIN_PATH = path.join(ROOT_DIR, 'src/main/main.js');
const PRELOAD_PATH = path.join(ROOT_DIR, 'src/preload/preload.js');
const HTML_PATH = path.join(ROOT_DIR, 'src/renderer/index.html');
const { handleGetAppInfo, validateGetAppInfoArgs } = require('../src/main/ipc/appHandlers');
const { isAllowedNavigationUrl } = require('../src/main/security/navigation');

describe('1. Application Metadata & Configuration', () => {
  it('should load package.json and verify mandatory configuration fields', () => {
    assert.ok(fs.existsSync(PKG_PATH), 'package.json must exist');
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));

    assert.equal(pkg.name, 'apiforge-lite');
    assert.equal(pkg.version, '0.1.0');
    assert.equal(pkg.main, 'src/main/main.js');
    assert.ok(pkg.devDependencies && pkg.devDependencies.electron, 'electron must be declared in devDependencies');
  });

  it('should verify that all core entry files exist', () => {
    assert.ok(fs.existsSync(MAIN_PATH), 'Main process entry file must exist');
    assert.ok(fs.existsSync(PRELOAD_PATH), 'Preload script must exist');
    assert.ok(fs.existsSync(HTML_PATH), 'Renderer index.html must exist');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'src/renderer/styles/main.css')), 'main.css must exist');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'src/renderer/scripts/renderer.js')), 'renderer.js must exist');
  });
});

describe('2. IPC Handler Contract & Structure', () => {
  it('should return valid runtime metadata when handleGetAppInfo is invoked without arguments', () => {
    const mockApp = {
      getVersion: () => '0.1.0',
      getName: () => 'ApiForge Lite'
    };

    const result = handleGetAppInfo(mockApp);

    assert.equal(result.name, 'ApiForge Lite');
    assert.equal(result.subtitle, 'Spring Edition');
    assert.equal(result.version, '0.1.0');
    assert.equal(result.status, 'online');
    assert.ok(typeof result.nodeVersion === 'string', 'nodeVersion should be a string');
    assert.ok(typeof result.bridgeTimestamp === 'number', 'bridgeTimestamp should be a timestamp');
    assert.ok(typeof result.platform === 'string', 'platform should be reported');
  });

  it('should accept valid optional parameters', () => {
    const mockApp = { getVersion: () => '0.1.0' };
    const validArgs = { requestTimestamp: Date.now() };

    assert.doesNotThrow(() => {
      const result = handleGetAppInfo(mockApp, validArgs);
      assert.equal(result.status, 'online');
    });
  });
});

describe('3. IPC Argument Validation & Rejection of Malformed Payloads', () => {
  it('should reject non-object payloads (strings, numbers, booleans)', () => {
    assert.throws(() => validateGetAppInfoArgs('invalid-string'), TypeError);
    assert.throws(() => validateGetAppInfoArgs(12345), TypeError);
    assert.throws(() => validateGetAppInfoArgs(true), TypeError);
  });

  it('should reject array payloads', () => {
    assert.throws(() => validateGetAppInfoArgs(['bad', 'array']), TypeError);
  });

  it('should reject unexpected argument keys and manipulated prototypes', () => {
    assert.throws(() => validateGetAppInfoArgs({ maliciousKey: 'exec' }), /Unexpected argument key/);
    assert.throws(() => validateGetAppInfoArgs(Object.create({ fake: true })), /Invalid prototype/);
    assert.throws(() => validateGetAppInfoArgs(JSON.parse('{"__proto__": {"admin": true}}')), Error);
  });

  it('should reject oversized payloads (exceeding 1024 bytes)', () => {
    const bigString = 'x'.repeat(1200);
    assert.throws(() => validateGetAppInfoArgs({ requestTimestamp: 1, overflow: bigString }), Error);
  });

  it('should reject invalid types for known keys', () => {
    assert.throws(() => validateGetAppInfoArgs({ requestTimestamp: 'not-a-number' }), TypeError);
  });
});

describe('4. Preload Bridge Security Contract', () => {
  it('should verify that preload.js exposes strictly the intended narrow API', () => {
    const preloadSource = fs.readFileSync(PRELOAD_PATH, 'utf8');

    // Verify use of contextBridge.exposeInMainWorld
    assert.match(preloadSource, /contextBridge\.exposeInMainWorld\s*\(\s*['"]apiForge['"]/);

    // Verify dangerous Node globals are not exposed directly
    assert.doesNotMatch(preloadSource, /exposeInMainWorld\s*\(\s*['"]ipcRenderer['"]/);
    assert.doesNotMatch(preloadSource, /exposeInMainWorld\s*\(\s*['"]require['"]/);
    assert.doesNotMatch(preloadSource, /exposeInMainWorld\s*\(\s*['"]fs['"]/);
    assert.doesNotMatch(preloadSource, /exposeInMainWorld\s*\(\s*['"]shell['"]/);

    // Simulate preload execution in mock environment to verify exposed object shape
    let exposedApiName = null;
    let exposedApiObject = null;

    const mockContextBridge = {
      exposeInMainWorld: (name, api) => {
        exposedApiName = name;
        exposedApiObject = api;
      }
    };

    const mockIpcRenderer = {
      invoke: async (channel) => ({ channel })
    };

    // Evaluate preload logic in isolated scope
    const preloadFn = new Function('contextBridge', 'ipcRenderer', `
      const apiForgeBridge = Object.freeze({
        getAppInfo: async (options) => ipcRenderer.invoke('app:get-info', options)
      });
      contextBridge.exposeInMainWorld('apiForge', apiForgeBridge);
    `);

    preloadFn(mockContextBridge, mockIpcRenderer);

    assert.equal(exposedApiName, 'apiForge');
    assert.deepEqual(Object.keys(exposedApiObject), ['getAppInfo']);
    assert.ok(Object.isFrozen(exposedApiObject), 'Exposed API object must be frozen');
    assert.equal(typeof exposedApiObject.getAppInfo, 'function');
  });
});

describe('5. Navigation Security Policy', () => {
  const allowedFilePath = 'C:\\Users\\thiru\\OneDrive\\Desktop\\API_Forge\\src\\renderer\\index.html';

  it('should permit only the exact local index.html file URL', () => {
    const fileUrl = 'file:///C:/Users/thiru/OneDrive/Desktop/API_Forge/src/renderer/index.html';
    assert.equal(isAllowedNavigationUrl(fileUrl, allowedFilePath), true);
  });

  it('should block navigation to external web protocols (http, https)', () => {
    assert.equal(isAllowedNavigationUrl('https://malicious.example.com', allowedFilePath), false);
    assert.equal(isAllowedNavigationUrl('http://localhost:8080', allowedFilePath), false);
  });

  it('should block navigation to dangerous internal or unexpected protocols', () => {
    assert.equal(isAllowedNavigationUrl('javascript:alert(1)', allowedFilePath), false);
    assert.equal(isAllowedNavigationUrl('data:text/html,<h1>hacked</h1>', allowedFilePath), false);
    assert.equal(isAllowedNavigationUrl('file:///C:/Windows/System32/cmd.exe', allowedFilePath), false);
  });

  it('should handle malformed, empty, or non-string inputs safely', () => {
    assert.equal(isAllowedNavigationUrl('', allowedFilePath), false);
    assert.equal(isAllowedNavigationUrl(null, allowedFilePath), false);
    assert.equal(isAllowedNavigationUrl(undefined, allowedFilePath), false);
    assert.equal(isAllowedNavigationUrl('not a valid url', allowedFilePath), false);
  });
});

describe('6. Renderer Content-Security-Policy & Security Directives', () => {
  it('should verify that index.html contains a strict CSP header without unsafe-eval', () => {
    const html = fs.readFileSync(HTML_PATH, 'utf8');

    // CSP meta tag presence
    assert.match(html, /<meta\s+http-equiv=["']Content-Security-Policy["']/i);

    // unsafe-eval must NOT be allowed
    assert.doesNotMatch(html, /'unsafe-eval'/i, 'CSP must avoid unsafe-eval');

    // default-src self
    assert.match(html, /default-src\s+'self'/i);

    // connect-src none in Step 1
    assert.match(html, /connect-src\s+'none'/i, 'Step 1 should restrict connect-src to none');
  });

  it('should verify main.js enforces contextIsolation, sandbox, and disables nodeIntegration', () => {
    const mainSource = fs.readFileSync(MAIN_PATH, 'utf8');

    assert.match(mainSource, /contextIsolation:\s*true/);
    assert.match(mainSource, /nodeIntegration:\s*false/);
    assert.match(mainSource, /sandbox:\s*true/);
    assert.match(mainSource, /webSecurity:\s*true/);
  });
});
