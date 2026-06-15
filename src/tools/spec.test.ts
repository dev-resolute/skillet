import { describe, it, expect, vi } from 'vitest';
import { sliceSpec } from './spec.js';

const simpleSpec = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        operationId: 'listUsers',
        summary: 'List users',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { error: { type: 'string' } } },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
              },
            },
          },
          '500': {
            description: 'Internal Error',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { error: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
  },
});

const specWithRequestBody = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      post: {
        operationId: 'createUser',
        summary: 'Create user',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' } } },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { id: { type: 'string' } } },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { error: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
  },
});

describe('sliceSpec', () => {
  it('includes only 200/201 response schemas, excludes 4xx/5xx', async () => {
    const slice = await sliceSpec(simpleSpec, 'list users');
    expect(slice).not.toBeNull();
    expect(slice!.method).toBe('GET');
    expect(slice!.path).toBe('/users');

    const schemaKeys = Object.keys(slice!.schemas);
    expect(schemaKeys).toContain('response_200_application_json');
    expect(schemaKeys).not.toContain('response_400_application_json');
    expect(schemaKeys).not.toContain('response_401_application_json');
    expect(schemaKeys).not.toContain('response_500_application_json');
  });

  it('includes 201 response schemas and request body schemas', async () => {
    const slice = await sliceSpec(specWithRequestBody, 'create user');
    expect(slice).not.toBeNull();
    expect(slice!.method).toBe('POST');
    expect(slice!.path).toBe('/users');

    const schemaKeys = Object.keys(slice!.schemas);
    expect(schemaKeys).toContain('request_application_json');
    expect(schemaKeys).toContain('response_201_application_json');
    expect(schemaKeys).not.toContain('response_400_application_json');
  });

  it('handles operations with no 200/201 response gracefully', async () => {
    const specNoSuccess = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/health': {
          get: {
            operationId: 'healthCheck',
            summary: 'Health check',
            responses: {
              '204': { description: 'No Content' },
            },
          },
        },
      },
    });

    const slice = await sliceSpec(specNoSuccess, 'health check');
    expect(slice).not.toBeNull();
    expect(slice!.method).toBe('GET');
    expect(slice!.path).toBe('/health');
    expect(Object.keys(slice!.schemas)).toHaveLength(0);
  });

  it('preserves $ref pointers for large specs (>100KB)', async () => {
    // Build a large spec (100KB+) with a $ref to verify it's NOT dereferenced
    const baseSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: { name: { type: 'string' }, email: { type: 'string' } },
          },
        },
      },
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            summary: 'List users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { '$ref': '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
    });
    // Pad to 100KB+ by inserting a large unused field
    const paddedSpec = baseSpec.replace(
      '{"openapi"',
      '{"x-padding":"' + 'Y'.repeat(110000) + '","openapi"'
    );
    expect(paddedSpec.length).toBeGreaterThan(100000);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const slice = await sliceSpec(paddedSpec, 'list users');
      expect(slice).not.toBeNull();
      const schema = slice!.schemas['response_200_application_json'];
      expect(schema).toBeDefined();
      expect(schema).toHaveProperty('$ref');
      expect((schema as any).$ref).toBe('#/components/schemas/User');

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[skillet] Spec is large (110401 chars); skipping dereference'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[skillet] Sliced "List users" (GET /users):'));
    } finally {
      warnSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('dereferences $ref pointers for small specs (<100KB)', async () => {
    const smallSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: { name: { type: 'string' }, email: { type: 'string' } },
          },
        },
      },
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            summary: 'List users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { '$ref': '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(smallSpec.length).toBeLessThan(100000);

    const slice = await sliceSpec(smallSpec, 'list users');
    expect(slice).not.toBeNull();
    const schema = slice!.schemas['response_200_application_json'];
    expect(schema).toBeDefined();
    expect(schema).toHaveProperty('type');
    expect(schema).toHaveProperty('properties');
    expect(schema).not.toHaveProperty('$ref');
  });
});
