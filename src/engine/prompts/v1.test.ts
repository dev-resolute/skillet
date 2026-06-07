import { describe, it, expect } from 'vitest';
import { v1Prompt } from './v1.js';

describe('v1Prompt', () => {
  it('has correct metadata', () => {
    expect(v1Prompt.version).toBe('1.0.0');
    expect(v1Prompt.name).toBe('default');
    expect(v1Prompt.description).toBe('The original skillet prompt');
  });

  it('builds a prompt with all required sections', () => {
    const result = v1Prompt.build({
      action: 'list users',
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'bearer' }),
      slice: null,
      docs: 'Some documentation',
      maxRetries: 3,
    });

    expect(result).toContain('You are skillet');
    expect(result).toContain('list users');
    expect(result).toContain('https://api.example.com');
    expect(result).toContain('bearer');
    expect(result).toContain('Some documentation');
    expect(result).toContain('3 times');
    expect(result).toContain('Rules');
    expect(result).toContain('Output format');
  });

  it('includes spec slice when available', () => {
    const result = v1Prompt.build({
      action: 'get',
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'basic' }),
      slice: '{"method": "GET", "path": "/users"}',
      docs: 'Docs',
      maxRetries: 2,
    });

    expect(result).toContain('GET');
    expect(result).toContain('/users');
    expect(result).not.toContain('No OpenAPI spec available');
  });

  it('shows no spec message when slice is null', () => {
    const result = v1Prompt.build({
      action: 'create',
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'unsupported' }),
      slice: null,
      docs: 'Docs',
      maxRetries: 5,
    });

    expect(result).toContain('No OpenAPI spec available');
  });

  it('truncates docs to 8000 chars', () => {
    const longDocs = 'a'.repeat(10000);
    const result = v1Prompt.build({
      action: 'test',
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'bearer' }),
      slice: null,
      docs: longDocs,
      maxRetries: 3,
    });

    expect(result.length).toBeLessThan(10000 + 500); // prompt itself adds some overhead
    expect(result).toContain('a'.repeat(8000));
    expect(result).not.toContain('a'.repeat(9000));
  });
});
