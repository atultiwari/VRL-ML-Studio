"""Extended DAG executor tests — error handling, callbacks, caching edge cases."""
from __future__ import annotations

from unittest.mock import MagicMock

import pandas as pd
import pytest

from models.pipeline import PipelineJSON
from services.cache import CacheService
from services.dag_executor import DAGExecutionError, DAGExecutor
from services.node_registry import NodeRegistry


@pytest.fixture
def registry() -> NodeRegistry:
    r = NodeRegistry()
    r.load_builtin_packages()
    return r


@pytest.fixture
def cache() -> CacheService:
    return CacheService()


@pytest.fixture
def executor(registry, cache) -> DAGExecutor:
    return DAGExecutor(registry=registry, cache=cache)


def test_callbacks_called(executor: DAGExecutor):
    """on_node_start and on_node_done are called for each node."""
    pipeline = PipelineJSON(
        nodes=[{"id": "n1", "type": "vrl.core.sample_dataset", "label": "Iris",
                "position": {"x": 0, "y": 0}, "parameters": {"dataset": "iris"}}],
        edges=[],
    )
    on_start = MagicMock()
    on_done = MagicMock()

    executor.execute(pipeline, on_node_start=on_start, on_node_done=on_done)

    on_start.assert_called_once_with("n1")
    on_done.assert_called_once()
    assert on_done.call_args[0][0] == "n1"


def test_on_error_callback_called_on_failure(executor: DAGExecutor):
    """on_node_error is called when a node fails."""
    pipeline = PipelineJSON(
        nodes=[{"id": "n1", "type": "vrl.core.nonexistent", "label": "Bad",
                "position": {"x": 0, "y": 0}, "parameters": {}}],
        edges=[],
    )
    on_error = MagicMock()

    with pytest.raises(DAGExecutionError):
        executor.execute(pipeline, on_node_error=on_error)

    on_error.assert_called_once()
    assert on_error.call_args[0][0] == "n1"


def test_cache_hit_skips_execution(registry: NodeRegistry, cache: CacheService):
    """When cache has output, node is not re-executed."""
    executor = DAGExecutor(registry=registry, cache=cache)
    pipeline = PipelineJSON(
        nodes=[{"id": "n1", "type": "vrl.core.sample_dataset", "label": "Iris",
                "position": {"x": 0, "y": 0}, "parameters": {"dataset": "iris"}}],
        edges=[],
    )

    # First run populates cache
    result1 = executor.execute(pipeline)
    assert "n1" in result1

    # Second run should use cache — verify via on_done still called
    on_start = MagicMock()
    on_done = MagicMock()
    result2 = executor.execute(pipeline, on_node_start=on_start, on_node_done=on_done)

    # on_start should NOT be called (cached node)
    on_start.assert_not_called()
    # on_done IS called with cached result
    on_done.assert_called_once()


def test_cycle_detection(executor: DAGExecutor):
    """Pipeline with a cycle raises ValueError."""
    pipeline = PipelineJSON(
        nodes=[
            {"id": "n1", "type": "vrl.core.passthrough", "label": "A",
             "position": {"x": 0, "y": 0}, "parameters": {}},
            {"id": "n2", "type": "vrl.core.passthrough", "label": "B",
             "position": {"x": 0, "y": 200}, "parameters": {}},
        ],
        edges=[
            {"id": "e1", "source": "n1", "target": "n2",
             "sourcePort": "dataframe_out", "targetPort": "dataframe_in"},
            {"id": "e2", "source": "n2", "target": "n1",
             "sourcePort": "dataframe_out", "targetPort": "dataframe_in"},
        ],
    )
    with pytest.raises(ValueError, match="cycle"):
        executor.execute(pipeline)


def test_edge_referencing_unknown_node(executor: DAGExecutor):
    """Edge referencing a non-existent node raises ValueError."""
    pipeline = PipelineJSON(
        nodes=[
            {"id": "n1", "type": "vrl.core.passthrough", "label": "A",
             "position": {"x": 0, "y": 0}, "parameters": {}},
        ],
        edges=[
            {"id": "e1", "source": "n1", "target": "ghost",
             "sourcePort": "dataframe_out", "targetPort": "dataframe_in"},
        ],
    )
    with pytest.raises(ValueError, match="unknown node"):
        executor.execute(pipeline)


def test_dag_execution_error_attributes():
    """DAGExecutionError carries node_id and message."""
    err = DAGExecutionError("n42", "something broke")
    assert err.node_id == "n42"
    assert err.message == "something broke"
    assert "n42" in str(err)


def test_empty_pipeline(executor: DAGExecutor):
    """Empty pipeline executes with no outputs."""
    pipeline = PipelineJSON(nodes=[], edges=[])
    result = executor.execute(pipeline)
    assert result == {}
