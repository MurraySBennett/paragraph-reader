import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';

test('release builds static site and self-contained CLI page', () => {
  execFileSync('node', ['build.mjs'], { cwd: process.cwd() });
  const web = readFileSync('dist/index.html', 'utf8');
  const cli = readFileSync('dist/paragraph-reader.html', 'utf8');
  assert.match(web, /<script type="module" src="\.\/app\.js"><\/script>/);
  assert.equal(existsSync('dist/app.js'), true);
  assert.match(cli, /<style>[\s\S]*reading-card/);
  assert.match(cli, /<script>[\s\S]*getElementById/);
  assert.doesNotMatch(cli, /src="\.\/src\/app\.js"/);
  assert.equal(existsSync('dist/vendor/pdf.worker.mjs'), true);
});

test('release names the product Reader and links the ZIP it built', () => {
  execFileSync('node', ['build.mjs'], { cwd: process.cwd() });
  const web = readFileSync('dist/index.html', 'utf8');
  assert.match(web, /<title>Reader<\/title>/);
  assert.doesNotMatch(web, /Paragraph Reader/);
  // A stable filename, deliberately. The name is baked into every page a
  // visitor has already cached, and the service worker is cache-first, so a
  // name that moved with the build date would 404 for anyone who installed
  // before the last deploy. The date lives inside the package instead.
  const zips = readdirSync('dist').filter(file => file.endsWith('.zip'));
  assert.ok(zips.includes('reader-offline.zip'), `built ZIPs: ${zips}`);
  assert.ok(web.includes('reader-offline.zip'), 'index.html must link the built ZIP');
  assert.doesNotMatch(web, /__[A-Z_]+__/, 'no unsubstituted placeholder may reach dist');
  const start = strFromU8(unzipSync(readFileSync('dist/reader-offline.zip'))['START-HERE.txt']);
  assert.match(start, /^Reader · \d{4}-\d{2}-\d{2}\n/, 'the package carries its build date');
});
