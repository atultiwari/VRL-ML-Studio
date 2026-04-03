from __future__ import annotations

import pytest
import pandas as pd

from services.cache import CacheService
from services.dag_executor import DAGExecutor
from services.node_registry import NodeRegistry


@pytest.fixture
def sample_df() -> pd.DataFrame:
    return pd.DataFrame({
        "age":    [25, 30, 35, 40, 45],
        "salary": [50000, 60000, 70000, 80000, 90000],
        "city":   ["NY", "LA", "NY", "SF", "LA"],
        "target": [0, 1, 0, 1, 1],
    })


@pytest.fixture
def registry() -> NodeRegistry:
    r = NodeRegistry()
    r.load_builtin_packages()
    return r


@pytest.fixture
def cache() -> CacheService:
    return CacheService()


@pytest.fixture
def dag_executor(registry: NodeRegistry, cache: CacheService) -> DAGExecutor:
    return DAGExecutor(registry=registry, cache=cache)
