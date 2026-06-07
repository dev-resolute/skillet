# Move Spec Types to types.ts

## What to build

Consolidate domain types from spec.ts into the central types.ts file. Move SpecSlice interface to types.ts and re-export it from spec.ts for backward compatibility.

This continues the type consolidation effort while maintaining backward compatibility through re-exports. Update internal imports in spec.ts to use the centralized types.

## Acceptance criteria

- [ ] SpecSlice interface moved to types.ts
- [ ] SpecSlice re-exported from spec.ts for backward compatibility
- [ ] Internal imports in spec.ts updated to use ../types.js
- [ ] No circular dependencies introduced
- [ ] All existing tests pass without modification
- [ ] Build succeeds with no TypeScript errors
- [ ] Types can be imported from both locations during transition

## Blocked by

None - can start immediately
