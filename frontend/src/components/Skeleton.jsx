export function SkeletonLine({ width = 'w-full', height = 'h-3' }) {
  return <div className={`skeleton ${width} ${height}`} />
}

export function SkeletonPlan() {
  return (
    <div className="space-y-4 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="skeleton w-4 h-4 rounded" />
          <SkeletonLine width="w-32" height="h-3" />
        </div>
        <SkeletonLine width="w-16" height="h-5 rounded-full" />
      </div>
      {/* Steps */}
      <div className="space-y-3">
        {[90, 75, 85, 60, 80, 70, 65].map((w, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="skeleton w-6 h-6 rounded-lg flex-shrink-0" />
            <SkeletonLine width={`w-[${w}%]`} height="h-3 mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonTools() {
  return (
    <div className="space-y-4 fade-up">
      <div className="flex items-center gap-2">
        <div className="skeleton w-4 h-4 rounded" />
        <SkeletonLine width="w-28" height="h-3" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton rounded-xl h-36" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonPrompt() {
  return (
    <div className="space-y-4 fade-up">
      <div className="flex items-center gap-2">
        <div className="skeleton w-4 h-4 rounded" />
        <SkeletonLine width="w-36" height="h-3" />
      </div>
      <div className="skeleton rounded-xl h-24" />
      <div className="skeleton rounded-xl h-40" />
    </div>
  )
}
