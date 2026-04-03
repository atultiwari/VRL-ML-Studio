"""Code snippet for ROC Analysis node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    fig_out = output_vars.get("plot_out", "fig")

    target_col = params.get("target_col", "target")

    imports = [
        "from sklearn.metrics import roc_curve, auc",
        "import plotly.graph_objects as go",
    ]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_score = {model_var}.predict_proba(X_test)[:, 1] if hasattr({model_var}, "predict_proba") else {model_var}.decision_function(X_test)\n'
        f'_fpr, _tpr, _ = roc_curve(y_test, y_score)\n'
        f'_auc = auc(_fpr, _tpr)\n'
        f'{fig_out} = go.Figure()\n'
        f'{fig_out}.add_trace(go.Scatter(x=_fpr, y=_tpr, mode="lines", name=f"AUC = {{_auc:.3f}}"))\n'
        f'{fig_out}.add_trace(go.Scatter(x=[0,1], y=[0,1], mode="lines", line=dict(dash="dash"), name="Random"))\n'
        f'{fig_out}.update_layout(title="ROC Curve", xaxis_title="FPR", yaxis_title="TPR")\n'
        f'{fig_out}.show()\n'
        f'print(f"AUC: {{_auc:.4f}}")\n'
    )
    return imports, code
