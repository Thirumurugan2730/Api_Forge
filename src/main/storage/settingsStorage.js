/**
 * ApiForge Lite - Spring Edition
 * Application Settings Storage Service (Step 4)
 *
 * Persists user settings to: app.getPath('userData')/settings.json
 *
 * Supported settings:
 *   - requestTimeoutMs : number  (1000-120000, default 15000)
 *   - historyLimit     : number  (10-1000, default 100)
 *   - theme            : 'dark' | 'light' (default 'dark')
 *
 * Security:
 *   - Atomic writes (.tmp -> rename) to prevent file corruption.
 *   - All values validated with strict type checking and range enforcement.
 *   - Unknown keys in persisted file are silently ignored on load.
 *   - Corrupted settings.json gracefully falls back to defaults.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { app } = require('electron');

let settingsFilePath = null;

const DEFAULTS = {
  requestTimeoutMs: 15000,
  historyLimit: 100,
  theme: 'dark'
};

const VALID_THEMES = new Set(['dark', 'light']);

// ============================================================================
// Initialization
// ============================================================================

function initSettingsStorage(customPath) {
  if (customPath) {
    settingsFilePath = path.resolve(customPath);
  } else if (!settingsFilePath) {
    const userData = app ? app.getPath('userData') : process.cwd();
    settingsFilePath = path.resolve(userData, 'settings.json');
  }
  return settingsFilePath;
}

function getSettingsFilePath() {
  if (!settingsFilePath) {
    initSettingsStorage();
  }
  return settingsFilePath;
}

// ============================================================================
// Atomic File I/O
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
    console.warn(`[SettingsStorage] Warning: Failed to parse JSON from "${filePath}":`, err.message);
    return null;
  }
}

// ============================================================================
// Validation
// ============================================================================

function validateRequestTimeoutMs(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1000 || value > 120000) {
    throw new RangeError(`requestTimeoutMs must be an integer between 1000 and 120000, got: ${value}`);
  }
}

function validateHistoryLimit(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 10 || value > 1000) {
    throw new RangeError(`historyLimit must be an integer between 10 and 1000, got: ${value}`);
  }
}

function validateTheme(value) {
  if (!VALID_THEMES.has(value)) {
    throw new TypeError(`theme must be one of: ${[...VALID_THEMES].join(', ')}, got: ${value}`);
  }
}

/**
 * Validates an entire settings object. Only validates known keys.
 *
 * @param {object} partial - Partial or full settings object to validate.
 */
function validateSettings(partial) {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) {
    throw new TypeError('Settings must be a plain object');
  }

  if ('requestTimeoutMs' in partial) validateRequestTimeoutMs(partial.requestTimeoutMs);
  if ('historyLimit' in partial) validateHistoryLimit(partial.historyLimit);
  if ('theme' in partial) validateTheme(partial.theme);
}

// ============================================================================
// Settings CRUD
// ============================================================================

/**
 * Reads and merges persisted settings with defaults.
 * Unknown or invalid persisted keys are silently ignored (safe defaults applied).
 *
 * @returns {{ requestTimeoutMs: number, historyLimit: number, theme: string }}
 */
function getSettings() {
  const raw = safeReadJson(getSettingsFilePath());
  const merged = { ...DEFAULTS };

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    // Merge only known keys that pass validation
    if (typeof raw.requestTimeoutMs === 'number' && Number.isInteger(raw.requestTimeoutMs) &&
        raw.requestTimeoutMs >= 1000 && raw.requestTimeoutMs <= 120000) {
      merged.requestTimeoutMs = raw.requestTimeoutMs;
    }
    if (typeof raw.historyLimit === 'number' && Number.isInteger(raw.historyLimit) &&
        raw.historyLimit >= 10 && raw.historyLimit <= 1000) {
      merged.historyLimit = raw.historyLimit;
    }
    if (VALID_THEMES.has(raw.theme)) {
      merged.theme = raw.theme;
    }
  }

  return merged;
}

/**
 * Saves a complete settings object (must pass full validation).
 *
 * @param {object} settings
 * @returns {{ requestTimeoutMs: number, historyLimit: number, theme: string }}
 */
function saveSettings(settings) {
  validateSettings(settings);

  // Persist only the whitelisted known keys
  const safe = {
    requestTimeoutMs: settings.requestTimeoutMs !== undefined ? settings.requestTimeoutMs : DEFAULTS.requestTimeoutMs,
    historyLimit: settings.historyLimit !== undefined ? settings.historyLimit : DEFAULTS.historyLimit,
    theme: settings.theme !== undefined ? settings.theme : DEFAULTS.theme
  };

  // Validate all final values
  validateRequestTimeoutMs(safe.requestTimeoutMs);
  validateHistoryLimit(safe.historyLimit);
  validateTheme(safe.theme);

  atomicWriteJson(getSettingsFilePath(), safe);
  return safe;
}

/**
 * Updates a partial set of settings (only provided keys are changed).
 *
 * @param {Partial<{ requestTimeoutMs: number, historyLimit: number, theme: string }>} partial
 * @returns {{ requestTimeoutMs: number, historyLimit: number, theme: string }}
 */
function updateSettings(partial) {
  validateSettings(partial);
  const current = getSettings();
  const merged = { ...current, ...partial };
  return saveSettings(merged);
}

/**
 * Resets all settings to factory defaults.
 *
 * @returns {{ requestTimeoutMs: number, historyLimit: number, theme: string }}
 */
function resetSettings() {
  atomicWriteJson(getSettingsFilePath(), { ...DEFAULTS });
  return { ...DEFAULTS };
}

/**
 * Returns the default settings object.
 *
 * @returns {{ requestTimeoutMs: number, historyLimit: number, theme: string }}
 */
function getDefaults() {
  return { ...DEFAULTS };
}

module.exports = {
  initSettingsStorage,
  getSettingsFilePath,
  getSettings,
  saveSettings,
  updateSettings,
  resetSettings,
  getDefaults,
  validateSettings
};
