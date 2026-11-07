import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown } from '../src/markdown.js';

test('Markdown preserves headings, nested emphasis, lists and safe links', () => {
  const parsed = parseMarkdown('# A title\n\nA **bold *part*** and [site](https://example.org).\n\n- One\n- Two', 'demo.md');
  assert.deepEqual(parsed.blocks.map(block => [block.kind, block.text]), [
    ['heading', 'A title'], ['paragraph', 'A bold part and site.'], ['list-item', 'One'], ['list-item', 'Two'],
  ]);
  assert.deepEqual(parsed.blocks[1].runs.find(run => run.text === 'part'), { text: 'part', bold: true, italic: true, href: null });
  assert.equal(parsed.blocks[1].runs.find(run => run.text === 'site').href, 'https://example.org/');
});

test('Markdown does not create executable markup or unsafe links', () => {
  const parsed = parseMarkdown('A [bad](javascript:alert(1)) link and <script>alert(2)</script>.', 'demo.md');
  assert.equal(parsed.blocks[0].runs.some(run => run.href?.startsWith('javascript:')), false);
  assert.equal(parsed.blocks[0].text.includes('alert(2)'), true);
});

test('outer list resumes after a nested list', () => {
  const parsed = parseMarkdown('- outer one\n  - inner\n- outer two');
  assert.deepEqual(parsed.blocks.map(block => [block.kind, block.listType]), [
    ['list-item', 'unordered'], ['list-item', 'unordered'], ['list-item', 'unordered'],
  ]);
});
