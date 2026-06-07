/**
 * Prompt template types and interfaces.
 */

export interface PromptContext {
  action: string;
  apiBaseUrl: string;
  auth: string;
  slice: string | null;
  docs: string;
  maxRetries: number;
}

export interface PromptTemplate {
  version: string;
  name: string;
  description: string;
  build(context: PromptContext): string;
}
