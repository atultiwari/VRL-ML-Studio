"""Merge Data node — join two DataFrames on key columns."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    df_left = inputs.get("dataframe_left")
    df_right = inputs.get("dataframe_right")

    if df_left is None:
        raise ValueError("No left DataFrame provided.")
    if df_right is None:
        raise ValueError("No right DataFrame provided.")
    if not isinstance(df_left, pd.DataFrame):
        raise ValueError("Left input must be a pandas DataFrame.")
    if not isinstance(df_right, pd.DataFrame):
        raise ValueError("Right input must be a pandas DataFrame.")

    on_columns_str = parameters.get("on_columns", "")
    how = parameters.get("how", "inner")
    suffixes_left = parameters.get("suffixes_left", "_left")
    suffixes_right = parameters.get("suffixes_right", "_right")

    # Parse key columns from comma-separated string
    if on_columns_str.strip():
        on_columns = [c.strip() for c in on_columns_str.split(",") if c.strip()]
    else:
        # Auto-detect common columns
        common = list(set(df_left.columns) & set(df_right.columns))
        if not common:
            raise ValueError(
                "No key columns specified and no common columns found "
                "between the two DataFrames."
            )
        on_columns = sorted(common)

    # Validate that key columns exist in both DataFrames
    for col in on_columns:
        if col not in df_left.columns:
            raise ValueError(f"Key column '{col}' not found in left DataFrame.")
        if col not in df_right.columns:
            raise ValueError(f"Key column '{col}' not found in right DataFrame.")

    merged = pd.merge(
        df_left,
        df_right,
        on=on_columns,
        how=how,
        suffixes=(suffixes_left, suffixes_right),
    )

    return {"dataframe_out": merged}
