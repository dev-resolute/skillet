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

/** Auth scheme detected from spec/docs, with canonical credential env-var names. */
export type AuthScheme =
  | { type: 'bearer'; header: string; envVars: string[] }
  | { type: 'apiKey'; header: string; keyName: string; envVars: string[] }
  | { type: 'basic'; header: 'Authorization'; envVars: string[] }
  | { type: 'unsupported'; reason: string };

/** A skill file to be written to disk. */
export interface SkillFile {
  path: string;
  content: string;
}

/** The result of generating a Skill covering one API surface. */
export interface SkillResult {
  name: string;
  files: SkillFile[];
  operations: OperationVerification[];
  promptVersion?: string;
}

/** Verification outcome for one Operation within a Skill. */
export interface OperationVerification {
  operation: string;
  status: 'pending' | 'passed' | 'failed' | 'blocked';
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

/** A candidate Operation enumerated from a spec — selection input for surfaces. */
export interface OperationCandidate {
  name: string;
  method: string;
  path: string;
  methodClass: MethodClass;
}

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
  operations: string[];
  skillName?: string;
  apiBaseUrl?: string;
  apiDomain?: string;
  credentials?: Record<string, string>;
  maxRetries?: number;
  model?: unknown;
  promptVersion?: string;
}
