import { Type } from '@earendil-works/pi-ai';
import type { StructuredRequest } from '../../types.js';
import type { StateManager } from '../state.js';
import type { VerificationRunner } from '../verification-runner.js';

export function createRunTestTool(
  stateManager: StateManager,
  runner: VerificationRunner,
  apiDomain: string,
  credentials: Record<string, string> = {},
  maxRetries: number = 3,
) {
  return {
    name: 'run_test',
    label: 'Run Test',
    description: 'Execute a structured HTTP request against the live API to verify the skill. Provide {method, url, headers, body}.',
    parameters: Type.Object({
      method: Type.String({ description: 'HTTP method' }),
      url: Type.String({ description: 'Full URL (host must match the API domain)' }),
      headers: Type.Object({}, { additionalProperties: Type.String(), description: 'Request headers' }),
      body: Type.Optional(Type.String({ description: 'Request body (JSON string)' })),
    }),
    execute: async (_toolCallId: string, params: unknown) => {
      const request = params as StructuredRequest;
      const result = await runner.run(request, {
        apiDomain,
        credentials,
        maxRetries,
        currentAttempts: stateManager.getAttempts(),
      });

      stateManager.incrementAttempts();
      stateManager.updateVerification({
        status: result.result.ok ? 'passed' : 'failed',
        lastRequest: request,
        lastResponse: { status: result.result.status, body: result.result.body },
        report: result.result.error,
      });

      if (result.result.ok) {
        return {
          content: [{ type: 'text' as const, text: `TEST PASSED (${result.result.status}): ${result.result.body.slice(0, 500)}` }],
          details: {},
        };
      } else {
        return {
          content: [{ type: 'text' as const, text: `TEST FAILED (${result.result.status}): ${result.result.error || result.result.body}` }],
          details: {},
          terminate: result.shouldTerminate,
        };
      }
    },
  };
}
