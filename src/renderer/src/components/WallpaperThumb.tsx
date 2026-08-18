import { useEffect, useState } from 'react'
import type { Wallpaper } from '@shared/types'
import { toLocalMediaUrl } from '@shared/media-url'
import { extractVideoFrameDataUrl } from '@renderer/utils/videoThumb'

interface WallpaperThumbProps {
  wallpaper: Wallpaper
  className?: string
  onLoaded?: () => void
}

function isImageThumbUrl(url?: string): boolean {
  if (!url) return false
  if (url.startsWith('data:image/')) return true
  const lower = url.toLowerCase()
  return /\.(jpe?g|png|webp|gif|bmp)(\?|#|$)/.test(lower) || lower.includes('/thumbs/')
}

const WallpaperThumb = ({ wallpaper, className = '', onLoaded }: WallpaperThumbProps): JSX.Element => {
  const [loaded, setLoaded] = useState(false)
  const [frameUrl, setFrameUrl] = useState<string | null>(null)

  const handleLoad = (): void => {
    setLoaded(true)
    onLoaded?.()
  }

  const localVideoSrc =
    wallpaper.isLocal && wallpaper.localVideoPath ? toLocalMediaUrl(wallpaper.localVideoPath) : null

  const persistedThumb =
    isImageThumbUrl(wallpaper.thumbUrl) || isImageThumbUrl(wallpaper.previewUrl)
      ? wallpaper.thumbUrl?.startsWith('data:') || isImageThumbUrl(wallpaper.thumbUrl)
        ? wallpaper.thumbUrl
        : wallpaper.previewUrl && isImageThumbUrl(wallpaper.previewUrl)
          ? wallpaper.previewUrl
          : wallpaper.thumbUrl
      : null

  useEffect(() => {
    if (wallpaper.kind !== 'video' || !localVideoSrc) return
    if (persistedThumb && isImageThumbUrl(persistedThumb)) {
      setFrameUrl(persistedThumb)
      return
    }

    let canceled = false
    setFrameUrl(null)
    void extractVideoFrameDataUrl(localVideoSrc)
      .then((url) => {
        if (!canceled) setFrameUrl(url)
      })
      .catch(() => {
        if (!canceled) setFrameUrl(null)
      })

    return () => {
      canceled = true
    }
  }, [wallpaper.kind, wallpaper.id, localVideoSrc, persistedThumb])

  if (wallpaper.kind === 'video') {
    if (frameUrl) {
      return (
        <img
          src={frameUrl}
          alt={wallpaper.title}
          onLoad={handleLoad}
          onError={handleLoad}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )
    }

    // 截帧前短暂用 video 占位（通常很快被替换）
    if (localVideoSrc) {
      return (
        <video
          src={localVideoSrc}
          muted
          playsInline
          preload="metadata"
          onLoadedData={handleLoad}
          onError={handleLoad}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )
    }
  }

  const imgSrc =
    wallpaper.isLocal && wallpaper.localPath && wallpaper.kind === 'image'
      ? toLocalMediaUrl(wallpaper.localPath)
      : wallpaper.thumbUrl

  return (
    <img
      src={imgSrc}
      alt={wallpaper.title}
      onLoad={handleLoad}
      onError={handleLoad}
      loading="lazy"
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}

export default WallpaperThumb
