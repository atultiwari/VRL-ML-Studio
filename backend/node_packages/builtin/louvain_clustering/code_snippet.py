"""Code snippet for Louvain Clustering node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    n_clusters = params.get("n_clusters", 3)
    n_neighbors = params.get("n_neighbors", 10)
    random_state = params.get("random_state", 42)

    imports = [
        "import pandas as pd",
        "from sklearn.cluster import SpectralClustering",
        "from sklearn.decomposition import PCA",
        "import plotly.express as px",
    ]

    code = (
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_numeric = {inp}[_num_cols].dropna()\n'
        f'_sc = SpectralClustering(n_clusters={n_clusters}, affinity="nearest_neighbors", '
        f'n_neighbors={n_neighbors}, random_state={random_state}, assign_labels="kmeans")\n'
        f'_labels = _sc.fit_predict(_numeric)\n'
        f'{out_df} = {inp}.copy()\n'
        f'{out_df}.loc[_numeric.index, "cluster"] = _labels\n'
        f'{out_df}["cluster"] = {out_df}["cluster"].astype(str)\n'
        f'# 2D visualization via PCA\n'
        f'_pca = PCA(n_components=2, random_state={random_state})\n'
        f'_coords = _pca.fit_transform(_numeric)\n'
        f'_plot_df = pd.DataFrame({{"PC1": _coords[:, 0], "PC2": _coords[:, 1], "cluster": _labels.astype(str)}})\n'
        f'{out_fig} = px.scatter(_plot_df, x="PC1", y="PC2", color="cluster", '
        f'title="Louvain Clustering (k={n_clusters})")\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
