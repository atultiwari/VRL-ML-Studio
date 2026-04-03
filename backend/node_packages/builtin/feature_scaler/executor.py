"""Preprocess node — scales numeric columns using standard, min-max, or robust scaling."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    import pandas as pd
    from sklearn.preprocessing import MinMaxScaler, RobustScaler, StandardScaler

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    df = df.copy()

    method = parameters.get("method", "standard")
    columns = parameters.get("columns", [])

    if not columns:
        columns = df.select_dtypes(include=[np.number]).columns.tolist()

    if not columns:
        return {"dataframe_out": df}

    missing_cols = [c for c in columns if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Columns not found in DataFrame: {missing_cols}")

    scalers = {
        "standard": StandardScaler,
        "minmax": MinMaxScaler,
        "robust": RobustScaler,
    }

    scaler_cls = scalers.get(method)
    if scaler_cls is None:
        raise ValueError(f"Unknown scaling method: {method}. Choose from: {list(scalers.keys())}")

    scaler = scaler_cls()
    df[columns] = scaler.fit_transform(df[columns])

    return {"dataframe_out": df}
