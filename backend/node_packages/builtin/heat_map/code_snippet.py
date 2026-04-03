"""Code snippet for Heat Map node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    mode = params.get("mode", "raw")
    columns = params.get("columns", [])
    colorscale = params.get("colorscale", "Viridis")
    show_values = params.get("show_values", True)

    imports = [
        "import pandas as pd",
        "import numpy as np",
        "import plotly.graph_objects as go",
    ]

    code = f"{out_df} = {inp}\n"

    if mode in ("raw", "zscore"):
        if columns:
            code += f"_hm_data = {inp}[{repr(columns)}]\n"
        else:
            code += f'_hm_data = {inp}.select_dtypes(include="number")\n'

        if mode == "zscore":
            code += (
                "_hm_data = (_hm_data - _hm_data.mean()) / _hm_data.std()\n"
            )

        text_tpl = '"%{z:.2f}"' if show_values else '""'
        code += (
            f"{out_fig} = go.Figure(data=go.Heatmap(\n"
            f"    z=_hm_data.values,\n"
            f"    x=_hm_data.columns.tolist(),\n"
            f"    y=[str(i) for i in _hm_data.index.tolist()],\n"
            f'    colorscale="{colorscale}",\n'
            f"    texttemplate={text_tpl}\n"
            f"))\n"
            f'{out_fig}.update_layout(title="Heat Map ({mode})", yaxis=dict(autorange="reversed"))\n'
            f"{out_fig}.show()\n"
        )

    elif mode == "pivot":
        pivot_index = params.get("pivot_index", "")
        pivot_columns = params.get("pivot_columns", "")
        pivot_values = params.get("pivot_values", "")
        pivot_aggfunc = params.get("pivot_aggfunc", "mean")

        text_tpl = '"%{z:.2f}"' if show_values else '""'
        code += (
            f"_pivot = pd.pivot_table(\n"
            f'    {inp}, index="{pivot_index}", columns="{pivot_columns}",\n'
            f'    values="{pivot_values}", aggfunc="{pivot_aggfunc}"\n'
            f")\n"
            f"{out_fig} = go.Figure(data=go.Heatmap(\n"
            f"    z=_pivot.values,\n"
            f"    x=[str(c) for c in _pivot.columns.tolist()],\n"
            f"    y=[str(i) for i in _pivot.index.tolist()],\n"
            f'    colorscale="{colorscale}",\n'
            f"    texttemplate={text_tpl}\n"
            f"))\n"
            f'{out_fig}.update_layout(title="Heat Map (pivot: {pivot_aggfunc} of {pivot_values})", '
            f'yaxis=dict(autorange="reversed"))\n'
            f"{out_fig}.show()\n"
        )

    return imports, code
