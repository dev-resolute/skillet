# Create PromptTemplate Interface

## What to build

Create the core interface and types for the prompt template system. This defines the contract that all prompt versions must implement.

Define two interfaces:
- `PromptContext`: The data needed to build a prompt (action, apiBaseUrl, auth, slice, docs, maxRetries)
- `PromptTemplate`: The contract with version, name, description, and build() method

These types will be used by all prompt versions and the registry.

## Acceptance criteria

- [ ] PromptContext interface defines all required fields
- [ ] PromptTemplate interface has version, name, description, and build() method
- [ ] build() method signature matches: (context: PromptContext) => string
- [ ] Types are exported from prompts/types.ts
- [ ] TypeScript compilation succeeds with no errors
- [ ] Types are well-documented with JSDoc comments

## Blocked by

None - can start immediately
