import type { StructuredRequest, VerificationContext, VerificationOutcome } from '../types.js';
import { runTest, classifyMethod } from '../tools/runner.js';

export type { VerificationContext, VerificationOutcome } from '../types.js';

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
