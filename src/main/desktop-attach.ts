import koffi from 'koffi'

const HWND = 'void *'
const GWL_STYLE = -16
const GWL_EXSTYLE = -20
const WS_POPUP = 0x80000000
const WS_CHILD = 0x40000000
const WS_VISIBLE = 0x10000000
const WS_EX_NOACTIVATE = 0x08000000
const SWP_NOSIZE = 0x0001
const SWP_NOMOVE = 0x0002
const SWP_NOACTIVATE = 0x0010
const SWP_SHOWWINDOW = 0x0040
const SWP_FRAMECHANGED = 0x0020
const HWND_BOTTOM = 1
const SW_SHOW = 5
const SW_HIDE = 0

type Hwnd = number | bigint

let user32: ReturnType<typeof koffi.load> | null = null
let FindWindowW: ((...args: unknown[]) => Hwnd | null) | null = null
let FindWindowExW: ((...args: unknown[]) => Hwnd | null) | null = null
let SetParent: ((...args: unknown[]) => Hwnd | null) | null = null
let SetWindowPos: ((...args: unknown[]) => number) | null = null
let SendMessageW: ((...args: unknown[]) => bigint) | null = null
let ShowWindow: ((...args: unknown[]) => number) | null = null
let MoveWindow: ((...args: unknown[]) => number) | null = null
let GetWindowLongPtrW: ((...args: unknown[]) => bigint) | null = null
let SetWindowLongPtrW: ((...args: unknown[]) => bigint) | null = null

function loadUser32(): boolean {
  if (user32) return true
  if (process.platform !== 'win32') return false
  try {
    user32 = koffi.load('user32.dll')
    FindWindowW = user32.func('FindWindowW', HWND, ['str16', 'str16'])
    FindWindowExW = user32.func('FindWindowExW', HWND, [HWND, HWND, 'str16', HWND])
    SetParent = user32.func('SetParent', HWND, [HWND, HWND])
    SetWindowPos = user32.func('SetWindowPos', 'int', [HWND, HWND, 'int', 'int', 'int', 'int', 'uint'])
    SendMessageW = user32.func('SendMessageW', 'intptr', [HWND, 'uint', 'intptr', 'intptr'])
    ShowWindow = user32.func('ShowWindow', 'int', [HWND, 'int'])
    MoveWindow = user32.func('MoveWindow', 'int', [HWND, 'int', 'int', 'int', 'int', 'int'])
    GetWindowLongPtrW = user32.func('GetWindowLongPtrW', 'intptr', [HWND, 'int'])
    SetWindowLongPtrW = user32.func('SetWindowLongPtrW', 'intptr', [HWND, 'int', 'intptr'])
    return true
  } catch (e) {
    console.warn('[desktop-attach] 加载 user32 失败:', (e as Error).message)
    return false
  }
}

export function hwndFromBuffer(hwndBuf: Buffer): Hwnd {
  if (hwndBuf.length >= 8) return hwndBuf.readBigUInt64LE(0)
  return hwndBuf.readUInt32LE(0)
}

function isValidHwnd(hwnd: Hwnd | null | undefined): hwnd is Hwnd {
  if (hwnd == null) return false
  const n = typeof hwnd === 'bigint' ? hwnd : BigInt(hwnd)
  return n !== 0n
}

function triggerDesktopWorkerW(progman: Hwnd): void {
  if (!SendMessageW) return
  try {
    SendMessageW(progman, 0x052c, 0xd, 0)
  } catch {
    /* ignore */
  }
  try {
    SendMessageW(progman, 0x052c, 0, 0)
  } catch {
    /* ignore */
  }
}

/**
 * 正确桌面层：找到带 SHELLDLL_DefView（图标层）的窗口，取其后的 WorkerW 兄弟。
 * 参考 Lively Wallpaper / Wallpaper Engine 实现。
 */
