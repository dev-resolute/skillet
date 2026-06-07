import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SkillFile, WriteResult } from '../types.js';

export type { WriteResult } from '../types.js';

export interface SkillWriter {
  write(files: SkillFile[], outputPath: string): Promise<WriteResult>;
}

export function createSkillWriter(): SkillWriter {
  return {
    async write(files, outputPath) {
      const errors: string[] = [];
      let filesWritten = 0;

      for (const file of files) {
        try {
          // Validate path - no directory traversal
          if (file.path.includes('..')) {
            errors.push(`Invalid path: ${file.path} (directory traversal detected)`);
            continue;
          }

          const filePath = join(outputPath, file.path);
          const dir = dirname(filePath);
          
          await mkdir(dir, { recursive: true });
          await writeFile(filePath, file.content, 'utf-8');
          filesWritten++;
        } catch (err: any) {
          errors.push(`Failed to write ${file.path}: ${err.message}`);
        }
      }

      return {
        success: errors.length === 0,
        filesWritten,
        errors,
      };
    },
  };
}
