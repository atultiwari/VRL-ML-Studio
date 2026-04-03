"""Code snippet for Edit Domain node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    column_types = params.get("column_types", {})

    imports = ["import pandas as pd"]

    code = f'{out} = {inp}.copy()\n'
    for col, dtype in column_types.items():
        code += f'{out}["{col}"] = {out}["{col}"].astype("{dtype}")\n'

    return imports, code
