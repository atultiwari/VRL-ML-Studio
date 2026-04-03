"""Code snippet for Formula node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    new_column_name = params.get("new_column_name", "new_col")
    expression = params.get("expression", "")
    dtype = params.get("dtype", "auto")

    imports = ["import numpy as np", "import pandas as pd"]

    code = f"{out} = {inp}.copy()\n"
    code += f"{out}[{repr(new_column_name)}] = {out}.eval({repr(expression)})\n"

    dtype_map = {
        "int": "int64",
        "float": "float64",
        "str": "str",
        "bool": "bool",
    }
    if dtype != "auto" and dtype in dtype_map:
        code += (
            f"{out}[{repr(new_column_name)}] = "
            f"{out}[{repr(new_column_name)}].astype({repr(dtype_map[dtype])})\n"
        )

    return imports, code
