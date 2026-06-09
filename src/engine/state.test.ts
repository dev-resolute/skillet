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
  it('initializes one pending verification per Operation', () => {
    const state = createStateManager({ maxRetries: 3, operations: ['list users', 'get user'] });
    const ops = state.getOperations();

    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ operation: 'list users', status: 'pending', attempts: 0 });
    expect(ops[1]).toMatchObject({ operation: 'get user', status: 'pending', attempts: 0 });
    expect(state.getState().files).toEqual([]);
  });

  it('sets and returns files', () => {
    const state = createStateManager({ maxRetries: 3, operations: ['list users'] });
    const files = [{ path: 'SKILL.md', content: '---\nname: test\n---' }];

    state.setFiles(files);

    expect(state.getFiles()).toEqual(files);
  });

  it('recordTest success marks only that Operation passed and counts its Attempt', () => {
    const state = createStateManager({ maxRetries: 3, operations: ['list users', 'get user'] });

    state.recordTest('list users', request, okResult);

    const [listUsers, getUser] = state.getOperations();
    expect(listUsers).toMatchObject({ status: 'passed', attempts: 1 });
    expect(listUsers.lastResponse).toEqual({ status: 200, body: '{"data":"ok"}' });
    expect(getUser).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('recordTest failure marks that Operation failed with the report', () => {
    const state = createStateManager({ maxRetries: 3, operations: ['list users'] });

    state.recordTest('list users', request, failResult);

    expect(state.getOperations()[0]).toMatchObject({ status: 'failed', attempts: 1, report: 'Server error' });
  });

  it('Attempts are counted per Operation, not per Skill', () => {
    const state = createStateManager({ maxRetries: 2, operations: ['a', 'b'] });

    state.recordTest('a', request, failResult);
    state.recordTest('b', request, failResult);

    const [a, b] = state.getOperations();
    expect(a.attempts).toBe(1);
    expect(b.attempts).toBe(1);
    expect(state.shouldTerminate()).toBe(false);
  });

  it('a Block resolves only its Operation as blocked, consumes no Attempt, siblings continue', () => {
    const state = createStateManager({ maxRetries: 3, operations: ['list users', 'create user'] });

    state.recordBlocked('create user', request, 'Mutating operations are not live-tested by default.');

    const [listUsers, createUser] = state.getOperations();
    expect(createUser).toMatchObject({ status: 'blocked', attempts: 0 });
    expect(createUser.report).toContain('Mutating');
    expect(listUsers.status).toBe('pending');
    expect(state.shouldTerminate()).toBe(false);
  });

  it('terminates only when every Operation is resolved (passed, blocked, or exhausted)', () => {
    const state = createStateManager({ maxRetries: 2, operations: ['a', 'b', 'c'] });

    state.recordTest('a', request, okResult);
    expect(state.shouldTerminate()).toBe(false);

    state.recordBlocked('c', request, 'Mutating operations are not live-tested by default.');
    expect(state.shouldTerminate()).toBe(false);

    state.recordTest('b', request, failResult);
    expect(state.shouldTerminate()).toBe(false);

    state.recordTest('b', request, failResult);
    expect(state.shouldTerminate()).toBe(true);
  });

  it('terminates when all Operations pass', () => {
    const state = createStateManager({ maxRetries: 3, operations: ['a', 'b'] });

    state.recordTest('a', request, okResult);
    state.recordTest('b', request, okResult);

    expect(state.shouldTerminate()).toBe(true);
  });
});
