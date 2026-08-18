interface AppLogoProps {
  className?: string
}

/** 应用品牌图标：层叠风景 + 光晕，用于标题栏与启动标识 */
const AppLogo = ({ className = 'w-7 h-7' }: AppLogoProps): JSX.Element => (
  <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="wm-ring" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7dd3fc" />
        <stop offset="0.5" stopColor="#60a5fa" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="wm-sky" x1="16" y1="7" x2="16" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1e3a8a" stopOpacity="0.2" />
        <stop offset="1" stopColor="#0f172a" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="wm-hill-back" x1="4" y1="14" x2="28" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1d4ed8" />
        <stop offset="1" stopColor="#1e40af" />
      </linearGradient>
      <linearGradient id="wm-hill-front" x1="2" y1="18" x2="30" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
      <radialGradient
        id="wm-glow"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(23 10) rotate(90) scale(8)"
      >
        <stop stopColor="#fde68a" stopOpacity="0.95" />
        <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="#0f172a" />
    <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" stroke="url(#wm-ring)" strokeWidth="1.5" />
    <rect x="3" y="3" width="26" height="26" rx="6" fill="url(#wm-sky)" />
    <circle cx="23" cy="10" r="6" fill="url(#wm-glow)" />
    <circle cx="23" cy="10" r="2.2" fill="#fde68a" />
    <path d="M2 24.5 10.5 16.5 17 20.5 30 11.5V26.5H2V24.5Z" fill="url(#wm-hill-back)" opacity="0.85" />
    <path d="M2 26.5 8 21 14.5 24 22 17.5 30 22.5V26.5H2Z" fill="url(#wm-hill-front)" />
    <path
      d="M14 14.5 17.2 17.7 21.5 13"
      stroke="#e0f2fe"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
  </svg>
)

export default AppLogo
