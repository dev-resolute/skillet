# Extract VerificationRunner module

## What to build

Create a new `src/engine/verification-runner.ts` module that handles executing verification tests against APIs. The module should provide:

- A `VerificationRunner` class or factory function that executes structured HTTP requests
- Integration with the existing `runner.ts` for low-level HTTP execution
- Method classification logic (read vs mutating operations)
- Host pinning validation
- Credential injection
- Attempt tracking and retry logic
- Termination decision logic (when to stop retrying)
- A structured `VerificationOutcome` return type

The VerificationRunner should wrap the existing `runner.ts` and add state management and termination logic on top. It should not know about the Agent or tool interfaces.

## Why (motivation)

**Problem**: Currently, verification logic is scattered across two places:
1. `src/tools/runner.ts` - low-level HTTP execution with host pinning
2. `runTestTool` factory in `generate.ts` - attempt tracking, termination logic, tool interface

This makes it:
- Impossible to test termination logic without mocking the Agent
- Hard to understand the full verification flow (split across files)
- Difficult to modify retry/termination strategies
- Coupled to the pi-agent-core tool interface

**Solution**: Extract verification execution into a dedicated module that wraps `runner.ts` and adds state management. This creates a deep, testable module that encapsulates the entire verification process.

**User stories addressed**:
- As a developer, I want to test verification execution logic independently, so that I can verify host pinning and retry logic without LLM mocking
- As a developer, I want to add new test cases for edge cases (e.g., network timeouts, invalid responses), so that the code is more robust
- As a developer, I want to reuse the VerificationRunner in a standalone CLI tool, so that users can manually verify skills
- As a developer, I want to swap out the verification strategy (e.g., use a different HTTP client), so that I can test against different environments
- As a developer, I want to change the verification retry logic, so that I can implement exponential backoff or different termination conditions
- As a developer, I want to debug verification failures by testing the runner directly, so that I can isolate the issue
- As a developer, I want to profile the verification process, so that I can identify performance bottlenecks

## Acceptance criteria

- [ ] Create `src/engine/verification-runner.ts` with `VerificationRunner` implementation
- [ ] Define `VerificationContext` interface (apiDomain, credentials, maxRetries, currentAttempts)
- [ ] Define `VerificationOutcome` interface (result, shouldTerminate, updatedAttempts)
- [ ] Integrate with existing `runner.ts` for HTTP execution
- [ ] Implement method classification (read vs mutating)
- [ ] Implement host pinning validation (delegate to runner.ts)
- [ ] Implement attempt tracking and increment logic
- [ ] Implement termination decision logic (maxRetries, success/failure states)
- [ ] Write comprehensive unit tests in `src/engine/verification-runner.test.ts`
- [ ] Tests mock `runner.ts` to isolate VerificationRunner logic
- [ ] Tests cover: successful requests, failed requests, mutating operations, host pinning, retry logic, termination decisions
- [ ] All new code is TypeScript with proper types
- [ ] No breaking changes to existing functionality (this is a new module, not yet integrated)

## Blocked by

None - can start immediately.

## Dependencies

- **Blocks**: Issue #4 (Integration)
- **Depends on**: None (but will use the existing `runner.ts` module)

## Notes

- This module wraps the existing `runner.ts` - don't duplicate the HTTP logic
- The existing `runner.ts` has a bug (lines 52-56 have identical if/else branches) - you can fix this as part of the integration, or note it for a future cleanup
- Keep the interface focused on verification execution - don't add caching, batching, or other optimizations yet
- The `shouldTerminate` logic should match the current behavior in `runTestTool`
- Consider whether VerificationRunner should accept a StateManager or just track attempts internally (PRD suggests it tracks internally)
