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

## Future Node Additions (inspired by Orange)

**Status:** `proposed`

Widgets from Orange Data Mining not yet in VRL ML Studio, prioritized by value for tabular data analysis.

### High Priority

| Widget | Category | Description |
|---|---|---|
| Select Rows | Transform | Filter rows by conditions (e.g., Age > 30, column == "value") |
| Merge Data | Transform | Join two DataFrames on key columns (inner, left, right, outer) |
| Concatenate | Transform | Stack two DataFrames vertically |
| AdaBoost | Model | Popular boosting ensemble (sklearn AdaBoostClassifier/Regressor) |
| Save Model / Load Model | Model | Persist trained models to disk as .pkl or .joblib |
| Predictions | Evaluate | Dedicated table viewer for model predictions + actuals |
| Rank | Data | Feature ranking by mutual info, ANOVA, chi-squared scores |

### Medium Priority

| Widget | Category | Description |
|---|---|---|
| Discretize | Transform | Bin continuous columns into categorical (equal-width, equal-freq, entropy) |
| Create Class | Transform | Designate/change the target variable column |
| Data Table | Data | Dedicated interactive data viewer (separate from Data Info) |
| Violin Plot | Visualize | Distribution visualization richer than box plot |
| Bar Plot | Visualize | Categorical frequency / aggregation bar chart |
| Line Plot | Visualize | Time series / trend line visualization |
| Heat Map | Visualize | General-purpose heatmap (beyond correlation) |
| Neural Network (MLP) | Model | sklearn MLPClassifier/MLPRegressor for tabular data |
| Stacking | Model | Ensemble meta-learner combining multiple base models |
| Calibration Plot | Evaluate | Probability calibration visualization |
| Silhouette Plot | Evaluate | Per-sample cluster quality visualization |

### Low Priority

| Widget | Category | Description |
|---|---|---|
| SGD Classifier/Regressor | Model | Stochastic Gradient Descent (large dataset friendly) |
| Louvain Clustering | Unsupervised | Graph-based community detection clustering |
| Transpose | Transform | Swap rows and columns |
| Group By | Transform | SQL-style group-by aggregation |
| Pivot Table | Transform | Reshape data into pivot format |
| Formula | Transform | Computed columns via expressions |
| SQL Table | Data | Direct database connector (PostgreSQL, MySQL, SQLite) |

---

## Archive

_Completed ideas move here with implementation notes._

- **Idea 1 (Orange Naming)** — Completed 2026-04-03. 27 nodes renamed.
