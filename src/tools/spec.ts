/**
 * detect_auth and sliceSpec — OpenAPI analysis.
 */
import OpenAPIParser from '@readme/openapi-parser';
import type { AuthScheme, SpecSlice, OperationCandidate } from '../types.js';
import { classifyMethod } from './runner.js';

export async function detectAuth(specText: string, apiName: string): Promise<AuthScheme> {
  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(specText);
  } catch {
    try {
      // Try YAML parsing with a lightweight approach — JSON.parse fails for YAML
      // For now, return unsupported; we can add yaml-js later if needed.
      return { type: 'unsupported', reason: 'YAML specs not yet supported' };
    } catch {
      return { type: 'unsupported', reason: 'Invalid spec format' };
    }
  }

  const schemes = getSecuritySchemes(spec);
  if (!schemes || Object.keys(schemes).length === 0) {
    return { type: 'unsupported', reason: 'No security schemes found in spec' };
  }

  const prefix = apiName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

  for (const [name, scheme] of Object.entries(schemes)) {
    const s = scheme as Record<string, unknown>;
    if (s.type === 'http') {
      const schemeValue = (s.scheme as string)?.toLowerCase();
      if (schemeValue === 'bearer') {
        return { type: 'bearer', header: 'Authorization', envVars: [`${prefix}_API_TOKEN`] };
      }
      if (schemeValue === 'basic') {
        return {
          type: 'basic',
          header: 'Authorization',
          envVars: [`${prefix}_EMAIL`, `${prefix}_API_TOKEN`],
        };
      }
    }
    if (s.type === 'apiKey') {
      const location = (s.in as string) || 'header';
      const keyName = (s.name as string) || name;
      if (location === 'header') {
        return { type: 'apiKey', header: keyName, keyName, envVars: [`${prefix}_API_KEY`] };
      }
    }
    if (s.type === 'oauth2') {
      return { type: 'unsupported', reason: 'OAuth2 is not supported in v1' };
    }
  }

  return { type: 'unsupported', reason: 'No supported security scheme found' };
}

function getSecuritySchemes(spec: Record<string, unknown>): Record<string, unknown> | undefined {
  const components = spec.components as Record<string, unknown> | undefined;
  if (components && components.securitySchemes) {
    return components.securitySchemes as Record<string, unknown>;
  }
  // Swagger 2.0
  if (spec.securityDefinitions) {
    return spec.securityDefinitions as Record<string, unknown>;
  }
  return undefined;
}

export type { SpecSlice } from '../types.js';

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

export async function listOperations(specText: string): Promise<OperationCandidate[]> {
  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(specText);
  } catch {
    return [];
  }

  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return [];

  const candidates: OperationCandidate[] = [];
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;
      if (typeof operation !== 'object' || operation === null) continue;
      const op = operation as Record<string, unknown>;
      const name = (op.summary as string) || (op.operationId as string) || `${method.toUpperCase()} ${path}`;
      candidates.push({
        name,
        method: method.toUpperCase(),
        path,
        methodClass: classifyMethod(method),
      });
    }
  }
  return candidates;
}

export async function sliceSpec(specText: string, action: string): Promise<SpecSlice | null> {
  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(specText);
  } catch {
    return null;
  }

  const dereferenced = await OpenAPIParser.dereference(spec as any);

  // Find the operation matching the action
  const paths = dereferenced.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return null;

  const actionLower = action.toLowerCase();
  let match: { path: string; method: string; operation: Record<string, unknown> } | null = null;

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== 'object' || operation === null) continue;
      const op = operation as Record<string, unknown>;
      const operationId = (op.operationId as string) || '';
      const summary = (op.summary as string) || '';
      const description = (op.description as string) || '';

      if (
        operationId.toLowerCase().includes(actionLower) ||
        summary.toLowerCase().includes(actionLower) ||
        description.toLowerCase().includes(actionLower) ||
        method.toLowerCase() === actionLower
      ) {
        match = { path, method: method.toUpperCase(), operation: op };
        break;
      }
    }
    if (match) break;
  }

  if (!match) return null;

  // Collect schemas used by this operation
  const schemas: Record<string, unknown> = {};
  const requestBody = match.operation.requestBody as Record<string, unknown> | undefined;
  if (requestBody && requestBody.content) {
    const content = requestBody.content as Record<string, unknown>;
    for (const [mediaType, media] of Object.entries(content)) {
      const schema = (media as Record<string, unknown>)?.schema as Record<string, unknown> | undefined;
      if (schema) {
        schemas[`request_${mediaType.replace(/[^a-zA-Z0-9]/g, '_')}`] = schema;
      }
    }
  }

  const responses = match.operation.responses as Record<string, unknown> | undefined;
  if (responses) {
    for (const [code, response] of Object.entries(responses)) {
      const resp = response as Record<string, unknown>;
      if (resp.content) {
        const content = resp.content as Record<string, unknown>;
        for (const [mediaType, media] of Object.entries(content)) {
          const schema = (media as Record<string, unknown>)?.schema as Record<string, unknown> | undefined;
          if (schema) {
            schemas[`response_${code}_${mediaType.replace(/[^a-zA-Z0-9]/g, '_')}`] = schema;
          }
        }
      }
    }
  }

  return {
    operation: match.operation,
    method: match.method,
    path: match.path,
    schemas,
  };
}
