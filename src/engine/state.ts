import type { SkillFile, VerificationResult } from '../types.js';

export interface StateConfig {
  maxRetries: number;
}

export interface GenerationState {
  files: SkillFile[];
  verification: VerificationResult;
  maxRetries: number;
}

export interface StateManager {
  getState(): GenerationState;
  setFiles(files: SkillFile[]): void;
  getFiles(): SkillFile[];
  updateVerification(update: Partial<VerificationResult>): void;
  getVerification(): VerificationResult;
  incrementAttempts(): void;
  getAttempts(): number;
  shouldTerminate(): boolean;
}

export function createStateManager(config: StateConfig): StateManager {
  const state: GenerationState = {
    files: [],
    verification: {
      status: 'skipped',
      attempts: 0,
    },
    maxRetries: config.maxRetries,
  };

  return {
    getState() {
      return { ...state, verification: { ...state.verification } };
    },
    setFiles(files) {
      state.files = [...files];
    },
    getFiles() {
      return [...state.files];
    },
    updateVerification(update) {
      state.verification = { ...state.verification, ...update };
    },
    getVerification() {
      return { ...state.verification };
    },
    incrementAttempts() {
      state.verification.attempts += 1;
    },
    getAttempts() {
      return state.verification.attempts;
    },
    shouldTerminate() {
      return state.verification.attempts >= state.maxRetries || state.verification.status === 'passed';
    },
  };
}
