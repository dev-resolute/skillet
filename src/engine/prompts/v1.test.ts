import { describe, it, expect } from 'vitest';
import { v1Prompt } from './v1.js';

describe('v1Prompt', () => {
  it('has correct metadata', () => {
    expect(v1Prompt.version).toBe('1.0.0');
    expect(v1Prompt.name).toBe('default');
    expect(v1Prompt.description).toBe('The original skillet prompt');
  });

  it('builds a prompt with all required sections and every Operation', () => {
    const result = v1Prompt.build({
      skillName: 'example',
      operations: [
        { name: 'list users', slice: null },
        { name: 'get user', slice: null },
      ],
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'bearer' }),
      docs: 'Some documentation',
      maxRetries: 3,
    });

    expect(result).toContain('You are skillet');
    expect(result).toContain('list users');
    expect(result).toContain('get user');
    expect(result).toContain('https://api.example.com');
    expect(result).toContain('bearer');
    expect(result).toContain('Some documentation');
    expect(result).toContain('3 times');
    expect(result).toContain('Rules');
    expect(result).toContain('Output format');
  });

  it('includes each Operation spec slice when available', () => {
    const result = v1Prompt.build({
      skillName: 'example',
      operations: [{ name: 'get user', slice: '{"method": "GET", "path": "/users"}' }],
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'basic' }),
      docs: 'Docs',
      maxRetries: 2,
    });

    expect(result).toContain('GET');
    expect(result).toContain('/users');
    expect(result).not.toContain('No OpenAPI spec available');
  });

  it('shows no spec message for Operations without a slice', () => {
    const result = v1Prompt.build({
      skillName: 'example',
      operations: [{ name: 'create user', slice: null }],
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'unsupported' }),
      docs: 'Docs',
      maxRetries: 5,
    });

    expect(result).toContain('No OpenAPI spec available');
  });

  it('truncates docs to 8000 chars', () => {
    const longDocs = 'a'.repeat(10000);
    const result = v1Prompt.build({
      skillName: 'example',
      operations: [{ name: 'test', slice: null }],
      apiBaseUrl: 'https://api.example.com',
      auth: JSON.stringify({ type: 'bearer' }),
      docs: longDocs,
      maxRetries: 3,
    });

    expect(result.length).toBeLessThan(10000 + 1500); // prompt itself adds some overhead
    expect(result).toContain('a'.repeat(8000));
    expect(result).not.toContain('a'.repeat(9000));
  });
});
