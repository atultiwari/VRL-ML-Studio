# CLAUDE.md — VRL ML Studio

> This file is the single source of truth for building VRL ML Studio.
> It is self-contained. Do not depend on any other file for project instructions.

---

## Project Overview

**VRL ML Studio** is a web-based, visual machine learning workflow platform for tabular data.
Users build ML pipelines by connecting drag-and-drop nodes on a canvas — no coding required.

**Developer:** Dr. Atul Tiwari  
**Tagline:** "Build ML pipelines like flowcharts. Export them as Python. Version them like code."  
**Inspiration:** A modern, browser-based alternative to Orange Data Mining, with Git versioning and Google Colab export.

### What it does

- Users drag algorithm nodes onto a canvas and connect them to form a pipeline
- The pipeline is a Directed Acyclic Graph (DAG): Data → Preprocessing → Model → Evaluation
- Users configure each node's parameters via a side panel (no code)
- The backend executes the pipeline and streams real-time status back via WebSocket
- Each node shows a visual preview of its output (table, chart, metrics)
- Projects are saved as Git repositories (pipeline as JSON, data as files)
- Pipelines can be exported as runnable Python scripts or Jupyter notebooks

### What it is NOT (v1)

- Not a cloud service — runs entirely on the user's local machine
- Not an AutoML tool — users explicitly choose every algorithm
- Not for NLP, images, or deep learning — tabular data only
- Not a notebook — visual, not code-first

---

## Repository Layout

```
vrl-ml-studio/
├── CLAUDE.md                  ← this file
├── Makefile                   ← dev, test, build commands
├── docker-compose.yml         ← local dev orchestration
├── .env.example
├── frontend/                  ← React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas/        ← React Flow canvas, node renderer, edge renderer
│   │   │   ├── sidebar/       ← node library panel, search, categories
│   │   │   ├── panel/         ← parameter side panel, output preview panel
│   │   │   ├── toolbar/       ← top toolbar (run, save, export, undo/redo)
│   │   │   ├── dashboard/     ← project list, new project wizard
│   │   │   ├── history/       ← git commit timeline
│   │   │   └── ui/            ← shared primitives (Button, Card, Badge, etc.)
│   │   ├── hooks/             ← useWebSocket, usePipeline, useNodeRegistry, etc.
│   │   ├── store/             ← Zustand stores
│   │   ├── lib/               ← utilities, type definitions, api client
│   │   ├── styles/            ← global CSS, design tokens
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── package.json
└── backend/                   ← FastAPI + Python 3.11+
    ├── main.py                ← FastAPI app entry point
    ├── routers/
    │   ├── execute.py         ← POST /execute, WebSocket /ws
    │   ├── project.py         ← project CRUD, git operations
    │   ├── export.py          ← Python/notebook export
    │   └── nodes.py           ← node registry API, package import/export
    ├── services/
    │   ├── dag_executor.py    ← topological sort + node dispatch
    │   ├── node_registry.py   ← loads and validates node packages
    │   ├── cache.py           ← intermediate output cache
    │   ├── git_service.py     ← GitPython wrapper
    │   └── export_service.py  ← code generation
    ├── models/                ← pydantic schemas
    ├── core/                  ← settings, logging, sandbox
    ├── node_packages/
    │   └── builtin/           ← all built-in nodes as .vrlnode packages
    │       ├── csv_loader/
    │       ├── excel_loader/
    │       ├── sample_dataset/
    │       ├── data_profiler/
    │       ├── missing_value_imputer/
    │       ├── encoder/
    │       ├── feature_scaler/
    │       ├── feature_selector/
    │       ├── train_test_splitter/
    │       ├── outlier_handler/
    │       ├── column_dropper/
    │       ├── type_caster/
    │       ├── duplicate_remover/
    │       ├── distribution_viewer/
    │       ├── correlation_matrix/
    │       ├── scatter_plot/
    │       ├── box_plot/
    │       ├── logistic_regression/
    │       ├── decision_tree_classifier/
    │       ├── random_forest_classifier/
    │       ├── xgboost_classifier/
    │       ├── svm_classifier/
    │       ├── knn_classifier/
    │       ├── naive_bayes/
    │       ├── gradient_boosting_classifier/
    │       ├── linear_regression/
    │       ├── ridge_regression/
    │       ├── lasso_regression/
    │       ├── elasticnet/
    │       ├── decision_tree_regressor/
    │       ├── random_forest_regressor/
    │       ├── xgboost_regressor/
    │       ├── svr/
    │       ├── knn_regressor/
    │       ├── kmeans/
    │       ├── hierarchical_clustering/
    │       ├── dbscan/
    │       ├── pca/
    │       ├── tsne/
    │       ├── classification_report/
    │       ├── confusion_matrix/
    │       ├── roc_auc_curve/
    │       ├── precision_recall_curve/
    │       ├── regression_report/
    │       ├── residual_plot/
    │       ├── actual_vs_predicted/
    │       ├── feature_importance/
    │       ├── cluster_report/
    │       ├── cluster_visualization/
    │       └── elbow_plot/
    ├── requirements.txt
    └── pyproject.toml
```

---

## Common Commands

```bash
make dev          # Start frontend (port 3000) + backend (port 8000) with hot reload
make test         # Run all tests (frontend + backend)
make test-fe      # Frontend tests only (Vitest)
make test-be      # Backend tests only (pytest)
make test-e2e     # Playwright E2E tests
make build        # Production build
make lint         # ESLint + Ruff
make format       # Prettier + Black
```

