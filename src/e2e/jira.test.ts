import { describe, it, expect } from 'vitest';
import { generateSkill } from '../engine/generate.js';

/**
 * E2E test against Jira Cloud.
 * Skipped if JIRA_BASE_URL and JIRA_EMAIL/JIRA_API_TOKEN are not set.
 */

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const hasJiraCreds = !!(JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN);

describe.skipIf(!hasJiraCreds)('E2E: Jira multi-Operation skill', () => {
  it(
    'generates one Skill covering search and get',
    async () => {
      const result = await generateSkill({
        docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
        operations: ['search issues', 'get issue'],
        skillName: 'jira',
        apiDomain: new URL(JIRA_BASE_URL!).hostname,
        apiBaseUrl: JIRA_BASE_URL,
        credentials: {
          Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL!}:${JIRA_API_TOKEN!}`).toString('base64')}`,
        },
        maxRetries: 3,
      });

      expect(result.name).toBe('jira');
      expect(result.files.length).toBeGreaterThan(0);

      for (const op of result.operations) {
        expect(op.status).toBe('passed');
        expect(op.attempts).toBeGreaterThan(0);
        expect(op.lastRequest).toBeDefined();
        expect(op.lastRequest!.method.toUpperCase()).toBe('GET');
      }
    },
    180000
  );
});
