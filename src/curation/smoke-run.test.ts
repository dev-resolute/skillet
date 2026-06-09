import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import { smokeRun } from './smoke-run.js';

let dir: string;
let server: Server;
let port: number;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'skillet-smoke-'));
  server = createServer((req, res) => {
    if (req.headers.authorization === 'Bearer good-token') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"pets":[]}');
    } else {
      res.writeHead(401);
      res.end('unauthorized');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  port = (server.address() as { port: number }).port;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('smokeRun', () => {
  it('executes the script with credentials from env and captures output', async () => {
    const script = join(dir, 'list-pets.sh');
    writeFileSync(
      script,
      `#!/bin/bash\ncurl -sf -H "Authorization: Bearer \${PETSTORE_API_TOKEN}" "http://127.0.0.1:${port}/pets"\n`,
      { mode: 0o755 }
    );

    const result = await smokeRun(script, [], { PETSTORE_API_TOKEN: 'good-token' });

    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"pets"');
  });

  it('fails when the script exits non-zero (e.g. bad credentials)', async () => {
    const script = join(dir, 'list-pets-bad.sh');
    writeFileSync(
      script,
      `#!/bin/bash\ncurl -sf -H "Authorization: Bearer \${PETSTORE_API_TOKEN}" "http://127.0.0.1:${port}/pets"\n`,
      { mode: 0o755 }
    );

    const result = await smokeRun(script, [], { PETSTORE_API_TOKEN: 'wrong-token' });

    expect(result.ok).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });

  it('passes arguments through to the script', async () => {
    const script = join(dir, 'echo-arg.sh');
    writeFileSync(script, `#!/bin/bash\necho "arg=$1"\n`, { mode: 0o755 });

    const result = await smokeRun(script, ['available'], {});

    expect(result.ok).toBe(true);
    expect(result.stdout).toContain('arg=available');
  });
});
