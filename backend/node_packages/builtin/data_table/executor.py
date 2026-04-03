"""Data Table node — provides dataset shape, dtypes, memory usage, and summary metrics."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    rows, cols = df.shape

    memory_bytes = df.memory_usage(deep=True).sum()
    if memory_bytes < 1024:
        memory_str = f"{memory_bytes} B"
    elif memory_bytes < 1024 ** 2:
        memory_str = f"{memory_bytes / 1024:.1f} KB"
    elif memory_bytes < 1024 ** 3:
        memory_str = f"{memory_bytes / 1024 ** 2:.1f} MB"
    else:
        memory_str = f"{memory_bytes / 1024 ** 3:.2f} GB"

    dtype_counts = df.dtypes.astype(str).value_counts().to_dict()
    dtypes_summary = ", ".join(f"{dtype}: {count}" for dtype, count in dtype_counts.items())

    null_count = int(df.isnull().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    metrics = {
        "rows": rows,
        "columns": cols,
        "memory_usage": memory_str,
        "dtypes": dtypes_summary,
        "null_count": null_count,
        "duplicate_rows": duplicate_rows,
    }

    return {
        "dataframe_out": df,
        "metrics_out": metrics,
    }
