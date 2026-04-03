"""Code snippet for Cluster Visualization node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    fig_out = output_vars.get("plot_out", "fig")

    cluster_col = params.get("cluster_col", "cluster")

    imports = [
        "import pandas as pd",
        "from sklearn.decomposition import PCA",
        "import plotly.express as px",
    ]

    code = (
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_features = {inp}[_num_cols].drop(columns=["{cluster_col}"], errors="ignore").dropna()\n'
        f'_pca = PCA(n_components=2)\n'
        f'_coords = _pca.fit_transform(_features)\n'
        f'_plot_df = pd.DataFrame({{"PC1": _coords[:, 0], "PC2": _coords[:, 1], "cluster": {inp}.loc[_features.index, "{cluster_col}"].astype(str)}})\n'
        f'{fig_out} = px.scatter(_plot_df, x="PC1", y="PC2", color="cluster", title="Cluster Visualization")\n'
        f'{fig_out}.show()\n'
    )
    return imports, code
