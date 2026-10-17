/**
 * ApiForge Lite — Spring Edition
 * Spring Security Role Testing Matrix Engine (Step 9)
 *
 * Executes requests across multiple security identities (ADMIN, USER, Anonymous),
 * evaluates expected access rules (exact status, 2xx success, 401/403 denial, or none),
 * guarantees strict credential isolation between identities,
 * attaches deterministic Spring Error explanations for 4xx/5xx responses,
 * and enforces complete redaction of sensitive credentials in results and persistence.
 */

'use strict';

const { executeHttpRequest } = require('../http/httpClient');
const { explainSpringError } = require('../explainer/errorExplainer');

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'x-api-key',
  'apikey',
  'x-auth-token',
  'session'
]);

/**
 * Replaces {{VAR_NAME}} placeholders with values from envVars or process.env.
 *
 * @param {string} text - Input text with optional {{var}} placeholders.
 * @param {Record<string, string>} [envVars] - Key-value map of environment variables.
 * @returns {string} Text with substituted variables.
 */
function substituteVariables(text, envVars = {}) {
  if (typeof text !== 'string' || !text.includes('{{')) {
    return typeof text === 'string' ? text : '';
  }

  return text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, varName) => {
    if (envVars && Object.prototype.hasOwnProperty.call(envVars, varName)) {
      return String(envVars[varName]);
    }
    if (process.env && Object.prototype.hasOwnProperty.call(process.env, varName)) {
      return String(process.env[varName]);
    }
    return match; // Return unchanged if not found
  });
}

/**
 * Strips authentication and session headers from a headers array.
 * Guarantees that no inherited credentials leak into role requests (especially Anonymous).
 *
 * @param {Array<{key: string, value: string, enabled?: boolean}>} [headers]
 * @returns {Array<{key: string, value: string, enabled: boolean}>}
 */
function stripAuthHeaders(headers = []) {
  if (!Array.isArray(headers)) return [];
  return headers.filter(h => {
    if (!h || typeof h.key !== 'string') return false;
    const lower = h.key.trim().toLowerCase();
    return !SENSITIVE_HEADER_KEYS.has(lower);
  }).map(h => ({
    key: h.key,
    value: h.value || '',
    enabled: h.enabled !== false
  }));
}

/**
 * Redacts values of sensitive headers for safe UI display and storage.
 *
 * @param {Array<{key: string, value: string}> | Record<string, string>} headers
 * @returns {Array<{key: string, value: string}>}
 */
function redactHeaders(headers) {
  if (!headers) return [];

  if (Array.isArray(headers)) {
    return headers.map(h => {
      const lower = (h.key || '').trim().toLowerCase();
      if (SENSITIVE_HEADER_KEYS.has(lower)) {
        return { key: h.key, value: '*** [REDACTED]' };
      }
      return { key: h.key, value: h.value };
    });
  }

  if (typeof headers === 'object') {
    return Object.entries(headers).map(([key, value]) => {
      const lower = key.trim().toLowerCase();
      if (SENSITIVE_HEADER_KEYS.has(lower)) {
        return { key, value: '*** [REDACTED]' };
      }
      return { key, value: String(value) };
    });
  }

  return [];
}

/**
 * Normalizes and sanitizes role configuration for persistence.
 * Guarantees that raw secret tokens and cleartext auth headers are NEVER written to disk.
 * Preserves enabled state, expectation settings, and {{envVar}} references.
 *
 * @param {object} roleConfig
 * @returns {object} Clean, safe configuration for storage.
 */
function sanitizeRoleConfigForPersistence(roleConfig = {}) {
  const sanitizeIdentity = (idConfig = {}) => {
    const rawVal = idConfig.token || idConfig.customHeaderValue || '';
    const isEnvRef = typeof rawVal === 'string' && /^\s*\{\{[a-zA-Z0-9_.-]+\}\}\s*$/.test(rawVal);

    return {
      enabled: idConfig.enabled !== false,
      expectedType: ['exact', '2xx', 'denied', 'none'].includes(idConfig.expectedType)
        ? idConfig.expectedType
        : 'none',
      expectedStatus: idConfig.expectedStatus ? Number(idConfig.expectedStatus) : null,
      authType: idConfig.authType === 'header' ? 'header' : 'bearer',
      // If user configured an environment variable reference like {{ADMIN_TOKEN}}, save it.
      // If they typed a raw secret token, do NOT persist it!
      tokenEnvVar: isEnvRef ? rawVal.trim() : (idConfig.tokenEnvVar || null),
      customHeaderKey: idConfig.customHeaderKey ? idConfig.customHeaderKey.trim() : 'Authorization'
    };
  };

  return {
    admin: sanitizeIdentity(roleConfig.admin || {}),
    user: sanitizeIdentity(roleConfig.user || {}),
    anonymous: {
      enabled: roleConfig.anonymous?.enabled !== false,
      expectedType: ['exact', '2xx', 'denied', 'none'].includes(roleConfig.anonymous?.expectedType)
        ? roleConfig.anonymous.expectedType
        : 'none',
      expectedStatus: roleConfig.anonymous?.expectedStatus ? Number(roleConfig.anonymous.expectedStatus) : null
    }
  };
}