**Backend only:**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
pytest --cov=. --cov-report=term-missing
```

**Frontend only:**
```bash
cd frontend
npm run dev       # port 3000
npm run test      # Vitest watch mode
npm run build     # production build
npx playwright test
```

---

## Tech Stack

### Frontend

| Concern | Library | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | Strict mode on |
| Build | Vite | Fast HMR |
| Canvas / graph | React Flow v11+ | Node renderer, edge types, minimap |
| State | Zustand | Separate stores per domain |
| UI components | shadcn/ui + Tailwind CSS | Do not override shadcn internals |
| Charts | react-plotly.js | Interactive, downloadable |
| Data table | TanStack Table | Virtualized, paginated |
| Forms | React Hook Form + Zod | Schema-first validation |
| Git diff | react-diff-viewer | Side-by-side pipeline diffs |
| Icons | Lucide React | Only Lucide — no mixing icon sets |
| HTTP | Axios | Central instance in `lib/api.ts` |
| WebSocket | Native browser WebSocket | Managed in `hooks/useWebSocket.ts` |

### Backend

| Concern | Library | Notes |
|---|---|---|
| Framework | FastAPI (Python 3.11+) | Async-first |
| ASGI server | Uvicorn | Dev: `--reload`, prod: workers=4 |
| ML | scikit-learn, XGBoost, pandas, numpy | Pin versions in requirements.txt |
| Visualization | plotly (server-side) | Returns JSON spec to frontend |
| Serialization | pydantic v2 | All request/response schemas |
| Git | GitPython | Wrapped in `services/git_service.py` |
| Data transport | pyarrow | DataFrame → Arrow → base64 for API |
| Testing | pytest + pytest-asyncio | 80% coverage minimum |

---

## Architecture

### Request / Data Flow

```
Browser
  │
  ├─ REST (HTTP/JSON)  ──────────────────▶  FastAPI
  │   POST /execute                          │
  │   POST /project/save                     │  dag_executor.py
  │   GET  /project/history                  │   → topological_sort(nodes, edges)
  │   POST /export/python                    │   → for each node in order:
  │   POST /nodes/import                     │       node_registry.dispatch(node)
  │   GET  /nodes/export/{id}                │       → executor.py::execute()
  │                                          │       → cache.set(node_id, output)
  └─ WebSocket  ◀────────────────────────────┘  status stream per node
       ws://localhost:8000/ws
       messages: { node_id, status, error? }
```

### Port Type System

Edges are typed. The frontend enforces that source and target ports share compatible types. The backend re-validates at execution time.

| Type | Description | Python representation |
|---|---|---|
| `DataFrame` | Tabular dataset | `pandas.DataFrame` |
| `SplitData` | Train/test pair | `dict` with keys `train`, `test` |
| `Model` | Trained sklearn/XGBoost model | Python object (in-process, not serialized to disk) |
| `Metrics` | Evaluation results | `dict[str, float \| str]` |
| `Plot` | Chart output | Plotly JSON spec `dict` |

### Pipeline JSON Schema (pipeline.json)

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "node-1",
      "type": "vrl.core.csv_loader",
      "label": "Titanic CSV",
      "position": { "x": 100, "y": 200 },
      "parameters": {
        "delimiter": ",",
        "encoding": "utf-8",
        "header_row": 0
      }
    },
    {
      "id": "node-2",
      "type": "vrl.core.missing_value_imputer",
      "label": "Imputer",
      "position": { "x": 100, "y": 380 },
      "parameters": {
        "strategy": "mean",
        "fill_value": null
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

### Project Structure on Disk

```
~/vrl-projects/my-project/
├── pipeline.json          # DAG definition (committed to git)
├── project.yaml           # Project metadata (committed to git)
├── data/
│   └── input.csv          # Uploaded datasets (committed to git)
├── outputs/               # Cached evaluation outputs (git-ignored)
├── exports/               # Generated .py / .ipynb files
├── node_packages/         # Custom imported .vrlnode packages (committed to git)
└── .git/
```

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

## Node Package System

This is a core architectural decision. Read it carefully before touching any node code.

### Principle

Every node — built-in or custom — is a **node package**: a self-contained directory following the same spec. Built-in nodes live in `backend/node_packages/builtin/`. Custom nodes live in `<project>/node_packages/`. There is no difference in how they are loaded or executed.

Any node package can be zipped into a `.vrlnode` archive and imported into any project.

### Node Package File Layout

```
my_node/
├── manifest.json       ← REQUIRED: identity, ports, category, version
├── executor.py         ← REQUIRED: Python execution logic
├── parameters.json     ← REQUIRED: parameter schema for the UI panel
├── ui.json             ← REQUIRED: visual hints (icon, color, tier grouping)
├── preview.py          ← optional: custom output preview logic
├── requirements.txt    ← optional: extra Python dependencies
└── README.md           ← optional: human-readable docs
```

### manifest.json

```json
{
  "id": "vrl.core.random_forest_classifier",
  "name": "Random Forest Classifier",
  "version": "1.0.0",
  "author": "VRL ML Studio",
  "category": "model.classification",
  "description": "Ensemble of decision trees for classification tasks.",
  "inputs": [
    { "id": "dataframe_in", "type": "SplitData", "label": "Train/Test Data" }
  ],
  "outputs": [
    { "id": "model_out",     "type": "Model",    "label": "Trained Model" },
    { "id": "dataframe_out", "type": "DataFrame", "label": "Test Data Pass-through" }
  ],
  "executor": "executor.py",
  "parameters": "parameters.json",
  "ui": "ui.json",
  "min_studio_version": "1.0.0"
}
```

**Valid categories:**
`data.input`, `data.eda`, `preprocessing`, `model.classification`, `model.regression`, `model.unsupervised`, `evaluation.classification`, `evaluation.regression`, `evaluation.clustering`

### parameters.json

```json
[
  {
    "id": "n_estimators",
    "label": "Number of Trees",
    "type": "int",
    "default": 100,
    "min": 1,
    "max": 2000,
    "tier": "basic"
  },
  {
    "id": "max_depth",
    "label": "Max Depth",
    "type": "int_or_null",
    "default": null,
    "min": 1,
    "max": 50,
    "tier": "basic"
  },
  {
    "id": "max_features",
    "label": "Max Features",
    "type": "select",
    "options": ["sqrt", "log2", "auto"],
    "default": "sqrt",
    "tier": "advanced"
  },
  {
    "id": "random_state",
    "label": "Random State",
    "type": "int",
    "default": 42,
    "tier": "advanced"
  }
]
```

**Parameter types:** `int`, `float`, `str`, `bool`, `select`, `multiselect`, `int_or_null`, `float_or_null`, `column_select`, `multicolumn_select`

**Tiers:** `basic` (shown by default), `advanced` (collapsed), `hidden` (internal use only)

### ui.json

```json
{
  "icon": "trees",
  "color": "#16a34a",
  "badge_text": "RF"
}
```

### executor.py Contract

Every executor must expose exactly this function signature:

```python
def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    """
    Args:
        inputs:     { port_id: value } — values typed per manifest inputs
        parameters: { param_id: value } — from user's parameter panel
        context:    { project_path: str, temp_dir: str, node_id: str }

    Returns:
        { port_id: value } — keys must match manifest outputs exactly
    
    Raises:
        ValueError: for invalid parameters or incompatible data
        Any exception is caught by the DAG executor and reported as node error.
    """
    ...
