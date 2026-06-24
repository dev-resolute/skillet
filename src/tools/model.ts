/**
 * Model selection — resolve the (provider, model) the engine generates with,
 * from CLI flags → SKILLET_* env → the built-in openai default. Validation and the
 * API-key check are added in later tasks. The engine accepts the resolved Model via
 * GenerateOptions.model and never picks a provider itself.
 */
import { getModel, getProviders, getModels, getEnvApiKey } from '@earendil-works/pi-ai';
import type { KnownProvider } from '@earendil-works/pi-ai';

export class ModelResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelResolutionError';
  }
}

export interface ResolvedModel {
  model: ReturnType<typeof getModel>;
  provider: string;
  modelId: string;
}

const BUILTIN_DEFAULT_MODEL: Record<string, string> = { openai: 'gpt-4o-mini' };

/**
 * Provider → API-key env var(s). Mirrors pi-ai's internal (unexported) table so the error
 * can name the exact var (it is NOT a naive <PROVIDER>_API_KEY — e.g. google→GEMINI_API_KEY)
 * and so we recognize API-key providers. Drift-guarded by a test in model.test.ts.
 */
export const KEY_ENV_VARS: Record<string, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_OAUTH_TOKEN', 'ANTHROPIC_API_KEY'],
  'ant-ling': ['ANT_LING_API_KEY'],
  'azure-openai-responses': ['AZURE_OPENAI_API_KEY'],
  google: ['GEMINI_API_KEY'],
  'google-vertex': ['GOOGLE_CLOUD_API_KEY'],
  nvidia: ['NVIDIA_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  groq: ['GROQ_API_KEY'],
  cerebras: ['CEREBRAS_API_KEY'],
  xai: ['XAI_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  'vercel-ai-gateway': ['AI_GATEWAY_API_KEY'],
  zai: ['ZAI_API_KEY'],
  'zai-coding-cn': ['ZAI_CODING_CN_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  minimax: ['MINIMAX_API_KEY'],
  'minimax-cn': ['MINIMAX_CN_API_KEY'],
  moonshotai: ['MOONSHOT_API_KEY'],
  'moonshotai-cn': ['MOONSHOT_API_KEY'],
  huggingface: ['HF_TOKEN'],
  fireworks: ['FIREWORKS_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  opencode: ['OPENCODE_API_KEY'],
  'opencode-go': ['OPENCODE_API_KEY'],
  'kimi-coding': ['KIMI_API_KEY'],
  'github-copilot': ['COPILOT_GITHUB_TOKEN'],
  'cloudflare-workers-ai': ['CLOUDFLARE_API_KEY'],
  'cloudflare-ai-gateway': ['CLOUDFLARE_API_KEY'],
  xiaomi: ['XIAOMI_API_KEY'],
  'xiaomi-token-plan-cn': ['XIAOMI_TOKEN_PLAN_CN_API_KEY'],
  'xiaomi-token-plan-ams': ['XIAOMI_TOKEN_PLAN_AMS_API_KEY'],
  'xiaomi-token-plan-sgp': ['XIAOMI_TOKEN_PLAN_SGP_API_KEY'],
};

export function resolveModel(opts: { provider?: string; modelId?: string } = {}): ResolvedModel {
  const provider = opts.provider ?? process.env.SKILLET_PROVIDER ?? 'openai';

  if (!(getProviders() as string[]).includes(provider)) {
    throw new ModelResolutionError(
      `Unknown provider "${provider}".\n\nAvailable providers:\n  ${(getProviders() as string[]).join(', ')}`,
    );
  }

  const modelId = opts.modelId ?? process.env.SKILLET_MODEL ?? BUILTIN_DEFAULT_MODEL[provider];
  const availableIds = getModels(provider as KnownProvider).map((m) => m.id);

  const modelMissing = modelId === undefined;
  const modelInvalid = modelId !== undefined && !availableIds.includes(modelId);
  const keyVars = KEY_ENV_VARS[provider];
  const keyMissing = keyVars !== undefined && !getEnvApiKey(provider);

  if (modelMissing || modelInvalid || keyMissing) {
    throw new ModelResolutionError(
      buildConfigError({ provider, modelMissing, modelInvalid, modelId, availableIds, keyMissing, keyVars }),
    );
  }

  const model = getModel(
    provider as KnownProvider,
    modelId as Parameters<typeof getModel>[1],
  );
  return { model, provider, modelId: modelId as string };
}

function buildConfigError(g: {
  provider: string;
  modelMissing: boolean;
  modelInvalid: boolean;
  modelId: string | undefined;
  availableIds: string[];
  keyMissing: boolean;
  keyVars?: string[];
}): string {
  const sample =
    g.availableIds.slice(0, 8).join(', ') + (g.availableIds.length > 8 ? ', …' : '');
  const lines = [`Cannot generate with provider "${g.provider}":`];
  if (g.modelMissing) {
    lines.push('  • model   — not configured. Pass --model <id> or set SKILLET_MODEL.');
    lines.push(`              Available: ${sample}`);
  } else if (g.modelInvalid) {
    lines.push(`  • model   — "${g.modelId}" is not a known ${g.provider} model.`);
    lines.push(`              Available: ${sample}`);
  }
  if (g.keyMissing) {
    lines.push(`  • API key — not found. Set ${g.keyVars!.join(' or ')} in your environment`);
    lines.push('              (e.g. in .env.local, loaded via `node --env-file=.env.local`).');
  }
  lines.push('');
  lines.push(`Provider is selected with --provider or SKILLET_PROVIDER (currently: ${g.provider}).`);
  lines.push('Only "openai" has a built-in default model; other providers need --model / SKILLET_MODEL.');
  return lines.join('\n');
}
