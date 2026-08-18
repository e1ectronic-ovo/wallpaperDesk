import { app, shell, BrowserWindow, ipcMain, dialog, screen, globalShortcut, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import * as path from 'path'
import type { ActiveVideoWallpaper } from '@shared/types'
import { attachWindowToDesktop, detachWindowFromDesktop, resizeAttachedWindow, hideAttachedWindow } from './desktop-attach'
import {
  registerMediaProtocolHandlers,
  registerMediaProtocolSchemes,
  toPlayableMediaUrl,
  fromMediaPath
} from './media-protocol'
import {
  importManyToLibrary,
  deleteFromLibrary,
  getLibraryRoot,
  getDefaultLibraryRoot,
  ensureLibraryDirs,
  saveVideoThumbJpeg,
  setCustomLibraryRoot,
  prepareLibraryRoot
} from './media-library'
import { setWallpaperAllDisplays, refreshDesktopPaint } from './wallpaper-win'
import {
  loadAppSettings,
  saveAppSettings,
  applyLaunchAtLogin
} from './settings-store'
import type { AppSettings } from '@shared/settings'
import { DEFAULT_APP_SETTINGS } from '@shared/settings'

registerMediaProtocolSchemes()

// wallpaper@7+ 是 ESM-only 模块，不能用 require() 在 CJS 里加载。
// 为避免 IPC 处理函数内动态 import() 导致 Windows 死锁，
// 在 app.whenReady() 时统一用 import('wallpaper') 异步加载一次。
let setWallpaperFn: ((p: string, options?: { scale?: string }) => Promise<void>) | null = null
let getWallpaperFn: (() => Promise<string>) | null = null

async function loadWallpaperModule(): Promise<void> {
  try {
    const wallpaperMod = (await import('wallpaper')) as unknown as {
      setWallpaper?: (p: string) => Promise<void>
      getWallpaper?: () => Promise<string>
      default?: {
        setWallpaper?: (p: string) => Promise<void>
        getWallpaper?: () => Promise<string>
      }
    }
    setWallpaperFn = wallpaperMod?.setWallpaper || wallpaperMod?.default?.setWallpaper || null
    getWallpaperFn = wallpaperMod?.getWallpaper || wallpaperMod?.default?.getWallpaper || null
    if (setWallpaperFn) {
      console.log('[wallpaper] module loaded via dynamic import()')
    }
  } catch (e) {
    console.warn(
      '[wallpaper] module load failed (ESM dynamic import), fallback to native method:',
      (e as Error).message
    )
  }
}

let mainWindow: BrowserWindow | null = null
/** 每个显示器一个视频壁纸窗口（各自独立铺满，非跨屏拼接） */
let videoWallWindows: BrowserWindow[] = []
const videoWallByDisplayId = new Map<number, BrowserWindow>()
/** 当前激活的视频壁纸配置 */
let activeVideoWallpaper: ActiveVideoWallpaper | null = null
/** 已成功挂载到桌面的视频窗口数量 */
let videoWallAttachedCount = 0
let expectedVideoWallCount = 0
/** 系统托盘 */
let tray: Tray | null = null
/** 是否正在退出（区分关闭窗口与真正退出） */
let isQuitting = false
/** 视频壁纸播放超时检测 */
let videoWallPlayTimer: ReturnType<typeof setTimeout> | null = null
let videoWallStartResolver: ((r: { success: boolean; error?: string }) => void) | null = null
/** 桌面挂载成功后才向渲染页推送配置 */
let videoWallDesktopReady = false
let pendingVideoWallConfig: ActiveVideoWallpaper | null = null
/** 上次设置的静态壁纸路径，停止动态壁纸后用于恢复桌面 */
let lastStaticWallpaperPath: string | null = null
let appSettings: AppSettings = { ...DEFAULT_APP_SETTINGS }

function isVideoWallpaperRunning(): boolean {
  return (
    videoWallDesktopReady &&
    videoWallWindows.some((w) => w && !w.isDestroyed())
  )
}

function getLastStaticWallpaperPath(): string {
  return path.join(app.getPath('userData'), 'last-static-wallpaper.json')
}

function loadLastStaticWallpaper(): void {
  try {
    const p = getLastStaticWallpaperPath()
    if (!fs.existsSync(p)) return
    const obj = JSON.parse(fs.readFileSync(p, 'utf8')) as { path?: string }
    if (obj?.path && fs.existsSync(obj.path)) {
      lastStaticWallpaperPath = obj.path
    }
  } catch {
    /* ignore */
  }
}

function saveLastStaticWallpaper(filePath: string): void {
  lastStaticWallpaperPath = filePath
  try {
    fs.writeFileSync(
      getLastStaticWallpaperPath(),
      JSON.stringify({ path: filePath }, null, 2),
      'utf8'
    )
  } catch (e) {
    console.warn('保存静态壁纸记录失败:', (e as Error).message)
  }
}

async function captureCurrentSystemWallpaper(): Promise<string | null> {
  try {
    if (getWallpaperFn) {
      const p = await getWallpaperFn()
      if (p && typeof p === 'string' && fs.existsSync(p)) return p
    }
  } catch (e) {
    console.warn('[wallpaper] getWallpaper 失败:', (e as Error).message)
  }

  // 回退：读注册表当前壁纸路径
  try {
    const { execFile } = require('child_process') as typeof import('child_process')
    const { promisify } = require('util') as typeof import('util')
    const execFileAsync = promisify(execFile)
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "(Get-ItemProperty -Path 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper).Wallpaper"
      ],
      { timeout: 8000, windowsHide: true }
    )
    const p = String(stdout || '').trim()
    if (p && fs.existsSync(p)) return p
  } catch (e) {
    console.warn('[wallpaper] 读取注册表壁纸失败:', (e as Error).message)
  }
  return null
}

