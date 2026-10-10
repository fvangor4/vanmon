// Runs after `vite build`: fails the build (and so the deploy) if the
// installed iPad app would be missing something it needs to play offline.
import { readFileSync } from 'node:fs';

const fail = (msg) => {
  console.error(`check-dist: ${msg}`);
  process.exit(1);
};

// GitHub Pages serves the game under /vanmon/; root-relative asset URLs would load a blank page.
const html = readFileSync('dist/index.html', 'utf8');
const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('http'));
const wrongBase = assetUrls.filter((u) => u.startsWith('/') && !u.startsWith('/vanmon/'));
if (wrongBase.length > 0) fail(`index.html points outside /vanmon/: ${wrongBase.join(', ')}`);
if (!assetUrls.some((u) => u.startsWith('/vanmon/assets/'))) fail('index.html does not load the game from /vanmon/assets/');

const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.start_url !== '.' || manifest.scope !== '.') fail('manifest start_url/scope must be "." (relative to /vanmon/)');
for (const icon of manifest.icons) readFileSync(`dist/${icon.src}`); // throws if an icon is missing

const sw = readFileSync('dist/sw.js', 'utf8');
const precached = new Set([...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]));
const creatures = JSON.parse(readFileSync('public/data/creatures.json', 'utf8'));
const needed = ['index.html', 'data/creatures.json', ...creatures.species.map((s) => `creatures/${s.image}`)];
const missing = needed.filter((f) => !precached.has(f));
if (missing.length > 0) {
  fail(`not saved for offline play (too big, or an unexpected file type?):\n  ${missing.join('\n  ')}`);
}
console.log(`check-dist: ok (${precached.size} files saved for offline play)`);
