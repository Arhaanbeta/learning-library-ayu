/**
 * Brings older single-file (or multi-file) lessons into the library, unchanged.
 *
 *   node scripts/import-legacy.ts                      every file in inbox/ → the "Unsorted" folder
 *   node scripts/import-legacy.ts <file|folder> <content-folder> [--title "…"] [--slug name] [--source link]
 *
 * For each lesson it:
 *   1. copies the file to public/legacy/<content-folder>/<slug>.html
 *      (a folder with an index.html is copied whole to public/legacy/<content-folder>/<slug>/)
 *   2. reads its <title>
 *   3. writes content/<content-folder>/<slug>.mdx with a new permanent id and `legacy:` pointing at it.
 * Files taken from inbox/ are removed from inbox/ once copied. Nothing is ever overwritten.
 *
 * Moving a lesson later: move its .mdx (and, if you like, its public/legacy file, updating `legacy:`).
 * Its id stays the same.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const opts = { title: flag('title'), slug: flag('slug'), source: flag('source') };

const slugify = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'lesson';
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const yaml = (s: string) => JSON.stringify(s); // a JSON string is a valid YAML string

function titleOf(html: string, fallback: string) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? decode(m[1].replace(/<[^>]+>/g, '')) || fallback : fallback;
}
function existingIds(): Set<string> {
  const ids = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.mdx?$/.test(name)) { const m = readFileSync(p, 'utf8').match(/^id:\s*["']?([a-z0-9-]+)/m); if (m) ids.add(m[1]); }
    }
  };
  walk(join(ROOT, 'content'));
  return ids;
}

function importOne(src: string, folder: string, fromInbox: boolean) {
  const isDir = statSync(src).isDirectory();
  const entry = isDir ? join(src, 'index.html') : src;
  if (!existsSync(entry)) throw new Error(`${src}: a folder must contain index.html`);
  if (!isDir && !/\.html?$/i.test(src)) throw new Error(`${src}: only .html files can be imported this way`);
  const html = readFileSync(entry, 'utf8');
  const title = opts.title ?? titleOf(html, basename(src, extname(src)));
  const slug = opts.slug ?? slugify(isDir ? basename(src) : title);
  const folderClean = folder.replace(/^\/+|\/+$/g, '');

  const legacyRel = isDir ? `legacy/${folderClean}/${slug}/index.html` : `legacy/${folderClean}/${slug}.html`;
  const legacyAbs = join(ROOT, 'public', legacyRel);
  const mdxAbs = join(ROOT, 'content', folderClean, `${slug}.mdx`);
  if (existsSync(legacyAbs) || existsSync(mdxAbs)) throw new Error(`"${slug}" already exists in ${folderClean}. Use --slug to pick another name.`);

  const ids = existingIds();
  const base = `${folderClean.split('/')[0].slice(0, 4)}-${slug}`.replace(/-+/g, '-');
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;

  mkdirSync(join(ROOT, 'public', legacyRel, '..'), { recursive: true });
  if (isDir) cpSync(src, join(legacyAbs, '..'), { recursive: true });
  else cpSync(src, legacyAbs);

  mkdirSync(join(ROOT, 'content', folderClean), { recursive: true });
  writeFileSync(mdxAbs, [
    '---',
    `id: ${id}`,
    `title: ${yaml(title)}`,
    'summary: ""',
    `legacy: /${legacyRel}`,
    ...(opts.source ? [`source: ${yaml(opts.source)}`] : []),
    '---',
    '',
  ].join('\n'));
  if (fromInbox) rmSync(src, { recursive: true });
  console.log(`✓ ${title}\n    lesson: content/${folderClean}/${slug}.mdx (id ${id})\n    file:   public/${legacyRel}`);
}

if (args.length === 0) {
  const inbox = join(ROOT, 'inbox');
  const items = existsSync(inbox) ? readdirSync(inbox).filter((n) => !/^readme\.md$/i.test(n) && !n.startsWith('.')) : [];
  if (!items.length) { console.log('inbox/ is empty. Nothing to import.'); process.exit(0); }
  const unsorted = join(ROOT, 'content', 'unsorted', 'meta.json');
  if (!existsSync(unsorted)) {
    mkdirSync(join(unsorted, '..'), { recursive: true });
    writeFileSync(unsorted, JSON.stringify({ title: 'Unsorted', order: 999, icon: '📥', blurb: 'Newly imported lessons, waiting to be filed under a subject.' }, null, 2) + '\n');
  }
  for (const n of items) importOne(join(inbox, n), 'unsorted', true);
} else if (args.length === 2) {
  importOne(args[0], args[1], args[0].replace(/^\.\//, '').startsWith('inbox/'));
} else {
  console.error('Usage: node scripts/import-legacy.ts [<file|folder> <content-folder>] [--title "…"] [--slug name] [--source link]');
  process.exit(1);
}
