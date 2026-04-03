"""Pivot Table node — reshape data into a pivot table."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import logging

    import pandas as pd

    logger = logging.getLogger(__name__)

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    index_col = parameters.get("index_col", "")
    columns_col = parameters.get("columns_col", "")
    values_col = parameters.get("values_col", "")
    aggfunc = parameters.get("aggfunc", "mean")
    fill_value = parameters.get("fill_value", None)
    margins = parameters.get("margins", False)

    if not index_col:
        raise ValueError("Index column is required. Select a column to use as rows.")
    if not columns_col:
        raise ValueError(
            "Columns column is required. Select a column to use as headers."
        )
    if not values_col:
        raise ValueError(
            "Values column is required. Select a column to aggregate."
        )

    for col_name, col_val in [
        ("index_col", index_col),
        ("columns_col", columns_col),
        ("values_col", values_col),
    ]:
        if col_val not in df.columns:
            raise ValueError(
                f"Column '{col_val}' ({col_name}) not found in DataFrame."
            )

    pivot_kwargs = {
        "data": df,
        "index": index_col,
        "columns": columns_col,
        "values": values_col,
        "aggfunc": aggfunc,
        "margins": margins,
    }
    if fill_value is not None:
        pivot_kwargs["fill_value"] = fill_value

    result = pd.pivot_table(**pivot_kwargs)

    result = result.reset_index()

    if hasattr(result.columns, "levels"):
        result.columns = [
            "_".join(str(c) for c in col).rstrip("_")
            if isinstance(col, tuple)
            else str(col)
            for col in result.columns
        ]
    else:
        result.columns = [str(c) for c in result.columns]

    logger.info(
        "Pivot table created: %d rows x %d columns.", len(result), len(result.columns)
    )

    return {"dataframe_out": result}
