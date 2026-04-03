"""Code snippet for Performance Curve node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    fig_out = output_vars.get("plot_out", "fig")

    target_col = params.get("target_col", "target")

    imports = [
        "from sklearn.metrics import precision_recall_curve, average_precision_score",
        "import plotly.graph_objects as go",
    ]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_score = {model_var}.predict_proba(X_test)[:, 1] if hasattr({model_var}, "predict_proba") else {model_var}.decision_function(X_test)\n'
        f'_prec, _rec, _ = precision_recall_curve(y_test, y_score)\n'
        f'_ap = average_precision_score(y_test, y_score)\n'
        f'{fig_out} = go.Figure()\n'
        f'{fig_out}.add_trace(go.Scatter(x=_rec, y=_prec, mode="lines", name=f"AP = {{_ap:.3f}}"))\n'
        f'{fig_out}.update_layout(title="Precision-Recall Curve", xaxis_title="Recall", yaxis_title="Precision")\n'
        f'{fig_out}.show()\n'
    )
    return imports, code
