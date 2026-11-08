/**
 * Content model: a tree of folders, any depth, with lessons as the leaves.
 *
 *   content/<folder>/meta.json                 e.g. Technology (a domain or subject)
 *   content/<folder>/<folder>/meta.json        e.g. Technology › Cloud (a subdomain)
 *   content/<folder>/.../<NN-file-name>.mdx    a lesson, at any depth
 *
 * Folders can be nested as deep as you like (domain → subject → subdomain → topic …).
 * meta.json is optional: a folder without one is titled from its name.
 * A lesson's `id` is PERMANENT: it must never change or be reused. The build fails if
 * any lesson id is missing, badly formed or used twice.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { ACCENTS } from './lib/accents';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Remembers which file claimed each lesson id, so a second file with the same id fails the build.
const claimed = new Map<string, string>();
function pageId({ entry, data }: { entry: string; data: Record<string, unknown> }): string {
  const id = data.id;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(`Lesson "content/${entry}" has no "id" in its frontmatter. Every lesson needs a permanent id, e.g. "phy-forces-what-is-a-force".`);
  }
  if (!ID_PATTERN.test(id)) {
    throw new Error(`Lesson "content/${entry}" has id "${id}". Use only lower-case letters, numbers and single hyphens.`);
  }
  const owner = claimed.get(id);
  if (owner && owner !== entry) {
    throw new Error(`Lesson id "${id}" is used twice: "content/${owner}" and "content/${entry}". Ids must be unique and are never reused.`);
  }
  claimed.set(id, entry);
  return id;
}

// "technology/cloud/meta.json" → "technology/cloud"
const folderOf = ({ entry }: { entry: string }) => entry.split('/').slice(0, -1).join('/');

/** One shape for every folder, whatever its level. */
const folders = defineCollection({
  loader: glob({ pattern: '**/meta.json', base: './content', generateId: folderOf }),
  schema: z.object({
    title: z.string().min(1),
    order: z.number().default(100),
    icon: z.string().max(8).optional(),
    accent: z.enum(ACCENTS).optional(), // inherited from the parent folder when left out
    blurb: z.string().max(240).optional(),
  }).strict(),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './content', generateId: pageId }),
  schema: z.object({
    id: z.string().regex(ID_PATTERN),
    title: z.string().min(1),
    summary: z.string().max(240).default(''),
    order: z.number().default(100),
    minutes: z.number().int().min(1).max(600).optional(),
    tags: z.array(z.string()).default([]),
    // An older single-file lesson shown as it is, inside the site frame. Path under public/.
    legacy: z.string().startsWith('/legacy/').endsWith('.html').optional(),
    // Where the old lesson came from (e.g. a Claude artifact link). For our records only.
    source: z.string().optional(),
  }).strict(),
});

export const collections = { folders, pages };
