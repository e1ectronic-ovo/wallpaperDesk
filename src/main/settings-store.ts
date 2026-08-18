import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { AppSettings } from '@shared/settings'
import { DEFAULT_APP_SETTINGS } from '@shared/settings'

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'app-settings.json')
}

export function loadAppSettings(): AppSettings {
  try {
    const p = getSettingsPath()
    if (!fs.existsSync(p)) return { ...DEFAULT_APP_SETTINGS }
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<AppSettings>
    return { ...DEFAULT_APP_SETTINGS, ...raw }
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export function saveAppSettings(settings: AppSettings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}

export function applyLaunchAtLogin(enabled: boolean): void {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: enabled ? ['--hidden'] : []
    })
  }
}
