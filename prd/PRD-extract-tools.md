# PRD: Extract Tool Implementations

## Problem Statement

The current architecture has tool implementations tightly coupled to the Agent loop in `generate.ts`. The tool factories (`writeSkillFilesTool`, `runTestTool`) both define the pi-agent-core interface AND implement business logic. This creates several issues:

1. **Untestable core logic**: The file writing, verification execution, and state management logic cannot be tested without instantiating an Agent with a mocked LLM provider
2. **Shallow modules**: The tool factories are shallow - their interface (pi-agent-core tool registration) is nearly as complex as their implementation (business logic)
3. **Poor locality**: Verification logic is scattered across tool factories and `runner.ts`, making it hard to understand and modify
4. **No reuse**: The same logic cannot be used by different agent frameworks or CLI tools
5. **Tight coupling**: Tools directly mutate a shared `GenerationContext`, creating implicit dependencies

The deletion test fails: if you delete these tool factories, the verification and file-writing logic vanishes entirely. But the logic is real—it's just trapped inside the tool registration code.

## Solution

Extract tool implementations into separate, deep modules with clear interfaces. Create thin adapters that wrap these modules for pi-agent-core integration. This separates concerns and makes the business logic independently testable.

**Before**: Tools are defined inline in `generate.ts` as factory functions that both register with pi-agent-core AND implement business logic.

**After**: Deep modules (`SkillWriter`, `VerificationRunner`, `GenerationState`) handle the business logic. Thin adapter functions convert between pi-agent-core's tool interface and our modules.

## User Stories

### Developer Testing
1. As a developer, I want to test file writing logic in isolation, so that I can verify it works without mocking the entire Agent
2. As a developer, I want to test verification execution logic independently, so that I can verify host pinning and retry logic without LLM mocking
3. As a developer, I want to test state management logic separately, so that I can verify state transitions are correct
4. As a developer, I want unit tests that don't require faux LLM providers, so that tests run faster and are easier to understand
5. As a developer, I want to add new test cases for edge cases (e.g., invalid file paths, network timeouts), so that the code is more robust

### Developer Extending
6. As a developer, I want to add new tools (e.g., `validateSchema`, `generateDocs`), so that the Agent can perform additional verification steps
7. As a developer, I want to reuse the SkillWriter module in a different context (e.g., batch skill generation), so that I don't duplicate file writing logic
8. As a developer, I want to reuse the VerificationRunner in a standalone CLI tool, so that users can manually verify skills
9. As a developer, I want to swap out the verification strategy (e.g., use a different HTTP client), so that I can test against different environments
10. As a developer, I want to add new state fields (e.g., generation metrics, timing data), so that I can track performance

### Developer Understanding
11. As a developer, I want to understand what the verification logic does without reading the pi-agent-core tool interface, so that I can reason about it independently
12. As a developer, I want to see clear interfaces for each module, so that I know what each module does and how to use it
13. As a developer, I want to find the file writing logic in one place, so that I don't have to search through multiple files
14. As a developer, I want to understand state transitions explicitly, so that I can debug state-related issues
15. As a developer, I want to read documentation for each module, so that I can quickly understand its purpose and usage

### Developer Modifying
16. As a developer, I want to change the verification retry logic, so that I can implement exponential backoff or different termination conditions
17. As a developer, I want to change how files are written (e.g., add validation, compress output), so that I can improve the output quality
18. As a developer, I want to add logging or metrics to the verification process, so that I can monitor its behavior
19. As a developer, I want to modify state management without affecting tool registration, so that I can evolve the state schema independently
20. As a developer, I want to test different termination strategies, so that I can optimize the Agent's behavior

### Developer Maintaining
21. As a developer, I want to refactor the tool registration without affecting business logic, so that I can upgrade to new versions of pi-agent-core
22. As a developer, I want to add new pi-agent-core tool features (e.g., streaming, cancellation), so that I can improve the user experience
23. As a developer, I want to remove unused tool features, so that the code is simpler
24. As a developer, I want to migrate to a different agent framework, so that I can use better tools
25. As a developer, I want to support multiple agent frameworks simultaneously, so that I can reach more users

### Developer Debugging
26. As a developer, I want to debug file writing issues without running the Agent, so that I can quickly identify problems
27. As a developer, I want to debug verification failures by testing the runner directly, so that I can isolate the issue
28. As a developer, I want to inspect state at any point in the generation process, so that I can understand what went wrong
29. As a developer, I want to add breakpoints in the verification logic, so that I can step through it
30. As a developer, I want to log state transitions, so that I can trace the execution flow

