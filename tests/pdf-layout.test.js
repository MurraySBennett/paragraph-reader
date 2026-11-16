import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutParagraphs, looksLineNumbered } from '../src/pdf-layout.js';

const numbered = [[
  ' 1   LEARNING IN OLDER AGE                             7',
  ' 2',
  ' 3          The domain structure of later life learning can be organized in',
  ' 4',
  ' 5   several ways. A useful broad distinction is between learning that',
  ' 6',
  ' 7   primarily involves declarative knowledge.',
  ' 8',
  ' 9          Measures that collapse across domains may obscure the specific',
  '10',
  '11   situations in which older adults feel competent.',
], [
  ' 1   LEARNING IN OLDER AGE                             8',
  ' 2',
  ' 3   They may also capture a general orientation toward learning.',
]];

test('line-numbered double-spaced pages split on first-line indent, not blank lines', () => {
  assert.equal(looksLineNumbered(numbered.flat()), true);
  assert.deepEqual(layoutParagraphs(numbered), [
    'The domain structure of later life learning can be organized in several ways. '
      + 'A useful broad distinction is between learning that primarily involves declarative knowledge.',
    'Measures that collapse across domains may obscure the specific situations in which '
      + 'older adults feel competent. They may also capture a general orientation toward learning.',
  ]);
});

test('running heads are dropped and paragraphs continue across the page break', () => {
  const text = layoutParagraphs(numbered).join('\n\n');
  assert.ok(!text.includes('LEARNING IN OLDER AGE'));
  assert.ok(text.includes('feel competent. They may also'));
});

test('a hyphen left at a row break rejoins its word', () => {
  assert.deepEqual(layoutParagraphs([[
    '      Competence beliefs are hierarchical and domain-',
    'specific across content areas.',
  ]]), ['Competence beliefs are hierarchical and domain-specific across content areas.']);
});

test('ordinary PDF rows keep blank-line paragraphs and untouched leading numbers', () => {
  const rows = [[
    'A first paragraph of ordinary extracted text.',
    '',
    '2024 was the reference year for every estimate below.',
    'It continues on the next row.',
  ]];
  assert.equal(looksLineNumbered(rows.flat()), false);
  assert.deepEqual(layoutParagraphs(rows), [
    'A first paragraph of ordinary extracted text.',
    '2024 was the reference year for every estimate below. It continues on the next row.',
  ]);
});
