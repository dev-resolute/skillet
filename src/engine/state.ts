import type { SkillFile, VerificationResult, StructuredRequest, ExecutionResult } from '../types.js';

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
  getVerification(): VerificationResult;
  recordTest(request: StructuredRequest, result: ExecutionResult): void;
  recordBlocked(request: StructuredRequest, reason: string): void;
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
    getVerification() {
      return { ...state.verification };
    },
    recordTest(request, result) {
      state.verification = {
        ...state.verification,
        status: result.ok ? 'passed' : 'failed',
        attempts: state.verification.attempts + 1,
        lastRequest: request,
        lastResponse: { status: result.status, body: result.body },
        report: result.error,
      };
    },
    recordBlocked(request, reason) {
      state.verification = {
        ...state.verification,
        status: 'failed',
        lastRequest: request,
        lastResponse: { status: 0, body: '' },
        report: reason,
      };
    },
    shouldTerminate() {
      return state.verification.attempts >= state.maxRetries || state.verification.status === 'passed';
    },
  };
}
