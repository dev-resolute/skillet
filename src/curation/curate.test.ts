import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { curate, toSkillsRepoLayout } from './curate.js';
import type { SkillResult, GalleryEntry } from '../types.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'skillet-curate-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const skillMd = `---
name: petstore
description: Petstore API via curl. Use for listing and adding pets.
---
# Petstore
## Setup
## list pets
## add pet
## Output Format
`;

function passedResult(): SkillResult {
  return {
    name: 'petstore',
    files: [
      { path: 'SKILL.md', content: skillMd },
      { path: 'list-pets.sh', content: '#!/bin/bash\nexit 0\n' },
      { path: 'add-pet.sh', content: '#!/bin/bash\nexit 0\n' },
    ],
    operations: [
      {
        operation: 'list pets',
        status: 'passed',
        attempts: 1,
        lastRequest: { method: 'GET', url: 'https://api.example.com/pets', headers: {} },
      },
      {
        operation: 'add pet',
        status: 'blocked',
        attempts: 0,
        lastRequest: { method: 'POST', url: 'https://api.example.com/pets', headers: {} },
        report: 'Mutating operations are not live-tested by default.',
      },
    ],
    promptVersion: '2.0.0',
  };
}

function writeScripts(result: SkillResult, scripts?: Record<string, string>) {
  for (const file of result.files) {
    const content = scripts?.[file.path] ?? file.content;
    writeFileSync(join(dir, file.path), content, { mode: 0o755 });
  }
}

describe('curate', () => {
  it('publishes a Skill meeting the bar: smoke-runs read ops, emits a Gallery entry', async () => {
    const result = passedResult();
    writeScripts(result, {
      'list-pets.sh': '#!/bin/bash\necho "smoke ok"\nexit 0\n',
      'add-pet.sh': `#!/bin/bash\ntouch "${join(dir, 'MUTATING_WAS_EXECUTED')}"\n`,
    });

    const outcome = await curate({ skillDir: dir, result });

    expect(outcome.published).toBe(true);
    expect(outcome.entry).toMatchObject({
      name: 'petstore',
      apiName: 'petstore',
      description: 'Petstore API via curl. Use for listing and adding pets.',
      promptVersion: '2.0.0',
      operations: [
        { name: 'list pets', methodClass: 'read', verification: 'passed' },
        { name: 'add pet', methodClass: 'mutating', verification: 'blocked' },
      ],
    });
    expect(outcome.entry!.files).toEqual(result.files);
    expect(outcome.entry!.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(existsSync(join(dir, 'MUTATING_WAS_EXECUTED'))).toBe(false);
  });

  it('rejects the whole Skill when a read Operation fails its Smoke-run', async () => {
    const result = passedResult();
    writeScripts(result, { 'list-pets.sh': '#!/bin/bash\nexit 7\n' });

    const outcome = await curate({ skillDir: dir, result });

    expect(outcome.published).toBe(false);
    expect(outcome.entry).toBeUndefined();
    expect(outcome.report.join('\n')).toContain('Smoke-run failed');
  });

  it('rejects without smoke-running when a read Operation did not pass verification', async () => {
    const result = passedResult();
    result.operations[0].status = 'failed';
    writeScripts(result);

    const outcome = await curate({ skillDir: dir, result });

    expect(outcome.published).toBe(false);
    expect(outcome.report.join('\n')).toContain('publish bar');
  });

  it('rejects when a read Operation has no matching script on disk', async () => {
    const result = passedResult();
    writeFileSync(join(dir, 'SKILL.md'), skillMd);

    const outcome = await curate({ skillDir: dir, result });

    expect(outcome.published).toBe(false);
    expect(outcome.report.join('\n')).toContain('list-pets.sh');
  });

  it('passes per-Operation smoke args to the script', async () => {
    const result = passedResult();
    writeScripts(result, {
      'list-pets.sh': '#!/bin/bash\n[ "$1" = "available" ] || exit 1\n',
    });

    const ok = await curate({ skillDir: dir, result, smokeArgs: { 'list pets': ['available'] } });
    expect(ok.published).toBe(true);

    const bad = await curate({ skillDir: dir, result });
    expect(bad.published).toBe(false);
  });
});

describe('toSkillsRepoLayout', () => {
  it('lays a published Gallery entry out under <name>/ with an embedded gallery-entry.json', () => {
    const entry: GalleryEntry = {
      name: 'github',
      apiName: 'GitHub',
      description: 'GitHub API operations',
      operations: [{ name: 'list issues', methodClass: 'read', verification: 'passed' }],
      files: [
        { path: 'SKILL.md', content: '---\nname: github\n---\n# GitHub' },
        { path: 'list-issues.sh', content: '#!/bin/bash\necho hi' },
      ],
      promptVersion: '2.0.0',
      generatedAt: '2026-06-18T00:00:00.000Z',
    };

    const files = toSkillsRepoLayout(entry);
    const byPath = new Map(files.map((f) => [f.path, f.content]));

    expect(byPath.get('github/SKILL.md')).toBe('---\nname: github\n---\n# GitHub');
    expect(byPath.get('github/list-issues.sh')).toBe('#!/bin/bash\necho hi');

    const galleryEntryRaw = byPath.get('github/.skillet/gallery-entry.json');
    expect(galleryEntryRaw).toBeDefined();
    expect(JSON.parse(galleryEntryRaw as string)).toEqual(entry);
  });
});
