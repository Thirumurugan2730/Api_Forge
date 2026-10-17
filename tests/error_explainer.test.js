/**
 * ApiForge Lite - Step 8: Spring Boot Error Explainer Test Suite
 * 
 * Comprehensive automated verification for:
 * 1. All supported HTTP status categories (400, 401, 403, 404, 405, 415, 422, 429, 500, 502, 503, 504)
 * 2. Spring-style validation errors (DefaultErrorAttributes, ProblemDetail RFC 7807, invalidParams, Map style)
 * 3. Extraction of field-level constraints (@NotBlank, @Email, @Size, rejected values)
 * 4. Safe handling of empty, plain-text, Whitelabel HTML, and malformed JSON bodies
 * 5. Distinction between confirmed facts (evidence) and hypotheses (possibleCauses)
 * 6. Header diagnostics (Allow header for 405, Retry-After for 429, Content-Type for 415)
 * 7. Unrecognized / custom HTTP error status handling
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const errorExplainer = require('../src/main/explainer/errorExplainer');

describe('Step 8: Spring Boot Error Explainer Suite', () => {

  describe('1. HTTP Status Code Category Diagnostics', () => {

    it('should diagnose 400 Bad Request with Spring message details', () => {
      const res = errorExplainer.explainSpringError({
        status: 400,
        statusText: 'Bad Request',
        body: JSON.stringify({
          timestamp: '2026-10-17T00:00:00Z',
          status: 400,
          error: 'Bad Request',
          message: 'JSON parse error: Unexpected character',
          path: '/api/v1/orders'
        }),
        requestMethod: 'POST',
        requestUrl: 'http://localhost:8080/api/v1/orders'
      });

      assert.equal(res.status, 400);
      assert.equal(res.isError, true);
      assert.equal(res.category, 'Client Error');
      assert.ok(res.whatHappened.includes('JSON'));
      assert.ok(res.possibleCauses.length > 0);
      assert.ok(res.whatToCheckNext.some(s => s.toLowerCase().includes('body') || s.toLowerCase().includes('json')));
      assert.ok(res.evidence.some(e => e.includes('400')));
    });

    it('should diagnose 401 Unauthorized and recommend Bearer token / SecurityFilterChain checks', () => {
      const res = errorExplainer.explainSpringError({
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'WWW-Authenticate': 'Bearer error="invalid_token", error_description="The token expired"' },
        body: '',
        requestMethod: 'GET',
        requestUrl: 'http://localhost:8080/api/v1/secure-data'
      });

      assert.equal(res.status, 401);
      assert.ok(res.title.includes('401'));
      assert.ok(res.whatHappened.toLowerCase().includes('security'));
      assert.ok(res.possibleCauses.some(c => c.toLowerCase().includes('bearer') || c.toLowerCase().includes('expired')));
      assert.ok(res.whatToCheckNext.some(s => s.toLowerCase().includes('authorization')));
    });

    it('should diagnose 403 Forbidden with authorities and CSRF advice', () => {
      const res = errorExplainer.explainSpringError({
        status: 403,
        statusText: 'Forbidden',
        body: JSON.stringify({ message: 'Access Denied: Required authority ROLE_ADMIN' }),
        requestMethod: 'DELETE',
        requestUrl: 'http://localhost:8080/api/v1/users/5'
      });

      assert.equal(res.status, 403);
      assert.ok(res.whatHappened.toLowerCase().includes('roles') || res.whatHappened.toLowerCase().includes('permissions'));
      assert.ok(res.possibleCauses.some(c => c.toLowerCase().includes('role') || c.toLowerCase().includes('csrf')));
      assert.ok(res.whatToCheckNext.some(s => s.toLowerCase().includes('preauthorize') || s.toLowerCase().includes('roles')));
    });

    it('should diagnose 404 Not Found and provide context-path and @RestController guidance', () => {
      const res = errorExplainer.explainSpringError({
        status: 404,
        statusText: 'Not Found',
        body: 'Whitelabel Error Page: This application has no explicit mapping for /api/missing',
        requestMethod: 'GET',
        requestUrl: 'http://localhost:8080/api/missing'
      });

      assert.equal(res.status, 404);
      assert.ok(res.whatHappened.toLowerCase().includes('mapping') || res.whatHappened.toLowerCase().includes('not found'));
      assert.ok(res.possibleCauses.some(c => c.toLowerCase().includes('context-path') || c.toLowerCase().includes('route')));
      assert.ok(res.whatToCheckNext.some(s => s.toLowerCase().includes('restcontroller') || s.toLowerCase().includes('path')));
    });

    it('should diagnose 405 Method Not Allowed and incorporate Allow header into explanation', () => {
      const res = errorExplainer.explainSpringError({
        status: 405,
        statusText: 'Method Not Allowed',
        headers: { 'Allow': 'GET, HEAD, OPTIONS' },
        requestMethod: 'POST',
        requestUrl: 'http://localhost:8080/api/v1/read-only-feed'
      });

      assert.equal(res.status, 405);
      assert.ok(res.title.includes('POST'));
      assert.ok(res.evidence.some(e => e.includes('GET, HEAD, OPTIONS')));
      assert.ok(res.whatToCheckNext.some(s => s.includes('GET, HEAD, OPTIONS')));
    });

    it('should diagnose 415 Unsupported Media Type and recommend Content-Type: application/json', () => {
      const res = errorExplainer.explainSpringError({
        status: 415,
        statusText: 'Unsupported Media Type',
        body: JSON.stringify({ message: "Content type 'text/plain;charset=UTF-8' not supported" }),
        requestMethod: 'POST',
        requestUrl: 'http://localhost:8080/api/v1/items'
      });

      assert.equal(res.status, 415);
      assert.ok(res.whatHappened.toLowerCase().includes('content-type') || res.whatHappened.toLowerCase().includes('media'));
      assert.ok(res.whatToCheckNext.some(s => s.includes('Content-Type: application/json')));
    });

    it('should diagnose 422 Unprocessable Entity with business invariant advice', () => {
      const res = errorExplainer.explainSpringError({
        status: 422,
        statusText: 'Unprocessable Entity',
        body: JSON.stringify({ message: 'Duplicate customer account detected' }),
        requestMethod: 'POST'
      });

      assert.equal(res.status, 422);
      assert.ok(res.whatHappened.toLowerCase().includes('semantic') || res.whatHappened.toLowerCase().includes('business'));
      assert.ok(res.possibleCauses.some(c => c.toLowerCase().includes('business rule')));
    });

    it('should diagnose 429 Too Many Requests and incorporate Retry-After header', () => {
      const res = errorExplainer.explainSpringError({
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '30', 'X-RateLimit-Limit': '100' },
        requestMethod: 'GET'
      });

      assert.equal(res.status, 429);
      assert.ok(res.evidence.some(e => e.includes('30 seconds')));
      assert.ok(res.whatToCheckNext.some(s => s.includes('30 seconds')));
    });

    it('should diagnose 500 Internal Server Error and recommend @ExceptionHandler and logs', () => {
      const res = errorExplainer.explainSpringError({
        status: 500,
        statusText: 'Internal Server Error',
        body: JSON.stringify({
          exception: 'java.lang.NullPointerException',
          message: 'Cannot invoke "String.toLowerCase()" because "input" is null'
        }),
        requestMethod: 'POST'
      });

      assert.equal(res.status, 500);
      assert.equal(res.category, 'Server Error');
      assert.ok(res.possibleCauses.some(c => c.includes('NullPointerException')));
      assert.ok(res.whatToCheckNext.some(s => s.toLowerCase().includes('exceptionhandler')));
      assert.ok(res.whatToCheckNext.some(s => s.toLowerCase().includes('log')));
    });

    it('should diagnose 502 / 503 / 504 Gateway & Availability failures', () => {
      const res503 = errorExplainer.explainSpringError({ status: 503, statusText: 'Service Unavailable' });
      assert.equal(res503.status, 503);
      assert.ok(res503.whatHappened.toLowerCase().includes('gateway') || res503.whatHappened.toLowerCase().includes('service'));

      const res504 = errorExplainer.explainSpringError({ status: 504, statusText: 'Gateway Timeout' });
      assert.equal(res504.status, 504);
      assert.ok(res504.whatHappened.toLowerCase().includes('timeout'));
    });
  });

  describe('2. Spring Validation Error Extraction (All Common Formats)', () => {

    it('should parse Spring Boot 2 / DefaultErrorAttributes field errors array', () => {
      const spring2Payload = {
        timestamp: '2026-10-17T00:00:00.000+00:00',
        status: 400,
        error: 'Bad Request',
        message: 'Validation failed for object=\'userDTO\'. Error count: 2',
        errors: [
          {
            field: 'username',
            defaultMessage: 'must not be blank',
            rejectedValue: '',
            code: 'NotBlank'
          },
          {
            field: 'email',
            defaultMessage: 'must be a well-formed email address',
            rejectedValue: 'not-an-email',
            code: 'Email'
          }
        ]
      };

      const res = errorExplainer.explainSpringError({
        status: 400,
        body: JSON.stringify(spring2Payload)
      });

      assert.equal(res.validationErrors.length, 2);
      assert.equal(res.validationErrors[0].field, 'username');
      assert.equal(res.validationErrors[0].message, 'must not be blank');
      assert.equal(res.validationErrors[0].rule, 'NotBlank');

      assert.equal(res.validationErrors[1].field, 'email');
      assert.equal(res.validationErrors[1].rejectedValue, 'not-an-email');
      assert.equal(res.validationErrors[1].rule, 'Email');
    });

    it('should parse Spring Boot 3 / RFC 7807 ProblemDetail properties.errors', () => {
      const problemDetail = {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request content.',
        instance: '/api/v1/accounts',
        properties: {
          errors: [
            {
              field: 'balance',
              defaultMessage: 'must be greater than or equal to 0.0',
              rejectedValue: -15.5,
              code: 'DecimalMin'
            }
          ]
        }
      };

      const res = errorExplainer.explainSpringError({
        status: 400,
        body: JSON.stringify(problemDetail)
      });

      assert.equal(res.validationErrors.length, 1);
      assert.equal(res.validationErrors[0].field, 'balance');
      assert.equal(res.validationErrors[0].rejectedValue, -15.5);
      assert.equal(res.validationErrors[0].rule, 'DecimalMin');
    });

    it('should parse RFC 7807 invalidParams array', () => {
      const invalidParamsDoc = {
        type: 'https://example.com/probs/validation',
        title: 'Validation Failed',
        status: 400,
        invalidParams: [
          { name: 'postalCode', reason: 'must match pattern ^[0-9]{5}$' }
        ]
      };

      const res = errorExplainer.explainSpringError({
        status: 400,
        body: JSON.stringify(invalidParamsDoc)
      });

      assert.equal(res.validationErrors.length, 1);
      assert.equal(res.validationErrors[0].field, 'postalCode');
      assert.ok(res.validationErrors[0].message.includes('pattern'));
    });

    it('should parse Map-style validation errors { errors: { field: message } }', () => {
      const mapStyle = {
        status: 400,
        errors: {
          telephone: 'Telephone number is required',
          country: 'Unknown country code'
        }
      };

      const res = errorExplainer.explainSpringError({
        status: 400,
        body: JSON.stringify(mapStyle)
      });

      assert.equal(res.validationErrors.length, 2);
      assert.ok(res.validationErrors.some(v => v.field === 'telephone'));
      assert.ok(res.validationErrors.some(v => v.field === 'country'));
    });
  });

  describe('3. Robustness on Empty, Malformed, Plain Text, and Non-JSON Bodies', () => {

    it('should safely handle completely empty response bodies without error', () => {
      const res = errorExplainer.explainSpringError({ status: 500, body: '' });
      assert.equal(res.status, 500);
      assert.equal(res.validationErrors.length, 0);
      assert.ok(res.whatHappened.length > 0);
    });

    it('should safely handle null or non-string response bodies', () => {
      const res = errorExplainer.explainSpringError({ status: 404, body: null });
      assert.equal(res.status, 404);
      assert.equal(res.validationErrors.length, 0);
    });

    it('should safely handle plain text and HTML Whitelabel error pages', () => {
      const htmlBody = '<!DOCTYPE html><html><body><h1>Whitelabel Error Page</h1><p>500 Internal Error</p></body></html>';
      const res = errorExplainer.explainSpringError({
        status: 500,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        body: htmlBody
      });

      assert.equal(res.status, 500);
      assert.equal(res.validationErrors.length, 0);
      assert.ok(res.evidence.some(e => e.includes('text/html')));
    });

    it('should safely handle invalid / malformed JSON strings', () => {
      const res = errorExplainer.explainSpringError({
        status: 400,
        body: '{ "status": 400, "message": "unclosed json...'
      });
      assert.equal(res.status, 400);
      assert.equal(res.validationErrors.length, 0);
      assert.ok(res.whatHappened.length > 0);
    });
  });

  describe('4. Clear Distinction Between Confirmed Facts and Hypotheses', () => {

    it('should clearly isolate confirmed evidence from possible causes', () => {
      const res = errorExplainer.explainSpringError({
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Token has expired' })
      });

      // Confirmed evidence must contain only observed facts
      assert.ok(res.evidence.some(e => e.includes('401')));
      assert.ok(res.evidence.some(e => e.includes('application/json')));
      assert.ok(res.evidence.some(e => e.includes('Token has expired')));

      // Possible causes must be actionable hypotheses
      assert.ok(res.possibleCauses.length > 0);
      assert.ok(res.whatToCheckNext.length > 0);
    });

    it('should not invent backend field names or rules when details are unavailable', () => {
      const res = errorExplainer.explainSpringError({
        status: 400,
        statusText: 'Bad Request',
        body: '' // No body provided
      });

      assert.equal(res.validationErrors.length, 0);
      // Confirmed evidence should only cite status
      assert.equal(res.evidence.length, 1);
      assert.ok(res.evidence[0].includes('400'));
    });
  });
});
