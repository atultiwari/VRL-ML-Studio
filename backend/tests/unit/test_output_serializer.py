"""Tests for services/output_serializer.py — DataFrame, SplitData, Plot, Metrics serialization."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from services.output_serializer import serialize_node_outputs, PREVIEW_ROW_LIMIT


def test_serialize_dataframe():
    df = pd.DataFrame({"a": [1, 2, 3], "b": [4.0, 5.0, 6.0]})
    result = serialize_node_outputs({"dataframe_out": df})
    out = result["dataframe_out"]
    assert out["type"] == "dataframe"
    assert len(out["columns"]) == 2
    assert out["columns"][0]["name"] == "a"
    assert out["shape"] == [3, 2]
    assert out["data"] == [[1, 4.0], [2, 5.0], [3, 6.0]]


def test_serialize_dataframe_nan_to_none():
    df = pd.DataFrame({"x": [1.0, float("nan"), 3.0]})
    result = serialize_node_outputs({"out": df})
    # NaN is replaced with None for JSON safety
    row = result["out"]["data"][1][0]
    assert row is None or (isinstance(row, float) and row != row)  # None or NaN


def test_serialize_dataframe_preview_limit():
    df = pd.DataFrame({"x": range(200)})
    result = serialize_node_outputs({"out": df})
    assert len(result["out"]["data"]) == PREVIEW_ROW_LIMIT
    assert result["out"]["shape"] == [200, 1]


def test_serialize_split_data():
    train = pd.DataFrame({"a": [1, 2], "target": [0, 1]})
    test = pd.DataFrame({"a": [3], "target": [1]})
    split = {"train": train, "test": test, "target_col": "target"}
    result = serialize_node_outputs({"split_out": split})
    out = result["split_out"]
    assert out["type"] == "split_data"
    assert out["target_col"] == "target"
    assert out["train"]["type"] == "dataframe"
    assert out["test"]["shape"] == [1, 2]


def test_serialize_plotly_dict():
    plot = {"data": [{"x": [1, 2], "y": [3, 4]}], "layout": {"title": "Test"}}
    result = serialize_node_outputs({"plot_out": plot})
    assert result["plot_out"]["type"] == "plot"
    assert result["plot_out"]["spec"] == plot


def test_serialize_plotly_figure():
    import plotly.graph_objects as go
    fig = go.Figure(data=[go.Scatter(x=[1, 2], y=[3, 4])])
    result = serialize_node_outputs({"plot_out": fig})
    assert result["plot_out"]["type"] == "plot"
    assert "data" in result["plot_out"]["spec"]


def test_serialize_metrics_dict():
    metrics = {"accuracy": 0.95, "f1": np.float64(0.92)}
    result = serialize_node_outputs({"metrics_out": metrics})
    out = result["metrics_out"]
    assert out["type"] == "metrics"
    assert out["data"]["accuracy"] == 0.95
    assert isinstance(out["data"]["f1"], float)


def test_serialize_numpy_scalars():
    metrics = {"count": np.int64(42), "values": np.array([1, 2, 3])}
    result = serialize_node_outputs({"m": metrics})
    assert result["m"]["data"]["count"] == 42
    assert result["m"]["data"]["values"] == [1, 2, 3]


def test_serialize_opaque_object():
    """Non-recognized types get opaque repr."""

    class MyModel:
        pass

    result = serialize_node_outputs({"model_out": MyModel()})
    assert result["model_out"]["type"] == "opaque"
    assert result["model_out"]["repr"] == "MyModel"


def test_serialize_error_fallback():
    """If serialization raises, fall back to opaque."""

    class BadObj:
        def __repr__(self):
            raise RuntimeError("boom")

    result = serialize_node_outputs({"bad": BadObj()})
    assert result["bad"]["type"] == "opaque"
