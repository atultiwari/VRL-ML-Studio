"""Code snippet for Hierarchical Clustering node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    n_clusters = params.get("n_clusters", 3)
    linkage = params.get("linkage", "ward")
    affinity = params.get("affinity", "euclidean")

    imports = [
        "import pandas as pd",
        "from sklearn.cluster import AgglomerativeClustering",
        "from sklearn.decomposition import PCA",
        "import plotly.express as px",
    ]

    code = (
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_numeric = {inp}[_num_cols].dropna()\n'
        f'_hc = AgglomerativeClustering(n_clusters={n_clusters}, linkage="{linkage}")\n'
        f'_labels = _hc.fit_predict(_numeric)\n'
        f'{out_df} = {inp}.copy()\n'
        f'{out_df}.loc[_numeric.index, "cluster"] = _labels\n'
        f'{out_df}["cluster"] = {out_df}["cluster"].astype(str)\n'
        f'_pca = PCA(n_components=2)\n'
        f'_coords = _pca.fit_transform(_numeric)\n'
        f'_plot_df = pd.DataFrame({{"PC1": _coords[:, 0], "PC2": _coords[:, 1], "cluster": _labels.astype(str)}})\n'
        f'{out_fig} = px.scatter(_plot_df, x="PC1", y="PC2", color="cluster", title="Hierarchical Clustering")\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
