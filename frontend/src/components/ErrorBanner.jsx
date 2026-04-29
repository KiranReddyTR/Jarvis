import { AlertTriangle, X, WifiOff, ShieldAlert, RefreshCw } from 'lucide-react'

function classify(message = '') {
  if (message.toLowerCase().includes('backend') || message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('reach') || message.toLowerCase().includes('econnrefused'))
    return 'offline'
  if (message.toLowerCase().includes('validation') || message.toLowerCase().includes(' — '))
    return 'validation'
  return 'generic'
}

const CONFIG = {
  offline: {
    Icon:    WifiOff,
    title:   'Backend unreachable',
    hint:    'Run: cd backend && venv\\Scripts\\uvicorn main:app --reload --port 8000',
    color:   'bg-rose-500/[0.07] border-rose-500/20 text-rose-300',
    iconCls: 'text-rose-400',
  },
  validation: {
    Icon:    ShieldAlert,
    title:   'Invalid input',
    hint:    null,
    color:   'bg-amber-500/[0.07] border-amber-500/20 text-amber-300',
    iconCls: 'text-amber-400',
  },
  generic: {
    Icon:    AlertTriangle,
    title:   'Request failed',
    hint:    'Make sure the backend is running on localhost:8000',
    color:   'bg-rose-500/[0.07] border-rose-500/20 text-rose-300',
    iconCls: 'text-rose-400',
  },
}

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  const type = classify(message)
  const { Icon, title, hint, color, iconCls } = CONFIG[type]

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border fade-up ${color}`}
         role="alert" aria-live="assertive">
      <div className={`w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08]
                       flex items-center justify-center flex-shrink-0 ${iconCls}`}>
        <Icon size={13} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs mt-0.5 opacity-80 leading-relaxed break-words">{message}</p>
        {hint && (
          <p className="text-[11px] mt-2 opacity-50 flex items-center gap-1.5">
            <RefreshCw size={9} />
            <code className="font-mono">{hint}</code>
          </p>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="btn-icon flex-shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss error"
      >
        <X size={13} />
      </button>
    </div>
  )
}
