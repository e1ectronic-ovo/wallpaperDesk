import { useEffect, useState } from 'react'
import { useAppStore } from '@renderer/store/useAppStore'
import { Icon } from '@renderer/components/icons'
import type { LibraryTab } from '@shared/types'
import { extractFrameForLocalVideo, dataUrlToJpegBase64 } from '@renderer/utils/videoThumb'

interface TabItem {
  key: LibraryTab
  name: string
  icon: 'all' | 'import-image' | 'import-video' | 'favorites'
}

const TABS: TabItem[] = [
  { key: 'all', name: '全部资源', icon: 'all' },
  { key: 'images', name: '图片库', icon: 'import-image' },
  { key: 'videos', name: '视频库', icon: 'import-video' },
  { key: 'favorites', name: '我的收藏', icon: 'favorites' }
]

interface SidebarProps {
  onOpenSettings: () => void
  onNavigate?: () => void
}

const Sidebar = ({ onOpenSettings, onNavigate }: SidebarProps): JSX.Element => {
  const {
    activeTab,
    setActiveTab,
    favorites,
    localWallpapers,
    localVideos
  } = useAppStore()
  const [libraryPath, setLibraryPath] = useState('')

  useEffect(() => {
    void window.api?.getLibraryPath?.().then((info) => {
      if (info?.path) setLibraryPath(info.path)
    })
  }, [])

  const getCount = (tab: LibraryTab): number => {
    switch (tab) {
      case 'favorites':
        return favorites.length
      case 'images':
        return localWallpapers.length
      case 'videos':
        return localVideos.length
      default:
        return localWallpapers.length + localVideos.length
    }
  }

  const handleImportLocal = async (): Promise<void> => {
    const result = await window.api?.selectLocalImage()
    if (result && !result.canceled && result.files.length > 0) {
      useAppStore.getState().addLocalWallpapers(result.files)
      setActiveTab('images')
      onNavigate?.()
    }
  }

  const handleImportLocalVideo = async (): Promise<void> => {
    const result = await window.api?.selectLocalVideo()
    if (result && !result.canceled && result.files.length > 0) {
      const before = new Set(useAppStore.getState().localVideos.map((v) => v.id))
      useAppStore.getState().addLocalVideos(result.files)
      setActiveTab('videos')
      onNavigate?.()

      // 异步截取视频某一帧作为封面
      const added = useAppStore.getState().localVideos.filter((v) => !before.has(v.id))
      for (const video of added) {
        const path = video.localVideoPath
        if (!path) continue
        try {
          const dataUrl = await extractFrameForLocalVideo(path)
          const b64 = dataUrlToJpegBase64(dataUrl)
          if (!b64) continue
          const saved = await window.api?.saveVideoThumb?.(path, b64)
          if (saved?.success && saved.thumbPath) {
            useAppStore.getState().updateVideoThumb(video.id, saved.thumbPath)
          }
        } catch (e) {
          console.warn('生成视频封面失败:', video.title, e)
        }
      }
    }
  }

  return (
    <aside className="h-full w-64 flex flex-col hud-corners hud-panel border-0 !rounded-none">
      {/* 品牌头部 */}
      <div className="px-4 pt-5 pb-3 relative">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display font-extrabold text-[17px] tracking-[0.2em] bg-gradient-to-r from-[#00ffe1] via-[#a855f7] to-[#ff2d95] bg-clip-text text-transparent animate-flicker">
            NEON.WALL
          </h1>
          <span className="data-chip !py-[2px]">SYS·READY</span>
        </div>
        <p className="text-[11px] text-dark-200/80 tracking-[0.12em] font-mono-tabular">
          // WALLPAPER.MASTER v1.0
        </p>
      </div>

      <div className="hud-divider mx-4" />

      {/* 导入模块 */}
      <div className="px-4 py-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] font-semibold tracking-[0.22em] text-neon-cyan/80 uppercase font-mono-tabular">
            ▮ DATA INGEST
          </div>
          <span className="text-[10px] text-dark-300/80 font-mono-tabular">
            [{localWallpapers.length + localVideos.length}]
          </span>
        </div>

        <button
          onClick={handleImportLocal}
          className="group w-full relative overflow-hidden flex items-center gap-3 px-3 py-2.5 text-dark-100 hover:text-white border border-dashed border-neon-cyan/30 hover:border-neon-cyan/70 transition-all"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 via-neon-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-neon-cyan/20 to-neon-violet/10 border border-neon-cyan/30 text-neon-cyan shrink-0"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
            <Icon name="import-image" className="w-4 h-4" />
          </span>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold font-sans">导入本地图片</div>
            <div className="text-[10px] text-dark-300 font-mono-tabular tracking-wider">JPG · PNG · WEBP</div>
          </div>
        </button>

        <button
          onClick={handleImportLocalVideo}
          className="group w-full relative overflow-hidden flex items-center gap-3 px-3 py-2.5 text-dark-100 hover:text-white border border-dashed border-neon-magenta/30 hover:border-neon-magenta/70 transition-all"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-neon-magenta/6 via-neon-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-neon-magenta/20 to-neon-violet/15 border border-neon-magenta/35 text-neon-magenta shrink-0"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
            <Icon name="import-video" className="w-4 h-4" />
          </span>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">导入本地视频</div>
            <div className="text-[10px] text-dark-300 font-mono-tabular tracking-wider">MP4 · WEBM · MKV</div>
          </div>
        </button>
      </div>

      <div className="hud-divider mx-4" />

      {/* 分类列表 */}
      <div className="px-3 py-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-2 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.22em] text-neon-cyan/80 uppercase font-mono-tabular">
            ▮ LIBRARY
          </span>
        </div>

        {TABS.map((tab) => {
          const active = activeTab === tab.key
          const count = getCount(tab.key)
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                onNavigate?.()
              }}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 ${active ? 'glow-bullet' : ''}`}
              style={{
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                background: active
                  ? 'linear-gradient(90deg, rgba(0,255,225,0.12), rgba(168,85,247,0.05) 60%, transparent)'
                  : 'transparent',
                border: active
                  ? '1px solid rgba(0,255,225,0.4)'
                  : '1px solid transparent'
              }}
            >
              {/* 激活背景流光 */}
              {active && (
                <span className="absolute inset-0 pointer-events-none opacity-70"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(0,255,225,0.12), transparent)',
                    animation: 'borderFlow 5s linear infinite',
                    backgroundSize: '200% 100%'
                  }}
                />
              )}
              <span
                className={`flex items-center justify-center w-8 h-8 shrink-0 transition-all ${
                  active
                    ? 'bg-gradient-to-br from-neon-cyan/30 to-neon-violet/25 border border-neon-cyan/50 text-neon-cyan shadow-neon-thin'
                    : 'bg-dark-500/60 border border-dark-400/60 text-dark-200 group-hover:border-neon-cyan/40 group-hover:text-neon-cyan/90'
                }`}
                style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
              </span>
              <span className={`flex-1 text-left text-sm font-semibold tracking-wider ${active ? 'text-white' : 'text-dark-100 group-hover:text-white'}`}>
                {tab.name}
              </span>
              {count > 0 && (
                <span className={`data-chip !text-[10px] !px-2 ${tab.key === 'videos' ? 'magenta' : ''}`}>
                  {count.toString().padStart(3, '0')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="hud-divider mx-4" />

      {/* 底部控制 */}
      <div className="px-4 py-4 space-y-3">
        <button
          onClick={onOpenSettings}
          className="w-full group relative flex items-center gap-3 px-3 py-2.5 text-dark-100 hover:text-white transition-all border border-dark-400/70 hover:border-neon-cyan/50"
          style={{ clipPath: 'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)' }}
        >
          <span className="flex items-center justify-center w-8 h-8 bg-dark-500/70 border border-dark-400/70 group-hover:border-neon-cyan/50 group-hover:text-neon-cyan text-dark-200 transition-all shrink-0"
            style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-wider">系统设置</span>
          <span className="ml-auto text-[10px] text-dark-300 font-mono-tabular">[CFG]</span>
        </button>

        <div className="relative overflow-hidden p-3 border border-neon-violet/25 bg-gradient-to-br from-neon-violet/8 via-neon-cyan/5 to-transparent"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-neon-thin animate-hud-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-neon-cyan uppercase font-mono-tabular">
              NOTICE·LOG
            </span>
          </div>
          <p className="text-xs text-dark-100/90 leading-relaxed mb-1">
            关闭主窗口后视频壁纸仍将在后台运行；退出程序会还原系统默认壁纸。
          </p>
          {libraryPath && (
            <div className="mt-2 pt-2 border-t border-neon-cyan/15">
              <div className="text-[9px] text-dark-300 font-mono-tabular tracking-wider uppercase mb-0.5">storage.path</div>
              <p className="text-[10px] text-neon-cyan/70 font-mono-tabular truncate" title={libraryPath}>
                » {libraryPath}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
