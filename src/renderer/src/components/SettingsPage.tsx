import { useEffect, useState } from 'react'
import type { AppSettings } from '@shared/settings'

interface SettingsPageProps {
  onClose: () => void
}

const SettingsPage = ({ onClose }: SettingsPageProps): JSX.Element => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [libraryPath, setLibraryPath] = useState('')
  const [isCustomLibrary, setIsCustomLibrary] = useState(false)
  const [defaultLibraryPath, setDefaultLibraryPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const refreshLibraryInfo = async (): Promise<void> => {
    const info = await window.api?.getLibraryPath?.()
    if (!info) return
    setLibraryPath(info.path)
    setIsCustomLibrary(info.isCustom)
    setDefaultLibraryPath(info.defaultPath)
  }

  useEffect(() => {
    void (async () => {
      const s = await window.api?.getAppSettings?.()
      if (s) setSettings(s)
      await refreshLibraryInfo()
    })()
  }, [])

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> => {
    if (!settings) return
    setSaving(true)
    setMessage('')
    const next = { ...settings, [key]: value }
    setSettings(next)
    try {
      const r = await window.api?.setAppSettings?.({ [key]: value })
      if (r?.success && r.settings) {
        setSettings(r.settings)
        setMessage('已保存')
      } else {
        setMessage(r?.error || '保存失败')
      }
    } catch (e) {
      setMessage((e as Error).message || '保存失败')
    } finally {
      setTimeout(() => setSaving(false), 200)
    }
  }

  const handlePickLibrary = async (): Promise<void> => {
    setSaving(true)
    setMessage('')
    try {
      const r = await window.api?.pickLibraryPath?.()
      if (!r || r.canceled) return
      if (r.success && r.path) {
        if (r.settings) setSettings(r.settings)
        await refreshLibraryInfo()
        setMessage('壁纸库目录已更新，之后导入的文件将保存到新目录')
      } else {
        setMessage(r.error || '设置目录失败')
      }
    } catch (e) {
      setMessage((e as Error).message || '设置目录失败')
    } finally {
      setSaving(false)
    }
  }

  const handleResetLibrary = async (): Promise<void> => {
    if (
      !window.confirm(
        '确定恢复为默认目录？\n之后新导入的文件会存到默认位置，已导入文件不会自动移动。'
      )
    ) {
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const r = await window.api?.resetLibraryPath?.()
      if (r?.success) {
        if (r.settings) setSettings(r.settings)
        await refreshLibraryInfo()
        setMessage('已恢复默认壁纸库目录')
      } else {
        setMessage(r?.error || '恢复失败')
      }
    } catch (e) {
      setMessage((e as Error).message || '恢复失败')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-300">加载设置中...</div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">设置</h2>
            <p className="text-sm text-dark-300 mt-1">管理启动选项与壁纸行为</p>
          </div>
          <button onClick={onClose} className="btn-ghost text-sm">
            返回库
          </button>
        </div>

        <section className="rounded-xl border border-dark-500 bg-dark-700/80 divide-y divide-dark-500">
          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-white font-medium">开机自启动</div>
              <div className="text-xs text-dark-300 mt-1">登录 Windows 后自动在后台启动本程序</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.launchAtLogin}
                disabled={saving}
                onChange={(e) => void updateSetting('launchAtLogin', e.target.checked)}
              />
              <div className="w-11 h-6 bg-dark-500 rounded-full peer peer-checked:bg-primary-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-white font-medium">启动时恢复动态壁纸</div>
              <div className="text-xs text-dark-300 mt-1">
                若上次退出时正在播放动态壁纸，开机后自动恢复
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.restoreVideoWallpaperOnStart}
                disabled={saving}
                onChange={(e) => void updateSetting('restoreVideoWallpaperOnStart', e.target.checked)}
              />
              <div className="w-11 h-6 bg-dark-500 rounded-full peer peer-checked:bg-primary-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-dark-500 bg-dark-700/80 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white font-medium">壁纸库目录</div>
              <div className="text-xs text-dark-300 mt-1">
                导入的图片与视频会复制到此目录。可改到 D/E 盘等其它位置，避免占满 C 盘。
              </div>
            </div>
            <span
              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${
                isCustomLibrary
                  ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'
                  : 'text-dark-300 border-dark-500 bg-dark-600'
              }`}
            >
              {isCustomLibrary ? '自定义' : '默认'}
            </span>
          </div>

          <p className="text-xs text-dark-200 break-all bg-dark-800/70 border border-dark-500 rounded-lg px-3 py-2">
            {libraryPath || '加载中...'}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void handlePickLibrary()}
              disabled={saving}
              className="btn-primary text-sm !py-2 !px-3 disabled:opacity-50"
            >
              选择目录…
            </button>
            {isCustomLibrary && (
              <button
                onClick={() => void handleResetLibrary()}
                disabled={saving}
                className="btn-ghost text-sm !py-2 !px-3 disabled:opacity-50"
              >
                恢复默认
              </button>
            )}
          </div>

          <p className="text-xs text-dark-400 leading-relaxed">
            更改目录后，新导入文件写入新位置；已导入文件仍在原路径，列表可正常使用。
            {defaultLibraryPath ? ` 默认目录：${defaultLibraryPath}` : ''}
          </p>
        </section>

        <section className="rounded-xl border border-dark-500 bg-dark-700/80 p-4 space-y-2">
          <div className="text-white font-medium">托盘与快捷键</div>
          <ul className="text-xs text-dark-300 space-y-1 list-disc list-inside">
            <li>关闭主窗口后可在任务栏右下角托盘继续控制</li>
            <li>动态壁纸异常时按 Ctrl+Shift+Alt+W 紧急停止</li>
          </ul>
        </section>

        {message && <p className="text-sm text-primary-300">{message}</p>}
      </div>
    </div>
  )
}

export default SettingsPage
