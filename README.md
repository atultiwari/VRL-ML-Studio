# VRL ML Studio

A visual, drag-and-drop machine learning workflow platform for tabular data — no code required.

> Build ML pipelines like flowcharts. Export them as Python. Version them like code.

---

## What it does

- Drag algorithm nodes onto a canvas and connect them to form a pipeline
- Configure each node's parameters via a side panel (no coding)
- The backend executes the DAG and streams real-time status via WebSocket
- Each node shows a visual preview of its output (table, chart, metrics)
- Projects are saved as Git repositories and can be exported as Python scripts or Jupyter notebooks

Inspired by Orange Data Mining — designed for the browser with Git versioning and Google Colab export built in.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- pip / npm

---

## Quick Start

```bash
# Install all dependencies (first time only)
make install

# Start both frontend (port 3000) and backend (port 8000)
make dev
```

Then open http://localhost:3000

To stop both servers: `make stop` (from a second terminal) or `Ctrl+C`.

---

## Commands

| Command | Description |
|---|---|
| `make dev` | Start frontend + backend with hot reload |
| `make stop` | Stop background dev servers |
| `make dev-be` | Backend only |
| `make dev-fe` | Frontend only |
| `make test` | Run all tests |
| `make test-be` | Backend tests + coverage |
| `make test-fe` | Frontend unit tests |
| `make test-e2e` | Playwright E2E tests |
| `make build` | Production frontend build |
| `make lint` | ESLint + Ruff |
| `make format` | Prettier + Black |
| `make install` | Install all dependencies |
| `make clean` | Remove build artifacts |

---

## Architecture

```
Browser (React 18 + React Flow)
  │
  ├─ REST (HTTP/JSON)  ──▶  FastAPI (port 8000)
  │   POST /execute              │
  │   GET  /nodes                │  dag_executor.py
  │   POST /project/save         │   → topological sort
  │   POST /export/python        │   → dispatch each node
  │                              │   → cache intermediate outputs
  └─ WebSocket  ◀────────────────┘  real-time node status stream
       ws://localhost:8000/ws
```

### Node Package System

Every algorithm is a self-contained **node package** — a directory with four files:

```
my_node/
├── manifest.json    # identity, ports, category
├── executor.py      # execute(inputs, parameters, context) → dict
├── parameters.json  # parameter schema for the UI panel
└── ui.json          # icon, colour, badge
```

Built-in nodes live in `backend/node_packages/builtin/`. Custom nodes can be imported as `.vrlnode` zip archives.

---

## Project Structure

```
vrl-ml-studio/
├── frontend/                  # React 18 + TypeScript + Vite (port 3000)
│   └── src/
│       ├── components/
│       │   ├── canvas/        # React Flow canvas + custom NodeCard
│       │   ├── sidebar/       # Node library panel (drag-to-canvas)
│       │   ├── toolbar/       # Top bar: run, undo/redo, save, export
│       │   └── ui/            # Shared primitives
│       ├── hooks/             # useNodeRegistry, useWebSocket, …
│       ├── store/             # Zustand stores (pipeline, execution, project, …)
│       └── lib/               # API client, types, utilities
├── backend/                   # FastAPI + Python 3.10+ (port 8000)
│   ├── main.py
│   ├── routers/               # execute, nodes, project, export
│   ├── services/              # dag_executor, node_registry, cache, git_service
│   ├── models/                # Pydantic schemas
│   └── node_packages/
│       └── builtin/           # All built-in nodes as node packages
├── docker-compose.yml
├── Makefile
└── CLAUDE.md                  # Full project spec and development guide
```

---

## Development Stages

This project is built in 12 stages. Each stage is gate-approved before the next begins. See `CLAUDE.md` for the full specification of every stage.

| Stage | Description | Status |
|---|---|---|
| 1 | Scaffolding + Node Package Foundation | ✅ Complete |
| 2 | Canvas Core (React Flow, drag-drop, undo/redo) | ✅ Complete |
| 3 | Parameter Panel (dynamic form from parameters.json) | ✅ Complete |
| 4 | Data Input & EDA Nodes | ✅ Complete |
| 5 | Preprocessing Nodes | ✅ Complete |
| 6 | Classification Models & Evaluation | ✅ Complete |
| 7 | Regression Models & Evaluation | ✅ Complete |
| 8 | Unsupervised Models & Evaluation | 🔄 Next |
| 9 | Git-Based Project Management | Pending |
| 10 | Code Export (Python + Jupyter) | Pending |
| 11 | Node Package Import/Export UI | Pending |
| 12 | Polish, Testing & Documentation | Pending |

### Stage 6 — What's working now

All previous stages plus:

- **8 classification model nodes**: Logistic Regression, Decision Tree, Random Forest, XGBoost, SVM, KNN, Naive Bayes, Gradient Boosting
- **5 evaluation nodes**: Classification Report, Confusion Matrix, ROC-AUC Curve, Precision-Recall Curve, Feature Importance
- **Full classification pipeline**: Load CSV → Preprocess → Train → Evaluate (metrics + charts)
- **Color-coded metrics cards**: green (good), amber (fair), red (poor) based on metric type and value
- **Interactive Plotly charts** for confusion matrix, ROC curves, precision-recall curves, feature importance
- **77 backend tests** passing (15 new classification/evaluation tests)

---

## Port Types

Edges are typed. The canvas enforces that connected ports share the same type.

| Type | Colour | Description |
|---|---|---|
| `DataFrame` | Blue | Tabular dataset (pandas DataFrame) |
| `SplitData` | Amber | Train/test pair |
| `Model` | Emerald | Trained sklearn/XGBoost model |
| `Metrics` | Purple | Evaluation results dict |
| `Plot` | Rose | Plotly chart spec |

---

## Developer

**Dr. Atul Tiwari**
