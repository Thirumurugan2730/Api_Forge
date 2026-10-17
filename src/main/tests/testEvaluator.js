/**
 * ApiForge Lite - Spring Edition
 * Automated API Testing Engine (Step 6)
 *
 * Implements the 5 core assertion types:
 *   1. status_code   - Checks response status code equals target code
 *   2. response_time - Checks response duration is below maximum duration (ms)
 *   3. json_body     - Checks JSON property exists or equals expected value
 *   4. header        - Checks header exists or equals expected value (case-insensitive)
 *   5. content       - Checks response body contains text (case-sensitive or insensitive)
 *
 * Security & Reliability:
 *   - Pure functional evaluation: zero arbitrary script evaluation (eval/Function blocked).
 *   - Safe JSONPath resolver for dot notation and array indexing ($.data.user.id, items[0]).
 *   - Gracefully handles malformed JSON, empty response bodies, missing headers, and network failures.
 *   - Never invents response values when network error occurs.
 */

'use strict';

// ============================================================================
// Safe JSONPath & Property Resolver
// ============================================================================

/**
 * Safely resolves a property path against an object or array.
 * Supports:
 *   - $.data.user.id
 *   - data.user.id
 *   - $.items[0].name
 *   - items[0]
 *   - status
 *
 * @param {any} obj - Root JSON object
 * @param {string} jsonPath - Property path string
 * @returns {any} Resolved value, or undefined if not found
 */
function resolveJsonPath(obj, jsonPath) {
  if (obj === null || obj === undefined || typeof jsonPath !== 'string') {
    return undefined;
  }

  let cleanPath = jsonPath.trim();
  if (cleanPath.startsWith('$.')) {
    cleanPath = cleanPath.slice(2);
  } else if (cleanPath === '$') {
    return obj;
  }

  if (!cleanPath) return obj;

  // Convert array bracket access to dot notation: items[0] -> items.0
  cleanPath = cleanPath.replace(/\[(\d+)\]/g, '.$1');

  const parts = cleanPath.split('.').filter(Boolean);
  let curr = obj;

  for (const part of parts) {
    if (curr === null || curr === undefined || typeof curr !== 'object') {
      return undefined;
    }
    curr = curr[part];
  }

  return curr;
}

/**
 * Compares an actual resolved JSON value with an expected value string.
 * Supports numbers, booleans, strings, null, and JSON objects/arrays.
 *
 * @param {any} actual
 * @param {string} expectedStr
 * @returns {boolean}
 */
function compareJsonValues(actual, expectedStr) {
  if (actual === undefined) return false;
  const expTrim = typeof expectedStr === 'string' ? expectedStr.trim() : String(expectedStr || '');

  // 1. Null check
  if (actual === null) {
    return expTrim.toLowerCase() === 'null';
  }

  // 2. Boolean check
  if (typeof actual === 'boolean') {
    return String(actual) === expTrim.toLowerCase();
  }

  // 3. Number check
  if (typeof actual === 'number') {
    const num = Number(expTrim);
    if (!isNaN(num)) {
      return actual === num;
    }
    return String(actual) === expTrim;
  }

  // 4. String check
  if (typeof actual === 'string') {
    // If expected is enclosed in quotes (e.g. "success"), compare unquoted or raw
    if ((expTrim.startsWith('"') && expTrim.endsWith('"')) || (expTrim.startsWith("'") && expTrim.endsWith("'"))) {
      return actual === expTrim.slice(1, -1) || actual === expTrim;
    }
    return actual === expTrim;
  }

  // 5. Object / Array check
  if (typeof actual === 'object') {
    try {
      const parsedExp = JSON.parse(expTrim);
      return JSON.stringify(actual) === JSON.stringify(parsedExp);
    } catch (_) {
      return JSON.stringify(actual) === expTrim;
    }
  }

  return String(actual) === expTrim;
}

// ============================================================================
// Single Assertion Evaluator
// ============================================================================

/**
 * Evaluates a single test assertion against an HTTP response context.
 *
 * @param {object} test - Test definition
 * @param {object} response - Response context: { status, timeMs, headers, body, isNetworkError, errorMessage }
 * @returns {{ pass: boolean, id: string, type: string, description: string, message: string, expected: string, actual: string }}
 */
