"""Code snippet for Calibration Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    df_var = input_vars.get("dataframe_in", "df_test")
    fig_out = output_vars.get("plot_out", "fig")
    metrics_out = output_vars.get("metrics_out", "metrics")

    target_col = params.get("target_col", "target")
    n_bins = params.get("n_bins", 10)
    strategy = params.get("strategy", "uniform")

    imports = [
        "from sklearn.calibration import calibration_curve",
        "from sklearn.metrics import brier_score_loss",
        "import plotly.graph_objects as go",
        "from plotly.subplots import make_subplots",
    ]

    code = (
        f'X_test = {df_var}.drop(columns=["{target_col}"])\n'
        f'y_test = {df_var}["{target_col}"]\n'
        f'y_prob = {model_var}.predict_proba(X_test)[:, 1]\n'
        f'_frac_pos, _mean_pred = calibration_curve(y_test, y_prob, n_bins={n_bins}, strategy="{strategy}")\n'
        f'_brier = brier_score_loss(y_test, y_prob)\n'
        f'{fig_out} = make_subplots(specs=[[{{"secondary_y": True}}]])\n'
        f'{fig_out}.add_trace(go.Scatter(x=_mean_pred.tolist(), y=_frac_pos.tolist(),\n'
        f'    mode="lines+markers", name="Calibration Curve"), secondary_y=False)\n'
        f'{fig_out}.add_trace(go.Scatter(x=[0, 1], y=[0, 1], mode="lines",\n'
        f'    name="Perfectly Calibrated", line={{"dash": "dash"}}), secondary_y=False)\n'
        f'{fig_out}.add_trace(go.Histogram(x=y_prob.tolist(), nbinsx={n_bins},\n'
        f'    name="Prediction Distribution", opacity=0.35), secondary_y=True)\n'
        f'{fig_out}.update_layout(title=f"Calibration Plot (Brier Score = {{_brier:.4f}})",\n'
        f'    xaxis_title="Mean Predicted Probability")\n'
        f'{fig_out}.update_yaxes(title_text="Fraction of Positives", secondary_y=False)\n'
        f'{fig_out}.update_yaxes(title_text="Count", secondary_y=True)\n'
        f'{fig_out}.show()\n'
        f'{metrics_out} = {{"brier_score": round(_brier, 4)}}\n'
        f'print(f"Brier Score: {{_brier:.4f}}")\n'
    )
    return imports, code
