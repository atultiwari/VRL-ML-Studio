"""Code snippet for Violin Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    columns = params.get("columns", [])
    group_by = params.get("group_by", "")
    show_box = params.get("show_box", True)
    show_points = params.get("show_points", False)

    imports = ["import plotly.express as px"]

    cols_str = repr(columns) if columns else f'{inp}.select_dtypes(include="number").columns[:5].tolist()'
    points_str = '"all"' if show_points else "False"

    if group_by:
        # Melt for faceted violin
        code = (
            f'{out_df} = {inp}.copy()\n'
            f'_cols = {cols_str}\n'
            f'_melted = {inp}[_cols + ["{group_by}"]].melt(\n'
            f'    id_vars=["{group_by}"], var_name="feature", value_name="value"\n'
            f')\n'
            f'{out_fig} = px.violin(_melted, x="feature", y="value", '
            f'color="{group_by}", box={show_box}, points={points_str}, '
            f'title="Violin Plot (grouped by {group_by})")\n'
            f'{out_fig}.show()\n'
        )
    else:
        code = (
            f'{out_df} = {inp}.copy()\n'
            f'_cols = {cols_str}\n'
            f'_melted = {inp}[_cols].melt(var_name="feature", value_name="value")\n'
            f'{out_fig} = px.violin(_melted, x="feature", y="value", '
            f'box={show_box}, points={points_str}, '
            f'title="Violin Plot")\n'
            f'{out_fig}.show()\n'
        )
    return imports, code
