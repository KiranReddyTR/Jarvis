import { Check, Loader2 } from 'lucide-react'
import { STAGES } from '../hooks/useCommandCenter'

const STEPS = [
  { key: STAGES.PLANNING,  label: 'Planning',  icon: '📋' },
  { key: STAGES.ROUTING,   label: 'Routing',   icon: '🤖' },
  { key: STAGES.PROMPTING, label: 'Prompting', icon: '⚡' },
]

const ORDER = [STAGES.PLANNING, STAGES.ROUTING, STAGES.PROMPTING, STAGES.DONE]

function status(stepKey, stage) {
  if (stage === STAGES.IDLE) return 'idle'
  const ci = ORDER.indexOf(stage)
  const si = ORDER.indexOf(stepKey)
  if (si < ci || stage === STAGES.DONE) return 'done'
  if (si === ci) return 'active'
  return 'idle'
}

export default function PipelineBar({ stage }) {
  if (stage === STAGES.IDLE) return null

  return (
    <div className="glass px-6 py-4 fade-up">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const s = status(step.key, stage)
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2.5">
                {/* Circle */}
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                  transition-all duration-300
                  ${s === 'done'   ? 'bg-emerald-500/20 border border-emerald-500/50' : ''}
                  ${s === 'active' ? 'bg-indigo-500/20 border border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.3)]' : ''}
                  ${s === 'idle'   ? 'bg-white/[0.04] border border-white/[0.08]' : ''}
                `}>
                  {s === 'done'   && <Check size={12} className="text-emerald-400" strokeWidth={2.5} />}
                  {s === 'active' && <Loader2 size={12} className="text-indigo-400 animate-spin" />}
                  {s === 'idle'   && <span className="text-[10px]">{step.icon}</span>}
                </div>
                <span className={`text-xs font-medium transition-colors duration-200
                  ${s === 'idle' ? 'text-gray-600' : s === 'active' ? 'text-indigo-300' : 'text-gray-300'}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-3 h-px relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.06]" />
                  <div
                    className="absolute inset-y-0 left-0 bg-indigo-500/50 transition-all duration-700"
                    style={{ width: s === 'done' ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          )
        })}

        {stage === STAGES.DONE && (
          <div className="ml-4 flex items-center gap-1.5 badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            <Check size={10} strokeWidth={3} />
            <span>Complete</span>
          </div>
        )}
      </div>
    </div>
  )
}
