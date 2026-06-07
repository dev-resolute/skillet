# Create Prompt Registry

## What to build

Create a registry system for managing and looking up prompt templates by version. This provides a central place to register prompts and retrieve them by version string.

The registry should support:
- Registering prompt templates with their version
- Looking up prompts by version string
- Getting the default prompt (v1)
- Listing all registered prompts

This enables version-based prompt selection and makes it easy to add new prompt versions in the future.

## Acceptance criteria

- [ ] PromptRegistry interface defined with register(), get(), getDefault(), and list() methods
- [ ] Registry implementation created in engine/prompts/registry.ts
- [ ] register() method accepts PromptTemplate and stores it by version
- [ ] get(version) method returns the prompt for that version or throws error if not found
- [ ] getDefault() method returns the v1 prompt
- [ ] list() method returns all registered prompts
- [ ] Registry is initialized with v1 prompt pre-registered
- [ ] Unit tests cover all registry operations
- [ ] Error handling for missing versions

## Blocked by

- Issue #6 (Create PromptTemplate Interface) - needs the interface for registry to manage
- Issue #7 (Extract Current Prompt to v1) - needs v1 prompt to pre-register
