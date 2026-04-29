import { ListChecks, Gauge, CheckCircle2 } from 'lucide-react'
import { SkeletonPlan } from './Skeleton'

const COMPLEXITY = {
  Simple:   { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  Moderate: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       dot: 'bg-amber-400' },
  Complex:  { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',          dot: 'bg-rose-400' },
}

export default function PlanDisplay({ plan, loading }) {
  if (loading) return <SkeletonPlan />
  if (!plan) return null

  const cx = COMPLEXITY[plan.estimated_complexity] || COMPLEXITY.Moderate

  return (
    <div className="space-y-5 stagger">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ListChecks size={14} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Execution Plan</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">{plan.steps.length} steps identified</p>
          </div>
        </div>
        <div className={`badge border ${cx.cls}`}>
          <div className={`status-dot ${cx.dot}`} />
          <Gauge size={10} />
          {plan.estimated_complexity}
        </div>
      </div>

      {/* Task recap */}
      <div className="glass px-4 py-3 rounded-xl">
        <p className="text-[10px] text-gray-600 mb-1 font-semibold uppercase tracking-wider">Task</p>
        <p className="text-sm text-gray-300 leading-relaxed">{plan.task}</p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {plan.steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]
                       hover:bg-white/[0.04] hover:border-white/[0.09] transition-all duration-150 group"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/20
                            flex items-center justify-center mt-0.5">
              <span className="text-[10px] font-bold text-indigo-400">{i + 1}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed group-hover:text-gray-200 transition-colors duration-150 flex-1">
              {step}
            </p>
            <CheckCircle2 size={14} className="text-gray-800 group-hover:text-indigo-500/50 transition-colors flex-shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  )
}
