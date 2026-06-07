import { Type } from '@earendil-works/pi-ai';
import type { SkillFile } from '../../types.js';
import type { StateManager } from '../state.js';
import type { SkillWriter } from '../skill-writer.js';

export function createWriteSkillFilesTool(
  stateManager: StateManager,
  skillWriter: SkillWriter,
  outputPath: string = './output'
) {
  return {
    name: 'write_skill_files',
    label: 'Write Skill Files',
    description: 'Write the generated skill files. Provide an array of {path, content} objects.',
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
      const result = await skillWriter.write(files, outputPath);
      const shouldStop = stateManager.shouldTerminate();
      return {
        content: [{ type: 'text' as const, text: `Wrote ${result.filesWritten} files.` }],
        details: {},
        terminate: shouldStop,
      };
    },
  };
}
