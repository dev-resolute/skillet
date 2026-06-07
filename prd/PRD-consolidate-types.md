# Consolidate Domain Types

## Problem Statement

Domain types are scattered across multiple files, making it difficult to understand the full data model of the system. Core types like `ExecutionResult`, `SpecSlice`, `WriteResult`, and `MethodClass` are defined in implementation files rather than a central location. This creates friction when:
- Understanding what data structures exist in the system
- Reusing types across modules
- Onboarding new developers who need to find type definitions
- Refactoring when type shapes need to change

## Solution

Consolidate domain-level types into `src/types.ts` while keeping module interface types (like `SkillWriter`, `StateManager`) co-located with their implementations. This creates a clear distinction between:
- **Domain types**: Data structures that flow through the system (consolidated)
- **Module interfaces**: Contracts for modules (co-located with implementation)

## User Stories

1. As a developer, I want to find all domain types in one place, so that I can quickly understand the data model without searching multiple files.
2. As a developer, I want to reuse domain types across modules, so that I don't need to import from implementation files.
3. As a developer, I want to see the full list of domain types, so that I can understand what data flows through the system.
4. As a developer, I want module interfaces to stay close to their implementations, so that I can understand a module's contract without jumping between files.
5. As a developer, I want to refactor domain types in one place, so that changes propagate consistently.
6. As a developer, I want to add new domain types, so that I know exactly where to define them.
7. As a developer, I want to document domain types, so that the data model is self-explanatory.
8. As a developer, I want to validate domain types at runtime, so that I can catch data shape errors early.
9. As a developer, I want to generate type documentation, so that the data model stays in sync with code.
10. As a developer, I want to distinguish between domain types and module interfaces, so that I understand the system's architecture.
11. As a developer, I want to import types without importing implementations, so that I avoid circular dependencies.
12. As a developer, I want to see type relationships, so that I understand how data flows between modules.
13. As a developer, I want to enforce type consistency, so that similar concepts use the same types.
14. As a developer, I want to migrate types gradually, so that I don't break existing code.
15. As a developer, I want to keep the change minimal, so that I don't introduce unnecessary risk.

## Implementation Decisions

### Types to Consolidate

**Move to `src/types.ts`:**
- `MethodClass` from `src/tools/runner.ts` - Domain concept for HTTP method classification
- `ExecutionResult` from `src/tools/runner.ts` - Result of executing an HTTP request
- `RunnerOptions` from `src/tools/runner.ts` - Options for the runner tool
- `SpecSlice` from `src/tools/spec.ts` - Sliced OpenAPI specification
- `WriteResult` from `src/engine/skill-writer.ts` - Result of writing skill files
- `VerificationContext` from `src/engine/verification-runner.ts` - Context for verification
- `VerificationOutcome` from `src/engine/verification-runner.ts` - Outcome of verification

**Keep in current locations (module interfaces):**
- `SkillWriter` in `src/engine/skill-writer.ts` - Module interface
- `StateConfig`, `GenerationState`, `StateManager` in `src/engine/state.ts` - Module interfaces
- `VerificationRunner` in `src/engine/verification-runner.ts` - Module interface

### Rationale

**Why consolidate these types?**
- They represent data that flows through the system
- They are used by multiple modules
- They are not tied to a specific module's implementation
- They benefit from centralized documentation

**Why keep module interfaces co-located?**
- They define the contract for a specific module
- They are only used by that module and its consumers
- Keeping them close to implementation improves discoverability
- They may evolve with the module's implementation

### Architecture Changes

**Before:**
```
src/
├─ types.ts (core domain types)
├─ tools/
│  ├─ runner.ts (MethodClass, ExecutionResult, RunnerOptions)
│  └─ spec.ts (SpecSlice)
└─ engine/
   ├─ skill-writer.ts (WriteResult, SkillWriter)
   ├─ state.ts (StateConfig, GenerationState, StateManager)
   └─ verification-runner.ts (VerificationContext, VerificationOutcome, VerificationRunner)
```

