# Extract Prompt Templates

## Problem Statement

The `buildSystemPrompt()` function is a hardcoded 30-line string template buried in `generate.ts`. This makes it impossible to:
- A/B test different prompts to see which produces better skills
- Version prompts and track which version generated which skill
- Understand what the prompt does without reading the code
- Reuse prompt fragments across different generation modes

The prompt is currently the most opaque part of the system — a black box that's hard to evolve or experiment with.

## Solution

Extract the prompt into a dedicated `engine/prompts/` module with:
- A `PromptTemplate` interface with version and build method
- Separate files for each prompt version (v1.ts, v2.ts, etc.)
- A registry to select prompts by version
- Version tracking in the output so we know which prompt generated which skill

This creates a deep, testable module that encapsulates prompt engineering logic behind a simple interface.

## User Stories

1. As a developer, I want to test the system prompt in isolation, so that I can verify it formats correctly without running the full generation pipeline.
2. As a developer, I want to create a new prompt version (v2), so that I can experiment with different instructions without breaking the current version.
3. As a developer, I want to track which prompt version generated a skill, so that I can debug issues and understand which prompts work best.
4. As a developer, I want to A/B test different prompts, so that I can measure which one produces higher-quality skills.
5. As a developer, I want to reuse prompt fragments (like the "Rules" section), so that I don't duplicate logic across versions.
6. As a developer, I want to see all available prompts in one place, so that I can understand the system's capabilities.
7. As a developer, I want to swap prompts at runtime, so that I can test different strategies without redeploying.
8. As a developer, I want to read documentation for each prompt version, so that I understand what it's optimized for.
9. As a developer, I want to add conditional logic to prompts (e.g., different rules for GraphQL vs REST), so that I can handle different API types.
10. As a developer, I want to parameterize prompts (e.g., adjust verbosity, add examples), so that I can fine-tune behavior.
11. As a developer, I want to rollback to an older prompt version, so that I can recover from a bad prompt change.
12. As a developer, I want to measure prompt performance (success rate, token usage), so that I can optimize costs and quality.
13. As a developer, I want to add prompt variants (e.g., "concise", "detailed"), so that I can test different styles.
14. As a developer, I want to export prompts for analysis, so that I can review them in a diff tool or share with stakeholders.
15. As a developer, I want to validate prompts against a schema, so that I catch formatting errors early.
16. As a developer, I want to generate prompt documentation automatically, so that the docs stay in sync with the code.
17. As a developer, I want to add prompt-level logging, so that I can see exactly what was sent to the LLM.
18. As a developer, I want to add prompt-level caching, so that I can avoid rebuilding the same prompt repeatedly.
19. As a developer, I want to add prompt-level metrics, so that I can track prompt usage and performance.
20. As a developer, I want to add prompt-level feature flags, so that I can enable/disable prompts without code changes.

## Implementation Decisions

### Module 1: PromptTemplate Interface
**Location**: `src/engine/prompts/types.ts`

**Interface**:
```typescript
interface PromptContext {
  action: string;
  apiBaseUrl: string;
  auth: string;
  slice: string | null;
  docs: string;
  maxRetries: number;
}

interface PromptTemplate {
  version: string;
  name: string;
  description: string;
  build(context: PromptContext): string;
}
```

**Why it's deep**: Encapsulates all prompt formatting logic (interpolation, rules, structure) behind a simple `build()` method. The interface rarely changes, but implementations can evolve.

### Module 2: Prompt v1
**Location**: `src/engine/prompts/v1.ts`

**Interface**:
```typescript
const v1Prompt: PromptTemplate = {
  version: '1.0.0',
  name: 'default',
  description: 'The original skillet prompt',
  build: (ctx) => `You are skillet — an expert API-to-skill generator...`
};
```

**Why it's deep**: Contains the actual prompt text, which is 30+ lines of carefully crafted instructions. This is the "secret sauce" of the system, and isolating it makes it easier to iterate on.

### Module 3: Prompt Registry
**Location**: `src/engine/prompts/registry.ts`

**Interface**:
```typescript
interface PromptRegistry {
  get(version: string): PromptTemplate;
  getDefault(): PromptTemplate;
  list(): PromptTemplate[];
}

function createPromptRegistry(): PromptRegistry {
  const prompts = new Map<string, PromptTemplate>();
  
  return {
    get: (version) => {
      const prompt = prompts.get(version);
      if (!prompt) throw new Error(`Prompt version ${version} not found`);
      return prompt;
    },
    getDefault: () => prompts.get('1.0.0')!,
    list: () => Array.from(prompts.values()),
  };
}
```

**Why it's moderate depth**: Provides a simple lookup interface, but manages prompt registration and validation.

### Module 4: Update generate.ts
**Location**: `src/engine/generate.ts`

**Changes**:
- Import `createPromptRegistry()`
- Accept optional `promptVersion` parameter in `GenerateOptions`
- Use registry to get the prompt
- Store prompt version in `SkillResult` for tracking

**Example usage**:
```typescript
const registry = createPromptRegistry();
const prompt = options.promptVersion 
  ? registry.get(options.promptVersion)
  : registry.getDefault();

const agent = new Agent({
  initialState: {
    systemPrompt: prompt.build({ action, apiBaseUrl, auth, slice, docs, maxRetries }),
    model,
    tools: [...]
  }
});
```

### Module 5: Update SkillResult
**Location**: `src/types.ts`

**Changes**:
- Add `promptVersion?: string` field to `SkillResult`
- This allows tracking which prompt generated the skill

