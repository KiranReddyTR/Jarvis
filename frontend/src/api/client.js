/**
 * API client — all backend communication goes through here.
 * Vite proxies /plan, /route, /prompt, /memory → http://localhost:8000
 */
import axios from 'axios'

// ─── Axios instance ────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// ─── Response interceptor — normalise error messages ──────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // FastAPI validation errors come as { detail: [...] }
    const detail = err?.response?.data?.detail
    if (Array.isArray(detail)) {
      // Pydantic v2 validation error list → readable string
      const msg = detail
        .map((d) => `${d.loc?.slice(1).join('.')} — ${d.msg}`)
        .join('; ')
      err.message = msg
    } else if (typeof detail === 'string') {
      err.message = detail
    } else if (!err.response) {
      err.message =
        'Cannot reach the backend. Make sure it is running on http://localhost:8000'
    }
    return Promise.reject(err)
  }
)

// ─── /plan ─────────────────────────────────────────────────────────────────
/** @returns {{ task, task_type, steps, estimated_complexity }} */
export const planTask = (task, signal) =>
  api.post('/plan/', { task }, { signal }).then((r) => r.data)

// ─── /route ────────────────────────────────────────────────────────────────
/** @returns {{ primary_tool, alternatives }} */
export const routeTask = (task, steps, signal) =>
  api.post('/route/', { task, steps }, { signal }).then((r) => r.data)

// ─── /prompt ───────────────────────────────────────────────────────────────
/** @returns {{ tool, system_prompt, user_prompt, sections, tips, saved_id }} */
export const generatePrompt = (task, steps, tool, signal, opts = {}) =>
  api.post('/prompt/', { task, steps, tool, ...opts }, { signal }).then((r) => r.data)

/** @returns {SavedPrompt[]} */
export const getSavedPrompts = (params = {}) =>
  api.get('/prompt/saved', { params }).then((r) => r.data)

/** @returns {SavedPrompt} */
export const getSavedPrompt = (id) =>
  api.get(`/prompt/saved/${id}`).then((r) => r.data)

/** @returns {SavedPrompt} */
export const usePrompt = (id) =>
  api.post(`/prompt/saved/${id}/use`).then((r) => r.data)

/** @returns {{ success, id }} */
export const deleteSavedPrompt = (id) =>
  api.delete(`/prompt/saved/${id}`).then((r) => r.data)

/** @returns {TemplateInfo[]} */
export const getPromptTemplates = () =>
  api.get('/prompt/templates').then((r) => r.data)

/** @returns {string[]} */
export const getPromptTags = () =>
  api.get('/prompt/saved/tags').then((r) => r.data)

// ─── /memory ───────────────────────────────────────────────────────────────
/** @returns {{ total, entries }} */
export const getHistory = (params = {}) =>
  api.get('/memory/', { params }).then((r) => r.data)

/** @returns {MemoryEntry} */
export const saveToHistory = (payload) =>
  api.post('/memory/', payload).then((r) => r.data)

/** @returns {MemoryEntry} */
export const getMemoryEntry = (id) =>
  api.get(`/memory/${id}`).then((r) => r.data)

/** @returns {MemoryEntry} */
export const submitFeedback = (id, rating, comment = null, reused = false) =>
  api.post(`/memory/${id}/feedback`, { rating, comment, reused }).then((r) => r.data)

/** @returns {MemoryEntry} */
export const markReused = (id) =>
  api.post(`/memory/${id}/reuse`).then((r) => r.data)

/** @returns {{ total, entries }} */
export const getBestPrompts = (params = {}) =>
  api.get('/memory/best', { params }).then((r) => r.data)

/** @returns {StatsResponse} */
export const getMemoryStats = () =>
  api.get('/memory/stats').then((r) => r.data)

/** @returns {{ success, id }} */
export const deleteHistoryEntry = (id) =>
  api.delete(`/memory/${id}`).then((r) => r.data)

/** @returns {{ success, deleted, message }} */
export const clearHistory = () =>
  api.delete('/memory/clear').then((r) => r.data)

// ─── /feedback ─────────────────────────────────────────────────────────────
/** @returns {FeedbackResponse} */
export const submitQuickFeedback = (entry_id, vote, comment = null) =>
  api.post('/feedback/', { entry_id, vote, comment }).then((r) => r.data)

/** @returns {{ total_rated, thumbs_up, thumbs_down, approval_rate }} */
export const getFeedbackStats = () =>
  api.get('/feedback/stats').then((r) => r.data)

// ─── /health ───────────────────────────────────────────────────────────────
// Call backend directly (not through Vite proxy) so it works even if
// the proxy hasn't picked up the /health route yet.
/** @returns {{ status: 'ok' } | null} */
export const checkHealth = async () => {
  try {
    const res = await fetch('http://localhost:8000/health', {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
