import { describe, it, expect, vi } from 'vitest';
import { generateSkill } from '../engine/generate.js';

/**
 * E2E test against the public Swagger Petstore API.
 * This uses a real LLM (Anthropic) and a live API.
 * Run with: npm test -- src/e2e/petstore.test.ts
 */

describe('E2E: Petstore list pets', () => {
  it(
    'generates a verified skill for listing pets',
    async () => {
      // Use the real Petstore spec URL
      const result = await generateSkill({
        docsUrl: 'https://petstore.swagger.io/',
        action: 'list pets by status',
        apiDomain: 'petstore.swagger.io',
        apiBaseUrl: 'https://petstore.swagger.io/v2',
        // Petstore GET endpoints work without auth for this operation
        credentials: {},
        maxRetries: 3,
      });

      // Debug: console.log('Generated files:', result.files.map((f) => f.path));
      // console.log('Verification:', result.verification);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.verification.status).toBe('passed');
      expect(result.verification.attempts).toBeGreaterThan(0);
      expect(result.verification.lastRequest).toBeDefined();
      expect(result.verification.lastResponse).toBeDefined();

      // The structured request should have been a GET to the petstore domain
      const req = result.verification.lastRequest!;
      expect(req.method.toUpperCase()).toBe('GET');
      expect(new URL(req.url).hostname).toBe('petstore.swagger.io');
    },
    120000 // 2 minutes timeout for LLM generation
  );
});
