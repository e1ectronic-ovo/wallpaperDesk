import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execFileAsync = promisify(execFile)

function getWallpaperScriptPath(): string {
  const candidates = [
    path.join(__dirname, '../../scripts/set-wallpaper-all-monitors.ps1'),
    path.join(process.cwd(), 'scripts/set-wallpaper-all-monitors.ps1'),
    path.join(process.resourcesPath, 'scripts/set-wallpaper-all-monitors.ps1')
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error('未找到 set-wallpaper-all-monitors.ps1')
}

/** 使用 IDesktopWallpaper 为每个显示器分别设置壁纸 */
async function setWallpaperPerMonitor(imagePath: string): Promise<number> {
  const scriptPath = getWallpaperScriptPath()
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-ImagePath', imagePath],
    { timeout: 30000, windowsHide: true }
  )
  const match = stdout.match(/monitors=(\d+)/)
  const count = match ? parseInt(match[1], 10) : 0
  console.log(`[wallpaper-win] 已为 ${count || '全部'} 个显示器设置壁纸`)
  return count
}

/** 刷新桌面绘制，避免停止动态壁纸后残留黑屏 */
export async function refreshDesktopPaint(): Promise<void> {
  await execFileAsync(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'rundll32.exe user32.dll,UpdatePerUserSystemParameters ,1 ,True'
    ],
    { timeout: 10000, windowsHide: true }
  )
}

/** 为所有显示器设置静态壁纸 */
export async function setWallpaperAllDisplays(imagePath: string): Promise<void> {
  const resolved = path.resolve(imagePath)
  if (!fs.existsSync(resolved)) {
    throw new Error('壁纸文件不存在: ' + resolved)
  }
  await setWallpaperPerMonitor(resolved)
}
