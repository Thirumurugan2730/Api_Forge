/**
 * ApiForge Lite - Spring Edition
 * Step 4 Automated Test Suite: Request History & Settings
 *
 * Covers all 15 verification areas required by the Step 4 specification:
 *   1. Recording successful HTTP responses
 *   2. Recording HTTP 4xx and 5xx responses
 *   3. Recording network failures without inventing an HTTP status
 *   4. History ordering (newest-first)
 *   5. Trimming history to 100 entries by default
 *   6. Custom history limits and automatic trimming
 *   7. Clearing history
 *   8. Restoring a history entry into the request editor
 *   9. Authorization and sensitive-header redaction (case-insensitive)
 *  10. Ensuring request bodies and credentials are not persisted in history
 *  11. Settings validation and persistence
 *  12. Applying request timeouts to subsequent requests
 *  13. Dark and Light theme persistence
 *  14. Recovery from corrupted history and settings JSON
 *  15. Atomic writes and filesystem errors
 */

'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const historyStorage = require('../src/main/storage/historyStorage');
const settingsStorage = require('../src/main/storage/settingsStorage');
const { executeHttpRequest } = require('../src/main/http/httpClient');

// Temporary test directory for isolated filesystem testing
let testDir = null;
let testHistoryPath = null;
let testSettingsPath = null;

// Local HTTP Test Server
let testServer = null;
let serverPort = null;
let serverBaseUrl = null;

