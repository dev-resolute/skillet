import { describe, it, expect } from 'vitest';
import { detectAuth, sliceSpec, listOperations } from './spec.js';

const petstoreSpec = {
  openapi: '3.0.0',
  info: { title: 'Petstore', version: '1.0.0' },
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        summary: 'List all pets',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        operationId: 'createPet',
        summary: 'Create a pet',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' } } },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/pets/{id}': {
      get: {
        operationId: 'getPet',
        summary: 'Get a pet by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
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

describe('detectAuth', () => {
  it('detects bearer auth', async () => {
    const result = await detectAuth(JSON.stringify(petstoreSpec));
    expect(result).toEqual({ type: 'bearer', header: 'Authorization' });
  });

  it('detects basic auth', async () => {
    const spec = {
      ...petstoreSpec,
      components: {
        ...petstoreSpec.components,
        securitySchemes: {
          basicAuth: { type: 'http', scheme: 'basic' },
        },
      },
    };
    const result = await detectAuth(JSON.stringify(spec));
    expect(result).toEqual({ type: 'basic', header: 'Authorization' });
  });

  it('detects apiKey auth', async () => {
    const spec = {
      ...petstoreSpec,
      components: {
        ...petstoreSpec.components,
        securitySchemes: {
          apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
      },
    };
    const result = await detectAuth(JSON.stringify(spec));
    expect(result).toEqual({ type: 'apiKey', header: 'X-API-Key', keyName: 'X-API-Key' });
  });

  it('reports unsupported for oauth2', async () => {
    const spec = {
      ...petstoreSpec,
      components: {
        ...petstoreSpec.components,
        securitySchemes: {
          oauth2: { type: 'oauth2', flows: {} },
        },
      },
    };
    const result = await detectAuth(JSON.stringify(spec));
    expect(result.type).toBe('unsupported');
    expect((result as any).reason).toContain('OAuth2');
  });

  it('reports unsupported when no security schemes', async () => {
    const spec = {
      ...petstoreSpec,
      components: { ...petstoreSpec.components, securitySchemes: undefined },
    };
    const result = await detectAuth(JSON.stringify(spec));
    expect(result.type).toBe('unsupported');
    expect((result as any).reason).toContain('No security schemes');
  });

  it('supports Swagger 2.0 securityDefinitions', async () => {
    const swagger2 = {
      swagger: '2.0',
      info: { title: 'API', version: '1.0.0' },
      securityDefinitions: {
        api_key: { type: 'apiKey', in: 'header', name: 'api_key' },
      },
      paths: {},
    };
    const result = await detectAuth(JSON.stringify(swagger2));
    expect(result).toEqual({ type: 'apiKey', header: 'api_key', keyName: 'api_key' });
  });
});

describe('sliceSpec', () => {
  it('returns null for invalid JSON', async () => {
    const result = await sliceSpec('not json', 'list');
    expect(result).toBeNull();
  });

  it('finds operation by operationId', async () => {
    const result = await sliceSpec(JSON.stringify(petstoreSpec), 'listPets');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/pets');
  });

  it('finds operation by summary', async () => {
    const result = await sliceSpec(JSON.stringify(petstoreSpec), 'Get a pet');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('GET');
    expect(result!.path).toBe('/pets/{id}');
  });

  it('includes request and response schemas', async () => {
    const result = await sliceSpec(JSON.stringify(petstoreSpec), 'createPet');
    expect(result).not.toBeNull();
    expect(result!.schemas).toHaveProperty('request_application_json');
  });

  it('resolves $ref schemas', async () => {
    const result = await sliceSpec(JSON.stringify(petstoreSpec), 'getPet');
    expect(result).not.toBeNull();
    expect(result!.schemas).toHaveProperty('response_200_application_json');
    const schema = result!.schemas['response_200_application_json'] as any;
    expect(schema.properties).toHaveProperty('id');
    expect(schema.properties).toHaveProperty('name');
  });

  it('returns null when no match', async () => {
    const result = await sliceSpec(JSON.stringify(petstoreSpec), 'deleteEverything');
    expect(result).toBeNull();
  });
});

describe('listOperations', () => {
  it('enumerates every operation with name, method, path, and method class', async () => {
    const ops = await listOperations(JSON.stringify(petstoreSpec));

    expect(ops).toEqual([
      { name: 'List all pets', method: 'GET', path: '/pets', methodClass: 'read' },
      { name: 'Create a pet', method: 'POST', path: '/pets', methodClass: 'mutating' },
      { name: 'Get a pet by ID', method: 'GET', path: '/pets/{id}', methodClass: 'read' },
    ]);
  });

  it('falls back to operationId when summary is missing', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'X', version: '1' },
      paths: { '/things': { get: { operationId: 'listThings', responses: { '200': { description: 'OK' } } } } },
    };

    const ops = await listOperations(JSON.stringify(spec));

    expect(ops).toEqual([{ name: 'listThings', method: 'GET', path: '/things', methodClass: 'read' }]);
  });

  it('returns an empty list for an unparseable spec', async () => {
    expect(await listOperations('not json')).toEqual([]);
  });
});
