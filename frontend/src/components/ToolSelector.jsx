import { Star, Zap } from 'lucide-react'
import { SkeletonTools } from './Skeleton'

const TOOLS = {
  ChatGPT: {
    icon: '🤖',
    gradient: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/20',
    activeBorder: 'border-emerald-500/60',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-400',
    label: 'text-emerald-400',
  },
  Claude: {
    icon: '🧠',
    gradient: 'from-orange-500/10 to-amber-500/5',
    border: 'border-orange-500/20',
    activeBorder: 'border-orange-500/60',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.12)]',
    bar: 'bg-orange-500',
    badge: 'bg-orange-500/10 text-orange-400',
    label: 'text-orange-400',
  },
  Gemini: {
    icon: '✨',
    gradient: 'from-blue-500/10 to-indigo-500/5',
    border: 'border-blue-500/20',
    activeBorder: 'border-blue-500/60',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.12)]',
    bar: 'bg-blue-500',
    badge: 'bg-blue-500/10 text-blue-400',
    label: 'text-blue-400',
  },
}

function ConfidenceBar({ value, color }) {
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-600 font-medium">Confidence</span>
        <span className="text-[10px] font-bold text-gray-400">{pct}%</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ToolCard({ suggestion, isPrimary, isSelected, onSelect }) {
  const t = TOOLS[suggestion.tool] || TOOLS.ChatGPT

  return (
    <button
      onClick={() => onSelect(suggestion.tool)}
      className={`
        relative w-full text-left p-4 rounded-2xl border transition-all duration-200
        bg-gradient-to-br ${t.gradient}
        ${isSelected ? `${t.activeBorder} ${t.glow}` : t.border}
        hover:scale-[1.01] active:scale-[0.99]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
      `}
    >
      {isPrimary && (
        <div className="absolute -top-2 -right-2 badge bg-indigo-600 text-white border-0 shadow-glow-sm">
          <Star size={8} className="fill-white" /> Best
        </div>
      )}

      {/* Tool header */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-2xl">{t.icon}</span>
        <div>
          <p className={`text-sm font-bold ${t.label}`}>{suggestion.tool}</p>
          {isSelected && (
            <div className="flex items-center gap-1 mt-0.5">
              <Zap size={9} className="text-indigo-400" />
              <span className="text-[10px] text-indigo-400 font-medium">Selected</span>
            </div>
          )}
        </div>
      </div>

      {/* Confidence */}
      <ConfidenceBar value={suggestion.confidence} color={t.bar} />

      {/* Strengths */}
      <div className="mt-3 flex flex-wrap gap-1">
        {suggestion.strengths.slice(0, 3).map((s) => (
          <span key={s} className={`badge text-[10px] ${t.badge}`}>{s}</span>
        ))}
      </div>
    </button>
  )
}

export default function ToolSelector({ routing, selectedTool, onSelectTool, loading }) {
  if (loading) return <SkeletonTools />
  if (!routing) return null

  const allTools = [routing.primary_tool, ...routing.alternatives]

  return (
    <div className="space-y-5 stagger">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <span className="text-sm">🤖</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">AI Tool Routing</h2>
          <p className="text-[11px] text-gray-600 mt-0.5">Click a card to switch tools</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {allTools.map((s, i) => (
          <ToolCard
            key={s.tool}
            suggestion={s}
            isPrimary={i === 0}
            isSelected={selectedTool === s.tool}
            onSelect={onSelectTool}
          />
        ))}
      </div>

      {/* Reason */}
      <div className="glass px-4 py-3 rounded-xl flex items-start gap-2.5">
        <span className="text-base flex-shrink-0">💡</span>
        <p className="text-xs text-gray-500 leading-relaxed">{routing.primary_tool.reason}</p>
      </div>
    </div>
  )
}
