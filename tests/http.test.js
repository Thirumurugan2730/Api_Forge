/**
 * ApiForge Lite — Step 2 HTTP Engine & Request Builder Automated Test Suite
 * Executed via Node.js built-in test runner (node --test)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const {
  SUPPORTED_METHODS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RESPONSE_BYTES,
  validateRequestConfig,
  buildEffectiveUrl,
  executeHttpRequest,
  cancelHttpRequest
} = require('../src/main/http/httpClient');

const PRELOAD_PATH = path.resolve(__dirname, '../src/preload/preload.js');

// ============================================================================
// PART 1: Request Validation Tests
// ============================================================================

describe('1. HTTP Request Configuration Validation', () => {
  it('should accept valid HTTP and HTTPS URLs', () => {
    const httpConfig = validateRequestConfig({ method: 'GET', url: 'http://localhost:8080/api/users' });
    assert.equal(httpConfig.url, 'http://localhost:8080/api/users');

    const httpsConfig = validateRequestConfig({ method: 'POST', url: 'https://api.example.com/v1/auth' });
    assert.equal(httpsConfig.url, 'https://api.example.com/v1/auth');
  });

  it('should reject invalid or missing URLs', () => {
    assert.throws(() => validateRequestConfig({ method: 'GET', url: '' }), /A valid URL must be provided/);
    assert.throws(() => validateRequestConfig({ method: 'GET', url: 'not-a-url' }), /Invalid URL format/);
    assert.throws(() => validateRequestConfig({ method: 'GET', url: null }), /A valid URL must be provided/);
  });

  it('should reject unsupported URL protocols (e.g. file:, ftp:, javascript:)', () => {
    assert.throws(() => validateRequestConfig({ method: 'GET', url: 'file:///etc/passwd' }), /Unsupported protocol/);
    assert.throws(() => validateRequestConfig({ method: 'GET', url: 'ftp://ftp.example.com' }), /Unsupported protocol/);
    assert.throws(() => validateRequestConfig({ method: 'GET', url: 'javascript:alert(1)' }), /Unsupported protocol/);
  });

  it('should reject URLs with embedded credentials (user:pass@host)', () => {
    assert.throws(() => validateRequestConfig({ method: 'GET', url: 'http://admin:secret@localhost:8080' }), /embedded credentials/);
  });

  it('should accept exactly the 7 supported HTTP methods', () => {
    for (const m of SUPPORTED_METHODS) {
      assert.doesNotThrow(() => validateRequestConfig({ method: m, url: 'http://localhost:8080' }));
    }
  });

  it('should reject unsupported or invalid HTTP methods', () => {
    assert.throws(() => validateRequestConfig({ method: 'CONNECT', url: 'http://localhost:8080' }), /Unsupported HTTP method/);
    assert.throws(() => validateRequestConfig({ method: 'TRACE', url: 'http://localhost:8080' }), /Unsupported HTTP method/);
    assert.throws(() => validateRequestConfig({ method: 'FOOBAR', url: 'http://localhost:8080' }), /Unsupported HTTP method/);
  });

  it('should strictly prohibit request bodies for GET and HEAD', () => {
    assert.throws(
      () => validateRequestConfig({ method: 'GET', url: 'http://localhost:8080', body: '{"test":1}' }),
      /Methods GET cannot send a request body/
    );
    assert.throws(
      () => validateRequestConfig({ method: 'HEAD', url: 'http://localhost:8080', body: 'payload' }),
      /Methods HEAD cannot send a request body/
    );
  });

  it('should allow request bodies for POST, PUT, PATCH, and DELETE', () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const cfg = validateRequestConfig({ method: m, url: 'http://localhost:8080', body: '{"key":"val"}' });
      assert.equal(cfg.body, '{"key":"val"}');
    }
  });

  it('should reject headers with CRLF injection in name or value', () => {
    assert.throws(
      () => validateRequestConfig({
        method: 'POST',
        url: 'http://localhost:8080',
        headers: [{ key: 'X-Injected\r\nBad: true', value: '1', enabled: true }]
      }),
      /Invalid header name/
    );

    assert.throws(
      () => validateRequestConfig({
        method: 'POST',
        url: 'http://localhost:8080',
        headers: [{ key: 'Content-Type', value: 'application/json\r\nSet-Cookie: evil', enabled: true }]
      }),
      /Header value for "Content-Type" cannot contain/
    );
  });
});

// ============================================================================
// PART 2: URL Construction & Query Parameter Tests
// ============================================================================

describe('2. URL Construction & Query Parameter Handling', () => {
  it('should correctly encode spaces and reserved characters', () => {
    const raw = 'http://localhost:8080/api/search';
    const params = [
      { key: 'query', value: 'Spring Boot & Microservices', enabled: true },
      { key: 'filter', value: 'role=admin', enabled: true }
    ];

    const effective = buildEffectiveUrl(raw, params);
    assert.ok(effective.includes('query=Spring+Boot+%26+Microservices') || effective.includes('query=Spring%20Boot%20%26%20Microservices'));
    assert.ok(effective.includes('filter=role%3Dadmin'));
  });

  it('should preserve existing query parameters in the base URL', () => {
    const raw = 'http://localhost:8080/api/items?category=books';
    const params = [{ key: 'page', value: '2', enabled: true }];

    const effective = buildEffectiveUrl(raw, params);
    assert.ok(effective.includes('category=books'));
    assert.ok(effective.includes('page=2'));
  });

  it('should omit disabled parameters', () => {
    const raw = 'http://localhost:8080/api/items';
    const params = [
      { key: 'active', value: 'yes', enabled: true },
      { key: 'disabled_param', value: 'no', enabled: false }
    ];

    const effective = buildEffectiveUrl(raw, params);
    assert.ok(effective.includes('active=yes'));
    assert.ok(!effective.includes('disabled_param'));
  });

  it('should preserve repeated query parameters', () => {
    const raw = 'http://localhost:8080/api/filter';
    const params = [
      { key: 'tag', value: 'spring', enabled: true },
      { key: 'tag', value: 'java', enabled: true }
    ];

    const effective = buildEffectiveUrl(raw, params);
    assert.ok(effective.includes('tag=spring&tag=java') || effective.includes('tag=spring') && effective.includes('tag=java'));
  });

  it('should safely handle Unicode and international characters', () => {
    const raw = 'http://localhost:8080/api/test';
    const params = [{ key: 'city', value: 'München', enabled: true }];

    const effective = buildEffectiveUrl(raw, params);
    assert.ok(effective.includes('M%C3%BCnchen') || effective.includes('city=München'));
  });
});

// ============================================================================
// PART 3: Preload Bridge Security Contract (Step 2)
// ============================================================================

describe('3. Preload Bridge Security Contract (Step 2)', () => {
  it('should verify preload exposes exactly getAppInfo, sendRequest, cancelRequest, and copyToClipboard', () => {
    let exposedApiName = null;
    let exposedApiObject = null;

    const mockContextBridge = {
      exposeInMainWorld: (name, api) => {
        exposedApiName = name;
        exposedApiObject = api;
      }
    };

    const mockIpcRenderer = {
      invoke: async (channel, payload) => ({ channel, payload })
    };

    const preloadSource = fs.readFileSync(PRELOAD_PATH, 'utf8');

    // Must not expose dangerous APIs
    assert.doesNotMatch(preloadSource, /exposeInMainWorld\s*\(\s*['"]ipcRenderer['"]/);
    assert.doesNotMatch(preloadSource, /exposeInMainWorld\s*\(\s*['"]require['"]/);
    assert.doesNotMatch(preloadSource, /exposeInMainWorld\s*\(\s*['"]fs['"]/);

    // Strip electron require line before wrapping
    const sanitizedSource = preloadSource.replace(/const\s+\{[^}]+\}\s*=\s*require\([^)]+\);/g, '');
    const preloadFn = new Function('contextBridge', 'ipcRenderer', sanitizedSource);
    preloadFn(mockContextBridge, mockIpcRenderer);

    assert.equal(exposedApiName, 'apiForge');
    assert.ok(Object.isFrozen(exposedApiObject), 'apiForge bridge must be frozen');

    const expectedMethods = ['getAppInfo', 'sendRequest', 'cancelRequest', 'copyToClipboard'];
    assert.deepEqual(Object.keys(exposedApiObject).sort(), expectedMethods.sort());

    for (const method of expectedMethods) {
      assert.equal(typeof exposedApiObject[method], 'function');
    }
  });
});

// ============================================================================
// PART 4: Real Local Mock Server Integration Tests (All 7 HTTP Methods & Errors)
// ============================================================================

describe('4. Local HTTP Server Integration (All 7 Methods & Error Scenarios)', () => {
  let server;
  let serverPort;
  let baseUrl;

  before(async () => {
    // Spin up local deterministic HTTP server on ephemeral port 0
    server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      const pathname = parsedUrl.pathname;

      // Handle Methods
      if (req.method === 'GET' && pathname === '/api/users') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ users: [{ id: 1, name: 'Alice' }] }));
        return;
      }

      if (req.method === 'POST' && pathname === '/api/users') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ created: true, receivedBody: body ? JSON.parse(body) : null }));
        });
        return;
      }

      if (req.method === 'PUT' && pathname === '/api/users/1') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ updated: true, receivedBody: body ? JSON.parse(body) : null }));
        });
        return;
      }

      if (req.method === 'PATCH' && pathname === '/api/users/1') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ patched: true }));
        });
        return;
      }

      if (req.method === 'DELETE' && pathname === '/api/users/1') {
        res.writeHead(204); // No content
        res.end();
        return;
      }

      if (req.method === 'HEAD' && pathname === '/api/users') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Custom-Head': 'present'
        });
        res.end();
        return;
      }

      if (req.method === 'OPTIONS' && pathname === '/api/users') {
        res.writeHead(200, {
          'Allow': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
          'Content-Type': 'text/plain'
        });
        res.end('Allowed Methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
        return;
      }

      // Query Params Echo
      if (pathname === '/api/params') {
        const queryEntries = Object.fromEntries(parsedUrl.searchParams.entries());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(queryEntries));
        return;
      }

      // Headers Echo
      if (pathname === '/api/headers') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          accept: req.headers['accept'],
          custom: req.headers['x-custom-test']
        }));
        return;
      }

      // 404 Not Found
      if (pathname === '/api/not-found') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Spring Resource Not Found' }));
        return;
      }

      // 500 Internal Server Error
      if (pathname === '/api/server-error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Spring Server Exception' }));
        return;
      }

      // Delayed Response (for timeout testing)
      if (pathname === '/api/delayed') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Delayed Response');
        }, 350);
        return;
      }

      // Large Response (> 5 MiB)
      if (pathname === '/api/large') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        // Stream 6 MiB in chunks
        const chunkSize = 1024 * 64; // 64 KB
        const chunk = Buffer.alloc(chunkSize, 'A');
        let sent = 0;
        const total = 6 * 1024 * 1024; // 6 MiB

        function sendChunk() {
          while (sent < total) {
            sent += chunkSize;
            const ok = res.write(chunk);
            if (!ok) {
              res.once('drain', sendChunk);
              return;
            }
          }
          res.end();
        }
        sendChunk();
        return;
      }

      // Fallback
      res.writeHead(404);
      res.end('Not Found');
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        baseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. GET Method
  it('should execute real GET request and receive JSON response', async () => {
    const result = await executeHttpRequest({ method: 'GET', url: `${baseUrl}/api/users` });
    assert.equal(result.success, true);
    assert.equal(result.response.ok, true);
    assert.equal(result.response.status, 200);
    assert.equal(result.response.statusText, 'OK');
    assert.ok(result.response.timeMs > 0);
    assert.ok(result.response.sizeBytes > 0);

    const parsed = JSON.parse(result.response.body);
    assert.deepEqual(parsed, { users: [{ id: 1, name: 'Alice' }] });
  });

  // 2. POST Method
  it('should execute real POST request transmitting body', async () => {
    const payload = JSON.stringify({ name: 'Bob', role: 'ENGINEER' });
    const result = await executeHttpRequest({
      method: 'POST',
      url: `${baseUrl}/api/users`,
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      body: payload
    });

    assert.equal(result.success, true);
    assert.equal(result.response.status, 201);
    const parsed = JSON.parse(result.response.body);
    assert.equal(parsed.created, true);
    assert.deepEqual(parsed.receivedBody, { name: 'Bob', role: 'ENGINEER' });
  });

  // 3. PUT Method
  it('should execute real PUT request transmitting body', async () => {
    const payload = JSON.stringify({ name: 'Bob Updated' });
    const result = await executeHttpRequest({
      method: 'PUT',
      url: `${baseUrl}/api/users/1`,
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      body: payload
    });

    assert.equal(result.success, true);
    assert.equal(result.response.status, 200);
    const parsed = JSON.parse(result.response.body);
    assert.equal(parsed.updated, true);
  });

  // 4. PATCH Method
  it('should execute real PATCH request transmitting partial payload', async () => {
    const result = await executeHttpRequest({
      method: 'PATCH',
      url: `${baseUrl}/api/users/1`,
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      body: JSON.stringify({ role: 'ADMIN' })
    });

    assert.equal(result.success, true);
    assert.equal(result.response.status, 200);
    const parsed = JSON.parse(result.response.body);
    assert.equal(parsed.patched, true);
  });

  // 5. DELETE Method (204 No Content)
  it('should execute real DELETE request returning 204 No Content', async () => {
    const result = await executeHttpRequest({ method: 'DELETE', url: `${baseUrl}/api/users/1` });
    assert.equal(result.success, true);
    assert.equal(result.response.status, 204);
    assert.equal(result.response.body, '');
    assert.equal(result.response.sizeBytes, 0);
  });

  // 6. HEAD Method
  it('should execute real HEAD request without response body', async () => {
    const result = await executeHttpRequest({ method: 'HEAD', url: `${baseUrl}/api/users` });
    assert.equal(result.success, true);
    assert.equal(result.response.status, 200);
    assert.equal(result.response.body, '');
    assert.equal(result.response.headers['x-custom-head'], 'present');
  });

  // 7. OPTIONS Method
  it('should execute real OPTIONS request and return allowed methods', async () => {
    const result = await executeHttpRequest({ method: 'OPTIONS', url: `${baseUrl}/api/users` });
    assert.equal(result.success, true);
    assert.equal(result.response.status, 200);
    assert.ok(result.response.headers['allow'].includes('GET'));
  });

  // 8. Query Parameters transmission
  it('should transmit enabled query parameters over the wire', async () => {
    const result = await executeHttpRequest({
      method: 'GET',
      url: `${baseUrl}/api/params`,
      params: [
        { key: 'page', value: '1', enabled: true },
        { key: 'limit', value: '50', enabled: true },
        { key: 'disabled', value: 'ignore', enabled: false }
      ]
    });

    assert.equal(result.success, true);
    const parsed = JSON.parse(result.response.body);
    assert.equal(parsed.page, '1');
    assert.equal(parsed.limit, '50');
    assert.equal(parsed.disabled, undefined);
  });

  // 9. Custom Headers transmission
  it('should transmit enabled custom headers over the wire', async () => {
    const result = await executeHttpRequest({
      method: 'GET',
      url: `${baseUrl}/api/headers`,
      headers: [
        { key: 'Accept', value: 'application/json', enabled: true },
        { key: 'X-Custom-Test', value: 'SpringEdition123', enabled: true },
        { key: 'X-Disabled', value: 'no', enabled: false }
      ]
    });

    assert.equal(result.success, true);
    const parsed = JSON.parse(result.response.body);
    assert.equal(parsed.accept, 'application/json');
    assert.equal(parsed.custom, 'SpringEdition123');
  });

  // 10. HTTP 404 response (Real response, NOT network error)
  it('should treat HTTP 404 as a real HTTP response, not a network failure', async () => {
    const result = await executeHttpRequest({ method: 'GET', url: `${baseUrl}/api/not-found` });
    assert.equal(result.success, true, 'Result success flag should be true because response was received');
    assert.equal(result.response.ok, false, 'response.ok should be false for 404');
    assert.equal(result.response.status, 404);
    assert.equal(result.response.statusText, 'Not Found');
    const parsed = JSON.parse(result.response.body);
    assert.equal(parsed.error, 'Spring Resource Not Found');
  });

  // 11. HTTP 500 response (Real response, NOT network error)
  it('should treat HTTP 500 as a real HTTP response, not a network failure', async () => {
    const result = await executeHttpRequest({ method: 'GET', url: `${baseUrl}/api/server-error` });
    assert.equal(result.success, true);
    assert.equal(result.response.ok, false);
    assert.equal(result.response.status, 500);
    const parsed = JSON.parse(result.response.body);
    assert.equal(parsed.error, 'Internal Spring Server Exception');
  });

  // 12. Deliberate Timeout
  it('should abort and return TIMEOUT error when server exceeds timeoutMs', async () => {
    const result = await executeHttpRequest({
      method: 'GET',
      url: `${baseUrl}/api/delayed`,
      timeoutMs: 100 // server takes 350ms
    });

    assert.equal(result.success, false);
    assert.equal(result.error.type, 'TIMEOUT');
    assert.ok(result.error.message.includes('timed out'));
  });

  // 13. Connection Refused
  it('should catch unreachable port and return CONNECTION_REFUSED error', async () => {
    const result = await executeHttpRequest({
      method: 'GET',
      url: 'http://127.0.0.1:59199/api/unreachable',
      timeoutMs: 2000
    });

    assert.equal(result.success, false);
    assert.equal(result.error.type, 'CONNECTION_REFUSED');
    assert.ok(result.error.message.includes('Could not connect'));
  });

  // 14. Response Truncation Limit (> 5 MiB)
  it('should truncate responses exceeding the maximum byte limit', async () => {
    const result = await executeHttpRequest({
      method: 'GET',
      url: `${baseUrl}/api/large`,
      maxResponseBytes: 1024 * 1024 // 1 MiB limit for this test
    });

    assert.equal(result.success, true);
    assert.equal(result.response.status, 200);
    assert.equal(result.response.truncated, true);
    assert.ok(result.response.sizeBytes >= 1024 * 1024);
  });

  // 15. In-flight Request Cancellation
  it('should handle manual request cancellation via cancelHttpRequest', async () => {
    const requestId = 'cancel-test-id';
    const requestPromise = executeHttpRequest({
      requestId,
      method: 'GET',
      url: `${baseUrl}/api/delayed`,
      timeoutMs: 2000
    });

    setTimeout(() => {
      const cancelled = cancelHttpRequest(requestId);
      assert.equal(cancelled, true);
    }, 50);

    const result = await requestPromise;
    assert.equal(result.success, false);
    assert.equal(result.error.type, 'CANCELLED');
    assert.ok(result.error.message.includes('cancelled'));
  });
});
