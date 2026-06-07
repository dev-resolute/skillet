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
  promptVersion?: string;
}

/** Result of verifying a skill against a live API. */
export interface VerificationResult {
  status: 'passed' | 'failed' | 'skipped';
  attempts: number;
  lastRequest?: StructuredRequest;
  lastResponse?: { status: number; body: string };
  report?: string;
}

// ── Verification types ──

export type MethodClass = 'read' | 'mutating';

export interface ExecutionResult {
  ok: boolean;
  status: number;
  body: string;
  error?: string;
}

export interface RunnerOptions {
  apiDomain: string;
  credentials?: Record<string, string>;
  allowMutating?: boolean;
}

// ── Spec analysis types ──

export interface SpecSlice {
  operation: Record<string, unknown>;
  method: string;
  path: string;
  schemas: Record<string, unknown>;
}

// ── Skill writing types ──

export interface WriteResult {
  success: boolean;
  filesWritten: number;
  errors: string[];
}

// ── Generation options ──

export interface GenerateOptions {
  docsUrl: string;
  action: string;
  apiBaseUrl?: string;
  apiDomain?: string;
  credentials?: Record<string, string>;
  maxRetries?: number;
  model?: unknown;
  promptVersion?: string;
}
