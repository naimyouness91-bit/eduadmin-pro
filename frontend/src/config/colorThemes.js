export const COLOR_THEME_STORAGE_KEY = 'eduadmin-color-theme';

export const DEFAULT_COLOR_THEME = 'blue';

/** @type {readonly { id: string; label: string; preview: string; accent: string }[]} */
export const COLOR_THEME_OPTIONS = [
  { id: 'blue', label: 'Blue', preview: '#3b82f6', accent: '#2563eb' },
  { id: 'purple', label: 'Purple', preview: '#8b5cf6', accent: '#7c3aed' },
  { id: 'green', label: 'Green', preview: '#22c55e', accent: '#16a34a' },
  { id: 'orange', label: 'Orange', preview: '#f97316', accent: '#ea580c' },
  { id: 'red', label: 'Red', preview: '#ef4444', accent: '#dc2626' },
];

/**
 * Full CSS variable maps per theme (source of truth).
 * Applied inline on <html> so theme switches always win over :root defaults.
 */
export const COLOR_THEME_PALETTES = {
  blue: {
    '--color-primary-50': '239 246 255',
    '--color-primary-100': '219 234 254',
    '--color-primary-200': '191 219 254',
    '--color-primary-300': '147 197 253',
    '--color-primary-400': '96 165 250',
    '--color-primary-500': '59 130 246',
    '--color-primary-600': '37 99 235',
    '--color-primary-700': '29 78 216',
    '--color-primary-800': '30 64 175',
    '--color-primary-900': '30 58 138',
    '--color-primary-950': '23 37 84',
    '--primary-color': '#3b82f6',
    '--secondary-color': '#2563eb',
    '--accent-color': '#60a5fa',
    '--gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    '--mesh-gradient':
      'radial-gradient(at 40% 20%, rgba(59, 130, 246, 0.25) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(37, 99, 235, 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(96, 165, 250, 0.12) 0px, transparent 50%)',
    '--shadow-glow': '0 0 24px rgba(59, 130, 246, 0.35)',
  },
  purple: {
    '--color-primary-50': '245 243 255',
    '--color-primary-100': '237 233 254',
    '--color-primary-200': '221 214 254',
    '--color-primary-300': '196 181 253',
    '--color-primary-400': '167 139 250',
    '--color-primary-500': '139 92 246',
    '--color-primary-600': '124 58 237',
    '--color-primary-700': '109 40 217',
    '--color-primary-800': '91 33 182',
    '--color-primary-900': '76 29 149',
    '--color-primary-950': '46 16 101',
    '--primary-color': '#8b5cf6',
    '--secondary-color': '#7c3aed',
    '--accent-color': '#a78bfa',
    '--gradient-primary': 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #7c3aed 100%)',
    '--mesh-gradient':
      'radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.25) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(168, 85, 247, 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(167, 139, 250, 0.12) 0px, transparent 50%)',
    '--shadow-glow': '0 0 24px rgba(139, 92, 246, 0.35)',
  },
  green: {
    '--color-primary-50': '240 253 244',
    '--color-primary-100': '220 252 231',
    '--color-primary-200': '187 247 208',
    '--color-primary-300': '134 239 172',
    '--color-primary-400': '74 222 128',
    '--color-primary-500': '34 197 94',
    '--color-primary-600': '22 163 74',
    '--color-primary-700': '21 128 61',
    '--color-primary-800': '22 101 52',
    '--color-primary-900': '20 83 45',
    '--color-primary-950': '5 46 22',
    '--primary-color': '#22c55e',
    '--secondary-color': '#16a34a',
    '--accent-color': '#4ade80',
    '--gradient-primary': 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
    '--mesh-gradient':
      'radial-gradient(at 40% 20%, rgba(34, 197, 94, 0.25) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(22, 163, 74, 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(74, 222, 128, 0.12) 0px, transparent 50%)',
    '--shadow-glow': '0 0 24px rgba(34, 197, 94, 0.35)',
  },
  orange: {
    '--color-primary-50': '255 247 237',
    '--color-primary-100': '255 237 213',
    '--color-primary-200': '254 215 170',
    '--color-primary-300': '253 186 116',
    '--color-primary-400': '251 146 60',
    '--color-primary-500': '249 115 22',
    '--color-primary-600': '234 88 12',
    '--color-primary-700': '194 65 12',
    '--color-primary-800': '154 52 18',
    '--color-primary-900': '124 45 18',
    '--color-primary-950': '67 20 7',
    '--primary-color': '#f97316',
    '--secondary-color': '#ea580c',
    '--accent-color': '#fb923c',
    '--gradient-primary': 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
    '--mesh-gradient':
      'radial-gradient(at 40% 20%, rgba(249, 115, 22, 0.25) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(234, 88, 12, 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(251, 146, 60, 0.12) 0px, transparent 50%)',
    '--shadow-glow': '0 0 24px rgba(249, 115, 22, 0.35)',
  },
  red: {
    '--color-primary-50': '254 242 242',
    '--color-primary-100': '254 226 226',
    '--color-primary-200': '254 202 202',
    '--color-primary-300': '252 165 165',
    '--color-primary-400': '248 113 113',
    '--color-primary-500': '239 68 68',
    '--color-primary-600': '220 38 38',
    '--color-primary-700': '185 28 28',
    '--color-primary-800': '153 27 27',
    '--color-primary-900': '127 29 29',
    '--color-primary-950': '69 10 10',
    '--primary-color': '#ef4444',
    '--secondary-color': '#dc2626',
    '--accent-color': '#f87171',
    '--gradient-primary': 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    '--mesh-gradient':
      'radial-gradient(at 40% 20%, rgba(239, 68, 68, 0.25) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(220, 38, 38, 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(248, 113, 113, 0.12) 0px, transparent 50%)',
    '--shadow-glow': '0 0 24px rgba(239, 68, 68, 0.35)',
  },
};

const VALID_IDS = new Set(COLOR_THEME_OPTIONS.map((t) => t.id));

export function normalizeColorTheme(id) {
  return VALID_IDS.has(id) ? id : DEFAULT_COLOR_THEME;
}

export function getColorThemeMeta(id) {
  return COLOR_THEME_OPTIONS.find((t) => t.id === normalizeColorTheme(id)) ?? COLOR_THEME_OPTIONS[0];
}

export function getThemeCssVariables(themeId) {
  const id = normalizeColorTheme(themeId);
  return COLOR_THEME_PALETTES[id] ?? COLOR_THEME_PALETTES[DEFAULT_COLOR_THEME];
}

export function readStoredColorTheme() {
  try {
    return normalizeColorTheme(localStorage.getItem(COLOR_THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_COLOR_THEME;
  }
}

/** Current primary hex (charts, inline styles). */
export function getPrimaryColorHex() {
  if (typeof document === 'undefined') {
    return getColorThemeMeta(DEFAULT_COLOR_THEME).preview;
  }
  const inline = document.documentElement.style.getPropertyValue('--primary-color').trim();
  if (inline) return inline;
  return getColorThemeMeta(document.documentElement.getAttribute('data-color-theme')).preview;
}
