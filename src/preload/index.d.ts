import type { ActiveVideoWallpaper } from '@shared/types'
import type { AppSettings, VideoWallpaperStatus } from '@shared/settings'

export interface SetWallpaperResult {
  success: boolean
  error?: string
}

export interface SelectImageResult {
  canceled: boolean
  files: string[]
}

export interface StartVideoWallResult {
  success: boolean
  error?: string
}

export interface WallpaperAPI {
  setWallpaper: (filePath: string) => Promise<SetWallpaperResult>
  windowMinimize: () => Promise<void>
  windowToggleMaximize: () => Promise<boolean>
  windowClose: () => Promise<void>
  selectLocalImage: () => Promise<SelectImageResult>
  selectLocalVideo: () => Promise<SelectImageResult>
  deleteLibraryFile: (filePath: string) => Promise<SetWallpaperResult>
  getLibraryPath: () => Promise<{ path: string; isCustom: boolean; defaultPath: string }>
  pickLibraryPath: () => Promise<{
    canceled: boolean
    success?: boolean
    path?: string
    error?: string
    settings?: AppSettings
  }>
  resetLibraryPath: () => Promise<{
    success: boolean
    path?: string
    error?: string
    settings?: AppSettings
  }>
  saveVideoThumb: (
    videoPath: string,
    jpegBase64: string
  ) => Promise<{ success: boolean; thumbPath?: string; error?: string }>
  startVideoWallpaper: (cfg: ActiveVideoWallpaper) => Promise<StartVideoWallResult>
  stopVideoWallpaper: () => Promise<StartVideoWallResult>
  updateVideoWallpaper: (patch: Partial<ActiveVideoWallpaper>) => Promise<StartVideoWallResult>
  getActiveVideoWallpaper: () => Promise<ActiveVideoWallpaper | null>
  getVideoWallpaperStatus: () => Promise<VideoWallpaperStatus>
  getAppSettings: () => Promise<AppSettings>
  setAppSettings: (patch: Partial<AppSettings>) => Promise<{ success: boolean; settings?: AppSettings; error?: string }>
  onVideoWallEvent: (listener: (payload: unknown) => void) => () => void
}

declare global {
  interface Window {
    api: WallpaperAPI
  }
}

export {}
