import { useEffect, useState } from 'react'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import WallpaperGrid from './components/WallpaperGrid'
import WallpaperPreview from './components/WallpaperPreview'
import SettingsPage from './components/SettingsPage'
import { useAppStore } from '@renderer/store/useAppStore'
import type { ActiveVideoWallpaper } from '@shared/types'

const App = (): JSX.Element => {
  const [showSettings, setShowSettings] = useState(false)
  const setActiveVideoWallpaper = useAppStore((s) => s.setActiveVideoWallpaper)

  useEffect(() => {
    const syncVideoStatus = async (): Promise<void> => {
      const status = await window.api?.getVideoWallpaperStatus?.()
      setActiveVideoWallpaper(status?.running ? status.wallpaper : null)
    }

    void syncVideoStatus()

    const off = window.api?.onVideoWallEvent?.((payload) => {
      const evt = payload as {
        type?: string
        wallpaper?: ActiveVideoWallpaper
      }
      if (evt.type === 'stopped' || evt.type === 'fatal-error' || evt.type === 'error') {
        setActiveVideoWallpaper(null)
        return
      }
      if (evt.type === 'playing') {
        if (evt.wallpaper) {
          setActiveVideoWallpaper(evt.wallpaper)
        } else {
          void syncVideoStatus()
        }
      }
    })
    return () => off?.()
  }, [setActiveVideoWallpaper])

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-800 overflow-hidden">
      <TitleBar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenSettings={() => setShowSettings(true)} onNavigate={() => setShowSettings(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {!showSettings && <Toolbar />}
          {showSettings ? (
            <SettingsPage onClose={() => setShowSettings(false)} />
          ) : (
            <WallpaperGrid />
          )}
        </div>
      </div>

      <WallpaperPreview />
    </div>
  )
}

export default App
