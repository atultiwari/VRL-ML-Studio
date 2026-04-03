"""Impute node — fills missing values using sklearn SimpleImputer."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    import pandas as pd
    from sklearn.impute import SimpleImputer

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    df = df.copy()

    strategy = parameters.get("strategy", "mean")
    fill_value = parameters.get("fill_value", "")
    columns = parameters.get("columns", [])

    if not columns:
        if strategy in ("mean", "median"):
            columns = df.select_dtypes(include=[np.number]).columns.tolist()
        else:
            columns = df.columns.tolist()

    if not columns:
        return {"dataframe_out": df}

    missing_cols = [c for c in columns if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Columns not found in DataFrame: {missing_cols}")

    imputer_kwargs: dict = {"strategy": strategy}
    if strategy == "constant":
        imputer_kwargs["fill_value"] = fill_value if fill_value else "missing"

    imputer = SimpleImputer(**imputer_kwargs)
    df[columns] = imputer.fit_transform(df[columns])

    return {"dataframe_out": df}