/** 启动动态壁纸前记住当前桌面图，退出/停止时才能恢复，避免黑屏 */
async function ensureRememberedSystemWallpaper(): Promise<void> {
  if (lastStaticWallpaperPath && fs.existsSync(lastStaticWallpaperPath)) return
  const current = await captureCurrentSystemWallpaper()
  if (current) {
    // 复制一份到 userData，避免系统临时壁纸路径失效
    try {
      const backupDir = path.join(app.getPath('userData'), 'wallpaper-backup')
      fs.mkdirSync(backupDir, { recursive: true })
      const ext = path.extname(current) || '.jpg'
      const backup = path.join(backupDir, `desktop-backup${ext}`)
      fs.copyFileSync(current, backup)
      saveLastStaticWallpaper(backup)
      console.log('[wallpaper] 已备份当前桌面壁纸:', backup)
      return
    } catch (e) {
      console.warn('[wallpaper] 备份桌面壁纸失败，使用原路径:', (e as Error).message)
      saveLastStaticWallpaper(current)
    }
  }
}

async function restoreStaticWallpaperAfterVideoStop(): Promise<void> {
  try {
    if (lastStaticWallpaperPath && fs.existsSync(lastStaticWallpaperPath)) {
      await setWallpaperAllDisplays(lastStaticWallpaperPath)
      console.log('[wallpaper] 已恢复静态壁纸')
      return
    }
    // 没有备份时尽量刷新桌面；仍可能偏黑，但比残留 WorkerW 子窗口好
    await refreshDesktopPaint()
    console.log('[wallpaper] 已刷新桌面绘制（无备份壁纸）')
  } catch (e) {
    console.warn('[wallpaper] 恢复桌面失败:', (e as Error).message)
  }
}

function clearVideoWallPlayTimer(): void {
  if (videoWallPlayTimer) {
    clearTimeout(videoWallPlayTimer)
    videoWallPlayTimer = null
  }
}

function updateTrayMenu(): void {
  if (!tray) return
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '显示主窗口',
      click: () => showMainWindow()
    },
    { type: 'separator' },
    ...(isVideoWallpaperRunning()
      ? [
          {
            label: '停止动态壁纸',
            click: () =>
              void stopVideoWallpaperInternal('已从托盘停止动态壁纸', { showMain: false })
          } as Electron.MenuItemConstructorOptions,
          { type: 'separator' as const }
        ]
      : []),
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ]
  tray.setContextMenu(Menu.buildFromTemplate(template))
}