```

**Example — Random Forest Classifier executor.py:**
```python
from sklearn.ensemble import RandomForestClassifier

def execute(inputs, parameters, context):
    split_data = inputs["dataframe_in"]
    X_train = split_data["train"].drop(columns=[split_data["target_col"]])
    y_train = split_data["train"][split_data["target_col"]]
    X_test  = split_data["test"].drop(columns=[split_data["target_col"]])

    model = RandomForestClassifier(
        n_estimators=parameters.get("n_estimators", 100),
        max_depth=parameters.get("max_depth", None),
        max_features=parameters.get("max_features", "sqrt"),
        random_state=parameters.get("random_state", 42),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": split_data["test"],
    }
```

### Node Registry (backend/services/node_registry.py)

At startup, the registry:
1. Scans `backend/node_packages/builtin/` for subdirectories
2. Scans `<active_project>/node_packages/` for custom packages
3. Validates each `manifest.json` against the pydantic schema
4. Registers each node by its `id` into an in-memory catalog
5. Exposes `registry.dispatch(node_type, inputs, parameters, context) -> dict`

The DAG executor calls `registry.dispatch(...)` — it never calls a node directly.

### .vrlnode Zip Format

A `.vrlnode` file is a standard zip archive containing the node package directory at its root:

```
my_node.vrlnode (zip)
└── my_node/
    ├── manifest.json
    ├── executor.py
    ├── parameters.json
    └── ui.json
