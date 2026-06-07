import { describe, it, expect } from 'vitest';
import { createPromptRegistry } from './registry.js';
import { v1Prompt } from './v1.js';
import type { PromptTemplate } from './types.js';

describe('PromptRegistry', () => {
  it('returns the default prompt', () => {
    const registry = createPromptRegistry();
    const defaultPrompt = registry.getDefault();
    expect(defaultPrompt).toBe(v1Prompt);
    expect(defaultPrompt.version).toBe('1.0.0');
  });

  it('returns a prompt by version', () => {
    const registry = createPromptRegistry();
    const prompt = registry.get('1.0.0');
    expect(prompt).toBe(v1Prompt);
  });

  it('throws for unknown version', () => {
    const registry = createPromptRegistry();
    expect(() => registry.get('99.0.0')).toThrow('not found');
  });

  it('lists all registered prompts', () => {
    const registry = createPromptRegistry();
    const prompts = registry.list();
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toBe(v1Prompt);
  });

  it('can register additional prompts', () => {
    const registry = createPromptRegistry();
    const customPrompt: PromptTemplate = {
      version: '2.0.0',
      name: 'custom',
      description: 'A custom prompt',
      build: (ctx) => `Custom: ${ctx.action}`,
    };

    registry.register(customPrompt);
    expect(registry.get('2.0.0')).toBe(customPrompt);
    expect(registry.list()).toHaveLength(2);
  });
});
