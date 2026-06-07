import { describe, it, expect, vi } from 'vitest';
import { createVerificationRunner } from './verification-runner.js';
import type { StructuredRequest } from '../types.js';

describe('VerificationRunner', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('executes GET request successfully', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"data": "ok"}',
    } as Response);

    const runner = createVerificationRunner();
    const request: StructuredRequest = {
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      headers: {},
    };

    const result = await runner.run(request, {
      apiDomain: 'api.example.com',
      credentials: {},
      maxRetries: 3,
      currentAttempts: 0,
    });

    expect(result.result.ok).toBe(true);
    expect(result.result.status).toBe(200);
    expect(result.updatedAttempts).toBe(1);
    expect(result.shouldTerminate).toBe(false); // 1 < 3
  });

  it('skips mutating operations by default', async () => {
    const runner = createVerificationRunner();
    const request: StructuredRequest = {
      method: 'POST',
      url: 'https://api.example.com/v1/users',
      headers: {},
      body: '{}',
    };

    const result = await runner.run(request, {
      apiDomain: 'api.example.com',
      credentials: {},
      maxRetries: 3,
      currentAttempts: 0,
    });

    expect(result.result.ok).toBe(false);
    expect(result.result.error).toContain('Mutating operations');
    expect(result.updatedAttempts).toBe(0); // not incremented
    expect(result.shouldTerminate).toBe(false);
  });

  it('returns shouldTerminate when maxRetries reached', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response);

    const runner = createVerificationRunner();
    const request: StructuredRequest = {
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      headers: {},
    };

    const result = await runner.run(request, {
      apiDomain: 'api.example.com',
      credentials: {},
      maxRetries: 2,
      currentAttempts: 1,
    });

    expect(result.updatedAttempts).toBe(2);
    expect(result.shouldTerminate).toBe(true); // 2 >= 2
  });

  it('handles failed requests', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const runner = createVerificationRunner();
    const request: StructuredRequest = {
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      headers: {},
    };

    const result = await runner.run(request, {
      apiDomain: 'api.example.com',
      credentials: {},
      maxRetries: 3,
      currentAttempts: 0,
    });

    expect(result.result.ok).toBe(false);
    expect(result.result.error).toBe('Network error');
    expect(result.updatedAttempts).toBe(1);
    expect(result.shouldTerminate).toBe(false);
  });
});
