/**
 * Content model: Subject → Section → Page.
 *
 *   content/<subject>/subject.json
 *   content/<subject>/<section>/section.json
 *   content/<subject>/<section>/<NN-file-name>.mdx
 *
 * The subject and section come from the folder path. A page's `id` is PERMANENT:
 * progress is keyed on it, so it must never change or be reused. The build fails
 * if any page id is missing, badly formed or used twice.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ACCENTS } from './lib/accents';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Remembers which file claimed each page id, so a second file with the same id fails the build.
const claimed = new Map<string, string>();
function pageId({ entry, data }: { entry: string; data: Record<string, unknown> }): string {
  const id = data.id;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(`Page "content/${entry}" has no "id" in its frontmatter. Every page needs a permanent id, e.g. "phy-forces-what-is-a-force".`);
  }
  if (!ID_PATTERN.test(id)) {
    throw new Error(`Page "content/${entry}" has id "${id}". Use only lower-case letters, numbers and single hyphens.`);
  }
  const owner = claimed.get(id);
  if (owner && owner !== entry) {
    throw new Error(`Page id "${id}" is used twice: "content/${owner}" and "content/${entry}". Ids must be unique and are never reused.`);
  }
  claimed.set(id, entry);
  return id;
}

// "physics/subject.json" → "physics"; "physics/forces/section.json" → "physics/forces"
const folderOf = ({ entry }: { entry: string }) => entry.split('/').slice(0, -1).join('/');

const subjects = defineCollection({
  loader: glob({ pattern: '*/subject.json', base: './content', generateId: folderOf }),
  schema: z.object({
    title: z.string().min(1),
    accent: z.enum(ACCENTS),
    icon: z.string().min(1).max(8),
    order: z.number().int(),
    blurb: z.string().min(1).max(200),
  }).strict(),
});

const sections = defineCollection({
  loader: glob({ pattern: '*/*/section.json', base: './content', generateId: folderOf }),
  schema: z.object({
    title: z.string().min(1),
    order: z.number().int(),
    summary: z.string().min(1).max(240),
  }).strict(),
});

const pages = defineCollection({
  loader: glob({ pattern: '*/*/*.{md,mdx}', base: './content', generateId: pageId }),
  schema: z.object({
    id: z.string().regex(ID_PATTERN),
    title: z.string().min(1),
    summary: z.string().min(1).max(200),
    order: z.number().int(),
    minutes: z.number().int().min(1).max(60),
    tags: z.array(z.string()).default([]),
    legacy: z.string().startsWith('/legacy/').endsWith('.html').optional(),
  }).strict(),
});

export const collections = { subjects, sections, pages };
