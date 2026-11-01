import { useI18n } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'

export type Tab = 'entry' | 'month' | 'search' | 'settings'

const tabs: { tab: Tab; label: MessageKey; icon: string }[] = [
  { tab: 'entry', label: 'navEntry', icon: '✏️' },
  { tab: 'month', label: 'navMonth', icon: '📅' },
  { tab: 'search', label: 'navSearch', icon: '🔍' },
  { tab: 'settings', label: 'navSettings', icon: '⚙️' },
]

interface BottomNavProps {
  current: Tab
  onChange: (tab: Tab) => void
}

export default function BottomNav({ current, onChange }: BottomNavProps) {
  const { t } = useI18n()
  return (
    <nav
      aria-label={t('navLabel')}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ tab, label, icon }) => {
          const selected = tab === current
          return (
            <li key={tab}>
              <button
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => onChange(tab)}
                className={`flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-sm ${
                  selected ? 'font-bold text-accent-text' : 'text-muted'
                } focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-focus`}
              >
                <span aria-hidden="true" className="text-xl">
                  {icon}
                </span>
                {t(label)}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