function createTray(): void {
  const appIcon = getAppIcon()
  if (!appIcon || tray) return
  const trayIcon = appIcon.isEmpty() ? appIcon : appIcon.resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('画境')
  updateTrayMenu()
  tray.on('double-click', () => showMainWindow())
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function notifyRendererVideoWallEvent(payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('videowall:event', payload)
  }
}

function stopVideoWallpaperInternal(reason?: string, opts?: { showMain?: boolean }): void {
  clearVideoWallPlayTimer()
  if (videoWallStartResolver) {
    videoWallStartResolver({ success: false, error: reason || '动态壁纸已停止' })
    videoWallStartResolver = null
  }
  destroyVideoWallWindow()
  activeVideoWallpaper = null
  saveActiveVideoWallpaper()
  updateTrayMenu()
  void restoreStaticWallpaperAfterVideoStop()
  notifyRendererVideoWallEvent({ type: 'stopped', message: reason || '动态壁纸已停止' })
  if (opts?.showMain !== false && mainWindow && !mainWindow.isDestroyed()) {
    showMainWindow()
  }
}

function normalizeVideoSrc(src: string): string {
  return toPlayableMediaUrl(src)
}

function waitForVideoWallStart(timeoutMs = 35000): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (videoWallStartResolver) {
      videoWallStartResolver({ success: false, error: '已有启动任务进行中' })
    }
    const timer = setTimeout(() => {
      videoWallStartResolver = null
      resolve({ success: false, error: '动态壁纸启动超时，请换本地小视频重试' })
    }, timeoutMs)
    videoWallStartResolver = (result) => {
      clearTimeout(timer)
      videoWallStartResolver = null
      resolve(result)
    }
  })
}

function handleVideoWallEvent(payload: unknown): void {
  const evt = payload as { type?: string; message?: string }
  if (!evt?.type) return

  if (evt.type === 'playing') {
    clearVideoWallPlayTimer()
    if (videoWallStartResolver) {
      videoWallStartResolver({ success: true })
    }
    updateTrayMenu()
    notifyRendererVideoWallEvent({
      type: 'playing',
      wallpaper: activeVideoWallpaper
    })
    return
  }

  if (evt.type === 'attach-failed' || evt.type === 'error' || evt.type === 'fatal-error') {
    const msg = evt.message || '视频无法播放'
    console.warn('[videowall] 失败:', msg)
    if (videoWallStartResolver) {
      videoWallStartResolver({ success: false, error: msg })
      videoWallStartResolver = null
    }
    stopVideoWallpaperInternal(`动态壁纸失败：${msg}`)
  }
}

function scheduleVideoWallPlayTimeout(): void {
  clearVideoWallPlayTimer()
  videoWallPlayTimer = setTimeout(() => {
    console.warn('[videowall] 播放超时，自动停止')
    stopVideoWallpaperInternal('动态壁纸加载超时，已自动停止（请检查网络或换本地视频）')
  }, 25000)
}

function getStateFilePath(): string {
  return path.join(app.getPath('userData'), 'video-wallpaper-state.json')
}