### Developer Optimizing
31. As a developer, I want to profile the verification process, so that I can identify performance bottlenecks
32. As a developer, I want to cache verification results, so that I can avoid redundant API calls
33. As a developer, I want to parallelize file writing, so that I can speed up skill generation
34. As a developer, I want to optimize state updates, so that I can reduce memory usage
35. As a developer, I want to batch verification requests, so that I can reduce network overhead

## Implementation Decisions

### Module 1: SkillWriter
**Location**: `src/engine/skill-writer.ts`

**Interface**:
```typescript
interface WriteResult {
  success: boolean;
  filesWritten: number;
  errors: string[];
}

interface SkillWriter {
  write(files: SkillFile[], outputPath: string): Promise<WriteResult>;
}
```

**Responsibilities**:
- Validate file paths (no directory traversal, valid characters)
- Create output directory if it doesn't exist
- Write files atomically (write to temp, then rename)
- Aggregate errors and report them
- Return structured result

**Why it's deep**: Encapsulates file I/O complexity, validation, error handling, and atomic writes behind a simple interface.

### Module 2: VerificationRunner
**Location**: `src/engine/verification-runner.ts`

**Interface**:
```typescript
interface VerificationContext {
  apiDomain: string;
  credentials: Record<string, string>;
  maxRetries: number;
  currentAttempts: number;
}

interface VerificationOutcome {
  result: ExecutionResult;
  shouldTerminate: boolean;
  updatedAttempts: number;
}

interface VerificationRunner {
  run(request: StructuredRequest, context: VerificationContext): Promise<VerificationOutcome>;
}
```

**Responsibilities**:
- Classify HTTP method (read vs mutating)
- Check if mutating operations are allowed
- Execute request via `runner.ts` with host pinning
- Track attempt count
- Determine if should terminate based on attempts and status
- Return structured outcome

**Why it's deep**: Encapsulates verification logic, retry strategy, and termination hints behind a simple interface. Wraps `runner.ts` but adds state management on top.

### Module 3: GenerationState
**Location**: `src/engine/state.ts`

**Interface**:
```typescript
interface GenerationState {
  files: SkillFile[];
  verification: VerificationResult;
  apiDomain: string;
  apiBaseUrl: string;
  credentials: Record<string, string>;
  maxRetries: number;
}

interface StateManager {
  getState(): GenerationState;
  setFiles(files: SkillFile[]): void;
  updateVerification(update: Partial<VerificationResult>): void;
  incrementAttempts(): void;
  shouldTerminate(): boolean;
}
```

**Responsibilities**:
- Manage mutable state
- Validate state transitions
- Provide termination logic
- Expose immutable state snapshots

**Why it's moderate depth**: Encapsulates state management and validation, but is simpler than the other modules.

### Module 4: Tool Adapters
**Location**: `src/engine/tools/write-skill.ts`, `src/engine/tools/run-test.ts`

**Interface**:
```typescript
function createWriteSkillFilesTool(stateManager: StateManager, writer: SkillWriter): AgentTool;
function createRunTestTool(stateManager: StateManager, runner: VerificationRunner): AgentTool;
```

**Responsibilities**:
- Convert between pi-agent-core's `AgentTool` interface and our modules
- Parse tool call parameters
- Call the appropriate module
- Format results for pi-agent-core

**Why they're shallow**: Just interface translation, no business logic. The depth is in the modules they call.

### Architecture Changes

**Before**:
```
generate.ts (219 lines)
├─ generateSkill()
│  ├─ fetchDocs()
│  ├─ detectAuth()
│  ├─ sliceSpec()
│  └─ Agent setup
│     ├─ writeSkillFilesTool() ← tool + logic
│     └─ runTestTool() ← tool + logic
│
├─ buildSystemPrompt()
└─ inferSpecUrls()
```

**After**:
```
engine/
├─ generate.ts (orchestration only, ~100 lines)
├─ skill-writer.ts (deep: file I/O, validation)
├─ verification-runner.ts (deep: execution, retry, termination)
├─ state.ts (moderate: state management)
└─ tools/
   ├─ write-skill.ts (shallow: pi-agent-core adapter)
   └─ run-test.ts (shallow: pi-agent-core adapter)
```

### Dependency Injection

`generate.ts` will instantiate the modules and inject them into the tool adapters:

