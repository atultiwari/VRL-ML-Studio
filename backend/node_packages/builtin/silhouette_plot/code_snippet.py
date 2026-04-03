"""Code snippet for Silhouette Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    fig_out = output_vars.get("plot_out", "fig")
    metrics_out = output_vars.get("metrics_out", "metrics")

    cluster_col = params.get("cluster_col", "cluster")
    metric = params.get("metric", "euclidean")

    imports = [
        "from sklearn.metrics import silhouette_samples, silhouette_score",
        "import plotly.graph_objects as go",
        "import numpy as np",
    ]

    code = (
        f'_labels = {inp}["{cluster_col}"].values\n'
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_feat_cols = [c for c in _num_cols if c != "{cluster_col}"]\n'
        f'_features = {inp}[_feat_cols].values\n'
        f'_sample_sil = silhouette_samples(_features, _labels, metric="{metric}")\n'
        f'_overall = silhouette_score(_features, _labels, metric="{metric}")\n'
        f'{fig_out} = go.Figure()\n'
        f'_y_lower = 0\n'
        f'_colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",\n'
        f'           "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"]\n'
        f'for _i, _cl in enumerate(sorted(set(_labels))):\n'
        f'    _vals = np.sort(_sample_sil[_labels == _cl])\n'
        f'    _y_upper = _y_lower + len(_vals)\n'
        f'    {fig_out}.add_trace(go.Bar(x=_vals.tolist(), y=list(range(_y_lower, _y_upper)),\n'
        f'        orientation="h", name=f"Cluster {{_cl}}", marker_color=_colors[_i % len(_colors)]))\n'
        f'    _y_lower = _y_upper + 2\n'
        f'{fig_out}.add_vline(x=_overall, line_dash="dash", line_color="#9ca3af",\n'
        f'    annotation_text=f"Mean: {{_overall:.3f}}")\n'
        f'{fig_out}.update_layout(title=f"Silhouette Plot (Mean = {{_overall:.3f}})",\n'
        f'    xaxis_title="Silhouette Coefficient", yaxis={{"showticklabels": False}})\n'
        f'{fig_out}.show()\n'
        f'{metrics_out} = {{"silhouette_score": round(_overall, 4)}}\n'
        f'print(f"Silhouette Score: {{_overall:.4f}}")\n'
    )
    return imports, code
