/**
 * Prompt registry for managing and looking up prompt templates by version.
 */
import type { PromptTemplate } from './types.js';
import { v1Prompt } from './v1.js';
import { v2Prompt } from './v2.js';

export interface PromptRegistry {
  register(prompt: PromptTemplate): void;
  get(version: string): PromptTemplate;
  getDefault(): PromptTemplate;
  list(): PromptTemplate[];
}

export function createPromptRegistry(): PromptRegistry {
  const prompts = new Map<string, PromptTemplate>();

  prompts.set(v1Prompt.version, v1Prompt);
  prompts.set(v2Prompt.version, v2Prompt);

  return {
    register(prompt) {
      prompts.set(prompt.version, prompt);
    },
    get(version) {
      const prompt = prompts.get(version);
      if (!prompt) {
        throw new Error(`Prompt version ${version} not found`);
      }
      return prompt;
    },
    getDefault() {
      return v2Prompt;
    },
    list() {
      return Array.from(prompts.values());
    },
  };
}
