import { CATEGORY_COLORS } from '../lib/colors'
import type { Category } from '../lib/types'

/** Round badge with the category's color and emoji. Decorative: the name is always shown next to it. */
export default function CategoryIcon({ category }: { category: Category | undefined }) {
  const color = CATEGORY_COLORS[category?.color ?? 'gray']
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
      style={{ backgroundColor: `${color}33`, boxShadow: `inset 0 0 0 2px ${color}` }}
    >
      {category?.icon ?? ''}
    </span>
  )
}
