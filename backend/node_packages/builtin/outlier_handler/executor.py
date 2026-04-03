"""Outliers node — detect and handle outliers via IQR or Z-score."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    import pandas as pd

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    df = df.copy()

    method = parameters.get("method", "iqr")
    action = parameters.get("action", "cap")
    threshold = float(parameters.get("threshold", 1.5))
    columns = parameters.get("columns", [])

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    target_cols = [c for c in columns if c in numeric_cols] if columns else numeric_cols

    if not target_cols:
        return {"dataframe_out": df}

    if method == "iqr":
        outlier_mask = pd.DataFrame(False, index=df.index, columns=target_cols)
        bounds: dict[str, tuple[float, float]] = {}

        for col in target_cols:
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - threshold * iqr
            upper = q3 + threshold * iqr
            bounds[col] = (lower, upper)
            outlier_mask[col] = (df[col] < lower) | (df[col] > upper)

        if action == "remove":
            any_outlier = outlier_mask.any(axis=1)
            df = df[~any_outlier].reset_index(drop=True)
        elif action == "cap":
            for col in target_cols:
                lower, upper = bounds[col]
                df[col] = df[col].clip(lower=lower, upper=upper)
        elif action == "flag":
            for col in target_cols:
                df[f"{col}_outlier"] = outlier_mask[col]

    elif method == "zscore":
        from scipy import stats

        outlier_mask = pd.DataFrame(False, index=df.index, columns=target_cols)

        for col in target_cols:
            col_mean = df[col].mean()
            col_std = df[col].std()
            if col_std == 0:
                continue
            z_scores = np.abs((df[col] - col_mean) / col_std)
            outlier_mask[col] = z_scores > threshold

        if action == "remove":
            any_outlier = outlier_mask.any(axis=1)
            df = df[~any_outlier].reset_index(drop=True)
        elif action == "cap":
            for col in target_cols:
                col_mean = df[col].mean()
                col_std = df[col].std()
                if col_std == 0:
                    continue
                lower = col_mean - threshold * col_std
                upper = col_mean + threshold * col_std
                df[col] = df[col].clip(lower=lower, upper=upper)
        elif action == "flag":
            for col in target_cols:
                df[f"{col}_outlier"] = outlier_mask[col]

    else:
        raise ValueError(f"Unknown method: {method}. Use 'iqr' or 'zscore'.")

    return {"dataframe_out": df}