/**
 * Evaluates an identity's execution result against configured expected access rules.
 *
 * @param {string} expectedType - 'exact' | '2xx' | 'denied' | 'none'
 * @param {number|string|null} expectedStatus - Exact HTTP status code (e.g. 200, 401, 403)
 * @param {object} executionResult - Result from executeHttpRequest ({ success, response, error })
 * @returns {{ result: 'PASS' | 'FAIL' | 'INFO' | 'ERROR', passed: boolean|null, message: string }}
 */
function evaluateRoleExpectation(expectedType, expectedStatus, executionResult) {
  // If the request failed before receiving an HTTP response (timeout, connection refused, DNS error, etc.)
  if (!executionResult || !executionResult.success) {
    const errorMsg = executionResult?.error?.message || 'Request failed before receiving an HTTP response';
    return {
      result: 'ERROR',
      passed: false,
      message: `Execution error: ${errorMsg}`
    };
  }

  const actualStatus = executionResult.response.status;

  switch (expectedType) {
    case 'exact': {
      const target = Number(expectedStatus);
      if (!target || isNaN(target)) {
        return {
          result: 'INFO',
          passed: null,
          message: `Received status ${actualStatus} (no valid target status configured)`
        };
      }
      const passed = actualStatus === target;
      return {
        result: passed ? 'PASS' : 'FAIL',
        passed,
        message: passed
          ? `Status ${actualStatus} matches expected ${target}`
          : `Expected status ${target}, but received ${actualStatus}`
      };
    }

    case '2xx':
    case 'success': {
      const passed = actualStatus >= 200 && actualStatus < 300;
      return {
        result: passed ? 'PASS' : 'FAIL',
        passed,
        message: passed
          ? `Status ${actualStatus} is a 2xx success as expected`
          : `Expected 2xx success, but received ${actualStatus}`
      };
    }

    case 'denied':
    case '401/403': {
      const passed = actualStatus === 401 || actualStatus === 403;
      return {
        result: passed ? 'PASS' : 'FAIL',
        passed,
        message: passed
          ? `Access denied with status ${actualStatus} (401/403) as expected`
          : `Expected 401 or 403 access denial, but received ${actualStatus}`
      };
    }

    case 'none':
    default: {
      return {
        result: 'INFO',
        passed: null,
        message: `Status ${actualStatus} received (no expectation configured)`
      };
    }
  }
}

/**
 * Builds the isolated request configuration for a specific role identity.
 *
 * @param {object} baseRequest - The baseline request configuration.
 * @param {string} roleKey - 'admin' | 'user' | 'anonymous'.
 * @param {object} roleConfig - Identity-specific settings.
 * @param {Record<string, string>} [envVars] - Environment variables for substitution.
 * @returns {object} Isolated request configuration for execution.
 */
function buildRoleRequestConfig(baseRequest, roleKey, roleConfig = {}, envVars = {}) {
  // 1. Substitute variables in base request URL, params, and body
  const rawUrl = substituteVariables(baseRequest.url || '', envVars);
  const rawBody = substituteVariables(baseRequest.body || '', envVars);

  const cleanParams = Array.isArray(baseRequest.params)
    ? baseRequest.params.map(p => ({
        key: substituteVariables(p.key || '', envVars),
        value: substituteVariables(p.value || '', envVars),
        enabled: p.enabled !== false
      }))
    : [];

  // 2. Base headers with all existing authentication headers STRIPPED
  const cleanHeaders = stripAuthHeaders(baseRequest.headers).map(h => ({
    key: substituteVariables(h.key || '', envVars),
    value: substituteVariables(h.value || '', envVars),
    enabled: h.enabled !== false
  }));

  // 3. Inject identity-specific credentials
  if (roleKey === 'admin' || roleKey === 'user') {
    const authType = roleConfig.authType || 'bearer';

    if (authType === 'header') {
      const headerKey = (roleConfig.customHeaderKey || 'Authorization').trim();
      const rawHeaderVal = roleConfig.customHeaderValue || roleConfig.token || '';
      const headerVal = substituteVariables(rawHeaderVal, envVars).trim();
      if (headerVal) {
        cleanHeaders.push({ key: headerKey, value: headerVal, enabled: true });
      }
    } else {
      // Default: Bearer token
      const rawToken = roleConfig.token || roleConfig.tokenEnvVar || '';
      const tokenVal = substituteVariables(rawToken, envVars).trim();
      if (tokenVal) {
        const authValue = tokenVal.toLowerCase().startsWith('bearer ') ? tokenVal : `Bearer ${tokenVal}`;
        cleanHeaders.push({ key: 'Authorization', value: authValue, enabled: true });
      }
    }
  } else if (roleKey === 'anonymous') {
    // Guarantees zero credentials or authorization headers are present
  }

  return {
    method: (baseRequest.method || 'GET').toUpperCase(),
    url: rawUrl,
    params: cleanParams,
    headers: cleanHeaders,
    body: rawBody,
    timeoutMs: baseRequest.timeoutMs || 15000,
    maxResponseBytes: baseRequest.maxResponseBytes || 5 * 1024 * 1024
  };
}

