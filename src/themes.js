// Declared in menu order. `mode` mirrors each palette's declared color-scheme and decides
// its group; `group` overrides that for the brand palettes, which a reader picks for a
// reason that has nothing to do with light or dark. System and custom have neither, and
// render loose at the ends of the menu.
export const THEMES = [
  { id: 'system', label: 'System' },

  { id: 'paper', label: 'Paper', mode: 'light' },
  { id: 'warm', label: 'Warm paper', mode: 'light' },
  { id: 'mist', label: 'Mist', mode: 'light' },
  { id: 'sage', label: 'Sage', mode: 'light' },
  { id: 'lavender', label: 'Lavender', mode: 'light' },
  { id: 'gruvbox-light', label: 'Gruvbox Light', mode: 'light' },

  { id: 'after-hours', label: 'After Hours', mode: 'dark' },
  { id: 'night', label: 'Night', mode: 'dark' },
  { id: 'slate', label: 'Slate', mode: 'dark' },
  { id: 'velvet', label: 'Velvet', mode: 'dark' },
  { id: 'neon', label: 'Neon', mode: 'dark' },
  { id: 'dracula', label: 'Dracula', mode: 'dark' },
  { id: 'night-owl', label: 'Night Owl', mode: 'dark' },
  { id: 'gruvbox-dark', label: 'Gruvbox Dark', mode: 'dark' },
  { id: 'contrast', label: 'High contrast', mode: 'dark' },

  { id: 'newcastle', label: 'Newcastle', mode: 'light', group: 'University' },
  { id: 'utsa', label: 'UT San Antonio', mode: 'dark', group: 'University' },
  { id: 'ohio-state', label: 'Ohio State', mode: 'light', group: 'University' },

  { id: 'custom', label: 'Custom' },
];

const MODE_LABELS = { light: 'Light', dark: 'Dark' };
const themeIds = new Set(THEMES.map(theme => theme.id));

export function isThemeId(value) { return themeIds.has(value); }

// Walks THEMES once, starting a new group each time the label changes. A null label means
// the items render loose, outside any optgroup.
export function themeGroups() {
  const groups = [];
  for (const theme of THEMES) {
    const label = theme.group ?? MODE_LABELS[theme.mode] ?? null;
    const previous = groups.at(-1);
    if (previous && previous.label === label) previous.items.push(theme);
    else groups.push({ label, items: [theme] });
  }
  return groups;
}

export function fillThemeSelect(select) {
  select.replaceChildren(...themeGroups().flatMap(({ label, items }) => {
    const options = items.map(theme => new Option(theme.label, theme.id));
    if (!label) return options;
    const group = document.createElement('optgroup');
    group.label = label;
    group.append(...options);
    return [group];
  }));
}
