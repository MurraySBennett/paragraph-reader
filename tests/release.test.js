import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

test('release builds static site and self-contained CLI page', () => {
  execFileSync('node', ['build.mjs'], { cwd: process.cwd() });
  const web = readFileSync('dist/index.html', 'utf8');
  const cli = readFileSync('dist/paragraph-reader.html', 'utf8');
  assert.match(web, /<script type="module" src="\.\/src\/app\.js"><\/script>/);
  assert.match(cli, /<style>[\s\S]*reading-card/);
  assert.match(cli, /<script>[\s\S]*getElementById/);
  assert.doesNotMatch(cli, /src="\.\/src\/app\.js"/);
  assert.equal(existsSync('dist/vendor/pdf.worker.mjs'), true);
});