function findDesktopWorkerW(): Hwnd | null {
  if (!FindWindowW || !FindWindowExW) return null

  const progman = FindWindowW('Progman', null)
  if (!isValidHwnd(progman)) return null

  triggerDesktopWorkerW(progman)

  // 1) Progman 自身带 DefView → 取其后 WorkerW 兄弟
  const shellOnProgman = FindWindowExW(progman, null, 'SHELLDLL_DefView', null)
  if (isValidHwnd(shellOnProgman)) {
    const behind = FindWindowExW(null, progman, 'WorkerW', null)
    if (isValidHwnd(behind)) {
      console.log('[desktop-attach] WorkerW(Progman兄弟):', behind.toString())
      return behind
    }
  }

  // 2) 遍历 WorkerW：带 DefView 的 → 取其后 WorkerW 兄弟（图标下层壁纸层）
  let after: Hwnd | null = null
  while (true) {
    const w = FindWindowExW(null, after, 'WorkerW', null)
    if (!isValidHwnd(w)) break
    after = w
    const shell = FindWindowExW(w, null, 'SHELLDLL_DefView', null)
    if (isValidHwnd(shell)) {
      const behind = FindWindowExW(null, w, 'WorkerW', null)
      if (isValidHwnd(behind)) {
        console.log('[desktop-attach] WorkerW(图标层兄弟):', behind.toString())
        return behind
      }
    }
  }

  // 3) 最后回退：无 DefView 的 WorkerW（部分旧系统）
  after = null
  while (true) {
    const w = FindWindowExW(null, after, 'WorkerW', null)
    if (!isValidHwnd(w)) break
    after = w
    const shell = FindWindowExW(w, null, 'SHELLDLL_DefView', null)
    if (!isValidHwnd(shell)) {
      console.log('[desktop-attach] WorkerW(无Shell回退):', w.toString())
      return w
    }
  }

  console.log('[desktop-attach] 回退 Progman:', progman.toString())
  return progman
}

function toBigInt(v: bigint | number): bigint {
  return typeof v === 'bigint' ? v : BigInt(v)
}

function makeChildWindow(hwnd: Hwnd): void {
  if (!GetWindowLongPtrW || !SetWindowLongPtrW) return

  const rawStyle = GetWindowLongPtrW(hwnd, GWL_STYLE) as bigint | number
  let style = (toBigInt(rawStyle) & ~BigInt(WS_POPUP)) | BigInt(WS_CHILD | WS_VISIBLE)
  SetWindowLongPtrW(hwnd, GWL_STYLE, style)

  const rawEx = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as bigint | number
  const exStyle = toBigInt(rawEx) | BigInt(WS_EX_NOACTIVATE)
  SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle)
}

/** 将窗口挂到桌面图标下层 */
export function attachWindowToDesktop(
  hwndBuf: Buffer,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0
): boolean {
  if (
    !loadUser32() ||
    !SetParent ||
    !SetWindowPos ||
    !ShowWindow ||
    !MoveWindow ||
    !GetWindowLongPtrW ||
    !SetWindowLongPtrW
  ) {
    console.warn('[desktop-attach] user32 API 未就绪')
    return false
  }

  const hwnd = hwndFromBuffer(hwndBuf)
  if (!isValidHwnd(hwnd)) {
    console.warn('[desktop-attach] 无效子窗口句柄')
    return false
  }

  const parent = findDesktopWorkerW()
  if (!isValidHwnd(parent)) {
    console.warn('[desktop-attach] 未找到桌面父窗口')
    return false
  }

  SetParent(hwnd, parent)
  makeChildWindow(hwnd)
  MoveWindow(hwnd, offsetX, offsetY, width, height, 1)
  SetWindowPos(
    hwnd,
    HWND_BOTTOM,
    0,
    0,
    0,
    0,
    SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_FRAMECHANGED
  )
  ShowWindow(hwnd, SW_SHOW)

  console.log('[desktop-attach] 挂载成功 child=', hwnd.toString(), 'parent=', parent.toString())
  return true
}

export function resizeAttachedWindow(
  hwndBuf: Buffer,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0
): void {
  if (!loadUser32() || !MoveWindow) return
  const hwnd = hwndFromBuffer(hwndBuf)
  if (!isValidHwnd(hwnd)) return
  MoveWindow(hwnd, offsetX, offsetY, width, height, 1)
}

export function hideAttachedWindow(hwndBuf: Buffer): void {
  if (!loadUser32() || !ShowWindow) return
  const hwnd = hwndFromBuffer(hwndBuf)
  if (!isValidHwnd(hwnd)) return
  ShowWindow(hwnd, SW_HIDE)
}

export function detachWindowFromDesktop(hwndBuf: Buffer): void {
  if (!loadUser32() || !SetParent) return
  const hwnd = hwndFromBuffer(hwndBuf)
  if (!isValidHwnd(hwnd)) return
  SetParent(hwnd, null)
}
