export const THEMES = [
  { id: 'after-hours', label: 'After Hours' },
  { id: 'neon', label: 'Neon' },
  { id: 'velvet', label: 'Velvet' },
  { id: 'newcastle', label: 'Newcastle' },
  { id: 'utsa', label: 'UT San Antonio' },
  { id: 'ohio-state', label: 'Ohio State' },
  { id: 'system', label: 'System' },
  { id: 'paper', label: 'Paper' },
  { id: 'warm', label: 'Warm paper' },
  { id: 'slate', label: 'Slate' },
  { id: 'night', label: 'Night' },
  { id: 'contrast', label: 'High contrast' },
  { id: 'custom', label: 'Custom' },
];

const themeIds = new Set(THEMES.map(theme => theme.id));

export function isThemeId(value) { return themeIds.has(value); }

export function fillThemeSelect(select) {
  select.replaceChildren(...THEMES.map(({ id, label }) => new Option(label, id)));
}
