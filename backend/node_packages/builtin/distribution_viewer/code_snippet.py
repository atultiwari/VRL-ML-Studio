"""Code snippet for Distribution Viewer node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    column = params.get("column", "")
    bins = params.get("bins", 30)
    kde = params.get("kde", True)

    imports = [
        "import pandas as pd",
        "import plotly.express as px",
    ]

    col_expr = f'"{column}"' if column else f"{inp}.select_dtypes(include='number').columns[0]"

    code = (
        f'{out_df} = {inp}.copy()\n'
        f'_col = {col_expr}\n'
        f'{out_fig} = px.histogram({inp}, x=_col, nbins={bins}, '
        f'title=f"Distribution of {{_col}}", marginal="{"box" if kde else "rug"}")\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
