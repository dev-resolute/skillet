import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSkill, installSkill, SkillNotFoundError } from './install.js';
import type { GalleryEntry } from '../types.js';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sampleEntry: GalleryEntry = {
  name: 'jira',
  apiName: 'Jira',
  description: 'Access Jira resources.',
  operations: [
    { name: 'get current user', methodClass: 'read', verification: 'passed' },
    { name: 'get fields', methodClass: 'read', verification: 'passed' },
  ],
  files: [
    { path: 'SKILL.md', content: '# Jira\n' },
    { path: 'get-current-user.sh', content: '#!/bin/bash\necho hi\n' },
  ],
  promptVersion: '2.0.0',
  generatedAt: '2026-06-20T19:30:00.000Z',
};

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

describe('fetchSkill', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the gallery entry and returns entry + files', async () => {
    mockFetchOnce(sampleEntry);

    const result = await fetchSkill('jira');

    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/dev-resolute/skillet-skills/main/jira/.skillet/gallery-entry.json'
    );
    expect(result.entry.apiName).toBe('Jira');
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('SKILL.md');
  });

  it('throws SkillNotFoundError on 404', async () => {
    mockFetchOnce({}, { ok: false, status: 404 });

    await expect(fetchSkill('nope')).rejects.toBeInstanceOf(SkillNotFoundError);
  });

  it('throws on a non-404 error status', async () => {
    mockFetchOnce({}, { ok: false, status: 500 });

    await expect(fetchSkill('boom')).rejects.toThrow(/500/);
  });

  it('throws when the entry is malformed (no files array)', async () => {
    mockFetchOnce({ name: 'broken', apiName: 'Broken' });

    await expect(fetchSkill('broken')).rejects.toThrow(/malformed/);
  });
});

describe('installSkill', () => {
  let dest: string;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (dest) rmSync(dest, { recursive: true, force: true });
  });

  it('writes SKILL.md + scripts and never creates .skillet/', async () => {
    dest = mkdtempSync(join(tmpdir(), 'skillet-add-'));
    mockFetchOnce(sampleEntry);

    const result = await installSkill('jira', dest);

    expect(existsSync(join(dest, 'jira', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(dest, 'jira', 'get-current-user.sh'))).toBe(true);
    expect(existsSync(join(dest, 'jira', '.skillet'))).toBe(false);
    expect(result.apiName).toBe('Jira');
    expect(result.verifiedCount).toBe(2);
    expect(result.installedPath).toBe(join(dest, 'jira'));
  });

  it('removes stale files on re-install', async () => {
    dest = mkdtempSync(join(tmpdir(), 'skillet-add-'));
    mkdirSync(join(dest, 'jira'), { recursive: true });
    writeFileSync(join(dest, 'jira', 'stale.sh'), 'old\n');

    mockFetchOnce(sampleEntry);

    await installSkill('jira', dest);

    expect(existsSync(join(dest, 'jira', 'stale.sh'))).toBe(false);
    expect(readFileSync(join(dest, 'jira', 'SKILL.md'), 'utf8')).toContain('# Jira');
  });

  it('does not remove an existing install when the fetch 404s', async () => {
    dest = mkdtempSync(join(tmpdir(), 'skillet-add-'));
    mkdirSync(join(dest, 'jira'), { recursive: true });
    writeFileSync(join(dest, 'jira', 'keep.sh'), 'keep\n');

    mockFetchOnce({}, { ok: false, status: 404 });

    await expect(installSkill('jira', dest)).rejects.toBeInstanceOf(SkillNotFoundError);
    expect(existsSync(join(dest, 'jira', 'keep.sh'))).toBe(true);
  });

  it('counts only passed operations in verifiedCount', async () => {
    dest = mkdtempSync(join(tmpdir(), 'skillet-add-'));
    const mixed: GalleryEntry = {
      ...sampleEntry,
      operations: [
        { name: 'a', methodClass: 'read', verification: 'passed' },
        { name: 'b', methodClass: 'mutating', verification: 'blocked' },
      ],
    };
    mockFetchOnce(mixed);

    const result = await installSkill('jira', dest);

    expect(result.verifiedCount).toBe(1);
  });
});