```

**Import API:** `POST /nodes/import` — multipart form with the `.vrlnode` file  
**Export API:** `GET /nodes/export/{node_manifest_id}` — returns `.vrlnode` zip download

### Security Rules for Custom Nodes

- Custom `executor.py` runs in a subprocess with `sys.path` restricted to the node package directory
- Network calls from executor.py are blocked in v1
- `requirements.txt` is validated against an allowlist: `scikit-learn`, `xgboost`, `pandas`, `numpy`, `scipy`, `plotly`, `matplotlib`, `statsmodels`
- `manifest.min_studio_version` must be ≤ running studio version
- Reject zip archives with path traversal (`../`) in filenames

---

## Node Library Reference

All built-in nodes. Each is a package in `backend/node_packages/builtin/`.

### Data Input Nodes

| Node ID | Name | Input Ports | Output Ports | Key Parameters |
|---|---|---|---|---|
| `vrl.core.csv_loader` | CSV Loader | — | `dataframe_out: DataFrame` | delimiter, encoding, header_row, parse_dates |
| `vrl.core.excel_loader` | Excel Loader | — | `dataframe_out: DataFrame` | sheet_name, header_row |
| `vrl.core.sample_dataset` | Sample Dataset | — | `dataframe_out: DataFrame` | dataset: iris/titanic/housing/diabetes |
| `vrl.core.manual_data_entry` | Manual Data Entry | — | `dataframe_out: DataFrame` | column definitions, row data (JSON) |

### EDA Nodes

| Node ID | Name | Input | Output | Key Parameters |
|---|---|---|---|---|
| `vrl.core.data_profiler` | Data Profiler | `dataframe_in` | `dataframe_out`, `plot_out: Plot` | — |
| `vrl.core.distribution_viewer` | Distribution Viewer | `dataframe_in` | `dataframe_out`, `plot_out` | column, bins, kde |
| `vrl.core.correlation_matrix` | Correlation Matrix | `dataframe_in` | `dataframe_out`, `plot_out` | method: pearson/spearman/kendall |
| `vrl.core.scatter_plot` | Scatter Plot | `dataframe_in` | `dataframe_out`, `plot_out` | x_col, y_col, color_col |
| `vrl.core.box_plot` | Box Plot | `dataframe_in` | `dataframe_out`, `plot_out` | columns |

### Preprocessing Nodes

| Node ID | Name | Input | Output | Key Parameters |
|---|---|---|---|---|
| `vrl.core.missing_value_imputer` | Missing Value Imputer | `dataframe_in` | `dataframe_out` | strategy, fill_value, columns |
| `vrl.core.encoder` | Encoder | `dataframe_in` | `dataframe_out` | method: onehot/label/ordinal/target, columns |
| `vrl.core.feature_scaler` | Feature Scaler | `dataframe_in` | `dataframe_out` | method: standard/minmax/robust, columns |
| `vrl.core.feature_selector` | Feature Selector | `dataframe_in` | `dataframe_out` | method: manual/variance/correlation, threshold |
| `vrl.core.train_test_splitter` | Train-Test Splitter | `dataframe_in` | `split_data_out: SplitData` | test_size, random_state, stratify, target_col |
| `vrl.core.outlier_handler` | Outlier Handler | `dataframe_in` | `dataframe_out` | method: iqr/zscore, action: remove/cap/flag, threshold |
| `vrl.core.column_dropper` | Column Dropper | `dataframe_in` | `dataframe_out` | columns |
| `vrl.core.type_caster` | Type Caster | `dataframe_in` | `dataframe_out` | column_types dict |
| `vrl.core.duplicate_remover` | Duplicate Remover | `dataframe_in` | `dataframe_out` | subset_columns |

### Classification Model Nodes

All classification nodes: input `split_data_in: SplitData`, output `model_out: Model` + `dataframe_out: DataFrame`

| Node ID | Algorithm | Key Parameters |
|---|---|---|
| `vrl.core.logistic_regression` | Logistic Regression | C, solver, max_iter, multi_class |
| `vrl.core.decision_tree_classifier` | Decision Tree | max_depth, min_samples_split, criterion |
| `vrl.core.random_forest_classifier` | Random Forest | n_estimators, max_depth, max_features |
| `vrl.core.xgboost_classifier` | XGBoost | n_estimators, learning_rate, max_depth, subsample |
| `vrl.core.svm_classifier` | SVM | C, kernel, gamma, degree |
| `vrl.core.knn_classifier` | K-Nearest Neighbors | n_neighbors, weights, metric |
| `vrl.core.naive_bayes` | Naive Bayes (Gaussian) | var_smoothing |
| `vrl.core.gradient_boosting_classifier` | Gradient Boosting | n_estimators, learning_rate, max_depth |

### Regression Model Nodes

All regression nodes: input `split_data_in: SplitData`, output `model_out: Model` + `dataframe_out: DataFrame`

| Node ID | Algorithm | Key Parameters |
|---|---|---|
| `vrl.core.linear_regression` | Linear Regression | fit_intercept |
| `vrl.core.ridge_regression` | Ridge | alpha, solver |
| `vrl.core.lasso_regression` | Lasso | alpha, max_iter |
| `vrl.core.elasticnet` | ElasticNet | alpha, l1_ratio |
| `vrl.core.decision_tree_regressor` | Decision Tree Regressor | max_depth, min_samples_split, criterion |
| `vrl.core.random_forest_regressor` | Random Forest Regressor | n_estimators, max_depth, max_features |
| `vrl.core.xgboost_regressor` | XGBoost Regressor | n_estimators, learning_rate, max_depth |
| `vrl.core.svr` | Support Vector Regressor | C, kernel, epsilon |
| `vrl.core.knn_regressor` | KNN Regressor | n_neighbors, weights, metric |

### Unsupervised Model Nodes

| Node ID | Algorithm | Input | Output | Key Parameters |
|---|---|---|---|---|
| `vrl.core.kmeans` | K-Means | `dataframe_in` | `dataframe_out` (with cluster label col), `plot_out` | n_clusters, init, max_iter, random_state |
| `vrl.core.hierarchical_clustering` | Hierarchical | `dataframe_in` | `dataframe_out`, `plot_out` | n_clusters, linkage, affinity |
| `vrl.core.dbscan` | DBSCAN | `dataframe_in` | `dataframe_out`, `plot_out` | eps, min_samples, metric |
| `vrl.core.pca` | PCA | `dataframe_in` | `dataframe_out`, `plot_out` | n_components, svd_solver |
| `vrl.core.tsne` | t-SNE | `dataframe_in` | `dataframe_out`, `plot_out` | n_components, perplexity, learning_rate |

### Evaluation Nodes

**Classification evaluation:** input `model_in: Model` + `dataframe_in: DataFrame`

| Node ID | Name | Output |
|---|---|---|
| `vrl.core.classification_report` | Classification Report | `metrics_out: Metrics` (accuracy, precision, recall, F1 per class) |
| `vrl.core.confusion_matrix` | Confusion Matrix | `plot_out: Plot` |
| `vrl.core.roc_auc_curve` | ROC-AUC Curve | `plot_out: Plot`, `metrics_out: Metrics` |
| `vrl.core.precision_recall_curve` | Precision-Recall Curve | `plot_out: Plot` |
| `vrl.core.feature_importance` | Feature Importance | `plot_out: Plot` (tree-based models only) |

**Regression evaluation:** input `model_in: Model` + `dataframe_in: DataFrame`

| Node ID | Name | Output |
|---|---|---|
| `vrl.core.regression_report` | Regression Report | `metrics_out: Metrics` (MAE, MSE, RMSE, R², Adj. R²) |
| `vrl.core.residual_plot` | Residual Plot | `plot_out: Plot` |
| `vrl.core.actual_vs_predicted` | Actual vs Predicted | `plot_out: Plot` |

**Clustering evaluation:** input `dataframe_in: DataFrame` (with cluster label column)

| Node ID | Name | Output |
|---|---|---|
| `vrl.core.cluster_report` | Cluster Report | `metrics_out: Metrics` (silhouette, Davies-Bouldin) |
| `vrl.core.cluster_visualization` | Cluster Visualization | `plot_out: Plot` |
| `vrl.core.elbow_plot` | Elbow Plot | `plot_out: Plot` (K-Means only) |

---

## API Endpoints

### Execution

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/execute` | `{ pipeline: PipelineJSON, project_path: str }` | `{ execution_id: str }` — then stream via WebSocket |
| WS | `/ws` | connect, then receive `{ node_id, status, output?, error? }` | — |

