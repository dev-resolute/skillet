import { describe, it, expect } from 'vitest';
import { createStateManager } from './state.js';
import type { StructuredRequest, ExecutionResult } from '../types.js';

const request: StructuredRequest = {
  method: 'GET',
  url: 'https://api.example.com/v1/users',
  headers: {},
};
const okResult: ExecutionResult = { ok: true, status: 200, body: '{"data":"ok"}' };
const failResult: ExecutionResult = { ok: false, status: 500, body: 'oops', error: 'Server error' };

describe('StateManager', () => {
  it('initializes with empty state', () => {
    const state = createStateManager({ maxRetries: 3 });
    const current = state.getState();

    expect(current.files).toEqual([]);
    expect(current.verification.status).toBe('skipped');
    expect(current.verification.attempts).toBe(0);
    expect(current.maxRetries).toBe(3);
  });

  it('sets and returns files', () => {
    const state = createStateManager({ maxRetries: 3 });
    const files = [{ path: 'SKILL.md', content: '---\nname: test\n---' }];

    state.setFiles(files);

    expect(state.getFiles()).toEqual(files);
    expect(state.getState().files).toEqual(files);
  });

  it('recordTest on success marks passed, stores the response, counts the attempt', () => {
    const state = createStateManager({ maxRetries: 3 });

    state.recordTest(request, okResult);

    const v = state.getVerification();
    expect(v.status).toBe('passed');
    expect(v.attempts).toBe(1);
    expect(v.lastRequest).toEqual(request);
    expect(v.lastResponse).toEqual({ status: 200, body: '{"data":"ok"}' });
  });

  it('recordTest on failure marks failed and counts the attempt', () => {
    const state = createStateManager({ maxRetries: 3 });

    state.recordTest(request, failResult);

    const v = state.getVerification();
    expect(v.status).toBe('failed');
    expect(v.attempts).toBe(1);
    expect(v.report).toBe('Server error');
  });

  it('recordBlocked marks failed WITHOUT counting an attempt', () => {
    const state = createStateManager({ maxRetries: 3 });

    state.recordBlocked(request, 'Mutating operations are not live-tested by default.');

    const v = state.getVerification();
    expect(v.status).toBe('failed');
    expect(v.attempts).toBe(0);
    expect(v.report).toContain('Mutating');
  });

  it('terminates when max retries reached', () => {
    const state = createStateManager({ maxRetries: 2 });

    state.recordTest(request, failResult);
    expect(state.shouldTerminate()).toBe(false);

    state.recordTest(request, failResult);
    expect(state.shouldTerminate()).toBe(true);
  });

  it('terminates when a test passes', () => {
    const state = createStateManager({ maxRetries: 3 });

    state.recordTest(request, okResult);

    expect(state.shouldTerminate()).toBe(true);
  });
});
