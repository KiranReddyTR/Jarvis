# Frontend ↔ Backend Integration

## What's Connected

The React frontend and FastAPI backend are **fully integrated** and communicate via Axios over HTTP.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (http://localhost:5173)                     │
│  ├─ Vite dev server with proxy                              │
│  ├─ Axios client (frontend/src/api/client.js)               │
│  └─ useCommandCenter hook (state machine)                   │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP (proxied by Vite)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Backend (http://localhost:8000)                    │
│  ├─ /plan/   → PlannerService                               │
│  ├─ /route/  → RouterService                                │
│  ├─ /prompt/ → PromptGeneratorService                       │
│  ├─ /memory/ → MemoryStore (JSON file)                      │
│  └─ /health  → Health check                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## API Flow

When the user clicks **"Run"** in the sidebar:

1. **POST /plan/** — task → `{ task, task_type, steps, estimated_complexity }`
2. **POST /route/** — task + steps → `{ primary_tool, alternatives }`
3. **POST /prompt/** — task + steps + tool → `{ tool, system_prompt, user_prompt, tips }`
4. **POST /memory/** — save to history (fire-and-forget)

Each step updates the UI **immediately** as data arrives — no waiting for the full pipeline.

---

## Key Features

### ✅ Request Cancellation
- Uses `AbortController` to cancel in-flight requests when user clicks "New Task"
- Prevents race conditions and stale data

### ✅ Error Handling
- Axios interceptor normalizes FastAPI error shapes
- Pydantic validation errors (422) → readable messages
- Network errors → "Backend offline" banner with retry button

### ✅ Backend Health Check
- Polls `/health` every 12 seconds
- Sidebar footer shows live status: 🟢 online | 🔴 offline
- "Run" button disabled when backend is unreachable

### ✅ History Management
- Backend returns `{ total, entries }` — frontend unwraps `entries`
- Click any history item → restores task, plan, routing, and prompts
- Delete individual entries or clear all

### ✅ Partial Results
- Plan shows while routing is in progress
- Tools show while prompt is generating
- Tabs auto-advance as pipeline progresses

### ✅ Loading States
- Skeleton loaders for each section (plan, tools, prompts)
- Spinner in "Run" button
- Pulsing dots on active tabs

---

## Configuration

### Vite Proxy (frontend/vite.config.js)
```js
server: {
  port: 5173,
  proxy: {
    '/plan':   'http://localhost:8000',
    '/route':  'http://localhost:8000',
    '/prompt': 'http://localhost:8000',
    '/memory': 'http://localhost:8000',
    '/health': 'http://localhost:8000',
  },
}
```

This means the frontend makes requests to `/plan/` and Vite forwards them to `http://localhost:8000/plan/`.

### CORS (backend/main.py)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Testing the Integration

### 1. Start both servers

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### 2. Open the app
http://localhost:5173

### 3. Run a task
1. Type: "Build a REST API with JWT authentication"
2. Click **Run** (or press `⌘↵`)
3. Watch the pipeline progress bar animate
4. See plan → tools → prompts appear in real-time

### 4. Test error handling
1. Stop the backend (`Ctrl+C` in Terminal 1)
2. Try to run a task
3. See "Backend offline" banner + retry button
4. Restart backend → footer turns green

### 5. Test history
1. Run 2–3 tasks
2. Click any history item in the sidebar
3. See it restore to the main panel
4. Delete an entry → it disappears
5. Click "Clear all" → history empties

---

## API Client Reference

All backend calls go through `frontend/src/api/client.js`:

| Function | Endpoint | Returns |
|---|---|---|
| `planTask(task, signal)` | `POST /plan/` | `{ task, task_type, steps, estimated_complexity }` |
| `routeTask(task, steps, signal)` | `POST /route/` | `{ primary_tool, alternatives }` |
| `generatePrompt(task, steps, tool, signal)` | `POST /prompt/` | `{ tool, system_prompt, user_prompt, tips }` |
| `getHistory(params)` | `GET /memory/` | `{ total, entries }` |
| `saveToHistory(payload)` | `POST /memory/` | `MemoryEntry` |
| `deleteHistoryEntry(id)` | `DELETE /memory/{id}` | `{ success, id }` |
| `clearHistory()` | `DELETE /memory/clear` | `{ success, message }` |
| `checkHealth()` | `GET /health` | `{ status: 'ok' }` or `null` |

All functions accept an optional `signal` (AbortSignal) for request cancellation.

---

## Troubleshooting

### "Backend offline" even though it's running
- Check the backend is on port 8000: `http://localhost:8000/docs`
- Check Vite proxy config in `frontend/vite.config.js`
- Restart both servers

### History not loading
- Check `backend/data/history.json` exists
- Check browser console for errors
- Verify `/memory/` returns `{ total, entries }` shape

### Validation errors not showing
- Check `frontend/src/api/client.js` response interceptor
- FastAPI validation errors come as `{ detail: [...] }` array
- Interceptor converts them to readable strings

### Requests timing out
- Default timeout is 20s (set in `api.create({ timeout: 20000 })`)
- Increase if needed for slow networks

---

## What's Next

- [ ] Add WebSocket for real-time streaming (e.g., LLM token streaming)
- [ ] Add search/filter UI for history (backend already supports `?search=` and `?tool=`)
- [ ] Add pagination controls for history (backend supports `?limit=` and `?offset=`)
- [ ] Add export history as JSON/CSV
- [ ] Add "Copy prompt" button that copies both system + user prompts
- [ ] Add keyboard shortcuts (e.g., `Cmd+K` to focus task input)
