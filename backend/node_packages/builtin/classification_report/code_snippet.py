"""Code snippet for Test & Score node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    metrics_out = output_vars.get("metrics_out", "metrics")

    target_col = params.get("target_col", "target")

    imports = ["from sklearn.metrics import classification_report"]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_pred = {model_var}.predict(X_test)\n'
        f'{metrics_out} = classification_report(y_test, y_pred, output_dict=True, zero_division=0)\n'
        f'print(classification_report(y_test, y_pred, zero_division=0))\n'
    )
    return imports, code
