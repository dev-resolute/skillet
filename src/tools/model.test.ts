import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getModels, getEnvApiKey } from '@earendil-works/pi-ai';
import { resolveModel, ModelResolutionError, KEY_ENV_VARS } from './model.js';

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

describe('resolveModel — validation', () => {
  it('throws on an unknown provider, listing valid ones', () => {
    expect(() => resolveModel({ provider: 'not-a-provider', modelId: 'x' }))
      .toThrowError(ModelResolutionError);
    try {
      resolveModel({ provider: 'not-a-provider', modelId: 'x' });
    } catch (err) {
      expect((err as Error).message).toContain('not-a-provider');
      expect((err as Error).message).toContain('openai');
    }
  });

  it('requires an explicit model for a non-openai provider, listing ids', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    try {
      resolveModel({ provider: 'anthropic' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ModelResolutionError);
      expect((err as Error).message).toMatch(/model/i);
      expect((err as Error).message).toContain(getModels('anthropic')[0].id);
    }
  });

  it('rejects an invalid model id, listing valid ids', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    try {
      resolveModel({ provider: 'anthropic', modelId: 'totally-made-up' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ModelResolutionError);
      expect((err as Error).message).toContain('totally-made-up');
      expect((err as Error).message).toContain(getModels('anthropic')[0].id);
    }
  });

  it('reports a missing API key, naming the env var', () => {
    const googleId = getModels('google')[0].id;
    try {
      resolveModel({ provider: 'google', modelId: googleId });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ModelResolutionError);
      expect((err as Error).message).toContain('GEMINI_API_KEY');
    }
  });

  it('aggregates: model AND key missing → one error naming both', () => {
    try {
      resolveModel({ provider: 'google' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ModelResolutionError);
      const msg = (err as Error).message;
      expect(msg).toMatch(/model/i);
      expect(msg).toContain('GEMINI_API_KEY');
    }
  });
});

describe('KEY_ENV_VARS drift guard', () => {
  it('every mapped env var is recognized by pi-ai getEnvApiKey', () => {
    for (const [provider, vars] of Object.entries(KEY_ENV_VARS)) {
      for (const varName of vars) {
        vi.stubEnv(varName, 'stub-value');
        expect(getEnvApiKey(provider)).toBe('stub-value');
        vi.unstubAllEnvs();
      }
    }
  });
});
