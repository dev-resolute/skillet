# Extract Current Prompt to v1.ts

## What to build

Extract the current 30-line system prompt from generate.ts into a dedicated v1 prompt module. This is the first prompt version and establishes the baseline.

Extract the `buildSystemPrompt` function and its context parameter into a new module that implements the PromptTemplate interface. The extracted prompt should be byte-for-byte identical to the current implementation to ensure no behavioral changes.

This creates a versioned, reusable prompt that can be referenced by the registry and future versions can build upon.

## Acceptance criteria

- [ ] v1 prompt module created in engine/prompts/v1.ts
- [ ] Implements PromptTemplate interface from Issue #6
- [ ] version field set to "1.0.0"
- [ ] name field set to "default"
- [ ] description field explains this is the original skillet prompt
- [ ] build() method produces identical output to current buildSystemPrompt()
- [ ] All 9 rules preserved exactly
- [ ] Context interpolation works correctly (action, apiBaseUrl, auth, slice, docs, maxRetries)
- [ ] Unit tests verify prompt output matches expected structure
- [ ] No behavioral changes to existing functionality

## Blocked by

- Issue #6 (Create PromptTemplate Interface) - needs the interface to implement
