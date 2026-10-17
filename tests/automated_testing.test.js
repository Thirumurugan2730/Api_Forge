/**
 * ApiForge Lite - Spring Edition
 * Step 6 Automated Test Suite: Automated API Testing Engine
 *
 * Verifies all 5 assertion types, multiple assertions, edge cases,
 * and collection persistence:
 *   1. Status code test (pass on match, fail on mismatch, report expected vs actual)
 *   2. Response time test (pass within limit, fail when exceeded)
 *   3. JSON body test (property exists, property equals for strings, numbers, booleans, objects, arrays)
 *   4. JSON body edge cases (missing properties, invalid JSON, empty body)
 *   5. Header test (header exists, header equals, case-insensitivity)
 *   6. Content test (body contains text, case-sensitive vs case-insensitive)
 *   7. Multiple assertions against a single response with summary statistics
 *   8. HTTP 4xx and 5xx responses evaluated as real responses
 *   9. Network failures and timeouts reported cleanly without inventing response values
 *  10. Local atomic persistence of test definitions with saved requests
 *  11. Request duplication preserving test definitions
 */

'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  resolveJsonPath,
  compareJsonValues,
  evaluateAssertion,
  evaluateTests
} = require('../src/main/tests/testEvaluator');

const collectionsStorage = require('../src/main/storage/collectionsStorage');

// Temporary sandbox directory for collections persistence tests
let testDir = null;
let testCollectionsDir = null;

