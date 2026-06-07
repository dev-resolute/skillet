# Move Verification Types to types.ts

## What to build

Consolidate domain types from verification-runner.ts into the central types.ts file. Move VerificationContext and VerificationOutcome interfaces to types.ts and re-export them from verification-runner.ts for backward compatibility.

This completes the type consolidation effort while maintaining backward compatibility through re-exports. Update internal imports in verification-runner.ts to use the centralized types.

## Acceptance criteria

- [ ] VerificationContext interface moved to types.ts
- [ ] VerificationOutcome interface moved to types.ts
- [ ] Both types re-exported from verification-runner.ts for backward compatibility
- [ ] Internal imports in verification-runner.ts updated to use ../types.js
- [ ] No circular dependencies introduced
- [ ] All existing tests pass without modification
- [ ] Build succeeds with no TypeScript errors
- [ ] Types can be imported from both locations during transition

## Blocked by

None - can start immediately
