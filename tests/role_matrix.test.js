/**
 * ApiForge Lite — Spring Edition
 * Step 9: Spring Security Role Testing Matrix Unit & Integration Test Suite
 *
 * Verifies:
 *   1. Isolated credential management (ADMIN, USER, Anonymous)
 *   2. Variable substitution and header stripping
 *   3. Expected access rules evaluation (exact, 2xx, 401/403 denial, none)
 *   4. Sensitive token redaction and persistence safety
 *   5. Spring Error Explainer integration on 4xx/5xx responses
 *   6. Multi-identity execution with a local mock HTTP server
 *   7. Network errors and timeout handling
 */

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const {
  substituteVariables,
  stripAuthHeaders,
  redactHeaders,
  sanitizeRoleConfigForPersistence,
  evaluateRoleExpectation,
  buildRoleRequestConfig,
  runRoleMatrix
} = require('../src/main/roles/roleMatrixRunner');

describe('Step 9: Spring Security Role Testing Matrix Suite', () => {

  // =========================================================================
  // 1. Variable Substitution & Credential Stripping
  // =========================================================================
  describe('1. Variable Substitution & Isolation Helpers', () => {
    test('substituteVariables replaces {{var}} placeholders from envVars or process.env', () => {
      const template = 'http://{{host}}:{{port}}/api/users?key={{apiKey}}';
      const envVars = { host: 'localhost', port: '8080', apiKey: 'secret-key-123' };
      const result = substituteVariables(template, envVars);
      assert.equal(result, 'http://localhost:8080/api/users?key:secret-key-123'.replace('key:', 'key='));
    });

    test('stripAuthHeaders removes Authorization, Cookie, and sensitive auth headers', () => {
      const headers = [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Authorization', value: 'Bearer inherited-admin-token', enabled: true },
        { key: 'Cookie', value: 'JSESSIONID=12345', enabled: true },
        { key: 'Proxy-Authorization', value: 'Basic abc', enabled: true },
        { key: 'X-Custom-Header', value: 'custom-val', enabled: true }
      ];

      const clean = stripAuthHeaders(headers);
      assert.equal(clean.length, 2);
      assert.deepEqual(clean.map(h => h.key), ['Content-Type', 'X-Custom-Header']);
      assert.ok(!clean.some(h => h.key.toLowerCase().includes('auth') || h.key.toLowerCase().includes('cookie')));
    });

    test('redactHeaders masks sensitive values with ***', () => {
      const headers = [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer sensitive-token-secret' },
        { key: 'Cookie', value: 'session=xyz' }
      ];

      const redacted = redactHeaders(headers);
      const auth = redacted.find(h => h.key === 'Authorization');
      assert.ok(auth.value.includes('***'));
      assert.ok(!auth.value.includes('sensitive-token-secret'));
    });
  });

  // =========================================================================
  // 2. Safe Persistence and Token Sanitization
  // =========================================================================
  describe('2. Safe Persistence & Token Sanitization', () => {
    test('sanitizeRoleConfigForPersistence completely strips raw tokens and raw custom header values', () => {
      const rawConfig = {
        admin: {
          enabled: true,
          token: 'super-secret-admin-jwt-token-999',
          authType: 'bearer',
          expectedType: 'exact',
          expectedStatus: 200
        },
        user: {
          enabled: true,
          token: 'secret-user-token-111',
          authType: 'bearer',
          expectedType: 'denied',
          expectedStatus: 403
        },
        anonymous: {
          enabled: true,
          expectedType: 'exact',
          expectedStatus: 401
        }
      };

      const sanitized = sanitizeRoleConfigForPersistence(rawConfig);

      // Raw tokens must NEVER be preserved
      assert.equal(sanitized.admin.token, undefined);
      assert.equal(sanitized.user.token, undefined);

      // Expectations and enabled flags must remain intact
      assert.equal(sanitized.admin.enabled, true);
      assert.equal(sanitized.admin.expectedStatus, 200);
      assert.equal(sanitized.user.expectedType, 'denied');
      assert.equal(sanitized.anonymous.expectedStatus, 401);
    });

    test('sanitizeRoleConfigForPersistence preserves {{ENV_VAR}} references safely', () => {
      const configWithEnv = {
        admin: {
          enabled: true,
          token: '{{ADMIN_JWT_TOKEN}}',
          authType: 'bearer',
          expectedType: '2xx'
        },
        user: {
          enabled: false,
          tokenEnvVar: '{{USER_TOKEN}}',
          authType: 'bearer',
          expectedType: 'denied'
        }
      };

      const sanitized = sanitizeRoleConfigForPersistence(configWithEnv);
      assert.equal(sanitized.admin.tokenEnvVar, '{{ADMIN_JWT_TOKEN}}');
      assert.equal(sanitized.user.tokenEnvVar, '{{USER_TOKEN}}');
      assert.equal(sanitized.admin.token, undefined);
    });
  });

  // =========================================================================
  // 3. Expected Access Rules Evaluation
  // =========================================================================
  describe('3. Expected Access Rules Evaluation', () => {
    test('exact expectation: PASS when matching, FAIL when differing', () => {
      const matchResp = { success: true, response: { status: 200, statusText: 'OK' } };
      const diffResp = { success: true, response: { status: 403, statusText: 'Forbidden' } };

      const passEval = evaluateRoleExpectation('exact', 200, matchResp);
      assert.equal(passEval.result, 'PASS');
      assert.equal(passEval.passed, true);

      const failEval = evaluateRoleExpectation('exact', 200, diffResp);
      assert.equal(failEval.result, 'FAIL');
      assert.equal(failEval.passed, false);
      assert.ok(failEval.message.includes('Expected status 200, but received 403'));
    });

    test('2xx success expectation: PASS for 200, 201, 204; FAIL for 401, 403, 500', () => {
      const resp201 = { success: true, response: { status: 201 } };
      const resp403 = { success: true, response: { status: 403 } };

      const pass = evaluateRoleExpectation('2xx', null, resp201);
      assert.equal(pass.result, 'PASS');

      const fail = evaluateRoleExpectation('2xx', null, resp403);
      assert.equal(fail.result, 'FAIL');
    });

    test('denied (401/403) expectation: PASS for 401 and 403; FAIL for 200', () => {
      const resp401 = { success: true, response: { status: 401 } };
      const resp403 = { success: true, response: { status: 403 } };
      const resp200 = { success: true, response: { status: 200 } };

      assert.equal(evaluateRoleExpectation('denied', null, resp401).result, 'PASS');
      assert.equal(evaluateRoleExpectation('denied', null, resp403).result, 'PASS');
      assert.equal(evaluateRoleExpectation('denied', null, resp200).result, 'FAIL');
    });

    test('none expectation: returns INFO with passed: null without assuming policy', () => {
      const resp200 = { success: true, response: { status: 200 } };
      const info = evaluateRoleExpectation('none', null, resp200);
      assert.equal(info.result, 'INFO');
      assert.equal(info.passed, null);
    });

    test('network execution failure returns ERROR with passed: false', () => {
      const errResult = {
        success: false,
        error: { message: 'connect ECONNREFUSED 127.0.0.1:9999' }
      };

      const evalResult = evaluateRoleExpectation('2xx', null, errResult);
      assert.equal(evalResult.result, 'ERROR');
      assert.equal(evalResult.passed, false);
      assert.ok(evalResult.message.includes('ECONNREFUSED'));
    });
  });

  // =========================================================================
  // 4. Request Configuration Builder & Identity Isolation
  // =========================================================================
  describe('4. Request Configuration Builder & Identity Isolation', () => {
    const baseRequest = {
      method: 'POST',
      url: 'http://localhost:8080/api/items?env={{ENV}}',
      params: [{ key: 'limit', value: '10', enabled: true }],
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Authorization', value: 'Bearer inherited-base-token', enabled: true }
      ],
      body: '{"action":"test"}',
      timeoutMs: 8000
    };

    const envVars = { ENV: 'dev', ADMIN_KEY: 'admin-123', USER_KEY: 'user-456' };

    test('ADMIN request config injects Admin Bearer token and strips base Authorization header', () => {
      const adminConfig = {
        token: '{{ADMIN_KEY}}',
        authType: 'bearer'
      };

      const req = buildRoleRequestConfig(baseRequest, 'admin', adminConfig, envVars);
      assert.equal(req.url, 'http://localhost:8080/api/items?env=dev');
      assert.equal(req.method, 'POST');

      const authHeader = req.headers.find(h => h.key === 'Authorization');
      assert.ok(authHeader);
      assert.equal(authHeader.value, 'Bearer admin-123');
      // Verify inherited base token was completely replaced
      assert.ok(!req.headers.some(h => h.value.includes('inherited-base-token')));
    });

    test('USER request config uses separate User token and does not leak Admin token', () => {
      const userConfig = {
        token: '{{USER_KEY}}',
        authType: 'bearer'
      };

      const req = buildRoleRequestConfig(baseRequest, 'user', userConfig, envVars);
      const authHeader = req.headers.find(h => h.key === 'Authorization');
      assert.equal(authHeader.value, 'Bearer user-456');
      assert.ok(!authHeader.value.includes('admin-123'));
    });

    test('Anonymous request config contains ZERO authentication credentials', () => {
      const req = buildRoleRequestConfig(baseRequest, 'anonymous', {}, envVars);
      const authHeader = req.headers.find(h => h.key.toLowerCase().includes('auth') || h.key.toLowerCase().includes('cookie'));
      assert.equal(authHeader, undefined);
      // Non-auth headers must remain intact
      const ctHeader = req.headers.find(h => h.key === 'Content-Type');
      assert.ok(ctHeader);
      assert.equal(ctHeader.value, 'application/json');
    });
  });

  // =========================================================================
  // 5. Local Mock Server Execution Matrix
  // =========================================================================
  describe('5. Real HTTP Role Matrix Execution with Local Server', () => {
    let server;
    let serverUrl;
    const receivedAuthHeaders = [];

    before(async () => {
      server = http.createServer((req, res) => {
        const auth = req.headers['authorization'] || null;
        receivedAuthHeaders.push({ path: req.url, auth });

        if (req.url.startsWith('/api/secure')) {
          if (auth === 'Bearer admin-secret-key') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', role: 'ADMIN', message: 'Admin access granted' }));
          } else if (auth === 'Bearer user-secret-key') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              timestamp: '2026-10-17T00:00:00Z',
              status: 403,
              error: 'Forbidden',
              message: 'Access Denied: Requires ROLE_ADMIN authority',
              path: '/api/secure'
            }));
          } else {
            // Anonymous or missing/invalid token
            res.writeHead(401, {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer error="invalid_token"'
            });
            res.end(JSON.stringify({
              timestamp: '2026-10-17T00:00:00Z',
              status: 401,
              error: 'Unauthorized',
              message: 'Full authentication is required to access this resource',
              path: '/api/secure'
            }));
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 404, error: 'Not Found' }));
        }
      });

      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
    });

    after(async () => {
      if (server) {
        await new Promise(resolve => server.close(resolve));
      }
    });

    test('runRoleMatrix executes all 3 identities and verifies expected access rules', async () => {
      const matrixPayload = {
        baseRequest: {
          url: `${serverUrl}/api/secure`,
          method: 'GET',
          headers: [{ key: 'Accept', value: 'application/json', enabled: true }]
        },
        roles: {
          admin: {
            enabled: true,
            authType: 'bearer',
            token: 'admin-secret-key',
            expectedType: 'exact',
            expectedStatus: 200
          },
          user: {
            enabled: true,
            authType: 'bearer',
            token: 'user-secret-key',
            expectedType: 'denied',
            expectedStatus: 403
          },
          anonymous: {
            enabled: true,
            expectedType: 'exact',
            expectedStatus: 401
          }
        }
      };

      const result = await runRoleMatrix(matrixPayload);

      assert.equal(result.success, true);
      assert.equal(result.summary.total, 3);
      assert.equal(result.summary.passed, 3);
      assert.equal(result.summary.failed, 0);
      assert.equal(result.summary.allPassed, true);

      // Verify ADMIN results
      const adminRes = result.roles.admin;
      assert.equal(adminRes.status, 200);
      assert.equal(adminRes.result, 'PASS');
      assert.equal(adminRes.passed, true);

      // Verify USER results & Spring Error Explainer attachment
      const userRes = result.roles.user;
      assert.equal(userRes.status, 403);
      assert.equal(userRes.result, 'PASS');
      assert.equal(userRes.passed, true);
      assert.ok(userRes.explanation, 'USER 403 should have Spring Error Explanation attached');
      assert.ok(userRes.explanation.title.includes('Forbidden'));

      // Verify Anonymous results
      const anonRes = result.roles.anonymous;
      assert.equal(anonRes.status, 401);
      assert.equal(anonRes.result, 'PASS');
      assert.equal(anonRes.passed, true);
      assert.ok(anonRes.explanation, 'Anonymous 401 should have Spring Error Explanation attached');

      // Verify credential redaction: no raw secret tokens in returned results
      const jsonStr = JSON.stringify(result);
      assert.ok(!jsonStr.includes('admin-secret-key'), 'Admin secret token must not leak into results');
      assert.ok(!jsonStr.includes('user-secret-key'), 'User secret token must not leak into results');
    });

    test('runRoleMatrix supports disabling individual identities', async () => {
      const matrixPayload = {
        baseRequest: {
          url: `${serverUrl}/api/secure`,
          method: 'GET'
        },
        roles: {
          admin: {
            enabled: true,
            authType: 'bearer',
            token: 'admin-secret-key',
            expectedType: '2xx'
          },
          user: {
            enabled: false
          },
          anonymous: {
            enabled: true,
            expectedType: 'denied'
          }
        }
      };

      const result = await runRoleMatrix(matrixPayload);
      assert.equal(result.summary.total, 2);
      assert.equal(result.summary.passed, 2);
      assert.equal(result.roles.user.enabled, false);
      assert.equal(result.roles.user.result, 'SKIPPED');
    });

    test('runRoleMatrix flags expectation mismatches with FAIL and summary count', async () => {
      const matrixPayload = {
        baseRequest: {
          url: `${serverUrl}/api/secure`,
          method: 'GET'
        },
        roles: {
          admin: {
            enabled: true,
            token: 'admin-secret-key',
            expectedType: 'denied', // Mismatch! ADMIN returns 200, not 401/403
            expectedStatus: 403
          },
          anonymous: {
            enabled: true,
            expectedType: 'exact',
            expectedStatus: 200 // Mismatch! Anonymous returns 401, not 200
          }
        }
      };

      const result = await runRoleMatrix(matrixPayload);
      assert.equal(result.summary.total, 2);
      assert.equal(result.summary.failed, 2);
      assert.equal(result.summary.passed, 0);
      assert.equal(result.summary.allPassed, false);
      assert.equal(result.roles.admin.result, 'FAIL');
      assert.equal(result.roles.anonymous.result, 'FAIL');
    });

    test('runRoleMatrix handles unreachable port / connection error cleanly', async () => {
      const matrixPayload = {
        baseRequest: {
          url: 'http://127.0.0.1:59999/api/unreachable',
          method: 'GET',
          timeoutMs: 1000
        },
        roles: {
          anonymous: {
            enabled: true,
            expectedType: 'exact',
            expectedStatus: 401
          }
        }
      };

      const result = await runRoleMatrix(matrixPayload);
      assert.equal(result.roles.anonymous.result, 'ERROR');
      assert.equal(result.roles.anonymous.passed, false);
      assert.ok(result.roles.anonymous.error !== null);
    });

    test('ADMIN and USER custom header authentication type', () => {
      const customConfig = {
        authType: 'header',
        customHeaderKey: 'X-API-Key',
        customHeaderValue: 'custom-api-key-value'
      };
      const req = buildRoleRequestConfig({ method: 'GET', url: 'http://test' }, 'admin', customConfig, {});
      const xKey = req.headers.find(h => h.key === 'X-API-Key');
      assert.ok(xKey);
      assert.equal(xKey.value, 'custom-api-key-value');
      assert.equal(req.headers.find(h => h.key === 'Authorization'), undefined);
    });

    test('Anonymous request strips JSESSIONID, Cookie, and Authorization from base request', () => {
      const complexBase = {
        method: 'GET',
        url: 'http://test/api',
        headers: [
          { key: 'Cookie', value: 'JSESSIONID=sec123; remember-me=true' },
          { key: 'Authorization', value: 'Basic admin:secret' },
          { key: 'X-Auth-Token', value: 'token-abc' },
          { key: 'Accept', value: 'application/json' }
        ]
      };
      const req = buildRoleRequestConfig(complexBase, 'anonymous', {}, {});
      assert.equal(req.headers.length, 1);
      assert.equal(req.headers[0].key, 'Accept');
    });

    test('runRoleMatrix handles timeout properly', async () => {
      const hangServer = http.createServer((req, res) => {
        // do not respond
      });
      await new Promise(r => hangServer.listen(0, '127.0.0.1', r));
      const port = hangServer.address().port;
      try {
        const matrixPayload = {
          baseRequest: {
            url: "http://127.0.0.1:" + port + "/api/hang",
            method: 'GET',
            timeoutMs: 150
          },
          roles: {
            anonymous: { enabled: true, expectedType: 'exact', expectedStatus: 401 }
          }
        };
        const result = await runRoleMatrix(matrixPayload);
        assert.equal(result.roles.anonymous.result, 'ERROR');
        assert.equal(result.roles.anonymous.passed, false);
      } finally {
        await new Promise(r => hangServer.close(r));
      }
    });
  });
});
