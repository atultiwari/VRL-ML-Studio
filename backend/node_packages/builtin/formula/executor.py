"""Formula node — create computed columns using Python expressions."""

_BLOCKED_TOKENS = frozenset(
    ["import", "exec", "eval", "compile", "os", "sys", "subprocess", "__"]
)


def _validate_expression(expression: str) -> None:
    """Reject expressions containing dangerous constructs."""
    if not expression.strip():
        raise ValueError("Expression is empty. Provide a valid Python expression.")

    for token in _BLOCKED_TOKENS:
        if token in expression:
            raise ValueError(
                f"Expression contains forbidden token '{token}'. "
                "Only arithmetic, string operations, and numpy functions are allowed."
            )


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import logging

    import numpy as np
    import pandas as pd

    logger = logging.getLogger(__name__)

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    new_column_name = parameters.get("new_column_name", "new_col")
    expression = parameters.get("expression", "")
    dtype = parameters.get("dtype", "auto")

    _validate_expression(expression)

    df = df.copy()

    safe_namespace = {"np": np, "pd": pd}
    for col in df.columns:
        safe_namespace[col] = df[col]

    try:
        result = df.eval(expression, local_dict={"np": np})
    except Exception:
        logger.info(
            "df.eval failed for expression '%s', falling back to row-wise apply.",
            expression,
        )
        try:
            result = df.apply(
                lambda row: eval(expression, {"__builtins__": {}}, {**safe_namespace, **dict(row)}),  # noqa: S307
                axis=1,
            )
        except Exception as exc:
            raise ValueError(
                f"Failed to evaluate expression '{expression}': {exc}"
            ) from exc

    dtype_map = {
        "int": "int64",
        "float": "float64",
        "str": "str",
        "bool": "bool",
    }

    if dtype != "auto" and dtype in dtype_map:
        try:
            result = result.astype(dtype_map[dtype])
        except (ValueError, TypeError) as exc:
            raise ValueError(
                f"Cannot cast expression result to '{dtype}': {exc}"
            ) from exc

    df[new_column_name] = result

    logger.info("Created column '%s' from expression '%s'.", new_column_name, expression)

    return {"dataframe_out": df}
