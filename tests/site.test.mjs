#!/usr/bin/env node
// Static checks: files, links, fonts, content rules. Run: node tests/site.test.mjs
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fail++; };

const html = read('index.html');
const css = read('css/style.css');

// every local file referenced exists
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+?)"/g), ...css.matchAll(/url\('\.\.\/([^']+)'\)/g)].map((m) => m[1]).filter((p) => !p.startsWith('http') && !p.startsWith('[['));
for (const r of new Set(refs)) ok(existsSync(join(root, r.replace(/^\.\.\//, ''))), `exists: ${r}`);
for (const f of ['404.html', 'manifest.webmanifest', 'assets/og.jpg', 'assets/favicon.svg', 'js/main.js', 'js/stage.js', 'js/director.js', 'js/liquid.js', 'js/what.js', 'js/services.js', 'js/svc-screen.js', 'js/svc-win.js', 'js/inside.js', 'assets/logo-end.png', 'vendor/three.module.min.js', 'vendor/addons/RoundedBoxGeometry.js', 'vendor/addons/RoomEnvironment.js']) ok(existsSync(join(root, f)), `exists: ${f}`);

// type system: three families for the site, plus the pixel face that exists only inside the computer screen
const families = new Set([...css.matchAll(/font-family:\s*'([^']+)'/g)].map((m) => m[1]));
ok(families.size <= 3, `@font-face families ≤ 3 (${[...families].join(', ')})`);
for (const bad of ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Playfair Display', 'Space Grotesk', 'DM Sans', 'Manrope']) ok(!css.includes(`'${bad}'`), `no forbidden font ${bad}`);
const used = css.replace(/@font-face\s*{[^}]*}/g, '');
const weights = new Set([...used.matchAll(/font(?:-weight)?:\s*(\d{3})\b/g)].map((m) => m[1]));
ok([...weights].every((w) => ['400', '500', '600', '700', '900'].includes(w)), `only weights 400/500/600 (+700/900 for the italic) (${[...weights].join(', ')})`);

// content rules
ok(!/lorem ipsum/i.test(html), 'no lorem ipsum');
ok(/not market data/i.test(html), 'demo is labelled as illustrative');
ok(!/macintosh/i.test(html), 'no "Macintosh" in the page');
ok(/<title>[^<]+<\/title>/.test(html) && /name="description"/.test(html) && /og:image/.test(html), 'title, description, og:image');
ok([...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\balt="/.test(m[0])), 'every <img> has alt');
ok(/prefers-reduced-motion/.test(css), 'reduced motion handled in CSS');
ok(/\(hover: none\) and \(pointer: coarse\)/.test(read('js/main.js')), 'phone detection uses hover:none + pointer:coarse');

// weight budget
const size = (p) => statSync(join(root, p)).size;
const kb = (n) => Math.round(n / 1024);
const fonts = ['fonts/anton.woff2', 'fonts/general-sans-400.woff2', 'fonts/general-sans-500.woff2', 'fonts/general-sans-600.woff2', 'fonts/bodoni-moda-italic.woff2', 'fonts/bodoni-moda-roman.woff2'].reduce((a, f) => a + size(f), 0);
ok(fonts < 260 * 1024, `fonts ${kb(fonts)} KB < 260 KB`);
// round 5: the opaque sections hide every cut, the footer is a real footer, the ending lands the dot in the logo
for (const id of ['what', 'how', 'research', 'limits', 'check', 'faq']) ok(new RegExp(`\\.${id}[ ,][^{]*\\{[^}]*background: var\\(--(paper|ink)\\)`).test(css), `.${id} has an opaque background`);
ok(/id="end-dot"/.test(html) && /id="fly-dot"/.test(html), 'end dot and travelling dot exist');
ok(/<footer class="foot">/.test(html), 'footer element present');
ok(!/For anyone/.test(html), 'no leftover "For anyone" line');
// round 14: wallets. Two free tools, nothing for sale, every figure with a source and a status
ok(!/Verified|Quant Bot|tally\.so|waitlist|subscription|copy trad/i.test(html), 'no Verified, no Quant Bot, no waitlist form, nothing for sale');
ok(/of 2 opened/.test(html) && (html.match(/class="svc-item"/g) || []).length === 2, 'two tools, counter "0 of 2 opened"');
const research = html.slice(html.indexOf('id="research"'), html.indexOf('id="limits"'));
ok((research.match(/class="pane-tag[^"]*">(Reported|Computed by us)</g) || []).length === 3 && (research.match(/href="https:\/\//g) || []).length >= 3, 'every research figure has a status label and a source link');
ok((html.match(/Illustrative chart/g) || []).length === 4, 'the four step charts are labelled illustrative');
ok(/Illustrative, not real wallets|ILLUSTRATIVE, NOT REAL WALLETS/.test(read('js/svc-screen.js')), 'the index preview says its wallets are not real');

console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
process.exit(fail ? 1 : 0);
