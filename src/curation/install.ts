/**
 * Install flow — fetch a curated skill's published files from the
 * skillet-skills repo and write them into pi's skills directory.
 * Trusted-surface (CLI) only; the engine never imports this.
 */
import type { GalleryEntry, SkillFile } from '../types.js';

const REPO_RAW_BASE =
  'https://raw.githubusercontent.com/dev-resolute/skillet-skills/main';

export class SkillNotFoundError extends Error {
  constructor(public skillName: string) {
    super(`Skill "${skillName}" not found in the gallery.`);
    this.name = 'SkillNotFoundError';
  }
}

export interface FetchedSkill {
  entry: GalleryEntry;
  files: SkillFile[];
}

export async function fetchSkill(name: string): Promise<FetchedSkill> {
  const url = `${REPO_RAW_BASE}/${name}/.skillet/gallery-entry.json`;
  const res = await fetch(url);

  if (res.status === 404) {
    throw new SkillNotFoundError(name);
  }
  if (!res.ok) {
    throw new Error(`failed to fetch skill "${name}": ${res.status}`);
  }

  const entry = (await res.json()) as GalleryEntry;
  if (!Array.isArray(entry.files) || entry.files.length === 0) {
    throw new Error(`gallery entry for "${name}" is malformed`);
  }
  return { entry, files: entry.files };
}
