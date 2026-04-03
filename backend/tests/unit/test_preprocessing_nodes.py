"""Tests for all 9 preprocessing node executors."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def df_with_nulls() -> pd.DataFrame:
    return pd.DataFrame({
        "age": [25, 30, np.nan, 35, 40],
        "salary": [50000, 60000, 70000, np.nan, 90000],
        "city": ["NYC", "LA", "NYC", "LA", "NYC"],
        "gender": ["M", "F", "M", "F", "M"],
        "target": [1, 0, 1, 0, 1],
    })


@pytest.fixture
def df_clean() -> pd.DataFrame:
    return pd.DataFrame({
        "age": [25, 30, 35, 40, 45, 50],
        "salary": [50000, 60000, 70000, 80000, 90000, 100000],
        "city": ["NYC", "LA", "NYC", "LA", "NYC", "SF"],
        "gender": ["M", "F", "M", "F", "M", "F"],
        "target": [1, 0, 1, 0, 1, 0],
    })


CTX: dict = {}


# ── Missing Value Imputer ────────────────────────────────────────────────────


class TestMissingValueImputer:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.missing_value_imputer.executor import execute
        defaults = {"strategy": "mean", "fill_value": "", "columns": []}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_mean_strategy(self, df_with_nulls: pd.DataFrame):
        result = self._exec(df_with_nulls.copy(), strategy="mean")
        out = result["dataframe_out"]
        assert out.isnull().sum().sum() == 0
        assert out.shape == df_with_nulls.shape

    def test_median_strategy(self, df_with_nulls: pd.DataFrame):
        result = self._exec(df_with_nulls.copy(), strategy="median")
        assert result["dataframe_out"].isnull().sum().sum() == 0

    def test_most_frequent_strategy(self, df_with_nulls: pd.DataFrame):
        result = self._exec(df_with_nulls.copy(), strategy="most_frequent")
        assert result["dataframe_out"].isnull().sum().sum() == 0

    def test_constant_strategy(self, df_with_nulls: pd.DataFrame):
        result = self._exec(df_with_nulls.copy(), strategy="constant", fill_value="0")
        assert result["dataframe_out"].isnull().sum().sum() == 0

    def test_specific_columns(self, df_with_nulls: pd.DataFrame):
        result = self._exec(df_with_nulls.copy(), columns=["age"])
        out = result["dataframe_out"]
        assert out["age"].isnull().sum() == 0
        assert out["salary"].isnull().sum() == 1  # untouched

    def test_no_mutation(self, df_with_nulls: pd.DataFrame):
        original = df_with_nulls.copy()
        self._exec(df_with_nulls, strategy="mean")
        pd.testing.assert_frame_equal(df_with_nulls, original)


# ── Encoder ──────────────────────────────────────────────────────────────────


class TestEncoder:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.encoder.executor import execute
        defaults = {"method": "onehot", "columns": [], "drop_first": True}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_onehot_default(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy())
        out = result["dataframe_out"]
        assert "city" not in out.columns
        assert any("city" in str(c) for c in out.columns)

    def test_label_encoding(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), method="label")
        out = result["dataframe_out"]
        # Label encoder maps strings to integers; values are numeric even if dtype is object
        assert set(out["city"].unique()).issubset({0, 1, 2, "0", "1", "2", 0, 1, 2})

    def test_ordinal_encoding(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), method="ordinal")
        out = result["dataframe_out"]
        assert out["city"].dtype == np.float64

    def test_specific_columns(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), method="label", columns=["city"])
        out = result["dataframe_out"]
        assert out["gender"].dtype == object  # untouched


# ── Feature Scaler ───────────────────────────────────────────────────────────


class TestFeatureScaler:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.feature_scaler.executor import execute
        defaults = {"method": "standard", "columns": []}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_standard_scaling(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy())
        out = result["dataframe_out"]
        assert abs(out["age"].mean()) < 1e-10
        assert abs(out["salary"].mean()) < 1e-10

    def test_minmax_scaling(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), method="minmax")
        out = result["dataframe_out"]
        assert out["age"].min() >= -1e-10
        assert out["age"].max() <= 1 + 1e-10

    def test_robust_scaling(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), method="robust")
        out = result["dataframe_out"]
        assert out["age"].median() == pytest.approx(0, abs=1e-10)

    def test_specific_columns(self, df_clean: pd.DataFrame):
        original_salary = df_clean["salary"].copy()
        result = self._exec(df_clean.copy(), columns=["age"])
        out = result["dataframe_out"]
        pd.testing.assert_series_equal(out["salary"], original_salary)


# ── Feature Selector ─────────────────────────────────────────────────────────


class TestFeatureSelector:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.feature_selector.executor import execute
        defaults = {"method": "manual", "columns": [], "threshold": 0.0, "correlation_target": None}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_manual_selection(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), columns=["age", "salary"])
        assert list(result["dataframe_out"].columns) == ["age", "salary"]

    def test_variance_threshold(self, df_clean: pd.DataFrame):
        numeric = df_clean.select_dtypes(include="number").copy()
        result = self._exec(numeric, method="variance", threshold=0.0)
        assert result["dataframe_out"].shape[1] > 0


# ── Train-Test Splitter ──────────────────────────────────────────────────────


class TestTrainTestSplitter:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.train_test_splitter.executor import execute
        defaults = {"test_size": 0.2, "random_state": 42, "stratify": False, "target_col": "target"}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_basic_split(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy())
        sd = result["split_data_out"]
        assert "train" in sd and "test" in sd
        assert sd["target_col"] == "target"
        assert sd["train"].shape[0] + sd["test"].shape[0] == df_clean.shape[0]

    def test_split_proportions(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), test_size=0.5)
        sd = result["split_data_out"]
        assert sd["test"].shape[0] == 3

    def test_random_state_reproducible(self, df_clean: pd.DataFrame):
        r1 = self._exec(df_clean.copy(), random_state=42)
        r2 = self._exec(df_clean.copy(), random_state=42)
        pd.testing.assert_frame_equal(r1["split_data_out"]["train"], r2["split_data_out"]["train"])

    def test_stratified_split(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), stratify=True, target_col="target", test_size=0.5)
        sd = result["split_data_out"]
        assert sd["train"].shape[0] + sd["test"].shape[0] == df_clean.shape[0]


# ── Outlier Handler ──────────────────────────────────────────────────────────


class TestOutlierHandler:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.outlier_handler.executor import execute
        defaults = {"method": "iqr", "action": "cap", "threshold": 1.5, "columns": []}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_cap_action(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy())
        assert result["dataframe_out"].shape == df_clean.shape

    def test_remove_action(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), action="remove")
        assert result["dataframe_out"].shape[0] <= df_clean.shape[0]

    def test_flag_action(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), action="flag")
        out = result["dataframe_out"]
        assert any("_outlier" in str(c) for c in out.columns)

    def test_zscore_method(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), method="zscore", threshold=3.0)
        assert result["dataframe_out"].shape == df_clean.shape


# ── Column Dropper ───────────────────────────────────────────────────────────


class TestColumnDropper:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.column_dropper.executor import execute
        defaults = {"columns": []}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_drop_columns(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), columns=["city", "gender"])
        assert "city" not in result["dataframe_out"].columns
        assert "gender" not in result["dataframe_out"].columns
        assert "age" in result["dataframe_out"].columns

    def test_empty_columns_raises(self, df_clean: pd.DataFrame):
        with pytest.raises(ValueError):
            self._exec(df_clean.copy(), columns=[])


# ── Type Caster ──────────────────────────────────────────────────────────────


class TestTypeCaster:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.type_caster.executor import execute
        defaults = {"column": None, "target_type": "float", "errors": "coerce"}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_cast_to_str(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), column="target", target_type="str")
        assert result["dataframe_out"]["target"].dtype == object

    def test_cast_to_float(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), column="target", target_type="float")
        assert result["dataframe_out"]["target"].dtype == np.float64

    def test_cast_to_category(self, df_clean: pd.DataFrame):
        result = self._exec(df_clean.copy(), column="city", target_type="category")
        assert result["dataframe_out"]["city"].dtype.name == "category"


# ── Duplicate Remover ────────────────────────────────────────────────────────


class TestDuplicateRemover:
    def _exec(self, df: pd.DataFrame, **params):
        from node_packages.builtin.duplicate_remover.executor import execute
        defaults = {"subset_columns": [], "keep": "first"}
        return execute({"dataframe_in": df}, {**defaults, **params}, CTX)

    def test_remove_exact_duplicates(self):
        df = pd.DataFrame({"a": [1, 1, 2, 3], "b": [10, 10, 20, 30]})
        result = self._exec(df)
        assert result["dataframe_out"].shape[0] == 3

    def test_subset_columns(self):
        df = pd.DataFrame({"a": [1, 1, 2], "b": [10, 20, 30]})
        result = self._exec(df, subset_columns=["a"])
        assert result["dataframe_out"].shape[0] == 2

    def test_keep_last(self):
        df = pd.DataFrame({"a": [1, 1, 2], "b": [10, 10, 30]})
        result = self._exec(df, keep="last")
        out = result["dataframe_out"]
        # Two identical rows (a=1, b=10); keep="last" keeps the second one
        assert out.shape[0] == 2

    def test_keep_none(self):
        df = pd.DataFrame({"a": [1, 1, 2], "b": [10, 10, 30]})
        result = self._exec(df, keep="none")
        assert result["dataframe_out"].shape[0] == 1


# ── Output Serializer — SplitData ────────────────────────────────────────────


class TestSplitDataSerializer:
    def test_split_data_serialization(self, df_clean: pd.DataFrame):
        from services.output_serializer import serialize_node_outputs
        split = {"train": df_clean.head(4), "test": df_clean.tail(2), "target_col": "target"}
        result = serialize_node_outputs({"split_data_out": split})
        out = result["split_data_out"]
        assert out["type"] == "split_data"
        assert out["target_col"] == "target"
        assert out["train"]["type"] == "dataframe"
        assert out["test"]["type"] == "dataframe"
        assert out["train"]["shape"] == [4, 5]
        assert out["test"]["shape"] == [2, 5]
