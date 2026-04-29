import { useState, useEffect } from 'react'
import PipelineBar from './PipelineBar'
import PlanDisplay from './PlanDisplay'
import ToolSelector from './ToolSelector'
import PromptViewer from './PromptViewer'
import ErrorBanner from './ErrorBanner'
import EmptyState from './EmptyState'
import MemoryPanel from './MemoryPanel'
import { STAGES } from '../hooks/useCommandCenter'

const TABS = [
  { id: 'plan',   label: 'Plan',     icon: '📋' },
  { id: 'tools',  label: 'AI Tools', icon: '🤖' },
  { id: 'prompt', label: 'Prompts',  icon: '⚡' },
  { id: 'memory', label: 'Memory',   icon: '🧠', always: true },
]

export default function MainPanel({
  stage, error,
  plan, routing, promptData, selectedTool, entryId,
  onSelectTool, onDismissError, onRestoreEntry,
}) {
  const [activeTab, setActiveTab] = useState('plan')
  const isIdle = stage === STAGES.IDLE

  // ── Auto-advance tab as pipeline progresses ───────────────────────────────
  useEffect(() => {
    if (stage === STAGES.PLANNING)  setActiveTab('plan')
    if (stage === STAGES.ROUTING)   setActiveTab('tools')
    if (stage === STAGES.PROMPTING || stage === STAGES.DONE) setActiveTab('prompt')
  }, [stage])

  // A tab is "loading" when its stage is active
  const tabLoading = {
    plan:   stage === STAGES.PLANNING,
    tools:  stage === STAGES.ROUTING,
    prompt: stage === STAGES.PROMPTING,
  }

  // A tab is "available" once its data exists OR it's currently loading
  const tabAvailable = {
    plan:   !!plan   || tabLoading.plan,
    tools:  !!routing || tabLoading.tools,
    prompt: !!promptData || tabLoading.prompt,
    memory: true,  // always available
  }

  // Show partial results as they arrive — don't wait for DONE
  const showPlan    = !!plan
  const showTools   = !!routing
  const showPrompt  = !!promptData

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#0c0c14]/70 backdrop-blur-md">
        <div className="px-8 pt-5 pb-0 flex items-end gap-1">
          {TABS.map((tab) => {
            const available = tabAvailable[tab.id]
            const loading   = tabLoading[tab.id]
            const active    = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => available && setActiveTab(tab.id)}
                disabled={!available}
                aria-selected={active}
                role="tab"
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                  rounded-t-xl border-t border-l border-r transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50
                  ${active
                    ? 'text-white bg-[#0a0a0f] border-white/[0.08] border-b-[#0a0a0f] -mb-px z-10'
                    : available
                      ? 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/[0.03]'
                      : 'text-gray-700 border-transparent cursor-not-allowed opacity-40'
                  }
                `}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span>{tab.label}</span>

                {/* Loading pulse */}
                {loading && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                )}
                {/* Done dot */}
                {tabAvailable[tab.id] && !loading && !active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Pipeline progress bar ─────────────────────────────────────────── */}
      {!isIdle && (
        <div className="flex-shrink-0 px-8 pt-5">
          <PipelineBar stage={stage} />
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex-shrink-0 px-8 pt-4">
          <ErrorBanner message={error} onDismiss={onDismissError} />
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6" role="tabpanel">
        {isIdle ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl">

            {activeTab === 'plan' && (
              <PlanDisplay
                plan={showPlan ? plan : null}
                loading={tabLoading.plan}
              />
            )}

            {activeTab === 'tools' && (
              <ToolSelector
                routing={showTools ? routing : null}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
                loading={tabLoading.tools}
              />
            )}

            {activeTab === 'prompt' && (
              <PromptViewer
                promptData={showPrompt ? promptData : null}
                loading={tabLoading.prompt}
                entryId={entryId}
              />
            )}

            {activeTab === 'memory' && (
              <MemoryPanel onRestoreEntry={onRestoreEntry} />
            )}

          </div>
        )}
      </div>
    </div>
  )
}