### Project

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/projects` | — | `[{ name, path, last_modified, thumbnail }]` |
| POST | `/project/create` | `{ name, description, tags, template? }` | `{ project_path }` |
| POST | `/project/save` | `{ project_path, pipeline, message? }` | `{ commit_hash }` |
| GET | `/project/history` | `?project_path=...` | `[{ hash, message, timestamp, author }]` |
| POST | `/project/checkout` | `{ project_path, commit_hash }` | `{ pipeline }` |
| POST | `/project/branch` | `{ project_path, branch_name }` | `{ branch }` |

### Export

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/export/python` | `{ pipeline: PipelineJSON }` | `.py` file download |
| POST | `/export/notebook` | `{ pipeline: PipelineJSON }` | `.ipynb` file download |

### Node Packages

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/nodes` | `?project_path=...` | `[NodeManifest]` — all registered nodes |
| POST | `/nodes/import` | multipart: `file` (.vrlnode), `project_path` | `{ manifest }` |
| GET | `/nodes/export/{node_id}` | `?project_path=...` | `.vrlnode` zip download |

### Health

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ status: "ok", version: "1.0.0" }` |

---

## Frontend State Management (Zustand)

Use separate stores — never one giant global store.

```
stores/
├── pipelineStore.ts    ← nodes, edges, undo/redo history
├── executionStore.ts   ← execution status per node, logs
├── projectStore.ts     ← current project, git history
├── uiStore.ts          ← selected node, open panels, sidebar state
└── nodeRegistryStore.ts ← available node manifests from /nodes API
```

**pipelineStore shape:**
```ts
interface PipelineStore {
  nodes: Node[]
  edges: Edge[]
  past: { nodes: Node[], edges: Edge[] }[]   // undo stack
  future: { nodes: Node[], edges: Edge[] }[] // redo stack
  addNode: (node: Node) => void
  updateNodeParams: (id: string, params: Record<string, unknown>) => void
  undo: () => void
  redo: () => void
  loadPipeline: (pipeline: PipelineJSON) => void
  toPipelineJSON: () => PipelineJSON
}
```

---

## Canvas Rules

- Nodes are rendered as custom React Flow node types, one per category
- Edges are validated on connect: source port type must match target port type
- Invalid connections are rejected with a visible error toast
- Node status badge colors: gray (idle), blue (running), green (success), red (error)
- Clicking a node opens the parameter panel (right side panel)
- Clicking a node's preview icon opens the output panel (bottom panel)
- The canvas must never re-render the entire node tree on parameter changes — use `memo` + `useCallback` throughout

---

## Parameter Panel Rules

Each node's parameter panel is generated dynamically from its `parameters.json`. Do not hard-code panels.

**Panel structure:**
1. Node name + algorithm name header
2. "Basic" tab — fields with `tier: "basic"`
3. "Advanced" tab — fields with `tier: "advanced"`, collapsed by default
4. "Help" tab — inline description from manifest + link to sklearn docs
5. "Reset to defaults" button at the bottom

**Control mapping:**

| Parameter type | UI control |
|---|---|
| `int`, `float` | Number input with min/max validation |
| `bool` | Toggle switch |
| `select` | Dropdown |
| `multiselect` | Multi-select dropdown |
| `int_or_null`, `float_or_null` | Number input with "None" toggle |
| `column_select` | Dropdown populated from upstream DataFrame columns |
| `multicolumn_select` | Multi-select dropdown of columns |

---

## Git Integration Rules

- Use `GitPython` for all git operations — never shell out with `subprocess`
- Each project directory is its own git repo (not a submodule of the studio)
- Auto-commit message format: `"save: {timestamp}"` when no message provided, or `"save: {user message}"` when provided
- Never commit `outputs/` directory (add to `.gitignore` on project creation)
- Never commit `__pycache__`, `.DS_Store`
- The diff view compares `pipeline.json` between two commits — parse the JSON and show node-level changes, not raw JSON diff

---

## Code Export Rules

The export service generates code by mapping each node's `manifest.id` to a code template. Each built-in node's package includes a `code_template.py` alongside `executor.py` (same logic, formatted as standalone code).

**Python export format:**
```python
# Generated by VRL ML Studio v1.0.0
# Pipeline: {pipeline_name}
# Generated: {timestamp}

import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

# Step 1: Load Data
df = pd.read_csv("data/input.csv")

# Step 2: Impute Missing Values
imputer = SimpleImputer(strategy="mean")
df[numeric_cols] = imputer.fit_transform(df[numeric_cols])

# ... and so on
```

**Notebook export:** Same code split across cells, with Markdown cells between each step explaining what it does. First cell is always a pip install cell.

---

## Coding Standards

### Both Frontend and Backend

- Functions < 50 lines. Files < 800 lines. Extract when over.
- No magic numbers — use named constants or config.
- No silent error swallowing — always surface errors to the user.
- Never mutate inputs — return new objects.
- Validate at system boundaries (user uploads, API request bodies). Trust internal data.

### Frontend (TypeScript)

- Strict TypeScript (`"strict": true` in tsconfig)
- No `any` — use `unknown` and narrow with type guards
- Component files: PascalCase (`NodeCard.tsx`)
- Hook files: camelCase prefixed with `use` (`usePipeline.ts`)
- CSS: Tailwind classes only, no inline styles, no raw CSS except in `styles/`
- No `useEffect` for data that can be derived — use `useMemo`
- All API calls go through `lib/api.ts` — never call `axios` directly from components
- Prefer `const` arrow functions over `function` declarations for components

### Backend (Python)

- Black + Ruff for formatting and linting
- Type annotations on all functions
- pydantic v2 models for all API schemas — no raw dicts crossing API boundaries
- No `print()` — use the logger from `core/logging.py`
- Async route handlers (`async def`) for all FastAPI routes
- Each node executor (`executor.py`) must be pure — no global state, no side effects beyond the returned dict

