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

  if (viewMode === 'list') {
    return (
      <div
        onClick={handlePreview}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="wallpaper-card group bg-dark-600 rounded-xl overflow-hidden cursor-pointer flex gap-4 p-3 border border-dark-500 hover:border-primary-500/50"
      >
        <div className="w-48 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-dark-700 relative">
          {!isLoaded && <div className="absolute inset-0 image-skeleton" />}
          <WallpaperThumb
            wallpaper={wallpaper}
            onLoaded={() => setIsLoaded(true)}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
          {isVideo && (
            <div className="absolute bottom-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {formatDuration(wallpaper.durationSec)}
            </div>
          )}
          {isRunning && (
            <div className="absolute top-1 left-1 px-2 py-0.5 rounded-full bg-cyan-500 text-white text-[10px] font-semibold shadow-lg">
              ⏸ 正在播放
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <h3 className="text-white font-semibold text-base mb-2 line-clamp-1 flex items-center gap-2">
              {isVideo && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-500/30">
                  动态
                </span>
              )}
              {wallpaper.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-dark-300">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {wallpaper.resolution}
              </span>
              {wallpaper.author && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {wallpaper.author}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {wallpaper.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-dark-500 text-dark-200 text-xs rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2" style={{ opacity: isHovered ? 1 : 0 }}>
            <button
              onClick={handleFavorite}
              className={`btn-ghost text-sm !p-2 flex items-center gap-1.5 ${favorited ? '!text-red-400' : ''}`}
            >
              <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {favorited ? '已收藏' : '收藏'}
            </button>
            <button className="btn-primary text-sm !py-2 !px-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              预览
            </button>
            <button
              onClick={handleDelete}
              className="btn-ghost text-sm !p-2 flex items-center gap-1.5 text-red-400 hover:!text-red-300"
              title="从列表移除"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              移除
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handlePreview}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="wallpaper-card group relative rounded-xl overflow-hidden cursor-pointer bg-dark-700 border border-dark-500 hover:border-primary-500/50"
    >
      <div className="aspect-[16/10] relative">
        {!isLoaded && <div className="absolute inset-0 image-skeleton" />}
        <WallpaperThumb
          wallpaper={wallpaper}
          onLoaded={() => setIsLoaded(true)}
          className="w-full h-full object-cover transition-opacity duration-500"
        />

        {/* 分辨率标签 */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-xs text-white font-medium">
            {wallpaper.resolution}
          </span>
          {isVideo && (
            <span className="px-2 py-1 bg-cyan-500/90 backdrop-blur-sm rounded-md text-xs text-white font-semibold shadow-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              动态
            </span>
          )}
        </div>

        {/* 时长 (仅视频) */}
        {isVideo && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium">
            {formatDuration(wallpaper.durationSec) || 'VIDEO'}
          </div>
        )}

        {/* 当前正在播放的动态壁纸 */}
        {isRunning && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-cyan-500 text-white text-xs font-bold shadow-lg flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            正在播放
          </div>
        )}

        {/* 删除 + 收藏 */}
        {!isRunning && (
          <>
            <button
              onClick={handleDelete}
              className={`absolute top-2 right-12 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 bg-black/60 text-red-300 hover:bg-red-500/80 hover:text-white backdrop-blur-sm ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              title="从列表移除"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={handleFavorite}
              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
                favorited
                  ? 'bg-red-500 text-white'
                  : isHovered
                    ? 'bg-black/60 text-white backdrop-blur-sm'
                    : 'opacity-0'
              }`}
            >
              <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </>
        )}

        {/* 悬停遮罩 */}
        <div
          className={`card-overlay absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-semibold text-sm mb-2 line-clamp-1 flex items-center gap-1.5">
              {wallpaper.title}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-100">
                {wallpaper.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-white/10 rounded-full backdrop-blur-sm">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(e)
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 text-red-300 hover:bg-red-500/40 backdrop-blur-sm"
                  title="从列表移除"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFavorite(e)
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    favorited
                      ? 'bg-red-500 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  }`}
                >
                  <svg className="w-4 h-4" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
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