function saveActiveVideoWallpaper(): void {
  try {
    const p = getStateFilePath()
    if (activeVideoWallpaper) {
      fs.writeFileSync(p, JSON.stringify(activeVideoWallpaper, null, 2), 'utf8')
    } else {
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
  } catch (e) {
    console.warn('保存视频壁纸状态失败:', (e as Error).message)
  }
}

function loadActiveVideoWallpaper(): ActiveVideoWallpaper | null {
  try {
    const p = getStateFilePath()
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf8')
    const obj = JSON.parse(raw) as ActiveVideoWallpaper
    if (obj && obj.wallpaperId && obj.videoSrc) return obj
  } catch (e) {
    console.warn('读取视频壁纸状态失败:', (e as Error).message)
  }
  return null
}

function getVirtualDesktopLayout(): {
  displays: Electron.Display[]
  minX: number
  minY: number
  width: number
  height: number
} {
  const displays = screen.getAllDisplays()
  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  displays.forEach((d, i) => {
    if (i === 0) {
      minX = d.bounds.x
      minY = d.bounds.y
      maxX = d.bounds.x + d.bounds.width
      maxY = d.bounds.y + d.bounds.height
    } else {
      minX = Math.min(minX, d.bounds.x)
      minY = Math.min(minY, d.bounds.y)
      maxX = Math.max(maxX, d.bounds.x + d.bounds.width)
      maxY = Math.max(maxY, d.bounds.y + d.bounds.height)
    }
  })
  return {
    displays,
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  }
}

/* ===========================================================
 *  Windows WorkerW 置底方案：让 Electron 窗口显示在桌面图标之下、
 *  默认壁纸之上。参考 Lively Wallpaper / Wallpaper Engine 的实现。
 * ========================================================== */
function setupWorkerWParentFor(
  hwndBuf: Buffer,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0
): boolean {
  if (process.platform !== 'win32') return false
  try {
    return attachWindowToDesktop(hwndBuf, width, height, offsetX, offsetY)
  } catch (e) {
    console.warn('WorkerW SetParent 失败:', (e as Error).message)
    return false
  }
}

function destroyOneVideoWallWindow(win: BrowserWindow): void {
  if (!win || win.isDestroyed()) return
  try {
    if (process.platform === 'win32') {
      hideAttachedWindow(win.getNativeWindowHandle())
      detachWindowFromDesktop(win.getNativeWindowHandle())
    }
  } catch {
    /* ignore */
  }
  try {
    win.hide()
    win.removeAllListeners()
    win.close()
  } catch {
    /* ignore */
  }
}

function syncVideoWallWindowList(displays: Electron.Display[]): void {
  videoWallWindows = displays
    .map((d) => videoWallByDisplayId.get(d.id))
    .filter((w): w is BrowserWindow => !!w && !w.isDestroyed())
}
/* ===========================================================
 *  创建 / 更新 视频壁纸渲染窗口（每屏独立一个）
 * ========================================================== */
function createVideoWallBrowserWindow(
  absX: number,
  absY: number,
  width: number,
  height: number,
  relX: number,
  relY: number,
  displayIndex: number
): BrowserWindow {
  const win = new BrowserWindow({
    x: absX,
    y: absY,
    width,
    height,
    frame: false,
    show: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    transparent: true,
    backgroundColor: '#00000000',
    fullscreenable: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  win.setMenuBarVisibility(false)

  win.on('closed', () => {
    for (const [id, w] of videoWallByDisplayId.entries()) {
      if (w === win) videoWallByDisplayId.delete(id)
    }
    videoWallWindows = videoWallWindows.filter((w) => w !== win)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const baseDev = process.env['ELECTRON_RENDERER_URL']
    win.loadURL(baseDev + '/videowall.html')
  } else {
    win.loadFile(join(__dirname, '../renderer/videowall.html'))
  }

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return

    const doAttach = (): void => {
      if (win.isDestroyed()) return

      let attached = false
      try {
        const hwndBuf = win.getNativeWindowHandle()
        if (hwndBuf && hwndBuf.length) {
          attached = setupWorkerWParentFor(hwndBuf, width, height, relX, relY)
        }
      } catch (e) {
        console.warn(`[videowall] 显示器 ${displayIndex + 1} 挂载异常:`, (e as Error).message)
      }

      if (!attached) {
        console.error(`[videowall] 显示器 ${displayIndex + 1} 无法挂载到桌面层`)
        handleVideoWallEvent({
          type: 'attach-failed',
          message: `显示器 ${displayIndex + 1} 无法挂载到桌面层，请重启应用后重试`
        })
        return
      }

      videoWallAttachedCount += 1
      console.log(
        `[videowall] 显示器 ${displayIndex + 1} 独立窗口挂载成功 (${width}x${height} @ ${relX},${relY})`
      )
      win.showInactive()

      if (videoWallAttachedCount >= expectedVideoWallCount) {
        videoWallDesktopReady = true
        flushPendingVideoWallConfig()
        scheduleVideoWallPlayTimeout()
      }
    }

    // 副屏稍后挂载，避免 WorkerW 同时处理多个子窗口失败
    setTimeout(doAttach, displayIndex * 250)
  })

  return win
}

/** 每个显示器各一个独立窗口，各自铺满完整视频 */
function createOrUpdateVideoWallWindows(): void {
  const { displays, minX, minY, width: virtualW, height: virtualH } = getVirtualDesktopLayout()
  expectedVideoWallCount = displays.length
  const activeIds = new Set(displays.map((d) => d.id))

  // 拔掉显示器：销毁对应窗口
  for (const [id, win] of [...videoWallByDisplayId.entries()]) {
    if (!activeIds.has(id)) {
      destroyOneVideoWallWindow(win)
      videoWallByDisplayId.delete(id)
    }
  }

  // 若残留跨屏大窗口，销毁后按每屏重建
  if (videoWallByDisplayId.size === 1 && displays.length > 1) {
    const lone = [...videoWallByDisplayId.values()][0]
    if (lone && !lone.isDestroyed()) {
      const b = lone.getBounds()
      if (b.width >= virtualW - 4 && b.height >= virtualH - 4) {
        destroyOneVideoWallWindow(lone)
        videoWallByDisplayId.clear()
      }
    }
  }

  const needNewWindow = displays.some((d) => {
    const w = videoWallByDisplayId.get(d.id)
    return !w || w.isDestroyed()
  })

  if (needNewWindow) {
    videoWallAttachedCount = 0
    videoWallDesktopReady = false
  }

  displays.forEach((display, index) => {
    const relX = display.bounds.x - minX
    const relY = display.bounds.y - minY
    const { width, height } = display.bounds
    const absX = display.bounds.x
    const absY = display.bounds.y

    const existing = videoWallByDisplayId.get(display.id)
    if (existing && !existing.isDestroyed()) {
      existing.setBounds({ x: absX, y: absY, width, height })
      if (videoWallDesktopReady) {
        try {
          resizeAttachedWindow(existing.getNativeWindowHandle(), width, height, relX, relY)
        } catch {
          /* ignore */
        }
      }
      return
    }

    console.log(
      `[videowall] 创建显示器 ${index + 1} 独立窗口 ${width}x${height} @ (${absX},${absY})`
    )
    const win = createVideoWallBrowserWindow(absX, absY, width, height, relX, relY, index)
    videoWallByDisplayId.set(display.id, win)
  })

  syncVideoWallWindowList(displays)
}

function sendConfigToVideoWallWindow(win: BrowserWindow, cfg: ActiveVideoWallpaper): void {
  if (win.isDestroyed()) return
  const src = toPlayableMediaUrl(cfg.videoSrc)
  win.webContents.send('videowall:set-config', {
    src,
    volume: cfg.volume,
    muted: cfg.muted,
    loop: cfg.loop,
    playbackRate: cfg.playbackRate,
    title: cfg.title
  })
}

function flushPendingVideoWallConfig(): void {
  if (!videoWallDesktopReady || !pendingVideoWallConfig) return

  const cfg = pendingVideoWallConfig
  const alive = videoWallWindows.filter((w) => w && !w.isDestroyed())
  if (!alive.length) return

  for (const win of alive) {
    const send = (): void => sendConfigToVideoWallWindow(win, cfg)
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', send)
    } else {
      send()
    }
  }
}

function pushConfigToVideoWall(cfg: ActiveVideoWallpaper): void {
  pendingVideoWallConfig = cfg
  createOrUpdateVideoWallWindows()
  if (videoWallDesktopReady) {
    flushPendingVideoWallConfig()
  }
}

function destroyVideoWallWindow(): void {
  clearVideoWallPlayTimer()
  videoWallDesktopReady = false
  pendingVideoWallConfig = null
  videoWallAttachedCount = 0
  expectedVideoWallCount = 0

  for (const win of videoWallByDisplayId.values()) {
    destroyOneVideoWallWindow(win)
  }
  videoWallByDisplayId.clear()
  videoWallWindows = []
}

function getAppIcon(): Electron.NativeImage | undefined {
  const candidates = [
    join(__dirname, '../../resources/icon.png'),
    join(__dirname, '../../resources/icon.ico'),
    join(__dirname, '../../resources/icon.svg')
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) return img
    }
  }
  return undefined
}

