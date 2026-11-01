// Category colors, used as a small identity dot next to the name (never as text color).
// Hues follow a colorblind-checked categorical order; gray is for "אחר".
export const CATEGORY_COLORS = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
  yellow: '#eda100',
  magenta: '#e87ba4',
  green: '#008300',
  violet: '#6250d6',
  red: '#e34948',
  gray: '#898781',
} as const

export type CategoryColor = keyof typeof CATEGORY_COLORS

export const CATEGORY_COLOR_NAMES = Object.keys(CATEGORY_COLORS) as CategoryColor[]

export function isCategoryColor(value: unknown): value is CategoryColor {
  return typeof value === 'string' && Object.hasOwn(CATEGORY_COLORS, value)
}
