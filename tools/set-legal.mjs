#!/usr/bin/env node
/**
 * Fills in the details of whoever is responsible for the site, in every file at once.
 *
 *   node tools/set-legal.mjs --name "Full Name" --address "Street 1, 00100 City, Italy" \
 *     --domain fluke.com --hello hello@fluke.com --privacy privacy@fluke.com \
 *     --hosting "Cloudflare Pages (Cloudflare, Inc.)" --article1 https://medium.com/@you/the-article
 *
 * --article1 is the address of article 1 on Medium ("The Best Crypto Trading AI Might Just Be the Luckiest"):
 * it fills every link to it on the page and in the research note.
 *
 * Any option you leave out keeps its yellow placeholder. Then run: node tests/launch-check.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, r) => a.startsWith('--') ? [a.slice(2), r[i + 1]] : []).filter((x) => x.length));
const root = new URL('..', import.meta.url).pathname;
const map = {
  LEGAL_NAME: args.name, ADDRESS: args.address, DOMAIN: args.domain, EMAIL_HELLO: args.hello,
  EMAIL_PRIVACY: args.privacy || (args.domain ? `privacy@${args.domain}` : undefined), HOSTING: args.hosting, ARTICLE_1: args.article1,
};
const skip = new Set(['node_modules', 'vendor', '.backup', 'preview', 'tests', 'tools', 'fonts', 'assets']);
const exts = new Set(['.html', '.txt', '.xml', '.webmanifest']);
function* walk(d) {
  for (const f of readdirSync(d)) {
    if (skip.has(f)) continue;
    const p = join(d, f), s = statSync(p);
    if (s.isDirectory()) yield* walk(p); else if (exts.has(extname(f)) || f === '_headers') yield p;
  }
}
let n = 0;
for (const f of walk(root)) {
  let t = readFileSync(f, 'utf8'), o = t;
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    const esc = v.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    t = t.replaceAll(`<mark class="todo">[[${k}]]</mark>`, esc).replaceAll(`[[${k}]]`, f.endsWith('.html') ? esc : v);
  }
  if (t !== o) { writeFileSync(f, t); n++; }
}
if (args.domain) writeFileSync(join(root, 'CNAME'), args.domain + '\n');   // GitHub Pages custom domain
console.log(`updated ${n} files${args.domain ? ' and CNAME' : ''}`);
