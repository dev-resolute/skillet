#!/usr/bin/env node
import { generateSkill } from './engine/generate.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: skillet <docs-url> <action>');
    process.exit(1);
  }
  const [docsUrl, action] = args;
  const result = await generateSkill({ docsUrl, action });
  console.log('Generated skill:', result.name);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
