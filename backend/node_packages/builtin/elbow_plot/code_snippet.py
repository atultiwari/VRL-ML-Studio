"""Code snippet for Elbow Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    fig_out = output_vars.get("plot_out", "fig")

    k_min = params.get("k_min", 2)
    k_max = params.get("k_max", 10)
    random_state = params.get("random_state", 42)

    imports = [
        "from sklearn.cluster import KMeans",
        "import plotly.graph_objects as go",
    ]

    code = (
        f'_num_cols = {inp}.select_dtypes(include="number").columns.tolist()\n'
        f'_numeric = {inp}[_num_cols].dropna()\n'
        f'_inertias = []\n'
        f'_k_range = range({k_min}, {k_max} + 1)\n'
        f'for _k in _k_range:\n'
        f'    _km = KMeans(n_clusters=_k, random_state={random_state}, n_init="auto")\n'
        f'    _km.fit(_numeric)\n'
        f'    _inertias.append(_km.inertia_)\n'
        f'{fig_out} = go.Figure(data=go.Scatter(x=list(_k_range), y=_inertias, mode="lines+markers"))\n'
        f'{fig_out}.update_layout(title="Elbow Plot", xaxis_title="k (clusters)", yaxis_title="Inertia")\n'
        f'{fig_out}.show()\n'
    )
    return imports, code