---

## Testing Requirements

**Coverage target: 80% minimum on backend. No target waived.**

### Backend Tests (`backend/tests/`)

```
tests/
├── unit/
│   ├── test_node_registry.py      ← manifest validation, dispatch
│   ├── test_dag_executor.py       ← topological sort, partial re-execution
│   ├── test_nodes/                ← one test file per node package
│   │   ├── test_csv_loader.py
│   │   ├── test_missing_value_imputer.py
│   │   └── ... (one per node)
│   └── test_export_service.py
├── integration/
│   ├── test_execute_endpoint.py   ← full pipeline over HTTP
│   ├── test_project_git.py        ← save/history/checkout cycle
│   └── test_node_import.py        ← .vrlnode import round-trip
└── conftest.py                    ← shared fixtures (sample DataFrames, project dirs)
```

**Node test pattern:**
```python
def test_random_forest_classifier_basic():
    inputs = {"dataframe_in": make_split_data(iris_df, target="species")}
    params = {"n_estimators": 10, "random_state": 42}
    result = execute(inputs, params, context={})
    assert "model_out" in result
    assert "dataframe_out" in result
    assert hasattr(result["model_out"], "predict")
```

### Frontend Tests (`frontend/src/**/__tests__/`)

- Vitest + React Testing Library
- Test: parameter panel renders correct controls for each node type
- Test: invalid edge connections are rejected
- Test: undo/redo manipulates pipelineStore correctly
- Test: pipeline serializes to/from JSON without data loss
- No snapshot tests — prefer behavior assertions

### E2E Tests (`frontend/e2e/`)

Four critical flows tested with Playwright:

1. **Classification end-to-end:** Load CSV → Imputer → Scaler → Splitter → Random Forest → Classification Report → view metrics
2. **Project versioning:** Save pipeline → modify a parameter → save again → restore first version → verify parameter reverted
3. **Code export:** Build a regression pipeline → export as notebook → verify `.ipynb` downloads and has correct cell count
4. **Custom node import:** Zip a node package → import via UI → drag onto canvas → connect → execute → verify output

---

## Development Stages

**Stage gate rule: No stage begins until Dr. Tiwari explicitly approves the previous stage.**

Each stage ends with a git commit on the project repo. Each stage produces a demo-able, working increment. No half-done stages are committed.

---

### Stage 1 — Project Scaffolding & Node Package Foundation

**Goal:** Running full-stack skeleton + the node package spec and DAG dispatcher are implemented and tested.

**Tasks:**
- Monorepo: `frontend/`, `backend/`, `docker-compose.yml`, `Makefile`
- Frontend: Vite + React 18 + TypeScript, Tailwind, shadcn/ui init, ESLint + Prettier config
- Backend: FastAPI structure (`routers/`, `services/`, `models/`, `core/`), pydantic v2, Uvicorn, pytest setup
- Docker Compose: hot reload on both frontend (port 3000) and backend (port 8000)
- `GET /health` → `{"status": "ok", "version": "1.0.0"}`
- Basic frontend shell: top navigation bar, empty left sidebar area, empty main canvas area
- Define and implement `NodeManifest` pydantic schema and `ParameterSchema`
- Implement `NodeRegistry` service: scan `builtin/`, validate manifests, register by id
- Implement `DAGExecutor`: topological sort + generic dispatch via `registry.dispatch()`
- Implement cache layer: `cache.set(node_id, param_hash, output)` / `cache.get()`
- Write `vrl.core.passthrough` node package (passes `dataframe_in` → `dataframe_out` unchanged)
- Unit test: registry loads passthrough node; executor runs it; cache hit skips re-execution
- `.env.example`, `.gitignore`, `README.md`

**Done when:** `make dev` boots both; `GET /health` returns ok; passthrough node executes through the DAG dispatcher; unit tests pass.

---

### Stage 2 — Canvas Core

**Goal:** Working drag-and-drop canvas with all node types visible but not yet connected to real execution.

**Tasks:**
- Integrate React Flow; configure custom node type renderer
- Left sidebar: categorized node list (Data Input, EDA, Preprocessing, Classification, Regression, Unsupervised, Evaluation)
- Drag a node from sidebar → it appears on canvas with correct label, ports, status badge
- Click-to-select, multi-select, delete (Backspace/Delete key)
- Connect two nodes via port-to-port drag; enforce port type compatibility; reject invalid connections with toast
- Undo / redo via Zustand history middleware (Ctrl+Z / Ctrl+Y)
- Zoom, pan, minimap, fit-to-canvas button, auto-layout button
- Pipeline serializes to JSON and persists in `localStorage`; reload restores canvas

**Done when:** User can build a multi-node pipeline, undo/redo changes, and see it restored after page refresh.

---

### Stage 3 — Parameter Panel

**Goal:** Every node type has a fully functional configuration panel driven by `parameters.json`.

**Tasks:**
- Right side panel component, opens on node click
- Dynamic form renderer reads `parameters.json` from the node registry
- Implement all control types: number input, slider, dropdown, multi-select, toggle, column-select (placeholder for now)
- Basic / Advanced / Help tabs
- Zod validation schema generated from `parameters.json` at runtime
- "Reset to defaults" button
- Inline node label editing on canvas (double-click)
- Parameter changes update the node's subtitle on the canvas card

**Done when:** Every built-in node type renders a validated, functional configuration panel.

---

### Stage 4 — Data Input & EDA Nodes

**Goal:** Users can load real data and explore it visually.

