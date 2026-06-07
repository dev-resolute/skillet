import { Agent } from '@earendil-works/pi-agent-core';
import { getModel } from '@earendil-works/pi-ai';
import type { GenerateOptions, SkillResult } from '../types.js';
import { fetchDocs, fetchSpec } from '../tools/fetch.js';
import { detectAuth, sliceSpec } from '../tools/spec.js';
import { createStateManager } from './state.js';
import { createSkillWriter } from './skill-writer.js';
import { createVerificationRunner } from './verification-runner.js';
import { createWriteSkillFilesTool } from './tools/write-skill.js';
import { createRunTestTool } from './tools/run-test.js';

const DEFAULT_RETRIES = 3;

export async function generateSkill(options: GenerateOptions): Promise<SkillResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_RETRIES;
  const apiDomain = options.apiDomain ?? new URL(options.docsUrl).hostname;
  const apiBaseUrl = options.apiBaseUrl ?? `https://${apiDomain}`;

  // Pre-stage: gather deterministic data
  const docs = await fetchDocs(options.docsUrl);
  const spec = await discoverSpec(options.docsUrl);
  const auth = JSON.stringify(spec ? await detectAuth(spec) : { type: 'unsupported', reason: 'No spec found' });
  const slice = spec ? JSON.stringify((await sliceSpec(spec, options.action)) ?? null, null, 2) : null;

  // Create state and modules
  const stateManager = createStateManager({ maxRetries });
  const skillWriter = createSkillWriter();
  const verificationRunner = createVerificationRunner();

  // Build agent with adapter-based tools
  const model = (options.model as any) ?? getModel('openai', 'gpt-4o-mini')!;
  const agent = new Agent({
    initialState: {
      systemPrompt: buildSystemPrompt({ action: options.action, apiBaseUrl, auth, slice, docs, maxRetries }),
      model,
      tools: [
        createWriteSkillFilesTool(stateManager, skillWriter),
        createRunTestTool(stateManager, verificationRunner, apiDomain, options.credentials ?? {}, maxRetries),
      ],
    },
  });

  await agent.prompt(`Generate a verified skill for the action: ${options.action}`);

  const finalState = stateManager.getState();
  return {
    name: `api/${options.action.replace(/\s+/g, '-').toLowerCase()}`,
    files: finalState.files,
    verification: finalState.verification,
  };
}

async function discoverSpec(docsUrl: string): Promise<string | null> {
  const base = docsUrl.replace(/\/?$/, '');
  const specUrls = [
    `${base}/openapi.json`, `${base}/openapi.yaml`,
    `${base}/swagger.json`, `${base}/swagger.yaml`,
    `${base}/api-docs`, `${base}/v3/api-docs`,
  ];
  for (const url of specUrls) {
    try { return await fetchSpec(url, 10000); } catch { continue; }
  }
  return null;
}

function buildSystemPrompt(ctx: { action: string; apiBaseUrl: string; auth: string; slice: string | null; docs: string; maxRetries: number }): string {
  return `You are skillet — an expert API-to-skill generator.

Your job: produce a verified pi skill (curl + bash + SKILL.md) for a single API action.

## Input data

- Action: ${ctx.action}
- API base URL: ${ctx.apiBaseUrl}
- Auth scheme: ${ctx.auth}
${ctx.slice ? `- Relevant OpenAPI operation:\n${ctx.slice}` : '- No OpenAPI spec available (docs-only generation)'}

## Docs text (first 8000 chars)

${ctx.docs.slice(0, 8000)}

## Rules

1. The generated bash must read credentials from environment variables.
2. NEVER embed secrets in the generated files.
3. The curl command must be safe (quoted variables, no eval).
4. Use the write_skill_files tool to emit the skill files.
5. Use the run_test tool to verify the generated call against the live API. The test must pass before you finish.
6. If the test fails, read the error, fix the skill, and re-test. You may retry up to ${ctx.maxRetries} times.
7. If you cannot make it pass, return the best-effort skill and a clear failure report.
8. For GET requests, do NOT include a body field in the run_test call.
9. The bash script must use the exact API base URL: ${ctx.apiBaseUrl}

## Output format

Emit exactly these files via write_skill_files:
- SKILL.md (frontmatter with name, description, usage)
- A bash script named after the action verb (e.g. "search", "list", "get") that parses args and runs curl
`;
}
