# Add Prompt Version Tracking

## What to build

Add prompt version tracking to the SkillResult so users can see which prompt version was used to generate each skill. This enables debugging, analytics, and understanding which prompts work best.

Extend SkillResult to include the promptVersion field that was used during generation. Update generateSkill to populate this field from the selected prompt template.

This creates traceability between generated skills and the prompts that created them.

## Acceptance criteria

- [ ] SkillResult interface updated with promptVersion: string field
- [ ] generateSkill populates promptVersion from the selected prompt's version
- [ ] Field is included in the returned SkillResult object
- [ ] All existing tests updated to include promptVersion in expected results
- [ ] New test verifies promptVersion matches the selected prompt
- [ ] Documentation updated to explain the promptVersion field
- [ ] Backward compatibility maintained (field is always present)

## Blocked by

- Issue #9 (Integrate Registry into generate.ts) - needs registry integration working first
