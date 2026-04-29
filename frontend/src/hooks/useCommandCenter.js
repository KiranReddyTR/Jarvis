import { useState, useCallback, useRef } from 'react'
import { planTask, routeTask, generatePrompt, saveToHistory } from '../api/client'

// ─── Stage machine ─────────────────────────────────────────────────────────
export const STAGES = {
  IDLE:      'idle',
  PLANNING:  'planning',
  ROUTING:   'routing',
  PROMPTING: 'prompting',
  DONE:      'done',
  ERROR:     'error',
}

export function useCommandCenter() {
  const [stage,       setStage]       = useState(STAGES.IDLE)
  const [error,       setError]       = useState(null)
  const [plan,        setPlan]        = useState(null)
  const [routing,     setRouting]     = useState(null)
  const [promptData,  setPromptData]  = useState(null)
  const [selectedTool, setSelectedTool] = useState(null)
  const [entryId,     setEntryId]     = useState(null)  // memory entry ID for feedback

  // Keep a ref to the current AbortController so we can cancel in-flight
  // requests if the user clicks "New Task" mid-run.
  const abortRef = useRef(null)

  // ── reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStage(STAGES.IDLE)
    setError(null)
    setPlan(null)
    setRouting(null)
    setPromptData(null)
    setSelectedTool(null)
    setEntryId(null)
  }, [])

  // ── restore from history ─────────────────────────────────────────────────
  const restore = useCallback((entry) => {
    setPlan({
      task:                 entry.task,
      task_type:            'general',
      steps:                entry.steps,
      estimated_complexity: 'Moderate',
    })
    setRouting({
      primary_tool: {
        tool:       entry.tool,
        reason:     `Restored from history`,
        confidence: 1,
        strengths:  [],
      },
      alternatives: [],
    })
    setPromptData({
      tool:          entry.tool,
      system_prompt: entry.system_prompt,
      user_prompt:   entry.user_prompt,
      tips:          [],
    })
    setSelectedTool(entry.tool)
    setError(null)
    setStage(STAGES.DONE)
  }, [])

  // ── run pipeline ─────────────────────────────────────────────────────────
  const run = useCallback(async (task) => {
    if (!task.trim()) return

    // Cancel any previous in-flight run
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller

    // Clear previous results immediately so UI feels responsive
    setError(null)
    setPlan(null)
    setRouting(null)
    setPromptData(null)
    setSelectedTool(null)

    try {
      // ── Step 1: Plan ──────────────────────────────────────────────────
      setStage(STAGES.PLANNING)
      const planResult = await planTask(task, signal)
      setPlan(planResult)

      // ── Step 2: Route ─────────────────────────────────────────────────
      setStage(STAGES.ROUTING)
      const routeResult = await routeTask(planResult.task, planResult.steps, signal)
      setRouting(routeResult)
      setSelectedTool(routeResult.primary_tool.tool)

      // ── Step 3: Prompt ────────────────────────────────────────────────
      setStage(STAGES.PROMPTING)
      const promptResult = await generatePrompt(
        planResult.task,
        planResult.steps,
        routeResult.primary_tool.tool,
        signal,
        { task_type: planResult.task_type },
      )
      setPromptData(promptResult)

      // ── Step 4: Persist (fire-and-forget, don't block UI) ─────────────
      saveToHistory({
        task:          planResult.task,
        task_type:     planResult.task_type,
        steps:         planResult.steps,
        tool:          routeResult.primary_tool.tool,
        system_prompt: promptResult.system_prompt,
        user_prompt:   promptResult.user_prompt,
      }).then((saved) => {
        if (saved?.id) setEntryId(saved.id)
      }).catch(() => {/* non-critical */})

      setStage(STAGES.DONE)
    } catch (err) {
      // Ignore cancellation errors (user clicked "New Task")
      if (err.name === 'CanceledError' || err.name === 'AbortError') return
      setError(err.message || 'Something went wrong')
      setStage(STAGES.ERROR)
    }
  }, [])

  // ── switch tool (re-generate prompt only) ────────────────────────────────
  const switchTool = useCallback(async (tool) => {
    if (!plan || tool === selectedTool) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSelectedTool(tool)
    setStage(STAGES.PROMPTING)
    setPromptData(null)

    try {
      const promptResult = await generatePrompt(
        plan.task, plan.steps, tool, controller.signal,
      )
      setPromptData(promptResult)
      setStage(STAGES.DONE)
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return
      setError(err.message || 'Failed to generate prompt')
      setStage(STAGES.ERROR)
    }
  }, [plan, selectedTool])

  // ── dismiss error (keep partial results visible) ─────────────────────────
  const dismissError = useCallback(() => {
    setError(null)
    // If we have at least a plan, show DONE so partial results stay visible
    setStage(plan ? STAGES.DONE : STAGES.IDLE)
  }, [plan])

  return {
    stage, error,
    plan, routing, promptData, selectedTool, entryId,
    run, reset, restore, switchTool, dismissError,
  }
}
