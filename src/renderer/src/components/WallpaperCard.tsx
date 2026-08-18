import { useState } from 'react'
import type { Wallpaper } from '@shared/types'
import { useAppStore } from '@renderer/store/useAppStore'
import WallpaperThumb from './WallpaperThumb'

interface WallpaperCardProps {
  wallpaper: Wallpaper
  viewMode?: 'grid' | 'list'
}

const formatDuration = (sec?: number): string => {
  if (!sec) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

/** 四角 HUD 装饰（用 JSX 元素避免复杂伪元素冲突） */
const HudCorners = (): JSX.Element => (
  <>
    <span className="c tl" />
    <span className="c tr" />
    <span className="c bl" />
    <span className="c br" />
  </>
)

const WallpaperCard = ({ wallpaper, viewMode = 'grid' }: WallpaperCardProps): JSX.Element => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const {
    toggleFavorite,
    isFavorite,
    setPreviewWallpaper,
    isCurrentWallpaper,
    removeLocalWallpaper,
    setActiveVideoWallpaper
  } = useAppStore()
  const favorited = isFavorite(wallpaper.id)
  const isVideo = wallpaper.kind === 'video'
  const isRunning = isCurrentWallpaper(wallpaper.id)

  const handlePreview = (): void => {
    setPreviewWallpaper(wallpaper)
  }

  const handleFavorite = (e: React.MouseEvent): void => {
    e.stopPropagation()
    toggleFavorite(wallpaper.id)
  }

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (!window.confirm(`确定删除「${wallpaper.title}」？\n将从程序库中移除该文件。`)) return
    if (isRunning) {
      await window.api?.stopVideoWallpaper?.()
      setActiveVideoWallpaper(null)
    }
    const filePath = wallpaper.localPath || wallpaper.localVideoPath
    if (filePath) {
      await window.api?.deleteLibraryFile?.(filePath)
    }
    removeLocalWallpaper(wallpaper.id)
  }

  // ---------- 列表视图 ----------
  if (viewMode === 'list') {
    return (
      <div
        onClick={handlePreview}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`wallpaper-card hud-brackets group cursor-pointer flex gap-4 p-3 ${
          isRunning ? 'active' : ''
        }`}
      >
        <HudCorners />

        <div
          className="w-52 h-32 flex-shrink-0 relative overflow-hidden border border-neon-cyan/20"
          style={{
            clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'
          }}
        >
          {!isLoaded && <div className="absolute inset-0 image-skeleton" />}
          <WallpaperThumb
            wallpaper={wallpaper}
            onLoaded={() => setIsLoaded(true)}
            className="w-full h-full object-cover transition-opacity duration-500"
          />

          {/* 悬停霓虹扫描光 */}
          {isHovered && <div className="absolute inset-0 scan-sweep pointer-events-none" />}

          {/* 类型 & 时长 */}
          {isVideo && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 border border-neon-cyan/50 bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono-tabular"
                 style={{ clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)' }}>
              <svg className="w-3 h-3 text-neon-cyan" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="text-neon-cyan tracking-wider">{formatDuration(wallpaper.durationSec) || 'VIDEO'}</span>
            </div>
          )}

          {/* 正在播放徽章 */}
          {isRunning && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-neon-cyan text-[#021218] text-[11px] font-extrabold tracking-widest flex items-center gap-1"
                 style={{
                   clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                   boxShadow: '0 0 14px rgba(0,255,225,0.8)'
                 }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-magenta opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#021218]" />
              </span>
              LIVE
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
          <div>
            <h3 className="text-white font-semibold text-[15px] mb-2 line-clamp-1 flex items-center gap-2 font-[Chakra_Petch] tracking-wide">
              {isVideo && (
                <span className="data-chip magenta !text-[10px] !py-[2px] !px-2">
                  动态
                </span>
              )}
              {wallpaper.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-dark-200/80 font-mono-tabular tracking-wider">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-neon-cyan/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-neon-cyan/90">{wallpaper.resolution}</span>
              </span>
              {wallpaper.author && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-neon-violet/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-neon-violet/90">@{wallpaper.author}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {wallpaper.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="hud-tag !py-[3px] !px-2.5 !text-[11px]">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className={`flex items-center gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={handleFavorite}
              className={`btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 ${favorited ? '!border-neon-magenta/50 !text-neon-magenta' : ''}`}
            >
              <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favorited ? '已收藏' : '收藏'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handlePreview() }}
              className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              预览详情
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 !border-neon-red/40 !text-neon-red hover:!bg-neon-red/15"
              title="从列表移除"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              移除
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- 网格视图 ----------
  return (
    <div
      onClick={handlePreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`wallpaper-card hud-brackets group relative cursor-pointer ${
        isRunning ? 'active' : ''
      }`}
    >
      <HudCorners />

      <div className="aspect-[16/10] relative overflow-hidden">
        {!isLoaded && <div className="absolute inset-0 image-skeleton" />}
        <WallpaperThumb
          wallpaper={wallpaper}
          onLoaded={() => setIsLoaded(true)}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.04]"
        />

        {/* 悬停霓虹扫描光 */}
        {isHovered && <div className="absolute inset-0 scan-sweep pointer-events-none" />}

        {/* 左上：分辨率 */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="data-chip !py-[3px] !px-2 !text-[10px]">
            {wallpaper.resolution}
          </span>
          {isVideo && (
            <span className="data-chip magenta !py-[3px] !px-2 !text-[10px] flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              动态
            </span>
          )}
        </div>

        {/* 右上：正在播放徽章 */}
        {isRunning ? (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-neon-cyan text-[#021218] text-[10px] font-extrabold tracking-widest flex items-center gap-1 z-10"
               style={{
                 clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                 boxShadow: '0 0 14px rgba(0,255,225,0.85), 0 0 26px rgba(255,45,149,0.45)'
               }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-magenta opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#021218]" />
            </span>
            LIVE
          </div>
        ) : (
          <div className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 transition-all duration-200 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
            <button
              onClick={handleDelete}
              className="w-8 h-8 flex items-center justify-center border border-neon-red/50 bg-black/70 backdrop-blur-sm text-neon-red hover:bg-neon-red hover:text-white transition-all"
              style={{
                clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)'
              }}
              title="从列表移除"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={handleFavorite}
              className={`w-8 h-8 flex items-center justify-center border backdrop-blur-sm transition-all ${
                favorited
                  ? 'bg-neon-magenta text-white border-neon-magenta shadow-[0_0_12px_rgba(255,45,149,0.85)]'
                  : 'bg-black/70 text-white border-neon-cyan/40 hover:border-neon-magenta/70 hover:text-neon-magenta'
              }`}
              style={{
                clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)'
              }}
              title={favorited ? '取消收藏' : '收藏'}
            >
              <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* 右下：时长 */}
        {isVideo && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-1 border border-neon-cyan/50 bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono-tabular tracking-wider z-10"
               style={{
                 clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)'
               }}>
            <span className="text-neon-cyan">{formatDuration(wallpaper.durationSec) || 'VIDEO'}</span>
          </div>
        )}

        {/* 底部悬停遮罩 + 信息 */}
        <div className={`card-overlay absolute inset-0 transition-all duration-350 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className="absolute inset-x-0 bottom-0 p-3.5 pointer-events-auto"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,12,22,0.75) 40%, rgba(0,6,14,0.96) 100%)'
            }}
          >
            {/* HUD 分隔线 */}
            <div className="hud-divider mb-2.5" />

            <h3 className="text-white font-semibold text-[14px] mb-2 line-clamp-1 font-[Chakra_Petch] tracking-wide flex items-center gap-1.5">
              {wallpaper.title}
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular">
                {wallpaper.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="hud-tag !py-[2px] !px-2 !text-[10px] !tracking-normal">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(e) }}
                  className="w-8 h-8 flex items-center justify-center border border-neon-red/50 bg-black/50 text-neon-red hover:bg-neon-red hover:text-white backdrop-blur-sm transition-all"
                  style={{
                    clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)'
                  }}
                  title="从列表移除"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFavorite(e) }}
                  className={`w-8 h-8 flex items-center justify-center border backdrop-blur-sm transition-all ${
                    favorited
                      ? 'bg-neon-magenta text-white border-neon-magenta shadow-[0_0_12px_rgba(255,45,149,0.85)]'
                      : 'bg-black/50 text-white border-neon-cyan/40 hover:border-neon-magenta/70 hover:text-neon-magenta'
                  }`}
                  style={{
                    clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)'
                  }}
                >
                  <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WallpaperCard
