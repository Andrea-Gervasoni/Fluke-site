#!/usr/bin/env node
/** The last gate before publishing: nothing left to fill in, nothing that tracks, everything legal is linked. */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url).pathname;
const skip = new Set(['node_modules', 'vendor', '.backup', 'preview', 'tests', 'tools', 'fonts', 'assets']);
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { if (skip.has(f)) continue; const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (['.html', '.txt', '.xml', '.webmanifest'].includes(extname(f)) || f === '_headers') files.push(p); } })(root);
const read = (f) => readFileSync(join(root, f), 'utf8');
let bad = 0;
const fail = (m) => { bad++; console.log('✗', m); }, pass = (m) => console.log('✓', m);

// 1 · nothing left to fill in
const left = {};
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\[\[(\w+)\]\]/g)) (left[m[1]] ||= new Set()).add(f.replace(root, ''));
const keys = Object.keys(left);
keys.length ? fail(`placeholders still to fill: ${keys.map((k) => `${k} (${[...left[k]].join(', ')})`).join('; ')}`) : pass('no placeholders left');

// 2 · legal pages exist and are linked from the footer
for (const p of ['privacy.html', 'terms.html', 'legal-notice.html']) {
  existsSync(join(root, p)) ? pass(`exists: ${p}`) : fail(`missing: ${p}`);
  read('index.html').includes(`href="${p}"`) ? pass(`linked from the footer: ${p}`) : fail(`not linked from index.html: ${p}`);
}

// 3 · no cookies, no unexpected third parties
const html = ['index.html', 'privacy.html', 'terms.html', 'legal-notice.html', '404.html'].map(read).join('\n');
const hosts = new Set([...html.matchAll(/(?:src|href)="https?:\/\/([^/"]+)/g)].map((m) => m[1]));
const own = existsSync(join(root, 'CNAME')) ? read('CNAME').trim() : '';
// the data protection authority, and the sources the page cites (study, preprint, report, dataset, method, article 1)
const allowed = new Set(['www.garanteprivacy.it', 'papers.ssrn.com', 'arxiv.org', 'cointelegraph.com', 'huggingface.co', 'doi.org', 'medium.com', own]);
const odd = [...hosts].filter((h) => !allowed.has(h) && !h.endsWith('.medium.com') && !h.startsWith('[['));
odd.length ? fail(`unexpected external hosts: ${odd.join(', ')}`) : pass('external links are only the data protection authority and the cited sources');
const js = readdirSync(join(root, 'js')).map((f) => f.endsWith('.js') ? read(`js/${f}`) : '').join('\n');
/document\.cookie|localStorage|indexedDB/.test(js) ? fail('the code touches cookies, localStorage or IndexedDB: update the privacy policy') : pass('no cookies, no localStorage');

// 4 · the headers file matches the page
const headers = read('_headers');
const m = read('index.html').match(/<script type="importmap">(.*?)<\/script>/s);
const hash = 'sha256-' + createHash('sha256').update(m[1]).digest('base64');
headers.includes(hash) ? pass('Content-Security-Policy matches the inline import map') : fail('the import map changed: update the sha256 in _headers');
/Strict-Transport-Security/.test(headers) ? pass('security headers present') : fail('security headers missing');

// 5 · discoverability
for (const f of ['robots.txt', 'sitemap.xml', '.well-known/security.txt']) existsSync(join(root, f)) ? pass(`exists: ${f}`) : fail(`missing: ${f}`);
const ix = read('index.html');
/rel="canonical"/.test(ix) && /og:image" content="https:/.test(ix) ? pass('canonical and absolute social image') : fail('canonical / absolute og:image missing');

console.log(bad ? `\n${bad} thing(s) to fix before publishing` : '\nready to publish');
process.exit(bad ? 1 : 0);
