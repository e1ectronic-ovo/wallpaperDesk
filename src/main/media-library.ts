import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export type MediaKind = 'image' | 'video'

/** 用户自定义库根目录；空则回退默认 */
let customLibraryRoot: string | null = null

export function getDefaultLibraryRoot(): string {
  return path.join(app.getPath('userData'), 'library')
}

/** 应用启动或设置变更时调用 */
export function setCustomLibraryRoot(dir: string | null | undefined): void {
  const trimmed = (dir || '').trim()
  customLibraryRoot = trimmed ? path.resolve(trimmed) : null
}

/** 壁纸库根目录 */
export function getLibraryRoot(): string {
  return customLibraryRoot || getDefaultLibraryRoot()
}

export function getImagesDir(): string {
  return path.join(getLibraryRoot(), 'images')
}

export function getVideosDir(): string {
  return path.join(getLibraryRoot(), 'videos')
}

export function getThumbsDir(): string {
  return path.join(getLibraryRoot(), 'thumbs')
}

export function ensureLibraryDirs(): void {
  fs.mkdirSync(getImagesDir(), { recursive: true })
  fs.mkdirSync(getVideosDir(), { recursive: true })
  fs.mkdirSync(getThumbsDir(), { recursive: true })
}

/** 校验目录可写，并创建 images/videos/thumbs */
export function prepareLibraryRoot(dir: string): { ok: true; path: string } | { ok: false; error: string } {
  try {
    const resolved = path.resolve(dir.trim())
    if (!resolved) return { ok: false, error: '路径无效' }

    fs.mkdirSync(resolved, { recursive: true })
    fs.mkdirSync(path.join(resolved, 'images'), { recursive: true })
    fs.mkdirSync(path.join(resolved, 'videos'), { recursive: true })
    fs.mkdirSync(path.join(resolved, 'thumbs'), { recursive: true })

    const probe = path.join(resolved, `.write-test-${Date.now()}`)
    fs.writeFileSync(probe, 'ok')
    fs.unlinkSync(probe)

    return { ok: true, path: resolved }
  } catch (e) {
    return { ok: false, error: (e as Error).message || '无法写入该目录' }
  }
}

function sanitizeBaseName(name: string): string {
  const cleaned = name.replace(/[^\w\u4e00-\u9fa5.-]/g, '_').replace(/_+/g, '_')
  return cleaned.slice(0, 80) || 'media'
}

function isUnderRoot(filePath: string, root: string): boolean {
  const resolved = path.resolve(filePath)
  const r = path.resolve(root)
  return resolved === r || resolved.startsWith(r + path.sep)
}

/** 将用户选择的文件复制到程序库目录，返回新路径 */
export function importToLibrary(sourcePath: string, kind: MediaKind): string {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error('源文件不存在')
  }

  ensureLibraryDirs()
  const ext = path.extname(sourcePath).toLowerCase() || (kind === 'image' ? '.jpg' : '.mp4')
  const base = sanitizeBaseName(path.basename(sourcePath, path.extname(sourcePath)))
  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const destDir = kind === 'image' ? getImagesDir() : getVideosDir()
  const destPath = path.join(destDir, `${base}-${id}${ext}`)

  fs.copyFileSync(sourcePath, destPath)
  return destPath
}

/** 批量导入 */
export function importManyToLibrary(sourcePaths: string[], kind: MediaKind): string[] {
  const results: string[] = []
  for (const p of sourcePaths) {
    try {
      results.push(importToLibrary(p, kind))
    } catch (e) {
      console.warn('[media-library] 导入失败:', p, (e as Error).message)
    }
  }
  return results
}

export function isLibraryPath(filePath: string): boolean {
  if (!filePath) return false
  // 当前库 + 默认库都允许删除（切换目录后旧文件仍可清理）
  if (isUnderRoot(filePath, getLibraryRoot())) return true
  if (isUnderRoot(filePath, getDefaultLibraryRoot())) return true
  return false
}

/** 保存视频封面 JPEG（base64），返回缩略图绝对路径 */
export function saveVideoThumbJpeg(videoPath: string, jpegBase64: string): string {
  ensureLibraryDirs()
  const base = sanitizeBaseName(path.basename(videoPath, path.extname(videoPath)))
  const id = crypto.createHash('md5').update(videoPath).digest('hex').slice(0, 10)
  // 封面尽量和视频同库：若视频在某库目录下，写入该库 thumbs；否则写当前库
  let thumbsDir = getThumbsDir()
  const videoDir = path.dirname(videoPath)
  const parent = path.dirname(videoDir)
  if (path.basename(videoDir).toLowerCase() === 'videos') {
    thumbsDir = path.join(parent, 'thumbs')
    fs.mkdirSync(thumbsDir, { recursive: true })
  }
  const destPath = path.join(thumbsDir, `${base}-${id}.jpg`)
  const buf = Buffer.from(jpegBase64.replace(/^data:image\/jpeg;base64,/, ''), 'base64')
  fs.writeFileSync(destPath, buf)
  return destPath
}

/** 根据视频路径推导关联缩略图并删除 */
export function deleteThumbForVideo(videoPath: string): void {
  try {
    const base = sanitizeBaseName(path.basename(videoPath, path.extname(videoPath)))
    const id = crypto.createHash('md5').update(videoPath).digest('hex').slice(0, 10)
    const candidates = [
      path.join(getThumbsDir(), `${base}-${id}.jpg`),
      path.join(getDefaultLibraryRoot(), 'thumbs', `${base}-${id}.jpg`)
    ]
    const videoDir = path.dirname(videoPath)
    if (path.basename(videoDir).toLowerCase() === 'videos') {
      candidates.push(path.join(path.dirname(videoDir), 'thumbs', `${base}-${id}.jpg`))
    }
    for (const thumb of candidates) {
      if (fs.existsSync(thumb)) fs.unlinkSync(thumb)
    }
  } catch {
    /* ignore */
  }
}

/** 从程序库删除文件（仅允许删除库内路径） */
export function deleteFromLibrary(filePath: string): boolean {
  if (!isLibraryPath(filePath)) return false
  try {
    if (fs.existsSync(filePath)) {
      const lower = filePath.toLowerCase()
      if (/\.(mp4|webm|mkv|mov|avi|m4v|wmv|flv|ts)$/.test(lower)) {
        deleteThumbForVideo(filePath)
      }
      fs.unlinkSync(filePath)
      return true
    }
  } catch (e) {
    console.warn('[media-library] 删除失败:', filePath, (e as Error).message)
  }
  return false
}
