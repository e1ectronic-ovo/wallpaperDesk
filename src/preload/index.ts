import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ActiveVideoWallpaper } from '@shared/types'
import type { AppSettings, VideoWallpaperStatus } from '@shared/settings'

interface OpenDialogResult {
  canceled: boolean
  files: string[]
}

const api = {
  setWallpaper: (filePath: string) => ipcRenderer.invoke('set-wallpaper', filePath),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  selectLocalImage: (): Promise<OpenDialogResult> => ipcRenderer.invoke('select-local-image'),
  selectLocalVideo: (): Promise<OpenDialogResult> => ipcRenderer.invoke('select-local-video'),
  deleteLibraryFile: (filePath: string) => ipcRenderer.invoke('delete-library-file', filePath),
  getLibraryPath: (): Promise<{ path: string; isCustom: boolean; defaultPath: string }> =>
    ipcRenderer.invoke('get-library-path'),
  pickLibraryPath: () => ipcRenderer.invoke('pick-library-path'),
  resetLibraryPath: () => ipcRenderer.invoke('reset-library-path'),
  saveVideoThumb: (videoPath: string, jpegBase64: string) =>
    ipcRenderer.invoke('save-video-thumb', { videoPath, jpegBase64 }),
  startVideoWallpaper: (cfg: ActiveVideoWallpaper) =>
    ipcRenderer.invoke('start-video-wallpaper', cfg),
  stopVideoWallpaper: () => ipcRenderer.invoke('stop-video-wallpaper'),
  updateVideoWallpaper: (patch: Partial<ActiveVideoWallpaper>) =>
    ipcRenderer.invoke('update-video-wallpaper', patch),
  getActiveVideoWallpaper: (): Promise<ActiveVideoWallpaper | null> =>
    ipcRenderer.invoke('get-active-video-wallpaper'),
  getVideoWallpaperStatus: (): Promise<VideoWallpaperStatus> =>
    ipcRenderer.invoke('get-video-wallpaper-status'),
  getAppSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-app-settings'),
  setAppSettings: (patch: Partial<AppSettings>) => ipcRenderer.invoke('set-app-settings', patch),
  onVideoWallEvent: (listener: (payload: unknown) => void): (() => void) => {
    const handler = (_ev: Electron.IpcRendererEvent, payload: unknown): void => listener(payload)
    ipcRenderer.on('videowall:event', handler)
    return () => ipcRenderer.removeListener('videowall:event', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
