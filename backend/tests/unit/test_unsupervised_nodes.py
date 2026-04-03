"""Tests for unsupervised model and clustering evaluation node executors."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from sklearn.datasets import load_iris


@pytest.fixture
def iris_df() -> pd.DataFrame:
    """Iris dataset as a plain DataFrame (no target, no split)."""
    data = load_iris()
    return pd.DataFrame(data.data, columns=data.feature_names)


@pytest.fixture
def clustered_df(iris_df: pd.DataFrame) -> pd.DataFrame:
    """Iris DataFrame with K-Means cluster labels appended."""
    from node_packages.builtin.kmeans.executor import execute
    result = execute(
        {"dataframe_in": iris_df},
        {"n_clusters": 3, "random_state": 42},
        {},
    )
    return result["dataframe_out"]


CTX: dict = {}


# ── Unsupervised Model Nodes ────────────────────────────────────────────────


class TestKMeans:
    def test_basic(self, iris_df: pd.DataFrame):
        from node_packages.builtin.kmeans.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"n_clusters": 3, "random_state": 42},
            CTX,
        )
        df_out = result["dataframe_out"]
        assert "cluster" in df_out.columns
        assert df_out["cluster"].nunique() == 3
        assert "data" in result["plot_out"]
        assert "layout" in result["plot_out"]

    def test_different_k(self, iris_df: pd.DataFrame):
        from node_packages.builtin.kmeans.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"n_clusters": 5, "random_state": 42},
            CTX,
        )
        assert result["dataframe_out"]["cluster"].nunique() == 5


class TestHierarchicalClustering:
    def test_basic(self, iris_df: pd.DataFrame):
        from node_packages.builtin.hierarchical_clustering.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"n_clusters": 3},
            CTX,
        )
        df_out = result["dataframe_out"]
        assert "cluster" in df_out.columns
        assert df_out["cluster"].nunique() == 3
        assert "data" in result["plot_out"]


class TestDBSCAN:
    def test_basic(self, iris_df: pd.DataFrame):
        from node_packages.builtin.dbscan.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"eps": 0.8, "min_samples": 5},
            CTX,
        )
        df_out = result["dataframe_out"]
        assert "cluster" in df_out.columns
        assert "data" in result["plot_out"]

    def test_tight_eps_produces_noise(self, iris_df: pd.DataFrame):
        from node_packages.builtin.dbscan.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"eps": 0.1, "min_samples": 10},
            CTX,
        )
        # Very tight eps should produce noise points (label = -1)
        labels = result["dataframe_out"]["cluster"]
        assert "-1" in labels.values or -1 in labels.values


class TestPCA:
    def test_basic(self, iris_df: pd.DataFrame):
        from node_packages.builtin.pca.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"n_components": 2},
            CTX,
        )
        df_out = result["dataframe_out"]
        assert df_out.shape == (150, 2)
        assert "PC1" in df_out.columns
        assert "PC2" in df_out.columns
        assert "data" in result["plot_out"]

    def test_3_components(self, iris_df: pd.DataFrame):
        from node_packages.builtin.pca.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"n_components": 3},
            CTX,
        )
        assert result["dataframe_out"].shape[1] == 3


class TestTSNE:
    def test_basic(self, iris_df: pd.DataFrame):
        from node_packages.builtin.tsne.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"n_components": 2, "perplexity": 30, "random_state": 42},
            CTX,
        )
        df_out = result["dataframe_out"]
        assert df_out.shape == (150, 2)
        assert "data" in result["plot_out"]


# ── Clustering Evaluation Nodes ─────────────────────────────────────────────


class TestClusterReport:
    def test_basic(self, clustered_df: pd.DataFrame):
        from node_packages.builtin.cluster_report.executor import execute
        result = execute(
            {"dataframe_in": clustered_df},
            {"cluster_col": "cluster"},
            CTX,
        )
        metrics = result["metrics_out"]
        assert "silhouette" in metrics
        assert "davies_bouldin" in metrics
        assert "n_clusters" in metrics
        assert metrics["n_clusters"] == 3
        assert -1 <= metrics["silhouette"] <= 1


class TestClusterVisualization:
    def test_basic(self, clustered_df: pd.DataFrame):
        from node_packages.builtin.cluster_visualization.executor import execute
        result = execute(
            {"dataframe_in": clustered_df},
            {"cluster_col": "cluster"},
            CTX,
        )
        plot = result["plot_out"]
        assert "data" in plot
        assert "layout" in plot


class TestElbowPlot:
    def test_basic(self, iris_df: pd.DataFrame):
        from node_packages.builtin.elbow_plot.executor import execute
        result = execute(
            {"dataframe_in": iris_df},
            {"k_min": 2, "k_max": 6, "random_state": 42},
            CTX,
        )
        plot = result["plot_out"]
        assert "data" in plot
        assert len(plot["data"]) >= 1

    def test_invalid_k_range(self, iris_df: pd.DataFrame):
        from node_packages.builtin.elbow_plot.executor import execute
        with pytest.raises(ValueError, match="k_min"):
            execute(
                {"dataframe_in": iris_df},
                {"k_min": 10, "k_max": 5},
                CTX,
            )
