import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import NeuronBackground from './components/NeuronBackground'
import { useCommandCenter, STAGES } from './hooks/useCommandCenter'
import { useBackendHealth } from './hooks/useBackendHealth'
import { getHistory, deleteHistoryEntry, clearHistory } from './api/client'

export default function App() {
  const {
    stage, error,
    plan, routing, promptData, selectedTool, entryId,
    run, reset, restore, switchTool, dismissError,
  } = useCommandCenter()

  const { online, checking, recheck } = useBackendHealth(15000)

  const [task,    setTask]    = useState('')
  const [history, setHistory] = useState([])

  // ── Load history ──────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const data = await getHistory({ limit: 50 })
      // Backend returns { total, entries } — unwrap entries
      setHistory(Array.isArray(data) ? data : (data.entries ?? []))
    } catch {
      // Backend may be offline — silently ignore
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // Refresh history whenever a run completes
  useEffect(() => {
    if (stage === STAGES.DONE) loadHistory()
  }, [stage, loadHistory])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const trimmed = task.trim()
    if (trimmed) run(trimmed)
  }, [task, run])

  const handleReset = useCallback(() => {
    setTask('')
    reset()
  }, [reset])

  const handleRestore = useCallback((entry) => {
    setTask(entry.task)
    restore(entry)
  }, [restore])

  const handleDeleteHistory = useCallback(async (id) => {
    try {
      await deleteHistoryEntry(id)
    } catch { /* ignore */ }
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleClearHistory = useCallback(async () => {
    try {
      await clearHistory()
    } catch { /* ignore */ }
    setHistory([])
  }, [])

  const isDone    = stage === STAGES.DONE || stage === STAGES.ERROR
  const isLoading = [STAGES.PLANNING, STAGES.ROUTING, STAGES.PROMPTING].includes(stage)

  return (
    <div className="h-screen flex overflow-hidden bg-[#0a0a0f] bg-grid">
      {/* Neuron animated background — fixed, behind everything */}
      <NeuronBackground />

      {/* UI layer — sits above the canvas */}
      <div className="relative z-10 flex w-full h-full overflow-hidden">
        <Sidebar
        task={task}
        onTaskChange={setTask}
        onSubmit={handleSubmit}
        onReset={handleReset}
        isLoading={isLoading}
        isDone={isDone}
        history={history}
        onRestoreHistory={handleRestore}
        onDeleteHistory={handleDeleteHistory}
        onClearHistory={handleClearHistory}
        backendOnline={online}
        backendChecking={checking}
        onRecheckBackend={recheck}
      />

      <MainPanel
        stage={stage}
        error={error}
        plan={plan}
        routing={routing}
        promptData={promptData}
        selectedTool={selectedTool}
        entryId={entryId}
        onSelectTool={switchTool}
        onDismissError={dismissError}
        onRestoreEntry={handleRestore}
      />
      </div>
    </div>
  )
}
