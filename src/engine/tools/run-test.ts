import { Type } from '@earendil-works/pi-ai';
import type { StructuredRequest } from '../../types.js';
import type { StateManager } from '../state.js';
import { runTest, classifyMethod } from '../../tools/runner.js';

export function createRunTestTool(
  stateManager: StateManager,
  apiDomain: string,
  credentials: Record<string, string> = {},
  allowMutating: boolean = false,
) {
  return {
    name: 'run_test',
    label: 'Run Test',
    description:
      'Execute a structured HTTP request against the live API to verify one Operation of the skill. Provide {operation, method, url, headers, body}.',
    parameters: Type.Object({
      operation: Type.String({ description: 'The Operation this test verifies (must match one of the requested operations exactly)' }),
      method: Type.String({ description: 'HTTP method' }),
      url: Type.String({ description: 'Full URL (host must match the API domain)' }),
      headers: Type.Object({}, { additionalProperties: Type.String(), description: 'Request headers' }),
      body: Type.Optional(Type.String({ description: 'Request body (JSON string)' })),
    }),
    execute: async (_toolCallId: string, params: unknown) => {
      const { operation, ...request } = params as StructuredRequest & { operation: string };

      const known = stateManager.getOperations().map((v) => v.operation);
      if (!known.includes(operation)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Unknown operation "${operation}". Valid operations: ${known.join(', ')}`,
            },
          ],
          details: {},
        };
      }

      if (classifyMethod(request.method) === 'mutating' && !allowMutating) {
        const reason = 'Mutating operations are not live-tested by default.';
        stateManager.recordBlocked(operation, request, reason);
        return {
          content: [
            {
              type: 'text' as const,
              text: `TEST BLOCKED: ${reason} The operation "${operation}" ships unverified; continue with the remaining operations.`,
            },
          ],
          details: {},
          terminate: stateManager.shouldTerminate(),
        };
      }

      const result = await runTest(request, { apiDomain, credentials, allowMutating });
      stateManager.recordTest(operation, request, result);

      if (result.ok) {
        return {
          content: [{ type: 'text' as const, text: `TEST PASSED (${result.status}): ${result.body.slice(0, 500)}` }],
          details: {},
          terminate: stateManager.shouldTerminate(),
        };
      }
      return {
        content: [{ type: 'text' as const, text: `TEST FAILED (${result.status}): ${result.error || result.body}` }],
        details: {},
        terminate: stateManager.shouldTerminate(),
      };
    },
  };
}
