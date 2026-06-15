import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDocs, fetchSpec } from './fetch.js';

describe('fetchDocs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('CONTEXT_DEV_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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

describe('fetchDocs via Context.dev', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('CONTEXT_DEV_API_KEY', 'ctxt_secret_test');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const scrapeOk = {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ success: true, markdown: '# Clean docs' }),
  } as unknown as Response;

  it('returns scraped markdown when the key is set', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(scrapeOk);

    const result = await fetchDocs('https://example.com/docs');
    expect(result).toBe('# Clean docs');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [scrapeUrl, init] = mockFetch.mock.calls[0]!;
    expect(String(scrapeUrl)).toContain('https://api.context.dev/v1/web/scrape/markdown');
    expect(String(scrapeUrl)).toContain(encodeURIComponent('https://example.com/docs'));
    expect(String(scrapeUrl)).toContain('useMainContentOnly=true');
    expect(init?.headers).toEqual({ authorization: 'Bearer ctxt_secret_test' });
  });

  it('retries once on 408 honoring Retry-After', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 408,
      statusText: 'Request Timeout',
      headers: new Headers({ 'retry-after': '0' }),
    } as Response);
    mockFetch.mockResolvedValueOnce(scrapeOk);

    const result = await fetchDocs('https://example.com/docs');
    expect(result).toBe('# Clean docs');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to raw fetch when the scrape fails outright', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Error',
      headers: new Headers(),
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>raw docs</html>',
    } as Response);

    const result = await fetchDocs('https://example.com/docs');
    expect(result).toBe('<html>raw docs</html>');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://example.com/docs',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('falling back to raw fetch'));
  });

  it('falls back to raw fetch when the retry is also rate-limited', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    const rateLimited = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({ 'retry-after': '0' }),
    } as Response;
    mockFetch.mockResolvedValueOnce(rateLimited);
    mockFetch.mockResolvedValueOnce(rateLimited);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>raw docs</html>',
    } as Response);

    const result = await fetchDocs('https://example.com/docs');
    expect(result).toBe('<html>raw docs</html>');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('falls back to raw fetch when the scraped markdown is empty', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, markdown: '   ' }),
    } as unknown as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>raw docs</html>',
    } as Response);

    const result = await fetchDocs('https://example.com/docs');
    expect(result).toBe('<html>raw docs</html>');
  });

  it('falls back to raw fetch when the response has no markdown', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: false }),
    } as unknown as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>raw docs</html>',
    } as Response);

    const result = await fetchDocs('https://example.com/docs');
    expect(result).toBe('<html>raw docs</html>');
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