function evaluateAssertion(test, response) {
  const id = test.id || `test_${Math.random().toString(36).slice(2, 8)}`;
  const type = test.type || 'status_code';
  const hasResponse = Boolean(response && !response.isNetworkError && typeof response.status === 'number');

  // Network error guard: if request failed before HTTP response
  if (!hasResponse) {
    const errText = response?.errorMessage || 'No HTTP response received';
    return {
      id,
      type,
      pass: false,
      description: getTestDescription(test),
      message: `Test could not evaluate: ${errText}`,
      expected: getExpectedSummary(test),
      actual: 'No HTTP response (Network failure)'
    };
  }

  switch (type) {
    // ------------------------------------------------------------------------
    // 1. Status Code Test
    // ------------------------------------------------------------------------
    case 'status_code': {
      const targetCode = parseInt(test.targetStatusCode, 10);
      const desc = `Status code equals ${isNaN(targetCode) ? test.targetStatusCode : targetCode}`;
      if (isNaN(targetCode)) {
        return {
          id,
          type,
          pass: false,
          description: desc,
          message: `Invalid target status code: "${test.targetStatusCode}"`,
          expected: 'Valid HTTP status code (e.g. 200)',
          actual: String(test.targetStatusCode)
        };
      }

      const pass = response.status === targetCode;
      return {
        id,
        type,
        pass,
        description: desc,
        message: pass
          ? `Status code is ${response.status} (matches expected ${targetCode})`
          : `Expected status code ${targetCode}, but received ${response.status}`,
        expected: String(targetCode),
        actual: String(response.status)
      };
    }

    // ------------------------------------------------------------------------
    // 2. Response Time Test
    // ------------------------------------------------------------------------
    case 'response_time': {
      const maxMs = parseInt(test.maxDurationMs, 10);
      const desc = `Response time below ${isNaN(maxMs) ? test.maxDurationMs : maxMs} ms`;
      if (isNaN(maxMs) || maxMs <= 0) {
        return {
          id,
          type,
          pass: false,
          description: desc,
          message: `Invalid max duration: "${test.maxDurationMs}"`,
          expected: 'Positive integer in milliseconds',
          actual: String(test.maxDurationMs)
        };
      }

      const actualDuration = typeof response.timeMs === 'number' ? response.timeMs : 0;
      const pass = actualDuration <= maxMs;
      return {
        id,
        type,
        pass,
        description: desc,
        message: pass
          ? `Response time of ${actualDuration} ms is within limit (${maxMs} ms)`
          : `Response time of ${actualDuration} ms exceeded limit of ${maxMs} ms`,
        expected: `<= ${maxMs} ms`,
        actual: `${actualDuration} ms`
      };
    }

    // ------------------------------------------------------------------------
    // 3. JSON Body Test
    // ------------------------------------------------------------------------
    case 'json_body': {
      const property = typeof test.property === 'string' ? test.property.trim() : '';
      const checkType = test.checkType === 'exists' ? 'exists' : 'equals';
      const expectedValue = test.expectedValue !== undefined ? String(test.expectedValue) : '';

      const desc = checkType === 'exists'
        ? `JSON property "${property}" exists`
        : `JSON property "${property}" equals "${expectedValue}"`;

      if (!property) {
        return {
          id,
          type,
          pass: false,
          description: desc,
          message: 'JSON property path cannot be empty',
          expected: 'Property path (e.g. $.status or data.id)',
          actual: 'Empty property path'
        };
      }

      // Parse response body as JSON
      let parsedJson = null;
      try {
        const bodyStr = typeof response.body === 'string' ? response.body.trim() : '';
        if (!bodyStr) {
          return {
            id,
            type,
            pass: false,
            description: desc,
            message: 'Response body is empty; cannot evaluate JSON property',
            expected: checkType === 'exists' ? 'JSON property exists' : expectedValue,
            actual: 'Empty response body'
          };
        }
        parsedJson = JSON.parse(bodyStr);
      } catch (err) {
        return {
          id,
          type,
          pass: false,
          description: desc,
          message: `Response body is not valid JSON (${err.message})`,
          expected: 'Valid JSON response body',
          actual: 'Malformed or non-JSON body'
        };
      }

      const resolved = resolveJsonPath(parsedJson, property);

      if (checkType === 'exists') {
        const pass = resolved !== undefined;
        return {
          id,
          type,
          pass,
          description: desc,
          message: pass
            ? `JSON property "${property}" exists (value: ${JSON.stringify(resolved)})`
            : `JSON property "${property}" was not found in response`,
          expected: 'Property exists',
          actual: pass ? JSON.stringify(resolved) : 'undefined'
        };
      } else {
        // checkType === 'equals'
        if (resolved === undefined) {
          return {
            id,
            type,
            pass: false,
            description: desc,
            message: `JSON property "${property}" was not found (expected "${expectedValue}")`,
            expected: expectedValue,
            actual: 'undefined'
          };
        }

        const pass = compareJsonValues(resolved, expectedValue);
        return {
          id,
          type,
          pass,
          description: desc,
          message: pass
            ? `JSON property "${property}" equals ${JSON.stringify(resolved)}`
            : `JSON property "${property}" expected ${JSON.stringify(expectedValue)}, but received ${JSON.stringify(resolved)}`,
          expected: expectedValue,
          actual: JSON.stringify(resolved)
        };
      }
    }

    // ------------------------------------------------------------------------
    // 4. Header Test
    // ------------------------------------------------------------------------
    case 'header': {
      const headerName = typeof test.headerName === 'string' ? test.headerName.trim() : '';
      const checkType = test.checkType === 'equals' ? 'equals' : 'exists';
      const expectedValue = test.expectedValue !== undefined ? String(test.expectedValue) : '';

      const desc = checkType === 'exists'
        ? `Header "${headerName}" exists`
        : `Header "${headerName}" equals "${expectedValue}"`;

      if (!headerName) {
        return {
          id,
          type,
          pass: false,
          description: desc,
          message: 'Header name cannot be empty',
          expected: 'Header name (e.g. content-type)',
          actual: 'Empty header name'
        };
      }

      // Case-insensitive header lookup
      const headers = response.headers || {};
      const foundKey = Object.keys(headers).find(k => k.toLowerCase() === headerName.toLowerCase());
      const actualVal = foundKey !== undefined ? String(headers[foundKey]) : undefined;

      if (actualVal === undefined) {
        return {
          id,
          type,
          pass: false,
          description: desc,
          message: `Header "${headerName}" was not returned in response`,
          expected: checkType === 'exists' ? 'Header exists' : expectedValue,
          actual: 'Header missing'
        };
      }

      if (checkType === 'exists') {
        return {
          id,
          type,
          pass: true,
          description: desc,
          message: `Header "${headerName}" exists with value "${actualVal}"`,
          expected: 'Header exists',
          actual: actualVal
        };
      } else {
        // checkType === 'equals' (case-insensitive for MIME/standard headers, exact if case matches)
        const match = actualVal.toLowerCase().trim() === expectedValue.toLowerCase().trim() ||
                      actualVal.includes(expectedValue);
        return {
          id,
          type,
          pass: match,
          description: desc,
          message: match
            ? `Header "${headerName}" matches expected value "${expectedValue}"`
            : `Header "${headerName}" expected "${expectedValue}", but received "${actualVal}"`,
          expected: expectedValue,
          actual: actualVal
        };
      }
    }

    // ------------------------------------------------------------------------
    // 5. Content Test
    // ------------------------------------------------------------------------
    case 'content': {
      const expectedContent = typeof test.expectedContent === 'string' ? test.expectedContent : '';
      const isCaseSensitive = Boolean(test.isCaseSensitive);

      const desc = `Response body contains "${expectedContent}"${isCaseSensitive ? ' (case-sensitive)' : ''}`;

      if (!expectedContent) {
        return {
          id,
          type,
          pass: true,
          description: desc,
          message: 'Empty content filter matches all responses',
          expected: 'Any content',
          actual: 'Empty search term'
        };
      }

      const bodyStr = typeof response.body === 'string' ? response.body : '';
      const pass = isCaseSensitive
        ? bodyStr.includes(expectedContent)
        : bodyStr.toLowerCase().includes(expectedContent.toLowerCase());

      return {
        id,
        type,
        pass,
        description: desc,
        message: pass
          ? `Response body contains expected text "${expectedContent}"`
          : `Response body does not contain expected text "${expectedContent}"`,
        expected: `Contains "${expectedContent}"`,
        actual: pass ? 'Text found in body' : `Text not found (${bodyStr.length} bytes inspected)`
      };
    }

    default: {
      return {
        id,
        type,
        pass: false,
        description: `Unknown test type "${type}"`,
        message: `Unsupported assertion type: "${type}"`,
        expected: 'Valid test type (status_code, response_time, json_body, header, content)',
        actual: type
      };
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getTestDescription(test) {
  switch (test.type) {
    case 'status_code':
      return `Status code equals ${test.targetStatusCode || 200}`;
    case 'response_time':
      return `Response time below ${test.maxDurationMs || 1000} ms`;
    case 'json_body':
      return test.checkType === 'exists'
        ? `JSON property "${test.property}" exists`
        : `JSON property "${test.property}" equals "${test.expectedValue}"`;
    case 'header':
      return test.checkType === 'exists'
        ? `Header "${test.headerName}" exists`
        : `Header "${test.headerName}" equals "${test.expectedValue}"`;
    case 'content':
      return `Response body contains "${test.expectedContent}"`;
    default:
      return 'Test assertion';
  }
}

function getExpectedSummary(test) {
  switch (test.type) {
    case 'status_code':
      return String(test.targetStatusCode || 200);
    case 'response_time':
      return `<= ${test.maxDurationMs || 1000} ms`;
    case 'json_body':
      return test.checkType === 'exists' ? 'Property exists' : String(test.expectedValue || '');
    case 'header':
      return test.checkType === 'exists' ? 'Header exists' : String(test.expectedValue || '');
    case 'content':
      return `Contains "${test.expectedContent || ''}"`;
    default:
      return '';
  }
}

// ============================================================================
// Suite Evaluator
// ============================================================================

/**
 * Evaluates a list of test definitions against a response context.
 *
 * @param {Array<object>} tests - List of test definitions
 * @param {object} response - Response context
 * @returns {{ total: number, passed: number, failed: number, allPassed: boolean, results: Array<object> }}
 */
function evaluateTests(tests, response) {
  if (!Array.isArray(tests)) {
    return { total: 0, passed: 0, failed: 0, allPassed: false, results: [] };
  }

  // Only evaluate enabled tests (default to enabled: true)
  const activeTests = tests.filter(t => t && t.enabled !== false);
  const results = activeTests.map(t => evaluateAssertion(t, response));

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  const allPassed = total > 0 && passed === total;

  return {
    total,
    passed,
    failed,
    allPassed,
    results
  };
}

module.exports = {
  resolveJsonPath,
  compareJsonValues,
  evaluateAssertion,
  evaluateTests
};
