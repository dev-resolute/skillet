import type { SkillFile, OperationVerification, StructuredRequest, ExecutionResult } from '../types.js';

export interface StateConfig {
  maxRetries: number;
  operations: string[];
}

export interface GenerationState {
  files: SkillFile[];
  operations: OperationVerification[];
  maxRetries: number;
}

export interface StateManager {
  getState(): GenerationState;
  setFiles(files: SkillFile[]): void;
  getFiles(): SkillFile[];
  getOperations(): OperationVerification[];
  recordTest(operation: string, request: StructuredRequest, result: ExecutionResult): void;
  recordBlocked(operation: string, request: StructuredRequest, reason: string): void;
  shouldTerminate(): boolean;
}

export function createStateManager(config: StateConfig): StateManager {
  let files: SkillFile[] = [];
  const operations = new Map<string, OperationVerification>(
    config.operations.map((name) => [name, { operation: name, status: 'pending' as const, attempts: 0 }])
  );

  function get(operation: string): OperationVerification {
    const v = operations.get(operation);
    if (!v) throw new Error(`Unknown operation: ${operation}`);
    return v;
  }

  function isResolved(v: OperationVerification): boolean {
    return v.status === 'passed' || v.status === 'blocked' || v.attempts >= config.maxRetries;
  }

  return {
    getState() {
      return { files: [...files], operations: this.getOperations(), maxRetries: config.maxRetries };
    },
    setFiles(next) {
      files = [...next];
    },
    getFiles() {
      return [...files];
    },
    getOperations() {
      return Array.from(operations.values()).map((v) => ({ ...v }));
    },
    recordTest(operation, request, result) {
      const v = get(operation);
      operations.set(operation, {
        ...v,
        status: result.ok ? 'passed' : 'failed',
        attempts: v.attempts + 1,
        lastRequest: request,
        lastResponse: { status: result.status, body: result.body },
        report: result.error,
      });
    },
    recordBlocked(operation, request, reason) {
      const v = get(operation);
      operations.set(operation, {
        ...v,
        status: 'blocked',
        lastRequest: request,
        report: reason,
      });
    },
    shouldTerminate() {
      return Array.from(operations.values()).every(isResolved);
    },
  };
}
