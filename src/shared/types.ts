export type WallpaperKind = 'image' | 'video'

export type LibraryTab = 'all' | 'images' | 'videos' | 'favorites'

export interface Wallpaper {
  id: string
  kind: WallpaperKind
  title: string
  category: string
  tags: string[]
  thumbUrl: string
  previewUrl: string
  url: string
  resolution: string
  durationSec?: number
  author?: string
  isLocal?: boolean
  localPath?: string
  localVideoPath?: string
}

export type ViewMode = 'grid' | 'list'
export type SortBy = 'newest' | 'popular' | 'random' | 'resolution'

export interface ActiveVideoWallpaper {
  wallpaperId: string
  videoSrc: string
  title: string
  volume: number
  muted: boolean
  loop: boolean
  playbackRate: number
}
