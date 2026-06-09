import { describe, it, expect } from 'vitest';
import { checkSkillFormat } from './format-check.js';

const options = {
  operations: ['list pets', 'add pet'],
  allowedEnvVars: ['PETSTORE_API_TOKEN'],
  scriptPaths: ['list-pets.sh', 'add-pet.sh'],
};

const goodSkillMd = `---
name: petstore
description: Pet store API access via curl scripts. Use for listing, finding, and adding pets.
---

# Petstore

## Setup

1. Get an API token at https://petstore.swagger.io/
2. Add to your shell profile:

\`\`\`bash
export PETSTORE_API_TOKEN="your-token-here"
\`\`\`

## List pets

\`\`\`bash
{baseDir}/list-pets.sh available
\`\`\`

## Add pet

Generated from spec, not live-verified (mutating operation).

\`\`\`bash
{baseDir}/add-pet.sh "Rex"
\`\`\`

## Output Format

JSON responses from the API, one object per line.
`;

function rules(content: string) {
  return checkSkillFormat(content, options).violations.map((v) => v.rule);
}

describe('checkSkillFormat', () => {
  it('passes a pi-skills-shaped SKILL.md', () => {
    const result = checkSkillFormat(goodSkillMd, options);
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('fails on extra frontmatter keys', () => {
    const bad = goodSkillMd.replace('---\n\n# Petstore', 'usage: ./list-pets.sh\n---\n\n# Petstore');
    expect(rules(bad)).toContain('frontmatter-keys');
  });

  it('fails on a missing description', () => {
    const bad = goodSkillMd.replace(/description: .*\n/, '');
    expect(rules(bad)).toContain('frontmatter-keys');
  });

  it('fails on a non-kebab-case name', () => {
    const bad = goodSkillMd.replace('name: petstore', 'name: Pet Store API');
    expect(rules(bad)).toContain('name-kebab');
  });

  it('fails when the description lacks "Use for" routing guidance', () => {
    const bad = goodSkillMd.replace(
      'description: Pet store API access via curl scripts. Use for listing, finding, and adding pets.',
      'description: Pet store API access.'
    );
    expect(rules(bad)).toContain('description-routing');
  });

  it('fails on a missing Setup section', () => {
    const bad = goodSkillMd.replace('## Setup', '## Getting started');
    expect(rules(bad)).toContain('setup-section');
  });

  it('fails when an Operation has no section', () => {
    const bad = goodSkillMd.replace('## Add pet', '## Something else');
    expect(rules(bad)).toContain('operation-section');
  });

  it('fails when a script is never referenced via {baseDir}', () => {
    const bad = goodSkillMd.replace('{baseDir}/add-pet.sh "Rex"', './add-pet.sh "Rex"');
    expect(rules(bad)).toContain('basedir-reference');
  });

  it('fails when a canonical env var is not documented', () => {
    const bad = goodSkillMd.replace('export PETSTORE_API_TOKEN="your-token-here"', 'export TOKEN="your-token-here"');
    expect(rules(bad)).toContain('env-vars-documented');
  });

  it('fails on a missing Output section', () => {
    const bad = goodSkillMd.replace('## Output Format', '## Results');
    expect(rules(bad)).toContain('output-section');
  });

  it('fails on a missing frontmatter block entirely', () => {
    expect(rules('# Petstore\n\nNo frontmatter.')).toContain('frontmatter-keys');
  });
});
