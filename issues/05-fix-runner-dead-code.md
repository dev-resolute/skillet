# Fix Runner Dead Code

## Problem Statement

The `runTest` function in the runner module contains dead code — an `if/else` statement where both branches execute the same logic. This creates confusion for anyone reading the code, suggesting that special handling for auth headers was intended but never implemented. The current code implies a distinction that doesn't exist, making it harder to understand and maintain.

## Solution

Remove the redundant conditional and simplify the credential injection logic to a single loop that sets all headers uniformly.

## User Stories

1. As a developer reading the codebase, I want to understand the credential injection logic without being confused by a false conditional, so that I can reason about the code correctly.
2. As a developer maintaining the runner, I want to eliminate dead code, so that the codebase is clean and doesn't contain misleading branches.
3. As a developer reviewing code, I want to see clear intent in the credential injection, so that I can spot if there's a real bug or if the logic is intentionally uniform.

## Implementation Decisions

- **Simplify the credential injection loop**: Remove the `if/else` that branches on `Authorization` or `X-*` headers, since both branches do the same thing.
- **Preserve behavior**: The behavior after the fix is identical to the current behavior — all credentials are set as headers uniformly.
- **No interface changes**: The `RunnerOptions` and `ExecutionResult` interfaces remain unchanged.
- **No functional changes**: This is purely a cleanup refactor.

## Testing Decisions

- **Test existing behavior**: The existing `runner.test.ts` tests should continue to pass without modification, confirming that the simplified code behaves identically.
- **No new tests needed**: This is a pure refactor with no behavior change. The existing test suite already covers credential injection.

## Out of Scope

- No new features (e.g., selective header injection, credential filtering, etc.)
- No changes to the `classifyMethod` or `isHostAllowed` functions
- No changes to error handling or retry logic

## Further Notes

- This is a quick, low-risk cleanup. Should be a small commit.
- If future requirements require selective header injection (e.g., skip certain headers), that should be added explicitly with proper branching logic.