**Tasks:**
- Implement all 4 data input node executors as packages in `builtin/`
- File upload: user drags `.csv` or `.xlsx` onto canvas or uses file picker in node config
- Uploaded file stored to `data/` in project directory (project must exist on disk first — use temp dir in this stage)
- WebSocket endpoint (`/ws`) established; frontend `useWebSocket` hook connects on app load
- `POST /execute` accepts a pipeline JSON, runs it, streams node status over WebSocket
- Frontend: execution status badge updates live on canvas nodes
- Data preview panel (bottom): TanStack Table, paginated, 100 rows, dtype badges, row/col count
- Implement all 5 EDA node executors (Data Profiler, Distribution Viewer, Correlation Matrix, Scatter Plot, Box Plot)
- Frontend: Plotly chart panel renders `plot_out` from EDA nodes

**Done when:** Load Titanic CSV → connect to Correlation Matrix → run → see interactive heatmap.

---

### Stage 5 — Preprocessing Nodes

**Goal:** A complete preprocessing chain executes end-to-end.

**Tasks:**
- Implement all 9 preprocessing node executors
- Port type enforcement: `DataFrame → DataFrame` between preprocessing nodes; only Train-Test Splitter outputs `SplitData`
- Cache layer active: re-running without changes uses cached output (no re-execution)
- Partial re-execution: changing a node's parameter invalidates its cache and all downstream nodes' caches
- column_select / multicolumn_select parameter controls now populated from upstream `DataFrame` column names (requires backend to return column info in node output metadata)
- Frontend: show transformed data preview after each preprocessing node

**Done when:** CSV → Imputer → Encoder → Scaler → Feature Selector → Train-Test Splitter executes; each node shows its output; changing imputer strategy only re-runs imputer and downstream.

---

### Stage 6 — Classification Models & Evaluation

**Goal:** Full classification pipeline: load → preprocess → train → evaluate.

**Tasks:**
- Implement all 8 classification model node executors
- Implement all 5 classification evaluation node executors (Classification Report, Confusion Matrix, ROC-AUC, Precision-Recall Curve, Feature Importance)
- Model node: accepts `SplitData`, trains on train split, passes test split downstream
- Evaluation nodes: accept `Model` + `DataFrame` (test set), compute metrics
- Frontend: Metrics panel renders `Metrics` output (colored cards: green if good, amber/red if poor)
- Frontend: Chart panel renders `Plot` outputs
- End-to-end integration test: Titanic CSV → full pipeline → metrics

**Done when:** User builds Titanic classifier in under 5 minutes with no code and sees accuracy, confusion matrix, and ROC curve.

---

### Stage 7 — Regression Models & Evaluation

**Goal:** Regression workflows at parity with classification.

**Tasks:**
- Implement all 9 regression model node executors
- Implement Regression Report, Residual Plot, Actual vs Predicted evaluation node executors
- Feature Importance node shared with classification (tree-based models only; handle non-tree models gracefully)
- End-to-end integration test: Housing dataset → full regression pipeline

**Done when:** User builds a house price regression pipeline end-to-end and sees MAE, R², and residual plot.

---

### Stage 8 — Unsupervised Models & Evaluation

**Goal:** Clustering and dimensionality reduction workflows.

**Tasks:**
- Implement K-Means, Hierarchical, DBSCAN, PCA, t-SNE node executors
- Unsupervised model nodes input `DataFrame` directly (no Train-Test Splitter)
- Output: `DataFrame` with appended cluster label column + `Plot`
- Implement Cluster Report, Cluster Visualization, Elbow Plot evaluation node executors
- PCA and t-SNE outputs are `DataFrame` (transformed coordinates) + `Plot` (2D scatter)
- Elbow Plot accepts a range parameter `k_min` / `k_max` and runs K-Means for each k

**Done when:** User clusters Iris dataset, selects 3 clusters, and sees a colored 2D scatter plot.

---

### Stage 9 — Git-Based Project Management

**Goal:** Projects live on disk, are version-controlled, and can be restored.

**Tasks:**
- Backend: `GitService` wrapping GitPython for all git operations
- `POST /project/create` — creates project directory, `pipeline.json`, `project.yaml`, `data/`, `outputs/`, `node_packages/`, `.gitignore`, initializes git repo
- `POST /project/save` — serializes current pipeline JSON to disk, commits with message
- `GET /project/history` — returns list of commits with hash, message, timestamp
- `POST /project/checkout` — checks out a commit, returns the pipeline JSON from that commit
- `POST /project/branch` — creates a new branch
- Frontend: Project dashboard (list of project directories, last modified, thumbnail of pipeline graph)
- Frontend: New project wizard
- Frontend: Commit history timeline panel (right sidebar or bottom drawer)
- Frontend: Restore version — click commit → confirm dialog → pipeline reloads on canvas
- Frontend: Current branch indicator in top toolbar
- 5 built-in starter pipeline templates (stored as pipeline JSON files in backend)

**Done when:** User creates a project, saves 3 versions, views the timeline, and restores the first version.

---

### Stage 10 — Code Export

**Goal:** Any pipeline exports to runnable Python and Colab-compatible notebook.

**Tasks:**
- Each built-in node package gains a `code_snippet.py` (the code that represents this node in an export)
- `ExportService` traverses the pipeline DAG in topological order, concatenates code snippets
- `POST /export/python` → returns `.py` file
- `POST /export/notebook` → builds `.ipynb` structure with:
  - Cell 0: pip install block
  - Cell 1: imports
  - Subsequent cells: one code cell + one markdown cell per node
- Requirements are auto-derived from all node packages in the pipeline
- Frontend: "Export" button in toolbar → modal with format choice → download
- CI test: exported `.py` scripts for classification, regression, and clustering pipelines execute without errors in a clean Python environment

**Done when:** Classification pipeline exports to `.ipynb`; opening it in Google Colab and running all cells produces the same metrics as the in-app execution.

---

