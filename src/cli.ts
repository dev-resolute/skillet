#!/usr/bin/env node
import { generateSkill } from './engine/generate.js';
import { createSkillWriter } from './skill-writer.js';

function showHelp() {
  console.log(`
Usage: skillet <docs-url> <action> [options]

Generate a verified pi skill from API docs.

Arguments:
  docs-url      URL to the API documentation
  action        The action you want the skill to perform (e.g., "search issues")

Options:
  --api-base    API base URL (default: inferred from docs-url)
  --api-domain  API domain for host pinning (default: inferred from docs-url)
  --output      Output directory for the generated skill (default: ./<action-slug>)
  --max-retries Maximum verification retries (default: 3)
  --credentials JSON object of credentials for live test (default: {})
  --help        Show this help message

Examples:
  skillet https://docs.example.com/api "list users"
  skillet https://developer.atlassian.com/cloud/jira/platform/rest/v3/ "search issues" --api-base https://mycompany.atlassian.net/rest/api/3
`);
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

  if (positional.length < 2) {
    console.error('Error: Missing required arguments: docs-url and action');
    return { help: true };
  }

  return {
    help: false,
    docsUrl: positional[0],
    action: positional[1],
    apiBase: options['api-base'],
    apiDomain: options['api-domain'],
    output: options['output'],
    maxRetries: options['max-retries'] ? parseInt(options['max-retries'], 10) : undefined,
    credentials: options['credentials'] ? JSON.parse(options['credentials']) : undefined,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  if (!('docsUrl' in args) || !args.docsUrl || !args.action) {
    showHelp();
    process.exit(1);
  }

  const docsUrl = args.docsUrl as string;
  const action = args.action as string;
  const outputDir = args.output ?? action.replace(/\s+/g, '-').toLowerCase();

  console.log(`🔍 Fetching docs: ${args.docsUrl}`);
  console.log(`🎯 Action: ${args.action}`);

  const result = await generateSkill({
    docsUrl,
    action,
    apiBaseUrl: args.apiBase,
    apiDomain: args.apiDomain,
    credentials: args.credentials,
    maxRetries: args.maxRetries,
  });

  console.log(`\n✅ Generated skill: ${result.name}`);
  console.log(`📁 Files (${result.files.length}):`);
  for (const file of result.files) {
    console.log(`  - ${file.path}`);
  }

  console.log(`\n🔬 Verification: ${result.verification.status}`);
  console.log(`   Attempts: ${result.verification.attempts}`);
  if (result.verification.lastRequest) {
    console.log(`   Last request: ${result.verification.lastRequest.method} ${result.verification.lastRequest.url}`);
  }
  if (result.verification.report) {
    console.log(`   Report: ${result.verification.report}`);
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
  console.log(`\n💾 Written to: ${outputDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
