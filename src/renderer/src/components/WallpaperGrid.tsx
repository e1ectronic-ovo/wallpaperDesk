import { useAppStore } from '@renderer/store/useAppStore'
import WallpaperCard from './WallpaperCard'
import { Icon } from '@renderer/components/icons'
import type { LibraryTab } from '@shared/types'

const EMPTY: Record<
  LibraryTab,
  { icon: 'all' | 'import-image' | 'import-video' | 'favorites'; title: string; desc: string }
> = {
  all: { icon: 'all', title: '还没有导入任何壁纸', desc: '点击左侧「导入图片」或「导入视频」开始' },
  images: { icon: 'import-image', title: '还没有导入图片', desc: '点击左侧「导入图片」添加本地壁纸' },
  videos: { icon: 'import-video', title: '还没有导入视频', desc: '点击左侧「导入视频」添加动态壁纸' },
  favorites: { icon: 'favorites', title: '还没有收藏', desc: '在预览中点击收藏按钮' }
}

const WallpaperGrid = (): JSX.Element => {
  const { viewMode, getFilteredWallpapers, activeTab } = useAppStore()
  const wallpapers = getFilteredWallpapers()
  const empty = EMPTY[activeTab]

  if (wallpapers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
        <div className="w-16 h-16 rounded-2xl bg-dark-600 border border-dark-500 flex items-center justify-center text-dark-200 mb-6">
          <Icon name={empty.icon} className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{empty.title}</h3>
        <p className="text-dark-300 text-center max-w-sm">{empty.desc}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {viewMode === 'list' ? (
        <div className="max-w-5xl mx-auto space-y-3 animate-fade-in">
          {wallpapers.map((wp) => (
            <WallpaperCard key={wp.id} wallpaper={wp} viewMode="list" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
          {wallpapers.map((wp) => (
            <WallpaperCard key={wp.id} wallpaper={wp} viewMode="grid" />
          ))}
        </div>
      )}
    </div>
  )
}

export default WallpaperGrid
