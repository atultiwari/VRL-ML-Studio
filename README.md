# VRL ML Studio

A visual, drag-and-drop machine learning workflow platform for tabular data — no code required.

> Build ML pipelines like flowcharts. Export them as Python. Version them like code.

---

## What it does

- Drag algorithm nodes onto a canvas and connect them to form a pipeline
- Configure each node's parameters via a side panel (no coding)
- The backend executes the DAG and streams real-time status via WebSocket
- Each node shows a visual preview of its output (table, chart, metrics)
- Projects are saved as Git repositories
- Pipelines export as runnable Python scripts or Jupyter notebooks
- Custom nodes can be imported/exported as `.vrlnode` packages

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

---

## Your First Pipeline (Titanic Classification)

1. **Create a project** — Click "New Project" on the dashboard, name it "Titanic Classification"
2. **Load data** — Drag "Sample Dataset" from the sidebar, select "titanic" in its parameters
3. **Handle missing values** — Drag "Missing Value Imputer", connect it, set strategy to "median"
4. **Encode categories** — Drag "Encoder", connect it, set method to "onehot"
5. **Scale features** — Drag "Feature Scaler", connect it, set method to "standard"
6. **Split data** — Drag "Train-Test Splitter", connect it, set target column to "Survived"
7. **Train model** — Drag "Random Forest Classifier", connect to the splitter output
8. **Evaluate** — Drag "Classification Report" and "Confusion Matrix", connect both to the model
9. **Run** — Click the Run button (or press the play icon in the toolbar)
10. **View results** — Double-click any completed node to see its output

Total time: under 5 minutes.

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
  │   POST /nodes/import         │   → cache intermediate outputs
  │                              │
  └─ WebSocket  ◀────────────────┘  real-time node status stream
       ws://localhost:8000/ws
```

### Data Flow

```
Data Input → Preprocessing → Train/Test Split → Model Training → Evaluation
  (CSV)       (Impute,         (SplitData)      (Model +         (Metrics,
               Encode,                           DataFrame)        Plots)
               Scale)
```

### Node Package System

Every algorithm is a self-contained **node package** — a directory with four files:

```
my_node/
├── manifest.json    # identity, ports, category, version
├── executor.py      # execute(inputs, parameters, context) → dict
├── parameters.json  # parameter schema for the UI panel
└── ui.json          # icon, colour, badge
```

Built-in nodes live in `backend/node_packages/builtin/`. Custom nodes can be imported as `.vrlnode` zip archives via the UI or API.

---

## Built-in Nodes (52 total)

| Category | Nodes |
|---|---|
| **Data Input** (4) | CSV Loader, Excel Loader, Sample Dataset, Manual Data Entry |
| **Exploration** (5) | Data Profiler, Distribution Viewer, Correlation Matrix, Scatter Plot, Box Plot |
| **Preprocessing** (9) | Missing Value Imputer, Encoder, Feature Scaler, Feature Selector, Train-Test Splitter, Outlier Handler, Column Dropper, Type Caster, Duplicate Remover |
| **Classification** (8) | Logistic Regression, Decision Tree, Random Forest, XGBoost, SVM, KNN, Naive Bayes, Gradient Boosting |
| **Regression** (9) | Linear, Ridge, Lasso, ElasticNet, Decision Tree, Random Forest, XGBoost, SVR, KNN |
| **Unsupervised** (5) | K-Means, Hierarchical Clustering, DBSCAN, PCA, t-SNE |
| **Evaluation** (12) | Classification Report, Confusion Matrix, ROC-AUC Curve, Precision-Recall Curve, Feature Importance, Regression Report, Residual Plot, Actual vs Predicted, Cluster Report, Cluster Visualization, Elbow Plot |

---

## Port Types

Edges are typed. The canvas enforces that connected ports share the same type.

| Type | Colour | Description |
|---|---|---|
| `DataFrame` | Blue | Tabular dataset (pandas DataFrame) |
| `SplitData` | Amber | Train/test pair with target column |
| `Model` | Emerald | Trained sklearn/XGBoost model |
| `Metrics` | Purple | Evaluation results dict |
| `Plot` | Rose | Plotly chart spec |

---

## Project Structure

```
vrl-ml-studio/
├── frontend/                  # React 18 + TypeScript + Vite (port 3000)
│   └── src/
│       ├── components/
│       │   ├── canvas/        # React Flow canvas + custom NodeCard
│       │   ├── sidebar/       # Node library panel (drag-to-canvas)
│       │   ├── panel/         # Parameter panel + output preview
│       │   ├── toolbar/       # Top bar: run, undo/redo, save, export
│       │   ├── dashboard/     # Project list + new project wizard
│       │   ├── history/       # Git commit timeline
│       │   └── ui/            # Shared primitives, shortcuts, onboarding
│       ├── hooks/             # useNodeRegistry, useWebSocket
│       ├── store/             # Zustand stores (pipeline, execution, project, ui)
│       └── lib/               # API client, types, utilities
├── backend/                   # FastAPI + Python 3.10+ (port 8000)
│   ├── main.py
│   ├── routers/               # execute, nodes, project, export, upload
│   ├── services/              # dag_executor, node_registry, cache, git_service, export_service
│   ├── models/                # Pydantic schemas
│   └── node_packages/
│       └── builtin/           # 52 built-in nodes as self-contained packages
├── docker-compose.yml
├── Makefile
└── CLAUDE.md                  # Full project spec and development guide
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `?` | Toggle keyboard shortcuts panel |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z` | Redo |
| `Ctrl/⌘ + S` | Save project |
| `Backspace / Delete` | Delete selected nodes/edges |
| `Shift + Drag` | Box-select multiple nodes |
| `Right-click` | Node context menu (export/delete) |
| `Double-click` | Open node output preview |

---

## Development Stages

| Stage | Description | Status |
|---|---|---|
| 1 | Scaffolding + Node Package Foundation | Done |
| 2 | Canvas Core (React Flow, drag-drop, undo/redo) | Done |
| 3 | Parameter Panel (dynamic form from parameters.json) | Done |
| 4 | Data Input & EDA Nodes + WebSocket execution | Done |
| 5 | Preprocessing Nodes + caching + partial re-execution | Done |
| 6 | Classification Models & Evaluation (8 classifiers) | Done |
| 7 | Regression Models & Evaluation (9 regressors) | Done |
| 8 | Unsupervised Models & Evaluation (5 models) | Done |
| 9 | Git-Based Project Management (dashboard, versioning, templates) | Done |
| 10 | Code Export (Python scripts + Jupyter notebooks) | Done |
| 11 | Node Package Import/Export UI (.vrlnode archives) | Done |
| 12 | Polish, Testing & Documentation | Done |

---

## Testing

- **Backend**: 188+ tests, 89% coverage (pytest)
- **Frontend**: 23+ unit tests (Vitest + React Testing Library)
- Pipeline store undo/redo, serialization, edge connection
- Integration tests for all API endpoints (execute, upload, import/export, project management)

```bash
make test       # Run all tests
make test-be    # Backend only (with coverage)
make test-fe    # Frontend only
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Flow, Zustand, Tailwind CSS, shadcn/ui, react-plotly.js |
| Backend | FastAPI, Python 3.10+, scikit-learn, XGBoost, pandas, plotly, GitPython, pydantic v2 |
| Testing | pytest, Vitest, React Testing Library |

---

## Developer

**Dr. Atul Tiwari**
