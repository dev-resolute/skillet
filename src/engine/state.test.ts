import { describe, it, expect } from 'vitest';
import { createStateManager } from './state.js';

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

  it('updates verification status', () => {
    const state = createStateManager({ maxRetries: 3 });
    
    state.updateVerification({ status: 'passed' });
    
    expect(state.getVerification().status).toBe('passed');
    expect(state.getVerification().attempts).toBe(0); // unchanged
  });

  it('increments attempts', () => {
    const state = createStateManager({ maxRetries: 3 });
    
    state.incrementAttempts();
    state.incrementAttempts();
    
    expect(state.getAttempts()).toBe(2);
    expect(state.getVerification().attempts).toBe(2);
  });

  it('should terminate when max retries reached', () => {
    const state = createStateManager({ maxRetries: 2 });
    
    state.incrementAttempts();
    expect(state.shouldTerminate()).toBe(false); // 1 < 2
    
    state.incrementAttempts();
    expect(state.shouldTerminate()).toBe(true); // 2 >= 2
  });

  it('should terminate when status is passed', () => {
    const state = createStateManager({ maxRetries: 3 });
    
    state.updateVerification({ status: 'passed' });
    
    expect(state.shouldTerminate()).toBe(true);
  });
});
