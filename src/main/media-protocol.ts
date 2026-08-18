import { protocol } from 'electron'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { toLocalMediaUrl } from '@shared/media-url'

const SCHEME = 'wallpaper-media'

export function registerMediaProtocolSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        bypassCSP: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true
      }
    }
  ])
}

export function registerMediaProtocolHandlers(): void {
  protocol.registerFileProtocol(SCHEME, (request, callback) => {
    try {
      const raw = request.url.replace(`${SCHEME}://file/`, '')
      const decoded = decodeURIComponent(raw)
      const filePath = path.normalize(decoded)
      callback({ path: filePath })
    } catch (e) {
      console.warn('[media] 解析失败:', request.url, (e as Error).message)
      callback({ error: -2 })
    }
  })
}

export function toPlayableMediaUrl(src: string): string {
  const trimmed = src.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith(`${SCHEME}://`)) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('file://')) {
    try {
      return toLocalMediaUrl(fileURLToPath(trimmed))
    } catch {
      return trimmed
    }
  }
  return toLocalMediaUrl(trimmed)
}

export function fromMediaPath(url: string): string | null {
  if (!url.startsWith(`${SCHEME}://file/`)) return null
  try {
    const raw = url.replace(`${SCHEME}://file/`, '')
    return path.normalize(decodeURIComponent(raw))
  } catch {
    return null
  }
}

export { toLocalMediaUrl }