**Example**:
```typescript
interface SkillResult {
  name: string;
  files: SkillFile[];
  verification: VerificationResult;
  promptVersion?: string;  // NEW
}
```

### Architecture Changes

**Before**:
```
generate.ts (100 lines)
├─ buildSystemPrompt() ← hardcoded 30-line string
└─ generateSkill()
```

**After**:
```
engine/
├─ generate.ts (90 lines, uses registry)
└─ prompts/
   ├─ types.ts (PromptTemplate interface)
   ├─ v1.ts (current prompt)
   ├─ v2.ts (future prompt)
   └─ registry.ts (prompt lookup)
```

### Dependency Injection

`generate.ts` will accept an optional prompt registry:
```typescript
interface GenerateOptions {
  docsUrl: string;
  action: string;
  promptVersion?: string;  // NEW
  // ... other options
}
```

This makes it easy to test with mock prompts or swap prompts for different use cases.

### Backward Compatibility

- The public API (`generateSkill`) remains unchanged
- Existing code continues to work (defaults to v1 prompt)
- New `promptVersion` parameter is optional

## Testing Decisions

### What Makes a Good Test

Tests should verify the prompt builds correctly given a context, not implementation details like string concatenation. A good test:
- Calls `prompt.build(context)` with a realistic context
- Verifies the output contains expected sections (rules, input data, output format)
- Verifies interpolation works (action, apiBaseUrl, etc. appear in output)
- Doesn't care about exact whitespace or formatting

### Modules to Test

#### 1. PromptTemplate Interface (Low Priority)
**Test Cases**:
- Interface is correctly typed
- Implementations satisfy the interface

**Prior Art**: Similar to how we tested StateManager interface.

#### 2. Prompt v1 (Medium Priority)
**Test Cases**:
- Build returns a non-empty string
- Output contains "You are skillet"
- Output contains the action from context
- Output contains the apiBaseUrl from context
- Output contains the auth scheme from context
- Output contains the docs excerpt (first 8000 chars)
- Output contains all 9 rules
- Output contains the output format section
- When slice is null, output says "No OpenAPI spec available"
- When slice is present, output includes the slice

**Prior Art**: Similar to integration tests in `generate.test.ts`, but focused on prompt formatting.

#### 3. Prompt Registry (Medium Priority)
**Test Cases**:
- `get('1.0.0')` returns the v1 prompt
- `get('invalid')` throws an error
- `getDefault()` returns v1 prompt
- `list()` returns all registered prompts

**Prior Art**: Similar to state management tests.

#### 4. generate.ts Integration (High Priority)
**Test Cases**:
- When no `promptVersion` is provided, uses default (v1)
- When `promptVersion` is provided, uses that prompt
- When invalid `promptVersion` is provided, throws an error
- `SkillResult` includes the `promptVersion` that was used

**Prior Art**: Similar to existing `generate.test.ts` tests, but with prompt version tracking.

### Test Structure

```
src/engine/
├─ prompts/
│  ├─ types.test.ts (interface tests)
│  ├─ v1.test.ts (prompt build tests)
│  └─ registry.test.ts (lookup tests)
└─ generate.test.ts (updated with prompt version tests)
```

### Integration Tests

After extracting prompts, the existing `generate.test.ts` tests should still pass. We'll add new tests to verify prompt version selection.

## Out of Scope

This PRD focuses **only** on extracting prompt templates. The following are explicitly out of scope:

1. **Creating new prompt versions**: We're just extracting the current prompt (v1), not creating v2 or variants.
2. **A/B testing infrastructure**: We're making it *possible* to A/B test, but not building the test harness.
3. **Prompt performance tracking**: We're adding version tracking, but not building analytics.
4. **Prompt caching**: Each generation rebuilds the prompt (no caching).
5. **Prompt validation**: We're not validating prompts against a schema.
6. **Prompt documentation generation**: We're not auto-generating docs from prompts.

These can be addressed in future PRDs.

## Further Notes

### Migration Strategy

1. Create `engine/prompts/types.ts` with the `PromptTemplate` interface
2. Create `engine/prompts/v1.ts` with the current prompt
3. Create `engine/prompts/registry.ts` with the registry
4. Update `generate.ts` to use the registry
5. Add `promptVersion` to `SkillResult`
6. Write tests for all new modules
7. Run all existing tests to verify backward compatibility

### Risks

1. **Breaking existing tests**: The refactoring should not break any existing tests. If it does, the refactoring is incorrect.
2. **Prompt changes during migration**: We must ensure the v1 prompt is byte-for-byte identical to the current prompt to avoid changing behavior.
3. **Over-engineering**: Don't add features that aren't needed yet (like caching, validation, etc.).

### Success Criteria

- All existing tests pass (unit, integration, E2E)
- New unit tests cover the extracted modules (≥80% coverage)
- `generate.ts` is reduced from 100 lines to ≤90 lines
- The v1 prompt is byte-for-byte identical to the current prompt
- Prompt version is tracked in `SkillResult`
- Code is easier to understand and modify

### Future Work

After this refactor, the following become easier:
- Creating new prompt versions (just add `v2.ts`)
- A/B testing prompts (pass different `promptVersion` values)
- Tracking prompt performance (query by `promptVersion`)
- Experimenting with prompt variants (create `v1-concise.ts`, `v1-detailed.ts`)
- Migrating to different prompt formats (just change the `build()` implementation)

This refactor unlocks future prompt engineering without requiring it now.
