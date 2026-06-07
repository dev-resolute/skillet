import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRunTestTool } from './run-test.js';
import { createStateManager } from '../state.js';
import type { StructuredRequest } from '../../types.js';

const get: StructuredRequest = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
const post: StructuredRequest = { method: 'POST', url: 'https://api.example.com/users', headers: {}, body: '{}' };

function run(tool: ReturnType<typeof createRunTestTool>, request: StructuredRequest) {
  return tool.execute('tool-call-1', request);
}

describe('run_test adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passing test: records the attempt, does not terminate', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"data":"ok"}',
    } as Response);
    const state = createStateManager({ maxRetries: 3 });
    const tool = createRunTestTool(state, 'api.example.com', {});

    const result = await run(tool, get);

    expect(result.content[0].text).toContain('TEST PASSED');
    expect(result.terminate).toBeUndefined();
    expect(state.getVerification().status).toBe('passed');
    expect(state.getVerification().attempts).toBe(1);
  });

  it('failing test: records the attempt, terminates only at maxRetries', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'err',
    } as Response);
    const state = createStateManager({ maxRetries: 2 });
    const tool = createRunTestTool(state, 'api.example.com', {});

    const first = await run(tool, get);
    expect(first.content[0].text).toContain('TEST FAILED');
    expect(first.terminate).toBe(false);

    const second = await run(tool, get);
    expect(second.terminate).toBe(true);
    expect(state.getVerification().attempts).toBe(2);
  });

  it('blocked mutating op: terminates immediately, never fetches, does not count it', async () => {
    const state = createStateManager({ maxRetries: 3 });
    const tool = createRunTestTool(state, 'api.example.com', {});

    const result = await run(tool, post);

    expect(result.content[0].text).toContain('TEST BLOCKED');
    expect(result.terminate).toBe(true);
    expect(state.getVerification().attempts).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('runs a mutating op when allowMutating is set', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => '{}',
    } as Response);
    const state = createStateManager({ maxRetries: 3 });
    const tool = createRunTestTool(state, 'api.example.com', {}, true);

    const result = await run(tool, post);

    expect(result.content[0].text).toContain('TEST PASSED');
    expect(state.getVerification().attempts).toBe(1);
  });
});
