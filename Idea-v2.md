# VRL ML Studio — Product Requirements Document v2

**Developer:** Dr. Atul Tiwari  
**Document Version:** 2.0  
**Date:** 2026-04-03  
**Status:** Draft

---

## 1. Executive Summary

VRL ML Studio is a web-based, visual machine learning workflow platform focused on tabular data. It enables non-programmers, clinicians, and students to design, execute, and version-control end-to-end ML pipelines via a drag-and-drop canvas — without writing code.

The platform is conceptually a modern, web-first alternative to [Orange Data Mining](https://orangedatamining.com/), with built-in Git versioning, Google Colab export, and full algorithm transparency.

> "Build ML pipelines like flowcharts. Export them as Python. Version them like code."

---

## 2. Problem Statement

| Pain Point | Current Gap |
|---|---|
| Coding barrier for ML | Excel/SQL users can't enter ML without Python |
| Black-box automation | AutoML tools hide algorithm logic |
| Reproducibility | Ad-hoc notebooks lack version control |
| Tool complexity | KNIME/RapidMiner have steep learning curves |
| Cross-environment gaps | Desktop tools (Orange) don't run in browsers or Colab |

---

## 3. Target Users

### Primary

| User Type | Context | ML Skill |
|---|---|---|
| Medical researchers / clinicians | Clinical data, outcome prediction | Low |
| Non-programmer domain experts | Agriculture, social science, finance | Very low |
| Students & educators | Academic ML courses | Low–Medium |

### Secondary

| User Type | Context | ML Skill |
|---|---|---|
| Data analysts transitioning to ML | BI → Predictive analytics | Medium |
| Data scientists | Rapid prototyping, teaching pipelines | High |

---

## 4. Scope

### Version 1 (this document)

- **Data types:** CSV, Excel (.xlsx/.xls)
- **ML paradigms:**
  - Supervised — Classification, Regression
  - Unsupervised — Clustering, Dimensionality Reduction
- **Execution:** Local (browser + local Python server)
- **Excluded in v1:** NLP, computer vision, deep learning, cloud execution, real-time streaming

---

## 5. Core Features

### 5.1 Visual Pipeline Builder

A canvas-based workflow editor where users compose ML pipelines as directed acyclic graphs (DAGs).

**Canvas capabilities:**
- Drag-and-drop node placement from a categorized sidebar
- Directional edge connections between node ports
- Multi-select, copy, paste, delete nodes and edges
- Undo / redo (Ctrl+Z / Ctrl+Y)
- Zoom in/out, pan, fit-to-canvas
- Minimap for large pipelines
- Auto-layout button (top-to-bottom DAG layout)
- Node search (keyboard shortcut: `/`)
- Pipeline validation — highlights misconfigured or disconnected nodes before execution
- Inline node status badges (idle / running / success / error)

**Node anatomy:**
- Header: node type + algorithm name
- Input/output ports (typed — e.g., `DataFrame`, `Model`, `Metrics`)
- Status indicator
- Quick-preview icon → opens output panel
- Configure icon → opens parameter side panel

---

### 5.2 Node Library

#### Data Input Nodes

| Node | Description | Key Parameters |
|---|---|---|
| CSV Loader | Load local CSV file | delimiter, encoding, header row, date columns |
| Excel Loader | Load .xlsx/.xls file | sheet name, header row |
| Sample Dataset | Built-in demo datasets (Iris, Titanic, Housing, Diabetes) | dataset name |
| Manual Data Entry | Enter small tabular data inline | columns, rows |

#### Data Exploration Nodes (EDA)

| Node | Description | Output |
|---|---|---|
| Data Profiler | Summary statistics, nulls, dtypes | Stats table |
| Distribution Viewer | Histogram / KDE per column | Chart |
| Correlation Matrix | Pearson/Spearman/Kendall heatmap | Heatmap |
| Scatter Plot | 2D scatter with color coding | Chart |
| Box Plot | Outlier visualization per column | Chart |

#### Preprocessing Nodes

| Node | Description | Key Parameters |
|---|---|---|
| Missing Value Imputer | Handle null values | strategy: mean / median / mode / constant / drop |
| Encoder | Categorical encoding | One-hot, Label, Ordinal, Target encoding |
| Feature Scaler | Numeric normalization | StandardScaler, MinMaxScaler, RobustScaler |
| Feature Selector | Column selection | Manual list, Variance threshold, Correlation filter |
| Train-Test Splitter | Dataset split | test_size, random_state, stratify |
| Outlier Handler | Detect and handle outliers | IQR, Z-score; action: remove / cap / flag |
| Column Dropper | Remove columns | column list |
| Type Caster | Change column dtype | target type per column |
| Duplicate Remover | Drop duplicate rows | subset columns |

#### Supervised Learning — Classification Models

| Algorithm | Key Parameters |
|---|---|
| Logistic Regression | C, solver, max_iter, multi_class |
| Decision Tree Classifier | max_depth, min_samples_split, criterion |
| Random Forest Classifier | n_estimators, max_depth, max_features |
| XGBoost Classifier | n_estimators, learning_rate, max_depth, subsample |
| Support Vector Machine (SVM) | C, kernel, gamma, degree |
| K-Nearest Neighbors | n_neighbors, weights, metric |
| Naive Bayes | var_smoothing (GaussianNB) |
| Gradient Boosting Classifier | n_estimators, learning_rate, max_depth |

#### Supervised Learning — Regression Models

| Algorithm | Key Parameters |
|---|---|
| Linear Regression | fit_intercept, normalize |
| Ridge Regression | alpha, solver |
| Lasso Regression | alpha, max_iter |
| ElasticNet | alpha, l1_ratio |
| Decision Tree Regressor | max_depth, min_samples_split, criterion |
| Random Forest Regressor | n_estimators, max_depth, max_features |
| XGBoost Regressor | n_estimators, learning_rate, max_depth |
| Support Vector Regressor | C, kernel, epsilon |
| KNN Regressor | n_neighbors, weights, metric |

#### Unsupervised Learning Models

| Algorithm | Key Parameters |
|---|---|
| K-Means Clustering | n_clusters, init, max_iter, random_state |
| Hierarchical Clustering | n_clusters, linkage, affinity |
| DBSCAN | eps, min_samples, metric |
| PCA | n_components, svd_solver |
| t-SNE | n_components, perplexity, learning_rate |

#### Evaluation Nodes

**Classification:**

| Metric Node | Output |
|---|---|
| Classification Report | Accuracy, Precision, Recall, F1 per class |
| Confusion Matrix | Heatmap visualization |
| ROC-AUC Curve | Multi-class ROC curves |
| Precision-Recall Curve | PR curve plot |
| Feature Importance | Bar chart (for tree-based models) |

**Regression:**

| Metric Node | Output |
|---|---|
| Regression Report | MAE, MSE, RMSE, R², Adjusted R² |
| Residual Plot | Residuals vs predicted |
| Actual vs Predicted | Scatter plot |
| Feature Importance | Bar chart |

**Clustering:**

| Metric Node | Output |
|---|---|
| Cluster Report | Silhouette score, Davies-Bouldin index |
| Cluster Visualization | 2D scatter with cluster color labels |
| Elbow Plot | Inertia vs k (for K-Means) |

---

### 5.3 Parameter Control Panel

Each node exposes a side panel with three tiers:

- **Basic** — 2–3 most important parameters with friendly labels and defaults
- **Advanced** — full scikit-learn / XGBoost parameter set, collapsible
- **Help** — inline documentation and link to algorithm explanation

Parameter controls:
- Sliders for bounded numeric ranges
- Dropdowns for categorical choices
- Number inputs with validation
- Toggle switches for boolean flags
- Reset to defaults button

---

### 5.4 Execution Engine

**Architecture:**
- FastAPI backend exposes a `/execute` endpoint
- Frontend sends a JSON-serialized DAG (nodes + edges + parameters)
- Backend deserializes the DAG and builds a topological execution order
- Each node maps to a Python function that receives `input_data` and returns `output_data`
- Intermediate outputs cached in memory (keyed by node ID + parameter hash)
- Partial re-execution — only re-runs downstream nodes whose upstream changed

**Execution feedback:**
- WebSocket connection streams node-level status updates to the UI in real time
- Progress bar per node during execution
- Error stack trace displayed inline on failed node
- Execution log panel (timestamped)

**Data flow types:**

| Port Type | Data Passed |
|---|---|
| `DataFrame` | pandas DataFrame (serialized as Arrow/JSON for transport) |
| `Model` | serialized model object (pickle, in-process) |
| `Metrics` | dict of metric name → value |
| `Plot` | base64-encoded image or Plotly JSON spec |

---

### 5.5 Output & Visualization Panel

Each node has a preview panel accessible from the canvas:

- **DataFrame nodes:** Paginated table view (first 100 rows), column dtype badges, row/col count
- **Statistics nodes:** Summary stats table
- **Chart nodes:** Interactive Plotly charts (zoom, hover, download PNG)
- **Model nodes:** Model summary card (algorithm, key hyperparameters, training time)
- **Metrics nodes:** Styled metric cards with color-coded thresholds

---

### 5.6 Git-Based Project Management

**Project structure on disk:**

```
my-project/
├── pipeline.json          # DAG: nodes, edges, positions, parameters
├── data/
│   └── input.csv          # Uploaded dataset(s)
├── outputs/               # Cached evaluation outputs (optional)
├── exports/               # Generated Python / notebook files
├── .git/                  # Git repository
└── project.yaml           # Project metadata
```

**Git operations exposed in UI:**

| Action | Description |
|---|---|
| Save (commit) | Auto-commit with timestamp + optional message |
| History | Visual commit history timeline |
| Checkout | Restore pipeline to a previous commit |
| Diff | Side-by-side node diff between two versions |
| Branch | Create experiment branch |
| Merge | Merge experiment back to main |

**project.yaml schema:**

```yaml
name: "Titanic Survival Prediction"
description: "Binary classification on Titanic dataset"
created_at: "2026-04-03T10:00:00Z"
last_modified: "2026-04-03T12:30:00Z"
vrl_studio_version: "1.0.0"
tags: ["classification", "medical", "tutorial"]
```

---

### 5.7 Code Export

**Export formats:**

| Format | Description |
|---|---|
| Python script (.py) | scikit-learn pipeline, runnable standalone |
| Jupyter Notebook (.ipynb) | Colab-compatible, with markdown cells explaining each step |
| YAML config | Pipeline configuration for headless re-execution |

**Export includes:**
- Import statements
- Data loading code
- Preprocessing steps as sklearn Pipeline or ColumnTransformer
- Model training and evaluation
- Inline comments explaining each step
- Requirements section (pip install block in notebook)

---

### 5.8 Project Management UI

- **Dashboard:** list of all local projects with last-modified date, thumbnail of pipeline
- **New project wizard:** name, description, tags, optional starter template
- **Templates:** 5 built-in pipeline templates (e.g., "Binary Classification Starter", "Regression Starter", "Clustering Explorer")
- **Import:** open existing project folder

---

### 5.9 Node Package System (Portable Node Architecture)

Every node in VRL ML Studio — built-in or custom — follows the same **standardized boilerplate spec**. This is a foundational architectural decision: it ensures all nodes are self-contained, portable, and importable as zip archives.

#### Design Philosophy

Built-in nodes are not hard-coded into the application. They are implemented as node packages using the same spec that a third-party developer would use. This means:
- The internal node library and external custom nodes are identical in structure
- Any node can be packaged as a `.vrlnode` zip and shared or imported elsewhere
- The platform gains an extensibility path without any architectural rework

#### Node Package Structure

A node package is a directory (or `.vrlnode` zip archive) with the following layout:

```
my_custom_node/
├── manifest.json        # Node identity, ports, category, version
├── executor.py          # Backend: Python function that runs the node
├── parameters.json      # Parameter schema (type, default, range, label)
├── ui.json              # Frontend hints (icon, color, basic/advanced grouping)
├── preview.py           # (optional) Custom output preview renderer
├── requirements.txt     # Python dependencies this node needs
└── README.md            # Human-readable description and usage notes
```

#### manifest.json schema

```json
{
  "id": "vrl.core.random_forest_classifier",
  "name": "Random Forest Classifier",
  "version": "1.0.0",
  "author": "VRL ML Studio",
  "category": "model.classification",
  "description": "Ensemble of decision trees for classification tasks.",
  "inputs": [
    { "id": "dataframe_in", "type": "DataFrame", "label": "Training Data" }
  ],
  "outputs": [
    { "id": "model_out", "type": "Model", "label": "Trained Model" }
  ],
  "executor": "executor.py",
  "parameters": "parameters.json",
  "ui": "ui.json",
  "min_studio_version": "1.0.0"
}
```

#### executor.py contract

Every executor must expose a single entry-point function:

```python
def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    """
    inputs:     dict of port_id → value (DataFrame, Model, etc.)
    parameters: dict of param_id → value (from UI panel)
    context:    runtime context (project path, temp dir, etc.)
    returns:    dict of port_id → output value
    """
    ...
```

This uniform contract means the DAG executor can dispatch any node — built-in or custom — through the same code path.

#### Zip Import / Export

- **Export a node:** Right-click any node on canvas → "Export as .vrlnode package"
- **Import a node:** Drag a `.vrlnode` zip onto the canvas or use "Import Node Package" from the sidebar menu
- Imported node packages are stored in the project's `node_packages/` directory and are committed to Git alongside the pipeline
- The backend unpacks, validates `manifest.json`, and registers the node into the active node registry for that project
- Node registry is scoped per project — importing a node in Project A does not affect Project B

#### Security model for imported packages

- `executor.py` runs in a sandboxed subprocess with restricted filesystem access
- `requirements.txt` dependencies are checked against an allowlist of ML-safe packages in v1
- Manifest `min_studio_version` is validated before registration
- In v1, only locally-sourced `.vrlnode` packages are supported (no remote URLs)

#### Built-in node library as packages

All built-in nodes ship as pre-installed node packages in `backend/node_packages/builtin/`. They use the identical boilerplate — no special-casing. This means:
- A user can inspect any built-in node's `executor.py` to learn how it works
- A built-in node can be forked, modified, and re-imported as a custom variant
- The export-to-Python feature uses each node's `executor.py` as a reference for code generation

---

### 5.10 Project Management UI

- **Dashboard:** list of all local projects with last-modified date, thumbnail of pipeline
- **New project wizard:** name, description, tags, optional starter template
- **Templates:** 5 built-in pipeline templates (e.g., "Binary Classification Starter", "Regression Starter", "Clustering Explorer")
- **Import:** open existing project folder
- **Node Package Manager:** view installed node packages per project, import new `.vrlnode` files, inspect manifest

---

## 6. Technical Architecture

### 6.1 Frontend

| Concern | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Canvas / graph | React Flow (v11+) |
| State management | Zustand |
| UI components | shadcn/ui + Tailwind CSS |
| Charts | Plotly.js (react-plotly.js) |
| Data table | TanStack Table |
| Forms / params | React Hook Form + Zod |
| Git diff viewer | react-diff-viewer |
| Icons | Lucide React |
| HTTP client | Axios |
| WebSocket | native browser WebSocket |

### 6.2 Backend

| Concern | Technology |
|---|---|
| Framework | FastAPI (Python 3.11+) |
| ML libraries | scikit-learn, XGBoost, pandas, numpy |
| Visualization | Plotly (server-side JSON generation) |
| Serialization | pydantic v2 |
| Git operations | GitPython |
| Data interchange | Apache Arrow (pyarrow) for DataFrame transport |
| WebSocket | FastAPI WebSocket |
| ASGI server | Uvicorn |

### 6.3 Data Flow

```
Browser
  │
  ├─ REST API (HTTP/JSON)  →  FastAPI
  │     POST /execute          │
  │     POST /project/save     │  DAG Executor
  │     GET  /project/history  │  → topological sort
  │     POST /export/python    │  → node fn dispatch
  │                            │  → cache layer
  └─ WebSocket               ←─┘ status stream
       ws://localhost:8000/ws
```

### 6.4 Pipeline JSON Schema

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "node-1",
      "type": "csv_loader",
      "label": "Titanic CSV",
      "position": { "x": 100, "y": 200 },
      "parameters": {
        "delimiter": ",",
        "encoding": "utf-8"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "sourcePort": "dataframe_out",
      "targetPort": "dataframe_in"
    }
  ]
}
```

### 6.5 Local Deployment

```
vrl-ml-studio/
├── frontend/          # React Vite app
├── backend/           # FastAPI app
├── docker-compose.yml # Local development setup
└── Makefile           # dev, build, test shortcuts
```

**Dev startup:**
```bash
make dev        # starts frontend (port 3000) + backend (port 8000)
make test       # runs all tests
make build      # production build
```

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Pipeline with ≤10 nodes executes in < 30s on a standard laptop |
| **Responsiveness** | Canvas renders smoothly at 60fps; no layout jank |
| **Reliability** | Node errors are isolated — one bad node doesn't crash the session |
| **Accessibility** | WCAG 2.1 AA for all UI outside the canvas |
| **Security** | No user data leaves the local machine in v1 |
| **Portability** | Runs on macOS, Windows, Linux via Docker |
| **Offline** | Fully functional without internet access |

---

## 8. Development Stages

Development is broken into **12 stages**. Each stage must be reviewed and approved before the next begins. Each stage ends with a git commit and a demo-able milestone.

---

### Stage 1 — Project Scaffolding & Foundation

**Goal:** Get a running full-stack skeleton with CI tooling, and establish the node package spec that all future nodes will follow.

**Tasks:**
- Initialize monorepo structure (`frontend/`, `backend/`, `docker-compose.yml`, `Makefile`)
- Frontend: Vite + React + TypeScript setup, Tailwind CSS, shadcn/ui init, ESLint + Prettier
- Backend: FastAPI + Uvicorn, pydantic v2, project structure (`routers/`, `services/`, `models/`, `core/`)
- Docker Compose for local dev (hot reload on both sides)
- Health check endpoints (`GET /health`)
- Basic frontend shell: top nav, left sidebar placeholder, main canvas area
- `.env.example`, `.gitignore`, `README.md`
- **Define and document the Node Package Spec** (`manifest.json` schema, `executor.py` contract, `parameters.json` schema)
- Implement the backend **Node Registry** — a loader that scans `backend/node_packages/builtin/` at startup, validates manifests, and registers nodes into a runtime catalog
- Implement the **DAG Executor dispatcher** — a generic runner that calls `executor.py::execute()` for any registered node type by its `manifest.id`
- Write one minimal end-to-end smoke-test node (`vrl.core.passthrough`) using the spec to validate the executor contract works

**Done when:** `make dev` boots both services; frontend shows a blank canvas shell; backend returns `{"status": "ok"}`; the passthrough node executes successfully through the DAG dispatcher.

---

### Stage 2 — Canvas Core & Node System

**Goal:** Working drag-and-drop canvas with dummy nodes.

**Tasks:**
- Integrate React Flow into frontend
- Implement node sidebar with categorized node list
- Drag node from sidebar → drops onto canvas
- Node component: header, ports, status badge
- Connect nodes via edges (port-to-port)
- Delete nodes / edges
- Undo / redo (Zustand history middleware)
- Zoom, pan, minimap, fit-to-canvas
- Pipeline serialization to/from JSON (save/load canvas state in localStorage)

**Done when:** User can build a multi-node pipeline visually and reload it from localStorage.

---

### Stage 3 — Parameter Panel & Node Configuration

**Goal:** Each node has a working configuration side panel.

**Tasks:**
- Side panel component that opens on node click
- Basic / Advanced tier tabs
- Form controls: slider, dropdown, number input, toggle, text input
- React Hook Form + Zod validation per node type
- Node parameter schema definitions for all planned nodes
- "Reset to defaults" button
- Node label editing inline on canvas
- Parameter changes update the node's visual state (e.g., algorithm name shown on node)

**Done when:** Every node type has a fully functional, validated configuration panel.

---

### Stage 4 — Data Input & EDA Nodes (Backend + Frontend)

**Goal:** Load real data and explore it visually.

**Tasks:**
- Backend: CSV Loader node executor (reads file, returns DataFrame summary + preview)
- Backend: Excel Loader node executor
- Backend: Sample Dataset node (Iris, Titanic, Housing, Diabetes built-in)
- Frontend: File upload UI (drag-and-drop file onto CSV Loader node)
- Frontend: Data preview panel (paginated table, dtype badges, row/col count)
- Backend + Frontend: Data Profiler node (summary stats)
- Backend + Frontend: Correlation Matrix node (Plotly heatmap)
- Backend + Frontend: Distribution Viewer node (histogram per column)
- WebSocket connection: stream node status (idle → running → success/error)
- Execution endpoint: `POST /execute` — accepts single-node DAG, returns output

**Done when:** User loads a CSV, sees a data table preview and a correlation heatmap — all without writing code.

---

### Stage 5 — Preprocessing Nodes

**Goal:** Full preprocessing pipeline executes end-to-end.

**Tasks:**
- Backend executors for all preprocessing nodes:
  - Missing Value Imputer
  - Encoder (One-hot, Label, Ordinal)
  - Feature Scaler (Standard, MinMax, Robust)
  - Feature Selector (manual, variance threshold)
  - Train-Test Splitter
  - Outlier Handler
  - Column Dropper, Type Caster, Duplicate Remover
- Port type enforcement: only `DataFrame → DataFrame` connections allowed between preprocessing nodes
- Cache layer: intermediate DataFrames cached by node ID + param hash
- Partial re-execution: only re-run changed nodes and their downstream
- Frontend: preprocessing output preview (transformed table)

**Done when:** A full preprocessing chain (load → impute → encode → scale → split) executes and each node shows its output preview.

---

### Stage 6 — Supervised Learning — Classification Models

**Goal:** Train and evaluate a classification model end-to-end.

**Tasks:**
- Backend executors for all 8 classification algorithms
- Model node accepts `DataFrame` (train split) → outputs `Model` object
- Classification Report node: accuracy, precision, recall, F1
- Confusion Matrix node: interactive Plotly heatmap
- ROC-AUC Curve node: multi-class ROC
- Feature Importance node: Plotly bar chart (tree-based models)
- Frontend: Metrics display panel with color-coded thresholds
- Frontend: Chart panel (interactive Plotly)
- End-to-end pipeline test: CSV → preprocess → train → evaluate

**Done when:** User builds a Titanic survival classifier in < 5 minutes with no code.

---

### Stage 7 — Supervised Learning — Regression Models

**Goal:** Regression workflow parity with classification.

**Tasks:**
- Backend executors for all 9 regression algorithms
- Regression Report node: MAE, MSE, RMSE, R², Adjusted R²
- Residual Plot node: Plotly scatter
- Actual vs Predicted Plot node
- Feature Importance node (shared with classification)
- End-to-end pipeline test: Housing dataset → preprocess → train → evaluate

**Done when:** User builds a house price regression pipeline end-to-end.

---

### Stage 8 — Unsupervised Learning Models

**Goal:** Clustering and dimensionality reduction workflows.

**Tasks:**
- Backend executors: K-Means, Hierarchical, DBSCAN, PCA, t-SNE
- Cluster Report node: Silhouette score, Davies-Bouldin index
- Cluster Visualization node: 2D Plotly scatter colored by cluster label
- Elbow Plot node (K-Means inertia vs k)
- PCA Explained Variance plot
- t-SNE visualization
- Note: unsupervised nodes don't use Train-Test Splitter

**Done when:** User clusters the Iris dataset and views a colored 2D scatter plot.

---

### Stage 9 — Git-Based Project Management

**Goal:** Projects are saved, versioned, and restorable.

**Tasks:**
- Backend: `GitPython`-based project service
  - `POST /project/save` — commit pipeline.json + project.yaml
  - `GET /project/history` — list commits
  - `POST /project/checkout` — restore to a commit
  - `POST /project/branch` — create branch
- Frontend: Project dashboard (list of local projects)
- Frontend: New project wizard (name, description, tags, template selection)
- Frontend: Commit history timeline panel
- Frontend: Restore to previous version (with confirmation dialog)
- Frontend: Project settings panel (edit name/description/tags)
- Pipeline save/load from disk (not just localStorage)
- 5 built-in starter templates

**Done when:** User saves a pipeline, modifies it, views history, and restores a previous version.

---

### Stage 10 — Code Export

**Goal:** Any pipeline can be exported as runnable Python or Jupyter notebook.

**Tasks:**
- Backend: `POST /export/python` — generates `.py` script from pipeline JSON
- Backend: `POST /export/notebook` — generates Colab-compatible `.ipynb`
- Code generator: maps each node type to sklearn/XGBoost code snippet
- Notebook generator: adds markdown cells explaining each step
- Requirements block auto-generated (pip install list)
- Frontend: Export button in toolbar → opens modal with format choice + download
- Validate exported scripts execute cleanly (CI test)

**Done when:** A full classification pipeline exports to a `.ipynb` that runs in Google Colab without modification.

---

### Stage 11 — Node Package Import/Export UI

**Goal:** Users can import custom `.vrlnode` packages and export any node as a portable archive.

**Tasks:**
- Backend: `POST /nodes/import` — accepts a `.vrlnode` zip, unpacks, validates manifest, registers into the project node registry
- Backend: `GET /nodes/export/{node_id}` — packages a node's directory into a `.vrlnode` zip and returns it for download
- Backend: `GET /nodes/installed` — lists all nodes in the project registry (builtin + custom)
- Frontend: **Node Package Manager panel** — lists installed nodes grouped by category, shows version + author from manifest
- Frontend: "Import Node Package" button → file picker for `.vrlnode` zip → triggers backend import → node appears in sidebar immediately without restart
- Frontend: Right-click a node on canvas → "Export as .vrlnode" → downloads the archive
- Frontend: Imported nodes visually distinguished from builtin nodes (small "custom" badge)
- Subprocess sandboxing for custom executor.py (restricted sys.path, no network access in v1)
- Package validation: malformed manifest, missing executor, unsupported studio version → clear error message shown in UI

**Done when:** A custom node package (zipped by the user) can be imported, appears in the sidebar, is drag-and-droppable, executes correctly in a pipeline, and can be re-exported.

---

### Stage 12 — Polish, Testing & Documentation

**Goal:** Production-ready v1 with test coverage and documentation, including node package system coverage.

**Tasks:**
- Unit tests: all backend node executors (pytest, ≥80% coverage)
- Integration tests: full pipeline execution (CSV → model → metrics)
- Frontend component tests (Vitest + React Testing Library)
- E2E tests: 4 critical flows (Playwright)
  1. Classification pipeline end-to-end
  2. Save → reload → restore from history
  3. Export → download notebook
  4. Import `.vrlnode` package → use in pipeline → execute
- Accessibility audit (axe-core)
- Performance audit (Lighthouse)
- User-facing error messages for all failure modes
- Keyboard shortcuts reference panel (press `?`)
- In-app onboarding tour (first launch)
- README with setup instructions, screenshots, architecture diagram
- CHANGELOG.md

**Done when:** All tests pass, Lighthouse score ≥85, and a non-technical user can complete the classification demo without help.

---

## 9. Missing Features Identified (Future Scope — v2+)

| Feature | Rationale |
|---|---|
| User authentication | Multi-user / cloud deployment |
| Cloud execution (AWS/GCP) | Large datasets beyond laptop RAM |
| GitHub remote sync | Push projects to GitHub |
| Node package marketplace | Discover and install community-contributed `.vrlnode` packages from a registry |
| Database connector node | PostgreSQL, MySQL, SQLite input |
| Cross-validation node | k-fold, stratified k-fold |
| Hyperparameter tuning node | GridSearchCV, RandomizedSearchCV, Optuna |
| Pipeline comparison view | Side-by-side metric comparison of two runs |
| Dataset versioning (DVC) | Track dataset changes separately from pipeline |
| Model deployment node | Export to ONNX / FastAPI serving endpoint |
| Collaborative editing | Real-time multi-user canvas |
| NLP node pack | Text preprocessing, TF-IDF, basic classifiers — distributed as `.vrlnode` packages |
| **MCP (Model Context Protocol) support** | Expose VRL ML Studio's execution engine as MCP tools so AI assistants (e.g., Claude) can trigger pipeline runs, read metric outputs, and query node results directly via MCP. Also allow an **MCP Input Node** that pulls live data from any MCP-compatible tool or data source into a pipeline. This turns VRL ML Studio into an MCP server that AI agents can orchestrate, and enables a new class of AI-assisted ML workflows without the user leaving their AI assistant. |

---

## 10. Success Metrics (v1)

| Metric | Target |
|---|---|
| Time to first pipeline execution | < 5 minutes for a new user |
| Node types implemented | ≥ 30 (all as node packages) |
| Custom node import round-trip | Import → execute → export works 100% |
| Test coverage | ≥ 80% |
| Supported algorithms | ≥ 20 |
| Export works in Google Colab | 100% of exported notebooks |
| Pipeline restore from history | Works 100% of the time |
| Lighthouse performance score | ≥ 85 |

---

## 11. Development Rules

1. **Stage gate:** No stage begins until the previous stage is approved by Dr. Tiwari.
2. **Git commits:** Commit at every meaningful milestone within a stage (not just at stage end).
3. **No big-bang development:** Each stage must produce a demo-able, working increment.
4. **Test-first:** Write tests before implementation for all backend node executors.
5. **No scope creep:** Features listed under "v2+" must not be implemented in v1 stages.
6. **Code style:** Follow project ESLint/Prettier config for frontend; Black + Ruff for backend.
7. **Security:** No user data is transmitted externally in v1; all processing is local.

---

## 12. Glossary

| Term | Definition |
|---|---|
| DAG | Directed Acyclic Graph — the data structure representing the pipeline |
| Node | A single processing step in the pipeline (e.g., CSV Loader, Random Forest) |
| Edge | A connection between two node ports |
| Port | A typed input or output connector on a node |
| Pipeline | The complete DAG from data input to evaluation |
| Executor | The Python function that runs a specific node type |
| Canvas | The visual editing area where nodes and edges are placed |
| Project | A folder containing a pipeline + dataset + Git history |
