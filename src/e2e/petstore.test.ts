import { describe, it, expect } from 'vitest';
import { generateSkill } from '../engine/generate.js';

/**
 * E2E test against the public Swagger Petstore API.
 * This uses a real LLM (Anthropic) and a live API.
 * Run with: npm test -- src/e2e/petstore.test.ts
 */

describe('E2E: Petstore multi-Operation skill', () => {
  it(
    'generates one Skill with verified read Operations and a blocked mutating Operation',
    async () => {
      const result = await generateSkill({
        docsUrl: 'https://petstore.swagger.io/',
        operations: ['list pets by status', 'add a new pet'],
        skillName: 'petstore',
        apiDomain: 'petstore.swagger.io',
        apiBaseUrl: 'https://petstore.swagger.io/v2',
        // Petstore GET endpoints work without auth for this operation
        credentials: {},
        maxRetries: 3,
      });

      expect(result.name).toBe('petstore');
      expect(result.files.length).toBeGreaterThan(0);

      const byOp = Object.fromEntries(result.operations.map((o) => [o.operation, o]));

      const listPets = byOp['list pets by status'];
      expect(listPets.status).toBe('passed');
      expect(listPets.attempts).toBeGreaterThan(0);
      expect(listPets.lastRequest).toBeDefined();
      expect(listPets.lastRequest!.method.toUpperCase()).toBe('GET');
      expect(new URL(listPets.lastRequest!.url).hostname).toBe('petstore.swagger.io');

      const addPet = byOp['add a new pet'];
      expect(addPet.status).toBe('blocked');
      expect(addPet.attempts).toBe(0);
    },
    180000 // 3 minutes timeout for LLM generation
  );
});
