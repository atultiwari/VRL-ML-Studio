"""Code snippet for PCA node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    n_components = params.get("n_components", 2)

    imports = [
        "import pandas as pd",
        "from sklearn.decomposition import PCA",
        "import plotly.express as px",
    ]

    code = (
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_numeric = {inp}[_num_cols].dropna()\n'
        f'_pca = PCA(n_components={n_components})\n'
        f'_transformed = _pca.fit_transform(_numeric)\n'
        f'_cols = [f"PC{{i+1}}" for i in range({n_components})]\n'
        f'{out_df} = pd.DataFrame(_transformed, columns=_cols, index=_numeric.index)\n'
        f'print(f"Explained variance ratio: {{_pca.explained_variance_ratio_}}")\n'
    )

    if n_components >= 2:
        code += (
            f'{out_fig} = px.scatter({out_df}, x="PC1", y="PC2", title="PCA Projection")\n'
            f'{out_fig}.show()\n'
        )

    return imports, code
