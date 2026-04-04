# VRL ML Studio — Ideas & Enhancements

> Post-v1 ideas for VRL ML Studio. Each idea is refined before implementation.
> Status: `proposed` | `refined` | `in-progress` | `done` | `deferred`

---

## Idea 1 — Orange Data Mining Compatibility (Widget Naming)

**Status:** `done`

**Origin:** Users coming from Orange Data Mining find VRL ML Studio harder to navigate because node names differ from Orange's conventions.

**What was done:**
- Renamed 27 node display names (manifest.json `name` field) to match Orange Data Mining widget names
- Internal IDs (`vrl.core.*`) unchanged — no breaking changes
- Updated README tutorial and node catalog
- Updated frontend test fixtures and backend docstrings

**Rename map:**

| Old Name | New Name (Orange-compatible) |
|---|---|
| CSV Loader | CSV File Import |
| Sample Dataset | Datasets |
| Data Profiler | Data Info |
| Distribution Viewer | Distributions |
| Correlation Matrix | Correlations |
| Missing Value Imputer | Impute |
| Encoder | Continuize |
| Feature Selector | Select Columns |
| Duplicate Remover | Unique |
| Outlier Handler | Outliers |
| Train-Test Splitter | Data Sampler |
| Feature Scaler | Preprocess |
| Type Caster | Edit Domain |
| K-Nearest Neighbors | kNN |
| Decision Tree Classifier | Tree |
| Random Forest Classifier | Random Forest |
| Gradient Boosting Classifier | Gradient Boosting |
| SVM Classifier | SVM |
| XGBoost Classifier | XGBoost |
| Decision Tree Regressor | Tree (Regressor) |
| Random Forest Regressor | Random Forest (Regressor) |
| XGBoost Regressor | XGBoost (Regressor) |
| Support Vector Regressor | SVR |
| KNN Regressor | kNN (Regressor) |
| ROC-AUC Curve | ROC Analysis |
| Precision-Recall Curve | Performance Curve |
| Classification Report | Test & Score |

---

## Idea 2 — New Nodes (inspired by Orange)

**Status:** `done` (13 nodes) / remaining `proposed`

Widgets from Orange Data Mining not yet in VRL ML Studio, prioritized by value for tabular data analysis.

### Implemented (13 new nodes)

| Node ID | Name | Category | Description |
|---|---|---|---|
| `vrl.core.select_rows` | Select Rows | preprocessing | Filter rows by conditions (==, !=, >, <, contains, is_null, etc.) |
| `vrl.core.merge_data` | Merge Data | preprocessing | Join two DataFrames (inner, left, right, outer) |
| `vrl.core.concatenate` | Concatenate | preprocessing | Stack DataFrames vertically or horizontally |
| `vrl.core.discretize` | Discretize | preprocessing | Bin continuous columns (equal-width, equal-freq, custom) |
| `vrl.core.adaboost_classifier` | AdaBoost | model.classification | Adaptive Boosting classifier |
| `vrl.core.adaboost_regressor` | AdaBoost (Regressor) | model.regression | Adaptive Boosting regressor |
| `vrl.core.rank` | Rank | data.eda | Feature ranking (mutual info, ANOVA F, chi-squared) |
| `vrl.core.predictions` | Predictions | evaluation.classification | Predictions table with actual vs predicted |
| `vrl.core.save_model` | Save Model | model.classification | Save model as .joblib |
| `vrl.core.load_model` | Load Model | model.classification | Load model from .joblib |
| `vrl.core.violin_plot` | Violin Plot | data.eda | Violin plot with optional grouping |
| `vrl.core.bar_plot` | Bar Plot | data.eda | Bar chart with count/mean/sum/median aggregation |
| `vrl.core.line_plot` | Line Plot | data.eda | Line chart for trends and time series |

### Implemented — Medium Priority (8 nodes)