describe('Step 6: Automated API Testing Engine Test Suite', () => {
  before(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiforge-step6-test-'));
    testCollectionsDir = path.join(testDir, 'collections');
    collectionsStorage.initStorage(testCollectionsDir);
  });

  after(() => {
    try {
      if (testDir && fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (_) {}
  });

  // ==========================================================================
  // 1. Status Code Test
  // ==========================================================================
  describe('1. Status Code Assertion', () => {
    it('should PASS when status code matches expected code', () => {
      const test = { type: 'status_code', targetStatusCode: 200 };
      const response = { status: 200, timeMs: 45, headers: {}, body: 'OK' };

      const result = evaluateAssertion(test, response);
      assert.equal(result.pass, true);
      assert.equal(result.type, 'status_code');
      assert.equal(result.expected, '200');
      assert.equal(result.actual, '200');
      assert.ok(result.message.includes('matches expected 200'));
    });

    it('should FAIL when status code does not match expected code', () => {
      const test = { type: 'status_code', targetStatusCode: 200 };
      const response = { status: 404, timeMs: 25, headers: {}, body: 'Not Found' };

      const result = evaluateAssertion(test, response);
      assert.equal(result.pass, false);
      assert.equal(result.expected, '200');
      assert.equal(result.actual, '404');
      assert.ok(result.message.includes('Expected status code 200, but received 404'));
    });

    it('should correctly evaluate non-200 expected status codes (e.g. 201, 204, 400, 500)', () => {
      const test201 = { type: 'status_code', targetStatusCode: 201 };
      const res201 = { status: 201, timeMs: 30, headers: {}, body: '{"id":1}' };
      assert.equal(evaluateAssertion(test201, res201).pass, true);

      const test500 = { type: 'status_code', targetStatusCode: 500 };
      const res500 = { status: 500, timeMs: 15, headers: {}, body: 'Internal Error' };
      assert.equal(evaluateAssertion(test500, res500).pass, true);
    });
  });

  // ==========================================================================
  // 2. Response Time Test
  // ==========================================================================
  describe('2. Response Time Assertion', () => {
    it('should PASS when response time is below maximum duration', () => {
      const test = { type: 'response_time', maxDurationMs: 1000 };
      const response = { status: 200, timeMs: 250, headers: {}, body: 'OK' };

      const result = evaluateAssertion(test, response);
      assert.equal(result.pass, true);
      assert.equal(result.expected, '<= 1000 ms');
      assert.equal(result.actual, '250 ms');
      assert.ok(result.message.includes('within limit'));
    });

    it('should FAIL when response time exceeds maximum duration', () => {
      const test = { type: 'response_time', maxDurationMs: 500 };
      const response = { status: 200, timeMs: 850, headers: {}, body: 'OK' };

      const result = evaluateAssertion(test, response);
      assert.equal(result.pass, false);
      assert.equal(result.expected, '<= 500 ms');
      assert.equal(result.actual, '850 ms');
      assert.ok(result.message.includes('exceeded limit'));
    });
  });

  // ==========================================================================
  // 3. JSON Body Test
  // ==========================================================================
  describe('3. JSON Body Assertion', () => {
    const sampleBody = JSON.stringify({
      status: 'success',
      statusCode: 200,
      active: true,
      meta: null,
      data: {
        user: {
          id: 42,
          username: 'springdev',
          roles: ['USER', 'ADMIN']
        },
        items: [
          { id: 101, name: 'Spring Boot in Action' },
          { id: 102, name: 'Cloud Native Java' }
        ]
      }
    });

    it('should PASS when JSON property exists (checkType: exists)', () => {
      const test = { type: 'json_body', property: '$.status', checkType: 'exists' };
      const res = { status: 200, timeMs: 20, headers: {}, body: sampleBody };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.equal(result.expected, 'Property exists');
      assert.equal(result.actual, '"success"');
    });

    it('should PASS when nested JSON property equals expected string value', () => {
      const test = { type: 'json_body', property: '$.data.user.username', checkType: 'equals', expectedValue: 'springdev' };
      const res = { status: 200, timeMs: 20, headers: {}, body: sampleBody };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.equal(result.actual, '"springdev"');
    });

    it('should PASS when JSON property equals numeric value', () => {
      const test = { type: 'json_body', property: '$.data.user.id', checkType: 'equals', expectedValue: '42' };
      const res = { status: 200, timeMs: 20, headers: {}, body: sampleBody };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.equal(result.actual, '42');
    });

    it('should PASS when JSON property equals boolean value', () => {
      const test = { type: 'json_body', property: '$.active', checkType: 'equals', expectedValue: 'true' };
      const res = { status: 200, timeMs: 20, headers: {}, body: sampleBody };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.equal(result.actual, 'true');
    });

    it('should PASS when indexing into JSON arrays (e.g. $.data.items[1].name)', () => {
      const test = { type: 'json_body', property: '$.data.items[1].name', checkType: 'equals', expectedValue: 'Cloud Native Java' };
      const res = { status: 200, timeMs: 20, headers: {}, body: sampleBody };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.equal(result.actual, '"Cloud Native Java"');
    });

    it('should FAIL when JSON property value does not match expected', () => {
      const test = { type: 'json_body', property: '$.status', checkType: 'equals', expectedValue: 'failed' };
      const res = { status: 200, timeMs: 20, headers: {}, body: sampleBody };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.equal(result.expected, 'failed');
      assert.equal(result.actual, '"success"');
    });

    it('should FAIL cleanly when JSON property does not exist in response', () => {
      const test = { type: 'json_body', property: '$.data.nonExistentKey', checkType: 'exists' };
      const res = { status: 200, timeMs: 20, headers: {}, body: sampleBody };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.equal(result.actual, 'undefined');
      assert.ok(result.message.includes('was not found'));
    });

    it('should FAIL cleanly when response body is not valid JSON without throwing', () => {
      const test = { type: 'json_body', property: '$.status', checkType: 'exists' };
      const res = { status: 200, timeMs: 20, headers: {}, body: '<html><body>502 Bad Gateway</body></html>' };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.ok(result.message.includes('not valid JSON'));
    });

    it('should FAIL cleanly when response body is empty', () => {
      const test = { type: 'json_body', property: '$.status', checkType: 'exists' };
      const res = { status: 204, timeMs: 15, headers: {}, body: '' };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.ok(result.message.includes('empty'));
    });
  });

  // ==========================================================================
  // 4. Header Test
  // ==========================================================================
  describe('4. Header Assertion', () => {
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'x-rate-limit': '100',
      'cache-control': 'no-cache, no-store'
    };

    it('should PASS when header exists (case-insensitive name)', () => {
      const test = { type: 'header', headerName: 'Content-Type', checkType: 'exists' };
      const res = { status: 200, timeMs: 20, headers, body: '{}' };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.ok(result.actual.includes('application/json'));
    });

    it('should PASS when header value matches expected value', () => {
      const test = { type: 'header', headerName: 'x-rate-limit', checkType: 'equals', expectedValue: '100' };
      const res = { status: 200, timeMs: 20, headers, body: '{}' };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.equal(result.actual, '100');
    });

    it('should FAIL when header is missing from response', () => {
      const test = { type: 'header', headerName: 'x-custom-token', checkType: 'exists' };
      const res = { status: 200, timeMs: 20, headers, body: '{}' };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.equal(result.actual, 'Header missing');
      assert.ok(result.message.includes('was not returned'));
    });

    it('should FAIL when header value does not match expected value', () => {
      const test = { type: 'header', headerName: 'x-rate-limit', checkType: 'equals', expectedValue: '500' };
      const res = { status: 200, timeMs: 20, headers, body: '{}' };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.equal(result.expected, '500');
      assert.equal(result.actual, '100');
    });
  });

  // ==========================================================================
  // 5. Content Test
  // ==========================================================================
  describe('5. Body Content Assertion', () => {
    const body = '{"message":"Spring Boot Application Started Successfully","port":8080}';

    it('should PASS when body contains text (case-insensitive by default)', () => {
      const test = { type: 'content', expectedContent: 'started successfully', isCaseSensitive: false };
      const res = { status: 200, timeMs: 20, headers: {}, body };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
      assert.ok(result.message.includes('contains expected text'));
    });

    it('should respect isCaseSensitive flag (PASS on exact case)', () => {
      const test = { type: 'content', expectedContent: 'Spring Boot', isCaseSensitive: true };
      const res = { status: 200, timeMs: 20, headers: {}, body };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, true);
    });

    it('should respect isCaseSensitive flag (FAIL on mismatched case)', () => {
      const test = { type: 'content', expectedContent: 'spring boot', isCaseSensitive: true };
      const res = { status: 200, timeMs: 20, headers: {}, body };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.ok(result.actual.includes('Text not found'));
    });

    it('should FAIL when text is not found anywhere in response body', () => {
      const test = { type: 'content', expectedContent: 'Database Connection Lost' };
      const res = { status: 200, timeMs: 20, headers: {}, body };

      const result = evaluateAssertion(test, res);
      assert.equal(result.pass, false);
      assert.ok(result.message.includes('does not contain'));
    });
  });

  // ==========================================================================
  // 6. Multiple Assertions & Suite Execution
  // ==========================================================================
  describe('6. Suite Execution & Summary Statistics', () => {
    it('should execute multiple assertions and return accurate pass/fail counts', () => {
      const tests = [
        { id: 't1', type: 'status_code', targetStatusCode: 200, enabled: true },
        { id: 't2', type: 'response_time', maxDurationMs: 500, enabled: true },
        { id: 't3', type: 'json_body', property: '$.user', checkType: 'exists', enabled: true },
        { id: 't4', type: 'header', headerName: 'Content-Type', checkType: 'exists', enabled: true },
        { id: 't5', type: 'content', expectedContent: 'Missing Term', enabled: true }, // Will FAIL
        { id: 't6', type: 'status_code', targetStatusCode: 999, enabled: false } // Disabled, skipped
      ];

      const response = {
        status: 200,
        timeMs: 120,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user: 'thiru' })
      };

      const suiteResult = evaluateTests(tests, response);
      assert.equal(suiteResult.total, 5, 'Must evaluate exactly 5 enabled tests');
      assert.equal(suiteResult.passed, 4, '4 tests must pass');
      assert.equal(suiteResult.failed, 1, '1 test must fail');
      assert.equal(suiteResult.allPassed, false);
      assert.equal(suiteResult.results.length, 5);

      // Verify individual result states
      assert.equal(suiteResult.results[0].pass, true); // t1: status 200
      assert.equal(suiteResult.results[1].pass, true); // t2: time 120 <= 500
      assert.equal(suiteResult.results[2].pass, true); // t3: json user exists
      assert.equal(suiteResult.results[3].pass, true); // t4: header Content-Type
      assert.equal(suiteResult.results[4].pass, false); // t5: content missing
    });

    it('should report allPassed === true when all enabled assertions pass', () => {
      const tests = [
        { type: 'status_code', targetStatusCode: 200 },
        { type: 'response_time', maxDurationMs: 1000 }
      ];
      const response = { status: 200, timeMs: 50, headers: {}, body: 'OK' };

      const res = evaluateTests(tests, response);
      assert.equal(res.total, 2);
      assert.equal(res.passed, 2);
      assert.equal(res.failed, 0);
      assert.equal(res.allPassed, true);
    });
  });

  // ==========================================================================
  // 7. Network Failures & Real HTTP 4xx/5xx Responses
  // ==========================================================================
  describe('7. Network Failures vs Real HTTP Error Responses', () => {
    it('should treat HTTP 404 and 500 as real responses and evaluate status assertions normally', () => {
      const tests = [
        { type: 'status_code', targetStatusCode: 404 },
        { type: 'content', expectedContent: 'Resource Not Found' }
      ];
      const res404 = {
        status: 404,
        timeMs: 35,
        headers: { 'content-type': 'text/plain' },
        body: 'Resource Not Found'
      };

      const suiteResult = evaluateTests(tests, res404);
      assert.equal(suiteResult.allPassed, true);
      assert.equal(suiteResult.passed, 2);
    });

    it('should report clean failure without inventing response values when network error occurs', () => {
      const tests = [
        { type: 'status_code', targetStatusCode: 200 },
        { type: 'json_body', property: '$.id', checkType: 'exists' }
      ];
      const networkErrorContext = {
        status: null,
        timeMs: 0,
        headers: {},
        body: '',
        isNetworkError: true,
        errorMessage: 'connect ECONNREFUSED 127.0.0.1:8080'
      };

      const suiteResult = evaluateTests(tests, networkErrorContext);
      assert.equal(suiteResult.total, 2);
      assert.equal(suiteResult.passed, 0);
      assert.equal(suiteResult.failed, 2);
      assert.equal(suiteResult.allPassed, false);

      for (const r of suiteResult.results) {
        assert.equal(r.pass, false);
        assert.ok(r.message.includes('Test could not evaluate'));
        assert.ok(r.message.includes('ECONNREFUSED'));
        assert.equal(r.actual, 'No HTTP response (Network failure)');
      }
    });
  });

  // ==========================================================================
  // 8. Collections Persistence Integration
  // ==========================================================================
  describe('8. Saving and Loading Tests with Collections', () => {
    it('should persist test definitions with saved requests and reload them intact', () => {
      const col = collectionsStorage.createCollection('Test Suite APIs');
      const testDefs = [
        { id: 't_status', type: 'status_code', targetStatusCode: 200, enabled: true },
        { id: 't_time', type: 'response_time', maxDurationMs: 1500, enabled: true },
        { id: 't_json', type: 'json_body', property: '$.success', checkType: 'equals', expectedValue: 'true', enabled: true }
      ];

      const savedReq = collectionsStorage.saveRequest(col.id, null, {
        name: 'Get User Profile',
        method: 'GET',
        url: 'http://localhost:8080/api/profile',
        params: [{ key: 'id', value: '1', enabled: true }],
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: '',
        tests: testDefs
      });

      assert.ok(savedReq.id);
      assert.equal(savedReq.tests.length, 3);
      assert.equal(savedReq.tests[0].id, 't_status');
      assert.equal(savedReq.tests[1].maxDurationMs, 1500);

      // Re-read directly from disk via getRequest
      const reloadedReq = collectionsStorage.getRequest(col.id, savedReq.id);
      assert.equal(reloadedReq.name, 'Get User Profile');
      assert.equal(reloadedReq.tests.length, 3);
      assert.deepEqual(reloadedReq.tests, testDefs);
    });

    it('should preserve test definitions when duplicating a request', () => {
      const col = collectionsStorage.createCollection('Duplicate Test Col');
      const testDefs = [
        { id: 't1', type: 'status_code', targetStatusCode: 201, enabled: true },
        { id: 't2', type: 'content', expectedContent: 'Created', enabled: true }
      ];

      const orig = collectionsStorage.saveRequest(col.id, null, {
        name: 'Create Order',
        method: 'POST',
        url: 'http://localhost:8080/api/orders',
        tests: testDefs
      });

      const dup = collectionsStorage.duplicateRequest(col.id, orig.id);
      assert.ok(dup.name.includes('(Copy)'));
      assert.equal(dup.tests.length, 2);
      assert.deepEqual(dup.tests, testDefs);
    });

    it('should gracefully handle existing requests without tests field (backward-compatibility)', () => {
      const col = collectionsStorage.createCollection('Legacy Col');
      // Request saved without tests field
      const legacy = collectionsStorage.saveRequest(col.id, null, {
        name: 'Legacy Request',
        method: 'GET',
        url: 'http://localhost:8080/legacy'
      });

      assert.deepEqual(legacy.tests, []);
      const retrieved = collectionsStorage.getRequest(col.id, legacy.id);
      assert.deepEqual(retrieved.tests, []);
    });
  });
});
