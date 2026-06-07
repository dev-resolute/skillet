import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifyMethod, runTest } from './runner.js';
import type { StructuredRequest } from '../types.js';

describe('classifyMethod', () => {
  it('classifies GET as read', () => {
    expect(classifyMethod('GET')).toBe('read');
    expect(classifyMethod('get')).toBe('read');
  });

  it('classifies HEAD as read', () => {
    expect(classifyMethod('HEAD')).toBe('read');
  });

  it('classifies OPTIONS as read', () => {
    expect(classifyMethod('OPTIONS')).toBe('read');
  });

  it('classifies POST as mutating', () => {
    expect(classifyMethod('POST')).toBe('mutating');
  });

  it('classifies PUT/PATCH/DELETE as mutating', () => {
    expect(classifyMethod('PUT')).toBe('mutating');
    expect(classifyMethod('PATCH')).toBe('mutating');
    expect(classifyMethod('DELETE')).toBe('mutating');
  });

  it('classifies unknown methods as mutating', () => {
    expect(classifyMethod('TRACE')).toBe('mutating');
    expect(classifyMethod('CUSTOM')).toBe('mutating');
  });
});

describe('runTest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const baseRequest: StructuredRequest = {
    method: 'GET',
    url: 'https://api.example.com/v1/users',
    headers: {},
  };

  it('blocks off-domain URLs', async () => {
    const req = { ...baseRequest, url: 'https://evil.com/hack' };
    const result = await runTest(req, { apiDomain: 'api.example.com' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('allows exact domain match', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"users":[]}',
    } as Response);

    const result = await runTest(baseRequest, { apiDomain: 'api.example.com' });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('allows subdomain match', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response);

    const req = { ...baseRequest, url: 'https://sub.api.example.com/v1/users' };
    const result = await runTest(req, { apiDomain: 'api.example.com' });
    expect(result.ok).toBe(true);
  });

  it('blocks mutating ops by default', async () => {
    const req = { ...baseRequest, method: 'POST', url: 'https://api.example.com/v1/users' };
    const result = await runTest(req, { apiDomain: 'api.example.com' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Mutating operations');
  });

  it('allows mutating ops when allowMutating is true', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => '{}',
    } as Response);

    const req = { ...baseRequest, method: 'POST', url: 'https://api.example.com/v1/users' };
    const result = await runTest(req, { apiDomain: 'api.example.com', allowMutating: true });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
  });

  it('injects credentials into headers', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response);

    const req = { ...baseRequest };
    await runTest(req, {
      apiDomain: 'api.example.com',
      credentials: { Authorization: 'Bearer token123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/users',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    const call = mockFetch.mock.calls[0];
    const headers = call[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token123');
  });

  it('returns error on fetch failure', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await runTest(baseRequest, { apiDomain: 'api.example.com' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network failure');
  });

  it('returns error on invalid URL', async () => {
    const req = { ...baseRequest, url: 'not-a-url' };
    const result = await runTest(req, { apiDomain: 'api.example.com' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid URL');
  });

  it('preserves existing headers', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response);

    const req = { ...baseRequest, headers: { 'X-Custom': 'value' } };
    await runTest(req, { apiDomain: 'api.example.com' });

    const call = mockFetch.mock.calls[0];
    const headers = call[1]?.headers as Headers;
    expect(headers.get('X-Custom')).toBe('value');
  });
});
