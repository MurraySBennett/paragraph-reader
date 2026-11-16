import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

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
  const zip = readdirSync('dist').find(file => file.endsWith('.zip'));
  assert.match(zip, /^reader-\d{4}-\d{2}-\d{2}\.zip$/);
  assert.ok(web.includes(zip), 'index.html must link the ZIP that was built');
});
