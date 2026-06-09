import { describe, it, expect } from 'vitest';
import type { StructuredRequest, AuthScheme } from './types.js';

describe('types', () => {
  it('StructuredRequest shape is correct', () => {
    const req: StructuredRequest = {
      method: 'GET',
      url: 'https://example.com/api/v1/users',
      headers: { 'Authorization': 'Bearer token' },
    };
    expect(req.method).toBe('GET');
    expect(req.url).toBe('https://example.com/api/v1/users');
  });

  it('AuthScheme can be bearer', () => {
    const auth: AuthScheme = { type: 'bearer', header: 'Authorization', envVars: ['EXAMPLE_API_TOKEN'] };
    expect(auth.type).toBe('bearer');
  });
});
