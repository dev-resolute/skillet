/**
 * fetch_docs and fetch_spec — raw HTTP fetch with sensible timeouts.
 */

const DEFAULT_TIMEOUT = 30000;

export async function fetchDocs(url: string, timeoutMs?: number): Promise<string> {
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

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