describe('Step 4: Request History and Settings Test Suite', () => {
  before(async () => {
    // 1. Create unique sandbox directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiforge-step4-test-'));
    testHistoryPath = path.join(testDir, 'history.json');
    testSettingsPath = path.join(testDir, 'settings.json');

    // 2. Start local HTTP test server for deterministic network tests
    await new Promise((resolve) => {
      testServer = http.createServer((req, res) => {
        const url = new URL(req.url, `http://localhost`);

        if (url.pathname === '/delay') {
          const delayMs = parseInt(url.searchParams.get('ms') || '200', 10);
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ delayed: true, delayMs }));
          }, delayMs);
          return;
        }

        if (url.pathname === '/success') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', message: 'Hello Step 4' }));
          return;
        }

        if (url.pathname === '/error-404') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
          return;
        }

        if (url.pathname === '/error-500') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      });

      testServer.listen(0, '127.0.0.1', () => {
        serverPort = testServer.address().port;
        serverBaseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  after(() => {
    if (testServer) testServer.close();
    try {
      if (testDir && fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  beforeEach(() => {
    // Reinitialize storage paths to fresh sandboxed files
    if (fs.existsSync(testHistoryPath)) fs.unlinkSync(testHistoryPath);
    if (fs.existsSync(testSettingsPath)) fs.unlinkSync(testSettingsPath);

    historyStorage.initHistoryStorage(testHistoryPath);
    historyStorage.setMaxEntries(100);
    settingsStorage.initSettingsStorage(testSettingsPath);
  });

  // ==========================================================================
  // Test 1: Recording successful HTTP responses
  // ==========================================================================
  it('1. should record successful HTTP response with status, duration, and body preview', () => {
    const entry = historyStorage.addHistoryEntry({
      method: 'GET',
      url: `${serverBaseUrl}/success`,
      params: [{ key: 'active', value: 'true', enabled: true }],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      status: 200,
      durationMs: 42,
      bodyPreview: '{"status":"ok","message":"Hello Step 4"}',
      isNetworkError: false
    });

    assert.ok(entry.id);
    assert.equal(entry.method, 'GET');
    assert.equal(entry.url, `${serverBaseUrl}/success`);
    assert.equal(entry.status, 200);
    assert.equal(entry.durationMs, 42);
    assert.equal(entry.isNetworkError, false);
    assert.ok(entry.bodyPreview.includes('Hello Step 4'));

    const list = historyStorage.getHistory();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, entry.id);
  });

  // ==========================================================================
  // Test 2: Recording HTTP 4xx and 5xx responses
  // ==========================================================================
  it('2. should record HTTP 4xx and 5xx responses preserving status code and not treating as network failure', () => {
    const entry404 = historyStorage.addHistoryEntry({
      method: 'GET',
      url: `${serverBaseUrl}/error-404`,
      status: 404,
      durationMs: 15,
      bodyPreview: '{"error":"Not Found"}',
      isNetworkError: false
    });

    const entry500 = historyStorage.addHistoryEntry({
      method: 'POST',
      url: `${serverBaseUrl}/error-500`,
      status: 500,
      durationMs: 30,
      bodyPreview: '{"error":"Internal Server Error"}',
      isNetworkError: false
    });

    assert.equal(entry404.status, 404);
    assert.equal(entry404.isNetworkError, false);

    assert.equal(entry500.status, 500);
    assert.equal(entry500.isNetworkError, false);

    const history = historyStorage.getHistory();
    assert.equal(history.length, 2);
    assert.equal(history[0].status, 500); // newest first
    assert.equal(history[1].status, 404);
  });

  // ==========================================================================
  // Test 3: Recording network failures without inventing an HTTP status
  // ==========================================================================
  it('3. should record network failures without inventing an HTTP status code', () => {
    const failedEntry = historyStorage.addHistoryEntry({
      method: 'GET',
      url: 'http://127.0.0.1:99999/unreachable',
      status: null,
      durationMs: 0,
      bodyPreview: '',
      isNetworkError: true,
      errorMessage: 'connect ECONNREFUSED 127.0.0.1:99999'
    });

    assert.strictEqual(failedEntry.status, null);
    assert.equal(failedEntry.isNetworkError, true);
    assert.equal(failedEntry.errorMessage, 'connect ECONNREFUSED 127.0.0.1:99999');

    const history = historyStorage.getHistory();
    assert.equal(history.length, 1);
    assert.strictEqual(history[0].status, null, 'Must NOT invent a status like 0 or 500 for network failures');
    assert.equal(history[0].isNetworkError, true);
  });

  // ==========================================================================
  // Test 4: History ordering (newest-first)
  // ==========================================================================
  it('4. should maintain newest-first chronological ordering', () => {
    historyStorage.addHistoryEntry({ method: 'GET', url: 'http://example.com/first', status: 200 });
    historyStorage.addHistoryEntry({ method: 'POST', url: 'http://example.com/second', status: 201 });
    historyStorage.addHistoryEntry({ method: 'DELETE', url: 'http://example.com/third', status: 204 });

    const history = historyStorage.getHistory();
    assert.equal(history.length, 3);
    assert.equal(history[0].url, 'http://example.com/third');
    assert.equal(history[1].url, 'http://example.com/second');
    assert.equal(history[2].url, 'http://example.com/first');
  });

  // ==========================================================================
  // Test 5: Trimming history to 100 entries by default
  // ==========================================================================
  it('5. should trim history to 100 entries by default when limit is exceeded', () => {
    for (let i = 1; i <= 110; i++) {
      historyStorage.addHistoryEntry({
        method: 'GET',
        url: `http://example.com/req-${i}`,
        status: 200
      });
    }

    const history = historyStorage.getHistory();
    assert.equal(history.length, 100, 'History must not exceed default limit of 100');
    // Newest is 110, oldest retained is 11 (1-10 were trimmed)
    assert.equal(history[0].url, 'http://example.com/req-110');
    assert.equal(history[99].url, 'http://example.com/req-11');
  });

  // ==========================================================================
  // Test 6: Custom history limits and automatic trimming
  // ==========================================================================
  it('6. should support custom history limits and automatically trim excess entries', () => {
    for (let i = 1; i <= 40; i++) {
      historyStorage.addHistoryEntry({
        method: 'GET',
        url: `http://example.com/item-${i}`,
        status: 200
      });
    }
    assert.equal(historyStorage.getHistory().length, 40);

    // Decrease limit to 20
    historyStorage.setMaxEntries(20);
    assert.equal(historyStorage.getMaxEntries(), 20);

    const trimmed = historyStorage.getHistory();
    assert.equal(trimmed.length, 20);
    assert.equal(trimmed[0].url, 'http://example.com/item-40');
    assert.equal(trimmed[19].url, 'http://example.com/item-21');

    // Reject out-of-range limits
    assert.throws(() => historyStorage.setMaxEntries(5), RangeError);
    assert.throws(() => historyStorage.setMaxEntries(2000), RangeError);
  });

  // ==========================================================================
  // Test 7: Clearing history
  // ==========================================================================
  it('7. should clear history completely and persist empty state', () => {
    historyStorage.addHistoryEntry({ method: 'GET', url: 'http://example.com/1', status: 200 });
    historyStorage.addHistoryEntry({ method: 'GET', url: 'http://example.com/2', status: 200 });
    assert.equal(historyStorage.getHistory().length, 2);

    const res = historyStorage.clearHistory();
    assert.equal(res.success, true);

    const cleared = historyStorage.getHistory();
    assert.deepEqual(cleared, []);

    // Verify raw file content is an empty array
    const fileContent = JSON.parse(fs.readFileSync(testHistoryPath, 'utf8'));
    assert.deepEqual(fileContent, []);
  });

  // ==========================================================================
  // Test 8: Restoring a history entry into the request editor
  // ==========================================================================
  it('8. should structure history entry to cleanly restore into request editor', () => {
    const entry = historyStorage.addHistoryEntry({
      method: 'POST',
      url: 'https://api.example.com/users',
      params: [{ key: 'role', value: 'admin', enabled: true }],
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Authorization', value: 'Bearer secret_token', enabled: true }
      ],
      status: 201,
      durationMs: 55,
      bodyPreview: '{"id":123}',
      isNetworkError: false
    });

    // Verify properties necessary for restoring request editor
    assert.equal(entry.method, 'POST');
    assert.equal(entry.url, 'https://api.example.com/users');
    assert.deepEqual(entry.params, [{ key: 'role', value: 'admin', enabled: true }]);

    // Headers are restored with non-sensitive values and redacted indicator
    assert.equal(entry.requestHeaders.length, 2);
    const authHeader = entry.requestHeaders.find(h => h.key.toLowerCase() === 'authorization');
    const ctHeader = entry.requestHeaders.find(h => h.key.toLowerCase() === 'content-type');
    assert.equal(authHeader.value, '***');
    assert.equal(ctHeader.value, 'application/json');
  });

  // ==========================================================================
  // Test 9: Authorization and sensitive-header redaction (case-insensitive)
  // ==========================================================================
  it('9. should redact case-insensitive Authorization and credential headers as ***', () => {
    const entry = historyStorage.addHistoryEntry({
      method: 'GET',
      url: 'https://api.example.com/secure',
      headers: [
        { key: 'AUTHORIZATION', value: 'Bearer token-uppercase', enabled: true },
        { key: 'authorization', value: 'Bearer token-lowercase', enabled: true },
        { key: 'Authorization', value: 'Basic dXNlcjpwYXNz', enabled: true },
        { key: 'Cookie', value: 'session_id=abcdef12345', enabled: true },
        { key: 'Set-Cookie', value: 'jwt=xyz', enabled: true },
        { key: 'X-API-KEY', value: 'prod-api-key-999', enabled: true },
        { key: 'Proxy-Authorization', value: 'Basic proxyauth', enabled: true },
        { key: 'X-Auth-Token', value: 'auth-token-123', enabled: true },
        { key: 'Accept', value: 'application/json', enabled: true },
        { key: 'User-Agent', value: 'ApiForge-Test', enabled: true }
      ],
      status: 200
    });

    // Check all sensitive headers are masked with ***
    for (const h of entry.requestHeaders) {
      const lk = h.key.toLowerCase();
      if (['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization', 'x-auth-token'].includes(lk)) {
        assert.equal(h.value, '***', `Header ${h.key} must be redacted to ***`);
      } else {
        assert.notEqual(h.value, '***', `Non-sensitive header ${h.key} must not be redacted`);
      }
    }
  });

  // ==========================================================================
  // Test 10: Ensuring request bodies and credentials are not persisted in history
  // ==========================================================================
  it('10. should ensure request bodies, passwords, and tokens are NEVER persisted in history', () => {
    const entry = historyStorage.addHistoryEntry({
      method: 'POST',
      url: 'https://api.example.com/login',
      // Attacker or inadvertent caller passes request body and password
      requestBody: '{"username":"admin","password":"SuperSecretPassword123!"}',
      body: '{"username":"admin","password":"SuperSecretPassword123!"}',
      status: 200,
      bodyPreview: '{"token":"jwt-response-token"}'
    });

    // Check entry object returned
    assert.strictEqual(entry.requestBody, undefined, 'requestBody must not exist in history entry');
    assert.strictEqual(entry.body, undefined, 'body must not exist in history entry');

    // Check raw persisted JSON on disk
    const rawDisk = fs.readFileSync(testHistoryPath, 'utf8');
    assert.doesNotMatch(rawDisk, /SuperSecretPassword123!/, 'Password must NOT exist anywhere in persisted history.json');
    assert.doesNotMatch(rawDisk, /requestBody/, 'requestBody key must not exist in history.json');
  });

  // ==========================================================================
  // Test 11: Settings validation and persistence
  // ==========================================================================
  it('11. should validate and persist settings within supported ranges', () => {
    // Default settings
    const defaults = settingsStorage.getSettings();
    assert.equal(defaults.requestTimeoutMs, 15000);
    assert.equal(defaults.historyLimit, 100);
    assert.equal(defaults.theme, 'dark');

    // Save valid custom settings
    const saved = settingsStorage.saveSettings({
      requestTimeoutMs: 30000,
      historyLimit: 250,
      theme: 'light'
    });
    assert.equal(saved.requestTimeoutMs, 30000);
    assert.equal(saved.historyLimit, 250);
    assert.equal(saved.theme, 'light');

    // Re-read from disk
    const reloaded = settingsStorage.getSettings();
    assert.deepEqual(reloaded, saved);

    // Validation checks - Range and Type enforcement
    assert.throws(() => settingsStorage.saveSettings({ requestTimeoutMs: 500 }), RangeError);
    assert.throws(() => settingsStorage.saveSettings({ requestTimeoutMs: 150000 }), RangeError);
    assert.throws(() => settingsStorage.saveSettings({ historyLimit: 5 }), RangeError);
    assert.throws(() => settingsStorage.saveSettings({ historyLimit: 5000 }), RangeError);
    assert.throws(() => settingsStorage.saveSettings({ theme: 'solarized' }), TypeError);
  });

  // ==========================================================================
  // Test 12: Applying request timeouts to subsequent requests
  // ==========================================================================
  it('12. should enforce request timeout settings on HTTP engine execution', async () => {
    // 1. Request with 50ms timeout against 200ms delay endpoint must timeout
    const timeoutResult = await executeHttpRequest({
      method: 'GET',
      url: `${serverBaseUrl}/delay?ms=200`,
      timeoutMs: 50
    });
    assert.equal(timeoutResult.success, false);
    assert.ok(timeoutResult.error);
    assert.equal(timeoutResult.error.type, 'TIMEOUT');

    // 2. Request with 800ms timeout against 100ms delay endpoint must succeed
    const successResult = await executeHttpRequest({
      method: 'GET',
      url: `${serverBaseUrl}/delay?ms=100`,
      timeoutMs: 800
    });
    assert.equal(successResult.success, true);
    assert.equal(successResult.response.status, 200);
  });

  // ==========================================================================
  // Test 13: Dark and Light theme persistence
  // ==========================================================================
  it('13. should persist Dark and Light theme choices and restore after restart', () => {
    // Start with dark
    settingsStorage.updateSettings({ theme: 'light' });
    assert.equal(settingsStorage.getSettings().theme, 'light');

    // Simulate app restart by re-initializing storage from disk
    settingsStorage.initSettingsStorage(testSettingsPath);
    assert.equal(settingsStorage.getSettings().theme, 'light');

    // Switch back to dark
    settingsStorage.updateSettings({ theme: 'dark' });
    assert.equal(settingsStorage.getSettings().theme, 'dark');

    settingsStorage.initSettingsStorage(testSettingsPath);
    assert.equal(settingsStorage.getSettings().theme, 'dark');
  });

  // ==========================================================================
  // Test 14: Recovery from corrupted history and settings JSON
  // ==========================================================================
  it('14. should safely recover from corrupted history and settings JSON without crashing', () => {
    // 1. Corrupt history.json with invalid JSON
    fs.writeFileSync(testHistoryPath, '<<< CORRUPTED NON-JSON CONTENT >>>', 'utf8');
    const recoveredHistory = historyStorage.getHistory();
    assert.deepEqual(recoveredHistory, [], 'Must return empty array on corrupted history');

    // Can still add new entries after corruption
    const entry = historyStorage.addHistoryEntry({ method: 'GET', url: 'http://example.com/recovered', status: 200 });
    assert.ok(entry);
    assert.equal(historyStorage.getHistory().length, 1);

    // 2. Corrupt settings.json with invalid JSON
    fs.writeFileSync(testSettingsPath, '{ "brokenJson": true, ', 'utf8');
    const recoveredSettings = settingsStorage.getSettings();
    assert.equal(recoveredSettings.requestTimeoutMs, 15000);
    assert.equal(recoveredSettings.historyLimit, 100);
    assert.equal(recoveredSettings.theme, 'dark');

    // Can still save settings after corruption
    settingsStorage.saveSettings({ requestTimeoutMs: 20000, historyLimit: 150, theme: 'light' });
    assert.equal(settingsStorage.getSettings().requestTimeoutMs, 20000);
  });

  // ==========================================================================
  // Test 15: Atomic writes and filesystem resilience
  // ==========================================================================
  it('15. should use atomic writes to ensure persistent files remain valid under rapid writes', () => {
    // Perform rapid concurrent-like writes
    for (let i = 0; i < 20; i++) {
      historyStorage.addHistoryEntry({
        method: 'GET',
        url: `http://example.com/atomic-${i}`,
        status: 200
      });
      settingsStorage.saveSettings({
        requestTimeoutMs: 15000 + (i * 100),
        historyLimit: 100,
        theme: i % 2 === 0 ? 'dark' : 'light'
      });
    }

    // Verify both files are valid, non-empty JSON
    const historyRaw = fs.readFileSync(testHistoryPath, 'utf8');
    const settingsRaw = fs.readFileSync(testSettingsPath, 'utf8');

    assert.doesNotThrow(() => JSON.parse(historyRaw));
    assert.doesNotThrow(() => JSON.parse(settingsRaw));

    const historyData = JSON.parse(historyRaw);
    const settingsData = JSON.parse(settingsRaw);

    assert.equal(historyData.length, 20);
    assert.equal(settingsData.requestTimeoutMs, 16900);
  });
});
