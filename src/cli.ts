#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateSkill, discoverSpec } from './engine/generate.js';
import { listOperations } from './tools/spec.js';
import { createSkillWriter } from './skill-writer.js';
import { curate } from './curation/curate.js';
import type { SkillResult } from './types.js';

function showHelp() {
  console.log(`
Usage: skillet <docs-url> <operation> [operation...] [options]

Generate a verified pi skill covering one or more operations of an API.

Arguments:
  docs-url      URL to the API documentation
  operation     One or more operations the skill covers (e.g., "list issues" "get issue")

Options:
  --list-operations  List candidate operations found in the API spec, then exit
  --name        Skill name, kebab-case (default: inferred from API domain)
  --api-base    API base URL (default: inferred from docs-url)
  --api-domain  API domain for host pinning (default: inferred from docs-url)
  --output      Output directory for the generated skill (default: ./<skill-name>)
  --max-retries Maximum verification Attempts per operation (default: 3)
  --credentials JSON object of credentials for live test (default: {})
  --help        Show this help message

Curation (trusted surface — actually executes read-operation scripts):
  skillet curate <skill-dir> [--api-name NAME] [--smoke-args JSON]

  Smoke-runs every read operation's script with credentials from your
  environment, enforces the publish bar, and emits .skillet/gallery-entry.json.

Examples:
  skillet https://docs.example.com/api "list users" "get user"
  skillet https://developer.atlassian.com/cloud/jira/platform/rest/v3/ "search issues" "get issue" --name jira --api-base https://mycompany.atlassian.net/rest/api/3
  skillet curate ./jira --smoke-args '{"search issues": ["project = FOO"]}'
`);
}

async function curateCommand(argv: string[]) {
  const [skillDir] = argv;
  if (!skillDir || skillDir.startsWith('--')) {
    showHelp();
    process.exit(1);
  }

  let result: SkillResult;
  try {
    result = JSON.parse(readFileSync(join(skillDir, '.skillet', 'result.json'), 'utf8'));
  } catch {
    console.error(`No generation result found at ${skillDir}/.skillet/result.json — generate the skill first.`);
    process.exit(1);
  }

  const smokeArgsJson = flagValue(argv, '--smoke-args');
  const outcome = await curate({
    skillDir,
    result,
    apiName: flagValue(argv, '--api-name'),
    smokeArgs: smokeArgsJson ? JSON.parse(smokeArgsJson) : undefined,
  });

  for (const line of outcome.report) {
    console.log(`  ${line}`);
  }
  if (!outcome.published) {
    console.error('\n❌ Rejected: the Skill does not meet the publish bar.');
    process.exit(1);
  }

  const entryPath = join(skillDir, '.skillet', 'gallery-entry.json');
  writeFileSync(entryPath, JSON.stringify(outcome.entry, null, 2));
  console.log(`\n✅ Published Gallery entry: ${entryPath}`);
}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { help: true };
  }

  const positional: string[] = [];
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const value = args[i + 1] ?? '';
      if (!value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  const listOps = 'list-operations' in options;
  if (positional.length < (listOps ? 1 : 2)) {
    console.error('Error: Missing required arguments: docs-url and at least one operation');
    return { help: true };
  }

  return {
    help: false,
    listOps,
    docsUrl: positional[0],
    operations: positional.slice(1),
    name: options['name'],
    apiBase: options['api-base'],
    apiDomain: options['api-domain'],
    output: options['output'],
    maxRetries: options['max-retries'] ? parseInt(options['max-retries'], 10) : undefined,
    credentials: options['credentials'] ? JSON.parse(options['credentials']) : undefined,
  };
}

async function main() {
  if (process.argv[2] === 'curate') {
    await curateCommand(process.argv.slice(3));
    return;
  }

  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  if (!('docsUrl' in args) || !args.docsUrl) {
    showHelp();
    process.exit(1);
  }

  if (args.listOps) {
    const spec = await discoverSpec(args.docsUrl);
    if (!spec) {
      console.error(`No OpenAPI spec discovered at: ${args.docsUrl}`);
      process.exit(1);
    }
    const candidates = await listOperations(spec);
    if (candidates.length === 0) {
      console.error('Spec found, but no operations could be enumerated.');
      process.exit(1);
    }
    for (const op of candidates) {
      console.log(`[${op.methodClass.padEnd(8)}] ${op.method.padEnd(6)} ${op.path}  —  ${op.name}`);
    }
    process.exit(0);
  }

  if (!args.operations?.length) {
    showHelp();
    process.exit(1);
  }

  const docsUrl = args.docsUrl as string;
  const operations = args.operations as string[];

  console.log(`🔍 Fetching docs: ${args.docsUrl}`);
  console.log(`🎯 Operations: ${operations.join(', ')}`);

  const result = await generateSkill({
    docsUrl,
    operations,
    skillName: args.name,
    apiBaseUrl: args.apiBase,
    apiDomain: args.apiDomain,
    credentials: args.credentials,
    maxRetries: args.maxRetries,
  });

  const outputDir = args.output ?? result.name;

  console.log(`\n✅ Generated skill: ${result.name}`);
  console.log(`📁 Files (${result.files.length}):`);
  for (const file of result.files) {
    console.log(`  - ${file.path}`);
  }

  console.log(`\n🔬 Verification:`);
  for (const op of result.operations) {
    console.log(`   ${op.operation}: ${op.status} (attempts: ${op.attempts})`);
    if (op.report) {
      console.log(`     Report: ${op.report}`);
    }
  }

  const writer = createSkillWriter();
  const writeResult = await writer.write(result.files, outputDir);
  if (!writeResult.success) {
    console.error(`\n⚠️  Some files failed to write:`);
    for (const err of writeResult.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  mkdirSync(join(outputDir, '.skillet'), { recursive: true });
  writeFileSync(join(outputDir, '.skillet', 'result.json'), JSON.stringify(result, null, 2));
  console.log(`\n💾 Written to: ${outputDir}/ (verification data in .skillet/result.json)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
