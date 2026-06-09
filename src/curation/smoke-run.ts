/**
 * Smoke-run — actual execution of a generated script for a read Operation.
 * Trusted-surface only (the curator's machine); the engine never imports this.
 */
import { spawn } from 'node:child_process';

export interface SmokeRunResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function smokeRun(
  scriptPath: string,
  args: string[],
  env: Record<string, string>
): Promise<SmokeRunResult> {
  return new Promise((resolve) => {
    const proc = spawn('bash', [scriptPath, ...args], {
      env: { ...process.env, ...env },
      timeout: 60000,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => (stdout += chunk));
    proc.stderr.on('data', (chunk) => (stderr += chunk));
    proc.on('close', (code) => {
      resolve({ ok: code === 0, exitCode: code ?? -1, stdout, stderr });
    });
    proc.on('error', (err) => {
      resolve({ ok: false, exitCode: -1, stdout, stderr: stderr || err.message });
    });
  });
}
