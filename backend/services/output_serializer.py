"""Converts raw node outputs (DataFrames, Plotly figures, etc.) to JSON-serializable dicts."""
from __future__ import annotations

import json
from typing import Any

from core.logging import get_logger

logger = get_logger(__name__)

PREVIEW_ROW_LIMIT = 100


def serialize_node_outputs(outputs: dict[str, Any]) -> dict[str, Any]:
    """Serialize a node's output dict for WebSocket transport."""
    result: dict[str, Any] = {}
    for port_id, value in outputs.items():
        try:
            result[port_id] = _serialize_value(value)
        except Exception as exc:
            logger.warning("Could not serialize output port '%s': %s", port_id, exc)
            result[port_id] = {"type": "opaque", "repr": type(value).__name__}
    return result


def _serialize_value(value: Any) -> dict[str, Any]:
    try:
        import pandas as pd
        if isinstance(value, pd.DataFrame):
            return _serialize_dataframe(value)
    except ImportError:
        pass

    # Plotly figure dict (has "data" + "layout" keys at minimum)
    if isinstance(value, dict) and "data" in value and "layout" in value:
        return {"type": "plot", "spec": value}

    # Plotly Figure object
    try:
        import plotly.graph_objects as go
        if isinstance(value, go.Figure):
            return {"type": "plot", "spec": json.loads(value.to_json())}
    except ImportError:
        pass

    # Metrics dict (plain dict with scalar values)
    if isinstance(value, dict):
        return {"type": "metrics", "data": {k: _to_scalar(v) for k, v in value.items()}}

    # Scalar fallback
    return {"type": "opaque", "repr": type(value).__name__}


def _serialize_dataframe(df: "Any") -> dict[str, Any]:
    import pandas as pd
    preview = df.head(PREVIEW_ROW_LIMIT)
    # Convert NaN / inf to None for JSON safety
    preview_clean = preview.where(pd.notna(preview), other=None)
    return {
        "type": "dataframe",
        "columns": [
            {"name": str(col), "dtype": str(df[col].dtype)}
            for col in df.columns
        ],
        "data": preview_clean.values.tolist(),
        "shape": list(df.shape),
    }


def _to_scalar(v: Any) -> Any:
    try:
        import numpy as np
        if isinstance(v, (np.integer,)):
            return int(v)
        if isinstance(v, (np.floating,)):
            return float(v)
        if isinstance(v, np.ndarray):
            return v.tolist()
    except ImportError:
        pass
    return v
