import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@renderer/store/useAppStore'
import type { ActiveVideoWallpaper } from '@shared/types'
import { toLocalMediaUrl } from '@shared/media-url'
import { extractVideoFrameDataUrl } from '@renderer/utils/videoThumb'

type ActionStatus = 'idle' | 'applying' | 'success' | 'error'

const formatDuration = (sec?: number): string => {
  if (!sec) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

const WallpaperPreview = (): JSX.Element | null => {
  const {
    previewWallpaper,
    setPreviewWallpaper,
    isFavorite,
    toggleFavorite,
    isCurrentWallpaper,
    setActiveVideoWallpaper,
    activeVideoWallpaper,
    removeLocalWallpaper
  } = useAppStore()

  const wallpaper = previewWallpaper
  const videoElRef = useRef<HTMLVideoElement | null>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle')
  const [actionMessage, setActionMessage] = useState('')

  const [previewMuted, setPreviewMuted] = useState(true)
  const [previewVolume, setPreviewVolume] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)

  const [wallVolume, setWallVolume] = useState(0)
  const [wallMuted, setWallMuted] = useState(true)
  const [wallLoop, setWallLoop] = useState(true)
  const [posterUrl, setPosterUrl] = useState<string | undefined>()

  useEffect(() => {
    setIsLoaded(false)
    setActionStatus('idle')
    setActionMessage('')
    setPreviewMuted(true)
    setPreviewVolume(0)
    setVideoPlaying(false)
    setPosterUrl(undefined)
    if (wallpaper?.kind === 'video') {
      if (activeVideoWallpaper && activeVideoWallpaper.wallpaperId === wallpaper.id) {
        setWallVolume(activeVideoWallpaper.volume)
        setWallMuted(activeVideoWallpaper.muted)
        setWallLoop(activeVideoWallpaper.loop)
      } else {
        setWallVolume(0)
        setWallMuted(true)
        setWallLoop(true)
      }
    }
  }, [wallpaper?.id])

  useEffect(() => {
    if (!wallpaper || wallpaper.kind !== 'video') {
      setPosterUrl(undefined)
      return
    }
    const thumb = wallpaper.thumbUrl || wallpaper.previewUrl
    const looksLikeImage =
      !!thumb &&
      (thumb.startsWith('data:image/') ||
        /\.(jpe?g|png|webp|gif|bmp)(\?|#|$)/i.test(thumb) ||
        thumb.toLowerCase().includes('/thumbs/'))
    if (looksLikeImage) {
      setPosterUrl(thumb)
      return
    }
    const src =
      wallpaper.isLocal && wallpaper.localVideoPath
        ? toLocalMediaUrl(wallpaper.localVideoPath)
        : wallpaper.url
    let canceled = false
    void extractVideoFrameDataUrl(src)
      .then((url) => { if (!canceled) setPosterUrl(url) })
      .catch(() => { if (!canceled) setPosterUrl(undefined) })
    return () => { canceled = true }
  }, [wallpaper?.id, wallpaper?.thumbUrl, wallpaper?.previewUrl, wallpaper?.localVideoPath, wallpaper?.url, wallpaper?.kind, wallpaper?.isLocal])

  useEffect(() => {
    const v = videoElRef.current
    if (!v) return
    v.muted = previewMuted
    v.volume = Math.max(0, Math.min(1, previewVolume))
  }, [previewMuted, previewVolume])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && wallpaper) setPreviewWallpaper(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [wallpaper])

  if (!wallpaper) return null

  const isVideo = wallpaper.kind === 'video'
  const favorited = isFavorite(wallpaper.id)
  const isRunning = isCurrentWallpaper(wallpaper.id)

  const handleClose = (): void => {
    setPreviewWallpaper(null)
  }

  const handleDelete = async (): Promise<void> => {
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
    setPreviewWallpaper(null)
  }

  const handleSetWallpaper = async (): Promise<void> => {
    if (actionStatus === 'applying' || isVideo) return
    const filePath = wallpaper.localPath
    if (!filePath) {
      setActionStatus('error')
      setActionMessage('无效的文件路径')
      return
    }
    try {
      setActionStatus('applying')
      setActionMessage('正在设置壁纸...')
      const result = await window.api?.setWallpaper(filePath)
      if (result?.success) {
        setActionStatus('success')
        setActionMessage('壁纸设置成功！请查看桌面')
      } else {
        setActionStatus('error')
        setActionMessage(result?.error || '设置失败')
      }
    } catch (e) {
      setActionStatus('error')
      setActionMessage((e as Error).message || '设置出错')
    }
  }

  const handleStartVideoWall = async (): Promise<void> => {
    if (actionStatus === 'applying') return
    const localFilePath = wallpaper.localVideoPath || wallpaper.localPath
    if (!localFilePath) {
      setActionStatus('error')
      setActionMessage('无效的视频路径')
      return
    }
    setActionStatus('applying')
    setActionMessage(isRunning ? '正在应用设置...' : '正在启动动态壁纸...')
    try {
      const cfg: ActiveVideoWallpaper = {
        wallpaperId: wallpaper.id,
        videoSrc: toLocalMediaUrl(localFilePath),
        title: wallpaper.title,
        volume: wallVolume,
        muted: wallMuted,
        loop: wallLoop,
        playbackRate: 1
      }
      if (isRunning) {
        const r = await window.api?.updateVideoWallpaper?.({
          volume: cfg.volume,
          muted: cfg.muted,
          loop: cfg.loop,
          playbackRate: 1,
          title: cfg.title
        })
        if (r?.success) {
          setActiveVideoWallpaper({ ...cfg })
          setActionStatus('success')
          setActionMessage('设置已应用')
        } else {
          setActionStatus('error')
          setActionMessage(r?.error || '应用失败')
        }
        return
      }
      const r = await window.api?.startVideoWallpaper?.(cfg)
      if (r?.success) {
        setActiveVideoWallpaper(cfg)
        setActionStatus('success')
        setActionMessage('动态壁纸已启动！若桌面异常请按 Ctrl+Shift+Alt+W 紧急停止')
      } else {
        setActionStatus('error')
        setActionMessage(r?.error || '启动失败')
      }
    } catch (e) {
      setActionStatus('error')
      setActionMessage((e as Error).message || '启动动态壁纸出错')
    }
  }

  const handleStopVideoWall = async (): Promise<void> => {
    try {
      const r = await window.api?.stopVideoWallpaper?.()
      if (r?.success) {
        setActiveVideoWallpaper(null)
        setActionStatus('success')
        setActionMessage('✅ 动态壁纸已停止')
      }
    } catch (e) {
      setActionStatus('error')
      setActionMessage((e as Error).message || '停止失败')
    }
  }

  const handleUpdateVideoWall = async (patch: Partial<ActiveVideoWallpaper>): Promise<void> => {
    if (!activeVideoWallpaper || activeVideoWallpaper.wallpaperId !== wallpaper.id) return
    const r = await window.api?.updateVideoWallpaper?.(patch)
    if (r?.success) {
      setActiveVideoWallpaper({ ...activeVideoWallpaper, ...patch })
    }
  }

  const togglePlayPreview = (): void => {
    const v = videoElRef.current
    if (!v) return
    if (v.paused) { void v.play().catch(() => undefined) } else { v.pause() }
  }

  return (
    <div
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-6 fade-in"
      onClick={handleClose}
    >
      <div
        className="hud-modal animate-in hud-brackets max-w-6xl w-full max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 装饰角 */}
        <span className="c tl" />
        <span className="c tr" />
        <span className="c bl" />
        <span className="c br" />

        {/* ======= 头部 ======= */}
        <div className="relative z-[1] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pl-7 pr-8 pt-6 pb-4 border-b border-neon-cyan/20">
          <div className="hud-divider absolute bottom-[-1px] left-0 right-0 !h-px" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isVideo && (
                <span className="data-chip magenta !text-[11px] !py-[3px] !px-2.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  动态视频
                </span>
              )}
              {isRunning && (
                <span className="data-chip yellow !text-[11px] !py-[3px] !px-2.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2" />
                  </span>
                  LIVE · 正在播放
                </span>
              )}
            </div>
            <h2 className="text-white font-[Orbitron,Chakra_Petch] font-bold text-[16px] sm:text-[18px] tracking-wider line-clamp-2 sm:line-clamp-1 break-all">
              {wallpaper.title}
            </h2>
            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-[12px] font-mono-tabular flex-wrap">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-neon-cyan/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-neon-cyan/95">{wallpaper.resolution}</span>
              </span>
              {isVideo && wallpaper.durationSec && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-neon-magenta/85 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-neon-magenta/95">时长 {formatDuration(wallpaper.durationSec)}</span>
                </span>
              )}
              {wallpaper.author && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <svg className="w-4 h-4 text-neon-violet/85 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-neon-violet/95 truncate">@{wallpaper.author}</span>
                </span>
              )}
              <span className="data-chip !text-[10px] !py-[2px] !px-2">
                ID·{wallpaper.id.toString().slice(-6).toUpperCase()}
              </span>
            </div>
          </div>

          {/* 头部按钮组：固定尺寸，避免挤乱标题 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleFavorite(wallpaper.id)}
              className={`h-9 px-3 btn-secondary !py-0 flex items-center justify-center gap-1.5 ${
                favorited
                  ? '!border-neon-magenta/60 !text-neon-magenta !bg-neon-magenta/12'
                  : ''
              }`}
              title={favorited ? '取消收藏' : '收藏'}
            >
              <svg className="w-4 h-4 shrink-0" fill={favorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm font-medium">{favorited ? '已收藏' : '收藏'}</span>
            </button>
            <button
              onClick={() => void handleDelete()}
              className="h-9 px-3 btn-secondary !py-0 flex items-center justify-center gap-1.5 !border-neon-red/45 !text-neon-red hover:!bg-neon-red/15"
              title="移除"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm font-medium">移除</span>
            </button>
            <button
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center text-neon-cyan/70 hover:text-neon-magenta hover:bg-neon-magenta/10 border border-neon-cyan/25 hover:border-neon-magenta/60 transition-all shrink-0"
              style={{
                clipPath: 'polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)'
              }}
              title="关闭 (Esc)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ======= 预览区 ======= */}
        <div className="flex-1 overflow-hidden bg-dark-800/60 relative min-h-[400px] border-y border-neon-cyan/15">
          {!isLoaded && <div className="absolute inset-0 image-skeleton" />}
          {isVideo ? (
            <>
              <video
                ref={videoElRef}
                src={
                  wallpaper.isLocal && wallpaper.localVideoPath
                    ? toLocalMediaUrl(wallpaper.localVideoPath)
                    : wallpaper.url
                }
                poster={posterUrl}
                muted={previewMuted}
                loop
                playsInline
                preload="metadata"
                autoPlay={false}
                controls={false}
                crossOrigin="anonymous"
                onLoadedData={() => setIsLoaded(true)}
                onCanPlay={() => setIsLoaded(true)}
                onError={() => setIsLoaded(true)}
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onClick={togglePlayPreview}
                className={`w-full h-full object-contain transition-opacity duration-500 cursor-pointer ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {/* 大播放按钮覆盖层 */}
              {!videoPlaying && (
                <button
                  onClick={togglePlayPreview}
                  className="absolute inset-0 flex items-center justify-center group"
                  aria-label="预览播放"
                >
                  <span
                    className="w-24 h-24 flex items-center justify-center text-white group-hover:scale-110 transition-all"
                    style={{
                      clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
                      background: 'linear-gradient(135deg, rgba(0,255,225,0.88), rgba(168,85,247,0.82))',
                      boxShadow: '0 0 40px rgba(0,255,225,0.65), 0 0 80px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.5)'
                    }}
                  >
                    <svg className="w-11 h-11 ml-1 text-[#021218] drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </button>
              )}

              {/* 预览静音控制 */}
              <div
                className="absolute bottom-3 left-3 flex items-center gap-2.5 px-3.5 py-2 text-white text-xs border border-neon-cyan/40"
                style={{
                  clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                  background: 'linear-gradient(90deg, rgba(0,12,22,0.85), rgba(2,6,14,0.92))',
                  boxShadow: 'inset 0 1px 0 rgba(0,255,225,0.2), 0 0 16px -6px rgba(0,255,225,0.45)'
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const next = !previewMuted
                    setPreviewMuted(next)
                    if (!next && previewVolume === 0) setPreviewVolume(0.3)
                  }}
                  className="text-neon-cyan/90 hover:text-white transition-colors"
                  title={previewMuted ? '取消静音' : '静音'}
                >
                  {previewMuted || previewVolume === 0 ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <span className="w-px h-4 bg-neon-cyan/30" />
                <input
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    setPreviewVolume(v)
                    if (v > 0) setPreviewMuted(false)
                  }}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(previewVolume * 100)}
                  className="w-28"
                />
                <span className="text-[10px] w-9 text-right tabular-nums text-neon-cyan/90 font-mono-tabular">
                  {Math.round(previewVolume * 100).toString().padStart(3, '0')}
                </span>
              </div>

              {/* 播放控制 */}
              <div
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 text-white text-xs border border-neon-violet/45"
                style={{
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                  background: 'linear-gradient(90deg, rgba(10,6,28,0.85), rgba(4,2,14,0.92))',
                  boxShadow: 'inset 0 1px 0 rgba(168,85,247,0.25), 0 0 18px -8px rgba(168,85,247,0.55)'
                }}
              >
                <span className="text-[10px] text-neon-violet/90 font-mono-tabular tracking-widest pr-1.5">
                  PREVIEW
                </span>
                <span className="w-px h-4 bg-neon-violet/30" />
                <button
                  onClick={togglePlayPreview}
                  className="p-1.5 text-neon-violet hover:text-white transition-colors"
                  title={videoPlaying ? '暂停' : '播放'}
                >
                  {videoPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          ) : (
            <img
              src={
                wallpaper.isLocal && wallpaper.localPath
                  ? toLocalMediaUrl(wallpaper.localPath)
                  : wallpaper.previewUrl
              }
              alt={wallpaper.title}
              onLoad={() => setIsLoaded(true)}
              onError={() => setIsLoaded(true)}
              referrerPolicy="no-referrer"
              decoding="async"
              loading="eager"
              className={`w-full h-full object-contain transition-opacity duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>

        {/* ======= 标签区 ======= */}
        <div className="px-6 py-3.5 border-b border-neon-cyan/15 flex items-center gap-2 flex-wrap relative">
          <span className="text-[11px] font-mono-tabular text-neon-cyan/80 tracking-[0.2em] mr-1">
            ▮ TAGS
          </span>
          {wallpaper.tags.map((tag) => (
            <span key={tag} className="hud-tag">
              #{tag}
            </span>
          ))}
        </div>

        {/* ======= 视频壁纸配置区 ======= */}
        {isVideo && (
          <div className="px-6 py-4 border-b border-neon-cyan/15 bg-neon-violet/5 relative">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-mono-tabular text-neon-violet/90 tracking-[0.2em]">
                ▮ DESKTOP.CONFIG
              </span>
              <div className="hud-divider flex-1 !h-px" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 桌面音量 */}
              <div className="flex items-center gap-3">
                <label className="text-dark-200/80 text-sm w-24 shrink-0 font-[Chakra_Petch] tracking-wide">
                  桌面音量
                </label>
                <button
                  onClick={() => {
                    const next = !wallMuted
                    setWallMuted(next)
                    handleUpdateVideoWall({ muted: next })
                  }}
                  className="w-9 h-9 flex items-center justify-center border border-neon-cyan/35 text-neon-cyan/85 hover:text-white hover:border-neon-cyan/70 transition-all"
                  style={{
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    background: 'linear-gradient(180deg, rgba(0,255,225,0.08), rgba(0,255,225,0.02))'
                  }}
                  title={wallMuted ? '取消静音' : '静音'}
                >
                  {wallMuted || wallVolume === 0 ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(wallVolume * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    setWallVolume(v)
                    const nextMuted = v === 0 ? true : wallMuted
                    if (v > 0 && wallMuted) setWallMuted(false)
                    handleUpdateVideoWall({ volume: v, muted: nextMuted })
                  }}
                  className="flex-1"
                />
                <span
                  className="inline-flex items-center justify-center min-w-[52px] px-2 h-7 text-neon-cyan font-mono-tabular text-sm border border-neon-cyan/35"
                  style={{
                    clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                    background: 'linear-gradient(90deg, rgba(0,255,225,0.14), rgba(0,255,225,0.03))',
                    textShadow: '0 0 6px rgba(0,255,225,0.7)'
                  }}
                >
                  {Math.round(wallVolume * 100).toString().padStart(3, '0')}
                </span>
              </div>
              {/* 循环开关 */}
              <div className="flex items-center gap-3">
                <label className="text-dark-200/80 text-sm w-24 shrink-0 font-[Chakra_Petch] tracking-wide">
                  循环播放
                </label>
                <button
                  onClick={() => {
                    const next = !wallLoop
                    setWallLoop(next)
                    handleUpdateVideoWall({ loop: next })
                  }}
                  className={`hud-toggle shrink-0 ${wallLoop ? 'on' : ''}`}
                />
                <span className={`text-xs font-mono-tabular tracking-wider ${
                  wallLoop ? 'text-neon-cyan/95' : 'text-dark-300'
                }`}>
                  {wallLoop ? '▶ LOOP.ENABLED' : '■ ONCE.STOP'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======= 操作区 ======= */}
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap relative">
          <div className="hud-divider absolute top-0 left-6 right-6 !h-px" />

          <div className="flex items-center gap-3 min-h-[26px]">
            {actionStatus === 'applying' && (
              <div className="flex items-center gap-2 text-neon-cyan text-sm font-[Chakra_Petch] tracking-wider">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {actionMessage}
              </div>
            )}
            {actionStatus === 'success' && (
              <div className="flex items-center gap-2 text-neon-cyan text-sm font-[Chakra_Petch] tracking-wider">
                <span className="ring-pulse text-neon-cyan" />
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                </svg>
                {actionMessage}
              </div>
            )}
            {actionStatus === 'error' && (
              <div className="flex items-center gap-2 text-neon-red text-sm font-[Chakra_Petch] tracking-wider">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {actionMessage}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isVideo ? (
              <>
                {isRunning ? (
                  <button
                    onClick={handleStopVideoWall}
                    disabled={actionStatus === 'applying'}
                    className="btn-secondary !py-2.5 !px-5 !text-sm !border-neon-magenta/55 !text-neon-magenta hover:!bg-neon-magenta/18 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                    停止动态壁纸
                  </button>
                ) : null}
                <button
                  onClick={handleStartVideoWall}
                  disabled={actionStatus === 'applying'}
                  className="btn-primary !py-2.5 !px-6 !text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {isRunning ? '应用壁纸设置' : '设为动态壁纸'}
                </button>
              </>
            ) : (
              <button
                onClick={handleSetWallpaper}
                disabled={actionStatus === 'applying'}
                className="btn-primary !py-2.5 !px-6 !text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                设为桌面壁纸
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WallpaperPreview
