/* 视频壁纸渲染脚本（独立页面，不依赖 React，保证轻量快速启动） */

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        on: (channel: string, listener: (...args: unknown[]) => void) => void
        send: (channel: string, ...args: unknown[]) => void
      }
    }
  }
}

interface VideoConfig {
  src: string
  volume?: number
  muted?: boolean
  loop?: boolean
  playbackRate?: number
  title?: string
}

const videoEl = document.getElementById('video-el') as HTMLVideoElement | null

let currentSrc = ''
let lastConfig: VideoConfig | null = null
let reportedError = false

const sendEvent = (payload: Record<string, unknown>): void => {
  window.electron?.ipcRenderer?.send('videowall-event', payload)
}

const reportFatal = (message: string): void => {
  if (reportedError) return
  reportedError = true
  setStatus(`播放失败: ${message}`)
  sendEvent({ type: 'fatal-error', src: currentSrc, message })
}

const setStatus = (_msg: string): void => {
  /* 壁纸层不显示调试文字，避免右下角出现小字 */
}

const applyConfig = (cfg: VideoConfig): void => {
  if (!videoEl) return
  lastConfig = cfg
  reportedError = false

  videoEl.loop = cfg.loop !== false
  videoEl.muted = cfg.muted !== false
  videoEl.volume = typeof cfg.volume === 'number' ? Math.max(0, Math.min(1, cfg.volume)) : 0
  // 壁纸固定 1x，避免异常倍速导致卡顿
  videoEl.playbackRate = 1

  if (!cfg.src) {
    reportFatal('未提供视频地址')
    return
  }

  if (cfg.src !== currentSrc) {
    currentSrc = cfg.src
    videoEl.pause()
    videoEl.removeAttribute('src')
    try {
      videoEl.load()
    } catch {
      /* ignore */
    }

    videoEl.src = cfg.src
    videoEl.load()
    setStatus(`加载中: ${cfg.title || cfg.src.slice(0, 60)}`)

    const p = videoEl.play()
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        reportFatal((err as Error).message || '浏览器无法播放该视频')
      })
    }
    return
  }

  // 同源仅更新音量/循环等：确保继续播放并回报 playing，避免主进程等待超时卡死
  if (videoEl.paused) {
    void videoEl.play().catch((err) => reportFatal((err as Error).message))
  } else {
    sendEvent({ type: 'playing', src: currentSrc })
  }
}

if (videoEl) {
  videoEl.addEventListener('loadeddata', () => {
    setStatus(`正在播放: ${lastConfig?.title || currentSrc.slice(0, 40)}`)
    sendEvent({ type: 'playing', src: currentSrc })
  })

  videoEl.addEventListener('error', () => {
    const err = videoEl.error
    const code = err?.code
    const messages: Record<number, string> = {
      1: '加载被中止',
      2: '网络错误',
      3: '解码失败（格式不支持）',
      4: '视频源无效或无法访问'
    }
    const msg = code ? messages[code] || `错误代码=${code}` : '未知错误'
    reportFatal(msg)
  })

  videoEl.addEventListener('ended', () => {
    if (videoEl.loop) {
      videoEl.currentTime = 0
      void videoEl.play().catch(() => undefined)
    }
  })
}

if (window.electron?.ipcRenderer) {
  const ipc = window.electron.ipcRenderer

  ipc.on('videowall:set-config', (...args: unknown[]) => {
    const cfg = args[1] as VideoConfig
    applyConfig(cfg)
  })

  ipc.on('videowall:play', () => {
    if (videoEl) {
      void videoEl.play().catch((err) => reportFatal((err as Error).message))
    }
  })

  ipc.on('videowall:pause', () => {
    videoEl?.pause()
  })

  ipc.on('videowall:set-volume', (...args: unknown[]) => {
    const v = args[1] as number
    if (videoEl) videoEl.volume = Math.max(0, Math.min(1, v))
  })

  ipc.on('videowall:set-muted', (...args: unknown[]) => {
    const muted = args[1] as boolean
    if (videoEl) videoEl.muted = !!muted
  })

  ipc.on('videowall:set-playback-rate', (...args: unknown[]) => {
    const rate = args[1] as number
    if (videoEl) videoEl.playbackRate = Math.max(0.25, Math.min(4, rate))
  })

  ipc.on('videowall:reload', () => {
    if (videoEl && currentSrc) {
      videoEl.src = currentSrc
      videoEl.load()
      void videoEl.play().catch((err) => reportFatal((err as Error).message))
    }
  })
}

setStatus('等待配置...')

export {}
