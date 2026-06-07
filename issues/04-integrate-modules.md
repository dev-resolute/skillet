# Integrate extracted modules into generate.ts

## What to build

Complete the refactoring by creating thin tool adapters and integrating all extracted modules into `generate.ts`. This involves:

1. **Create tool adapters** in `src/engine/tools/`:
   - `write-skill.ts` - adapter that wraps SkillWriter for pi-agent-core
   - `run-test.ts` - adapter that wraps VerificationRunner for pi-agent-core
   - These adapters should be shallow (just interface translation, no business logic)

2. **Update `generate.ts`** to:
   - Instantiate StateManager, SkillWriter, and VerificationRunner
   - Use dependency injection to pass these to tool adapters
   - Replace inline tool factories with adapter-based tools
   - Remove old inline tool factory functions
   - Reduce file from ~219 lines to ≤100 lines (orchestration only)

3. **Verify backward compatibility**:
   - All existing unit tests pass (generate.test.ts, types.test.ts)
   - All existing integration tests pass
   - All E2E tests pass (petstore.test.ts, jira.test.ts)
   - CLI still works end-to-end
   - No performance regression

4. **Clean up**:
   - Remove inline `writeSkillFilesTool` function from generate.ts
   - Remove inline `runTestTool` function from generate.ts
   - Remove inline `GenerationContext` interface (replaced by StateManager)
   - Update any imports or exports as needed

## Why (motivation)

**Problem**: Issues #1, #2, and #3 created the deep modules, but they're not yet integrated into the system. The old inline tool factories still exist in `generate.ts`, so we haven't actually achieved the architectural improvement yet.

**Solution**: Wire everything together with thin adapters and dependency injection. This completes the refactor and delivers the actual benefits:
- Testable core logic (can now test without Agent)
- Deep modules with clear interfaces
- Good locality (each concern in its own module)
- Reusability (modules can be used outside Agent context)
- Maintainability (easier to modify and extend)

**User stories addressed**:
- As a developer, I want to add new tools (e.g., validateSchema, generateDocs), so that the Agent can perform additional verification steps
- As a developer, I want to see clear interfaces for each module, so that I know what each module does and how to use it
- As a developer, I want to understand what the verification logic does without reading the pi-agent-core tool interface, so that I can reason about it independently
- As a developer, I want to read documentation for each module, so that I can quickly understand its purpose and usage
- As a developer, I want to refactor the tool registration without affecting business logic, so that I can upgrade to new versions of pi-agent-core
- As a developer, I want to add new pi-agent-core tool features (e.g., streaming, cancellation), so that I can improve the user experience
- As a developer, I want to remove unused tool features, so that the code is simpler
- As a developer, I want to migrate to a different agent framework, so that I can use better tools
- As a developer, I want to support multiple agent frameworks simultaneously, so that I can reach more users

## Acceptance criteria

- [ ] Create `src/engine/tools/write-skill.ts` adapter
- [ ] Create `src/engine/tools/run-test.ts` adapter
- [ ] Adapters are thin (interface translation only, no business logic)
- [ ] Adapters correctly convert between pi-agent-core tool interface and module interfaces
- [ ] Update `generate.ts` to instantiate StateManager, SkillWriter, VerificationRunner
- [ ] Update `generate.ts` to use dependency injection for tool creation
- [ ] Remove old inline `writeSkillFilesTool` function
- [ ] Remove old inline `runTestTool` function
- [ ] Remove old inline `GenerationContext` interface
- [ ] `generate.ts` is reduced from ~219 lines to ≤100 lines
- [ ] All existing unit tests pass (`npm test`)
- [ ] All existing integration tests pass (generate.test.ts)
- [ ] All E2E tests pass (`npm run test:e2e` or equivalent)
- [ ] CLI works end-to-end (manual verification: `skillet https://petstore.swagger.io/ "list pets"`)
- [ ] No performance regression (generation time within 10% of baseline)
- [ ] Code is easier to understand (subjective, but should be obvious from structure)
- [ ] Update README.md if needed to reflect new architecture

## Blocked by

- Issue #1: Extract StateManager module (must be complete)
- Issue #2: Extract SkillWriter module (must be complete)
- Issue #3: Extract VerificationRunner module (must be complete)

## Dependencies

- **Blocks**: None (this is the final integration)
- **Depends on**: Issues #1, #2, #3 (all must be complete first)

## Notes

- This is the integration issue - it's where we verify that the refactoring actually works
- The adapters should be very thin - if they contain business logic, you've done something wrong
- Use dependency injection to make testing easier (pass mock modules to adapters)
- Keep the public API unchanged - `generateSkill` function signature should remain the same
- If existing tests fail, don't modify the tests - fix the implementation instead (tests define the contract)
- This issue should be relatively small if issues #1-3 were done correctly
- Consider adding a simple benchmark or timing check to verify no performance regression

## Definition of Done

This issue is complete when:
1. All acceptance criteria are met
2. Code review passes (if applicable)
3. All tests pass in CI
4. Manual verification shows the CLI still works
5. The architecture is demonstrably improved (can show before/after)