/**
 * Executes the complete Role Testing Matrix for enabled identities.
 *
 * @param {object} matrixPayload
 * @param {object} matrixPayload.baseRequest - Base HTTP request config (url, method, params, headers, body, timeoutMs).
 * @param {object} matrixPayload.roles - Configuration for admin, user, anonymous.
 * @param {Record<string, string>} [matrixPayload.envVariables] - Optional environment variable dictionary.
 * @returns {Promise<object>} Complete matrix evaluation results with redacted credentials.
 */
async function runRoleMatrix(matrixPayload) {
  if (!matrixPayload || typeof matrixPayload !== 'object') {
    throw new TypeError('Role matrix payload must be an object');
  }

  const { baseRequest = {}, roles = {}, envVariables = {} } = matrixPayload;

  const roleDefinitions = [
    { key: 'admin', label: 'ADMIN', config: roles.admin || {} },
    { key: 'user', label: 'USER', config: roles.user || {} },
    { key: 'anonymous', label: 'Anonymous', config: roles.anonymous || {} }
  ];

  const results = {};
  let totalEnabled = 0;
  let passedCount = 0;
  let failedCount = 0;
  let infoCount = 0;
  let errorCount = 0;

  for (const roleDef of roleDefinitions) {
    const { key, label, config } = roleDef;
    const hasExplicitRole = roles && Object.prototype.hasOwnProperty.call(roles, key);
    const isEnabled = hasExplicitRole ? config.enabled !== false : (config.enabled === true);

    if (!isEnabled) {
      results[key] = {
        key,
        label,
        enabled: false,
        status: null,
        durationMs: 0,
        result: 'SKIPPED',
        passed: null,
        message: 'Identity disabled for this run',
        response: null,
        error: null,
        explanation: null
      };
      continue;
    }

    totalEnabled++;

    // Build the isolated request config
    const roleReqConfig = buildRoleRequestConfig(baseRequest, key, config, envVariables);

    // Execute through the real HTTP engine
    let executionResult;
    try {
      executionResult = await executeHttpRequest(roleReqConfig);
    } catch (err) {
      executionResult = {
        success: false,
        error: {
          type: 'EXECUTION_ERROR',
          message: err.message || 'Failed to execute request'
        }
      };
    }

    // Evaluate against expected access rule
    const evaluation = evaluateRoleExpectation(
      config.expectedType || 'none',
      config.expectedStatus,
      executionResult
    );

    if (evaluation.result === 'PASS') passedCount++;
    else if (evaluation.result === 'FAIL') failedCount++;
    else if (evaluation.result === 'ERROR') errorCount++;
    else infoCount++;

    // If HTTP error response received, attach deterministic Spring Error explanation
    let explanation = null;
    let safeResponse = null;

    if (executionResult.success && executionResult.response) {
      const resp = executionResult.response;

      if (resp.status >= 400) {
        try {
          explanation = explainSpringError({
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers,
            body: resp.body,
            url: roleReqConfig.url,
            method: roleReqConfig.method
          });
        } catch {
          explanation = null;
        }
      }

      // Safe response representation with redacted request/response headers
      safeResponse = {
        status: resp.status,
        statusText: resp.statusText,
        durationMs: resp.durationMs,
        sizeBytes: resp.sizeBytes,
        headers: redactHeaders(resp.headers),
        body: resp.body,
        isTruncated: resp.isTruncated
      };
    }

    results[key] = {
      key,
      label,
      enabled: true,
      status: executionResult.success ? executionResult.response.status : null,
      statusText: executionResult.success ? executionResult.response.statusText : null,
      durationMs: executionResult.success
        ? executionResult.response.durationMs
        : (executionResult.error?.durationMs || 0),
      result: evaluation.result,
      passed: evaluation.passed,
      message: evaluation.message,
      expectedType: config.expectedType || 'none',
      expectedStatus: config.expectedStatus ? Number(config.expectedStatus) : null,
      response: safeResponse,
      error: executionResult.success ? null : executionResult.error,
      explanation
    };
  }

  const allPassed = totalEnabled > 0 && failedCount === 0 && errorCount === 0 && passedCount > 0;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total: totalEnabled,
      passed: passedCount,
      failed: failedCount,
      error: errorCount,
      info: infoCount,
      allPassed,
      statusLabel: failedCount > 0
        ? `${failedCount} Failed`
        : errorCount > 0
          ? `${errorCount} Error`
          : passedCount > 0
            ? `${passedCount}/${totalEnabled} Passed`
            : `${infoCount} Completed (No Rules)`
    },
    roles: results
  };
}

module.exports = {
  substituteVariables,
  stripAuthHeaders,
  redactHeaders,
  sanitizeRoleConfigForPersistence,
  evaluateRoleExpectation,
  buildRoleRequestConfig,
  runRoleMatrix
};
