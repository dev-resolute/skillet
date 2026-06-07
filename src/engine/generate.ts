import { Agent } from '@earendil-works/pi-agent-core';
import { getModel, Type } from '@earendil-works/pi-ai';
import type { GenerateOptions, SkillResult, SkillFile, StructuredRequest } from '../types.js';
import { fetchDocs, fetchSpec } from '../tools/fetch.js';
import { detectAuth, sliceSpec } from '../tools/spec.js';
import { runTest, classifyMethod } from '../tools/runner.js';

const DEFAULT_RETRIES = 3;

interface GenerationContext {
  docs: string;
  spec: string | null;
  auth: string;
  slice: string | null;
  files: SkillFile[];
  verification: SkillResult['verification'];
  credentials: Record<string, string>;
  apiDomain: string;
  apiBaseUrl: string;
  action: string;
  maxRetries: number;
}

export async function generateSkill(options: GenerateOptions): Promise<SkillResult> {
  const _maxRetries = options.maxRetries ?? DEFAULT_RETRIES;
  const apiDomain = options.apiDomain ?? new URL(options.docsUrl).hostname;
  const apiBaseUrl = options.apiBaseUrl ?? `https://${apiDomain}`;

  // ── 1. Pre-stage: gather deterministic data ───────────────────────────────
  const docs = await fetchDocs(options.docsUrl);

  // Spec discovery: try common suffixes from the docs URL
  let spec: string | null = null;
  const specUrls = inferSpecUrls(options.docsUrl);
  for (const url of specUrls) {
    try {
      spec = await fetchSpec(url, 10000);
      break;
    } catch {
      continue;
    }
  }

  const authResult = spec ? await detectAuth(spec) : { type: 'unsupported', reason: 'No spec found' } as const;
  const auth = JSON.stringify(authResult);

  let slice: string | null = null;
  if (spec) {
    const sliced = await sliceSpec(spec, options.action);
    if (sliced) {
      slice = JSON.stringify(sliced, null, 2);
    }
  }

  const credentials = options.credentials ?? {};

  const ctx: GenerationContext = {
    docs,
    spec,
    auth,
    slice,
    files: [],
    verification: { status: 'skipped', attempts: 0 },
    credentials,
    apiDomain,
    apiBaseUrl,
    action: options.action,
    maxRetries: _maxRetries,
  };

  // ── 2. Build the agent with custom tools ───────────────────────────────────
  const agent = new Agent({
    initialState: {
      systemPrompt: buildSystemPrompt(ctx),
      model: getModel('anthropic', 'claude-sonnet-4-20250514')!,
      tools: [
        writeSkillFilesTool(ctx),
        runTestTool(ctx),
      ],
    },
  });

  // ── 3. Run the generation prompt ────────────────────────────────────────
  await agent.prompt(`Generate a verified skill for the action: ${options.action}`);

  // ── 4. Return result ────────────────────────────────────────────────────────
  return {
    name: `api/${options.action.replace(/\s+/g, '-').toLowerCase()}`,
    files: ctx.files,
    verification: ctx.verification,
  };
}

function inferSpecUrls(docsUrl: string): string[] {
  const base = docsUrl.replace(/\/?$/, '');
  return [
    `${base}/openapi.json`,
    `${base}/openapi.yaml`,
    `${base}/swagger.json`,
    `${base}/swagger.yaml`,
    `${base}/api-docs`,
    `${base}/v3/api-docs`,
  ];
}

function buildSystemPrompt(ctx: GenerationContext): string {
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
4. Use the 
write_skill_files
 tool to emit the skill files.
5. Use the 
run_test
 tool to verify the generated call against the live API. The test must pass before you finish.
6. If the test fails, read the error, fix the skill, and re-test. You may retry up to ${ctx.maxRetries} times.
7. If you cannot make it pass, return the best-effort skill and a clear failure report.

## Output format

Emit a directory with:
- SKILL.md (frontmatter: name, description, usage)
- A bash script for the action (e.g. 
search
) that parses args and runs curl

The skill name should be noun-shaped (e.g. 
jira
) with a verb subcommand (e.g. 
search
).
`;
}

function writeSkillFilesTool(ctx: GenerationContext) {
  return {
    name: 'write_skill_files',
    label: 'Write Skill Files',
    description: 'Write the generated skill files. Provide an array of {path, content} objects.',
    parameters: Type.Object({
      files: Type.Array(
        Type.Object({
          path: Type.String({ description: 'Relative path within the skill dir, e.g. SKILL.md or search' }),
          content: Type.String({ description: 'File content' }),
        })
      ),
    }),
    execute: async (_toolCallId: string, params: unknown) => {
      const { files } = params as { files: SkillFile[] };
      ctx.files = files;
      return {
        content: [{ type: 'text' as const, text: `Wrote ${files.length} files.` }],
        details: {},
      };
    },
  };
}

function runTestTool(ctx: GenerationContext) {
  return {
    name: 'run_test',
    label: 'Run Test',
    description: 'Execute a structured HTTP request against the live API to verify the skill. Provide {method, url, headers, body}.',
    parameters: Type.Object({
      method: Type.String({ description: 'HTTP method' }),
      url: Type.String({ description: 'Full URL (host must match the API domain)' }),
      headers: Type.Object({}, { additionalProperties: Type.String(), description: 'Request headers' }),
      body: Type.Optional(Type.String({ description: 'Request body (JSON string)' })),
    }),
    execute: async (_toolCallId: string, params: unknown) => {
      const request = params as StructuredRequest;
      const methodClass = classifyMethod(request.method);
      if (methodClass === 'mutating') {
        return {
          content: [{ type: 'text' as const, text: 'VERIFICATION_SKIPPED: Mutating operations are not live-tested by default.' }],
          details: {},
        };
      }

      const result = await runTest(request, {
        apiDomain: ctx.apiDomain,
        credentials: ctx.credentials,
      });

      ctx.verification.attempts += 1;

      if (result.ok) {
        ctx.verification.status = 'passed';
        ctx.verification.lastRequest = request;
        ctx.verification.lastResponse = { status: result.status, body: result.body };
        return {
          content: [{ type: 'text' as const, text: `TEST PASSED (${result.status}): ${result.body.slice(0, 500)}` }],
          details: {},
        };
      } else {
        ctx.verification.status = 'failed';
        ctx.verification.lastRequest = request;
        ctx.verification.lastResponse = { status: result.status, body: result.body };
        ctx.verification.report = result.error;
        return {
          content: [{ type: 'text' as const, text: `TEST FAILED (${result.status}): ${result.error || result.body}` }],
          details: {},
        };
      }
    },
  };
}
