"""Code snippet for Residual Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    fig_out = output_vars.get("plot_out", "fig")

    target_col = params.get("target_col", "target")

    imports = ["import plotly.express as px"]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_pred = {model_var}.predict(X_test)\n'
        f'_residuals = y_test - y_pred\n'
        f'{fig_out} = px.scatter(x=y_pred, y=_residuals, title="Residual Plot", labels={{"x": "Predicted", "y": "Residual"}})\n'
        f'{fig_out}.add_hline(y=0, line_dash="dash", line_color="red")\n'
        f'{fig_out}.show()\n'
    )
    return imports, code
