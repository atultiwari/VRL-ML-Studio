"""Code snippet for Line Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    x_col = params.get("x_col", "")
    y_cols = params.get("y_cols", [])
    color_col = params.get("color_col", "")
    show_markers = params.get("show_markers", False)

    imports = [
        "import plotly.express as px",
    ]

    code = f'{out_df} = {inp}.copy()\n'

    if not y_cols:
        code += (
            f'_y_cols = {inp}.select_dtypes(include="number")'
            f'.columns.difference(["{x_col}"]).tolist()[:3]\n'
        )
        y_ref = "_y_cols"
    else:
        y_ref = repr(y_cols)

    if color_col and len(y_cols) == 1:
        y_arg = f'y="{y_cols[0]}"'
        color_arg = f', color="{color_col}"'
    else:
        y_arg = f'y={y_ref}'
        color_arg = ""

    markers_arg = ", markers=True" if show_markers else ""

    code += (
        f'{out_fig} = px.line({inp}, x="{x_col}", {y_arg}'
        f'{color_arg}{markers_arg}, '
        f'title="Line Chart")\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
