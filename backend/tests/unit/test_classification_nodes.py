"""Tests for classification model and evaluation node executors."""
from __future__ import annotations

import pytest
import pandas as pd
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split


@pytest.fixture
def iris_split() -> dict:
    """Iris dataset as a SplitData dict."""
    iris = load_iris()
    df = pd.DataFrame(iris.data, columns=iris.feature_names)
    df["target"] = iris.target
    train_df, test_df = train_test_split(
        df, test_size=0.3, random_state=42, stratify=df["target"]
    )
    return {"train": train_df, "test": test_df, "target_col": "target"}


@pytest.fixture
def binary_split() -> dict:
    """Binary classification split (Iris classes 0 and 1 only)."""
    iris = load_iris()
    df = pd.DataFrame(iris.data, columns=iris.feature_names)
    df["target"] = iris.target
    df = df[df["target"].isin([0, 1])].copy()
    train_df, test_df = train_test_split(
        df, test_size=0.3, random_state=42, stratify=df["target"]
    )
    return {"train": train_df, "test": test_df, "target_col": "target"}


@pytest.fixture
def trained_rf(iris_split: dict):
    """Pre-trained Random Forest on Iris for evaluation tests."""
    from node_packages.builtin.random_forest_classifier.executor import execute
    result = execute(
        {"split_data_in": iris_split},
        {"n_estimators": 50, "random_state": 42},
        {},
    )
    return result["model_out"], result["dataframe_out"]


CTX: dict = {}


# ── Classification Model Nodes ───────────────────────────────────────────────


class TestLogisticRegression:
    def test_basic(self, iris_split: dict):
        from node_packages.builtin.logistic_regression.executor import execute
        result = execute({"split_data_in": iris_split}, {"max_iter": 200}, CTX)
        assert hasattr(result["model_out"], "predict")
        assert isinstance(result["dataframe_out"], pd.DataFrame)

    def test_with_params(self, iris_split: dict):
        from node_packages.builtin.logistic_regression.executor import execute
        result = execute(
            {"split_data_in": iris_split},
            {"C": 0.5, "solver": "liblinear", "max_iter": 200},
            CTX,
        )
        assert hasattr(result["model_out"], "predict")


class TestDecisionTreeClassifier:
    def test_basic(self, iris_split: dict):
        from node_packages.builtin.decision_tree_classifier.executor import execute
        result = execute({"split_data_in": iris_split}, {}, CTX)
        assert hasattr(result["model_out"], "predict")
        assert hasattr(result["model_out"], "feature_importances_")


class TestRandomForestClassifier:
    def test_basic(self, iris_split: dict):
        from node_packages.builtin.random_forest_classifier.executor import execute
        result = execute(
            {"split_data_in": iris_split},
            {"n_estimators": 10, "random_state": 42},
            CTX,
        )
        model = result["model_out"]
        assert hasattr(model, "predict")
        assert hasattr(model, "feature_importances_")
        assert result["dataframe_out"].shape[0] == iris_split["test"].shape[0]


class TestSVMClassifier:
    def test_basic(self, iris_split: dict):
        from node_packages.builtin.svm_classifier.executor import execute
        result = execute({"split_data_in": iris_split}, {}, CTX)
        assert hasattr(result["model_out"], "predict")
        assert hasattr(result["model_out"], "predict_proba")  # probability=True


class TestKNNClassifier:
    def test_basic(self, iris_split: dict):
        from node_packages.builtin.knn_classifier.executor import execute
        result = execute({"split_data_in": iris_split}, {"n_neighbors": 3}, CTX)
        assert hasattr(result["model_out"], "predict")


class TestNaiveBayes:
    def test_basic(self, iris_split: dict):
        from node_packages.builtin.naive_bayes.executor import execute
        result = execute({"split_data_in": iris_split}, {}, CTX)
        assert hasattr(result["model_out"], "predict")
        assert hasattr(result["model_out"], "predict_proba")


class TestGradientBoostingClassifier:
    def test_basic(self, iris_split: dict):
        from node_packages.builtin.gradient_boosting_classifier.executor import execute
        result = execute(
            {"split_data_in": iris_split},
            {"n_estimators": 10, "random_state": 42},
            CTX,
        )
        assert hasattr(result["model_out"], "predict")
        assert hasattr(result["model_out"], "feature_importances_")


# ── Classification Evaluation Nodes ──────────────────────────────────────────


class TestClassificationReport:
    def test_basic(self, trained_rf):
        from node_packages.builtin.classification_report.executor import execute
        model, test_df = trained_rf
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target"},
            CTX,
        )
        metrics = result["metrics_out"]
        assert "accuracy" in metrics
        assert "f1_macro" in metrics
        assert 0 <= metrics["accuracy"] <= 1


class TestConfusionMatrix:
    def test_basic(self, trained_rf):
        from node_packages.builtin.confusion_matrix.executor import execute
        model, test_df = trained_rf
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target"},
            CTX,
        )
        plot = result["plot_out"]
        assert "data" in plot
        assert "layout" in plot


class TestROCAUCCurve:
    def test_multiclass(self, trained_rf):
        from node_packages.builtin.roc_auc_curve.executor import execute
        model, test_df = trained_rf
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target"},
            CTX,
        )
        assert "data" in result["plot_out"]
        assert "auc_macro" in result["metrics_out"]

    def test_binary(self, binary_split):
        from node_packages.builtin.random_forest_classifier.executor import execute as rf_exec
        rf = rf_exec({"split_data_in": binary_split}, {"n_estimators": 10, "random_state": 42}, CTX)
        from node_packages.builtin.roc_auc_curve.executor import execute
        result = execute(
            {"model_in": rf["model_out"], "dataframe_in": rf["dataframe_out"]},
            {"target_col": "target"},
            CTX,
        )
        assert "data" in result["plot_out"]
        metrics = result["metrics_out"]
        assert any("auc" in k for k in metrics)


class TestPrecisionRecallCurve:
    def test_basic(self, trained_rf):
        from node_packages.builtin.precision_recall_curve.executor import execute
        model, test_df = trained_rf
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target"},
            CTX,
        )
        assert "data" in result["plot_out"]


class TestFeatureImportance:
    def test_tree_model(self, trained_rf):
        from node_packages.builtin.feature_importance.executor import execute
        model, test_df = trained_rf
        result = execute(
            {"model_in": model, "dataframe_in": test_df},
            {"target_col": "target", "top_n": 10},
            CTX,
        )
        assert "data" in result["plot_out"]

    def test_non_tree_model_raises(self, iris_split):
        from node_packages.builtin.svm_classifier.executor import execute as svm_exec
        from node_packages.builtin.feature_importance.executor import execute
        svm_result = svm_exec({"split_data_in": iris_split}, {}, CTX)
        with pytest.raises(ValueError, match="[Ff]eature importance"):
            execute(
                {"model_in": svm_result["model_out"], "dataframe_in": svm_result["dataframe_out"]},
                {"target_col": "target"},
                CTX,
            )
