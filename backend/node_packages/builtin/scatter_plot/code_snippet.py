"""Code snippet for Scatter Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    x_col = params.get("x_col", "")
    y_col = params.get("y_col", "")
    color_col = params.get("color_col", "")

    imports = ["import plotly.express as px"]

    args = f'{inp}, x="{x_col}", y="{y_col}"'
    if color_col:
        args += f', color="{color_col}"'
    args += f', title="Scatter: {x_col} vs {y_col}"'

    code = (
        f'{out_df} = {inp}.copy()\n'
        f'{out_fig} = px.scatter({args})\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