function createWindow(): void {
  const launchHidden = process.argv.includes('--hidden')
  const appIcon = getAppIcon()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // 允许加载本地 file:// 图片，避免本地壁纸预览卡死/空白
      webSecurity: false,
      allowRunningInsecureContent: false
    },
    backgroundColor: '#0f172a'
  })

  mainWindow.on('ready-to-show', () => {
    if (!launchHidden) {
      mainWindow?.show()
    }
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


ipcMain.handle('set-wallpaper', async (_event, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: '未提供有效的壁纸文件路径' }
  }

  let realPath = filePath.trim()
  if (!realPath) {
    return { success: false, error: '壁纸路径为空' }
  }

  if (realPath.startsWith('file:///')) {
    realPath = realPath.slice(8).replace(/\//g, '\\')
  } else if (realPath.startsWith('file://')) {
    realPath = realPath.slice(7).replace(/\//g, '\\')
  }

  try {
    if (!fs.existsSync(realPath)) {
      return { success: false, error: '文件不存在: ' + realPath }
    }

    if (process.platform === 'win32') {
      await setWallpaperAllDisplays(realPath)
      saveLastStaticWallpaper(realPath)
      return { success: true }
    }

    if (setWallpaperFn) {
      await setWallpaperFn(realPath, { scale: 'fill' })
      saveLastStaticWallpaper(realPath)
      return { success: true }
    }

    return { success: false, error: '当前平台不支持设置壁纸' }
  } catch (error) {
    return { success: false, error: (error as Error).message || '设置壁纸失败' }
  }
})

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window-toggle-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
  return mainWindow?.isMaximized() ?? false
})

