import { describe, it, expect } from 'vitest';
import { v2Prompt } from './v2.js';

const context = {
  skillName: 'petstore',
  operations: [
    { name: 'list pets', slice: '{"method": "GET", "path": "/pets"}' },
    { name: 'add pet', slice: null },
  ],
  apiBaseUrl: 'https://petstore.swagger.io/v2',
  auth: JSON.stringify({ type: 'bearer', header: 'Authorization', envVars: ['PETSTORE_API_TOKEN'] }),
  docs: 'Petstore docs',
  maxRetries: 3,
};

describe('v2Prompt', () => {
  it('has correct metadata', () => {
    expect(v2Prompt.version).toBe('2.0.0');
    expect(v2Prompt.name).toBe('pi-skills');
  });

  it('carries the format contract and the worked example', () => {
    const result = v2Prompt.build(context);

    expect(result).toContain('EXACTLY two keys');
    expect(result).toContain('Use for');
    expect(result).toContain('{baseDir}');
    expect(result).toContain('## Setup');
    expect(result).toContain('Output Format');
    expect(result).toContain('brave-search');
    expect(result).toContain('not live-verified');
  });

  it('includes every Operation, the auth scheme, and the base URL', () => {
    const result = v2Prompt.build(context);

    expect(result).toContain('list pets');
    expect(result).toContain('add pet');
    expect(result).toContain('PETSTORE_API_TOKEN');
    expect(result).toContain('https://petstore.swagger.io/v2');
    expect(result).toContain('No OpenAPI spec available');
  });

  it('instructs placeholder-based auth construction', () => {
    const result = v2Prompt.build(context);

    expect(result).toContain('${ENV_VAR}');
    expect(result).toContain('base64(');
    expect(result).toContain('never adds or fixes headers');
  });
});
