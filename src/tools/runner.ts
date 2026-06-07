/**
 * run_test — execute a structured request with host pinning and method classification.
 * NEVER runs a shell string; always uses fetch with a pinned host.
 */
import type { StructuredRequest } from '../types.js';

export type MethodClass = 'read' | 'mutating';

export function classifyMethod(method: string): MethodClass {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return 'read';
  if (m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE') return 'mutating';
  return 'mutating'; // unknown defaults to mutating
}

export interface ExecutionResult {
  ok: boolean;
  status: number;
  body: string;
  error?: string;
}

export interface RunnerOptions {
  apiDomain: string;
  credentials?: Record<string, string>;
  allowMutating?: boolean;
}

export async function runTest(
  request: StructuredRequest,
  options: RunnerOptions
): Promise<ExecutionResult> {
  const methodClass = classifyMethod(request.method);
  if (methodClass === 'mutating' && !options.allowMutating) {
    return {
      ok: false,
      status: 0,
      body: '',
      error: 'Mutating operations are not allowed for live testing by default.',
    };
  }

  // Host pinning: validate the URL's host matches the allowed domain
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return { ok: false, status: 0, body: '', error: 'Invalid URL' };
  }

  if (!isHostAllowed(url.host, options.apiDomain)) {
    return {
      ok: false,
      status: 0,
      body: '',
      error: `Host ${url.host} is not allowed. Expected domain: ${options.apiDomain}`,
    };
  }

  // Inject credentials into headers
  const headers = new Headers(request.headers);
  if (options.credentials) {
    for (const [key, value] of Object.entries(options.credentials)) {
      if (key.toLowerCase() === 'authorization' || key.toLowerCase().startsWith('x-')) {
        headers.set(key, value);
      } else {
        headers.set(key, value);
      }
    }
  }

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: request.body,
    });

    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      body: '',
      error: err.message || String(err),
    };
  }
}

function isHostAllowed(host: string, allowedDomain: string): boolean {
  const allowed = allowedDomain.toLowerCase();
  const h = host.toLowerCase();
  // Exact match or subdomain
  return h === allowed || h.endsWith('.' + allowed);
}
