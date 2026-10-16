/**
 * ApiForge Lite - Spring Edition
 * Request History Storage Service (Step 4)
 *
 * Persists HTTP request/response history entries to:
 *   app.getPath('userData')/history.json
 *
 * Security:
 *   - Redacts sensitive headers (Authorization, Cookie, Proxy-Authorization,
 *     X-API-Key, X-Auth-Token) as "***" before persistence.
 *   - Never stores request bodies, passwords, or tokens.
 *   - Atomic writes (.tmp -> rename) to prevent file corruption.
 *   - Validates all inbound arguments via strict type checking.
 *   - Limits entries to configurable maximum (default: 100).
 *   - Gracefully recovers from corrupted history.json files.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { app } = require('electron');

let historyFilePath = null;
let maxHistoryEntries = 100;

const SENSITIVE_HEADERS = new Set([
  'authorization', 'cookie', 'set-cookie', 'proxy-authorization',
  'x-api-key', 'x-auth-token', 'x-api-token', 'x-access-token',
  'x-secret', 'api-key', 'token', 'secret'
]);

const PREVIEW_MAX_BYTES = 2048;

// ============================================================================
// Initialization
// ============================================================================

function initHistoryStorage(customPath) {
  if (customPath) {
    historyFilePath = path.resolve(customPath);
  } else if (!historyFilePath) {
    const userData = app ? app.getPath('userData') : process.cwd();
    historyFilePath = path.resolve(userData, 'history.json');
  }
  return historyFilePath;
}

function getHistoryFilePath() {
  if (!historyFilePath) {
    initHistoryStorage();
  }
  return historyFilePath;
}

// ============================================================================
// Atomic File I/O (mirrors collectionsStorage pattern)
// ============================================================================

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  const serialized = JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, serialized, 'utf8');

  try {
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (err.code === 'EEXIST' || err.code === 'EPERM') {
      try { fs.unlinkSync(filePath); } catch (_) {}
      fs.renameSync(tempPath, filePath);
    } else {
      try { fs.unlinkSync(tempPath); } catch (_) {}
      throw err;
    }
  }
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const clean = raw.trim().replace(/^\uFEFF/, '');
    if (!clean) return null;
    return JSON.parse(clean);
  } catch (err) {
    console.warn(`[HistoryStorage] Warning: Failed to parse JSON from "${filePath}":`, err.message);
    return null;
  }
}

// ============================================================================
// Security Helpers
// ============================================================================

function redactHeaders(headers) {
  if (!headers) return [];

  if (Array.isArray(headers)) {
    return headers.map((h) => {
      if (!h || typeof h.key !== 'string') return h;
      const lKey = h.key.toLowerCase().trim();
      if (SENSITIVE_HEADERS.has(lKey)) {
        return { key: h.key, value: '***', enabled: h.enabled };
      }
      return { key: h.key, value: h.value, enabled: h.enabled };
    });
  }

  if (typeof headers === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
      const lKey = k.toLowerCase().trim();
      out[k] = SENSITIVE_HEADERS.has(lKey) ? '***' : v;
    }
    return out;
  }

  return [];
}

function truncateBodyPreview(body) {
  if (!body || typeof body !== 'string') return '';
  if (body.length <= PREVIEW_MAX_BYTES) return body;
  return body.slice(0, PREVIEW_MAX_BYTES) + '\n[truncated]';
}

// ============================================================================
// History CRUD
// ============================================================================

function readHistory() {
  const data = safeReadJson(getHistoryFilePath());
  if (!data) return [];
  if (!Array.isArray(data)) {
    console.warn('[HistoryStorage] history.json had non-array root; resetting.');
    return [];
  }
  return data;
}

function writeHistory(entries) {
  const trimmed = entries.slice(0, maxHistoryEntries);
  atomicWriteJson(getHistoryFilePath(), trimmed);
}

function addHistoryEntry(opts) {
  if (!opts || typeof opts !== 'object') {
    throw new TypeError('[HistoryStorage] addHistoryEntry: opts must be an object');
  }

  const method = (typeof opts.method === 'string' ? opts.method : 'GET').toUpperCase().trim();
  const url = typeof opts.url === 'string' ? opts.url.trim() : '';
  const status = typeof opts.status === 'number' ? opts.status : null;
  const durationMs = typeof opts.durationMs === 'number' ? opts.durationMs : 0;
  const isNetworkError = Boolean(opts.isNetworkError);
  const errorMessage = typeof opts.errorMessage === 'string' ? opts.errorMessage : '';

  const entry = {
    id: `hist_${Date.now()}_${randomUUID().slice(0, 6)}`,
    timestamp: Date.now(),
    method,
    url,
    params: Array.isArray(opts.params) ? opts.params : [],
    requestHeaders: redactHeaders(opts.headers || []),
    status,
    durationMs,
    bodyPreview: truncateBodyPreview(opts.bodyPreview || ''),
    isNetworkError,
    errorMessage
  };

  const entries = readHistory();
  entries.unshift(entry);

  if (entries.length > maxHistoryEntries) {
    entries.splice(maxHistoryEntries);
  }

  writeHistory(entries);
  return entry;
}

function getHistory() {
  return readHistory();
}

function clearHistory() {
  atomicWriteJson(getHistoryFilePath(), []);
  return { success: true };
}

function setMaxEntries(newMax) {
  if (typeof newMax !== 'number' || !Number.isInteger(newMax) || newMax < 10 || newMax > 1000) {
    throw new RangeError('[HistoryStorage] maxEntries must be an integer between 10 and 1000');
  }
  maxHistoryEntries = newMax;

  const entries = readHistory();
  if (entries.length > maxHistoryEntries) {
    writeHistory(entries);
  }
}

function getMaxEntries() {
  return maxHistoryEntries;
}

module.exports = {
  initHistoryStorage,
  getHistoryFilePath,
  addHistoryEntry,
  getHistory,
  clearHistory,
  setMaxEntries,
  getMaxEntries,
  redactHeaders,
  truncateBodyPreview
};
