/**
 * The one place that turns content/ into a tree: folders (any depth) holding lessons.
 * Every page and layout reads content through here, never straight from the collections.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Accent } from './accents';
import { url } from './url';

export interface Page {
  id: string; // permanent lesson id
  slug: string; // from the file name, without the "01-" prefix
  path: string; // "technology/cloud/kubernetes"
  href: string;
  folder: Folder;
  data: CollectionEntry<'pages'>['data'];
  entry: CollectionEntry<'pages'>;
}
export interface Folder {
  path: string; // "" for the root, else "technology/cloud"
  slug: string;
  href: string;
  title: string;
  order: number;
  icon?: string;
  accent: Accent;
  blurb?: string;
  depth: number; // 0 = root, 1 = top level (domain/subject), 2 = next level…
  parent?: Folder;
  folders: Folder[];
  pages: Page[];
}

const DEFAULT_ACCENT: Accent = 'blue';
const titleFromSlug = (s: string) => s.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const byOrder = (a: { order: number; title: string }, b: { order: number; title: string }) =>
  a.order - b.order || a.title.localeCompare(b.title);

let cached: Promise<Folder> | undefined;

/** The whole library as a tree. The root's `folders` are the top level (Maths, Technology…). */
export function getLibrary(): Promise<Folder> {
  cached ??= build();
  return cached;
}

async function build(): Promise<Folder> {
  const [metaEntries, pageEntries] = await Promise.all([getCollection('folders'), getCollection('pages')]);
  const metas = new Map(metaEntries.map((m) => [m.id, m.data]));
  const root: Folder = { path: '', slug: '', href: url(), title: 'Library', order: 0, accent: DEFAULT_ACCENT, depth: 0, folders: [], pages: [] };
  const all = new Map<string, Folder>([['', root]]);

  // A folder (and its parents) exists if it has a meta.json or holds a lesson.
  function folder(path: string): Folder {
    const found = all.get(path);
    if (found) return found;
    const parts = path.split('/');
    const parent = folder(parts.slice(0, -1).join('/'));
    const slug = parts[parts.length - 1];
    const m = metas.get(path);
    const f: Folder = {
      path, slug, href: url(`${path}/`),
      title: m?.title ?? titleFromSlug(slug), order: m?.order ?? 100, icon: m?.icon,
      accent: m?.accent ?? parent.accent, blurb: m?.blurb,
      depth: parts.length, parent, folders: [], pages: [],
    };
    all.set(path, f);
    parent.folders.push(f);
    return f;
  }
  for (const path of metas.keys()) folder(path);

  for (const p of pageEntries) {
    const rel = (p.filePath ?? '').replace(/^\.?\/?content\//, '');
    const parts = rel.split('/');
    if (parts.length < 2) throw new Error(`Lesson "${rel}" must sit inside a folder in content/, e.g. content/maths/${rel}.`);
    const parent = folder(parts.slice(0, -1).join('/'));
    const slug = parts[parts.length - 1].replace(/\.(md|mdx)$/, '').replace(/^\d+[-_]/, '');
    const path = `${parent.path}/${slug}`;
    if (parent.pages.some((x) => x.slug === slug)) throw new Error(`Two lessons in content/${parent.path}/ would both live at /${path}/. Rename one file.`);
    parent.pages.push({ id: p.id, slug, path, href: url(`${path}/`), folder: parent, data: p.data, entry: p });
  }

  // A lesson and a sub-folder must not share an address.
  for (const f of all.values()) {
    for (const p of f.pages) if (f.folders.some((c) => c.slug === p.slug)) throw new Error(`content/${f.path}/ has both a folder and a lesson called "${p.slug}". Rename one.`);
    f.folders.sort(byOrder);
    f.pages.sort((a, b) => byOrder({ order: a.data.order, title: a.data.title }, { order: b.data.order, title: b.data.title }));
  }

  // Folders inherit the nearest accent; recompute top-down now that every meta is known.
  (function inherit(f: Folder) { for (const c of f.folders) { c.accent = metas.get(c.path)?.accent ?? f.accent; inherit(c); } })(root);
  return root;
}

/** Every folder below (and including) this one, depth first. */
export function allFolders(f: Folder): Folder[] {
  return [f, ...f.folders.flatMap(allFolders)];
}
/** Every lesson anywhere inside this folder. */
export function allPages(f: Folder): Page[] {
  return [...f.pages, ...f.folders.flatMap(allPages)];
}
/** The chain of folders from the top level down to this one (the root left out). */
export function ancestors(f: Folder): Folder[] {
  const out: Folder[] = [];
  for (let x: Folder | undefined = f; x && x.depth > 0; x = x.parent) out.unshift(x);
  return out;
}
/** The nearest icon up the tree. */
export function iconOf(f: Folder): string | undefined {
  for (let x: Folder | undefined = f; x; x = x.parent) if (x.icon) return x.icon;
  return undefined;
}
/** Previous and next lessons in the same folder. */
export function neighbours(page: Page) {
  const list = page.folder.pages, i = list.indexOf(page);
  return { prev: list[i - 1], next: list[i + 1] };
}

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
