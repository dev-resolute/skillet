import { describe, it, expect } from 'vitest';
import { createWriteSkillFilesTool } from './write-skill.js';
import { createStateManager } from '../state.js';
import type { SkillFile } from '../../types.js';

function run(tool: ReturnType<typeof createWriteSkillFilesTool>, files: SkillFile[]) {
  return tool.execute('tool-call-1', { files });
}

describe('write_skill_files adapter', () => {
  it('records files into state and reports them, without persisting', async () => {
    const state = createStateManager({ maxRetries: 3 });
    const tool = createWriteSkillFilesTool(state);
    const files: SkillFile[] = [
      { path: 'SKILL.md', content: 'test content' },
      { path: 'search', content: '#!/bin/bash' },
    ];

    const result = await run(tool, files);

    expect(state.getFiles()).toEqual(files);
    expect(result.content[0].text).toContain('Recorded');
    expect(result.content[0].text).toContain('2');
  });

  it('does not terminate before any test has run', async () => {
    const state = createStateManager({ maxRetries: 3 });
    const tool = createWriteSkillFilesTool(state);

    const result = await run(tool, [{ path: 'SKILL.md', content: 'x' }]);

    expect(result.terminate).toBe(false);
  });
});
