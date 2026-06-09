/**
 * Skill-format check — deterministic validation that a generated SKILL.md
 * matches the pi-skills format contract. Violations bounce back through the
 * Verification loop; the engine never silently rewrites.
 */

export interface FormatCheckOptions {
  operations: string[];
  allowedEnvVars: string[];
  scriptPaths: string[];
}

export interface FormatViolation {
  rule:
    | 'frontmatter-keys'
    | 'name-kebab'
    | 'description-routing'
    | 'setup-section'
    | 'operation-section'
    | 'basedir-reference'
    | 'env-vars-documented'
    | 'output-section';
  message: string;
}

export interface FormatCheckResult {
  ok: boolean;
  violations: FormatViolation[];
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function checkSkillFormat(content: string, options: FormatCheckOptions): FormatCheckResult {
  const violations: FormatViolation[] = [];

  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    violations.push({ rule: 'frontmatter-keys', message: 'SKILL.md must start with a --- frontmatter block' });
  } else {
    const keys = Object.keys(frontmatter).sort();
    if (keys.join(',') !== 'description,name') {
      violations.push({
        rule: 'frontmatter-keys',
        message: `Frontmatter must have exactly the keys "name" and "description"; found: ${keys.join(', ') || 'none'}`,
      });
    }
    if (frontmatter.name !== undefined && !KEBAB.test(frontmatter.name)) {
      violations.push({ rule: 'name-kebab', message: `name "${frontmatter.name}" must be kebab-case` });
    }
    if (frontmatter.description !== undefined && !frontmatter.description.includes('Use for')) {
      violations.push({
        rule: 'description-routing',
        message: 'description must end with "Use for …" agent-routing guidance',
      });
    }
  }

  const body = frontmatter ? content.slice(content.indexOf('---', 3) + 3) : content;

  if (!/^#{2,3}\s+Setup\b/im.test(body)) {
    violations.push({ rule: 'setup-section', message: 'Body must contain a "## Setup" section' });
  }

  for (const operation of options.operations) {
    const heading = new RegExp(`^#{2,3}\\s+.*${escapeRegExp(operation)}`, 'im');
    if (!heading.test(body)) {
      violations.push({
        rule: 'operation-section',
        message: `Missing a section for the Operation "${operation}"`,
      });
    }
  }

  for (const script of options.scriptPaths) {
    if (!body.includes(`{baseDir}/${script}`)) {
      violations.push({
        rule: 'basedir-reference',
        message: `Script ${script} must be referenced as {baseDir}/${script}`,
      });
    }
  }

  for (const envVar of options.allowedEnvVars) {
    if (!body.includes(envVar)) {
      violations.push({
        rule: 'env-vars-documented',
        message: `Setup must document the canonical env var ${envVar}`,
      });
    }
  }

  if (!/^#{2,3}\s+Output\b/im.test(body)) {
    violations.push({ rule: 'output-section', message: 'Body must contain an "## Output …" section' });
  }

  return { ok: violations.length === 0, violations };
}

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2];
  }
  return fields;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
