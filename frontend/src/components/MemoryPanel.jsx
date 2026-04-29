import { useState, useEffect, useCallback } from 'react'
import {
  History, Star, Trophy, BarChart2, Trash2, RefreshCw,
  Clock, ChevronRight, ChevronDown, MessageSquare,
  RotateCcw, TrendingUp, Zap, Hash,
} from 'lucide-react'
import {
  getHistory, getBestPrompts, getMemoryStats,
  submitFeedback, markReused, deleteHistoryEntry, clearHistory,
} from '../api/client'

// ── Helpers ────────────────────────────────────────────────────────────────
const TOOL_META = {
  ChatGPT: { icon: '🤖', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  Claude:  { icon: '🧠', color: 'text-orange-400',  bg: 'bg-orange-500/10'  },
  Gemini:  { icon: '✨', color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ScoreBar({ score }) {
  const pct = Math.round(score * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-gray-600'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`}
             style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-600 w-6 text-right">{pct}</span>
    </div>
  )
}

// ── Star rating widget ─────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={readonly}
          onClick={() => !readonly && onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors duration-100 ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            size={12}
            className={
              n <= (hover || value || 0)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-700'
            }
          />
        </button>
      ))}
    </div>
  )
}

// ── Feedback form ──────────────────────────────────────────────────────────
function FeedbackForm({ entryId, currentRating, onDone }) {
  const [rating,  setRating]  = useState(currentRating || 0)
  const [comment, setComment] = useState('')
  const [reused,  setReused]  = useState(false)
  const [saving,  setSaving]  = useState(false)

  const handleSubmit = async () => {
    if (!rating) return
    setSaving(true)
    try {
      await submitFeedback(entryId, rating, comment || null, reused)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl space-y-3 fade-up">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500 font-medium">Rate this prompt</span>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment…"
        rows={2}
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2
                   text-xs text-gray-300 placeholder-gray-700 resize-none
                   focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={reused}
            onChange={(e) => setReused(e.target.checked)}
            className="accent-indigo-500 w-3 h-3"
          />
          I reused this prompt
        </label>
        <button
          onClick={handleSubmit}
          disabled={!rating || saving}
          className="btn-primary py-1.5 px-3 text-xs"
        >
          {saving ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}

// ── Single history entry ───────────────────────────────────────────────────
function HistoryEntry({ entry, onDelete, onRefresh }) {
  const [expanded,     setExpanded]     = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const meta = TOOL_META[entry.tool] || TOOL_META.ChatGPT

  const handleReuse = async (e) => {
    e.stopPropagation()
    await markReused(entry.id).catch(() => {})
    onRefresh()
  }

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden
                    hover:border-white/[0.1] transition-colors">
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <span className="text-sm">{meta.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-200 font-medium truncate">{entry.task}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`text-[10px] font-semibold ${meta.color}`}>{entry.tool}</span>
            <span className="text-[10px] text-gray-600">{entry.task_type}</span>
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Clock size={9} />{formatRelative(entry.created_at)}
            </span>
            {entry.reuse_count > 0 && (
              <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                <RotateCcw size={9} />{entry.reuse_count}×
              </span>
            )}
          </div>
          {entry.score > 0 && <ScoreBar score={entry.score} />}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {entry.rating && <StarRating value={entry.rating} readonly />}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
            className="btn-icon w-6 h-6 text-gray-700 hover:text-rose-400"
          >
            <Trash2 size={11} />
          </button>
          <ChevronDown
            size={13}
            className={`text-gray-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/[0.06] p-3 space-y-3 bg-white/[0.01] fade-up">
          {/* Tags */}
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((t) => (
                <span key={t} className="badge bg-white/[0.05] text-gray-500 text-[10px]">
                  <Hash size={8} />{t}
                </span>
              ))}
            </div>
          )}

          {/* Steps */}
          <div>
            <p className="text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Steps</p>
            <ol className="space-y-1">
              {entry.steps.map((s, i) => (
                <li key={i} className="text-[11px] text-gray-500 flex gap-2">
                  <span className="text-indigo-500 font-mono flex-shrink-0">{i + 1}.</span>{s}
                </li>
              ))}
            </ol>
          </div>

          {/* Prompt preview */}
          <div>
            <p className="text-[10px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">User Prompt</p>
            <pre className="text-[11px] text-gray-400 font-mono whitespace-pre-wrap
                            bg-white/[0.03] rounded-lg p-2.5 leading-relaxed max-h-32 overflow-y-auto">
              {entry.user_prompt}
            </pre>
          </div>

          {/* Feedback */}
          {entry.feedback && (
            <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-amber-500/5
                            border border-amber-500/10 rounded-lg p-2.5">
              <MessageSquare size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{entry.feedback}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="btn-ghost py-1 px-2.5 text-xs gap-1.5"
            >
              <Star size={11} />
              {entry.rating ? 'Update rating' : 'Rate this'}
            </button>
            <button onClick={handleReuse} className="btn-ghost py-1 px-2.5 text-xs gap-1.5">
              <RotateCcw size={11} />
              Mark reused
            </button>
          </div>

          {showFeedback && (
            <FeedbackForm
              entryId={entry.id}
              currentRating={entry.rating}
              onDone={() => { setShowFeedback(false); onRefresh() }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Stats bar ──────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {[
        { label: 'Tasks',   value: stats.total_tasks,                icon: Hash,      color: 'text-indigo-400' },
        { label: 'Avg Rating', value: stats.avg_rating ? `${stats.avg_rating.toFixed(1)}★` : '—', icon: Star, color: 'text-amber-400' },
        { label: 'Reuses',  value: stats.total_reuses,               icon: RotateCcw, color: 'text-blue-400'   },
        { label: 'Top Tool', value: stats.top_tool || '—',           icon: Zap,       color: 'text-emerald-400'},
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="glass rounded-xl p-3 flex items-center gap-2.5">
          <Icon size={13} className={color} />
          <div>
            <p className="text-[10px] text-gray-600">{label}</p>
            <p className="text-xs font-bold text-gray-200">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Best prompts list ──────────────────────────────────────────────────────
function BestPrompts({ onRestore }) {
  const [best,    setBest]    = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBestPrompts({ limit: 5 })
      setBest(data.entries || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-[11px] text-gray-700 py-4 text-center">Loading…</div>
  if (!best.length) return (
    <div className="text-center py-6">
      <Trophy size={22} className="text-gray-800 mx-auto mb-2" />
      <p className="text-[11px] text-gray-700">Rate prompts to see top picks</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {best.map((entry, i) => {
        const meta = TOOL_META[entry.tool] || TOOL_META.ChatGPT
        return (
          <button
            key={entry.id}
            onClick={() => onRestore(entry)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-xl
                       bg-white/[0.02] border border-white/[0.06]
                       hover:bg-white/[0.05] hover:border-white/[0.1] transition-all"
          >
            <span className="text-sm font-bold text-gray-700 w-4 flex-shrink-0">#{i + 1}</span>
            <span className="text-base flex-shrink-0">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 font-medium truncate">{entry.task}</p>
              <div className="flex items-center gap-2 mt-1">
                <StarRating value={entry.rating} readonly />
                <span className="text-[10px] text-gray-600">
                  score {Math.round(entry.score * 100)}
                </span>
                {entry.reuse_count > 0 && (
                  <span className="text-[10px] text-indigo-400">{entry.reuse_count}× reused</span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Main MemoryPanel ───────────────────────────────────────────────────────
export default function MemoryPanel({ onRestoreEntry }) {
  const [tab,     setTab]     = useState('history')  // 'history' | 'best' | 'stats'
  const [history, setHistory] = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState('')
  const [toolFilter, setToolFilter] = useState('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 50, sort_by: 'newest' }
      if (search)     params.search = search
      if (toolFilter) params.tool   = toolFilter
      const data = await getHistory(params)
      setHistory(Array.isArray(data) ? data : (data.entries ?? []))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [search, toolFilter])

  const loadStats = useCallback(async () => {
    try {
      const data = await getMemoryStats()
      setStats(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadHistory(); loadStats() }, [loadHistory, loadStats])

  const handleDelete = async (id) => {
    await deleteHistoryEntry(id).catch(() => {})
    setHistory((prev) => prev.filter((e) => e.id !== id))
    loadStats()
  }

  const handleClear = async () => {
    if (!window.confirm('Clear all memory? This cannot be undone.')) return
    await clearHistory().catch(() => {})
    setHistory([])
    setStats(null)
    loadStats()
  }

  const TABS = [
    { id: 'history', label: 'History', icon: History },
    { id: 'best',    label: 'Best',    icon: Trophy  },
    { id: 'stats',   label: 'Stats',   icon: BarChart2 },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.07]
                      rounded-xl mb-4 flex-shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                        text-xs font-medium transition-all duration-150
                        ${tab === id
                          ? 'bg-indigo-600 text-white shadow-glow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                        }`}
          >
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      {/* ── History tab ─────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filters */}
          <div className="flex gap-2 mb-3 flex-shrink-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg
                         px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600
                         focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg
                         px-2 py-1.5 text-xs text-gray-400
                         focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="">All tools</option>
              <option value="ChatGPT">ChatGPT</option>
              <option value="Claude">Claude</option>
              <option value="Gemini">Gemini</option>
            </select>
            <button onClick={loadHistory} className="btn-icon" title="Refresh">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            {history.length > 0 && (
              <button onClick={handleClear} className="btn-icon text-rose-500 hover:text-rose-400" title="Clear all">
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {loading && !history.length ? (
              <div className="text-center py-8 text-[11px] text-gray-700">Loading…</div>
            ) : !history.length ? (
              <div className="text-center py-10">
                <History size={28} className="text-gray-800 mx-auto mb-2" />
                <p className="text-xs text-gray-700">No history yet</p>
                <p className="text-[10px] text-gray-800 mt-1">Run a task to see it here</p>
              </div>
            ) : (
              history.map((entry) => (
                <HistoryEntry
                  key={entry.id}
                  entry={entry}
                  onDelete={handleDelete}
                  onRefresh={loadHistory}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Best prompts tab ─────────────────────────────────────────────── */}
      {tab === 'best' && (
        <div className="flex-1 overflow-y-auto">
          <p className="text-[11px] text-gray-600 mb-3 leading-relaxed">
            Top prompts ranked by rating, reuse count, and recency.
            Rate prompts in History to see them here.
          </p>
          <BestPrompts onRestore={onRestoreEntry} />
        </div>
      )}

      {/* ── Stats tab ────────────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <StatsBar stats={stats} />

          {stats?.tool_breakdown && Object.keys(stats.tool_breakdown).length > 0 && (
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-3">
                Tool Breakdown
              </p>
              {Object.entries(stats.tool_breakdown).map(([tool, count]) => {
                const meta  = TOOL_META[tool] || TOOL_META.ChatGPT
                const total = stats.total_tasks || 1
                const pct   = Math.round((count / total) * 100)
                return (
                  <div key={tool} className="flex items-center gap-3 mb-2.5">
                    <span className="text-sm w-5">{meta.icon}</span>
                    <span className={`text-xs font-medium w-16 ${meta.color}`}>{tool}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          tool === 'ChatGPT' ? 'bg-emerald-500' :
                          tool === 'Claude'  ? 'bg-orange-500'  : 'bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-600 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {!stats && (
            <div className="text-center py-10">
              <BarChart2 size={28} className="text-gray-800 mx-auto mb-2" />
              <p className="text-xs text-gray-700">No data yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
