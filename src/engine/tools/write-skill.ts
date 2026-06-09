import { Type } from '@earendil-works/pi-ai';
import type { SkillFile } from '../../types.js';
import type { StateManager } from '../state.js';
import { checkScript, type ScriptCheckOptions } from '../../tools/script-check.js';
import { checkSkillFormat } from '../../tools/format-check.js';

export function createWriteSkillFilesTool(stateManager: StateManager, scriptCheck?: ScriptCheckOptions) {
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

      if (scriptCheck) {
        const scriptPaths = files.filter((f) => f.path.endsWith('.sh')).map((f) => f.path);
        const failures = files
          .filter((f) => f.path.endsWith('.sh'))
          .flatMap((f) =>
            checkScript(f.content, scriptCheck).violations.map(
              (v) => `${f.path}:${v.line} [${v.rule}] ${v.message}`
            )
          );

        const skillMd = files.find((f) => f.path === 'SKILL.md');
        if (!skillMd) {
          failures.push('SKILL.md [missing] Every skill must include a SKILL.md');
        } else {
          const format = checkSkillFormat(skillMd.content, {
            operations: stateManager.getOperations().map((o) => o.operation),
            allowedEnvVars: scriptCheck.allowedEnvVars,
            scriptPaths,
          });
          failures.push(...format.violations.map((v) => `SKILL.md [${v.rule}] ${v.message}`));
        }

        if (failures.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `CHECK FAILED — files NOT recorded. Fix them and call write_skill_files again:\n${failures.join('\n')}`,
              },
            ],
            details: {},
            terminate: false,
          };
        }
      }

      stateManager.setFiles(files);
      return {
        content: [{ type: 'text' as const, text: `Recorded ${files.length} skill files.` }],
        details: {},
        terminate: stateManager.shouldTerminate(),
      };
    },
  };
}
