"""Code snippet for t-SNE node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    n_components = params.get("n_components", 2)
    perplexity = params.get("perplexity", 30)
    learning_rate = params.get("learning_rate", 200)
    random_state = params.get("random_state", 42)

    imports = [
        "import pandas as pd",
        "from sklearn.manifold import TSNE",
        "import plotly.express as px",
    ]

    code = (
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_numeric = {inp}[_num_cols].dropna()\n'
        f'_tsne = TSNE(n_components={n_components}, perplexity={perplexity}, learning_rate={learning_rate}, random_state={random_state})\n'
        f'_transformed = _tsne.fit_transform(_numeric)\n'
        f'_cols = [f"tSNE{{i+1}}" for i in range({n_components})]\n'
        f'{out_df} = pd.DataFrame(_transformed, columns=_cols, index=_numeric.index)\n'
    )

    if n_components >= 2:
        code += (
            f'{out_fig} = px.scatter({out_df}, x="tSNE1", y="tSNE2", title="t-SNE Projection")\n'
            f'{out_fig}.show()\n'
        )

    return imports, code
