import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface HudSelectOption {
  label: string
  value: string
}

interface HudSelectProps {
  value: string
  options: HudSelectOption[]
  onChange: (value: string) => void
  title?: string
  className?: string
}

const HudSelect = ({
  value,
  options,
  onChange,
  title,
  className = ''
}: HudSelectProps): JSX.Element => {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 })
  const selected = options.find((o) => o.value === value) ?? options[0]

  const updatePos = (): void => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(Math.max(r.width, 200), Math.min(280, window.innerWidth - 16))
    let left = r.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
    setPos({ top: r.bottom + 6, left: Math.max(8, left), width })
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    const onDoc = (e: MouseEvent): void => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = (): void => setOpen(false)
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`hud-select h-11 px-3 text-sm text-left truncate ${className}`}
      >
        {selected?.label}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="hud-menu"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={o.value === value ? 'active' : ''}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}

export default HudSelect
