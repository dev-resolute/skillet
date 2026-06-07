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
import { createPromptRegistry } from './prompts/registry.js';

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
  const promptRegistry = createPromptRegistry();
  const prompt = options.promptVersion
    ? promptRegistry.get(options.promptVersion)
    : promptRegistry.getDefault();
  const agent = new Agent({
    initialState: {
      systemPrompt: prompt.build({ action: options.action, apiBaseUrl, auth, slice, docs, maxRetries }),
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
    promptVersion: prompt.version,
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


