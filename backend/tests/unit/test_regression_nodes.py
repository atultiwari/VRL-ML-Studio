"""Tests for regression model and evaluation node executors."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from sklearn.datasets import load_diabetes
from sklearn.model_selection import train_test_split


@pytest.fixture
def diabetes_split() -> dict:
    """Diabetes dataset as a SplitData dict (regression)."""
    data = load_diabetes()
    df = pd.DataFrame(data.data, columns=data.feature_names)
    df["target"] = data.target
    train_df, test_df = train_test_split(df, test_size=0.3, random_state=42)
    return {"train": train_df, "test": test_df, "target_col": "target"}


@pytest.fixture
def trained_rfr(diabetes_split: dict):
    """Pre-trained Random Forest Regressor for evaluation tests."""
    from node_packages.builtin.random_forest_regressor.executor import execute
    result = execute(
        {"split_data_in": diabetes_split},
        {"n_estimators": 50, "random_state": 42},
        {},
    )
    return result["model_out"], result["dataframe_out"]


CTX: dict = {}


# ── Regression Model Nodes ────────────────────────────────────────��──────────


class TestLinearRegression:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.linear_regression.executor import execute
        result = execute({"split_data_in": diabetes_split}, {}, CTX)
        assert hasattr(result["model_out"], "predict")
        assert isinstance(result["dataframe_out"], pd.DataFrame)


class TestRidgeRegression:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.ridge_regression.executor import execute
        result = execute({"split_data_in": diabetes_split}, {"alpha": 1.0}, CTX)
        assert hasattr(result["model_out"], "predict")


class TestLassoRegression:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.lasso_regression.executor import execute
        result = execute({"split_data_in": diabetes_split}, {"alpha": 0.1}, CTX)
        assert hasattr(result["model_out"], "predict")


class TestElasticNet:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.elasticnet.executor import execute
        result = execute(
            {"split_data_in": diabetes_split},
            {"alpha": 0.1, "l1_ratio": 0.5},
            CTX,
        )
        assert hasattr(result["model_out"], "predict")


class TestDecisionTreeRegressor:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.decision_tree_regressor.executor import execute
        result = execute({"split_data_in": diabetes_split}, {}, CTX)
        assert hasattr(result["model_out"], "predict")
        assert hasattr(result["model_out"], "feature_importances_")


class TestRandomForestRegressor:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.random_forest_regressor.executor import execute
        result = execute(
            {"split_data_in": diabetes_split},
            {"n_estimators": 10, "random_state": 42},
            CTX,
        )
        assert hasattr(result["model_out"], "predict")
        assert hasattr(result["model_out"], "feature_importances_")
        assert result["dataframe_out"].shape[0] == diabetes_split["test"].shape[0]


class TestSVR:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.svr.executor import execute
        result = execute({"split_data_in": diabetes_split}, {"kernel": "rbf"}, CTX)
        assert hasattr(result["model_out"], "predict")


class TestKNNRegressor:
    def test_basic(self, diabetes_split: dict):
        from node_packages.builtin.knn_regressor.executor import execute
        result = execute({"split_data_in": diabetes_split}, {"n_neighbors": 5}, CTX)
        assert hasattr(result["model_out"], "predict")


# ── Regression Evaluation Nodes ──────────────────────────────────────────────


class TestRegressionReport:
    def test_basic(self, trained_rfr):
        from node_packages.builtin.regression_report.executor import execute
        model, test_df = trained_rfr
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target"},
            CTX,
        )
        metrics = result["metrics_out"]
        assert "mae" in metrics
        assert "mse" in metrics
        assert "rmse" in metrics
        assert "r2" in metrics
        assert "adj_r2" in metrics
        assert metrics["mae"] >= 0
        assert metrics["rmse"] >= 0


class TestResidualPlot:
    def test_basic(self, trained_rfr):
        from node_packages.builtin.residual_plot.executor import execute
        model, test_df = trained_rfr
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target"},
            CTX,
        )
        plot = result["plot_out"]
        assert "data" in plot
        assert "layout" in plot


class TestActualVsPredicted:
    def test_basic(self, trained_rfr):
        from node_packages.builtin.actual_vs_predicted.executor import execute
        model, test_df = trained_rfr
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target"},
            CTX,
        )
        plot = result["plot_out"]
        assert "data" in plot
        assert "layout" in plot


# ── Feature Importance shared with regression ────────────────────────────────


class TestFeatureImportanceRegression:
    def test_tree_regressor(self, trained_rfr):
        from node_packages.builtin.feature_importance.executor import execute
        model, test_df = trained_rfr
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target", "top_n": 10},
            CTX,
        )
        assert "data" in result["plot_out"]
