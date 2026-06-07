import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerFauxProvider, fauxAssistantMessage, fauxText, fauxToolCall } from '@earendil-works/pi-ai';
import { generateSkill } from './generate.js';

const petstoreSpec = {
  openapi: '3.0.0',
  info: { title: 'Petstore', version: '1.0.0' },
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        summary: 'List all pets',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Pet' } },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
};

describe('generateSkill', () => {
  let faux: ReturnType<typeof registerFauxProvider>;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    faux = registerFauxProvider();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    faux.unregister();
  });

  it('end-to-end: generates skill and verifies via run_test', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);

    // Mock docs fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>Petstore docs</html>',
    } as Response);

    // Mock spec fetch (openapi.json)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(petstoreSpec),
    } as Response);

    // Mock run_test fetch (the live API call)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 1, name: 'Fluffy' }]),
    } as Response);

    // Script the faux LLM
    // Turn 1: write_skill_files
    faux.appendResponses([
      fauxAssistantMessage([
        fauxText('I will generate the listPets skill.'),
        fauxToolCall('write_skill_files', {
          files: [
            { path: 'SKILL.md', content: '---\nname: petstore\n---\n# Petstore\nList pets.' },
            { path: 'list', content: '#!/bin/bash\ncurl -s https://api.example.com/pets' },
          ],
        }),
      ], { stopReason: 'toolUse' }),
    ]);

    // Turn 2: run_test
    faux.appendResponses([
      fauxAssistantMessage([
        fauxText('Now let me verify the skill.'),
        fauxToolCall('run_test', {
          method: 'GET',
          url: 'https://api.example.com/pets',
          headers: { Authorization: 'Bearer ${API_TOKEN}' },
        }),
      ], { stopReason: 'toolUse' }),
    ]);

    // Turn 3: done
    faux.appendResponses([
      fauxAssistantMessage([fauxText('The skill has been verified successfully.')]),
    ]);

    const result = await generateSkill({
      docsUrl: 'https://docs.example.com',
      action: 'list pets',
      apiDomain: 'api.example.com',
      credentials: { Authorization: 'Bearer test-token' },
      model: faux.getModel(),
    });

    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('SKILL.md');
    expect(result.verification.status).toBe('passed');
    expect(result.verification.attempts).toBe(1);
  });

  it('uses docs-only fallback when no spec is found', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);

    // Mock docs fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>API docs without spec links</html>',
    } as Response);

    // All spec discovery attempts fail
    for (let i = 0; i < 6; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      } as Response);
    }

    // Mock run_test fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response);

    faux.appendResponses([
      fauxAssistantMessage([
        fauxText('No spec found, generating from docs.'),
        fauxToolCall('write_skill_files', {
          files: [
            { path: 'SKILL.md', content: '---\nname: myapi\n---\n' },
            { path: 'search', content: '#!/bin/bash\ncurl -s https://api.example.com/search' },
          ],
        }),
      ], { stopReason: 'toolUse' }),
    ]);

    faux.appendResponses([
      fauxAssistantMessage([
        fauxToolCall('run_test', {
          method: 'GET',
          url: 'https://api.example.com/search',
          headers: {},
        }),
      ], { stopReason: 'toolUse' }),
    ]);

    faux.appendResponses([
      fauxAssistantMessage([fauxText('Done.')]),
    ]);

    const result = await generateSkill({
      docsUrl: 'https://docs.example.com',
      action: 'search',
      apiDomain: 'api.example.com',
      credentials: {},
      model: faux.getModel(),
    });

    expect(result.files).toHaveLength(2);
    expect(result.verification.status).toBe('passed');
  });
});
