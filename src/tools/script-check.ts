/**
 * Script check — deterministic static validation of generated scripts.
 * Parses and lints; NEVER executes the script (the engine never runs LLM-authored shell).
 */
import { spawnSync } from 'node:child_process';

export interface ScriptCheckOptions {
  allowedEnvVars: string[];
  apiBaseUrl: string;
}

export interface ScriptViolation {
  rule: 'syntax' | 'no-eval' | 'unquoted-expansion' | 'hardcoded-secret' | 'non-canonical-credential' | 'wrong-base-url';
  line: number;
  message: string;
}

export interface ScriptCheckResult {
  ok: boolean;
  violations: ScriptViolation[];
}

const CREDENTIAL_NAME = /(TOKEN|KEY|SECRET|PASSWORD|PASSWD|EMAIL|AUTH)/;

export function checkScript(content: string, options: ScriptCheckOptions): ScriptCheckResult {
  const violations: ScriptViolation[] = [];

  const syntax = spawnSync('bash', ['-n'], { input: content, encoding: 'utf8' });
  if (syntax.status !== 0) {
    violations.push({
      rule: 'syntax',
      line: 0,
      message: `bash -n: ${syntax.stderr.trim()}`,
    });
  }

  content.split('\n').forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trim();
    if (line.startsWith('#') || line === '') return;

    if (/\beval\b/.test(line)) {
      violations.push({ rule: 'no-eval', line: lineNo, message: 'eval is forbidden in generated scripts' });
    }

    for (const url of line.match(/https?:\/\/[^\s"']+/g) ?? []) {
      if (!url.startsWith(options.apiBaseUrl)) {
        violations.push({
          rule: 'wrong-base-url',
          line: lineNo,
          message: `URL ${url} is outside the pinned API base ${options.apiBaseUrl}`,
        });
      }
    }

    const headerMatch = line.match(/-H\s+["']([^"']*(?:Authorization|api[-_]?key|token)[^"']*)["']/i);
    if (headerMatch && !headerMatch[1].includes('$')) {
      violations.push({
        rule: 'hardcoded-secret',
        line: lineNo,
        message: 'Auth header value must come from an environment variable, not a literal',
      });
    }

    for (const expansion of line.matchAll(/\$\{?([A-Z][A-Z0-9_]*)\}?/g)) {
      const name = expansion[1];
      if (CREDENTIAL_NAME.test(name) && !options.allowedEnvVars.includes(name)) {
        violations.push({
          rule: 'non-canonical-credential',
          line: lineNo,
          message: `Credential env var ${name} is not canonical; use one of: ${options.allowedEnvVars.join(', ')}`,
        });
      }
    }

    const isPlainAssignment = /^[A-Za-z_][A-Za-z0-9_]*=/.test(line);
    const unquoted = stripQuoted(line);
    if (!isPlainAssignment && /\$\{?[A-Za-z0-9_@*]/.test(unquoted)) {
      violations.push({
        rule: 'unquoted-expansion',
        line: lineNo,
        message: 'Variable expansion must be double-quoted',
      });
    }
  });

  return { ok: violations.length === 0, violations };
}

function stripQuoted(line: string): string {
  return line.replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'[^']*'/g, '');
}
