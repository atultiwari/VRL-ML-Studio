"""Code snippet for Predictions node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    out_df = output_vars.get("dataframe_out", "predictions_df")
    out_metrics = output_vars.get("metrics_out", "pred_metrics")

    target_col = params.get("target_col", "target")
    include_probabilities = params.get("include_probabilities", False)

    imports = [
        "import pandas as pd",
        "from sklearn.metrics import accuracy_score",
    ]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_pred = {model_var}.predict(X_test)\n'
        f'{out_df} = pd.DataFrame({{"actual": y_test.values, "predicted": y_pred}})\n'
    )

    if include_probabilities:
        code += (
            f'if hasattr({model_var}, "predict_proba"):\n'
            f'    _probas = {model_var}.predict_proba(X_test)\n'
            f'    for i, cls in enumerate({model_var}.classes_):\n'
            f'        {out_df}[f"prob_{{cls}}"] = _probas[:, i]\n'
        )

    code += (
        f'{out_metrics} = {{"accuracy": accuracy_score(y_test, y_pred)}}\n'
        f'print(f"Accuracy: {{{out_metrics}[\'accuracy\']:.4f}}")\n'
        f'print({out_df}.head(20))\n'
    )
    return imports, code
