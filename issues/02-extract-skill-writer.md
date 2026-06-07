# Extract SkillWriter module

## What to build

Create a new `src/engine/skill-writer.ts` module that handles writing skill files to disk. The module should provide:

- A `SkillWriter` class or factory function that writes skill files to a specified output directory
- Validation logic to ensure file paths are safe (no directory traversal, valid characters)
- Atomic write operations (write to temp file, then rename)
- Error aggregation and reporting
- A structured `WriteResult` return type

The SkillWriter should be responsible only for file I/O and validation - it should not know about the Agent, verification, or state management.

## Why (motivation)

**Problem**: Currently, file writing logic is embedded in the `writeSkillFilesTool` factory in `generate.ts`. This makes it:

- Impossible to test without mocking the entire Agent
- Hard to reuse in other contexts (e.g., batch generation, CLI tools)
- Coupled to the pi-agent-core tool interface
- Missing validation and error handling

**Solution**: Extract file writing into a dedicated module with a clear interface. This creates a deep, testable module that can be reused across different contexts.

**User stories addressed**:
- As a developer, I want to test file writing logic in isolation, so that I can verify it works without mocking the entire Agent
- As a developer, I want to add new test cases for edge cases (e.g., invalid file paths, permission errors), so that the code is more robust
- As a developer, I want to reuse the SkillWriter module in a different context (e.g., batch skill generation), so that I don't duplicate file writing logic
- As a developer, I want to find the file writing logic in one place, so that I don't have to search through multiple files
- As a developer, I want to debug file writing issues without running the Agent, so that I can quickly identify problems

## Acceptance criteria

- [ ] Create `src/engine/skill-writer.ts` with `SkillWriter` implementation
- [ ] Define `WriteResult` interface with success flag, file count, and error list
- [ ] Implement path validation (reject directory traversal, invalid characters)
- [ ] Implement atomic write operations (write to temp, then rename)
- [ ] Aggregate errors and return structured results
- [ ] Write comprehensive unit tests in `src/engine/skill-writer.test.ts`
- [ ] Tests use temporary directories for isolation (no actual file system pollution)
- [ ] Tests cover: valid writes, invalid paths, permission errors, multiple files, atomic behavior
- [ ] All new code is TypeScript with proper types
- [ ] No breaking changes to existing functionality (this is a new module, not yet integrated)

## Blocked by

None - can start immediately.

## Dependencies

- **Blocks**: Issue #4 (Integration)
- **Depends on**: None

## Notes

- This module is independent of StateManager and VerificationRunner
- Keep the interface minimal: just write files and return results
- Don't add features that aren't in the PRD (no compression, no batching yet)
- Use Node.js `fs/promises` for file operations
- Consider using a library like `tempy` or manual temp file management for atomic writes
