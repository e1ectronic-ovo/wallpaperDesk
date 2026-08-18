import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Wallpaper,
  ViewMode,
  SortBy,
  ActiveVideoWallpaper,
  LibraryTab
} from '@shared/types'
import { toLocalMediaUrl } from '@shared/media-url'

interface AppState {
  localWallpapers: Wallpaper[]
  localVideos: Wallpaper[]

  selectedResolution: string
  sortBy: SortBy
  viewMode: ViewMode
  searchQuery: string

  favorites: string[]

  activeVideoWallpaper: ActiveVideoWallpaper | null
  previewWallpaper: Wallpaper | null
  activeTab: LibraryTab

  setSearchQuery: (q: string) => void
  setResolution: (r: string) => void
  setSortBy: (s: SortBy) => void
  setViewMode: (m: ViewMode) => void
  setActiveTab: (t: LibraryTab) => void
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  setPreviewWallpaper: (w: Wallpaper | null) => void
  getFilteredWallpapers: () => Wallpaper[]
  getAllWallpapers: () => Wallpaper[]
  addLocalWallpapers: (paths: string[]) => void
  addLocalVideos: (paths: string[]) => void
  updateVideoThumb: (id: string, thumbPath: string) => void
  removeLocalWallpaper: (id: string) => void
  setActiveVideoWallpaper: (v: ActiveVideoWallpaper | null) => void
  isCurrentWallpaper: (id: string) => boolean
}

const getResolutionValue = (res: string): number => {
  const match = res.match(/(\d+)x(\d+)/)
  if (match) return parseInt(match[1]) * parseInt(match[2])
  return 0
}

const applyFilters = (
  source: Wallpaper[],
  opts: { searchQuery: string; selectedResolution: string; sortBy: SortBy }
): Wallpaper[] => {
  let list = [...source]

  if (opts.searchQuery.trim()) {
    const q = opts.searchQuery.toLowerCase().trim()
    list = list.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  if (opts.selectedResolution !== 'all') {
    if (opts.selectedResolution === 'ultrawide') {
      list = list.filter((w) => {
        const match = w.resolution.match(/(\d+)x(\d+)/)
        if (match) return parseInt(match[1]) / parseInt(match[2]) >= 2
        return false
      })
    } else {
      list = list.filter((w) => w.resolution === opts.selectedResolution)
    }
  }

  switch (opts.sortBy) {
    case 'newest':
      list.sort((a, b) => b.id.localeCompare(a.id))
      break
    case 'popular':
      list.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'random':
      list.sort(() => Math.random() - 0.5)
      break
    case 'resolution':
      list.sort((a, b) => getResolutionValue(b.resolution) - getResolutionValue(a.resolution))
      break
  }

  return list
}

function pathBasename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || '本地壁纸'
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      localWallpapers: [],
      localVideos: [],

      selectedResolution: 'all',
      sortBy: 'newest',
      viewMode: 'grid',
      searchQuery: '',

      favorites: [],

      activeVideoWallpaper: null,
      previewWallpaper: null,
      activeTab: 'all',

      setSearchQuery: (q) => set({ searchQuery: q }),
      setResolution: (r) => set({ selectedResolution: r }),
      setSortBy: (s) => set({ sortBy: s }),
      setViewMode: (m) => set({ viewMode: m }),
      setActiveTab: (t) => set({ activeTab: t }),

      toggleFavorite: (id) => {
        const { favorites } = get()
        if (favorites.includes(id)) {
          set({ favorites: favorites.filter((f) => f !== id) })
        } else {
          set({ favorites: [id, ...favorites] })
        }
      },

      isFavorite: (id) => get().favorites.includes(id),

      setPreviewWallpaper: (w) => set({ previewWallpaper: w }),
      setActiveVideoWallpaper: (v) => set({ activeVideoWallpaper: v }),
      isCurrentWallpaper: (id) => get().activeVideoWallpaper?.wallpaperId === id,

      getAllWallpapers: () => {
        const { localWallpapers, localVideos } = get()
        return [...localWallpapers, ...localVideos]
      },

      getFilteredWallpapers: () => {
        const state = get()
        const { activeTab, localWallpapers, localVideos, favorites } = state
        const filters = {
          searchQuery: state.searchQuery,
          selectedResolution: state.selectedResolution,
          sortBy: state.sortBy
        }

        if (activeTab === 'favorites') {
          const all = [...localWallpapers, ...localVideos]
          return applyFilters(all.filter((w) => favorites.includes(w.id)), filters)
        }

        if (activeTab === 'images') {
          return applyFilters(localWallpapers, filters)
        }

        if (activeTab === 'videos') {
          return applyFilters(localVideos, filters)
        }

        return applyFilters([...localWallpapers, ...localVideos], filters)
      },

      addLocalWallpapers: (paths) => {
        const newWallpapers: Wallpaper[] = paths.map((p, idx) => ({
          id: `local-${Date.now()}-${idx}`,
          kind: 'image',
          title: pathBasename(p),
          category: 'minimal',
          tags: ['图片'],
          thumbUrl: toLocalMediaUrl(p),
          previewUrl: toLocalMediaUrl(p),
          url: toLocalMediaUrl(p),
          resolution: '自定义',
          isLocal: true,
          localPath: p
        }))
        set((s) => ({ localWallpapers: [...newWallpapers, ...s.localWallpapers] }))
      },

      addLocalVideos: (paths) => {
        const newVideos: Wallpaper[] = paths.map((p, idx) => ({
          id: `lv-${Date.now()}-${idx}`,
          kind: 'video',
          title: pathBasename(p),
          category: 'video',
          tags: ['视频'],
          thumbUrl: toLocalMediaUrl(p),
          previewUrl: toLocalMediaUrl(p),
          url: toLocalMediaUrl(p),
          resolution: '1920x1080',
          isLocal: true,
          localPath: p,
          localVideoPath: p
        }))
        set((s) => ({ localVideos: [...newVideos, ...s.localVideos] }))
      },

      updateVideoThumb: (id, thumbPath) => {
        const thumbUrl = toLocalMediaUrl(thumbPath)
        set((s) => ({
          localVideos: s.localVideos.map((w) =>
            w.id === id ? { ...w, thumbUrl, previewUrl: thumbUrl } : w
          ),
          previewWallpaper:
            s.previewWallpaper?.id === id
              ? { ...s.previewWallpaper, thumbUrl, previewUrl: thumbUrl }
              : s.previewWallpaper
        }))
      },

      removeLocalWallpaper: (id) => {
        set((s) => ({
          localWallpapers: s.localWallpapers.filter((w) => w.id !== id),
          localVideos: s.localVideos.filter((w) => w.id !== id),
          favorites: s.favorites.filter((f) => f !== id),
          previewWallpaper: s.previewWallpaper?.id === id ? null : s.previewWallpaper
        }))
      }
    }),
    {
      name: 'wallpaper-master-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        localWallpapers: state.localWallpapers,
        localVideos: state.localVideos,
        viewMode: state.viewMode,
        selectedResolution: state.selectedResolution,
        activeTab: (state.activeTab as string) === 'history' ? 'all' : state.activeTab
      }),
      migrate: (persisted) => {
        const state = persisted as Record<string, unknown>
        if (state.activeTab === 'history') state.activeTab = 'all'
        delete state.history
        return state
      },
      version: 2
    }
  )
)