| Node ID | Name | Category | Description |
|---|---|---|---|
| `vrl.core.create_class` | Create Class | preprocessing | Designate/create target variable column |
| `vrl.core.data_table` | Data Table | data.eda | Interactive data viewer with shape, dtypes, memory info |
| `vrl.core.heat_map` | Heat Map | data.eda | General-purpose heatmap (raw, z-score, pivot modes) |
| `vrl.core.mlp_classifier` | Neural Network | model.classification | MLP classifier for tabular data |
| `vrl.core.mlp_regressor` | Neural Network (Regressor) | model.regression | MLP regressor for tabular data |
| `vrl.core.stacking` | Stacking | model.classification | Ensemble meta-learner combining base classifiers |
| `vrl.core.calibration_plot` | Calibration Plot | evaluation.classification | Reliability diagram with Brier score |
| `vrl.core.silhouette_plot` | Silhouette Plot | evaluation.clustering | Per-sample cluster quality visualization |

### Implemented — Low Priority (8 nodes)

| Node ID | Name | Category | Description |
|---|---|---|---|
| `vrl.core.transpose` | Transpose | preprocessing | Swap rows and columns |
| `vrl.core.group_by` | Group By | preprocessing | SQL-style group-by aggregation |
| `vrl.core.pivot_table` | Pivot Table | preprocessing | Reshape data into pivot format |
| `vrl.core.formula` | Formula | preprocessing | Computed columns via expressions |
| `vrl.core.sgd_classifier` | SGD Classifier | model.classification | Stochastic Gradient Descent classifier |
| `vrl.core.sgd_regressor` | SGD Regressor | model.regression | Stochastic Gradient Descent regressor |
| `vrl.core.louvain_clustering` | Louvain Clustering | model.unsupervised | Graph-based clustering (spectral + kNN graph) |
| `vrl.core.sql_table` | SQL Table | data.input | Database connector (SQLite, PostgreSQL, MySQL) |

---

## Idea 3 — Smart Wizard + Duplicate Blank Template Fix

**Status:** `done`

**Origin:** Two items:
1. **Bug**: "Blank" template appeared twice (both selected) in New Project dialog — backend returns `blank.json` AND frontend hardcoded a Blank entry.
2. **Feature request**: Users new to ML need guided step-by-step pipeline building instead of a blank canvas.

**Bug fix:**
- Filtered backend templates to exclude `blank` before prepending hardcoded entry in `NewProjectDialog.tsx`.

**Smart Wizard — what was done:**
- Added `POST /dataset/preview` backend endpoint returning column metadata (name, dtype, missing count, unique count, is_numeric) + preview rows for sample datasets.
- New Zustand store (`wizardStore.ts`) managing 7-step wizard state.
- New `SmartWizard.tsx` component (full-screen overlay) with these steps:
  1. **Dataset** — choose from 4 sample datasets (Iris, Titanic, Housing, Diabetes)
  2. **Overview** — shows column table, dtypes, missing values, shape summary, row preview
  3. **Target & Features** — target column selector, auto-detect classification/regression, feature column checkboxes
  4. **Preprocessing** — imputation strategy, categorical encoding method, feature scaling
  5. **Train/Test Split** — test size slider, stratification toggle, random seed
  6. **Algorithm** — pick one or more algorithms (8 classification + 8 regression options)
  7. **Review & Build** — summary table, builds pipeline JSON, creates project, auto-executes
- Pipeline builder generates full DAG: Dataset → Select Columns → Impute → Encode → Scale → Split → Model(s) → Evaluation nodes
- Classification pipelines get: Test & Score + Confusion Matrix + ROC Analysis per model
- Regression pipelines get: Regression Report + Actual vs Predicted + Residual Plot per model
- Smart Wizard CTA added to New Project dialog (above templates, with divider)
- All steps navigable forward and backward after wizard completion (via step indicator)
- Pipeline auto-executes after creation so results are immediately visible

**Files changed:**
- `backend/routers/project.py` — new `/dataset/preview` endpoint
- `frontend/src/lib/api.ts` — `datasetPreview()` API client
- `frontend/src/store/wizardStore.ts` — new store
- `frontend/src/components/wizard/SmartWizard.tsx` — new component
- `frontend/src/components/dashboard/NewProjectDialog.tsx` — bug fix + wizard CTA
- `frontend/src/components/dashboard/ProjectDashboard.tsx` — pass `onOpenWizard` prop
- `frontend/src/App.tsx` — added 'wizard' view type and handlers

---

## Idea 4 — Canvas Quick Node Picker (Right-Click + Connection Drop)

