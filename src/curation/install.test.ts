import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSkill, SkillNotFoundError } from './install.js';
import type { GalleryEntry } from '../types.js';

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the gallery entry and returns entry + files', async () => {
    vi.stubGlobal('fetch', vi.fn());
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
    vi.stubGlobal('fetch', vi.fn());
    mockFetchOnce({}, { ok: false, status: 404 });

    await expect(fetchSkill('nope')).rejects.toBeInstanceOf(SkillNotFoundError);
  });

  it('throws when the entry is malformed (no files array)', async () => {
    vi.stubGlobal('fetch', vi.fn());
    mockFetchOnce({ name: 'broken', apiName: 'Broken' });

    await expect(fetchSkill('broken')).rejects.toThrow(/malformed/);
  });
});
