export type TabIconName = 'discover' | 'favorites' | 'history' | 'local'
export type ActionIconName = 'import-image' | 'import-video' | 'plus'
export type CategoryIconName =
  | 'all'
  | 'video'
  | 'nature'
  | 'landscape'
  | 'city'
  | 'anime'
  | 'abstract'
  | 'animals'
  | 'space'
  | 'cars'
  | 'gaming'
  | 'minimal'
  | 'technology'

export type IconName = CategoryIconName | TabIconName | ActionIconName | 'app'

interface IconProps {
  name: IconName
  className?: string
}

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

const IconPaths: Record<IconName, JSX.Element> = {
  app: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" {...stroke} />
      <path d="M8 21h8M12 17v4" {...stroke} />
      <circle cx="12" cy="11" r="2.5" {...stroke} />
    </>
  ),
  all: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" {...stroke} />
    </>
  ),
  video: (
    <>
      <rect x="2" y="6" width="15" height="12" rx="2" {...stroke} />
      <path d="m22 8-5 4 5 4V8Z" {...stroke} />
    </>
  ),
  nature: (
    <>
      <path d="M12 22V12" {...stroke} />
      <path d="M12 12c-4-3-8-1-8-6 4 0 6 2 8 6 2-4 4-6 8-6-0 5-4 3-8 6Z" {...stroke} />
    </>
  ),
  landscape: (
    <>
      <path d="m3 20 7-8 4 5 3-4 4 7" {...stroke} />
      <circle cx="17" cy="7" r="2.5" {...stroke} />
    </>
  ),
  city: (
    <>
      <path d="M3 21V9l6-3v15M9 21V5l6-2v18M15 21V11l6 3v7" {...stroke} />
      <path d="M6 12h1M6 16h1M18 15h1" {...stroke} />
    </>
  ),
  anime: (
    <>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 15c1.2 1.2 2.8 1.8 3 1.8s1.8-.6 3-1.8" {...stroke} />
    </>
  ),
  abstract: (
    <>
      <path d="M12 3l2.2 6.8H21l-5.6 4.1 2.1 6.8L12 16.6 6.5 20.7l2.1-6.8L3 9.8h6.8L12 3Z" {...stroke} />
    </>
  ),
  animals: (
    <>
      <circle cx="8.5" cy="9" r="2" {...stroke} />
      <circle cx="15.5" cy="9" r="2" {...stroke} />
      <circle cx="6" cy="14.5" r="1.8" {...stroke} />
      <circle cx="18" cy="14.5" r="1.8" {...stroke} />
      <path d="M12 11.5c2.5 0 4.5 2 4.5 4.5 0 2.2-2 3.5-4.5 3.5S7.5 18.2 7.5 16c0-2.5 2-4.5 4.5-4.5Z" {...stroke} />
    </>
  ),
  space: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9" {...stroke} />
      <path d="M12 3v4M12 3l3 3M21 12h-4M21 12l-3-3" {...stroke} />
      <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  cars: (
    <>
      <path d="M3 13h1.2l1.8-5h12l1.8 5H21" {...stroke} />
      <path d="M5 13v4h2v-2h10v2h2v-4" {...stroke} />
      <circle cx="7.5" cy="17" r="1.5" {...stroke} />
      <circle cx="16.5" cy="17" r="1.5" {...stroke} />
    </>
  ),
  gaming: (
    <>
      <path d="M6 11h4v4M8 9v8" {...stroke} />
      <path d="M15 13h.01M18 11h.01" {...stroke} />
      <rect x="2" y="6" width="20" height="12" rx="4" {...stroke} />
    </>
  ),
  minimal: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" {...stroke} />
      <path d="M8 12h8" {...stroke} />
    </>
  ),
  technology: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" {...stroke} />
      <path d="M8 20h8" {...stroke} />
      <path d="M12 16v4" {...stroke} />
    </>
  ),
  discover: (
    <>
      <circle cx="11" cy="11" r="7" {...stroke} />
      <path d="m20 20-3.5-3.5" {...stroke} />
    </>
  ),
  favorites: (
    <path
      d="M12 20.5 4.5 12.8a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0L12 7.7l.7-.7a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8L12 20.5Z"
      {...stroke}
    />
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M12 7v5l3 2" {...stroke} />
    </>
  ),
  local: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" {...stroke} />
    </>
  ),
  'import-image': (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" {...stroke} />
      <circle cx="9" cy="11" r="2" {...stroke} />
      <path d="m21 17-5.5-5.5a1.5 1.5 0 0 0-2.1 0L7 18" {...stroke} />
    </>
  ),
  'import-video': (
    <>
      <rect x="2" y="6" width="15" height="12" rx="2" {...stroke} />
      <path d="m22 8-5 4 5 4V8Z" {...stroke} />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" {...stroke} />
    </>
  )
}

export const Icon = ({ name, className = 'w-4 h-4' }: IconProps): JSX.Element => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {IconPaths[name]}
  </svg>
)
