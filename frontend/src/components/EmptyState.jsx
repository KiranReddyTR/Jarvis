export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-8 fade-up">
      {/* Glow orb */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10
                        border border-indigo-500/20 flex items-center justify-center
                        shadow-[0_0_60px_rgba(99,102,241,0.15)]">
          <span className="text-4xl">🚀</span>
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500/30
                        border border-indigo-500/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Ready to Command</h2>
      <p className="text-sm text-gray-600 max-w-xs leading-relaxed mb-8">
        Enter a task in the sidebar. The AI Command Center will plan it,
        route it to the best AI tool, and generate optimized prompts.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { icon: '📋', label: 'Smart Planning' },
          { icon: '🤖', label: 'AI Routing' },
          { icon: '⚡', label: 'Prompt Generation' },
          { icon: '📚', label: 'History' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                      bg-white/[0.03] border border-white/[0.07] text-xs text-gray-500">
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
