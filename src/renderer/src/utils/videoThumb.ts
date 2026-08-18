import { toLocalMediaUrl } from '@shared/media-url'

const memoryCache = new Map<string, string>()

/**
 * 从本地视频截取一帧为 JPEG data URL。
 * 默认取约第 1 秒（或时长的 10%，取较小者）。
 */
export function extractVideoFrameDataUrl(
  videoSrc: string,
  options?: { seekSec?: number; maxWidth?: number; quality?: number }
): Promise<string> {
  const cached = memoryCache.get(videoSrc)
  if (cached) return Promise.resolve(cached)

  const seekSec = options?.seekSec
  const maxWidth = options?.maxWidth ?? 640
  const quality = options?.quality ?? 0.82

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'

    let settled = false
    const fail = (err: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const cleanup = (): void => {
      video.removeAttribute('src')
      try {
        video.load()
      } catch {
        /* ignore */
      }
      video.remove()
    }

    const capture = (): void => {
      if (settled) return
      try {
        const vw = video.videoWidth || 0
        const vh = video.videoHeight || 0
        if (!vw || !vh) {
          fail(new Error('无法读取视频尺寸'))
          return
        }

        const scale = Math.min(1, maxWidth / vw)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(vw * scale))
        canvas.height = Math.max(1, Math.round(vh * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          fail(new Error('Canvas 不可用'))
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        memoryCache.set(videoSrc, dataUrl)
        settled = true
        cleanup()
        resolve(dataUrl)
      } catch (e) {
        fail(e as Error)
      }
    }

    video.addEventListener('error', () => fail(new Error('视频加载失败')))
    video.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const target =
        typeof seekSec === 'number'
          ? seekSec
          : Math.min(1, duration > 0 ? duration * 0.1 : 0.1)
      const safeTarget =
        duration > 0 ? Math.min(Math.max(0.05, target), Math.max(0.05, duration - 0.05)) : 0.1

      const onSeeked = (): void => {
        video.removeEventListener('seeked', onSeeked)
        // 稍等一帧确保画面就绪
        requestAnimationFrame(() => capture())
      }
      video.addEventListener('seeked', onSeeked)

      try {
        video.currentTime = safeTarget
      } catch {
        // 部分格式不支持 seek，退回当前帧
        capture()
      }
    })

    video.src = videoSrc
  })
}

export function dataUrlToJpegBase64(dataUrl: string): string | null {
  const m = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/)
  return m ? m[1] : null
}

/** 为视频路径生成可持久化的封面图（data URL） */
export async function extractFrameForLocalVideo(localVideoPath: string): Promise<string> {
  return extractVideoFrameDataUrl(toLocalMediaUrl(localVideoPath))
}
