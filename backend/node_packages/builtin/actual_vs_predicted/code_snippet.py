"""Code snippet for Actual vs Predicted node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    fig_out = output_vars.get("plot_out", "fig")

    target_col = params.get("target_col", "target")

    imports = ["import plotly.graph_objects as go"]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_pred = {model_var}.predict(X_test)\n'
        f'{fig_out} = go.Figure()\n'
        f'{fig_out}.add_trace(go.Scatter(x=y_test, y=y_pred, mode="markers", name="Predictions"))\n'
        f'_range = [min(y_test.min(), y_pred.min()), max(y_test.max(), y_pred.max())]\n'
        f'{fig_out}.add_trace(go.Scatter(x=_range, y=_range, mode="lines", line=dict(dash="dash"), name="Perfect"))\n'
        f'{fig_out}.update_layout(title="Actual vs Predicted", xaxis_title="Actual", yaxis_title="Predicted")\n'
        f'{fig_out}.show()\n'
    )
    return imports, code
