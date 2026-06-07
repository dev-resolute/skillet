/**
 * Core types for skillet.
 */

/** A structured HTTP request — the LLM returns this, never a shell string. */
export interface StructuredRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/** Auth scheme detected from spec/docs. */
export type AuthScheme =
  | { type: 'bearer'; header: string }
  | { type: 'apiKey'; header: string; keyName: string }
  | { type: 'basic'; header: 'Authorization' }
  | { type: 'unsupported'; reason: string };

/** A skill file to be written to disk. */
export interface SkillFile {
  path: string;
  content: string;
}

/** The result of generating a skill. */
export interface SkillResult {
  name: string;
  files: SkillFile[];
  verification: VerificationResult;
}

/** Result of verifying a skill against a live API. */
export interface VerificationResult {
  status: 'passed' | 'failed' | 'skipped';
  attempts: number;
  lastRequest?: StructuredRequest;
  lastResponse?: { status: number; body: string };
  report?: string;
}

/** Input to the generation engine. */
export interface GenerateOptions {
  docsUrl: string;
  action: string;
  apiBaseUrl?: string;
  apiDomain?: string;
  credentials?: Record<string, string>;
  maxRetries?: number;
  model?: string;
}
