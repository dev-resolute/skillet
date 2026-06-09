import { describe, it, expect } from 'vitest';
import { createWriteSkillFilesTool } from './write-skill.js';
import { createStateManager } from '../state.js';
import type { SkillFile } from '../../types.js';

function run(tool: ReturnType<typeof createWriteSkillFilesTool>, files: SkillFile[]) {
  return tool.execute('tool-call-1', { files });
}

describe('write_skill_files adapter', () => {
  it('records files into state and reports them, without persisting', async () => {
    const state = createStateManager({ maxRetries: 3, operations: ['search'] });
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
    const state = createStateManager({ maxRetries: 3, operations: ['search'] });
    const tool = createWriteSkillFilesTool(state);

    const result = await run(tool, [{ path: 'SKILL.md', content: 'x' }]);

    expect(result.terminate).toBe(false);
  });

  it('bounces a failing Script check back to the LLM without recording the files', async () => {
    const state = createStateManager({ maxRetries: 3, operations: ['search'] });
    const tool = createWriteSkillFilesTool(state, {
      allowedEnvVars: ['EXAMPLE_API_TOKEN'],
      apiBaseUrl: 'https://api.example.com',
    });

    const result = await run(tool, [
      { path: 'SKILL.md', content: '---\nname: example\n---' },
      { path: 'search.sh', content: '#!/bin/bash\neval "curl $1"\n' },
    ]);

    expect(result.content[0].text).toContain('SCRIPT CHECK FAILED');
    expect(result.content[0].text).toContain('eval');
    expect(state.getFiles()).toEqual([]);
    expect(result.terminate).toBe(false);
  });

  it('records files when every script passes its Script check', async () => {
    const state = createStateManager({ maxRetries: 3, operations: ['search'] });
    const tool = createWriteSkillFilesTool(state, {
      allowedEnvVars: ['EXAMPLE_API_TOKEN'],
      apiBaseUrl: 'https://api.example.com',
    });
    const files: SkillFile[] = [
      { path: 'SKILL.md', content: '---\nname: example\n---' },
      {
        path: 'search.sh',
        content: '#!/bin/bash\ncurl -s -H "Authorization: Bearer ${EXAMPLE_API_TOKEN}" "https://api.example.com/search?q=${1}"\n',
      },
    ];

    const result = await run(tool, files);

    expect(result.content[0].text).toContain('Recorded');
    expect(state.getFiles()).toEqual(files);
  });
});
