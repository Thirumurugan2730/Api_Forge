/**
 * ApiForge Lite — Spring Edition
 * Core HTTP Engine (Step 2)
 *
 * Executes real HTTP requests in the Electron Main Process.
 * Enforces strict validation, streaming byte limits, cancellation, and error normalization.
 */

const { randomUUID } = require('crypto');

const SUPPORTED_METHODS = Object.freeze(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MiB
const MAX_HEADERS_COUNT = 100;
const MAX_PARAMS_COUNT = 200;
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024; // 10 MiB

// Active in-flight requests map: requestId -> { abortController, startTime }
const activeRequests = new Map();

/**
 * Standard HTTP Status Text fallback dictionary.
 */
const STATUS_TEXTS = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  206: 'Partial Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout'
};

function getStandardStatusText(status) {
  return STATUS_TEXTS[status] || (status >= 200 && status < 300 ? 'OK' : 'Unknown Status');
}

/**
 * Custom validation error class.
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.type = 'INVALID_REQUEST';
  }
}

/**
 * Validates request configuration in the main process.
 *
 * @param {object} config - The raw request configuration from IPC.
 * @returns {object} Validated and normalized configuration.
 */
function validateRequestConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new ValidationError('Request configuration must be a valid object');
  }

  // 1. Method Validation
  const method = typeof config.method === 'string' ? config.method.toUpperCase().trim() : '';
  if (!SUPPORTED_METHODS.includes(method)) {
    throw new ValidationError(`Unsupported HTTP method "${config.method}". Must be one of: ${SUPPORTED_METHODS.join(', ')}`);
  }

  // 2. URL Validation
  if (typeof config.url !== 'string' || !config.url.trim()) {
    throw new ValidationError('A valid URL must be provided');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(config.url.trim());
  } catch {
    throw new ValidationError(`Invalid URL format: "${config.url}". Please enter a complete URL like https://api.example.com`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new ValidationError(`Unsupported protocol "${parsedUrl.protocol}". Only HTTP and HTTPS are permitted`);
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new ValidationError('URLs with embedded credentials (user:pass@host) are rejected for security');
  }

  // 3. Body Restrictions for GET and HEAD
  const hasBody = config.body !== undefined && config.body !== null && config.body !== '';
  if ((method === 'GET' || method === 'HEAD') && hasBody) {
    throw new ValidationError(`Methods ${method} cannot send a request body per HTTP specifications`);
  }

  if (hasBody && typeof config.body === 'string' && Buffer.byteLength(config.body, 'utf8') > MAX_REQUEST_BODY_BYTES) {
    throw new ValidationError(`Request body exceeds the maximum permitted size of ${MAX_REQUEST_BODY_BYTES / (1024 * 1024)} MiB`);
  }

  // 4. Query Parameters Validation
  let params = [];
  if (config.params !== undefined && config.params !== null) {
    if (!Array.isArray(config.params)) {
      throw new ValidationError('Query parameters must be provided as an array');
    }
    if (config.params.length > MAX_PARAMS_COUNT) {
      throw new ValidationError(`Query parameters count exceeds maximum of ${MAX_PARAMS_COUNT}`);
    }

    params = config.params.map((p, idx) => {
      if (typeof p !== 'object' || p === null) {
        throw new ValidationError(`Query parameter at index ${idx} must be an object`);
      }
      return {
        key: typeof p.key === 'string' ? p.key : String(p.key || ''),
        value: typeof p.value === 'string' ? p.value : String(p.value || ''),
        enabled: Boolean(p.enabled)
      };
    });
  }

  // 5. Headers Validation
  let headers = [];
  if (config.headers !== undefined && config.headers !== null) {
    if (!Array.isArray(config.headers)) {
      throw new ValidationError('Headers must be provided as an array');
    }
    if (config.headers.length > MAX_HEADERS_COUNT) {
      throw new ValidationError(`Headers count exceeds maximum of ${MAX_HEADERS_COUNT}`);
    }

    const headerNamePattern = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;

    headers = config.headers.map((h, idx) => {
      if (typeof h !== 'object' || h === null) {
        throw new ValidationError(`Header at index ${idx} must be an object`);
      }

      const key = typeof h.key === 'string' ? h.key.trim() : '';
      const value = typeof h.value === 'string' ? h.value : String(h.value || '');
      const enabled = Boolean(h.enabled);

      if (enabled && key) {
        // Prevent CRLF injection in header name
        if (!headerNamePattern.test(key) || /[\r\n]/.test(key)) {
          throw new ValidationError(`Invalid header name "${key}". Header names cannot contain spaces, control characters, or line breaks.`);
        }
        // Prevent CRLF injection in header value
        if (/[\r\n]/.test(value)) {
          throw new ValidationError(`Header value for "${key}" cannot contain carriage return or line break characters.`);
        }
      }

      return { key, value, enabled };
    });
  }

  // 6. Timeout
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (config.timeoutMs !== undefined && config.timeoutMs !== null) {
    const parsedTimeout = Number(config.timeoutMs);
    if (isNaN(parsedTimeout) || parsedTimeout <= 0 || parsedTimeout > 300000) {
      throw new ValidationError('Timeout must be a positive number between 1 and 300,000 milliseconds');
    }
    timeoutMs = Math.round(parsedTimeout);
  }

  // 7. Request ID
  const requestId = (typeof config.requestId === 'string' && config.requestId.trim())
    ? config.requestId.trim()
    : randomUUID();

  return {
    requestId,
    method,
    url: parsedUrl.toString(),
    params,
    headers,
    body: hasBody ? String(config.body) : null,
    timeoutMs,
    maxResponseBytes: config.maxResponseBytes || DEFAULT_MAX_RESPONSE_BYTES
  };
}

