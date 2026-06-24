import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getModels } from '@earendil-works/pi-ai';
import { resolveModel } from './model.js';

const ENV_KEYS = [
  'SKILLET_PROVIDER', 'SKILLET_MODEL',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'ANTHROPIC_OAUTH_TOKEN', 'GEMINI_API_KEY',
];

let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllEnvs();
});

describe('resolveModel — selection', () => {
  it('defaults to openai/gpt-4o-mini when nothing is set (key present)', () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const result = resolveModel();

    expect(result.provider).toBe('openai');
    expect(result.modelId).toBe('gpt-4o-mini');
    expect(result.model).toBeTruthy();
  });

  it('resolves an explicit provider + model when the key is present', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const someAnthropicId = getModels('anthropic')[0].id;

    const result = resolveModel({ provider: 'anthropic', modelId: someAnthropicId });

    expect(result.provider).toBe('anthropic');
    expect(result.modelId).toBe(someAnthropicId);
    expect(result.model).toBeTruthy();
  });

  it('reads SKILLET_PROVIDER / SKILLET_MODEL from env', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const someAnthropicId = getModels('anthropic')[0].id;
    process.env.SKILLET_PROVIDER = 'anthropic';
    process.env.SKILLET_MODEL = someAnthropicId;

    const result = resolveModel();

    expect(result.provider).toBe('anthropic');
    expect(result.modelId).toBe(someAnthropicId);
  });

  it('lets explicit opts override env', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.SKILLET_PROVIDER = 'anthropic';
    process.env.SKILLET_MODEL = 'some-other-model';

    const result = resolveModel({ provider: 'openai', modelId: 'gpt-4o-mini' });

    expect(result.provider).toBe('openai');
    expect(result.modelId).toBe('gpt-4o-mini');
  });
});
