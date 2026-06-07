import { describe, it, expect, vi } from 'vitest';
import { createWriteSkillFilesTool } from './write-skill.js';
import type { SkillFile } from '../../types.js';

// Create mock state manager
function createMockStateManager() {
  const state = {
    files: [] as SkillFile[],
    verification: { status: 'skipped' as const, attempts: 0 },
  };
  return {
    getFiles: () => [...state.files],
    setFiles: (files: SkillFile[]) => { state.files = [...files]; },
    getVerification: () => ({ ...state.verification }),
    getAttempts: () => state.verification.attempts,
    shouldTerminate: () => false,
  };
}

// Create mock skill writer
function createMockSkillWriter() {
  return {
    write: vi.fn().mockResolvedValue({ success: true, filesWritten: 2, errors: [] }),
  };
}

describe('write_skill_files adapter', () => {
  it('delegates to SkillWriter and updates state', async () => {
    const stateManager = createMockStateManager();
    const skillWriter = createMockSkillWriter();
    const tool = createWriteSkillFilesTool(stateManager, skillWriter);

    const files = [
      { path: 'SKILL.md', content: 'test content' },
    ];

    const result = await tool.execute!('tool-call-1', { files }, new AbortController().signal, undefined);

    expect(skillWriter.write).toHaveBeenCalledWith(files, expect.any(String));
    expect(stateManager.getFiles()).toEqual(files);
    expect(result.content[0].text).toContain('Wrote');
  });
});