/**
 * Builds the effective URL by appending enabled query parameters to the base URL.
 * Preserves existing URL query parameters and repeated keys.
 *
 * @param {string} rawUrl - The base URL string.
 * @param {Array<{key: string, value: string, enabled: boolean}>} params - Parameter entries.
 * @returns {string} The fully composed URL.
 */
function buildEffectiveUrl(rawUrl, params) {
  const urlObj = new URL(rawUrl);

  if (Array.isArray(params)) {
    for (const p of params) {
      if (p.enabled && p.key !== '') {
        urlObj.searchParams.append(p.key, p.value);
      }
    }
  }

  return urlObj.toString();
}

/**
 * Sanitizes headers for diagnostic logging (masks credentials).
 *
 * @param {Record<string, string>} headersObj
 * @returns {Record<string, string>}
 */
function sanitizeHeadersForLogging(headersObj) {
  const sanitized = {};
  const sensitiveHeaders = ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key'];

  for (const [k, v] of Object.entries(headersObj)) {
    if (sensitiveHeaders.includes(k.toLowerCase())) {
      sanitized[k] = '[REDACTED]';
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Normalizes any error thrown during fetch into a consistent structure.
 *
 * @param {Error} error
 * @param {boolean} wasAbortedByTimeout
 * @param {boolean} wasAbortedByUser
 * @param {number} timeoutMs
 * @returns {object}
 */
function normalizeHttpError(error, wasAbortedByTimeout, wasAbortedByUser, timeoutMs) {
  if (wasAbortedByUser || error.name === 'AbortError' && wasAbortedByUser) {
    return {
      type: 'CANCELLED',
      message: 'Request cancelled by user.',
      details: 'The in-flight HTTP request was manually terminated.'
    };
  }

  if (wasAbortedByTimeout || (error.name === 'AbortError' && wasAbortedByTimeout)) {
    return {
      type: 'TIMEOUT',
      message: 'The request timed out.',
      details: `The server did not respond within ${timeoutMs} ms.`
    };
  }

  if (error instanceof ValidationError) {
    return {
      type: 'INVALID_REQUEST',
      message: error.message,
      details: 'The request failed client-side validation.'
    };
  }

  // Inspect Node.js system error codes from error or error.cause
  const cause = error.cause || {};
  const code = error.code || cause.code || '';

  if (code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
    return {
      type: 'CONNECTION_REFUSED',
      message: 'Could not connect to the server.',
      details: 'Connection was refused. Ensure that your server (e.g. Spring Boot) is running and listening on the target port.'
    };
  }

  if (code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
    return {
      type: 'DNS_ERROR',
      message: 'Host not found (DNS lookup failed).',
      details: 'The hostname could not be resolved. Please verify the URL and your network connection.'
    };
  }

  if (code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
    return {
      type: 'CONNECTION_ERROR',
      message: 'Connection was reset by peer.',
      details: 'The server abruptly closed the connection before a response could be received.'
    };
  }

  if (
    code.includes('CERT') ||
    code.includes('DEPTH_ZERO_SELF_SIGNED_CERT') ||
    error.message.includes('certificate') ||
    error.message.includes('self-signed')
  ) {
    return {
      type: 'TLS_ERROR',
      message: 'TLS/Certificate verification failed.',
      details: `Secure connection failed: ${error.message}. ApiForge Lite strictly enforces TLS verification for safety.`
    };
  }

  return {
    type: 'UNKNOWN',
    message: error.message || 'Network request failed.',
    details: cause.message ? `Details: ${cause.message}` : 'An unexpected network error occurred.'
  };
}

/**
 * Executes an HTTP request using Node.js native fetch in the Main Process.
 *
 * @param {object} rawConfig - Request configuration from renderer IPC.
 * @returns {Promise<{success: boolean, response?: object, error?: object}>}
 */
async function executeHttpRequest(rawConfig) {
  let validated;
  try {
    validated = validateRequestConfig(rawConfig);
  } catch (err) {
    return {
      success: false,
      error: normalizeHttpError(err, false, false, DEFAULT_TIMEOUT_MS)
    };
  }

  const {
    requestId,
    method,
    url,
    params,
    headers,
    body,
    timeoutMs,
    maxResponseBytes
  } = validated;

  const effectiveUrl = buildEffectiveUrl(url, params);

  // Compose request headers
  const headerMap = {};
  for (const h of headers) {
    if (h.enabled && h.key) {
      headerMap[h.key] = h.value;
    }
  }

  const abortController = new AbortController();
  let wasAbortedByTimeout = false;
  let wasAbortedByUser = false;

  const timeoutHandle = setTimeout(() => {
    wasAbortedByTimeout = true;
    abortController.abort(new Error('TIMEOUT'));
  }, timeoutMs);

  activeRequests.set(requestId, {
    abortController,
    abortByUser: () => {
      wasAbortedByUser = true;
      abortController.abort(new Error('USER_CANCELLED'));
    }
  });

  const startTime = performance.now();

  try {
    const fetchOptions = {
      method,
      headers: headerMap,
      signal: abortController.signal,
      redirect: 'follow'
    };

    if (body !== null && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = body;
    }

    const fetchResponse = await fetch(effectiveUrl, fetchOptions);

    // Read and buffer response body with strict max byte limit
    let receivedBytes = 0;
    let chunks = [];
    let truncated = false;

    if (method !== 'HEAD' && fetchResponse.status !== 204 && fetchResponse.status !== 304 && fetchResponse.body) {
      if (typeof fetchResponse.body.getReader === 'function') {
        const reader = fetchResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          receivedBytes += value.length;

          if (receivedBytes > maxResponseBytes) {
            truncated = true;
            const allowed = value.length - (receivedBytes - maxResponseBytes);
            if (allowed > 0) {
              chunks.push(value.subarray(0, allowed));
            }
            await reader.cancel('MAX_RESPONSE_BYTES_EXCEEDED');
            break;
          } else {
            chunks.push(value);
          }
        }
      } else {
        // Fallback for Node buffer or arrayBuffer
        const ab = await fetchResponse.arrayBuffer();
        const buf = Buffer.from(ab);
        receivedBytes = buf.length;
        if (receivedBytes > maxResponseBytes) {
          truncated = true;
          chunks.push(buf.subarray(0, maxResponseBytes));
        } else {
          chunks.push(buf);
        }
      }
    }

    clearTimeout(timeoutHandle);
    activeRequests.delete(requestId);

    const durationMs = Math.max(1, Math.round(performance.now() - startTime));

    // Decode response body
    let decodedBody = '';
    if (chunks.length > 0) {
      const fullBuffer = Buffer.concat(chunks.map((c) => Buffer.isBuffer(c) ? c : Buffer.from(c)));
      decodedBody = fullBuffer.toString('utf8');
    }

    // Convert response headers into clean object
    const responseHeaders = {};
    if (fetchResponse.headers && typeof fetchResponse.headers.forEach === 'function') {
      fetchResponse.headers.forEach((val, key) => {
        responseHeaders[key.toLowerCase()] = val;
      });
    }

    return {
      success: true,
      response: {
        ok: fetchResponse.ok,
        status: fetchResponse.status,
        statusText: fetchResponse.statusText || getStandardStatusText(fetchResponse.status),
        headers: responseHeaders,
        body: decodedBody,
        timeMs: durationMs,
        sizeBytes: receivedBytes,
        truncated,
        contentType: responseHeaders['content-type'] || '',
        effectiveUrl
      }
    };
  } catch (err) {
    clearTimeout(timeoutHandle);
    activeRequests.delete(requestId);

    return {
      success: false,
      error: normalizeHttpError(err, wasAbortedByTimeout, wasAbortedByUser, timeoutMs)
    };
  }
}

/**
 * Cancels an in-flight request by its requestId.
 *
 * @param {string} requestId
 * @returns {boolean} True if found and aborted, false otherwise.
 */
function cancelHttpRequest(requestId) {
  if (!requestId || typeof requestId !== 'string') return false;
  const entry = activeRequests.get(requestId);
  if (entry) {
    entry.abortByUser();
    activeRequests.delete(requestId);
    return true;
  }
  return false;
}

module.exports = {
  SUPPORTED_METHODS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RESPONSE_BYTES,
  validateRequestConfig,
  buildEffectiveUrl,
  sanitizeHeadersForLogging,
  normalizeHttpError,
  executeHttpRequest,
  cancelHttpRequest
};
