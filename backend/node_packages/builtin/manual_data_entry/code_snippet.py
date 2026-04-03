"""Code snippet for Manual Data Entry node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    out = output_vars.get("dataframe_out", "df")

    column_defs = params.get("columns", [])
    row_data = params.get("data", [])

    imports = ["import pandas as pd"]

    if row_data and column_defs:
        code = f'{out} = pd.DataFrame({repr(row_data)}, columns={repr(column_defs)})\n'
    else:
        code = f'{out} = pd.DataFrame()  # Manual Data Entry — configure columns and rows\n'

    return imports, code
