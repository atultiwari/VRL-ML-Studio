"""Regression Report node — computes MAE, MSE, RMSE, R², and Adjusted R²."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import math

    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    model = inputs["model_in"]
    df = inputs["dataframe_in"]

    target_col = parameters.get("target_col")
    if not target_col:
        raise ValueError("target_col parameter is required. Select the target column.")

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    X_test = df.drop(columns=[target_col])
    y_test = df[target_col]

    y_pred = model.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = math.sqrt(mse)
    r2 = r2_score(y_test, y_pred)

    n = len(y_test)
    p = X_test.shape[1]
    adj_r2 = 1.0 - (1.0 - r2) * (n - 1) / (n - p - 1) if n - p - 1 > 0 else float("nan")

    return {
        "metrics_out": {
            "mae": float(mae),
            "mse": float(mse),
            "rmse": float(rmse),
            "r2": float(r2),
            "adj_r2": float(adj_r2),
        }
    }
