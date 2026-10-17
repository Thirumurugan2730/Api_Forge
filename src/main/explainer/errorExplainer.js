/**
 * ApiForge Lite - Spring Boot Error Explainer Engine (Step 8)
 * 
 * Analyzes HTTP responses deterministically and identifies common Spring Boot problems:
 * - 400 Bad Request (Validation constraints, malformed JSON, missing request parameters)
 * - 401 Unauthorized (Missing/invalid/expired Bearer tokens, Spring Security config)
 * - 403 Forbidden (Insufficient authorities/roles, CSRF token mismatch)
 * - 404 Not Found (Unmapped path, missing database entity)
 * - 405 Method Not Allowed (Unsupported HTTP method, Allow header inspection)
 * - 415 Unsupported Media Type (Content-Type mismatch, consumes clause)
 * - 422 Unprocessable Entity (Semantic validation violations)
 * - 429 Too Many Requests (Rate limiting, Bucket4j, Retry-After header)
 * - 500 Internal Server Error (Unhandled server exceptions, null pointers, database errors)
 * - 502 / 503 / 504 (Gateway failure, service unavailable, proxy timeouts)
 * 
 * Accurately parses:
 * - Spring Boot 2 DefaultErrorAttributes
 * - Spring Boot 3 / RFC 7807 ProblemDetail
 * - MethodArgumentNotValidException & BindException field errors
 * - Plain-text and Whitelabel HTML error pages
 */

/**
 * Safely parses a response body string as JSON, returning null on failure.
 * @param {string} body 
 * @returns {object|null}
 */
