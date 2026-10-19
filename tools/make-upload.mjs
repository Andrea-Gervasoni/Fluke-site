#!/usr/bin/env node
/**
 * Builds the folder to publish: only what the site needs (no backups, previews, tests, tools).
 *   node tools/make-upload.mjs        → ../fluke-upload/  and  ../fluke-upload.zip
 * It refuses to run if the launch check still finds something to fix.
 */
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, '..', 'fluke-upload');
try { execFileSync('node', [join(root, 'tests/launch-check.mjs')], { stdio: 'inherit' }); }
catch { console.error('\nNot built: fix the points above first (node tools/set-legal.mjs …).'); process.exit(1); }

rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const keep = ['index.html', '404.html', 'privacy.html', 'terms.html', 'legal-notice.html', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', '_headers', 'css', 'js', 'vendor', 'assets', '.well-known'];
for (const f of keep) if (existsSync(join(root, f))) cpSync(join(root, f), join(out, f), { recursive: true });
// only the fonts the site loads (the old pixel font is no longer used)
mkdirSync(join(out, 'fonts'));
for (const f of readdirSync(join(root, 'fonts'))) if (f.endsWith('.woff2')) cpSync(join(root, 'fonts', f), join(out, 'fonts', f));
// some browsers and scanners look for security.txt at the root, too
if (existsSync(join(out, '.well-known/security.txt'))) cpSync(join(out, '.well-known/security.txt'), join(out, 'security.txt'));
try { rmSync(join(root, '..', 'fluke-upload.zip'), { force: true }); execFileSync('zip', ['-qr', join(root, '..', 'fluke-upload.zip'), '.'], { cwd: out }); } catch { /* zip is optional */ }
const size = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(join(d, e.name)) : statSync(join(d, e.name)).size), 0);
console.log(`\nbuilt ${out} (${(size(out) / 1e6).toFixed(1)} MB)`);
