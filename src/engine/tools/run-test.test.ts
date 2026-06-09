import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRunTestTool } from './run-test.js';
import { createStateManager } from '../state.js';
import type { StructuredRequest } from '../../types.js';

const get: StructuredRequest = { method: 'GET', url: 'https://api.example.com/users', headers: {} };
const post: StructuredRequest = { method: 'POST', url: 'https://api.example.com/users', headers: {}, body: '{}' };

function run(tool: ReturnType<typeof createRunTestTool>, operation: string, request: StructuredRequest) {
  return tool.execute('tool-call-1', { operation, ...request });
}

describe('run_test adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passing test: records the Attempt on that Operation, does not terminate while siblings pend', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"data":"ok"}',
    } as Response);
    const state = createStateManager({ maxRetries: 3, operations: ['list users', 'get user'] });
    const tool = createRunTestTool(state, 'api.example.com', {});

    const result = await run(tool, 'list users', get);

    expect(result.content[0].text).toContain('TEST PASSED');
    expect(result.terminate).toBeFalsy();
    expect(state.getOperations()[0]).toMatchObject({ status: 'passed', attempts: 1 });
    expect(state.getOperations()[1]).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('failing test: terminates only when every Operation is resolved', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'err',
    } as Response);
    const state = createStateManager({ maxRetries: 2, operations: ['list users'] });
    const tool = createRunTestTool(state, 'api.example.com', {});

    const first = await run(tool, 'list users', get);
    expect(first.content[0].text).toContain('TEST FAILED');
    expect(first.terminate).toBe(false);

    const second = await run(tool, 'list users', get);
    expect(second.terminate).toBe(true);
    expect(state.getOperations()[0].attempts).toBe(2);
  });

  it('Block resolves the mutating Operation, never fetches, and siblings continue', async () => {
    const state = createStateManager({ maxRetries: 3, operations: ['list users', 'create user'] });
    const tool = createRunTestTool(state, 'api.example.com', {});

    const result = await run(tool, 'create user', post);

    expect(result.content[0].text).toContain('TEST BLOCKED');
    expect(result.terminate).toBe(false);
    expect(state.getOperations()[1]).toMatchObject({ status: 'blocked', attempts: 0 });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('Block on the last unresolved Operation terminates', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response);
    const state = createStateManager({ maxRetries: 3, operations: ['list users', 'create user'] });
    const tool = createRunTestTool(state, 'api.example.com', {});

    await run(tool, 'list users', get);
    const result = await run(tool, 'create user', post);

    expect(result.content[0].text).toContain('TEST BLOCKED');
    expect(result.terminate).toBe(true);
  });

  it('unknown Operation name returns a corrective error without recording anything', async () => {
    const state = createStateManager({ maxRetries: 3, operations: ['list users'] });
    const tool = createRunTestTool(state, 'api.example.com', {});

    const result = await run(tool, 'delete everything', get);

    expect(result.content[0].text).toContain('Unknown operation');
    expect(result.content[0].text).toContain('list users');
    expect(state.getOperations()[0]).toMatchObject({ status: 'pending', attempts: 0 });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('runs a mutating Operation when allowMutating is set', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => '{}',
    } as Response);
    const state = createStateManager({ maxRetries: 3, operations: ['create user'] });
    const tool = createRunTestTool(state, 'api.example.com', {}, true);

    const result = await run(tool, 'create user', post);

    expect(result.content[0].text).toContain('TEST PASSED');
    expect(state.getOperations()[0]).toMatchObject({ status: 'passed', attempts: 1 });
  });
});
