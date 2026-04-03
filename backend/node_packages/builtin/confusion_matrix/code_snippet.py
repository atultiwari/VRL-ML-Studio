"""Code snippet for Confusion Matrix node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    fig_out = output_vars.get("plot_out", "fig")

    target_col = params.get("target_col", "target")

    imports = [
        "from sklearn.metrics import confusion_matrix",
        "import plotly.graph_objects as go",
    ]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_pred = {model_var}.predict(X_test)\n'
        f'_labels = sorted(y_test.unique())\n'
        f'_cm = confusion_matrix(y_test, y_pred, labels=_labels)\n'
        f'_label_str = [str(l) for l in _labels]\n'
        f'{fig_out} = go.Figure(data=go.Heatmap(\n'
        f'    z=_cm, x=_label_str, y=_label_str, colorscale="Blues",\n'
        f'    text=[[str(int(v)) for v in row] for row in _cm], texttemplate="%{{text}}"\n'
        f'))\n'
        f'{fig_out}.update_layout(title="Confusion Matrix", xaxis_title="Predicted", yaxis_title="True")\n'
        f'{fig_out}.show()\n'
    )
    return imports, code
