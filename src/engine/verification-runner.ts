import type { StructuredRequest } from '../types.js';
import { runTest, classifyMethod, type ExecutionResult } from '../tools/runner.js';

export interface VerificationContext {
  apiDomain: string;
  credentials?: Record<string, string>;
  maxRetries: number;
  currentAttempts: number;
  allowMutating?: boolean;
}

export interface VerificationOutcome {
  result: ExecutionResult;
  shouldTerminate: boolean;
  updatedAttempts: number;
}

export interface VerificationRunner {
  run(request: StructuredRequest, context: VerificationContext): Promise<VerificationOutcome>;
}

export function createVerificationRunner(): VerificationRunner {
  return {
    async run(request, context) {
      const methodClass = classifyMethod(request.method);
      
      if (methodClass === 'mutating' && !context.allowMutating) {
        return {
          result: {
            ok: false,
            status: 0,
            body: '',
            error: 'Mutating operations are not allowed for live testing by default.',
          },
          shouldTerminate: false,
          updatedAttempts: context.currentAttempts,
        };
      }

      const result = await runTest(request, {
        apiDomain: context.apiDomain,
        credentials: context.credentials,
        allowMutating: context.allowMutating,
      });

      const updatedAttempts = context.currentAttempts + 1;
      const shouldTerminate = updatedAttempts >= context.maxRetries;

      return {
        result,
        shouldTerminate,
        updatedAttempts,
      };
    },
  };
}
