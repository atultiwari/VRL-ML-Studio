"""Code snippet for Box Plot node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    columns = params.get("columns", [])

    imports = ["import plotly.express as px"]

    if columns:
        cols_repr = repr(columns)
        code = (
            f'{out_df} = {inp}.copy()\n'
            f'{out_fig} = px.box({inp}[{cols_repr}], title="Box Plot")\n'
            f'{out_fig}.show()\n'
        )
    else:
        code = (
            f'{out_df} = {inp}.copy()\n'
            f'{out_fig} = px.box({inp}.select_dtypes(include="number"), title="Box Plot")\n'
            f'{out_fig}.show()\n'
        )
    return imports, code
