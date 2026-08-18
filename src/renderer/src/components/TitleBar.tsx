import { useState } from 'react'
import AppLogo from './AppLogo'

const TitleBar = (): JSX.Element => {
  const [isMaximized, setIsMaximized] = useState(false)

  const handleMinimize = (): void => {
    window.api?.windowMinimize()
  }

  const handleToggleMaximize = (): void => {
    window.api?.windowToggleMaximize().then(setIsMaximized)
  }

  const handleClose = (): void => {
    window.api?.windowClose()
  }

  const winBtn =
    'w-11 h-10 flex items-center justify-center text-slate-300 hover:text-white transition-colors duration-150'

  return (
    <header className="h-10 flex items-stretch shrink-0 bg-dark-800 drag-region select-none">
      <div className="flex items-center gap-2.5 px-4 min-w-0">
        <AppLogo className="w-7 h-7 shrink-0" />
        <span className="text-[13px] font-semibold text-slate-100 tracking-tight truncate">
          画境
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-stretch no-drag-region">
        <button
          type="button"
          onClick={handleMinimize}
          className={`${winBtn} hover:bg-white/[0.06]`}
          title="最小化"
          aria-label="最小化"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            <rect x="1" y="4.5" width="8" height="1" rx="0.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleToggleMaximize}
          className={`${winBtn} hover:bg-white/[0.06]`}
          title={isMaximized ? '还原' : '最大化'}
          aria-label={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              aria-hidden="true"
            >
              <path d="M2.5 1h4.5a1 1 0 0 1 1 1v4.5M1 2.5V7a1 1 0 0 0 1 1h4.5" />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className={`${winBtn} hover:bg-[#e81123] hover:text-white`}
          title="关闭"
          aria-label="关闭"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <path d="M1 1l8 8M9 1L1 9" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default TitleBar
