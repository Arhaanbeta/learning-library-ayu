/**
 * One place that turns the three content collections into a tree:
 * subjects → sections → pages, each sorted by `order`, with their URLs.
 * Every page and layout reads content through here, never straight from the collections.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Accent } from './accents';
import { url } from './url';

export interface Page {
  id: string; // permanent page id (progress key)
  slug: string; // from the file name, without the "01-" prefix
  subject: string;
  section: string;
  href: string;
  data: CollectionEntry<'pages'>['data'];
  entry: CollectionEntry<'pages'>;
}
export interface Section {
  slug: string;
  subject: string;
  href: string;
  title: string;
  order: number;
  summary: string;
  pages: Page[];
}
export interface Subject {
  slug: string;
  href: string;
  title: string;
  accent: Accent;
  icon: string;
  order: number;
  blurb: string;
  sections: Section[];
}

const byOrder = <T extends { order: number; title?: string }>(a: T, b: T) =>
  a.order - b.order || String(a.title ?? '').localeCompare(String(b.title ?? ''));

let cached: Promise<Subject[]> | undefined;

/** The whole library. Fails the build with a clear message if a folder is missing its subject.json or section.json. */
export function getLibrary(): Promise<Subject[]> {
  cached ??= build();
  return cached;
}

async function build(): Promise<Subject[]> {
  const [subjectEntries, sectionEntries, pageEntries] = await Promise.all([
    getCollection('subjects'),
    getCollection('sections'),
    getCollection('pages'),
  ]);

  const subjects = new Map<string, Subject>();
  for (const s of subjectEntries) {
    subjects.set(s.id, { slug: s.id, href: url(`${s.id}/`), ...s.data, sections: [] });
  }

  const sections = new Map<string, Section>();
  for (const s of sectionEntries) {
    const [subject, section] = s.id.split('/');
    const parent = subjects.get(subject);
    if (!parent) throw new Error(`content/${s.id}/section.json: its subject folder has no subject.json (content/${subject}/subject.json).`);
    const sec: Section = { slug: section, subject, href: url(`${subject}/${section}/`), ...s.data, pages: [] };
    sections.set(s.id, sec);
    parent.sections.push(sec);
  }

  const seenSlugs = new Set<string>();
  for (const p of pageEntries) {
    const file = p.filePath ?? '';
    const parts = file.replace(/^\.?\/?content\//, '').split('/');
    if (parts.length !== 3) throw new Error(`Page "${p.id}" (${file}) must sit at content/<subject>/<section>/<file>.mdx.`);
    const [subject, section, fileName] = parts;
    const parent = sections.get(`${subject}/${section}`);
    if (!parent) throw new Error(`${file}: its section folder has no section.json (content/${subject}/${section}/section.json).`);
    const slug = fileName.replace(/\.(md|mdx)$/, '').replace(/^\d+[-_]/, '');
    const key = `${subject}/${section}/${slug}`;
    if (seenSlugs.has(key)) throw new Error(`Two pages in content/${subject}/${section}/ would both live at /${key}/. Rename one file.`);
    seenSlugs.add(key);
    parent.pages.push({ id: p.id, slug, subject, section, href: url(`${key}/`), data: p.data, entry: p });
  }

  const list = [...subjects.values()].sort(byOrder);
  for (const s of list) {
    s.sections.sort(byOrder);
    for (const sec of s.sections) sec.pages.sort((a, b) => byOrder(a.data, b.data));
  }
  return list;
}

/** Previous and next pages within the same section. */
export function neighbours(section: Section, page: Page) {
  const i = section.pages.findIndex((p) => p.id === page.id);
  return { prev: section.pages[i - 1], next: section.pages[i + 1] };
}

export const totalMinutes = (pages: Page[]) => pages.reduce((n, p) => n + p.data.minutes, 0);
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
