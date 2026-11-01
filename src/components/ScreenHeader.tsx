import { useI18n } from '../i18n/i18n'
import { iconButton } from './ui'

interface ScreenHeaderProps {
  title: string
  onBack?: () => void
}

export default function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { t, dir } = useI18n()
  return (
    <header className="flex min-h-12 items-center gap-2">
      {onBack && (
        <button type="button" aria-label={t('back')} onClick={onBack} className={`${iconButton} text-2xl`}>
          {/* "Back" points to the start side: right in RTL, left in LTR */}
          {dir === 'rtl' ? '→' : '←'}
        </button>
      )}
      <h1 tabIndex={-1} className="text-xl font-bold outline-none">
        {title}
      </h1>
    </header>
  )
}
