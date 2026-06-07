# Integrate Registry into generate.ts

## What to build

Update generate.ts to use the prompt registry instead of the inline buildSystemPrompt function. This makes prompt selection configurable and enables A/B testing different prompt versions.

Modify generateSkill to:
1. Accept an optional promptVersion parameter
2. Use the registry to fetch the appropriate prompt
3. Default to v1 if no version specified (backward compatibility)
4. Call prompt.build(context) to generate the system prompt

This integration point allows the system to use different prompts without changing the core generation logic.

## Acceptance criteria

- [ ] GenerateOptions type updated with optional promptVersion?: string field
- [ ] generateSkill imports and uses the prompt registry
- [ ] When promptVersion is provided, registry.get() is called with that version
- [ ] When promptVersion is not provided, registry.getDefault() is called
- [ ] Context object passed to prompt.build() contains all required fields
- [ ] Generated system prompt is passed to Agent initialization
- [ ] Existing tests pass without modification (backward compatibility)
- [ ] New test added for promptVersion parameter
- [ ] Error handling for invalid prompt versions

## Blocked by

- Issue #6 (Create PromptTemplate Interface) - needs the interface
- Issue #7 (Extract Current Prompt to v1) - needs v1 prompt
- Issue #8 (Create Prompt Registry) - needs the registry to use
