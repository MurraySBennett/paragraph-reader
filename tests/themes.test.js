import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES } from '../src/themes.js';

// The one palette permitted to miss the bar: #f15a22 is the institution's orange.
const KNOWN_EXCEPTIONS = { utsa: ['accent'] };

function channel(hex, start) {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(colour) {
  const hex = colour.replace('#', '');
  const full = hex.length === 3 ? [...hex].map(digit => digit + digit).join('') : hex;
  return 0.2126 * channel(full, 0) + 0.7152 * channel(full, 2) + 0.0722 * channel(full, 4);
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function themeRules(css) {
  const rules = new Map();
  for (const match of css.matchAll(/body\[data-theme=([a-z-]+)\]\{([^}]*?--fg:[^}]*?)\}/g)) {
    const vars = Object.fromEntries([...match[2].matchAll(/--([a-z-]+):(#[0-9a-f]{3,6})/g)].map(pair => [pair[1], pair[2]]));
    rules.set(match[1], { vars, scheme: /color-scheme:dark/.test(match[2]) ? 'dark' : 'light' });
  }
  return rules;
}

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const themed = THEMES.filter(theme => theme.mode);

test('contrast helper expands three-digit hex', () => {
  assert.equal(contrast('#fff', '#000').toFixed(2), '21.00');
  assert.equal(contrast('#ffffff', '#000000').toFixed(2), '21.00');
});

test('every theme declares a mode except system and custom', () => {
  for (const { id, mode } of THEMES) {
    if (id === 'system' || id === 'custom') assert.equal(mode, undefined, `${id} should carry no mode`);
    else assert.ok(mode === 'light' || mode === 'dark', `${id} declares mode ${mode}`);
  }
  assert.equal(themed.length, THEMES.length - 2);
});

test('every themed id has a rule whose colour scheme matches its mode', () => {
  const rules = themeRules(css);
  for (const { id, mode } of themed) {
    assert.ok(rules.has(id), `no body[data-theme=${id}] rule`);
    assert.equal(rules.get(id).scheme, mode, `${id} declares color-scheme:${rules.get(id).scheme}`);
  }
});

test('every theme meets the contrast bar, with only the recorded exceptions failing', () => {
  const rules = themeRules(css);
  for (const { id } of themed) {
    const v = rules.get(id).vars;
    const checks = {
      fg: Math.min(contrast(v.bg, v.fg), contrast(v.surface, v.fg)) >= 7,
      muted: contrast(v.surface, v.muted) >= 5,
      accent: contrast(v.surface, v.accent) >= 4.5,
      'accent-text': contrast(v.accent, v['accent-text']) >= 4.5,
    };
    const failed = Object.keys(checks).filter(rule => !checks[rule]).sort();
    assert.deepEqual(failed, (KNOWN_EXCEPTIONS[id] ?? []).slice().sort(),
      `${id}: recorded exceptions and actual failures disagree`);
  }
});
