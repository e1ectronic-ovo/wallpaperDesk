export interface AppSettings {
  /** 开机自启动 */
  launchAtLogin: boolean
  /** 启动时恢复上次动态壁纸 */
  restoreVideoWallpaperOnStart: boolean
  /**
   * 壁纸库目录（导入的图片/视频存放处）。
   * 空字符串表示使用默认目录（userData/library）。
   */
  libraryPath: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  launchAtLogin: false,
  restoreVideoWallpaperOnStart: true,
  libraryPath: ''
}

export interface VideoWallpaperStatus {
  running: boolean
  wallpaper: import('./types').ActiveVideoWallpaper | null
}
