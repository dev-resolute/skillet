# @resolutedev/skillet

Turn an API's docs + OpenAPI spec into a verified pi skill (curl + bash + `SKILL.md`).

## Installation

```bash
# CLI (run without installing)
npx @resolutedev/skillet https://petstore.swagger.io/ "list pets by status" --api-base https://petstore.swagger.io/v2

# Library
npm install @resolutedev/skillet
```

## What it does

Point `skillet` at an API's docs page, name the action you want, and it produces a verified, ready-to-commit skill.

1. **Fetches** the docs page and discovers the OpenAPI spec
2. **Slices** the spec to the one operation matching your action
3. **Detects** the auth scheme (bearer, basic, API key — OAuth2 reported as unsupported)
4. **Generates** the skill via LLM (with spec as ground-truth fuel)
5. **Verifies** the generated call against the live API before handing it over
6. **Self-corrects** if the test fails, bounded to ~3 retries

## Usage

```bash
# CLI (self-hosted, bring your own LLM key)
npx @resolutedev/skillet https://petstore.swagger.io/ "list pets by status" --api-base https://petstore.swagger.io/v2

# Library
import { generateSkill } from '@resolutedev/skillet';

const result = await generateSkill({
  docsUrl: 'https://petstore.swagger.io/',
  action: 'list pets by status',
  apiBaseUrl: 'https://petstore.swagger.io/v2',
  credentials: {}, // Petstore GET works without auth
});

console.log(result.files);       // [{ path: 'SKILL.md', content: '...' }, ...]
console.log(result.verification); // { status: 'passed', attempts: 1 }
```

## Security design

- **Structured requests only** — the LLM returns `{method, url, headers, body}` as data, never a shell string. Execution is via `fetch` with the host pinned to the API domain.
- **Method-aware safety** — GET/HEAD/OPTIONS are live-tested freely. POST/PUT/PATCH/DELETE are validate-only by default (no live call). Opt-in sandbox testing for mutating ops is a future enhancement.
- **No secrets in generated skills** — credentials come from env vars at runtime.

## Project structure

```
src/
  cli.ts              # CLI entry point
  index.ts            # Library entry point
  types.ts            # Core types
  engine/
    generate.ts       # Main orchestration: agent loop + tools
  tools/
    fetch.ts          # fetch_docs, fetch_spec
    spec.ts           # detectAuth, sliceSpec
    runner.ts         # runTest with host pinning + method classifier
  e2e/
    petstore.test.ts  # Live E2E against public Petstore API
    jira.test.ts      # Live E2E against Jira Cloud (skipped without creds)
```

## Tests

```bash
# Unit tests (fast, no LLM calls)
npm test

# E2E tests (real LLM + live API)
npx vitest run --config vitest.e2e.config.ts
```

## Examples

Generated example skills live in `examples/`:

- `examples/petstore/` — skills against the public Petstore API
- `examples/github/` — skills against the GitHub REST API
- `examples/slack/` — skills against the Slack Web API

These are committed to the repo for reference but are not included in the npm package.

## Releasing

Maintainers can publish a new release by pushing a git tag:

```bash
npm version patch   # or minor / major
git push --follow-tags
```

GitHub Actions will then run tests, run the Petstore E2E test, publish to npm as `@resolutedev/skillet`, and create a GitHub Release with auto-generated notes.

Required repository secrets:

- `NPM_TOKEN` — npm automation token with publish access to `@resolutedev`
- `OPENAI_API_KEY` — used by the Petstore E2E test

## Requirements

- Node.js 20+
- An LLM API key (OpenAI, Anthropic, etc.) in environment variables
- Optional: `CONTEXT_DEV_API_KEY` — when set, `skillet generate` fetches docs
  via context.dev's scrape API for cleaner markdown; without it, skillet falls
  back to raw HTTP (ADR-0005). Not used by `skillet add`.

## License

MIT
