import { Agent } from '@earendil-works/pi-agent-core';
import { getModel } from '@earendil-works/pi-ai';
import type { GenerateOptions, SkillResult } from '../types.js';
import { fetchDocs, fetchSpec } from '../tools/fetch.js';
import { detectAuth, sliceSpec } from '../tools/spec.js';
import { createStateManager } from './state.js';
import { createWriteSkillFilesTool } from './tools/write-skill.js';
import { createRunTestTool } from './tools/run-test.js';
import { createPromptRegistry } from './prompts/registry.js';

const DEFAULT_RETRIES = 3;

export async function generateSkill(options: GenerateOptions): Promise<SkillResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_RETRIES;
  const apiDomain = options.apiDomain ?? new URL(options.docsUrl).hostname;
  const apiBaseUrl = options.apiBaseUrl ?? `https://${apiDomain}`;
  const skillName = options.skillName ?? deriveSkillName(apiDomain);

  // Pre-stage: gather deterministic data
  const docs = await fetchDocs(options.docsUrl);
  const spec = await discoverSpec(options.docsUrl);
  const authScheme = spec
    ? await detectAuth(spec, skillName)
    : ({ type: 'unsupported', reason: 'No spec found' } as const);
  const auth = JSON.stringify(authScheme);
  const operations = [];
  for (const name of options.operations) {
    const slice = spec ? JSON.stringify((await sliceSpec(spec, name)) ?? null, null, 2) : null;
    operations.push({ name, slice });
  }

  // Create state and modules
  const stateManager = createStateManager({ maxRetries, operations: options.operations });

  // Build agent with adapter-based tools
  const model = (options.model as any) ?? getModel('openai', 'gpt-4o-mini')!;
  const promptRegistry = createPromptRegistry();
  const prompt = options.promptVersion
    ? promptRegistry.get(options.promptVersion)
    : promptRegistry.getDefault();
  const agent = new Agent({
    initialState: {
      systemPrompt: prompt.build({ skillName, operations, apiBaseUrl, auth, docs, maxRetries }),
      model,
      tools: [
        createWriteSkillFilesTool(stateManager, {
          allowedEnvVars: 'envVars' in authScheme ? authScheme.envVars : [],
          apiBaseUrl,
        }),
        createRunTestTool(stateManager, apiDomain, options.credentials ?? {}),
      ],
    },
  });

  await agent.prompt(
    `Generate a verified skill covering these operations: ${options.operations.join(', ')}`
  );

  return {
    name: skillName,
    files: stateManager.getFiles(),
    operations: stateManager.getOperations(),
    promptVersion: prompt.version,
  };
}

function deriveSkillName(apiDomain: string): string {
  const host = apiDomain.replace(/^(api|www)\./, '');
  return host.split('.')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export async function discoverSpec(docsUrl: string): Promise<string | null> {
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