ipcMain.handle('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('get-library-path', () => ({
  path: getLibraryRoot(),
  isCustom: !!appSettings.libraryPath,
  defaultPath: getDefaultLibraryRoot()
}))

ipcMain.handle('pick-library-path', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择壁纸库目录',
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true }
  }

  const prepared = prepareLibraryRoot(result.filePaths[0])
  if (!prepared.ok) {
    return { canceled: false, success: false, error: prepared.error }
  }

  setCustomLibraryRoot(prepared.path)
  appSettings = { ...appSettings, libraryPath: prepared.path }
  saveAppSettings(appSettings)
  ensureLibraryDirs()

  return {
    canceled: false,
    success: true,
    path: prepared.path,
    settings: appSettings
  }
})

ipcMain.handle('reset-library-path', () => {
  try {
    setCustomLibraryRoot(null)
    appSettings = { ...appSettings, libraryPath: '' }
    saveAppSettings(appSettings)
    ensureLibraryDirs()
    return {
      success: true,
      path: getLibraryRoot(),
      settings: appSettings
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
})

ipcMain.handle('delete-library-file', (_event, filePath: string) => {
  try {
    const ok = deleteFromLibrary(filePath)
    return { success: ok }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
})

ipcMain.handle(
  'save-video-thumb',
  (_event, payload: { videoPath: string; jpegBase64: string }) => {
    try {
      if (!payload?.videoPath || !payload?.jpegBase64) {
        return { success: false, error: '参数缺失' }
      }
      const thumbPath = saveVideoThumbJpeg(payload.videoPath, payload.jpegBase64)
      return { success: true, thumbPath }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }
)

ipcMain.handle('select-local-image', async () => {
  if (!mainWindow) return { canceled: true, files: [] }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }]
  })
  if (result.canceled) {
    return { canceled: true, files: [] }
  }
  try {
    ensureLibraryDirs()
    const copied = importManyToLibrary(result.filePaths, 'image')
    return { canceled: false, files: copied }
  } catch (e) {
    return { canceled: true, files: [], error: (e as Error).message }
  }
})

/* ===================== 选择本地视频文件 ===================== */
ipcMain.handle('select-local-video', async () => {
  if (!mainWindow) return { canceled: true, files: [] }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Video',
        extensions: ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'wmv', 'flv', 'ts']
      }
    ]
  })
  if (result.canceled) return { canceled: true, files: [] }
  try {
    ensureLibraryDirs()
    const copied = importManyToLibrary(result.filePaths, 'video')
    return { canceled: false, files: copied }
  } catch (e) {
    return { canceled: true, files: [], error: (e as Error).message }
  }
})

/* ===================== 视频壁纸 IPC ===================== */
type StartVideoInput = ActiveVideoWallpaper

