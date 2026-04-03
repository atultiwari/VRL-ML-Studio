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

## Archive

_Completed ideas move here with implementation notes._

- **Idea 1 (Orange Naming)** — Completed 2026-04-03. 27 nodes renamed.
- **Idea 2 (New Nodes)** — Completed 2026-04-04. 29 Orange-inspired nodes added (total: 81 nodes).
