"""Passthrough node — returns the input DataFrame unchanged.

This is the canonical example of the executor.py contract:

    execute(inputs, parameters, context) -> dict

Every node executor must expose exactly this function signature.
"""
from __future__ import annotations

from typing import Any


def execute(
    inputs: dict[str, Any],
    parameters: dict[str, Any],
    context: dict[str, Any],
) -> dict[str, Any]:
    """Pass the input DataFrame through without modification."""
    df = inputs["dataframe_in"]
    return {"dataframe_out": df}
