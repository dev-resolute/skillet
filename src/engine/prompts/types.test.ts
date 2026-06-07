import { describe, it, expect } from 'vitest';
import type { PromptTemplate, PromptContext } from './types.js';

describe('PromptTemplate', () => {
  it('can be implemented with a version and build method', () => {
    const prompt: PromptTemplate = {
      version: '1.0.0',
      name: 'test',
      description: 'A test prompt',
      build: (ctx: PromptContext) => `Hello ${ctx.action}`,
    };

    const result = prompt.build({
      action: 'test',
      apiBaseUrl: 'https://example.com',
      auth: 'bearer',
      slice: null,
      docs: 'docs',
      maxRetries: 3,
    });

    expect(result).toBe('Hello test');
    expect(prompt.version).toBe('1.0.0');
    expect(prompt.name).toBe('test');
  });

  it('has a name and description', () => {
    const prompt: PromptTemplate = {
      version: '2.0.0',
      name: 'detailed',
      description: 'A more detailed prompt for testing',
      build: (ctx: PromptContext) => `${ctx.action} at ${ctx.apiBaseUrl}`,
    };

    expect(prompt.name).toBe('detailed');
    expect(prompt.description).toBe('A more detailed prompt for testing');
  });

  it('PromptContext includes all required fields', () => {
    const ctx: PromptContext = {
      action: 'list',
      apiBaseUrl: 'https://api.example.com',
      auth: 'bearer',
      slice: null,
      docs: 'some docs',
      maxRetries: 5,
    };

    expect(ctx.action).toBe('list');
    expect(ctx.apiBaseUrl).toBe('https://api.example.com');
    expect(ctx.auth).toBe('bearer');
    expect(ctx.slice).toBeNull();
    expect(ctx.docs).toBe('some docs');
    expect(ctx.maxRetries).toBe(5);
  });
});
