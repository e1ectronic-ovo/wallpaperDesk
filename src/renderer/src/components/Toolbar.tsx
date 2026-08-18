import { useState } from 'react'
import { useAppStore } from '@renderer/store/useAppStore'
import { RESOLUTIONS, SORT_OPTIONS } from '@shared/data'
import type { LibraryTab } from '@shared/types'

const TAB_LABELS: Record<LibraryTab, string> = {
  all: '全部资源',
  images: '图片',
  videos: '视频',
  favorites: '我的收藏'
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
    <div className="h-16 bg-dark-600/50 backdrop-blur-sm border-b border-dark-500 px-6 flex items-center gap-4 sticky top-0 z-10">
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文件名..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-dark-700 border border-dark-400 text-white placeholder-dark-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm"
          />
        </div>
      </div>

      <select
        value={selectedResolution}
        onChange={(e) => setResolution(e.target.value)}
        className="h-10 px-3 rounded-lg bg-dark-700 border border-dark-400 text-white text-sm focus:outline-none focus:border-primary-500 cursor-pointer hidden md:block"
      >
        {RESOLUTIONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        className="h-10 px-3 rounded-lg bg-dark-700 border border-dark-400 text-white text-sm focus:outline-none focus:border-primary-500 cursor-pointer hidden sm:block"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <div className="flex items-center bg-dark-700 border border-dark-400 rounded-lg p-0.5 hidden sm:flex">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded-md transition-all ${
            viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-dark-300 hover:text-white hover:bg-white/5'
          }`}
          title="网格视图"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded-md transition-all ${
            viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-dark-300 hover:text-white hover:bg-white/5'
          }`}
          title="列表视图"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="h-10 px-4 flex items-center gap-2 bg-dark-700/50 border border-dark-500 rounded-lg">
        <span className="text-dark-300 text-sm">{TAB_LABELS[activeTab]}</span>
        <span className="text-primary-400 font-semibold text-sm">{total}</span>
        <span className="text-dark-300 text-sm">项</span>
      </div>

      {activeVideoWallpaper && (
        <button
          onClick={handleStopVideo}
          disabled={stopping}
          className="h-10 px-3 flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-primary-500/20 border border-cyan-500/40 rounded-lg text-cyan-200 hover:from-cyan-500/30 hover:to-primary-500/30 transition-all disabled:opacity-60"
          title="点击停止当前动态壁纸"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
          <span className="text-sm font-medium max-w-[180px] truncate">
            正在播放: {activeVideoWallpaper.title}
          </span>
          <span className="text-xs">停止</span>
        </button>
      )}
    </div>
  )
}

export default Toolbar
