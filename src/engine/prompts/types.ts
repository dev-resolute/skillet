/**
 * Prompt template types and interfaces.
 */

export interface OperationContext {
  name: string;
  slice: string | null;
}

export interface PromptContext {
  skillName: string;
  operations: OperationContext[];
  apiBaseUrl: string;
  auth: string;
  docs: string;
  maxRetries: number;
}

export interface PromptTemplate {
  version: string;
  name: string;
  description: string;
  build(context: PromptContext): string;
}
