import { describe, it, expect, vi } from 'vitest';
import { createRunTestTool } from './run-test.js';
import type { StructuredRequest } from '../../types.js';

// Create mock state manager
function createMockStateManager() {
  const state = {
    verification: { status: 'skipped' as const, attempts: 0 },
  };
  return {
    getVerification: () => ({ ...state.verification }),
    updateVerification: (update: any) => {
      state.verification = { ...state.verification, ...update };
    },
    incrementAttempts: () => {
      state.verification.attempts += 1;
    },
    getAttempts: () => state.verification.attempts,
    shouldTerminate: () => false,
  };
}

// Create mock verification runner
function createMockVerificationRunner() {
  return {
    run: vi.fn().mockResolvedValue({
      result: { ok: true, status: 200, body: '{"data": "ok"}' },
      shouldTerminate: false,
      updatedAttempts: 1,
    }),
  };
}

describe('run_test adapter', () => {
  it('delegates to VerificationRunner and updates state', async () => {
    const stateManager = createMockStateManager();
    const runner = createMockVerificationRunner();
    const tool = createRunTestTool(stateManager, runner);

    const request: StructuredRequest = {
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      headers: {},
    };

    const result = await tool.execute!('tool-call-1', request, new AbortController().signal, undefined);

    expect(runner.run).toHaveBeenCalledWith(request, expect.any(Object));
    expect(stateManager.getAttempts()).toBe(1);
    expect(result.content[0].text).toContain('TEST PASSED');
  });
});
