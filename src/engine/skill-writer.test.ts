import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSkillWriter } from './skill-writer.js';

describe('SkillWriter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'skillet-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes a single file to a new directory', async () => {
    const writer = createSkillWriter();
    const files = [{ path: 'SKILL.md', content: '---\nname: test\n---' }];
    
    const result = await writer.write(files, tempDir);
    
    expect(result.success).toBe(true);
    expect(result.filesWritten).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('writes multiple files including nested directories', async () => {
    const writer = createSkillWriter();
    const files = [
      { path: 'SKILL.md', content: '---\nname: test\n---' },
      { path: 'search', content: '#!/bin/bash\ncurl -s https://example.com' },
      { path: 'subdir/nested.md', content: 'nested content' },
    ];
    
    const result = await writer.write(files, tempDir);
    
    expect(result.success).toBe(true);
    expect(result.filesWritten).toBe(3);
    expect(result.errors).toEqual([]);
  });

  it('rejects directory traversal attempts', async () => {
    const writer = createSkillWriter();
    const files = [
      { path: 'SKILL.md', content: 'valid' },
      { path: '../outside.md', content: 'malicious' },
    ];
    
    const result = await writer.write(files, tempDir);
    
    expect(result.success).toBe(false);
    expect(result.filesWritten).toBe(1); // only valid one
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('directory traversal');
  });

  it('reports file write errors', async () => {
    const writer = createSkillWriter();
    // Use a non-existent parent directory to simulate write failure
    const invalidPath = '/nonexistent/skillet/test';
    const files = [{ path: 'test.md', content: 'test' }];
    
    const result = await writer.write(files, invalidPath);
    
    expect(result.success).toBe(false);
    expect(result.filesWritten).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});
