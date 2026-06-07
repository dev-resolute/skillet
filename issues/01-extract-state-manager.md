# Extract StateManager module

## What to build

Create a new `src/engine/state.ts` module that encapsulates all state management for skill generation. The module should provide:

- A `StateManager` class or factory function that manages the mutable state during generation
- Methods to get/set skill files, update verification results, track attempts, and determine termination
- Type definitions for `GenerationState` and related interfaces
- Pure functions where possible (state transitions should be predictable and testable)

The StateManager should be the single source of truth for generation state, replacing the inline `GenerationContext` object in `generate.ts`.

## Why (motivation)

**Problem**: Currently, state management is scattered across `generate.ts`. The `GenerationContext` object is created inline, mutated by tool factories, and has no clear interface or validation. This makes it:

- Impossible to test state transitions without running the full Agent
- Hard to understand what state exists and how it changes
- Difficult to add new state fields or validation logic
- Coupled to the tool factories (they directly mutate the context)

**Solution**: Extract state management into a dedicated module with a clear interface. This creates a deep, testable module that other parts of the system can depend on.

**User stories addressed**:
- As a developer, I want to test state management logic separately, so that I can verify state transitions are correct
- As a developer, I want to understand state transitions explicitly, so that I can debug state-related issues
- As a developer, I want to modify state management without affecting tool registration, so that I can evolve the state schema independently
- As a developer, I want to inspect state at any point in the generation process, so that I can understand what went wrong
- As a developer, I want to log state transitions, so that I can trace the execution flow

## Acceptance criteria

- [ ] Create `src/engine/state.ts` with `StateManager` implementation
- [ ] Define clear interface for state operations (get/set files, update verification, increment attempts, check termination)
- [ ] State transitions are validated (e.g., can't set negative attempts)
- [ ] `shouldTerminate()` logic correctly implements the retry/termination rules from the PRD
- [ ] Write comprehensive unit tests in `src/engine/state.test.ts`
- [ ] Tests cover: initialization, file updates, verification updates, attempt counting, termination logic
- [ ] Tests verify state immutability (getState returns a snapshot, not a reference)
- [ ] All new code is TypeScript with proper types
- [ ] No breaking changes to existing functionality (this is a new module, not yet integrated)

## Blocked by

None - can start immediately.

## Dependencies

- **Blocks**: Issue #2 (SkillWriter), Issue #3 (VerificationRunner), Issue #4 (Integration)
- **Depends on**: None

## Notes

- This is the foundational module - other modules will depend on it
- Keep the interface minimal and focused on state operations only
- Don't add features that aren't in the PRD (no metrics, no timing data yet)
- Follow the principle: "One adapter = hypothetical seam. Two adapters = real seam." - for now, StateManager has one "adapter" (the inline context), but we're creating the seam for future use
