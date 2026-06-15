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

/** Context-window size in tokens for known models. Defaults to 128k for unknown models. */
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o-mini': 128_000,
  'gpt-4o': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-3.5-turbo': 16_000,
};

/** Approximate chars per token (English text). */
const CHARS_PER_TOKEN = 4;

/** Max prompt size as a fraction of the context window. */
const PROMPT_SIZE_THRESHOLD = 0.8;

export class PromptTooLargeError extends Error {
  constructor(
    public promptSize: number,
    public estimatedTokens: number,
    public modelName: string,
    public contextWindow: number,
    public operationCount: number,
  ) {
    const percentage = Math.round((estimatedTokens / contextWindow) * 100);
    super(
      `System prompt too large: ${promptSize} chars (~${estimatedTokens} tokens, ${percentage}% of ${modelName}'s ${contextWindow.toLocaleString()} token context window).\n\n` +
      `This usually happens when:\n` +
      `1. The API spec is very large with deeply nested schemas\n` +
      `2. Too many operations are included in a single skill\n\n` +
      `Suggestions:\n` +
      `- Reduce the number of operations (currently ${operationCount})\n` +
      `- Split into multiple skills, each covering a subset of operations\n` +
      `- Use a model with a larger context window (e.g., gpt-4o has 128K tokens)`
    );
    this.name = 'PromptTooLargeError';
  }
}

function getContextWindow(model: any): number {
  if (model?.contextWindow) return model.contextWindow;
  const modelName = model?.name || model?.model || 'unknown';
  for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (modelName.includes(key)) return value;
  }
  return 128_000; // default
}

export async function generateSkill(options: GenerateOptions): Promise<SkillResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_RETRIES;
  const apiBaseUrl = options.apiBaseUrl ?? `https://${options.apiDomain ?? new URL(options.docsUrl).hostname}`;
  const apiDomain = options.apiDomain ?? (options.apiBaseUrl ? new URL(options.apiBaseUrl).hostname : null) ?? new URL(options.docsUrl).hostname;
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
  const systemPrompt = prompt.build({ skillName, operations, apiBaseUrl, auth, docs, maxRetries });

  const contextWindow = getContextWindow(model);
  const promptSize = systemPrompt.length;
  const estimatedTokens = Math.round(promptSize / CHARS_PER_TOKEN);
  console.log(`[skillet] System prompt: ${promptSize} chars (~${estimatedTokens} tokens) | context window: ${contextWindow.toLocaleString()} tokens`);
  const maxPromptTokens = Math.round(contextWindow * PROMPT_SIZE_THRESHOLD);
  if (estimatedTokens > maxPromptTokens) {
    throw new PromptTooLargeError(promptSize, estimatedTokens, model?.name || 'unknown', contextWindow, options.operations.length);
  }

  const agent = new Agent({
    initialState: {
      systemPrompt,
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