ipcMain.handle('start-video-wallpaper', async (_event, input: StartVideoInput) => {
  try {
    if (!input || !input.wallpaperId || !input.videoSrc) {
      return { success: false, error: '参数缺失' }
    }

    const videoSrc = normalizeVideoSrc(input.videoSrc)
    if (videoSrc.startsWith('wallpaper-media://')) {
      const localPath = fromMediaPath(videoSrc)
      if (!localPath || !fs.existsSync(localPath)) {
        return { success: false, error: '视频文件不存在，请先下载或选择本地视频' }
      }
    } else if (videoSrc.startsWith('file://')) {
      try {
        const localPath = fileURLToPath(videoSrc)
        if (!fs.existsSync(localPath)) {
          return { success: false, error: '视频文件不存在，请先下载或选择本地视频' }
        }
      } catch {
        return { success: false, error: '视频路径无效' }
      }
    }

    const prevSrc = activeVideoWallpaper?.videoSrc
    const alreadyRunning = isVideoWallpaperRunning()

    // 首次挂动态壁纸前备份当前系统桌面，退出时恢复，避免黑屏
    if (!alreadyRunning) {
      await ensureRememberedSystemWallpaper()
    }

    activeVideoWallpaper = {
      wallpaperId: input.wallpaperId,
      videoSrc,
      title: input.title || '动态视频壁纸',
      volume: typeof input.volume === 'number' ? input.volume : 0,
      muted: input.muted !== false,
      loop: input.loop !== false,
      playbackRate: 1
    }
    saveActiveVideoWallpaper()

    // 已在播放且是同一视频：只热更新配置，不要重建窗口 / 等待 playing（否则会卡死超时）
    if (alreadyRunning && videoWallDesktopReady && prevSrc === videoSrc) {
      pendingVideoWallConfig = activeVideoWallpaper
      flushPendingVideoWallConfig()
      updateTrayMenu()
      notifyRendererVideoWallEvent({ type: 'playing', wallpaper: activeVideoWallpaper })
      return { success: true }
    }

    // 换源或首次启动：需要等待真正开始播放
    const startWait = waitForVideoWallStart()
    pushConfigToVideoWall(activeVideoWallpaper)

    const result = await startWait
    if (!result.success) {
      stopVideoWallpaperInternal(undefined, { showMain: false })
      return result
    }
    updateTrayMenu()
    return { success: true }
  } catch (e) {
    stopVideoWallpaperInternal(undefined, { showMain: false })
    return { success: false, error: (e as Error).message || '启动视频壁纸失败' }
  }
})

ipcMain.handle('stop-video-wallpaper', () => {
  try {
    if (!isVideoWallpaperRunning()) {
      activeVideoWallpaper = null
      saveActiveVideoWallpaper()
      notifyRendererVideoWallEvent({ type: 'stopped', message: '动态壁纸已停止' })
      return { success: true }
    }
    stopVideoWallpaperInternal('动态壁纸已停止', { showMain: false })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message || '停止失败' }
  }
})

ipcMain.handle('update-video-wallpaper', (_event, patch: Partial<ActiveVideoWallpaper>) => {
  try {
    if (!activeVideoWallpaper || !isVideoWallpaperRunning()) {
      return { success: false, error: '没有正在运行的视频壁纸' }
    }
    activeVideoWallpaper = {
      ...activeVideoWallpaper,
      ...patch,
      playbackRate: 1
    }
    saveActiveVideoWallpaper()
    // 仅推送配置，不重建窗口
    pendingVideoWallConfig = activeVideoWallpaper
    flushPendingVideoWallConfig()
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message || '更新失败' }
  }
})

ipcMain.handle('get-video-wallpaper-status', () => ({
  running: isVideoWallpaperRunning(),
  wallpaper: isVideoWallpaperRunning() ? activeVideoWallpaper : null
}))

ipcMain.handle('get-active-video-wallpaper', () =>
  isVideoWallpaperRunning() ? activeVideoWallpaper : null
)

ipcMain.handle('get-app-settings', () => appSettings)

