/** 本地文件在渲染进程中的可播放地址（需主进程注册 wallpaper-media 协议） */
export function toLocalMediaUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  return `wallpaper-media://file/${encodeURIComponent(normalized)}`
}

export function isLocalMediaUrl(url: string): boolean {
  return url.startsWith('wallpaper-media://')
}
