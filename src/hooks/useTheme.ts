import { useEffect } from 'react'
import type { ThemeSetting } from '../lib/types'

/** Puts the `dark` class on <html> for the dark theme, or for "system" while the device is in dark mode. */
export function useTheme(theme: ThemeSetting): void {
  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null

    function apply() {
      const dark = theme === 'dark' || (theme === 'system' && media?.matches === true)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1e293b' : '#ffffff')
    }

    apply()
    media?.addEventListener('change', apply)
    return () => media?.removeEventListener('change', apply)
  }, [theme])
}