**Status:** `done`

**Origin:** Two related UX improvements to speed up pipeline building without the sidebar:

### Feature A — Right-Click Canvas Context Menu
**Problem:** Adding nodes requires the sidebar. Users want a faster way to place nodes directly where they're working on the canvas.

**Solution:** Right-click on empty canvas area opens an inline node picker popup at the cursor position:
- Quick-filter text input (auto-focused) for instant search by name, category, or description
- Grouped by category with sticky headers (same groups as sidebar)
- Keyboard navigation: arrow keys to move, Enter to select, Escape to close
- Clicking a node inserts it at the right-click position and dismisses the popup
- Popup clamped to viewport edges to prevent overflow

### Feature B — Connection-Drop Auto-Complete
**Problem:** When dragging a connection from an output port and releasing on empty canvas, nothing happens. Missed opportunity for streamlined pipeline building.

**Solution:** When a connection drag ends without connecting to a target port, the same node picker popup opens but **pre-filtered to only nodes with compatible input ports**:
- Only nodes with an input port matching the source output port type are listed
- Selecting a node places it at the drop position AND auto-connects the dragged port to the first compatible input port
- Port type hint displayed at top of popup (e.g., "Showing nodes with DataFrame input port")
- Filter text box still works for further narrowing within compatible nodes
- If no compatible nodes exist, shows "No compatible nodes for [PortType]" message

**Technical approach:**
- New `NodePickerPopup` component in `frontend/src/components/canvas/`
- React Flow `onConnectStart` tracks pending connection source (node + handle)
- React Flow `onConnectEnd` detects drops on empty canvas (not on a handle element)
- React Flow `onPaneContextMenu` handles right-click on empty pane
- After node creation from connection drop, `requestAnimationFrame` reads latest store state to get the new node ID, then calls `onConnect` programmatically

**Files changed:**
- `frontend/src/components/canvas/NodePickerPopup.tsx` — new component
- `frontend/src/components/canvas/Canvas.tsx` — added state, event handlers, popup rendering

---

## Idea 5 — Smart Wizard Export (Python Script + Colab Notebook)

**Status:** `done`

**Origin:** After building a pipeline through the Smart Wizard, users want to export the generated pipeline as a `.py` script or a Google Colab-compatible `.ipynb` notebook — without first loading it onto the canvas.

**Analysis:**
- The backend already has `POST /export/python` and `POST /export/notebook` endpoints via `ExportService`
- The frontend already has `exportPython()` and `exportNotebook()` API client functions
- The wizard's `buildPipeline()` already produces a complete `PipelineJSON`
- **This was a frontend-only change** — no new backend code required

**What was done:**
- Added two export buttons to the wizard's final step (Step 7: "Review & Build"):
  - "Export .py" — calls `exportPython()` with the wizard-generated pipeline, triggers browser download
  - "Export .ipynb" — calls `exportNotebook()` with the wizard-generated pipeline, triggers browser download
- Three clear exit paths in the footer: Export .py | Export .ipynb | Build Pipeline
- Loading state with spinner during export (disabled state prevents double-clicks)
- Error handling with inline error message in the review step
- Pipeline name derived from dataset name (reused from `handleBuild` via shared `getPipelineName()`)
- Updated StepBuild description to explain all three actions

**Files changed:**
- `frontend/src/components/wizard/SmartWizard.tsx` — added export imports, `handleExport()`, `getPipelineName()`, export buttons in footer, error display in StepBuild

---

## Archive

_Completed ideas move here with implementation notes._

- **Idea 1 (Orange Naming)** — Completed 2026-04-03. 27 nodes renamed.
- **Idea 2 (New Nodes)** — Completed 2026-04-04. 29 Orange-inspired nodes added (total: 81 nodes).
- **Idea 3 (Smart Wizard)** — Completed 2026-04-04. 7-step guided pipeline builder + duplicate blank fix.
- **Idea 4 (Canvas Quick Node Picker)** — Completed 2026-04-04. Right-click picker + connection-drop auto-complete.
- **Idea 5 (Wizard Export)** — Completed 2026-04-04. Export .py and .ipynb directly from Smart Wizard (frontend-only).
