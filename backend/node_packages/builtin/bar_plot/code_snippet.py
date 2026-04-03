"""Code snippet for Bar Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    x_col = params.get("x_col", "")
    y_col = params.get("y_col", "")
    aggregation = params.get("aggregation", "count")
    color_col = params.get("color_col", "")
    orientation = params.get("orientation", "vertical")

    imports = [
        "import pandas as pd",
        "import plotly.express as px",
    ]

    code = f'{out_df} = {inp}.copy()\n'

    px_args = f'{inp}'
    if y_col and aggregation != "count":
        # Aggregation mode
        code += (
            f'_agg = {inp}.groupby("{x_col}")["{y_col}"]'
            f'.{aggregation}().reset_index()\n'
        )
        px_args = f'_agg'
        x_arg = f'x="{x_col}"'
        y_arg = f'y="{y_col}"'
    else:
        # Count mode
        code += (
            f'_counts = {inp}["{x_col}"].value_counts().reset_index()\n'
            f'_counts.columns = ["{x_col}", "count"]\n'
        )
        px_args = '_counts'
        x_arg = f'x="{x_col}"'
        y_arg = 'y="count"'

    color_arg = f', color="{color_col}"' if color_col else ""
    orient_arg = ""
    if orientation == "horizontal":
        orient_arg = ", orientation='h'"
        x_arg, y_arg = y_arg, x_arg

    title = f'Bar Chart: {x_col}'
    code += (
        f'{out_fig} = px.bar({px_args}, {x_arg}, {y_arg}'
        f'{color_arg}{orient_arg}, title="{title}")\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
