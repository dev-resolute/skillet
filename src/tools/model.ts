/**
 * Model selection — resolve the (provider, model) the engine generates with,
 * from CLI flags → SKILLET_* env → the built-in openai default. Validation and the
 * API-key check are added in later tasks. The engine accepts the resolved Model via
 * GenerateOptions.model and never picks a provider itself.
 */
import { getModel, getProviders } from '@earendil-works/pi-ai';
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

export function resolveModel(opts: { provider?: string; modelId?: string } = {}): ResolvedModel {
  const provider = opts.provider ?? process.env.SKILLET_PROVIDER ?? 'openai';

  if (!(getProviders() as string[]).includes(provider)) {
    throw new ModelResolutionError(
      `Unknown provider "${provider}".\n\nAvailable providers:\n  ${(getProviders() as string[]).join(', ')}`,
    );
  }

  const modelId = opts.modelId ?? process.env.SKILLET_MODEL ?? BUILTIN_DEFAULT_MODEL[provider];

  const model = getModel(
    provider as KnownProvider,
    modelId as Parameters<typeof getModel>[1],
  );
  return { model, provider, modelId: modelId as string };
}
