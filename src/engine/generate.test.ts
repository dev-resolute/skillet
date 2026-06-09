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
      post: {
        operationId: 'addPet',
        summary: 'Add a new pet',
        responses: { '201': { description: 'Created' } },
      },
    },
    '/pets/{id}': {
      get: {
        operationId: 'getPetById',
        summary: 'Get a pet by id',
        responses: { '200': { description: 'OK' } },
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

function mockDocsAndSpec(mockFetch: ReturnType<typeof vi.mocked<typeof fetch>>) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/html' }),
    text: async () => '<html>Petstore docs</html>',
  } as Response);
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(petstoreSpec),
  } as Response);
}

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

  it('one Skill, two read + one mutating Operation: passed/passed/blocked in a single run', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockDocsAndSpec(mockFetch);

    // run_test live calls for the two read Operations
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 1, name: 'Fluffy' }]),
    } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 1, name: 'Fluffy' }),
    } as Response);

    faux.appendResponses([
      fauxAssistantMessage([
        fauxText('Generating the petstore skill.'),
        fauxToolCall('write_skill_files', {
          files: [
            { path: 'SKILL.md', content: '---\nname: petstore\ndescription: Petstore API. Use for managing pets.\n---\n# Petstore' },
            { path: 'list-pets.sh', content: '#!/bin/bash\ncurl -s https://api.example.com/pets' },
            { path: 'get-pet.sh', content: '#!/bin/bash\ncurl -s "https://api.example.com/pets/$1"' },
            { path: 'add-pet.sh', content: '#!/bin/bash\ncurl -s -X POST https://api.example.com/pets' },
          ],
        }),
      ], { stopReason: 'toolUse' }),
    ]);
    faux.appendResponses([
      fauxAssistantMessage([
        fauxToolCall('run_test', {
          operation: 'list pets',
          method: 'GET',
          url: 'https://api.example.com/pets',
          headers: {},
        }),
      ], { stopReason: 'toolUse' }),
    ]);
    faux.appendResponses([
      fauxAssistantMessage([
        fauxToolCall('run_test', {
          operation: 'get pet by id',
          method: 'GET',
          url: 'https://api.example.com/pets/1',
          headers: {},
        }),
      ], { stopReason: 'toolUse' }),
    ]);
    faux.appendResponses([
      fauxAssistantMessage([
        fauxToolCall('run_test', {
          operation: 'add pet',
          method: 'POST',
          url: 'https://api.example.com/pets',
          headers: {},
          body: '{"name":"Rex"}',
        }),
      ], { stopReason: 'toolUse' }),
    ]);
    faux.appendResponses([
      fauxAssistantMessage([fauxText('Done: two operations verified, one blocked.')]),
    ]);

    const result = await generateSkill({
      docsUrl: 'https://docs.example.com',
      operations: ['list pets', 'get pet by id', 'add pet'],
      skillName: 'petstore',
      apiDomain: 'api.example.com',
      credentials: {},
      model: faux.getModel(),
    });

    expect(result.name).toBe('petstore');
    expect(result.files.map((f) => f.path)).toEqual([
      'SKILL.md',
      'list-pets.sh',
      'get-pet.sh',
      'add-pet.sh',
    ]);

    const byOp = Object.fromEntries(result.operations.map((o) => [o.operation, o]));
    expect(byOp['list pets']).toMatchObject({ status: 'passed', attempts: 1 });
    expect(byOp['get pet by id']).toMatchObject({ status: 'passed', attempts: 1 });
    expect(byOp['add pet']).toMatchObject({ status: 'blocked', attempts: 0 });
    expect(result.promptVersion).toBeDefined();
  });

  it('derives the skill name from the API domain when none is given', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>API docs without spec links</html>',
    } as Response);
    for (let i = 0; i < 6; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      } as Response);
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as Response);

    faux.appendResponses([
      fauxAssistantMessage([
        fauxToolCall('write_skill_files', {
          files: [
            { path: 'SKILL.md', content: '---\nname: example\n---\n' },
            { path: 'search.sh', content: '#!/bin/bash\ncurl -s https://api.example.com/search' },
          ],
        }),
      ], { stopReason: 'toolUse' }),
    ]);
    faux.appendResponses([
      fauxAssistantMessage([
        fauxToolCall('run_test', {
          operation: 'search',
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
      operations: ['search'],
      apiDomain: 'api.example.com',
      credentials: {},
      model: faux.getModel(),
    });

    expect(result.name).toBe('example');
    expect(result.operations[0]).toMatchObject({ operation: 'search', status: 'passed' });
  });

  it('throws for invalid promptVersion', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>docs</html>',
    } as Response);

    await expect(generateSkill({
      docsUrl: 'https://docs.example.com',
      operations: ['test'],
      apiDomain: 'api.example.com',
      credentials: {},
      model: faux.getModel(),
      promptVersion: '99.0.0',
    })).rejects.toThrow('not found');
  });
});
