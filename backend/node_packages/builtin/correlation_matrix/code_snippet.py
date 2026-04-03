"""Code snippet for Correlations node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    method = params.get("method", "pearson")

    imports = [
        "import pandas as pd",
        "import plotly.graph_objects as go",
    ]

    code = (
        f'{out_df} = {inp}.copy()\n'
        f'_corr = {inp}.select_dtypes(include="number").corr(method="{method}")\n'
        f'{out_fig} = go.Figure(data=go.Heatmap(\n'
        f'    z=_corr.values, x=_corr.columns.tolist(), y=_corr.index.tolist(),\n'
        f'    colorscale="RdBu_r", zmin=-1, zmax=1,\n'
        f'    text=_corr.round(2).values.astype(str), texttemplate="%{{text}}"\n'
        f'))\n'
        f'{out_fig}.update_layout(title="Correlation Matrix ({method})", width=700, height=600)\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
