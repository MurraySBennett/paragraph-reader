// mode mirrors each palette's declared color-scheme; system and custom have neither.
export const THEMES = [
  { id: 'after-hours', label: 'After Hours', mode: 'dark' },
  { id: 'neon', label: 'Neon', mode: 'dark' },
  { id: 'velvet', label: 'Velvet', mode: 'dark' },
  { id: 'newcastle', label: 'Newcastle', mode: 'light' },
  { id: 'utsa', label: 'UT San Antonio', mode: 'dark' },
  { id: 'ohio-state', label: 'Ohio State', mode: 'light' },
  { id: 'system', label: 'System' },
  { id: 'paper', label: 'Paper', mode: 'light' },
  { id: 'warm', label: 'Warm paper', mode: 'light' },
  { id: 'slate', label: 'Slate', mode: 'dark' },
  { id: 'night', label: 'Night', mode: 'dark' },
  { id: 'contrast', label: 'High contrast', mode: 'dark' },
  { id: 'custom', label: 'Custom' },
];

const themeIds = new Set(THEMES.map(theme => theme.id));

export function isThemeId(value) { return themeIds.has(value); }

export function fillThemeSelect(select) {
  select.replaceChildren(...THEMES.map(({ id, label }) => new Option(label, id)));
}
