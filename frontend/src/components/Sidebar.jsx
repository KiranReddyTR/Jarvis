import { useState } from 'react'
import {
  Cpu, Sparkles, History, ChevronRight, Clock,
  Trash2, RotateCcw, Plus, Zap, Wifi, WifiOff, Loader2,
} from 'lucide-react'

const TOOL_META = {
  ChatGPT: { icon: '🤖', color: 'text-emerald-400' },
  Claude:  { icon: '🧠', color: 'text-orange-400' },
  Gemini:  { icon: '✨', color: 'text-blue-400' },
}

const EXAMPLES = [
  'Build a REST API with JWT auth',
  'Write a blog post on AI trends',
  'Analyze microservices vs monolith',
  'Create a Python data pipeline',
]

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── History item ──────────────────────────────────────────────────────────
function HistoryItem({ entry, onRestore, onDelete }) {
  const meta = TOOL_META[entry.tool] || TOOL_META.ChatGPT
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRestore(entry)}
      onKeyDown={(e) => e.key === 'Enter' && onRestore(entry)}
      className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl
                 hover:bg-white/[0.05] transition-colors cursor-pointer
                 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50"
    >
      <span className="text-base mt-0.5 flex-shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 font-medium truncate leading-snug">{entry.task}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-semibold ${meta.color}`}>{entry.tool}</span>
          <span className="text-[10px] text-gray-600 flex items-center gap-1">
            <Clock size={9} />{formatRelative(entry.timestamp)}
          </span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
        className="opacity-0 group-hover:opacity-100 btn-icon w-6 h-6
                   text-gray-600 hover:text-rose-400 flex-shrink-0 mt-0.5
                   transition-opacity duration-150"
        title="Delete entry"
        aria-label="Delete history entry"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ─── Backend status pill ───────────────────────────────────────────────────
function BackendStatus({ online, checking, onRecheck }) {
  if (checking && online === null) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 size={10} className="text-gray-600 animate-spin" />
        <span className="text-[11px] text-gray-600">Connecting…</span>
      </div>
    )
  }
  if (online) {
    return (
      <div className="flex items-center gap-2">
        <div className="status-dot bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        <span className="text-[11px] text-gray-600">Backend connected</span>
        <Zap size={10} className="text-emerald-500 ml-auto" />
      </div>
    )
  }
  return (
    <button
      onClick={onRecheck}
      className="flex items-center gap-2 w-full group"
      title="Click to retry connection"
    >
      <WifiOff size={10} className="text-rose-500 flex-shrink-0" />
      <span className="text-[11px] text-rose-400/80 group-hover:text-rose-300 transition-colors">
        Backend offline
      </span>
      <RotateCcw size={9} className="text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
    </button>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────
export default function Sidebar({
  task, onTaskChange,
  onSubmit, onReset,
  isLoading, isDone,
  history, onRestoreHistory, onDeleteHistory, onClearHistory,
  backendOnline, backendChecking, onRecheckBackend,
}) {
  const [historyOpen, setHistoryOpen] = useState(true)

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit()
  }

  return (
    <aside className="w-72 flex-shrink-0 h-full flex flex-col border-r border-white/[0.06] bg-[#0c0c14]/80 backdrop-blur-md">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-glow-sm">
            <Cpu size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">AI Command Center</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Plan · Route · Prompt</p>
          </div>
        </div>
      </div>

      {/* ── Task input ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <p className="label mb-3">New Task</p>

        <textarea
          value={task}
          onChange={(e) => onTaskChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Describe what you want to build, write, or analyze…"
          rows={4}
          disabled={isLoading || isDone}
          aria-label="Task description"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-3
                     text-xs text-gray-200 placeholder-gray-600 resize-none leading-relaxed
                     focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/40
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        />

        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[10px] text-gray-700 select-none">
            {task.length > 0 ? `${task.length} chars` : '⌘↵ to run'}
          </span>

          {isDone ? (
            <button onClick={onReset} className="btn-ghost py-1.5 px-3 text-xs">
              <Plus size={12} /> New Task
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!task.trim() || isLoading || backendOnline === false}
              className="btn-primary py-2 px-4 text-xs"
              title={backendOnline === false ? 'Backend is offline' : undefined}
            >
              {isLoading
                ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Running…</>
                : <><Sparkles size={12} />Run</>
              }
            </button>
          )}
        </div>

        {/* Offline warning */}
        {backendOnline === false && !isDone && (
          <p className="mt-2 text-[10px] text-rose-400/70 flex items-center gap-1.5">
            <WifiOff size={9} />
            Start the backend to run tasks
          </p>
        )}

        {/* Quick examples */}
        {!isDone && !isLoading && (
          <div className="mt-3 space-y-0.5">
            <p className="label mb-1.5">Examples</p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => onTaskChange(ex)}
                className="w-full text-left text-[11px] text-gray-500 hover:text-gray-300
                           px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors truncate"
              >
                → {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── History ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col mt-3 px-3">
        {/* History header */}
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex items-center justify-between w-full px-1 py-1.5 mb-1 group rounded-lg
                     hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-2">
            <History size={12} className="text-gray-600" />
            <span className="label">History</span>
            {history.length > 0 && (
              <span className="badge bg-white/[0.06] text-gray-500 text-[10px]">
                {history.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onClearHistory() }}
                className="btn-icon w-5 h-5 opacity-0 group-hover:opacity-100
                           text-gray-600 hover:text-rose-400 transition-opacity"
                title="Clear all history"
                aria-label="Clear all history"
              >
                <RotateCcw size={10} />
              </button>
            )}
            <ChevronRight
              size={12}
              className={`text-gray-600 transition-transform duration-200 ${historyOpen ? 'rotate-90' : ''}`}
            />
          </div>
        </button>

        {historyOpen && (
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
            {history.length === 0 ? (
              <div className="text-center py-8">
                <History size={22} className="text-gray-800 mx-auto mb-2" />
                <p className="text-[11px] text-gray-700">No history yet</p>
                <p className="text-[10px] text-gray-800 mt-0.5">Completed tasks appear here</p>
              </div>
            ) : (
              history.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  onRestore={onRestoreHistory}
                  onDelete={onDeleteHistory}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Footer — backend status ───────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <BackendStatus
          online={backendOnline}
          checking={backendChecking}
          onRecheck={onRecheckBackend}
        />
      </div>
    </aside>
  )
}