**After:**
```
src/
├─ types.ts (all domain types consolidated)
├─ tools/
│  ├─ runner.ts (imports from types.ts)
│  └─ spec.ts (imports from types.ts)
└─ engine/
   ├─ skill-writer.ts (WriteResult from types.ts, SkillWriter stays)
   ├─ state.ts (all interfaces stay)
   └─ verification-runner.ts (Context/Outcome from types.ts, Runner stays)
```

### Type Organization in `src/types.ts`

The consolidated `types.ts` will be organized by concern:

1. **Core concepts**: `StructuredRequest`, `AuthScheme`, `SkillFile`
2. **Verification**: `VerificationResult`, `MethodClass`, `ExecutionResult`, `RunnerOptions`, `VerificationContext`, `VerificationOutcome`
3. **Spec analysis**: `SpecSlice`
4. **Writing**: `WriteResult`
5. **Configuration**: `GenerateOptions`

Each section will have a comment header for navigation.

### Backward Compatibility

- All type moves are re-exports from original locations
- Existing imports continue to work
- No breaking changes to public API
- Gradual migration: consumers can update imports over time

### Migration Strategy

1. Add types to `src/types.ts`
2. Re-export from original locations for backward compatibility
3. Update internal imports to use `src/types.ts`
4. Add deprecation notices to re-exports (optional)
5. In future version, remove re-exports

## Testing Decisions

### What Makes a Good Test

Tests should verify that type consolidation doesn't break existing code. A good test:
- Verifies imports still work from original locations
- Verifies imports work from consolidated location
- Verifies type shapes are preserved
- Doesn't test implementation details

### Modules to Test

#### 1. Type Consolidation (High Priority)
**Test Cases**:
- All types can be imported from `src/types.ts`
- All types can still be imported from original locations (backward compatibility)
- Type shapes match (using type-level tests)
- No circular dependencies introduced

**Prior Art**: Similar to how we tested module extraction - verify behavior doesn't change.

#### 2. Import Updates (Medium Priority)
**Test Cases**:
- `src/tools/runner.ts` imports from `src/types.ts`
- `src/tools/spec.ts` imports from `src/types.ts`
- `src/engine/skill-writer.ts` imports from `src/types.ts`
- `src/engine/verification-runner.ts` imports from `src/types.ts`

**Prior Art**: Verify build succeeds and all tests pass.

### Test Structure

No new test files needed. Existing tests verify that consolidation doesn't break behavior.

### Integration Tests

All existing tests should pass without modification, proving backward compatibility.

## Out of Scope

This PRD focuses **only** on consolidating domain types. The following are explicitly out of scope:

1. **Moving module interfaces**: We're not moving `SkillWriter`, `StateManager`, etc.
2. **Runtime validation**: We're not adding runtime type checking (e.g., zod).
3. **Type documentation generation**: We're not generating docs from types.
4. **Removing backward compatibility re-exports**: We're keeping them for now.
5. **Refactoring type shapes**: We're moving types, not changing them.

These can be addressed in future PRDs if needed.

## Further Notes

### Migration Strategy

1. Add types to `src/types.ts` with clear section headers
2. Re-export from original locations: `export type { MethodClass } from '../types.js'`
3. Update internal imports in implementation files to use `../types.js`
4. Run all tests to verify nothing breaks
5. Build to verify no TypeScript errors

### Risks

1. **Breaking imports**: If we forget to re-export, existing imports break. Mitigation: re-export everything, verify with tests.
2. **Circular dependencies**: If types.ts imports from modules that import from types.ts. Mitigation: types.ts has no imports, only exports.
3. **Over-consolidation**: Moving too many types makes types.ts hard to navigate. Mitigation: only move domain types, keep module interfaces co-located.

### Success Criteria

- All existing tests pass (unit, integration, E2E)
- Build succeeds with no TypeScript errors
- All consolidated types can be imported from `src/types.ts`
- All consolidated types can still be imported from original locations
- No circular dependencies introduced
- `src/types.ts` is well-organized with clear section headers

### Future Work

After this consolidation, the following become easier:
- Adding runtime validation (just add to consolidated types)
- Generating type documentation (single source)
- Refactoring type shapes (one place to change)
- Adding new domain types (clear location)

This consolidation is a small improvement that makes the codebase slightly more maintainable without significant risk.
