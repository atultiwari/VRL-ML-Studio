"""Code snippet for Regression Report node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    metrics_out = output_vars.get("metrics_out", "metrics")

    target_col = params.get("target_col", "target")

    imports = [
        "import math",
        "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score",
    ]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_pred = {model_var}.predict(X_test)\n'
        f'_mae = mean_absolute_error(y_test, y_pred)\n'
        f'_mse = mean_squared_error(y_test, y_pred)\n'
        f'_rmse = math.sqrt(_mse)\n'
        f'_r2 = r2_score(y_test, y_pred)\n'
        f'{metrics_out} = {{"MAE": _mae, "MSE": _mse, "RMSE": _rmse, "R²": _r2}}\n'
        f'print(f"MAE: {{_mae:.4f}}  MSE: {{_mse:.4f}}  RMSE: {{_rmse:.4f}}  R²: {{_r2:.4f}}")\n'
    )
    return imports, code
