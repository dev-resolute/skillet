import { Type } from '@earendil-works/pi-ai';
import type { SkillFile } from '../../types.js';
import type { StateManager } from '../state.js';

export function createWriteSkillFilesTool(stateManager: StateManager) {
  return {
    name: 'write_skill_files',
    label: 'Write Skill Files',
    description: 'Record the generated skill files. Provide an array of {path, content} objects.',
    parameters: Type.Object({
      files: Type.Array(
        Type.Object({
          path: Type.String({ description: 'Relative path within the skill dir, e.g. SKILL.md or search' }),
          content: Type.String({ description: 'File content' }),
        })
      ),
    }),
    execute: async (_toolCallId: string, params: unknown) => {
      const { files } = params as { files: SkillFile[] };
      stateManager.setFiles(files);
      return {
        content: [{ type: 'text' as const, text: `Recorded ${files.length} skill files.` }],
        details: {},
        terminate: stateManager.shouldTerminate(),
      };
    },
  };
}
