"""Code snippet for Cluster Report node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    metrics_out = output_vars.get("metrics_out", "metrics")

    cluster_col = params.get("cluster_col", "cluster")

    imports = [
        "from sklearn.metrics import silhouette_score, davies_bouldin_score",
    ]

    code = (
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_labels = {inp}["{cluster_col}"].astype(int)\n'
        f'_features = {inp}[_num_cols].drop(columns=["{cluster_col}"], errors="ignore")\n'
        f'_sil = silhouette_score(_features, _labels)\n'
        f'_dbi = davies_bouldin_score(_features, _labels)\n'
        f'{metrics_out} = {{"silhouette_score": _sil, "davies_bouldin_index": _dbi}}\n'
        f'print(f"Silhouette Score: {{_sil:.4f}}")\n'
        f'print(f"Davies-Bouldin Index: {{_dbi:.4f}}")\n'
    )
    return imports, code
