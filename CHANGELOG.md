# Changelog

All notable changes to VRL ML Studio are documented here. Each stage represents a working, demo-able increment.

---

## Stage 12 — Polish, Testing & Documentation

- Backend test coverage raised to 89% (188 tests)
- Frontend unit tests: pipeline store (undo/redo, serialization, load), 23 tests passing
- Integration tests for execute endpoint (POST + WebSocket), file upload, node import/export
- Keyboard shortcuts panel (press `?` to open)
- First-launch onboarding tour (6 steps, localStorage persistence)
- README rewritten with first pipeline walkthrough, full node catalog, shortcuts reference
- CHANGELOG created

## Stage 11 — Node Package Import/Export UI

- `POST /nodes/import`: validates .vrlnode zip (path traversal, required files, manifest schema, studio version compatibility)
- `GET /nodes/export/{node_id}`: zips package dir, returns .vrlnode download
- `GET /nodes/installed`: groups nodes by builtin/custom
- Frontend: Import button in sidebar header with file picker (.vrlnode/.zip)
- Custom nodes display purple "custom" badge in sidebar
- Right-click node on canvas opens context menu: "Export as .vrlnode" and "Delete Node"
- 11 integration tests for import validation, path traversal rejection, round-trip

## Stage 10 — Code Export (Python Scripts + Jupyter Notebooks)

- ExportService: traverses pipeline DAG, loads `code_snippet.py` from each node package
- Variable flow resolution between connected nodes (prefix-based naming: df_, split_, model_)
- Import deduplication and pip requirement derivation
- `POST /export/python` returns standalone .py file
- `POST /export/notebook` returns .ipynb with markdown cells between code cells
- 52 `code_snippet.py` files added to all built-in node packages
- Frontend: Export dialog with Python/Notebook format selection
- 17 export service unit tests

## Stage 9 — Git-Based Project Management

- GitService wrapping GitPython for all version control operations
- Project CRUD: create, save (auto-commit), history, checkout, branch
- Project dashboard with list view, last modified, tags
- New project wizard with 5 starter templates (Titanic, Housing, Iris, Diabetes, blank)
- Commit history timeline panel with restore functionality
- Pipeline deserialization from JSON (loadPipelineFromJSON)

## Stage 8 — Unsupervised Models & Evaluation

- 5 unsupervised model nodes: K-Means, Hierarchical Clustering, DBSCAN, PCA, t-SNE
- 3 clustering evaluation nodes: Cluster Report, Cluster Visualization, Elbow Plot
- PCA/t-SNE output transformed coordinates + 2D scatter plot
- Elbow method runs K-Means for a range of k values

## Stage 7 — Regression Models & Evaluation

- 9 regression model nodes: Linear, Ridge, Lasso, ElasticNet, Decision Tree, Random Forest, XGBoost, SVR, KNN
- 3 regression evaluation nodes: Regression Report (MAE, MSE, RMSE, R2), Residual Plot, Actual vs Predicted
- Feature Importance shared with classification (tree-based models)

## Stage 6 — Classification Models & Evaluation

- 8 classification model nodes: Logistic Regression, Decision Tree, Random Forest, XGBoost, SVM, KNN, Naive Bayes, Gradient Boosting
- 5 classification evaluation nodes: Classification Report, Confusion Matrix, ROC-AUC Curve, Precision-Recall Curve, Feature Importance
- Metrics panel with colored cards (green/amber/red based on thresholds)

## Stage 5 — Preprocessing Nodes

- 9 preprocessing nodes: Missing Value Imputer, Encoder, Feature Scaler, Feature Selector, Train-Test Splitter, Outlier Handler, Column Dropper, Type Caster, Duplicate Remover
- Cache layer active: re-running without changes uses cached output
- Partial re-execution: parameter changes invalidate downstream cache
- column_select/multicolumn_select populated from upstream DataFrame columns

## Stage 4 — Data Input & EDA Nodes

- 4 data input nodes: CSV Loader, Excel Loader, Sample Dataset, Manual Data Entry
- 5 EDA nodes: Data Profiler, Distribution Viewer, Correlation Matrix, Scatter Plot, Box Plot
- WebSocket endpoint for real-time execution status streaming
- File upload endpoint with extension validation
- Data preview panel (TanStack Table, paginated, dtype badges)
- Plotly chart rendering for EDA node outputs

## Stage 3 — Parameter Panel

- Dynamic form renderer driven by `parameters.json` from node registry
- All control types: number input, slider, dropdown, multi-select, toggle, column-select
- Basic / Advanced / Help tabs
- Zod validation generated at runtime from parameter schemas
- Reset to defaults button
- Inline node label editing on canvas

## Stage 2 — Canvas Core

- React Flow integration with custom node type renderer (NodeCard)
- Categorized node library sidebar with search
- Drag-from-sidebar to canvas node creation
- Port-to-port connection with type compatibility enforcement
- Undo/redo via Zustand history middleware (Ctrl+Z / Ctrl+Y)
- Zoom, pan, minimap, fit-to-canvas
- Pipeline serialization to JSON

## Stage 1 — Project Scaffolding & Node Package Foundation

- Monorepo: frontend (Vite + React 18 + TypeScript), backend (FastAPI + Python 3.10+)
- Docker Compose with hot reload on both services
- NodeManifest pydantic schema and ParameterSpec models
- NodeRegistry: scans builtin/, validates manifests, registers by id
- DAGExecutor: topological sort (Kahn's algorithm) + generic dispatch
- Cache layer: hash-based output caching per node
- Passthrough node as canonical example
- GET /health endpoint
