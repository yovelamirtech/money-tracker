// Shared Tailwind class strings, so every control gets the same size and focus ring.

export const focusRing =
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

export const fieldClass =
  'min-h-12 w-full rounded-xl border border-field bg-card px-3 text-lg text-fg focus:border-accent focus:outline-2 focus:outline-focus'

export const primaryButton = `min-h-12 rounded-2xl bg-accent px-4 text-lg font-semibold text-on-accent hover:bg-accent-hover ${focusRing}`

export const secondaryButton = `min-h-12 rounded-2xl bg-card px-4 text-lg font-semibold text-fg shadow-sm ring-1 ring-line hover:bg-subtle ${focusRing}`

export const iconButton = `flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle ${focusRing}`

export const card = 'rounded-2xl bg-card p-4 shadow-sm'

export const sectionTitle = 'mb-3 text-lg font-bold'
