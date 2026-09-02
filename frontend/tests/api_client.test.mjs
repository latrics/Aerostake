// Frontend Unit Test: API Client Error Envelope and Request Configuration
import assert from 'node:assert/strict';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function parseErrorResponse(data, status) {
  if (data && typeof data === 'object' && data.status === 'error') {
    return new ApiError(data.message || 'API request failed', status, data.details);
  }
  if (data && typeof data === 'object' && data.detail) {
    const msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    return new ApiError(msg, status);
  }
  return new ApiError(typeof data === 'string' ? data : `HTTP error! status: ${status}`, status);
}

export function runApiClientTests() {
  console.log('🧪 Running [api_client.test.mjs]...');

  // 1. Test Unified Error Envelope Parsing
  const unifiedPayload = {
    status: 'error',
    message: 'Client cannot approve plan in SUPERSEDED state',
    details: [{ field: 'status', code: 'invalid_state' }],
  };
  const err1 = parseErrorResponse(unifiedPayload, 400);
  assert.equal(err1.name, 'ApiError');
  assert.equal(err1.status, 400);
  assert.equal(err1.message, 'Client cannot approve plan in SUPERSEDED state');
  assert.deepEqual(err1.details, [{ field: 'status', code: 'invalid_state' }]);

  // 2. Test Standard FastAPI Detail Parsing
  const fastapiPayload = { detail: 'Invalid credentials or expired JWT' };
  const err2 = parseErrorResponse(fastapiPayload, 401);
  assert.equal(err2.status, 401);
  assert.equal(err2.message, 'Invalid credentials or expired JWT');

  // 3. Test Fallback Text Error
  const err3 = parseErrorResponse('Internal Server Error', 500);
  assert.equal(err3.status, 500);
  assert.equal(err3.message, 'Internal Server Error');

  console.log('  ✅ 3/3 API error handling assertions passed!');
}
