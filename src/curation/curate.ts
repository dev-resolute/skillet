/**
 * Curation flow — the trusted-surface step between engine output and the
 * public gallery. Enforces the publish bar and emits a Gallery entry.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SkillResult, GalleryEntry, MethodClass, SkillFile } from '../types.js';
import { classifyMethod } from '../tools/runner.js';
import { smokeRun } from './smoke-run.js';

export interface CurateOptions {
  skillDir: string;
  result: SkillResult;
  apiName?: string;
  smokeArgs?: Record<string, string[]>;
  env?: Record<string, string>;
}

export interface CurateOutcome {
  published: boolean;
  entry?: GalleryEntry;
  report: string[];
}

export async function curate(options: CurateOptions): Promise<CurateOutcome> {
  const { result } = options;
  const report: string[] = [];

  const classified = result.operations.map((op) => ({
    op,
    methodClass: methodClassOf(op.status, op.lastRequest?.method),
  }));

  // Publish bar: every read Operation passed; every mutating Operation blocked.
  for (const { op, methodClass } of classified) {
    if (methodClass === 'read' && op.status !== 'passed') {
      report.push(`publish bar: read Operation "${op.operation}" is ${op.status}, must be passed`);
    }
    if (methodClass === 'mutating' && op.status !== 'blocked') {
      report.push(`publish bar: mutating Operation "${op.operation}" is ${op.status}, must be blocked`);
    }
  }
  if (report.length > 0) {
    return { published: false, report };
  }

  for (const { op, methodClass } of classified) {
    if (methodClass !== 'read') continue;

    const script = `${kebab(op.operation)}.sh`;
    const scriptPath = join(options.skillDir, script);
    if (!existsSync(scriptPath)) {
      report.push(`missing script for read Operation "${op.operation}": ${script}`);
      continue;
    }

    const run = await smokeRun(scriptPath, options.smokeArgs?.[op.operation] ?? [], options.env ?? {});
    if (run.ok) {
      report.push(`Smoke-run passed: ${script}`);
    } else {
      report.push(
        `Smoke-run failed: ${script} (exit ${run.exitCode}): ${(run.stderr || run.stdout).slice(0, 300)}`
      );
    }
  }

  if (report.some((line) => line.startsWith('Smoke-run failed') || line.startsWith('missing script'))) {
    return { published: false, report };
  }

  const entry: GalleryEntry = {
    name: result.name,
    apiName: options.apiName ?? result.name,
    description: frontmatterDescription(result) ?? '',
    operations: classified.map(({ op, methodClass }) => ({
      name: op.operation,
      methodClass,
      verification: op.status as 'passed' | 'blocked',
    })),
    files: result.files,
    promptVersion: result.promptVersion,
    generatedAt: new Date().toISOString(),
  };

  return { published: true, entry, report };
}

/**
 * Maps a published Gallery entry into the Curated skills repo layout: every file
 * under `<name>/`, plus the entry itself at `<name>/.skillet/gallery-entry.json`
 * so the gallery build can glob it without re-deriving metadata.
 */
export function toSkillsRepoLayout(entry: GalleryEntry): SkillFile[] {
  return [
    ...entry.files.map((file) => ({
      path: `${entry.name}/${file.path}`,
      content: file.content,
    })),
    {
      path: `${entry.name}/.skillet/gallery-entry.json`,
      content: JSON.stringify(entry, null, 2),
    },
  ];
}

function methodClassOf(status: string, method: string | undefined): MethodClass {
  if (status === 'blocked') return 'mutating';
  return method ? classifyMethod(method) : 'read';
}

function kebab(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function frontmatterDescription(result: SkillResult): string | undefined {
  const skillMd = result.files.find((f) => f.path === 'SKILL.md');
  return skillMd?.content.match(/^description:\s*(.*)$/m)?.[1];
}
