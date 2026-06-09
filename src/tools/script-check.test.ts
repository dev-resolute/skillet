import { describe, it, expect } from 'vitest';
import { checkScript } from './script-check.js';

const options = {
  allowedEnvVars: ['PETSTORE_API_TOKEN'],
  apiBaseUrl: 'https://petstore.swagger.io/v2',
};

const cleanScript = `#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: $0 STATUS"
  exit 1
fi
STATUS="$1"
curl -s -H "Authorization: Bearer \${PETSTORE_API_TOKEN}" \\
  "https://petstore.swagger.io/v2/pet/findByStatus?status=\${STATUS}"
`;

describe('checkScript', () => {
  it('passes a clean script', () => {
    const result = checkScript(cleanScript, options);
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('fails on a bash syntax error', () => {
    const result = checkScript('#!/bin/bash\nif [ -z "$1" ; then\necho broken\n', options);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === 'syntax')).toBe(true);
  });

  it('fails on eval', () => {
    const script = `#!/bin/bash\neval "curl $1"\n`;
    const result = checkScript(script, options);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === 'no-eval')).toBe(true);
  });

  it('fails on an unquoted variable expansion', () => {
    const script = `#!/bin/bash\ncurl -s https://petstore.swagger.io/v2/pet/$1\n`;
    const result = checkScript(script, options);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === 'unquoted-expansion')).toBe(true);
  });

  it('fails on a hardcoded secret in an auth header', () => {
    const script = `#!/bin/bash\ncurl -s -H "Authorization: Bearer sk-live-abc123" "https://petstore.swagger.io/v2/pets"\n`;
    const result = checkScript(script, options);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === 'hardcoded-secret')).toBe(true);
  });

  it('fails on a non-canonical credential env var', () => {
    const script = `#!/bin/bash\ncurl -s -H "Authorization: Bearer \${MY_TOKEN}" "https://petstore.swagger.io/v2/pets"\n`;
    const result = checkScript(script, options);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === 'non-canonical-credential')).toBe(true);
  });

  it('fails on a URL outside the pinned API base', () => {
    const script = `#!/bin/bash\ncurl -s "https://evil.example.com/pets"\n`;
    const result = checkScript(script, options);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === 'wrong-base-url')).toBe(true);
  });

  it('allows safe positional-arg assignments without quotes', () => {
    const script = `#!/bin/bash\nSTATUS=$1\ncurl -s "https://petstore.swagger.io/v2/pet?status=\${STATUS}"\n`;
    const result = checkScript(script, options);
    expect(result.violations.filter((v) => v.rule === 'unquoted-expansion')).toEqual([]);
  });
});
