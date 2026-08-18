/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'Chakra Petch', 'Rajdhani', 'Microsoft YaHei', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'Inter', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace']
      },
      colors: {
        primary: {
          50: '#e6fffd',
          100: '#b3fff5',
          200: '#80ffec',
          300: '#4dffe3',
          400: '#1affda',
          500: '#00e5c0',
          600: '#00b394',
          700: '#008069',
          800: '#004d3f',
          900: '#001a15'
        },
        neon: {
          cyan: '#00ffe1',
          magenta: '#ff2d95',
          violet: '#a855f7',
          yellow: '#ffd60a',
          blue: '#38bdf8',
          red: '#ff3b5c'
        },
        hud: {
          line: 'rgba(0, 255, 225, 0.25)',
          lineStrong: 'rgba(0, 255, 225, 0.7)',
          bg: 'rgba(0, 255, 225, 0.04)',
          panel: 'rgba(8, 15, 28, 0.72)',
          grid: 'rgba(0, 255, 225, 0.08)'
        },
        dark: {
          100: '#e2e8f0',
          200: '#94a3b8',
          300: '#64748b',
          400: '#334155',
          500: '#1e293b',
          600: '#0f172a',
          700: '#0a1020',
          800: '#060a16',
          900: '#02040a'
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(0,255,225,0.45), 0 0 32px rgba(0,255,225,0.18), inset 0 0 12px rgba(0,255,225,0.08)',
        'neon-magenta': '0 0 12px rgba(255,45,149,0.5), 0 0 36px rgba(255,45,149,0.2)',
        'neon-thin': '0 0 6px rgba(0,255,225,0.35), 0 0 16px rgba(0,255,225,0.12)',
        'hud-panel': '0 1px 0 rgba(0,255,225,0.35), inset 0 0 0 1px rgba(0,255,225,0.08), 0 18px 60px -24px rgba(0,0,0,0.9)'
      },
      backgroundImage: {
        'grid-cyan':
          'linear-gradient(rgba(0,255,225,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,225,0.08) 1px, transparent 1px)',
        'grid-magenta':
          'linear-gradient(rgba(255,45,149,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,149,0.07) 1px, transparent 1px)',
        'radial-cyber':
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,255,225,0.18), transparent 60%), radial-gradient(ellipse 40% 60% at 100% 100%, rgba(255,45,149,0.16), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(168,85,247,0.12), transparent 60%)',
        'scanlines':
          'repeating-linear-gradient(0deg, rgba(0,255,225,0.05) 0px, rgba(0,255,225,0.05) 1px, transparent 1px, transparent 3px)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
        'slide-up-slow': 'slideUp 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-sweep': 'scanSweep 3.2s linear infinite',
        'border-flow': 'borderFlow 4s linear infinite',
        'glitch-x': 'glitchX 3.5s steps(2, end) infinite',
        'flicker': 'flicker 4s linear infinite',
        'rotate-slow': 'rotateSlow 18s linear infinite',
        'data-stream': 'dataStream 6s linear infinite',
        'hud-pulse': 'hudPulse 2.2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(22px)', opacity: '0', filter: 'blur(8px)' },
          '100%': { transform: 'translateY(0)', opacity: '1', filter: 'blur(0)' }
        },
        scanSweep: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' }
        },
        glitchX: {
          '0%, 92%, 100%': { transform: 'translateX(0)' },
          '93%': { transform: 'translateX(1px)' },
          '94%': { transform: 'translateX(-1px)' },
          '95%': { transform: 'translateX(1px)' },
          '96%': { transform: 'translateX(0)' }
        },
        flicker: {
          '0%, 18%, 22%, 25%, 53%, 57%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.72' }
        },
        rotateSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        dataStream: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 -40px' }
        },
        hudPulse: {
          '0%, 100%': { opacity: '0.85', boxShadow: '0 0 0px rgba(0,255,225,0.25)' },
          '50%': { opacity: '1', boxShadow: '0 0 14px rgba(0,255,225,0.55)' }
        }
      }
    }
  },
  plugins: []
}
