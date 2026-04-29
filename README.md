# AI Command Center

A full-stack dashboard that accepts a user task, breaks it into steps, suggests the best AI tool (ChatGPT, Claude, Gemini), generates structured prompts, and stores history.

---

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React 18 + Tailwind CSS |
| Backend  | Python FastAPI          |
| Storage  | JSON file (local)       |

---

## Project Structure

```
ai-command-center/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── data/                    # history.json stored here
│   ├── routers/
│   │   ├── plan.py              # POST /plan/
│   │   ├── route.py             # POST /route/
│   │   ├── prompt.py            # POST /prompt/
│   │   └── memory.py            # GET/POST/DELETE /memory/
│   └── services/
│       ├── planner.py           # Task breakdown logic
│       ├── router.py            # AI tool scoring & selection
│       ├── prompt_generator.py  # Prompt crafting
│       └── memory_store.py      # JSON persistence
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        ├── api/client.js        # Axios API calls
        ├── hooks/
        │   └── useCommandCenter.js  # Core state machine
        └── components/
            ├── Header.jsx
            ├── TaskInput.jsx
            ├── PipelineStatus.jsx
            ├── PlanDisplay.jsx
            ├── ToolSelector.jsx
            ├── PromptViewer.jsx
            ├── HistoryPanel.jsx
            └── ErrorBanner.jsx
```

---

## Run Instructions

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at: http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

### 2. Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at: http://localhost:5173

---

## API Endpoints

| Method | Endpoint    | Description                          |
|--------|-------------|--------------------------------------|
| POST   | /plan/      | Break a task into steps              |
| POST   | /route/     | Suggest the best AI tool             |
| POST   | /prompt/    | Generate structured prompts          |
| GET    | /memory/    | Retrieve task history                |
| POST   | /memory/    | Save a task to history               |
| DELETE | /memory/{id}| Delete a history entry               |
| DELETE | /memory/    | Clear all history                    |

---

## How It Works

1. **Plan** — The planner detects the task type (code, write, analyze, creative, data, explain) and returns a tailored step-by-step breakdown.
2. **Route** — The router scores ChatGPT, Claude, and Gemini against the task using keyword matching and returns a ranked recommendation with confidence scores.
3. **Prompt** — The prompt generator crafts a system prompt and a structured user prompt optimized for the selected tool, plus usage tips.
4. **Memory** — Every completed run is saved to `backend/data/history.json` and displayed in the History panel.
