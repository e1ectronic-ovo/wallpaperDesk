import { useState } from 'react'
import { useAppStore } from '@renderer/store/useAppStore'
import { RESOLUTIONS, SORT_OPTIONS } from '@shared/data'
import type { LibraryTab } from '@shared/types'
import HudSelect from './HudSelect'

const TAB_LABELS: Record<LibraryTab, { zh: string; code: string }> = {
  all:       { zh: '全部资源', code: 'ALL' },
  images:    { zh: '图片库',   code: 'IMG' },
  videos:    { zh: '动态视频', code: 'VID' },
  favorites: { zh: '我的收藏', code: 'FAV' }
}

const Toolbar = (): JSX.Element => {
  const {
    searchQuery,
    setSearchQuery,
    selectedResolution,
    setResolution,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    activeTab,
    getFilteredWallpapers,
    activeVideoWallpaper,
    setActiveVideoWallpaper
  } = useAppStore()

  const [stopping, setStopping] = useState(false)
  const total = getFilteredWallpapers().length
  const tabInfo = TAB_LABELS[activeTab]

  const handleStopVideo = async (): Promise<void> => {
    setStopping(true)
    try {
      const r = await window.api?.stopVideoWallpaper?.()
      if (r?.success) setActiveVideoWallpaper(null)
    } finally {
      setTimeout(() => setStopping(false), 300)
    }
  }

  return (
    <div className="min-h-16 hud-toolbar px-4 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 flex-wrap sticky top-0 z-10">
      {/* 搜索框 */}
      <div className="flex-1 min-w-[160px] max-w-xl basis-[200px]">
        <div className="relative">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border border-neon-cyan/30 text-neon-cyan/80"
            style={{
              clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
              background: 'linear-gradient(180deg, rgba(0,255,225,0.1), rgba(0,255,225,0.02))'
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="// SEARCH.QUERY ..."
            className="hud-input w-full h-11 pl-14 pr-4 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neon-cyan/60 hover:text-neon-magenta transition-colors"
              title="清空搜索"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <HudSelect
        value={selectedResolution}
        onChange={setResolution}
        options={RESOLUTIONS}
        title="分辨率筛选"
        className="w-[9.5rem] shrink-0"
      />

      <HudSelect
        value={sortBy}
        onChange={(v) => setSortBy(v as typeof sortBy)}
        options={SORT_OPTIONS}
        title="排序方式"
        className="w-[8.5rem] shrink-0"
      />

      {/* 视图切换（网格 / 列表） */}
      <div className="hud-seg flex shrink-0">
        <button
          onClick={() => setViewMode('grid')}
          className={viewMode === 'grid' ? 'active' : ''}
          title="网格视图"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4zM16 6h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4z" />
          </svg>
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'active' : ''}
          title="列表视图"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* 资源计数条 */}
      <div className="hud-counter shrink-0 hidden xl:inline-flex">
        <span className="text-neon-cyan/80">{tabInfo.code}</span>
        <span className="w-px h-4 bg-neon-cyan/30" />
        <span className="text-dark-200/80 text-[11px]">{tabInfo.zh}</span>
        <span
          className="inline-flex items-center justify-center min-w-[42px] px-2 h-6 text-neon-cyan font-bold text-sm border border-neon-cyan/40"
          style={{
            clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
            background: 'linear-gradient(90deg, rgba(0,255,225,0.18), rgba(0,255,225,0.04))',
            textShadow: '0 0 8px rgba(0,255,225,0.75)'
          }}
        >
          {total.toString().padStart(4, '0')}
        </span>
      </div>

      {/* 动态壁纸运行状态 — 自适应宽度 */}
      {activeVideoWallpaper && (
        <button
          onClick={handleStopVideo}
          disabled={stopping}
          className="hud-livebar disabled:opacity-60 min-w-0 flex-1 basis-[160px] max-w-full lg:max-w-[280px] lg:flex-none"
          title={`点击停止：${activeVideoWallpaper.title}`}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-magenta opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-cyan shadow-[0_0_10px_rgba(0,255,225,0.9)]" />
          </span>
          <span className="text-[11px] font-mono-tabular text-neon-cyan tracking-wider shrink-0">
            LIVE
          </span>
          <span className="w-px h-4 bg-neon-cyan/30 shrink-0" />
          <span className="livebar-title text-sm font-semibold">
            {activeVideoWallpaper.title}
          </span>
          <span className="text-xs text-neon-magenta font-semibold tracking-wider hover:text-white transition-colors shrink-0">
            ■ STOP
          </span>
        </button>
      )}
    </div>
  )
}

export default Toolbar
