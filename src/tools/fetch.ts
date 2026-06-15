/**
 * fetch_docs and fetch_spec — docs arrive as clean Markdown via Context.dev
 * when CONTEXT_DEV_API_KEY is set, raw HTTP otherwise (see ADR 0005).
 * Specs are always fetched raw: they must arrive byte-exact.
 */

const DEFAULT_TIMEOUT = 30000;
const SCRAPE_ENDPOINT = 'https://api.context.dev/v1/web/scrape/markdown';
// Cold renders of JS-heavy pages can exceed the default timeout; aborting
// early would skip the documented 408-retry path entirely.
const SCRAPE_MIN_TIMEOUT = 60000;
const RETRY_FALLBACK_MS = 2000;
const RETRY_CAP_S = 30;

export async function fetchDocs(url: string, timeoutMs?: number): Promise<string> {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (apiKey) {
    try {
      return await scrapeMarkdown(url, apiKey, Math.max(timeoutMs ?? DEFAULT_TIMEOUT, SCRAPE_MIN_TIMEOUT));
    } catch (err) {
      console.warn(
        `fetchDocs: Context.dev scrape failed (${err instanceof Error ? err.message : err}); falling back to raw fetch`
      );
    }
  }
  const res = await fetchWithTimeout(url, timeoutMs ?? DEFAULT_TIMEOUT);
  if (!res.ok) {
    throw new Error(`fetchDocs failed: ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get('content-type') || '';
  // If the server returns JSON, stringify it; otherwise return text.
  if (contentType.includes('application/json')) {
    return JSON.stringify(await res.json(), null, 2);
  }
  return res.text();
}

export async function fetchSpec(url: string, timeoutMs?: number): Promise<string> {
  const res = await fetchWithTimeout(url, timeoutMs ?? DEFAULT_TIMEOUT);
  if (!res.ok) {
    throw new Error(`fetchSpec failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function scrapeMarkdown(url: string, apiKey: string, timeoutMs: number): Promise<string> {
  let res = await scrapeOnce(url, apiKey, timeoutMs);
  if (res.status === 408 || res.status === 429) {
    await sleep(retryDelayMs(res.headers.get('retry-after')));
    res = await scrapeOnce(url, apiKey, timeoutMs);
  }
  if (!res.ok) {
    throw new Error(`Context.dev scrape failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { success?: boolean; markdown?: string };
  if (!body.success || typeof body.markdown !== 'string' || body.markdown.trim() === '') {
    throw new Error('Context.dev scrape returned no markdown');
  }
  return body.markdown;
}

function scrapeOnce(url: string, apiKey: string, timeoutMs: number): Promise<Response> {
  const endpoint = new URL(SCRAPE_ENDPOINT);
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('useMainContentOnly', 'true');
  return fetchWithTimeout(endpoint.toString(), timeoutMs, {
    authorization: `Bearer ${apiKey}`,
  });
}

function retryDelayMs(retryAfter: string | null): number {
  if (retryAfter === null) return RETRY_FALLBACK_MS;
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds < 0) return RETRY_FALLBACK_MS;
  return Math.min(seconds, RETRY_CAP_S) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  ms: number,
  headers?: Record<string, string>
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}
