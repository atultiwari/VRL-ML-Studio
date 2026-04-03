"""Code snippet for Feature Importance node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    fig_out = output_vars.get("plot_out", "fig")

    target_col = params.get("target_col", "target")

    imports = [
        "import pandas as pd",
        "import plotly.express as px",
    ]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'if hasattr({model_var}, "feature_importances_"):\n'
        f'    _imp = pd.Series({model_var}.feature_importances_, index=X_test.columns).sort_values(ascending=True)\n'
        f'    {fig_out} = px.bar(_imp, orientation="h", title="Feature Importance")\n'
        f'    {fig_out}.update_layout(showlegend=False, yaxis_title="Feature", xaxis_title="Importance")\n'
        f'    {fig_out}.show()\n'
        f'else:\n'
        f'    print("Model does not support feature_importances_")\n'
    )
    return imports, code
