"""Select Columns node — selects features manually, by variance, or by correlation."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    import pandas as pd
    from sklearn.feature_selection import VarianceThreshold

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    df = df.copy()

    method = parameters.get("method", "manual")
    columns = parameters.get("columns", [])
    threshold = float(parameters.get("threshold", 0.0))

    if method == "manual":
        if not columns:
            raise ValueError("Manual selection requires at least one column in 'Columns to Keep'.")
        missing_cols = [c for c in columns if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns not found in DataFrame: {missing_cols}")
        df = df[columns]

    elif method == "variance":
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            return {"dataframe_out": df}

        non_numeric_df = df.drop(columns=numeric_cols)
        numeric_df = df[numeric_cols]

        selector = VarianceThreshold(threshold=threshold)
        selector.fit(numeric_df)
        kept_mask = selector.get_support()
        kept_cols = [col for col, keep in zip(numeric_cols, kept_mask) if keep]

        df = pd.concat([non_numeric_df, numeric_df[kept_cols]], axis=1)

    elif method == "correlation":
        correlation_target = parameters.get("correlation_target")
        if not correlation_target:
            raise ValueError("Correlation method requires a target column.")
        if correlation_target not in df.columns:
            raise ValueError(f"Target column '{correlation_target}' not found in DataFrame.")

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if correlation_target not in numeric_cols:
            raise ValueError(f"Target column '{correlation_target}' must be numeric.")

        correlations = df[numeric_cols].corr()[correlation_target].abs()
        cols_to_drop = [
            col
            for col in numeric_cols
            if col != correlation_target and correlations[col] < threshold
        ]
        df = df.drop(columns=cols_to_drop)

    else:
        raise ValueError(f"Unknown selection method: {method}")

    return {"dataframe_out": df}