### Stage 11 — Node Package Import/Export UI

**Goal:** Users can import `.vrlnode` packages and export any node as a portable archive.

**Tasks:**
- `POST /nodes/import`: receive `.vrlnode` zip, validate structure, unpack to `<project>/node_packages/`, register in registry, return manifest
- `GET /nodes/export/{node_id}`: zip the node package directory, return as download
- `GET /nodes/installed`: list all nodes in registry grouped by builtin/custom
- Frontend: Node Package Manager panel in sidebar (toggle button)
- Frontend: "Import Node Package" button → file picker → POST → node appears in sidebar immediately
- Frontend: custom nodes shown with a "custom" badge in the sidebar
- Frontend: right-click node on canvas → "Export as .vrlnode" context menu item
- Subprocess sandbox for custom executors (restricted sys.path, no network)
- Validation errors (bad manifest, unsupported version, path traversal in zip) → user-facing error toast with clear message
- Custom node packages committed to git as part of project save

**Done when:** A hand-crafted node package (zipped) can be imported, dragged onto canvas, connected, executed, and re-exported — producing an identical `.vrlnode`.

---

### Stage 12 — Polish, Testing & Documentation

**Goal:** Production-ready v1. All tests pass. A non-technical user can complete the demo unaided.

**Tasks:**
- Achieve ≥ 80% backend test coverage across all node executors, services, and endpoints
- Frontend component tests for parameter panel, pipeline store (undo/redo), port validation
- All 4 E2E Playwright flows passing (see Testing section above)
- Accessibility audit with axe-core; resolve all WCAG 2.1 AA violations in non-canvas UI
- Lighthouse performance audit; score ≥ 85 on all categories
- User-facing error messages for every failure mode (file format errors, incompatible port connections, execution errors, invalid node packages)
- Keyboard shortcuts panel (press `?` to open): full reference of all canvas shortcuts
- First-launch onboarding tour (highlight sidebar, canvas, run button, output panel)
- README with: prerequisites, installation, first pipeline walkthrough, screenshots, architecture diagram
- CHANGELOG.md with stage-by-stage history

**Done when:** All tests pass; Lighthouse ≥ 85; a first-time user completes the Titanic classification demo without help.

---

## Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Pipeline with ≤ 10 nodes executes in < 30s on a standard laptop |
| Responsiveness | Canvas renders at 60fps; no layout jank during node drag |
| Reliability | A failed node reports its error and stops; other previously completed nodes are unaffected |
| Accessibility | WCAG 2.1 AA for all UI outside the canvas area |
| Security | No user data transmitted outside localhost in v1 |
| Portability | Runs on macOS, Windows, Linux via Docker |
| Offline | Fully functional with no internet connection |

---

## Future Scope (Do Not Implement in v1)

These are captured for planning purposes only. Do not implement any of these during v1 stages.

| Feature | Rationale |
|---|---|
| User authentication | Required for multi-user / cloud deployment |
| Cloud execution (AWS/GCP/Modal) | Large datasets beyond laptop RAM |
| GitHub remote sync | Push project repos to GitHub |
| Node package marketplace | Registry of community `.vrlnode` packages |
| Database connector node | PostgreSQL, MySQL, SQLite data source |
| Cross-validation node | k-fold, stratified k-fold evaluation |
| Hyperparameter tuning node | GridSearchCV, RandomizedSearchCV, Optuna |
| Pipeline comparison view | Side-by-side metric comparison of two pipeline runs |
| Dataset versioning (DVC) | Track dataset file changes independently from pipeline |
| Model deployment node | Export model to ONNX or a FastAPI serving endpoint |
| Collaborative editing | Real-time multi-user canvas via CRDTs |
| NLP node pack | Text preprocessing, TF-IDF, text classifiers as `.vrlnode` packages |
| MCP (Model Context Protocol) support | Expose VRL ML Studio as an MCP server so AI assistants (Claude, etc.) can trigger pipeline execution, read node outputs, and query metrics via MCP tools. Also: an MCP Input Node that pulls live data from MCP-compatible tools into the pipeline. Enables AI-assisted ML workflows without leaving an AI assistant. |

---

## Success Metrics (v1)

| Metric | Target |
|---|---|
| Time to first pipeline execution (new user) | < 5 minutes |
| Built-in node types | ≥ 30, all as node packages |
| Algorithms implemented | ≥ 20 |
| Custom node import round-trip | 100% success |
| Exported notebooks run in Google Colab | 100% |
| Pipeline version restore | 100% correct |
| Backend test coverage | ≥ 80% |
| Lighthouse score | ≥ 85 |

---

## Glossary

| Term | Definition |
|---|---|
| DAG | Directed Acyclic Graph — the data structure representing the pipeline |
| Node | A single processing step (e.g., CSV Loader, Random Forest Classifier) |
| Node Package | A directory (or `.vrlnode` zip) containing `manifest.json`, `executor.py`, `parameters.json`, `ui.json` |
| `.vrlnode` | Zip archive of a node package; importable into any project |
| Edge | A connection between an output port of one node and an input port of another |
| Port | A typed connector on a node. Types: `DataFrame`, `SplitData`, `Model`, `Metrics`, `Plot` |
| Pipeline | The complete DAG from data input to evaluation, serialized as `pipeline.json` |
| Executor | The `execute()` function in a node's `executor.py` |
| Node Registry | In-memory catalog of all available node packages, keyed by manifest id |
| DAG Executor | The service that topologically sorts the pipeline and dispatches each node via the registry |
| Canvas | The React Flow visual editing area |
| Project | A directory on disk containing `pipeline.json`, `project.yaml`, `data/`, and a `.git` repo |
| Stage Gate | The approval checkpoint between development stages — Dr. Tiwari must approve before the next stage starts |
