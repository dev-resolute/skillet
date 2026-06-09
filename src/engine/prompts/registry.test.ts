import { describe, it, expect } from 'vitest';
import { createPromptRegistry } from './registry.js';
import { v1Prompt } from './v1.js';
import { v2Prompt } from './v2.js';
import type { PromptTemplate } from './types.js';

describe('PromptRegistry', () => {
  it('returns v2 as the default prompt', () => {
    const registry = createPromptRegistry();
    const defaultPrompt = registry.getDefault();
    expect(defaultPrompt).toBe(v2Prompt);
    expect(defaultPrompt.version).toBe('2.0.0');
  });

  it('keeps v1 addressable by version', () => {
    const registry = createPromptRegistry();
    expect(registry.get('1.0.0')).toBe(v1Prompt);
    expect(registry.get('2.0.0')).toBe(v2Prompt);
  });

  it('throws for unknown version', () => {
    const registry = createPromptRegistry();
    expect(() => registry.get('99.0.0')).toThrow('not found');
  });

  it('lists all registered prompts', () => {
    const registry = createPromptRegistry();
    const prompts = registry.list();
    expect(prompts).toHaveLength(2);
    expect(prompts).toContain(v1Prompt);
    expect(prompts).toContain(v2Prompt);
  });

  it('can register additional prompts', () => {
    const registry = createPromptRegistry();
    const customPrompt: PromptTemplate = {
      version: '3.0.0-test',
      name: 'custom',
      description: 'A custom prompt',
      build: (ctx) => `Custom: ${ctx.skillName}`,
    };

    registry.register(customPrompt);
    expect(registry.get('3.0.0-test')).toBe(customPrompt);
    expect(registry.list()).toHaveLength(3);
  });
});