function safeParseJson(body) {
  if (!body || typeof body !== 'string') return null;
  const trimmed = body.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * Normalizes headers object keys to lowercase.
 * @param {object} headers 
 * @returns {Record<string, string>}
 */
function normalizeHeaders(headers = {}) {
  const norm = {};
  if (!headers || typeof headers !== 'object') return norm;
  for (const [k, v] of Object.entries(headers)) {
    if (k) norm[k.toLowerCase()] = String(v);
  }
  return norm;
}

/**
 * Extracts field-level validation errors from Spring Boot response payloads.
 * Handles:
 * - Spring DefaultErrorAttributes 'errors' array
 * - RFC 7807 ProblemDetail 'properties.errors' or 'invalidParams'
 * - Map-style errors { errors: { field: message } }
 * 
 * @param {object} jsonBody 
 * @returns {Array<{ field: string, message: string, rejectedValue?: any, rule?: string }>}
 */
function extractValidationErrors(jsonBody) {
  if (!jsonBody || typeof jsonBody !== 'object') return [];

  const validationErrors = [];

  // 1. Spring Boot DefaultErrorAttributes: { errors: [ { field, defaultMessage, code, rejectedValue } ] }
  if (Array.isArray(jsonBody.errors)) {
    for (const err of jsonBody.errors) {
      if (!err || typeof err !== 'object') continue;
      const field = err.field || err.property || err.name || 'field';
      const message = err.defaultMessage || err.message || err.reason || 'Validation constraint violated';
      const rule = err.code || (err.codes && err.codes[0]) || '';
      validationErrors.push({
        field,
        message,
        rejectedValue: err.rejectedValue !== undefined ? err.rejectedValue : null,
        rule
      });
    }
    return validationErrors;
  }

  // 2. RFC 7807 / ProblemDetail: { properties: { errors: [ ... ] } }
  if (jsonBody.properties && Array.isArray(jsonBody.properties.errors)) {
    for (const err of jsonBody.properties.errors) {
      if (!err || typeof err !== 'object') continue;
      validationErrors.push({
        field: err.field || err.name || 'field',
        message: err.defaultMessage || err.message || err.reason || 'Validation constraint violated',
        rejectedValue: err.rejectedValue !== undefined ? err.rejectedValue : null,
        rule: err.code || ''
      });
    }
    return validationErrors;
  }

  // 3. RFC 7807 invalidParams: { invalidParams: [ { name, reason } ] }
  if (Array.isArray(jsonBody.invalidParams)) {
    for (const p of jsonBody.invalidParams) {
      if (!p || typeof p !== 'object') continue;
      validationErrors.push({
        field: p.name || 'field',
        message: p.reason || p.message || 'Validation constraint violated',
        rejectedValue: null,
        rule: ''
      });
    }
    return validationErrors;
  }

  // 4. Map style: { errors: { username: "must not be blank" } }
  if (jsonBody.errors && typeof jsonBody.errors === 'object' && !Array.isArray(jsonBody.errors)) {
    for (const [field, message] of Object.entries(jsonBody.errors)) {
      if (typeof message === 'string') {
        validationErrors.push({
          field,
          message,
          rejectedValue: null,
          rule: ''
        });
      }
    }
    return validationErrors;
  }

  return validationErrors;
}

/**
 * Analyzes an HTTP response and produces a structured, actionable explanation.
 * 
 * @param {object} context
 * @param {number} context.status - HTTP status code
 * @param {string} [context.statusText] - HTTP status text
 * @param {object} [context.headers] - Response headers
 * @param {string} [context.body] - Raw response body string
 * @param {string} [context.requestMethod] - HTTP request method (GET, POST, etc.)
 * @param {string} [context.requestUrl] - Effective URL sent
 * @param {Array} [context.requestHeaders] - Request headers sent
 * @param {string} [context.requestBody] - Request body sent
 * @returns {object} Explainer report
 */
function explainSpringError(context = {}) {
  const status = typeof context.status === 'number' ? context.status : 0;
  const statusText = context.statusText || '';
  const headers = normalizeHeaders(context.headers);
  const rawBody = typeof context.body === 'string' ? context.body : '';
  const jsonBody = safeParseJson(rawBody);
  const requestMethod = (context.requestMethod || 'GET').toUpperCase();
  const requestUrl = context.requestUrl || '';

  const isError = status >= 400 || status === 0;

  let category = 'Client Error';
  if (status >= 200 && status < 300) category = 'Success';
  else if (status >= 300 && status < 400) category = 'Redirect';
  else if (status >= 500) category = 'Server Error';

  const validationErrors = extractValidationErrors(jsonBody);

  // Extract Spring Boot standard metadata if present
  const springDetails = {
    timestamp: jsonBody?.timestamp || null,
    exception: jsonBody?.exception || null,
    path: jsonBody?.path || jsonBody?.instance || null,
    error: jsonBody?.error || jsonBody?.title || null,
    message: jsonBody?.message || jsonBody?.detail || null
  };

  // Build confirmed evidence list
  const evidence = [];
  if (status > 0) {
    evidence.push(`Confirmed HTTP status code ${status} (${statusText || 'Response Received'}).`);
  } else {
    evidence.push('No HTTP response received (Network error or aborted request).');
  }

  if (headers['content-type']) {
    evidence.push(`Response Content-Type: "${headers['content-type']}".`);
  }

  if (springDetails.message) {
    evidence.push(`Server reported message: "${springDetails.message}".`);
  }

  if (springDetails.exception) {
    evidence.push(`Server reported exception: "${springDetails.exception}".`);
  }

  if (validationErrors.length > 0) {
    evidence.push(`Detected ${validationErrors.length} field-level validation constraint violation${validationErrors.length === 1 ? '' : 's'}.`);
  }

  // Construct diagnosis based on HTTP status & evidence
  let title = `HTTP ${status} ${statusText}`;
  let errorType = 'HTTP Response';
  let whatHappened = '';
  const possibleCauses = [];
  const whatToCheckNext = [];

  switch (status) {
    case 200:
    case 201:
    case 204:
      errorType = 'Successful Operation';
      title = `HTTP ${status} ${statusText || 'OK'} — Success`;
      whatHappened = 'The request was received and processed successfully by the Spring Boot server.';
      possibleCauses.push('The controller method executed and returned a valid response body or entity.');
      whatToCheckNext.push('Verify response body fields match expected contract requirements.');
      break;

    case 400:
      errorType = 'Spring Validation / Bad Request';
      title = '400 Bad Request — Malformed Input or Validation Constraint Failure';

      if (validationErrors.length > 0) {
        whatHappened = `Spring Boot rejected the request because ${validationErrors.length} field constraint${validationErrors.length === 1 ? '' : 's'} failed validation.`;
      } else if (springDetails.message && springDetails.message.includes('JSON parse error')) {
        whatHappened = 'The Spring Boot server failed to parse the request body JSON (HttpMessageNotReadableException).';
      } else {
        whatHappened = 'The Spring Boot server rejected the request syntax or input parameters as malformed or invalid.';
      }

      if (validationErrors.length > 0) {
        possibleCauses.push('One or more payload properties violated Bean Validation annotations (@NotBlank, @NotNull, @Size, @Email, @Min, @Max) on the controller DTO.');
        whatToCheckNext.push('Inspect the field validation table below to identify exactly which fields failed constraints.');
        whatToCheckNext.push('Update the request body JSON with valid values satisfying all field constraints.');
      } else {
        possibleCauses.push('Malformed JSON syntax in the request body (e.g. unclosed quotes, trailing commas, or invalid data types).');
        possibleCauses.push('A required query parameter (@RequestParam(required = true)) is missing from the URL.');
        possibleCauses.push('A parameter type mismatch occurred (e.g. string provided where an integer was expected).');
        whatToCheckNext.push('Validate your JSON body under the Request "Body" tab using the "Validate JSON" tool.');
        whatToCheckNext.push('Check the controller method signature for required @RequestParam or @PathVariable definitions.');
      }
      break;

    case 401:
      errorType = 'Spring Security Authentication Failure';
      title = '401 Unauthorized — Missing, Invalid, or Expired Credentials';
      whatHappened = 'The requested endpoint is secured by Spring Security, and the request either lacked authentication or provided invalid or expired credentials.';
      possibleCauses.push('The "Authorization" header is missing from the request.');
      possibleCauses.push('The Bearer token has expired (exp claim in JWT has elapsed).');
      possibleCauses.push('The token signature was rejected by the backend (mismatched JWT secret key or JWK public key).');
      whatToCheckNext.push('Verify that an "Authorization: Bearer <token>" header is added under the Request "Headers" tab.');
      whatToCheckNext.push('Inspect the JWT expiration date on jwt.io to verify the token is currently active.');
      whatToCheckNext.push('Check Spring Security SecurityFilterChain configuration to verify if this endpoint was intended to be public (.permitAll()).');
      break;

    case 403:
      errorType = 'Spring Security Authorization / CSRF Restriction';
      title = '403 Forbidden — Insufficient Permissions or CSRF Protection Block';
      whatHappened = 'The request was authenticated, but the user does not possess the required roles or permissions, or CSRF protection blocked the state-changing request.';
      possibleCauses.push('The authenticated user lacks the required role or authority (e.g. @PreAuthorize("hasRole(\'ADMIN\')") or .hasAuthority(...)).');
      possibleCauses.push('Spring Security CSRF protection is active on POST/PUT/DELETE requests, and no valid CSRF token ("X-XSRF-TOKEN") was provided.');
      whatToCheckNext.push('Inspect the user roles and scopes inside your JWT token payload.');
      whatToCheckNext.push('Check controller method authorization annotations (@PreAuthorize, @Secured, @RolesAllowed).');
      whatToCheckNext.push('If CSRF protection is enabled on the server, include the CSRF token header or configure csrf.disable() for stateless REST APIs.');
      break;

    case 404:
      errorType = 'Endpoint or Resource Not Found';
      title = '404 Not Found — Unmapped Route or Missing Database Entity';
      whatHappened = `The server could not find a matching Spring @RequestMapping handler for ${requestMethod} ${requestUrl || 'this URL'}, or the requested entity does not exist.`;
      possibleCauses.push('The URL path is mistyped or does not match any @GetMapping/@PostMapping route registered in Spring.');
      possibleCauses.push('The Spring Boot application context path (server.servlet.context-path) was omitted from the URL.');
      possibleCauses.push('The entity identifier specified in the path or query does not exist in the database (e.g. EntityNotFoundException returning 404).');
      whatToCheckNext.push('Verify the exact URL path and method against your Spring Boot @RestController class mappings.');
      whatToCheckNext.push('Check if a servlet context-path (e.g. /api or /v1) is configured in application.properties.');
      whatToCheckNext.push('Inspect backend database records to confirm the resource ID exists.');
      break;

    case 405:
      errorType = 'HTTP Method Not Allowed';
      title = `405 Method Not Allowed — ${requestMethod} Not Supported`;
      whatHappened = `The endpoint exists, but the HTTP method ${requestMethod} is not mapped by the controller.`;
      if (headers['allow']) {
        evidence.push(`Server reported allowed HTTP methods: "${headers['allow']}".`);
        possibleCauses.push(`The controller only accepts: ${headers['allow']}.`);
      } else {
        possibleCauses.push('The endpoint handler does not support the HTTP method used in this request.');
      }
      whatToCheckNext.push(headers['allow'] ? `Change the request method to one of the supported methods: ${headers['allow']}.` : 'Check the @RequestMapping / @GetMapping / @PostMapping annotations on the Spring controller.');
      break;

    case 415:
      errorType = 'Unsupported Media Type';
      title = '415 Unsupported Media Type — Content-Type Mismatch';
      whatHappened = 'The server rejected the payload format because the "Content-Type" header is missing, incorrect, or not accepted by the controller consumes attribute.';
      possibleCauses.push('The request lacks a "Content-Type: application/json" header.');
      possibleCauses.push('The Spring controller consumes attribute is set to a different media type (e.g. consumes = MediaType.APPLICATION_XML_VALUE).');
      whatToCheckNext.push('Ensure the request header "Content-Type: application/json" is present and enabled under the Headers tab.');
      whatToCheckNext.push('Check the consumes configuration on the Spring @PostMapping/@PutMapping endpoint.');
      break;

    case 422:
      errorType = 'Unprocessable Entity';
      title = '422 Unprocessable Entity — Semantic Business Rule Violation';
      whatHappened = 'The request payload syntax was valid, but backend semantic validation or domain business rules were violated.';
      possibleCauses.push('A business rule check failed (e.g. duplicate username, account already closed, or invalid state transition).');
      if (validationErrors.length > 0) {
        possibleCauses.push('Field-level validation constraints were rejected by the domain validator.');
        whatToCheckNext.push('Review the field validation messages below and correct the invalid values.');
      } else {
        whatToCheckNext.push('Review the server response body details to identify which domain invariant failed.');
      }
      break;

    case 429:
      errorType = 'Rate Limiting / Throttling';
      title = '429 Too Many Requests — Rate Limit Exceeded';
      whatHappened = 'The rate limit or concurrency threshold configured for this API endpoint has been exceeded.';
      if (headers['retry-after']) {
        evidence.push(`Server reported Retry-After: ${headers['retry-after']} seconds.`);
        whatToCheckNext.push(`Wait ${headers['retry-after']} seconds before sending another request.`);
      }
      possibleCauses.push('A rate limiter (e.g. Bucket4j, Spring Cloud Gateway RequestRateLimiter, Resilience4j) throttled your client IP or API key.');
      whatToCheckNext.push('Check rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset) or reduce request frequency.');
      break;

    case 500:
      errorType = 'Spring Server-Side Exception';
      title = '500 Internal Server Error — Unhandled Server Exception';
      whatHappened = 'An unexpected unhandled exception occurred within the Spring Boot application while executing the request.';
      if (springDetails.exception) {
        possibleCauses.push(`Backend exception: ${springDetails.exception}.`);
      } else {
        possibleCauses.push('A NullPointerException, database constraint violation, or unexpected runtime exception occurred in the service layer.');
      }
      whatToCheckNext.push('Inspect your Spring Boot application terminal or log files (catalina.out, spring.log) for the complete Java stack trace.');
      whatToCheckNext.push('Add an @ExceptionHandler inside a @RestControllerAdvice class to catch and handle this exception gracefully.');
      whatToCheckNext.push('Verify database connectivity, migrations (Flyway/Liquibase), and foreign key constraints.');
      break;

    case 502:
    case 503:
    case 504:
      errorType = 'Gateway / Service Availability Problem';
      title = `HTTP ${status} — Gateway or Service Availability Issue`;
      whatHappened = `An intermediary gateway, reverse proxy, or upstream service failed to respond or is offline (${status === 504 ? 'Gateway Timeout' : status === 502 ? 'Bad Gateway' : 'Service Unavailable'}).`;
      possibleCauses.push('The target Spring Boot process is not running or crashed.');
      possibleCauses.push('A reverse proxy (NGINX, Spring Cloud Gateway) timed out while waiting for the upstream application to respond.');
      whatToCheckNext.push('Verify that your Spring Boot application is running and listening on the expected host and port.');
      whatToCheckNext.push('Check proxy and gateway timeout configurations.');
      break;

    default:
      if (status >= 400 && status < 500) {
        errorType = 'Client Error';
        title = `HTTP ${status} ${statusText || 'Client Error'}`;
        whatHappened = `The server responded with an HTTP ${status} client-side error.`;
        possibleCauses.push('The request parameters, headers, or body do not satisfy the server expectations.');
        whatToCheckNext.push('Check the response headers and body for server-provided diagnostics.');
      } else if (status >= 500) {
        errorType = 'Server Error';
        title = `HTTP ${status} ${statusText || 'Server Error'}`;
        whatHappened = `The server responded with an HTTP ${status} server-side error.`;
        possibleCauses.push('An upstream service or server component encountered a processing failure.');
        whatToCheckNext.push('Check backend application server logs for diagnostic output.');
      } else {
        errorType = 'Unknown Status';
        title = `HTTP ${status} ${statusText}`;
        whatHappened = 'The server returned an unrecognized HTTP status code.';
        possibleCauses.push('Non-standard server configuration or proxy response.');
        whatToCheckNext.push('Consult your backend API documentation.');
      }
      break;
  }

  return {
    status,
    statusText,
    isError,
    category,
    errorType,
    title,
    whatHappened,
    possibleCauses,
    whatToCheckNext,
    validationErrors,
    springDetails,
    evidence
  };
}

module.exports = {
  safeParseJson,
  normalizeHeaders,
  extractValidationErrors,
  explainSpringError
};
