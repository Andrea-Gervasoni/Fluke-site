#!/usr/bin/env node
/* Captures a sequence of frames in real time (to judge the opening animation).
   node tests/frames.mjs --url <url> --w 1440 --h 900 --every 450 --count 20 --out /tmp/frames [--mobile] */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true'] : []).filter(Boolean));
const url = args.url, W = +args.w || 1440, H = +args.h || 900, dpr = +args.dpr || 1, every = +args.every || 450, count = +args.count || 16, out = args.out || '/tmp/frames';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9300 + Math.floor(Math.random() * 500);
await mkdir(out, { recursive: true });
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(out, 'profile')}`, '--no-first-run', '--hide-scrollbars', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = l.find((t) => t.type === 'page'); if (target) break; } catch {} await sleep(200); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: args.mobile === 'true' });
const errors = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text); if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) errors.push(m.params.type + ': ' + m.params.args.map(a=>a.value||a.description).join(' ')); });
await send('Page.navigate', { url });
const t0 = Date.now();
for (let i = 0; i < count; i++) {
  const wait = t0 + (i + 1) * every - Date.now(); if (wait > 0) await sleep(wait);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  await writeFile(join(out, `f${String(i).padStart(2, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
ws.close(); proc.kill(); console.log('done');
