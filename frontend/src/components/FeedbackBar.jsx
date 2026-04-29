import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Sparkles, X, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { submitQuickFeedback } from '../api/client'

// ── States the bar can be in ───────────────────────────────────────────────
const STATE = {
  IDLE:       'idle',       // waiting for vote
  COMMENTING: 'commenting', // vote cast, comment box open
  LOADING:    'loading',    // request in flight
  DONE:       'done',       // response received
}

// ── Improvement pill ───────────────────────────────────────────────────────
function ImprovementPill({ improvement }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.05] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-left
                   hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={11} className="text-indigo-400 flex-shrink-0" />
          <span className="text-[11px] text-indigo-300 font-medium">{improvement.reason}</span>
        </div>
        {open
          ? <ChevronUp size={11} className="text-gray-600 flex-shrink-0" />
          : <ChevronDown size={11} className="text-gray-600 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-3 pb-2.5 fade-up">
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1">
            Field: {improvement.field}
          </p>
          <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
            {improvement.change}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main FeedbackBar ───────────────────────────────────────────────────────
export default function FeedbackBar({ entryId, onImproved }) {
  const [uiState,   setUiState]   = useState(STATE.IDLE)
  const [vote,      setVote]      = useState(null)   // 'up' | 'down'
  const [comment,   setComment]   = useState('')
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)

  // No entry yet — prompt hasn't been saved to memory
  if (!entryId) return null

  const handleVote = (v) => {
    setVote(v)
    setUiState(STATE.COMMENTING)
    setError(null)
  }

  const handleSubmit = async () => {
    setUiState(STATE.LOADING)
    try {
      const data = await submitQuickFeedback(entryId, vote, comment.trim() || null)
      setResult(data)
      setUiState(STATE.DONE)
      // Notify parent so PromptViewer can swap in the improved prompt
      if (data.improved && onImproved) {
        onImproved({
          system_prompt: data.system_prompt,
          user_prompt:   data.user_prompt,
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to submit feedback')
      setUiState(STATE.COMMENTING)
    }
  }

  const handleReset = () => {
    setUiState(STATE.IDLE)
    setVote(null)
    setComment('')
    setResult(null)
    setError(null)
  }

  // ── IDLE — show thumbs ─────────────────────────────────────────────────
  if (uiState === STATE.IDLE) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 glass rounded-xl fade-up">
        <span className="text-[11px] text-gray-600 flex-1">Was this prompt helpful?</span>
        <button
          onClick={() => handleVote('up')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     text-emerald-400 bg-emerald-500/10 border border-emerald-500/20
                     hover:bg-emerald-500/20 hover:border-emerald-500/40
                     transition-all duration-150 active:scale-95"
          aria-label="Thumbs up"
        >
          <ThumbsUp size={13} />
          <span>Yes</span>
        </button>
        <button
          onClick={() => handleVote('down')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     text-rose-400 bg-rose-500/10 border border-rose-500/20
                     hover:bg-rose-500/20 hover:border-rose-500/40
                     transition-all duration-150 active:scale-95"
          aria-label="Thumbs down"
        >
          <ThumbsDown size={13} />
          <span>No</span>
        </button>
      </div>
    )
  }

  // ── COMMENTING — show comment box ──────────────────────────────────────
  if (uiState === STATE.COMMENTING) {
    const isUp = vote === 'up'
    return (
      <div className={`glass rounded-xl overflow-hidden fade-up border
        ${isUp ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
        {/* Vote indicator */}
        <div className={`flex items-center gap-2 px-4 py-2.5
          ${isUp ? 'bg-emerald-500/[0.06]' : 'bg-rose-500/[0.06]'}`}>
          {isUp
            ? <ThumbsUp  size={13} className="text-emerald-400" />
            : <ThumbsDown size={13} className="text-rose-400" />
          }
          <span className={`text-xs font-semibold ${isUp ? 'text-emerald-300' : 'text-rose-300'}`}>
            {isUp ? 'Great! Any specific feedback?' : 'What could be better?'}
          </span>
          <button onClick={handleReset} className="ml-auto btn-icon w-5 h-5 text-gray-600">
            <X size={11} />
          </button>
        </div>

        {/* Comment input */}
        <div className="px-4 py-3 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isUp
              ? 'e.g. "Great structure, very clear examples"'
              : 'e.g. "Too verbose, needs more code examples, simpler language"'
            }
            rows={2}
            autoFocus
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg
                       px-3 py-2 text-xs text-gray-200 placeholder-gray-600
                       resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50
                       transition-all duration-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
          />

          {error && (
            <p className="text-[11px] text-rose-400">{error}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-700">⌘↵ to submit · optional comment</span>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="btn-ghost py-1 px-2.5 text-xs">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`btn-primary py-1.5 px-4 text-xs
                  ${isUp ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
              >
                {isUp ? '👍 Submit' : '👎 Submit & Improve'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LOADING ────────────────────────────────────────────────────────────
  if (uiState === STATE.LOADING) {
    return (
      <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 fade-up">
        <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-400
                         rounded-full animate-spin flex-shrink-0" />
        <span className="text-xs text-gray-500">
          {vote === 'down' ? 'Applying rule-based improvements…' : 'Recording feedback…'}
        </span>
      </div>
    )
  }

  // ── DONE — show result ─────────────────────────────────────────────────
  if (uiState === STATE.DONE && result) {
    const isUp = result.vote === 'up'
    return (
      <div className="space-y-3 fade-up">
        {/* Summary banner */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border
          ${isUp
            ? 'bg-emerald-500/[0.07] border-emerald-500/20'
            : result.improved
              ? 'bg-indigo-500/[0.07] border-indigo-500/20'
              : 'bg-white/[0.03] border-white/[0.07]'
          }`}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
            ${isUp ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`}>
            {result.improved
              ? <Sparkles size={13} className={isUp ? 'text-emerald-400' : 'text-indigo-400'} />
              : <Check    size={13} className="text-emerald-400" />
            }
          </div>
          <p className="text-xs text-gray-300 flex-1">{result.message}</p>
          <button onClick={handleReset} className="btn-icon w-6 h-6 text-gray-600">
            <X size={11} />
          </button>
        </div>

        {/* Improvements list */}
        {result.improvements?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1">
              {result.improvements.length} improvement{result.improvements.length !== 1 ? 's' : ''} applied
            </p>
            {result.improvements.map((imp, i) => (
              <ImprovementPill key={i} improvement={imp} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}
