# Move Skill Writer Types to types.ts

## What to build

Consolidate domain types from skill-writer.ts into the central types.ts file. Move WriteResult interface to types.ts and re-export it from skill-writer.ts for backward compatibility.

This continues the type consolidation effort while maintaining backward compatibility through re-exports. Update internal imports in skill-writer.ts to use the centralized types.

## Acceptance criteria

- [ ] WriteResult interface moved to types.ts
- [ ] WriteResult re-exported from skill-writer.ts for backward compatibility
- [ ] Internal imports in skill-writer.ts updated to use ../types.js
- [ ] No circular dependencies introduced
- [ ] All existing tests pass without modification
- [ ] Build succeeds with no TypeScript errors
- [ ] Types can be imported from both locations during transition

## Blocked by

None - can start immediately
