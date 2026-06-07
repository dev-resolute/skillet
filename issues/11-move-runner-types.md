# Move Runner Types to types.ts

## What to build

Consolidate domain types from runner.ts into the central types.ts file. Move MethodClass, ExecutionResult, and RunnerOptions to types.ts and re-export them from runner.ts for backward compatibility.

This centralizes type definitions while maintaining backward compatibility through re-exports. Update internal imports in runner.ts to use the centralized types.

## Acceptance criteria

- [ ] MethodClass type moved to types.ts
- [ ] ExecutionResult interface moved to types.ts
- [ ] RunnerOptions interface moved to types.ts
- [ ] All three types re-exported from runner.ts for backward compatibility
- [ ] Internal imports in runner.ts updated to use ../types.js
- [ ] No circular dependencies introduced
- [ ] All existing tests pass without modification
- [ ] Build succeeds with no TypeScript errors
- [ ] Types can be imported from both locations during transition

## Blocked by

None - can start immediately
