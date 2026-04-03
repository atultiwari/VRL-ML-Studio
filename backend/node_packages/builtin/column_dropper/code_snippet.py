"""Code snippet for Column Dropper node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    columns = params.get("columns", [])

    imports = ["import pandas as pd"]
    code = f'{out} = {inp}.drop(columns={repr(columns)})\n'

    return imports, code
