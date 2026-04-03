"""Concatenate node — stack two DataFrames vertically or horizontally."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    df_top = inputs.get("dataframe_top")
    df_bottom = inputs.get("dataframe_bottom")

    if df_top is None:
        raise ValueError("No first DataFrame provided.")
    if df_bottom is None:
        raise ValueError("No second DataFrame provided.")
    if not isinstance(df_top, pd.DataFrame):
        raise ValueError("First input must be a pandas DataFrame.")
    if not isinstance(df_bottom, pd.DataFrame):
        raise ValueError("Second input must be a pandas DataFrame.")

    axis_param = parameters.get("axis", "rows")
    ignore_index = bool(parameters.get("ignore_index", True))
    add_source_column = bool(parameters.get("add_source_column", False))

    axis = 0 if axis_param == "rows" else 1

    top = df_top.copy()
    bottom = df_bottom.copy()

    if add_source_column:
        top["_source"] = "first"
        bottom["_source"] = "second"

    result = pd.concat([top, bottom], axis=axis, ignore_index=ignore_index)

    return {"dataframe_out": result}
