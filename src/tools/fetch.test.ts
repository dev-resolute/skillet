import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDocs, fetchSpec } from './fetch.js';

describe('fetchDocs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns text for HTML response', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>docs</html>',
    } as Response);

    const result = await fetchDocs('https://example.com/docs');
    expect(result).toBe('<html>docs</html>');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/docs',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('returns stringified JSON for JSON response', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ openapi: '3.0.0' }),
    } as unknown as Response);

    const result = await fetchDocs('https://example.com/spec.json');
    expect(result).toContain('"openapi": "3.0.0"');
  });

  it('throws on non-ok status', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
    } as Response);

    await expect(fetchDocs('https://example.com/missing')).rejects.toThrow('404');
  });

  it('aborts after timeout', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    // Reject immediately when the signal is aborted
    mockFetch.mockImplementation(async (_url, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      return new Promise((_, reject) => {
        if (signal?.aborted) {
          reject(new Error('Aborted'));
          return;
        }
        signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    });

    await expect(fetchDocs('https://example.com/slow', 10)).rejects.toThrow('Aborted');
  });
});

describe('fetchSpec', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns raw text for YAML spec', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/yaml' }),
      text: async () => 'openapi: 3.0.0',
    } as Response);

    const result = await fetchSpec('https://example.com/openapi.yaml');
    expect(result).toBe('openapi: 3.0.0');
  });
});