```typescript
const stateManager = new StateManager(initialState);
const writer = new SkillWriter();
const runner = new VerificationRunner();

const tools = [
  createWriteSkillFilesTool(stateManager, writer),
  createRunTestTool(stateManager, runner),
];
```

This makes it easy to swap implementations for testing or different environments.

### Backward Compatibility

- The public API (`generateSkill` function) remains unchanged
- Existing tests in `generate.test.ts` continue to work
- E2E tests continue to work
- CLI continues to work

## Testing Decisions

### What Makes a Good Test

Tests should verify external behavior, not implementation details. A good test:
- Calls the module's public interface
- Verifies the output or side effects
- Doesn't care about internal state or helper functions
- Survives internal refactoring

### Modules to Test

#### 1. SkillWriter (High Priority)
**Test Cases**:
- Write valid files to a new directory
- Write files to an existing directory
- Handle invalid file paths (directory traversal, special characters)
- Handle file write errors (permission denied, disk full)
- Write multiple files atomically (all or nothing)
- Return correct WriteResult structure

**Prior Art**: Similar to file I/O tests in other projects. Use temporary directories for isolation.

#### 2. VerificationRunner (High Priority)
**Test Cases**:
- Execute GET request successfully
- Execute POST request with body
- Block mutating operations when not allowed
- Pin host correctly (reject off-domain requests)
- Track attempt count correctly
- Return shouldTerminate=true when maxRetries reached
- Return shouldTerminate=false when under maxRetries
- Handle network errors gracefully
- Inject credentials correctly

**Prior Art**: Similar to `runner.test.ts`, but with state management on top.

#### 3. GenerationState (Medium Priority)
**Test Cases**:
- Initialize with correct state
- Update files correctly
- Update verification correctly
- Increment attempts correctly
- Return shouldTerminate correctly based on attempts and status
- Validate state transitions (e.g., can't set negative attempts)

**Prior Art**: Similar to state management tests in Redux or Zustand projects.

#### 4. Tool Adapters (Low Priority)
**Test Cases**:
- Correctly parse tool call parameters
- Correctly format results for pi-agent-core
- Handle missing or invalid parameters

**Prior Art**: Minimal tests needed since they're trivial wrappers.

### Test Structure

```
src/engine/
├─ skill-writer.test.ts
├─ verification-runner.test.ts
├─ state.test.ts
└─ tools/
   ├─ write-skill.test.ts
   └─ run-test.test.ts
```

### Integration Tests

After extracting modules, the existing `generate.test.ts` tests should still pass. These are integration tests that verify the full pipeline works end-to-end with the Agent.

## Out of Scope

This PRD focuses **only** on extracting tool implementations. The following are explicitly out of scope:

1. **Prompt template extraction** (Candidate 2 from architecture review): System prompts remain inline in `generate.ts` for now
2. **Type consolidation** (Candidate 3): Types remain scattered across files
3. **Runner dead code fix** (Candidate 4): The duplicate if/else branches in `runner.ts` remain
4. **New features**: No new tools, no new verification strategies, no new state fields
5. **Performance optimization**: No caching, parallelization, or batching
6. **CLI changes**: CLI remains unchanged
7. **E2E test changes**: E2E tests remain unchanged

These can be addressed in future PRDs.

## Further Notes

### Migration Strategy

1. Create new module files with implementations
2. Write unit tests for each module
3. Create tool adapters
4. Update `generate.ts` to use the new modules
5. Run all existing tests to verify backward compatibility
6. Remove old inline tool factories from `generate.ts`

### Risks

1. **Breaking existing tests**: The refactoring should not break any existing tests. If it does, the refactoring is incorrect.
2. **Performance regression**: The new modules should not be slower than the inline implementations. Profile before and after.
3. **Over-engineering**: Don't add features or abstractions that aren't needed. Keep the modules simple and focused.

### Success Criteria

- All existing tests pass (unit, integration, E2E)
- New unit tests cover the extracted modules (≥80% coverage)
- `generate.ts` is reduced from 219 lines to ≤100 lines
- No performance regression (measure with benchmarks)
- Code is easier to understand and modify (subjective, but should be obvious)

### Future Work

After this refactor, the following become easier:
- Adding new tools (just create a new module + adapter)
- Testing verification strategies (mock the runner, not the Agent)
- Reusing modules in different contexts (CLI, batch processing)
- Swapping implementations (e.g., different HTTP client, different file system)
- Migrating to different agent frameworks (just rewrite the adapters)

This refactor unlocks future improvements without requiring them now.
