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

describe.skipIf(!hasJiraCreds)('E2E: Jira search', () => {
  it(
    'generates a verified skill for searching issues',
    async () => {
      const result = await generateSkill({
        docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
        action: 'search issues',
        apiDomain: new URL(JIRA_BASE_URL!).hostname,
        apiBaseUrl: JIRA_BASE_URL,
        credentials: {
          Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL!}:${JIRA_API_TOKEN!}`).toString('base64')}`,
        },
        maxRetries: 3,
      });

      expect(result.files.length).toBeGreaterThan(0);
      expect(result.verification.status).toBe('passed');
      expect(result.verification.attempts).toBeGreaterThan(0);
      expect(result.verification.lastRequest).toBeDefined();
      expect(result.verification.lastRequest!.method.toUpperCase()).toBe('GET');
    },
    120000
  );
});
