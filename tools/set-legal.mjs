#!/usr/bin/env node
/**
 * Fills in the details of whoever is responsible for the site, in every file at once.
 *
 *   node tools/set-legal.mjs --name "Full Name" --address "Street 1, 00100 City, Italy" \
 *     --domain fluke.com --hello hello@fluke.com --privacy privacy@fluke.com \
 *     --hosting "Cloudflare Pages (Cloudflare, Inc.)" --waitlist "Tally (Tally B.V., Belgium)" --tally https://tally.so/r/XXXXXX
 *
 * Any option you leave out keeps its yellow placeholder. Then run: node tests/launch-check.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, r) => a.startsWith('--') ? [a.slice(2), r[i + 1]] : []).filter((x) => x.length));
const root = new URL('..', import.meta.url).pathname;
const map = {
  LEGAL_NAME: args.name, ADDRESS: args.address, DOMAIN: args.domain, EMAIL_HELLO: args.hello,
  TALLY_FORM: args.tally, EMAIL_PRIVACY: args.privacy || (args.domain ? `privacy@${args.domain}` : undefined), HOSTING: args.hosting, WAITLIST_PROVIDER: args.waitlist,
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
// --tally none: publish without the waitlist links (the sentences end where the links were)
const noForm = args.tally === 'none';
if (noForm) map.TALLY_FORM = undefined;
for (const f of walk(root)) {
  let t = readFileSync(f, 'utf8'), o = t;
  if (noForm) t = t.replace(/(?:Registration opens soon|Not on sale yet): <a href="\[\[TALLY_FORM\]\][^>]*>[^<]*<\/a>\./g, (m) => (m.startsWith('Not') ? 'Not on sale yet.' : 'Registration opens soon.'));
  for (const [k, v] of Object.entries(map)) {
    if (!v) continue;
    const esc = v.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    t = t.replaceAll(`<mark class="todo">[[${k}]]</mark>`, esc).replaceAll(`[[${k}]]`, f.endsWith('.html') ? esc : v);
  }
  if (t !== o) { writeFileSync(f, t); n++; }
}
if (args.domain) writeFileSync(join(root, 'CNAME'), args.domain + '\n');   // GitHub Pages custom domain
console.log(`updated ${n} files${args.domain ? ' and CNAME' : ''}`);