ipcMain.handle('set-app-settings', (_event, patch: Partial<AppSettings>) => {
  try {
    if (typeof patch.libraryPath === 'string') {
      const nextPath = patch.libraryPath.trim()
      if (nextPath) {
        const prepared = prepareLibraryRoot(nextPath)
        if (!prepared.ok) {
          return { success: false, error: prepared.error }
        }
        setCustomLibraryRoot(prepared.path)
        patch = { ...patch, libraryPath: prepared.path }
      } else {
        setCustomLibraryRoot(null)
        patch = { ...patch, libraryPath: '' }
      }
    }

    appSettings = { ...appSettings, ...patch }
    saveAppSettings(appSettings)
    if (typeof patch.launchAtLogin === 'boolean') {
      applyLaunchAtLogin(patch.launchAtLogin)
    }
    ensureLibraryDirs()
    return { success: true, settings: appSettings }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
})

/* ===================== 应用启动 ===================== */
app.whenReady().then(async () => {
  // 1) 先加载 wallpaper ESM 模块（主进程 ready 后统一加载，避免 IPC 内死锁）
  await loadWallpaperModule()

  ensureLibraryDirs()
  loadLastStaticWallpaper()
  appSettings = loadAppSettings()
  setCustomLibraryRoot(appSettings.libraryPath || null)
  ensureLibraryDirs()
  applyLaunchAtLogin(appSettings.launchAtLogin)
  registerMediaProtocolHandlers()
  createTray()

  // 视频壁纸紧急停止快捷键（黑屏时也能退出）
  try {
    globalShortcut.register('CommandOrControl+Shift+Alt+W', () => {
      if (isVideoWallpaperRunning()) {
        stopVideoWallpaperInternal('已通过快捷键停止动态壁纸', { showMain: false })
      }
    })
  } catch (e) {
    console.warn('注册全局快捷键失败:', (e as Error).message)
  }

  ipcMain.on('videowall-event', (_event, payload) => {
    handleVideoWallEvent(payload)
  })

  electronApp.setAppUserModelId('com.wallpapermaster.app')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()

  // 2) 按设置恢复上次动态壁纸
  try {
    if (appSettings.restoreVideoWallpaperOnStart) {
      const saved = loadActiveVideoWallpaper()
      if (saved) {
        activeVideoWallpaper = saved
        setTimeout(() => pushConfigToVideoWall(saved), 800)
      }
    } else if (fs.existsSync(getStateFilePath())) {
      fs.unlinkSync(getStateFilePath())
    }
  } catch (e) {
    console.warn('恢复视频壁纸失败:', (e as Error).message)
  }

  // 3) 显示器变化时重算各屏视频窗口
  const onDisplayChange = (): void => {
    if (activeVideoWallpaper) {
      createOrUpdateVideoWallWindows()
      if (videoWallDesktopReady && pendingVideoWallConfig) {
        flushPendingVideoWallConfig()
      }
    }
  }
  screen.on('display-metrics-changed', onDisplayChange)
  screen.on('display-added', onDisplayChange)
  screen.on('display-removed', onDisplayChange)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // 有托盘时关闭主窗口不退出，保持后台运行动态壁纸
  if (process.platform !== 'darwin' && !tray && !activeVideoWallpaper) {
    app.quit()
  }
})

let quitCleanupDone = false

async function performQuitCleanup(): Promise<void> {
  try {
    globalShortcut.unregisterAll()
  } catch {
    /* ignore */
  }

  const needRestore = !!activeVideoWallpaper || isVideoWallpaperRunning()
  destroyVideoWallWindow()
  activeVideoWallpaper = null
  saveActiveVideoWallpaper()
  updateTrayMenu()

  if (needRestore) {
    await restoreStaticWallpaperAfterVideoStop()
  }

  if (tray) {
    try {
      tray.destroy()
    } catch {
      /* ignore */
    }
    tray = null
  }
}

// 真正退出前：先拆掉动态壁纸并恢复桌面，避免退出后黑屏
app.on('before-quit', (e) => {
  if (quitCleanupDone) return
  e.preventDefault()
  isQuitting = true
  void performQuitCleanup()
    .catch((err) => {
      console.warn('[quit] 清理失败:', (err as Error).message)
    })
    .finally(() => {
      quitCleanupDone = true
      app.quit()
    })
})
