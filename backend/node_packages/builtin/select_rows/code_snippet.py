"""Code snippet for Select Rows node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    column = params.get("column", "")
    operator = params.get("operator", "==")
    value = params.get("value", "")

    imports = ["import pandas as pd"]

    if operator == "is_null":
        code = f'{out} = {inp}[{inp}[{repr(column)}].isna()].reset_index(drop=True)\n'
    elif operator == "not_null":
        code = f'{out} = {inp}[{inp}[{repr(column)}].notna()].reset_index(drop=True)\n'
    elif operator == "contains":
        code = f'{out} = {inp}[{inp}[{repr(column)}].astype(str).str.contains({repr(value)}, na=False)].reset_index(drop=True)\n'
    elif operator == "in":
        in_values = [v.strip() for v in str(value).split(",")]
        code = f'{out} = {inp}[{inp}[{repr(column)}].isin({repr(in_values)})].reset_index(drop=True)\n'
    else:
        code = f'{out} = {inp}[{inp}[{repr(column)}] {operator} {repr(value)}].reset_index(drop=True)\n'

    return imports, code
